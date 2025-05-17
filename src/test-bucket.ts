import { supabase } from './lib/supabaseClient';
import { downloadAndStoreImage } from './services/instagramService';

// URL de teste - use uma URL de imagem pública como exemplo
const TEST_IMAGE_URL = 'https://picsum.photos/400/400'; // Site de imagens de placeholder gratuito
const BUCKET_NAME = 'instagram-images';

// Função para testar listagem de buckets
async function listBuckets() {
    console.log('Listando buckets disponíveis...');
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Erro ao listar buckets:', error);
        return;
    }

    console.log('Buckets encontrados:');
    buckets.forEach(bucket => {
        console.log(`- ${bucket.name} (${bucket.public ? 'público' : 'privado'})`);
    });
}

// Função para testar listagem de arquivos em um bucket
async function listFiles() {
    console.log(`\nListando arquivos no bucket '${BUCKET_NAME}'...`);
    const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list();

    if (error) {
        console.error('Erro ao listar arquivos:', error);
        return;
    }

    if (files && files.length > 0) {
        console.log(`Encontrados ${files.length} arquivos:`);
        files.slice(0, 5).forEach(file => {
            console.log(`- ${file.name} (${(file.metadata?.size || 0) / 1024} KB)`);
        });
        if (files.length > 5) {
            console.log(`  ... e mais ${files.length - 5} arquivos`);
        }
    } else {
        console.log('Nenhum arquivo encontrado no bucket.');
    }
}

// Função para testar upload direto (forma alternativa ao downloadAndStoreImage)
async function testDirectUpload() {
    console.log('\nTestando upload direto para o Supabase...');
    try {
        // Primeiro baixar a imagem
        console.log('Baixando imagem de teste:', TEST_IMAGE_URL);
        const response = await fetch(TEST_IMAGE_URL);
        if (!response.ok) {
            throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log(`Imagem baixada: ${blob.size} bytes, tipo: ${blob.type}`);

        // Gerar nome único
        const timestamp = Date.now();
        const filename = `test-${timestamp}.jpg`;

        // Fazer upload
        console.log(`Enviando para ${BUCKET_NAME}/${filename}...`);
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(`test/${filename}`, blob, {
                contentType: blob.type,
                upsert: true
            });

        if (error) {
            throw error;
        }

        // Pegar URL pública
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(`test/${filename}`);

        console.log('Upload direto bem-sucedido!');
        console.log('URL pública:', urlData.publicUrl);

        return true;
    } catch (error) {
        console.error('Erro no upload direto:', error);
        return false;
    }
}

// Função para testar a função real utilizada no app
async function testDownloadAndStore() {
    console.log('\nTestando função downloadAndStoreImage do app...');
    try {
        const imageUrl = await downloadAndStoreImage(TEST_IMAGE_URL, 'test');

        if (imageUrl) {
            console.log('Imagem salva com sucesso!');
            console.log('URL retornada:', imageUrl);
            return true;
        } else {
            console.log('A função não retornou uma URL - verifique os logs acima para detalhes.');
            return false;
        }
    } catch (error) {
        console.error('Erro ao usar downloadAndStoreImage:', error);
        return false;
    }
}

// Executar testes
async function runTests() {
    console.log('=== TESTE DE INTEGRAÇÃO COM SUPABASE STORAGE ===\n');

    // Testar conexão
    console.log('Verificando conexão com Supabase...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Erro de conexão:', error);
        return;
    }
    console.log('Conexão estabelecida com Supabase.');

    // Testar buckets e arquivos
    await listBuckets();
    await listFiles();

    // Testar uploads
    const directUploadSuccess = await testDirectUpload();
    const appFunctionSuccess = await testDownloadAndStore();

    console.log('\n=== RESUMO DOS TESTES ===');
    console.log(`Upload direto: ${directUploadSuccess ? '✅ SUCESSO' : '❌ FALHA'}`);
    console.log(`Função do app: ${appFunctionSuccess ? '✅ SUCESSO' : '❌ FALHA'}`);
}

// Executar todos os testes
runTests()
    .then(() => console.log('\nTestes concluídos!'))
    .catch(error => console.error('\nErro durante os testes:', error)); 
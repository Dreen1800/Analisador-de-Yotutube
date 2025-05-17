// Teste para validar o armazenamento de imagens do Instagram no Supabase
import { downloadAndStoreImage, ensureImageBucketExists } from './src/services/instagramService';

// URL de teste - imagem de exemplo para testar o upload
const TEST_IMAGE_URL = 'https://picsum.photos/800/800'; // Site de imagens placeholder para teste
const TEST_STORAGE_PATH = 'tests/validation';

// Função para testar o armazenamento de imagens
async function testImageStorage() {
    console.log('===================================================');
    console.log('TESTE DE ARMAZENAMENTO DE IMAGENS NO SUPABASE');
    console.log('===================================================');

    // 1. Verificar se o bucket existe
    console.log('\n1. Verificando bucket de armazenamento...');
    const bucketExists = await ensureImageBucketExists();
    console.log(`Resultado: Bucket ${bucketExists ? 'existe/foi criado' : 'NÃO existe e não foi possível criar'}`);

    if (!bucketExists) {
        console.error('ERRO: Bucket não disponível. Verifique as credenciais do Supabase e permissões.');
        process.exit(1);
    }

    // 2. Tentar fazer o download e armazenamento da imagem de teste
    console.log('\n2. Testando download e armazenamento de imagem...');
    console.log(`URL de teste: ${TEST_IMAGE_URL}`);
    console.log(`Caminho no Storage: ${TEST_STORAGE_PATH}`);

    const startTime = Date.now();
    const storedImageUrl = await downloadAndStoreImage(TEST_IMAGE_URL, TEST_STORAGE_PATH);
    const endTime = Date.now();

    console.log(`Tempo de processamento: ${(endTime - startTime) / 1000} segundos`);

    if (storedImageUrl) {
        console.log('SUCESSO: Imagem armazenada com sucesso!');
        console.log(`URL da imagem armazenada: ${storedImageUrl}`);
        console.log('\nValidação concluída com sucesso!');
    } else {
        console.error('ERRO: Falha ao armazenar a imagem. Verifique os logs acima para detalhes.');
        process.exit(1);
    }
}

// Executar o teste
testImageStorage().catch(error => {
    console.error('Erro fatal durante o teste:', error);
    process.exit(1);
}); 
// Script para verificação direta do bucket
import { createClient } from '@supabase/supabase-js';

// Pegue a URL e a chave do Supabase dos argumentos da linha de comando
const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];

if (!supabaseUrl || !supabaseKey) {
    console.error('Uso: node bucket-check.js SUPABASE_URL SUPABASE_KEY');
    process.exit(1);
}

// Crie um cliente Supabase
console.log('Conectando ao Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'instagram-images';

async function checkBucket() {
    console.log(`Verificação detalhada do bucket ${BUCKET_NAME}`);
    console.log('=======================================');

    // 1. Tentar listar todos os buckets
    console.log('\n1. Listando todos os buckets:');
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error('  ERRO ao listar buckets:', error.message);
            console.error('  Este erro geralmente indica problemas de autenticação ou permissão.');
            return;
        }

        console.log(`  Total de buckets: ${buckets.length}`);
        buckets.forEach((bucket, i) => {
            console.log(`  Bucket ${i + 1}: ${bucket.name} ${bucket.name === BUCKET_NAME ? '✓ (ESTE É O QUE PROCURAMOS)' : ''}`);
        });

        const targetBucket = buckets.find(b => b.name === BUCKET_NAME);
        if (!targetBucket) {
            console.error(`\n  ❌ O bucket "${BUCKET_NAME}" NÃO FOI ENCONTRADO na lista!`);
            console.log('  Isso pode significar que:');
            console.log('  - O bucket não existe');
            console.log('  - Você não tem permissão para vê-lo');
            console.log('  - Há um erro de digitação no nome');
        } else {
            console.log(`\n  ✅ O bucket "${BUCKET_NAME}" EXISTE e está visível para o seu usuário.`);
        }
    } catch (err) {
        console.error('  ERRO GRAVE ao listar buckets:', err);
    }

    // 2. Tentar acessar diretamente o bucket
    console.log('\n2. Tentando acessar diretamente o bucket:');
    try {
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list();

        if (error) {
            console.error(`  ❌ ERRO ao acessar o bucket "${BUCKET_NAME}":`, error.message);
            console.error('  Este erro geralmente indica que o bucket existe mas você não tem permissão para acessá-lo.');
        } else {
            console.log(`  ✅ Acesso bem-sucedido ao bucket "${BUCKET_NAME}"`);
            console.log(`  Total de arquivos: ${data.length}`);
        }
    } catch (err) {
        console.error(`  ❌ ERRO GRAVE ao acessar o bucket:`, err);
    }

    // 3. Verificar políticas do bucket
    console.log('\n3. Tentando verificar políticas do bucket:');
    try {
        // Não podemos verificar políticas diretamente via API, mas podemos tentar uma operação teste
        const testFilename = `test-${Date.now()}.txt`;

        console.log('  Tentando fazer upload de um arquivo de teste...');
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(testFilename, new Blob(['test']), {
                contentType: 'text/plain',
            });

        if (uploadError) {
            console.error(`  ❌ ERRO no upload de teste:`, uploadError.message);
            if (uploadError.message.includes('policy')) {
                console.error('  O erro indica problemas com as políticas RLS. Você precisa configurar políticas para INSERT.');
            }
        } else {
            console.log('  ✅ Upload de teste bem-sucedido! Políticas de INSERT parecem estar funcionando.');

            // Limpar arquivo de teste
            console.log('  Removendo arquivo de teste...');
            await supabase.storage.from(BUCKET_NAME).remove([testFilename]);
        }
    } catch (err) {
        console.error('  ❌ ERRO GRAVE no teste de política:', err);
    }

    console.log('\n=======================================');
    console.log('Verificação concluída!');
}

// Executar a verificação
checkBucket()
    .catch(err => {
        console.error('Erro fatal durante a verificação:', err);
    }); 
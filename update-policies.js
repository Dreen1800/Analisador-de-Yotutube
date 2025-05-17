// Script para verificar e configurar políticas do bucket Supabase
import { createClient } from '@supabase/supabase-js';

// Pegue a URL e a chave do Supabase dos argumentos da linha de comando
const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];

if (!supabaseUrl || !supabaseKey) {
    console.error('Uso: node update-policies.js SUPABASE_URL SUPABASE_KEY');
    process.exit(1);
}

// Crie um cliente Supabase
console.log('Conectando ao Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'instagram-images';

async function testBucketPermissions() {
    console.log(`\nTestando permissões do bucket ${BUCKET_NAME}...`);

    // 1. Testar listagem
    try {
        console.log('\n1. Testando listagem do bucket:');
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list();

        if (error) {
            console.error(`  ❌ ERRO ao listar arquivos: ${error.message}`);
            console.log('  Você não tem permissão para listar arquivos neste bucket.');
        } else {
            console.log(`  ✅ Listagem bem-sucedida! Existem ${data.length} arquivos no bucket.`);
        }
    } catch (err) {
        console.error('  ❌ Erro ao testar listagem:', err);
    }

    // 2. Testar upload
    try {
        console.log('\n2. Testando upload para o bucket:');
        const testFile = `test-${Date.now()}.txt`;
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(testFile, new Blob(['Teste de política de upload']), {
                contentType: 'text/plain'
            });

        if (error) {
            console.error(`  ❌ ERRO ao fazer upload: ${error.message}`);

            if (error.message.includes('policy')) {
                console.log('  Este erro indica que você não tem permissão para upload.');
                console.log('  É necessário configurar políticas RLS para INSERT.');
            }
        } else {
            console.log('  ✅ Upload bem-sucedido!');

            // Remover arquivo de teste
            await supabase.storage.from(BUCKET_NAME).remove([testFile]);
            console.log('  ✅ Arquivo de teste removido com sucesso.');
        }
    } catch (err) {
        console.error('  ❌ Erro ao testar upload:', err);
    }
}

function generatePoliciesSQL() {
    return `
-- Certifique-se de que o bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('${BUCKET_NAME}', '${BUCKET_NAME}', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer pessoa pode ver arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem excluir arquivos" ON storage.objects;

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = '${BUCKET_NAME}'
);

-- Política para permitir leitura de arquivos para qualquer pessoa
CREATE POLICY "Qualquer pessoa pode ver arquivos"
ON storage.objects FOR SELECT TO public
USING (
    bucket_id = '${BUCKET_NAME}'
);

-- Política para permitir que usuários autenticados atualizem arquivos
CREATE POLICY "Usuários autenticados podem atualizar arquivos"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = '${BUCKET_NAME}'
);

-- Política para permitir que usuários autenticados excluam arquivos
CREATE POLICY "Usuários autenticados podem excluir arquivos"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = '${BUCKET_NAME}'
);
`;
}

async function showInstructions() {
    console.log('\n==========================================================');
    console.log('INSTRUÇÕES PARA CONFIGURAR POLÍTICAS DE ACESSO AO BUCKET');
    console.log('==========================================================');

    console.log('\nPara configurar corretamente as políticas do bucket, siga estes passos:');
    console.log('1. Acesse o painel do Supabase: https://app.supabase.com');
    console.log(`2. Navegue até seu projeto e acesse "SQL Editor"`);
    console.log('3. Cole e execute o seguinte código SQL:\n');

    console.log(generatePoliciesSQL());

    console.log('\nApós executar o SQL:');
    console.log('1. Navegue até "Storage" no menu lateral');
    console.log(`2. Verifique se o bucket "${BUCKET_NAME}" está listado`);
    console.log('3. Clique no bucket e depois em "Policies" na parte superior');
    console.log('4. Verifique se as políticas foram aplicadas corretamente\n');
}

async function main() {
    console.log('==========================================================');
    console.log('VERIFICAÇÃO DE PERMISSÕES DO BUCKET SUPABASE');
    console.log('==========================================================');

    try {
        await testBucketPermissions();
        await showInstructions();
    } catch (err) {
        console.error('\nErro durante a execução:', err);
    }
}

main(); 
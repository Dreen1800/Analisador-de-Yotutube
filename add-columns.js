// Script para adicionar colunas necessárias via API Supabase
import { createClient } from '@supabase/supabase-js';

// Pegue a URL e a chave do Supabase dos argumentos da linha de comando
const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];

if (!supabaseUrl || !supabaseKey) {
    console.error('Uso: node add-columns.js SUPABASE_URL SUPABASE_KEY');
    process.exit(1);
}

// Crie um cliente Supabase - NOTA: use a chave de serviço para ter permissões
// para executar SQL diretamente (não a chave anon/client)
console.log('Conectando ao Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIfColumnsExist() {
    console.log('Verificando se as colunas já existem...');

    try {
        // Tentar fazer um select com as colunas para ver se existem
        const { error: profileError } = await supabase
            .from('instagram_profiles')
            .select('profile_pic_from_supabase')
            .limit(1);

        const { error: postError } = await supabase
            .from('instagram_posts')
            .select('image_from_supabase')
            .limit(1);

        // Se não houver erro, as colunas existem
        if (!profileError && !postError) {
            console.log('✅ As colunas já existem no banco de dados!');
            return true;
        }

        // Verificar se o erro é relacionado à coluna não existir
        if (profileError && profileError.message.includes('column') &&
            profileError.message.includes('does not exist')) {
            console.log('❌ A coluna profile_pic_from_supabase não existe.');
        }

        if (postError && postError.message.includes('column') &&
            postError.message.includes('does not exist')) {
            console.log('❌ A coluna image_from_supabase não existe.');
        }

        return false;
    } catch (err) {
        console.error('Erro ao verificar colunas:', err);
        return false;
    }
}

async function addColumnsViaRPC() {
    console.log('Adicionando colunas via RPC...');

    try {
        // Executar SQL diretamente via RPC
        const { error } = await supabase.rpc('pgadmin_exec_sql', {
            sql: `
                -- Adicionar campos para rastrear imagens do Supabase
                ALTER TABLE instagram_profiles ADD COLUMN IF NOT EXISTS profile_pic_from_supabase BOOLEAN DEFAULT FALSE;
                ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS image_from_supabase BOOLEAN DEFAULT FALSE;
                
                -- Comentários explicativos
                COMMENT ON COLUMN instagram_profiles.profile_pic_from_supabase IS 'Indica se a imagem de perfil está armazenada no Supabase Storage';
                COMMENT ON COLUMN instagram_posts.image_from_supabase IS 'Indica se a imagem do post está armazenada no Supabase Storage';
            `
        });

        if (error) {
            console.error('Erro ao adicionar colunas via RPC:', error);
            console.log('\nNOTA: Este método requer uma função RPC personalizada.');
            console.log('      Você precisará executar a migração manualmente no SQL Editor do Supabase.');
            console.log('      Veja as instruções em INSTAGRAM-SETUP.md');
            return false;
        }

        console.log('✅ Colunas adicionadas com sucesso!');
        return true;
    } catch (err) {
        console.error('Erro ao adicionar colunas via RPC:', err);
        return false;
    }
}

async function addColumns() {
    console.log('===================================================');
    console.log('VERIFICAÇÃO E ADIÇÃO DE COLUNAS PARA IMAGENS SUPABASE');
    console.log('===================================================\n');

    // Verificar se as colunas já existem
    const columnsExist = await checkIfColumnsExist();

    if (columnsExist) {
        console.log('\n✅ Todas as colunas já existem. Não é necessário fazer alterações.');
        return;
    }

    // Tentar adicionar via RPC (provavelmente vai falhar, mas tentamos)
    const addedViaRPC = await addColumnsViaRPC();

    if (!addedViaRPC) {
        console.log('\n⚠️ INSTRUÇÕES PARA ADICIONAR COLUNAS MANUALMENTE:');
        console.log('1. Acesse o painel do Supabase e vá para "SQL Editor"');
        console.log('2. Cole e execute o seguinte SQL:');
        console.log(`
-- Adicionar campos para rastrear imagens do Supabase
ALTER TABLE instagram_profiles ADD COLUMN IF NOT EXISTS profile_pic_from_supabase BOOLEAN DEFAULT FALSE;
ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS image_from_supabase BOOLEAN DEFAULT FALSE;

-- Comentários explicativos
COMMENT ON COLUMN instagram_profiles.profile_pic_from_supabase IS 'Indica se a imagem de perfil está armazenada no Supabase Storage';
COMMENT ON COLUMN instagram_posts.image_from_supabase IS 'Indica se a imagem do post está armazenada no Supabase Storage';
        `);
    }

    console.log('\n===================================================');
}

// Executar a verificação e adição de colunas
addColumns()
    .catch(err => {
        console.error('Erro fatal durante o processamento:', err);
    }); 
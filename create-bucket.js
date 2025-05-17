// Script para garantir a criação do bucket no Supabase
import { createClient } from '@supabase/supabase-js';

// Cores para output no terminal
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

// Pegue a URL e a chave do Supabase dos argumentos da linha de comando
const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];

if (!supabaseUrl || !supabaseKey) {
    console.error(`${colors.red}Uso: node create-bucket.js URL_DO_SUPABASE CHAVE_DO_SUPABASE${colors.reset}`);
    console.error(`${colors.yellow}IMPORTANTE: Use a chave de serviço (service_role), não a chave anônima!${colors.reset}`);
    process.exit(1);
}

const BUCKET_NAME = 'instagram-images';

// Criar um cliente Supabase com a chave de serviço
console.log(`${colors.cyan}Conectando ao Supabase...${colors.reset}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucketDirectly() {
    console.log(`${colors.blue}Tentando criar o bucket '${BUCKET_NAME}' diretamente...${colors.reset}`);

    try {
        // Verificar se o bucket já existe
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
            console.error(`${colors.red}Erro ao listar buckets: ${listError.message}${colors.reset}`);
            console.error(`${colors.yellow}Verifique se você está usando a chave de serviço (service_role), não a chave anônima!${colors.reset}`);
            return false;
        }

        const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);

        if (bucketExists) {
            console.log(`${colors.green}O bucket '${BUCKET_NAME}' já existe!${colors.reset}`);
            return true;
        }

        // Criar o bucket se não existir
        console.log(`${colors.blue}Criando o bucket '${BUCKET_NAME}'...${colors.reset}`);
        const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: 50 * 1024 * 1024 // 50MB
        });

        if (error) {
            console.error(`${colors.red}Erro ao criar bucket: ${error.message}${colors.reset}`);
            return false;
        }

        console.log(`${colors.green}Bucket '${BUCKET_NAME}' criado com sucesso!${colors.reset}`);
        return true;
    } catch (err) {
        console.error(`${colors.red}Erro fatal: ${err.message}${colors.reset}`);
        return false;
    }
}

async function testBucketAccess() {
    console.log(`${colors.blue}Testando acesso ao bucket...${colors.reset}`);

    try {
        // Verificar se podemos listar arquivos
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list();

        if (error) {
            console.error(`${colors.red}Erro ao listar arquivos: ${error.message}${colors.reset}`);
            return false;
        }

        console.log(`${colors.green}Acesso ao bucket confirmado! ${data.length} arquivos encontrados.${colors.reset}`);
        return true;
    } catch (err) {
        console.error(`${colors.red}Erro ao testar acesso: ${err.message}${colors.reset}`);
        return false;
    }
}

async function testUpload() {
    console.log(`${colors.blue}Testando upload para o bucket...${colors.reset}`);

    try {
        const testFile = `test-${Date.now()}.txt`;
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(testFile, new Blob(['Teste de bucket']), {
                contentType: 'text/plain'
            });

        if (error) {
            console.error(`${colors.red}Erro ao fazer upload: ${error.message}${colors.reset}`);
            return false;
        }

        console.log(`${colors.green}Upload bem-sucedido!${colors.reset}`);

        // Remover arquivo de teste
        const { error: removeError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([testFile]);

        if (removeError) {
            console.warn(`${colors.yellow}Aviso: Não foi possível remover o arquivo de teste: ${removeError.message}${colors.reset}`);
        } else {
            console.log(`${colors.green}Arquivo de teste removido com sucesso.${colors.reset}`);
        }

        return true;
    } catch (err) {
        console.error(`${colors.red}Erro ao testar upload: ${err.message}${colors.reset}`);
        return false;
    }
}

async function criarEConfiguraBucket() {
    console.log(`${colors.cyan}============================================${colors.reset}`);
    console.log(`${colors.cyan}   CRIAÇÃO E VERIFICAÇÃO DO BUCKET SUPABASE   ${colors.reset}`);
    console.log(`${colors.cyan}============================================${colors.reset}`);

    // 1. Criar o bucket
    const bucketCreated = await createBucketDirectly();
    if (!bucketCreated) {
        console.error(`${colors.red}Falha ao criar o bucket. Abortando.${colors.reset}`);
        return;
    }

    // 2. Testar acesso ao bucket
    const accessOk = await testBucketAccess();
    if (!accessOk) {
        console.warn(`${colors.yellow}Falha ao acessar o bucket. Pode ser um problema de permissões.${colors.reset}`);
    }

    // 3. Testar upload
    const uploadOk = await testUpload();
    if (!uploadOk) {
        console.warn(`${colors.yellow}Falha ao fazer upload. Políticas de acesso podem estar faltando.${colors.reset}`);
        console.log(`${colors.blue}Execute o script SQL em supabase/setup-bucket.sql para configurar as políticas.${colors.reset}`);
    }

    console.log(`${colors.cyan}============================================${colors.reset}`);
    if (bucketCreated && accessOk && uploadOk) {
        console.log(`${colors.green}Bucket criado e configurado com SUCESSO!${colors.reset}`);
    } else if (bucketCreated) {
        console.log(`${colors.yellow}Bucket criado, mas há problemas de acesso ou permissões.${colors.reset}`);
    } else {
        console.log(`${colors.red}Falha ao criar ou configurar o bucket.${colors.reset}`);
    }
    console.log(`${colors.cyan}============================================${colors.reset}`);
}

// Executar
criarEConfiguraBucket()
    .catch(err => {
        console.error(`${colors.red}Erro fatal: ${err.message}${colors.reset}`);
    }); 
// Este é um script de teste simples para verificar o bucket do Supabase
// Execute com: node test-bucket.js URL CHAVE

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

console.log(`${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.cyan}   TESTE DE BUCKET SUPABASE   ${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}`);

// Pegue a URL e a chave do Supabase dos argumentos da linha de comando
const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];

if (!supabaseUrl || !supabaseKey) {
    console.error(`${colors.red}Erro: Faltam parâmetros obrigatórios!${colors.reset}`);
    console.log(`${colors.yellow}Uso: node test-bucket.js SUPABASE_URL SUPABASE_KEY${colors.reset}`);
    console.log(`${colors.yellow}Exemplo: node test-bucket.js https://seu-projeto.supabase.co eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...${colors.reset}`);
    process.exit(1);
}

// Validar formato da URL
if (!supabaseUrl.startsWith('http')) {
    console.error(`${colors.red}Erro: URL do Supabase inválida! Deve começar com http:// ou https://${colors.reset}`);
    process.exit(1);
}

// Validar formato básico da chave
if (supabaseKey.length < 20) {
    console.error(`${colors.red}Aviso: A chave Supabase parece muito curta! Verifique se é a chave correta.${colors.reset}`);
}

// Crie um cliente Supabase
console.log(`${colors.blue}Conectando ao Supabase em: ${supabaseUrl}${colors.reset}`);
const supabase = createClient(supabaseUrl, supabaseKey);

// URL de teste para fazer upload
const TEST_IMAGE_URL = 'https://picsum.photos/400/400';
const BUCKET_NAME = 'instagram-images';

// Função para listar buckets
async function listBuckets() {
    console.log(`${colors.blue}Listando buckets disponíveis...${colors.reset}`);
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error(`${colors.red}Erro ao listar buckets: ${error.message}${colors.reset}`);
        if (error.message.includes("JWT")) {
            console.log(`${colors.yellow}Dica: Parece haver um problema com a autenticação. Verifique se você está usando a chave anon/service correta.${colors.reset}`);
        }
        return false;
    }

    if (buckets.length === 0) {
        console.log(`${colors.yellow}Nenhum bucket encontrado! Você precisa criar o bucket '${BUCKET_NAME}' no Supabase.${colors.reset}`);
        return false;
    }

    console.log(`${colors.green}Buckets encontrados:${colors.reset}`);
    let bucketFound = false;
    buckets.forEach(bucket => {
        const isTarget = bucket.name === BUCKET_NAME;
        const color = isTarget ? colors.green : colors.reset;
        console.log(`${color}- ${bucket.name} (${bucket.public ? 'público' : 'privado'})${isTarget ? ' ✓' : ''}${colors.reset}`);
        if (isTarget) bucketFound = true;
    });

    if (!bucketFound) {
        console.log(`${colors.yellow}Aviso: O bucket '${BUCKET_NAME}' não foi encontrado! Você precisa criá-lo.${colors.reset}`);
        return false;
    }

    return true;
}

// Função para verificar as políticas de acesso
async function checkPolicies() {
    console.log(`${colors.blue}Verificando políticas do bucket...${colors.reset}`);

    // Tentativa simples de verificar se há permissão para listar arquivos
    const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list();

    if (listError) {
        console.error(`${colors.red}Erro ao listar arquivos: ${listError.message}${colors.reset}`);
        console.log(`${colors.yellow}Dica: Você pode precisar adicionar políticas de acesso para o bucket.${colors.reset}`);
        return false;
    }

    console.log(`${colors.green}✓ Acesso de leitura ao bucket confirmado${colors.reset}`);
    return true;
}

// Função para testar o upload de uma imagem
async function testUpload() {
    console.log(`\n${colors.blue}Testando upload para o Supabase...${colors.reset}`);
    try {
        // Primeiro baixar a imagem
        console.log(`Baixando imagem de teste: ${TEST_IMAGE_URL}`);
        const response = await fetch(TEST_IMAGE_URL);
        if (!response.ok) {
            throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`${colors.green}✓ Imagem baixada: ${buffer.length} bytes${colors.reset}`);

        // Gerar nome único
        const timestamp = Date.now();
        const filename = `test-${timestamp}.jpg`;

        // Fazer upload
        console.log(`Enviando para ${BUCKET_NAME}/test/${filename}...`);
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(`test/${filename}`, buffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) {
            if (error.message.includes("policy")) {
                console.error(`${colors.red}Erro de política de acesso! Você precisa configurar as políticas para permitir uploads.${colors.reset}`);
                console.log(`${colors.yellow}Consulte o arquivo supabase/setup-bucket.sql para as políticas necessárias.${colors.reset}`);
            } else {
                console.error(`${colors.red}Erro no upload: ${error.message}${colors.reset}`);
            }
            return false;
        }

        // Pegar URL pública
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(`test/${filename}`);

        console.log(`${colors.green}✓ Upload bem-sucedido!${colors.reset}`);
        console.log(`URL pública: ${urlData.publicUrl}`);

        // Testar se a URL é acessível
        try {
            const checkResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
            if (checkResponse.ok) {
                console.log(`${colors.green}✓ URL pública acessível!${colors.reset}`);
            } else {
                console.log(`${colors.yellow}⚠ URL pública retornou status ${checkResponse.status}. Verifique se o bucket está configurado como público.${colors.reset}`);
            }
        } catch (checkError) {
            console.warn(`${colors.yellow}⚠ Não foi possível verificar acesso à URL pública: ${checkError.message}${colors.reset}`);
        }

        return true;
    } catch (error) {
        console.error(`${colors.red}Erro no upload: ${error.message}${colors.reset}`);
        return false;
    }
}

// Função principal para executar os testes
async function runTests() {
    console.log(`${colors.blue}Iniciando testes do bucket Supabase...${colors.reset}`);

    let bucketExists = await listBuckets();
    if (!bucketExists) {
        console.log(`${colors.yellow}Falha na verificação de buckets. Verifique se o bucket '${BUCKET_NAME}' existe.${colors.reset}`);
        return false;
    }

    let policiesOk = await checkPolicies();
    if (!policiesOk) {
        console.log(`${colors.yellow}Falha na verificação de políticas. Configure as políticas do bucket.${colors.reset}`);
    }

    let uploadSuccess = await testUpload();
    if (!uploadSuccess) {
        console.log(`${colors.red}Falha no teste de upload. Verifique as políticas de permissão.${colors.reset}`);
        return false;
    }

    console.log(`\n${colors.green}================================${colors.reset}`);
    console.log(`${colors.green}   TODOS OS TESTES PASSARAM!   ${colors.reset}`);
    console.log(`${colors.green}================================${colors.reset}`);
    console.log(`${colors.green}O bucket ${BUCKET_NAME} está configurado corretamente e pronto para uso!${colors.reset}`);

    return true;
}

// Executar todos os testes
runTests()
    .then(success => {
        if (!success) {
            console.log(`\n${colors.yellow}Alguns testes falharam. Consulte as mensagens acima para mais detalhes.${colors.reset}`);
            console.log(`${colors.yellow}Dica: Execute o script SQL em supabase/setup-bucket.sql para configurar as políticas necessárias.${colors.reset}`);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`${colors.red}Erro durante os testes: ${error.message}${colors.reset}`);
        process.exit(1);
    }); 
// Script para implantar as funções serverless do Supabase
// Execute com: node deploy-functions.js

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar se as variáveis de ambiente necessárias estão configuradas
// Usando os nomes das variáveis que o usuário já tem configurados
const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_SERVICE_KEY'];
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
    console.error(`Erro: As seguintes variáveis de ambiente são necessárias: ${missingVars.join(', ')}`);
    console.error('Adicione-as ao arquivo .env na raiz do projeto.');
    process.exit(1);
}

// Exportar as variáveis com os nomes que a CLI do Supabase espera
process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY;

// Imprimir para debug (sem mostrar a chave completa)
console.log(`URL do Supabase: ${process.env.SUPABASE_URL}`);
console.log(`Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5)}...${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(process.env.SUPABASE_SERVICE_ROLE_KEY.length - 5)}`);

// Pasta de funções do Supabase
const functionsDir = path.join(process.cwd(), 'supabase', 'functions');

// Verificar se a pasta existe
if (!fs.existsSync(functionsDir)) {
    console.error(`Erro: A pasta ${functionsDir} não existe.`);
    process.exit(1);
}

// Ler todas as pastas dentro da pasta de funções
const funcFolders = fs.readdirSync(functionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name !== '_shared'); // Ignorar a pasta _shared

if (funcFolders.length === 0) {
    console.error('Nenhuma função encontrada para implantar.');
    process.exit(1);
}

console.log('Funções encontradas:', funcFolders.join(', '));

// Implantar cada função
funcFolders.forEach(funcName => {
    try {
        console.log(`\nImplantando função: ${funcName}`);

        // Verificar se o arquivo index.ts existe
        const indexFile = path.join(functionsDir, funcName, 'index.ts');
        if (!fs.existsSync(indexFile)) {
            console.error(`Erro: O arquivo ${indexFile} não existe.`);
            return;
        }

        // Executar o comando de implantação usando Supabase CLI
        console.log('Executando comando de implantação...');

        // O comando abaixo é para o CLI do Supabase
        // É necessário ter o CLI instalado e configurado
        // npm install -g supabase
        // supabase login
        try {
            execSync(`supabase functions deploy ${funcName}`, {
                stdio: 'inherit',
                env: process.env
            });
            console.log(`✅ Função ${funcName} implantada com sucesso!`);
        } catch (error) {
            console.error(`❌ Erro ao implantar a função ${funcName}:`, error.message);
        }
    } catch (error) {
        console.error(`Erro ao processar a função ${funcName}:`, error.message);
    }
});

console.log('\nProcesso de implantação concluído.'); 
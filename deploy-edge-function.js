// Script para implantar funções serverless do Supabase usando a API REST diretamente
// Este script não depende do CLI do Supabase
// Execute com: node deploy-edge-function.js

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Função para ler um diretório recursivamente
function readDirRecursive(dir, root = dir) {
    const result = [];
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.relative(root, filePath);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            result.push(...readDirRecursive(filePath, root));
        } else {
            result.push({
                path: relativePath.replace(/\\/g, '/'), // Normalizar caminho para formato Unix
                content: fs.readFileSync(filePath, 'utf8')
            });
        }
    });

    return result;
}

// Função para implantar uma função Edge
async function deployEdgeFunction(functionName) {
    try {
        console.log(`\nPreparando implantação da função: ${functionName}`);

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_KEY são necessários');
        }

        // Caminho para a pasta da função
        const functionDir = path.join(process.cwd(), 'supabase', 'functions', functionName);

        // Verificar se o diretório existe
        if (!fs.existsSync(functionDir)) {
            throw new Error(`Diretório da função não encontrado: ${functionDir}`);
        }

        // Verificar se o arquivo index.ts existe
        const indexFile = path.join(functionDir, 'index.ts');
        if (!fs.existsSync(indexFile)) {
            throw new Error(`Arquivo index.ts não encontrado em: ${functionDir}`);
        }

        // Ler todos os arquivos na pasta da função
        console.log('Lendo arquivos da função...');
        const functionFiles = readDirRecursive(functionDir);

        // Verificar se há um arquivo config.json
        const configFile = functionFiles.find(file => file.path === 'config.json');
        let config = {};

        if (configFile) {
            try {
                config = JSON.parse(configFile.content);
                console.log('Configuração encontrada:', config);
            } catch (e) {
                console.warn('Erro ao processar arquivo config.json:', e.message);
            }
        }

        // Importar arquivos compartilhados
        const sharedDir = path.join(process.cwd(), 'supabase', 'functions', '_shared');
        let sharedFiles = [];

        if (fs.existsSync(sharedDir)) {
            console.log('Importando arquivos compartilhados...');
            sharedFiles = readDirRecursive(sharedDir).map(file => ({
                ...file,
                path: `_shared/${file.path}` // Prefixar com _shared/
            }));
        }

        // Combinar todos os arquivos
        const allFiles = [...functionFiles, ...sharedFiles];

        // Construir o payload para a API
        const payload = {
            name: functionName,
            verify_jwt: config.verify_jwt || false,
            import_map: config.import_map || null,
            entrypoint_path: 'index.ts',
            version: "v1",
            headers: config.headers || null,
            files: allFiles.reduce((acc, file) => {
                acc[file.path] = file.content;
                return acc;
            }, {})
        };

        console.log(`Enviando função ${functionName} para o Supabase...`);
        console.log(`API URL: ${supabaseUrl}/functions/v1/metadata`);

        // Chamar a API do Supabase para implantar a função
        const response = await axios.post(
            `${supabaseUrl}/functions/v1/metadata`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`
                }
            }
        );

        console.log(`✅ Função ${functionName} implantada com sucesso!`);
        console.log(`Status: ${response.status}`);
        console.log(`URL da função: ${supabaseUrl}/functions/v1/${functionName}`);

        return {
            success: true,
            functionName,
            url: `${supabaseUrl}/functions/v1/${functionName}`
        };

    } catch (error) {
        console.error(`❌ Erro ao implantar função ${functionName}:`, error.message);
        if (error.response) {
            console.error('Detalhes da resposta:', error.response.data);
        }

        return {
            success: false,
            functionName,
            error: error.message
        };
    }
}

// Função principal
async function main() {
    try {
        // Obter o nome da função a ser implantada
        const functionName = process.argv[2] || 'download-instagram-image';

        if (!functionName) {
            console.error('Por favor, especifique o nome da função a ser implantada.');
            process.exit(1);
        }

        console.log(`Iniciando implantação da função: ${functionName}`);

        const result = await deployEdgeFunction(functionName);

        if (result.success) {
            console.log('\nImplantação concluída com sucesso!');
            console.log(`URL da função: ${result.url}`);
        } else {
            console.error('\nFalha na implantação da função.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Erro fatal:', error);
        process.exit(1);
    }
}

// Executar o script
main(); 
// server/instagram-proxy.js
// Servidor proxy simples para imagens do Instagram (para desenvolvimento)

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Configurar CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Vite e Create React App
    credentials: true
}));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rota do proxy para imagens do Instagram
app.get('/instagram-img-proxy/*', async (req, res) => {
    try {
        // Extrair o caminho da imagem da URL
        const imagePath = req.url.replace('/instagram-img-proxy', '');
        
        // Construir URLs possíveis do Instagram
        const possibleUrls = [
            `https://scontent.cdninstagram.com${imagePath}`,
            `https://instagram.com${imagePath}`,
            `https://scontent-gru2-1.cdninstagram.com${imagePath}`,
            `https://scontent-gru2-2.cdninstagram.com${imagePath}`,
            `https://fbcdn.net${imagePath}`
        ];

        let imageResponse = null;
        let lastError = null;

        // Tentar cada URL até encontrar uma que funcione
        for (const url of possibleUrls) {
            try {
                console.log(`Tentando buscar imagem em: ${url}`);
                
                imageResponse = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Referer': 'https://www.instagram.com/',
                        'Sec-Fetch-Dest': 'image',
                        'Sec-Fetch-Mode': 'no-cors',
                        'Sec-Fetch-Site': 'cross-site',
                        'Cache-Control': 'no-cache'
                    },
                    timeout: 10000
                });

                if (imageResponse.ok) {
                    console.log(`Sucesso ao buscar imagem: ${url}`);
                    break;
                } else {
                    console.log(`Erro HTTP ${imageResponse.status} para: ${url}`);
                    lastError = new Error(`HTTP ${imageResponse.status}`);
                    imageResponse = null;
                }
            } catch (error) {
                console.log(`Erro ao buscar ${url}:`, error.message);
                lastError = error;
                imageResponse = null;
            }
        }

        if (!imageResponse || !imageResponse.ok) {
            console.error('Nenhuma URL funcionou para a imagem:', imagePath);
            return res.status(404).json({ 
                error: 'Imagem não encontrada', 
                path: imagePath,
                lastError: lastError?.message 
            });
        }

        // Configurar cabeçalhos de resposta
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const contentLength = imageResponse.headers.get('content-length');
        
        res.set({
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
        });

        if (contentLength) {
            res.set('Content-Length', contentLength);
        }

        // Fazer streaming da imagem
        imageResponse.body.pipe(res);
        
    } catch (error) {
        console.error('Erro no proxy de imagem:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor', 
            message: error.message 
        });
    }
});

// Rota de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Instagram Image Proxy is running',
        timestamp: new Date().toISOString()
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.originalUrl
    });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro no servidor:', error);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🖼️  Instagram Image Proxy running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/instagram-img-proxy/*`);
});

module.exports = app;
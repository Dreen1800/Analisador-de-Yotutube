// server/instagram-proxy-production.js
// Servidor proxy otimizado para produção

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || process.env.PROXY_PORT || 3001;

// Middleware de segurança
app.use(helmet({
    contentSecurityPolicy: false, // Desabilitar CSP para imagens
    crossOriginEmbedderPolicy: false
}));

// Compressão
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // máximo 100 requests por IP
    message: {
        error: 'Muitas requisições. Tente novamente em alguns minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/instagram-img-proxy', limiter);

// Configurar CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN ?
        process.env.CORS_ORIGIN.split(',') :
        ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware para logging em produção
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const logLevel = process.env.LOG_LEVEL || 'info';

    if (logLevel === 'debug' || req.url.includes('/health')) {
        console.log(`${timestamp} - ${req.method} ${req.url} - IP: ${req.ip}`);
    }
    next();
});

// Cache em memória simples para URLs frequentes
const imageCache = new Map();
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600000; // 1 hora

// Função para limpar cache expirado
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of imageCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            imageCache.delete(key);
        }
    }
}, CACHE_TTL / 2); // Limpar a cada 30 minutos

// Rota do proxy para imagens do Instagram
app.get('/instagram-img-proxy/*', async (req, res) => {
    try {
        const imagePath = req.url.replace('/instagram-img-proxy', '');
        const cacheKey = imagePath;

        // Verificar cache
        const cached = imageCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            res.set({
                'Content-Type': cached.contentType,
                'Cache-Control': 'public, max-age=3600',
                'X-Cache': 'HIT'
            });
            return res.send(cached.data);
        }

        // Construir URLs possíveis do Instagram
        const possibleUrls = [
            `https://scontent.cdninstagram.com${imagePath}`,
            `https://instagram.com${imagePath}`,
            `https://scontent-gru2-1.cdninstagram.com${imagePath}`,
            `https://scontent-gru2-2.cdninstagram.com${imagePath}`,
            `https://scontent-mia3-1.cdninstagram.com${imagePath}`,
            `https://scontent-mia3-2.cdninstagram.com${imagePath}`,
            `https://scontent-mia3-3.cdninstagram.com${imagePath}`,
            `https://scontent-mia5-1.cdninstagram.com${imagePath}`,
            `https://fbcdn.net${imagePath}`
        ];

        let imageResponse = null;
        let lastError = null;

        // Tentar cada URL até encontrar uma que funcione
        for (const url of possibleUrls) {
            try {
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
                    timeout: 15000 // 15 segundos timeout
                });

                if (imageResponse.ok) {
                    break;
                } else {
                    lastError = new Error(`HTTP ${imageResponse.status}`);
                    imageResponse = null;
                }
            } catch (error) {
                lastError = error;
                imageResponse = null;
            }
        }

        if (!imageResponse || !imageResponse.ok) {
            console.error(`Falha ao buscar imagem: ${imagePath}`, lastError?.message);
            return res.status(404).json({
                error: 'Imagem não encontrada',
                path: imagePath,
                message: 'Todas as URLs do Instagram falharam'
            });
        }

        // Ler dados da imagem
        const imageBuffer = await imageResponse.buffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // Salvar no cache
        imageCache.set(cacheKey, {
            data: imageBuffer,
            contentType: contentType,
            timestamp: Date.now()
        });

        // Configurar cabeçalhos de resposta
        res.set({
            'Content-Type': contentType,
            'Content-Length': imageBuffer.length,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
            'X-Cache': 'MISS'
        });

        // Enviar imagem
        res.send(imageBuffer);

    } catch (error) {
        console.error('Erro no proxy de imagem:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
});

// Rota de health check
app.get('/health', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json({
        status: 'ok',
        message: 'Instagram Image Proxy is running',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)} minutos`,
        memory: {
            used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
            total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`
        },
        cache: {
            size: imageCache.size,
            maxAge: `${CACHE_TTL / 1000 / 60} minutos`
        },
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rota para estatísticas (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    app.get('/stats', (req, res) => {
        res.json({
            cache: {
                size: imageCache.size,
                entries: Array.from(imageCache.keys()).slice(0, 10) // Primeiras 10 entradas
            },
            memory: process.memoryUsage(),
            uptime: process.uptime()
        });
    });
}

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.originalUrl,
        availableRoutes: ['/health', '/instagram-img-proxy/*']
    });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro no servidor:', error);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Recebido SIGTERM, encerrando servidor graciosamente...');
    server.close(() => {
        console.log('Servidor encerrado.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Recebido SIGINT, encerrando servidor graciosamente...');
    server.close(() => {
        console.log('Servidor encerrado.');
        process.exit(0);
    });
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🖼️  Instagram Image Proxy (Production) running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/instagram-img-proxy/*`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Cache TTL: ${CACHE_TTL / 1000 / 60} minutos`);
});

module.exports = app; 
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Instagram image proxy with dynamic URL handling
app.get('/instagram-proxy/*', async (req, res) => {
    try {
        const originalPath = req.params[0];
        const imageUrl = `https://scontent-mia3-1.cdninstagram.com/${originalPath}`;

        console.log(`Proxying image: ${imageUrl}`);

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Set appropriate headers
        res.set({
            'Content-Type': response.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
        });

        // Pipe the image data
        response.body.pipe(res);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
});

// Dynamic Instagram proxy endpoint
app.get('/api/instagram-proxy', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log(`Dynamic proxy for: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        res.set({
            'Content-Type': response.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
        });

        response.body.pipe(res);

    } catch (error) {
        console.error('Dynamic proxy error:', error);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Instagram Proxy Server running on port ${PORT}`);
    console.log(`📡 Endpoints available:`);
    console.log(`   - /instagram-proxy/{path} - Direct path proxy`);
    console.log(`   - /api/instagram-proxy?url={url} - Dynamic URL proxy`);
    console.log(`   - /health - Health check`);
}); 
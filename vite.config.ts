import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { parse as parseUrl } from 'url';

// Função para identificar e extrair o domínio correto de uma URL do Instagram
function extractInstagramDomain(url: string): string | null {
  try {
    if (!url) return null;

    // Verificar se é uma URL do Instagram
    if (
      url.includes('instagram.com') ||
      url.includes('cdninstagram.com') ||
      url.includes('fbcdn.net')
    ) {
      const parsed = parseUrl(url);
      return parsed.hostname || null;
    }

    return null;
  } catch (error) {
    console.error('Erro ao extrair domínio do Instagram:', error);
    return null;
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: {},
  },
  resolve: {
    alias: {
      // Para compatibilidade com o Buffer no navegador
      buffer: 'buffer'
    }
  },
  server: {
    proxy: {
      // Proxy simples e direto para contornar CORS com imagens do Instagram
      '/instagram-img-proxy': {
        target: 'https://scontent-mia3-1.cdninstagram.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/instagram-img-proxy/, ''),
        configure: (proxy) => {
          // Adicionar headers que ajudam a evitar bloqueio
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Modificar o host para o domínio correto baseado na URL original que está nos cabeçalhos
            const originalUrl = req.headers['x-original-url'] || '';
            if (typeof originalUrl === 'string' && originalUrl.includes('cdninstagram.com')) {
              try {
                const urlObj = new URL(originalUrl);
                proxyReq.setHeader('Host', urlObj.host);
              } catch (e) {
                console.error('Erro ao processar URL original:', e);
              }
            }

            // Headers importantes para evitar bloqueio
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
            proxyReq.setHeader('Referer', 'https://www.instagram.com/');
            proxyReq.setHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9,pt;q=0.8');
            proxyReq.setHeader('Cache-Control', 'no-cache');
          });

          // Gerenciar erros do proxy
          proxy.on('error', (err, req, res) => {
            console.error('Erro no proxy de imagem do Instagram:', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Erro ao recuperar imagem do Instagram via proxy');
            }
          });
        }
      },
      // Proxy para contornar problemas de CORS com imagens do Instagram
      '/instagram-proxy': {
        target: 'https://instagram.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/instagram-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Adiciona headers que ajudam a evitar bloqueio
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
            proxyReq.setHeader('Referer', 'https://www.instagram.com/');
          });
        }
      },
      // Proxy específico para imagens do CDN do Instagram
      '/instagram-image-proxy': {
        target: 'https://instagram.fkhi17-2.fna.fbcdn.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/instagram-image-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
            proxyReq.setHeader('Referer', 'https://www.instagram.com/');
            proxyReq.setHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
          });
        }
      },
      // Novo proxy para API de proxy de imagens do Instagram (baseado na URL)
      '/api/proxy-image': {
        target: 'https://www.instagram.com',
        changeOrigin: true,
        bypass: (req, res) => {
          // CORS preflight handling
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Access-Control-Max-Age', '86400');
            res.end();
            return true;
          }

          // Este é um handler personalizado que substitui a rota API
          if (req.method === 'POST') {
            // Implementação do proxy direto no Vite
            try {
              const bodyParser = () => {
                return new Promise((resolve) => {
                  let body = '';
                  req.on('data', (chunk) => {
                    body += chunk.toString();
                  });
                  req.on('end', () => {
                    try {
                      resolve(JSON.parse(body));
                    } catch (e) {
                      resolve({});
                    }
                  });
                });
              };

              // Processamento assíncrono
              (async () => {
                try {
                  const body = await bodyParser() as any;
                  const { url, bucket, path } = body;

                  if (!url || !bucket || !path) {
                    res.statusCode = 400;
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'URL, bucket e path são obrigatórios' }));
                    return;
                  }

                  console.log(`Proxy Vite requisitado para imagem: ${url}`);

                  // Importando módulos necessários diretamente
                  // Executar o proxy diretamente do código do Vite
                  const { createClient } = await import('@supabase/supabase-js');
                  const axios = await import('axios');

                  // Obter as variáveis de ambiente do arquivo .env (VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_KEY)
                  const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
                  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_SERVICE_KEY;

                  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

                  // Baixar a imagem com axios (no servidor do Vite não há CORS)
                  const response = await axios.default.get(url, {
                    responseType: 'arraybuffer',
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                      'Referer': 'https://www.instagram.com/'
                    },
                    maxRedirects: 5
                  });

                  // Determine content-type
                  const contentType = response.headers['content-type'] || 'image/jpeg';

                  // Upload to Supabase
                  const { data, error: uploadError } = await supabaseAdmin.storage
                    .from(bucket)
                    .upload(path, response.data, {
                      contentType,
                      upsert: true,
                      cacheControl: '3600'
                    });

                  if (uploadError) {
                    throw new Error(`Falha ao fazer upload para o Supabase: ${uploadError.message}`);
                  }

                  // Get public URL
                  const { data: urlData } = supabaseAdmin.storage
                    .from(bucket)
                    .getPublicUrl(path);

                  // Responder com sucesso e URL pública
                  res.statusCode = 200;
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: true,
                    publicUrl: urlData.publicUrl
                  }));

                } catch (error: any) {
                  console.error('Erro no proxy de imagem do Vite:', error);
                  res.statusCode = 500;
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    error: error.message || 'Erro desconhecido no proxy de imagem'
                  }));
                }
              })();

              // Return false para indicar que estamos lidando com a requisição manualmente
              return false;
            } catch (e) {
              console.error('Erro ao processar requisição proxy:', e);
              return false;
            }
          }
        }
      }
    }
  }
});

// Função Serverless Supabase para download de imagens do Instagram
// Esta função contorna as restrições de CORS fazendo o download no servidor

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
    imageUrl: string;
    storagePath: string;
    bucketName: string;
}

serve(async (req) => {
    // Configurar CORS específico para a requisição
    const origin = req.headers.get('Origin') || '*';
    const specificCorsHeaders = {
        ...corsHeaders,
        'Access-Control-Allow-Origin': origin
    };

    // Lidar com requisições preflight CORS (OPTIONS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: specificCorsHeaders });
    }

    try {
        // Configurar o cliente Supabase com a Service Key (Acesso Admin)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Extrair parâmetros do corpo da requisição
        const { imageUrl, storagePath, bucketName } = await req.json() as RequestBody;

        if (!imageUrl || !storagePath || !bucketName) {
            return new Response(
                JSON.stringify({ error: 'URL da imagem, caminho ou nome do bucket não fornecidos' }),
                { status: 400, headers: { ...specificCorsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Baixando imagem: ${imageUrl}`);
        console.log(`Para o caminho: ${storagePath}`);
        console.log(`No bucket: ${bucketName}`);

        // Baixar a imagem usando fetch (sem limitações de CORS no servidor)
        const imageResponse = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': 'https://www.instagram.com/',
            },
        });

        if (!imageResponse.ok) {
            throw new Error(`Erro ao baixar imagem: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        // Ler o conteúdo da imagem como ArrayBuffer
        const imageBuffer = await imageResponse.arrayBuffer();

        // Determinar o tipo de conteúdo
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // Fazer upload da imagem para o Supabase Storage
        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(storagePath, imageBuffer, {
                contentType,
                upsert: true,
                cacheControl: '3600',
            });

        if (error) {
            throw new Error(`Erro ao fazer upload para o Storage: ${error.message}`);
        }

        // Obter a URL pública da imagem
        const { data: urlData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(storagePath);

        if (!urlData.publicUrl) {
            throw new Error('Não foi possível obter a URL pública da imagem');
        }

        // Retornar resposta de sucesso com a URL pública
        return new Response(
            JSON.stringify({ success: true, publicUrl: urlData.publicUrl }),
            { status: 200, headers: { ...specificCorsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Erro na função:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...specificCorsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}); 
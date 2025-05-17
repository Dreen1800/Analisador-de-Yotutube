import axios from 'axios'; import { supabase, supabaseAdmin } from '../lib/supabaseClient';

// Constante com o nome do bucket para uso em toda a aplicação - usar traço
const INSTAGRAM_IMAGES_BUCKET = 'instagram-images';

// Primeiro, vamos atualizar a interface do objeto de post para incluir a nova propriedade
interface InstagramPost {
    profile_id: string;
    instagram_id: string;
    short_code: string;
    type: string;
    url: string;
    caption: string;
    timestamp: string;
    likes_count: number;
    comments_count: number;
    video_view_count?: number;
    display_url: string;
    is_video: boolean;
    hashtags: string | null;
    mentions: string | null;
    product_type: string | null;
    is_comments_disabled: boolean | null;
    image_from_supabase?: boolean; // Nova propriedade adicionada
    supabase_url?: boolean; // Flag temporária
}

// Função aprimorada para verificar se o bucket existe usando a chave secreta do Supabase
async function ensureImageBucketExists(): Promise<boolean> {
    try {
        console.log('Verificando se o bucket existe...');

        // Tentar listar o bucket usando o cliente admin com chave secreta
        const { data, error } = await supabaseAdmin.storage
            .from(INSTAGRAM_IMAGES_BUCKET)
            .list('', { limit: 1 });

        if (!error) {
            console.log(`Acesso ao bucket ${INSTAGRAM_IMAGES_BUCKET} bem-sucedido.`);
            return true;
        }

        // Se houver erro no acesso, verificar se é um erro de "bucket não existe"
        if (error.message && (
            error.message.includes('does not exist') ||
            error.message.includes('não existe')
        )) {
            console.log(`Bucket ${INSTAGRAM_IMAGES_BUCKET} não encontrado. Tentando criar...`);

            // Tentar criar o bucket - isso só funciona com a chave secreta
            try {
                const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket(
                    INSTAGRAM_IMAGES_BUCKET,
                    { public: true }
                );

                if (createError) {
                    console.error('Erro ao criar bucket:', createError);
                    return false;
                }

                console.log(`Bucket ${INSTAGRAM_IMAGES_BUCKET} criado com sucesso!`);
                return true;
            } catch (createBucketError) {
                console.error('Erro ao tentar criar bucket:', createBucketError);
                return false;
            }
        } else {
            console.error(`Erro de acesso ao bucket: ${error.message}`);
            return false;
        }
    } catch (error) {
        console.error('Erro ao verificar bucket:', error);
        return false;
    }
}

// Get the API key from Supabase
const getApifyKey = async (): Promise<string> => {
    try {
        const { data, error } = await supabase
            .from('apify_keys')
            .select('*')
            .eq('is_active', true)
            .single();

        if (error) throw error;
        if (!data) throw new Error('No active Apify API key found');

        return data.api_key;
    } catch (error: any) {
        console.error('Error fetching Apify key:', error);
        throw new Error('Failed to retrieve Apify API key. Please add an Apify API key in your settings.');
    }
};

// Função simples para converter URLs do Instagram para o proxy local
function convertToProxyUrl(imageUrl: string): string {
    if (!imageUrl || !imageUrl.startsWith('http')) return '';

    // Qualquer URL do Instagram deve ser redirecionada pelo proxy
    if (imageUrl.includes('instagram.com') ||
        imageUrl.includes('cdninstagram') ||
        imageUrl.includes('fbcdn.net')) {

        try {
            // Extrair apenas o caminho da URL original após o domínio
            const urlParts = new URL(imageUrl);
            const path = urlParts.pathname + urlParts.search;

            // Criar URL de proxy local básica
            return `/instagram-img-proxy${path}`;
        } catch (error) {
            console.error('Erro ao processar URL do Instagram:', error);
            return imageUrl; // Retornar URL original em caso de erro
        }
    }

    // Retornar URL original para outras fontes
    return imageUrl;
}

// Função simplificada para apenas retornar URL via proxy
export async function downloadAndStoreImage(imageUrl: string, storagePath: string): Promise<string | null> {
    // Validação básica de URL
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        console.warn('URL inválida:', imageUrl);
        return imageUrl;
    }

    try {
        // Em desenvolvimento, apenas usar proxy local
        const proxiedUrl = convertToProxyUrl(imageUrl);

        // Verificar se a URL foi convertida corretamente
        if (proxiedUrl && proxiedUrl !== imageUrl) {
            console.log(`URL convertida para proxy: ${proxiedUrl}`);
            return proxiedUrl;
        } else {
            console.warn(`Falha ao converter URL para proxy: ${imageUrl}`);
            return imageUrl; // Retornar a URL original se falhar
        }
    } catch (error) {
        console.error(`Erro ao processar URL ${imageUrl}:`, error);
        return imageUrl; // Retornar URL original em caso de erro
    }
}

// Função utilitária para componentes de exibição verificarem se a URL é do Supabase
export function getProxiedImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';

    // Se já for uma URL do Supabase Storage, retornar como está
    if (imageUrl.includes('supabase') || imageUrl.includes('/storage/v1/')) {
        return imageUrl;
    }

    // Se já for uma URL de proxy local, retornar como está
    if (imageUrl.startsWith('/instagram-img-proxy')) {
        return imageUrl;
    }

    // Para URLs externas do Instagram, usar o proxy
    if (imageUrl.includes('instagram.com') ||
        imageUrl.includes('cdninstagram.com') ||
        imageUrl.includes('fbcdn.net')) {
        return convertToProxyUrl(imageUrl);
    }

    return imageUrl;
}

// Helper function to get the best possible profile image URL
const getBestProfileImageUrl = (profileData: any): string => {
    // Try different possible fields for profile images
    const possibleUrls = [
        profileData.profilePicUrlHD,
        profileData.profilePicUrl,
        profileData.profile_pic_url_hd,
        profileData.profile_pic_url
    ];

    // Return the first non-empty URL
    for (const url of possibleUrls) {
        if (url && typeof url === 'string' && url.trim() !== '') {
            // Check if URL has a protocol
            if (!url.startsWith('http')) {
                return `https://${url}`;
            }
            return url;
        }
    }

    return ''; // Return empty string if no URL is found
};

export async function scrapeInstagramProfile(username: string) {
    try {
        const apifyToken = await getApifyKey();

        // Start scraping
        const runResponse = await axios.post(
            `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apifyToken}`,
            {
                directUrls: [`https://www.instagram.com/${username}`],
                resultsType: 'details',
                resultsLimit: 100
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apifyToken}`
                }
            }
        );

        if (!runResponse.data || !runResponse.data.data || !runResponse.data.data.id) {
            throw new Error('Failed to start Instagram scraper');
        }

        const runId = runResponse.data.data.id;

        // For now just return the runId - this would be used to check status
        // In a real implementation, we would poll for completion and then fetch results
        return {
            status: 'started',
            runId,
            message: 'Instagram scraping job started. This may take several minutes to complete.'
        };

    } catch (error: any) {
        console.error('Error scraping Instagram profile:', error);
        throw new Error(error.message || 'Error scraping Instagram profile');
    }
}

export async function checkScrapingStatus(runId: string) {
    try {
        const apifyToken = await getApifyKey();

        console.log(`Checking status for run ID: ${runId}`);

        const statusResponse = await axios.get(
            `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
            {
                headers: {
                    'Authorization': `Bearer ${apifyToken}`
                }
            }
        );

        if (!statusResponse.data) {
            throw new Error('Failed to get scraping status');
        }

        console.log('Status response:', JSON.stringify(statusResponse.data, null, 2));

        // Get the defaultDatasetId from the response - this is key for fetching results
        const defaultDatasetId = statusResponse.data.data?.defaultDatasetId ||
            statusResponse.data.defaultDatasetId;

        // If we have a dataset ID but job is still running, it might already have partial results
        const status = statusResponse.data.data?.status || statusResponse.data.status;

        return {
            status: status,
            finishedAt: statusResponse.data.data?.finishedAt || statusResponse.data.finishedAt,
            statsUrl: statusResponse.data.data?.containerUrl || statusResponse.data.statsUrl,
            detailsUrl: defaultDatasetId ? `datasets/${defaultDatasetId}` : (statusResponse.data.detailsUrl || ''),
            defaultDatasetId
        };

    } catch (error: any) {
        console.error('Error checking scraping status:', error);
        throw new Error(error.message || 'Error checking scraping status');
    }
}

// Agora vamos atualizar o retorno da função createSafePostObject
async function createSafePostObject(post: any, profileId: string): Promise<InstagramPost> {
    // Base post object with required fields
    const basePost: InstagramPost = {
        profile_id: profileId,
        instagram_id: post.id,
        short_code: post.shortCode,
        type: post.type || 'Image',
        url: post.url || '',
        caption: post.caption || '',
        timestamp: post.timestamp || new Date().toISOString(),
        likes_count: post.likesCount || 0,
        comments_count: post.commentsCount || 0,
        video_view_count: post.videoViewCount,
        display_url: post.displayUrl || '',
        is_video: post.type === 'Video',
        hashtags: post.hashtags ? JSON.stringify(post.hashtags) : null,
        mentions: post.mentions ? JSON.stringify(post.mentions) : null,
        product_type: post.productType || null,
        is_comments_disabled: post.isCommentsDisabled !== undefined ? post.isCommentsDisabled : null
    };

    return basePost;
}

export async function fetchScrapingResults(datasetId: string) {
    try {
        const apifyToken = await getApifyKey();

        console.log(`Fetching results for dataset ID: ${datasetId}`);

        // Direct API call to the dataset endpoint
        const resultsResponse = await axios.get(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`,
            {
                headers: {
                    'Authorization': `Bearer ${apifyToken}`
                }
            }
        );

        if (!resultsResponse.data) {
            throw new Error('Failed to get scraping results');
        }

        console.log(`Received ${resultsResponse.data.length} profile(s) from Apify`);

        if (resultsResponse.data.length === 0) {
            throw new Error('No Instagram profile data received from Apify');
        }

        // Process and store the results
        const profileData = resultsResponse.data[0]; // Assuming first item is the profile

        // Get the best profile image URL
        const profilePicUrl = getBestProfileImageUrl(profileData);
        console.log(`Using profile image URL: ${profilePicUrl}`);

        // Verificar autenticação do usuário antes de continuar
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
            throw new Error('User not authenticated');
        }

        // Verificar ou criar o bucket antes de iniciar os downloads
        try {
            const bucketExists = await ensureImageBucketExists();
            if (!bucketExists) {
                console.warn('O bucket de armazenamento não está disponível. As imagens não serão armazenadas no Supabase.');
                // Continuar mesmo sem o bucket, mas as imagens não serão salvas
            } else {
                console.log('Bucket verificado e pronto para armazenamento');
            }
        } catch (bucketError: any) {
            console.warn('Erro ao verificar bucket do Supabase:', bucketError);
            console.warn('As imagens não serão armazenadas no Supabase.');
            // Continuar mesmo com erro, mas as imagens não serão salvas
        }

        // Baixar as imagens de forma assíncrona antes de salvar no banco
        console.log('Iniciando download e armazenamento das imagens...');

        // Processar imagem de perfil
        const profileImagePromise = profilePicUrl ?
            downloadAndStoreImage(profilePicUrl, `profiles/${profileData.username}`)
            : Promise.resolve(null);

        // Iniciar processamento das imagens dos posts em paralelo
        const postImagePromises: Promise<void>[] = [];
        if (profileData.latestPosts && profileData.latestPosts.length > 0) {
            console.log(`Iniciando processamento de ${profileData.latestPosts.length} imagens de posts`);

            // Limitar o número de downloads paralelos para evitar sobrecarga
            const CONCURRENT_DOWNLOADS = 3;
            const postGroups = [];

            // Dividir posts em grupos para processamento em lotes
            for (let i = 0; i < profileData.latestPosts.length; i += CONCURRENT_DOWNLOADS) {
                postGroups.push(profileData.latestPosts.slice(i, i + CONCURRENT_DOWNLOADS));
            }

            // Processar cada grupo sequencialmente, mas imagens dentro do grupo em paralelo
            for (let groupIndex = 0; groupIndex < postGroups.length; groupIndex++) {
                const group = postGroups[groupIndex];
                console.log(`Processando grupo ${groupIndex + 1}/${postGroups.length} (${group.length} posts)`);

                const groupPromise = async () => {
                    const promises = group.map(async (post: any, postIndex: number) => {
                        const globalIndex = groupIndex * CONCURRENT_DOWNLOADS + postIndex;
                        if (!post.displayUrl) return;

                        try {
                            console.log(`Iniciando download da imagem do post ${globalIndex + 1}/${profileData.latestPosts.length}`);

                            // Tentar baixar e armazenar a imagem no Supabase
                            const storedImageUrl = await downloadAndStoreImage(
                                post.displayUrl,
                                `posts/${profileData.username}`
                            );

                            // Se tivermos uma URL do Supabase, use-a; caso contrário, mantenha a URL original
                            if (storedImageUrl) {
                                // Substituir a URL no objeto post
                                profileData.latestPosts[globalIndex].displayUrl = storedImageUrl;
                                profileData.latestPosts[globalIndex].supabase_url = true; // Flag para indicar que é do Supabase
                                console.log(`Imagem do post ${globalIndex + 1} armazenada no Supabase: ${storedImageUrl}`);
                            } else {
                                console.warn(`Não foi possível armazenar imagem do post ${globalIndex + 1} no Supabase, mantendo URL original`);
                                // Certificar-se de que a flag indique que não é do Supabase
                                profileData.latestPosts[globalIndex].supabase_url = false;
                            }
                        } catch (imgError) {
                            console.error(`Erro ao processar imagem do post ${globalIndex + 1}:`, imgError);
                            // Não interromper o processamento devido a falhas em imagens individuais
                            profileData.latestPosts[globalIndex].supabase_url = false;
                        }
                    });

                    await Promise.all(promises);
                    // Pequena pausa entre grupos para evitar sobrecarga
                    if (groupIndex < postGroups.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentado para 1 segundo
                    }
                };

                postImagePromises.push(groupPromise());
            }
        }

        // Aguardar a conclusão do download da imagem de perfil
        let localProfilePicUrl = profilePicUrl;
        let profileImageFromSupabase = false;

        try {
            console.log('Aguardando processamento da imagem de perfil...');
            const storedProfileImageUrl = await profileImagePromise;

            if (storedProfileImageUrl) {
                localProfilePicUrl = storedProfileImageUrl;
                profileImageFromSupabase = true;
                console.log(`Imagem de perfil armazenada no Supabase: ${localProfilePicUrl}`);
            } else {
                console.warn('Não foi possível armazenar a imagem de perfil no Supabase, mantendo URL original');
            }
        } catch (profileImgError) {
            console.error('Erro ao processar imagem de perfil:', profileImgError);
            // Continuar com a URL original em caso de erro
        }

        console.log('Verificando se o perfil já existe...');
        // Check if profile already exists
        const { data: existingProfile } = await supabase
            .from('instagram_profiles')
            .select('id')
            .eq('instagram_id', profileData.id)
            .eq('user_id', userData.user.id)
            .maybeSingle();

        let profileRecord;

        if (existingProfile) {
            console.log('Atualizando perfil existente...');
            // Update existing profile
            const { data: updatedProfile, error: updateError } = await supabase
                .from('instagram_profiles')
                .update({
                    username: profileData.username,
                    full_name: profileData.fullName,
                    biography: profileData.biography,
                    followers_count: profileData.followersCount,
                    follows_count: profileData.followsCount,
                    posts_count: profileData.postsCount,
                    profile_pic_url: localProfilePicUrl, // Use local image URL
                    profile_pic_from_supabase: profileImageFromSupabase, // Nova flag para indicar fonte da imagem
                    is_business_account: profileData.isBusinessAccount,
                    business_category_name: profileData.businessCategoryName,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingProfile.id)
                .select()
                .single();

            if (updateError) {
                console.error('Erro ao atualizar perfil:', updateError);
                throw updateError;
            }
            profileRecord = updatedProfile;
            console.log('Perfil existente atualizado com sucesso');
        } else {
            console.log('Inserindo novo perfil...');
            // Insert new profile
            const { data: newProfile, error: profileError } = await supabase
                .from('instagram_profiles')
                .insert([
                    {
                        user_id: userData.user.id,
                        instagram_id: profileData.id,
                        username: profileData.username,
                        full_name: profileData.fullName,
                        biography: profileData.biography,
                        followers_count: profileData.followersCount,
                        follows_count: profileData.followsCount,
                        posts_count: profileData.postsCount,
                        profile_pic_url: localProfilePicUrl, // Use local image URL
                        profile_pic_from_supabase: profileImageFromSupabase, // Nova flag para indicar fonte da imagem
                        is_business_account: profileData.isBusinessAccount,
                        business_category_name: profileData.businessCategoryName
                    }
                ])
                .select()
                .single();

            if (profileError) {
                console.error('Erro ao inserir novo perfil:', profileError);
                throw profileError;
            }
            profileRecord = newProfile;
            console.log('Novo perfil inserido com sucesso');
        }

        // Aguardar a conclusão de todos os downloads de imagens dos posts
        if (postImagePromises.length > 0) {
            try {
                console.log('Aguardando conclusão de todos os downloads de imagens...');
                await Promise.all(postImagePromises);
                console.log('Todos os downloads de imagens concluídos');
            } catch (downloadError) {
                console.error('Erro durante o download de imagens:', downloadError);
                // Continuar com o processamento dos posts mesmo com erros
            }
        }

        // Process and store posts if available
        if (profileData.latestPosts && profileData.latestPosts.length > 0) {
            console.log(`Salvando ${profileData.latestPosts.length} posts no banco de dados`);

            // First delete existing posts for this profile to avoid duplicates
            const { error: deleteError } = await supabase
                .from('instagram_posts')
                .delete()
                .eq('profile_id', profileRecord.id);

            if (deleteError) {
                console.error('Error deleting existing posts:', deleteError);
            }

            try {
                // Prepare post data with proper error handling
                const postsToInsert = [];
                for (const post of profileData.latestPosts) {
                    try {
                        const safePost = await createSafePostObject(post, profileRecord.id);

                        // Adicionar flag indicando se a imagem está no Supabase
                        safePost.image_from_supabase = post.supabase_url === true;

                        postsToInsert.push(safePost);
                    } catch (postError) {
                        console.error('Erro ao processar post:', postError);
                        // Continuar com outros posts
                    }
                }

                // Insert posts in a single batch for better performance
                if (postsToInsert.length > 0) {
                    console.log(`Inserindo ${postsToInsert.length} posts no banco de dados`);
                    const { error: insertError } = await supabase
                        .from('instagram_posts')
                        .insert(postsToInsert);

                    if (insertError) {
                        // Handle specific PostgreSQL error cases
                        if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
                            console.error('Erro de coluna detectado, possível necessidade de migração:', insertError.message);

                            // Remover a coluna image_from_supabase que pode estar causando o erro
                            const basicPosts = postsToInsert.map((post: any) => {
                                const { image_from_supabase, ...basicPost } = post as InstagramPost & { image_from_supabase: boolean };
                                return basicPost;
                            });

                            console.log('Tentando novamente sem a coluna image_from_supabase...');
                            const { error: basicInsertError } = await supabase
                                .from('instagram_posts')
                                .insert(basicPosts);

                            if (basicInsertError) {
                                console.error('Erro ao inserir dados básicos:', basicInsertError);
                                // Não interromper o fluxo caso a inserção falhe
                            } else {
                                console.log(`Dados básicos de ${basicPosts.length} posts salvos com sucesso`);
                            }
                        } else {
                            console.error('Erro ao inserir posts:', insertError);
                            // Não interromper o fluxo caso a inserção falhe
                        }
                    } else {
                        console.log(`${postsToInsert.length} posts salvos com sucesso no banco de dados`);
                    }
                }
            } catch (error) {
                console.error('Erro ao salvar posts:', error);
                // Continue with the profile data even if post saving fails
            }
        }

        // Contabilizar quantas imagens foram salvas no Supabase
        const totalSupabaseImages = (profileImageFromSupabase ? 1 : 0) +
            (profileData.latestPosts || []).filter((post: any) => post.supabase_url === true).length;

        const totalImages = 1 + (profileData.latestPosts?.length || 0);

        return {
            profile: profileRecord,
            postCount: profileData.latestPosts?.length || 0,
            supabaseImageCount: totalSupabaseImages,
            totalImageCount: totalImages,
            success: true,
            message: `Perfil do Instagram processado com sucesso: ${profileData.username}. ${totalSupabaseImages}/${totalImages} imagens salvas no Supabase.`
        };

    } catch (error: any) {
        console.error('Error fetching scraping results:', error);
        return {
            success: false,
            error: error.message || 'Error fetching scraping results',
            message: `Erro ao processar perfil do Instagram: ${error.message}`
        };
    }
}
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
            .maybeSingle();

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
            // Em produção, usar proxy dinâmico com URL completa
            if (process.env.NODE_ENV === 'production') {
                return `/api/instagram-proxy?url=${encodeURIComponent(imageUrl)}`;
            }

            // Em desenvolvimento, extrair apenas o caminho
            const urlParts = new URL(imageUrl);
            const path = urlParts.pathname + urlParts.search;
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
// Ajustada para aceitar um objeto que pode ser o 'owner' de um post
const getBestProfileImageUrl = (ownerData: any): string => {
    if (!ownerData) return '';
    const possibleUrls = [
        ownerData.profilePicUrlHD,
        ownerData.profilePicUrl,
        ownerData.profile_pic_url_hd, // Mantendo formatos snake_case se vierem assim
        ownerData.profile_pic_url
    ];
    for (const url of possibleUrls) {
        if (url && typeof url === 'string' && url.trim() !== '') {
            if (!url.startsWith('http')) {
                return `https://${url}`;
            }
            return url;
        }
    }
    return '';
};

// Interface para parâmetros de scraping
export interface ScrapingParams {
    resultsLimit?: number;
    onlyPostsNewerThan?: string;
}

// Função para fazer scraping apenas dos dados do perfil (1 post)
export async function scrapeInstagramProfileData(username: string, params: ScrapingParams = {}) {
    try {
        const apifyToken = await getApifyKey();

        console.log(`=== INICIANDO JOB 1: DADOS DO PERFIL para @${username} ===`);

        // Para dados do perfil, sempre usar resultsLimit: 1
        const profileParams = {
            onlyPostsNewerThan: params.onlyPostsNewerThan || "365 days"
        };

        const runResponse = await axios.post(
            `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apifyToken}`,
            {
                "addParentData": false,
                "directUrls": [
                    `https://www.instagram.com/${username}/`
                ],
                "enhanceUserSearchWithFacebookPage": false,
                "isUserReelFeedURL": false,
                "isUserTaggedFeedURL": false,
                "onlyPostsNewerThan": profileParams.onlyPostsNewerThan,
                "resultsLimit": 1, // Sempre 1 para dados do perfil
                "resultsType": "details" // "details" para dados ricos do perfil
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apifyToken}`
                }
            }
        );

        if (!runResponse.data || !runResponse.data.data || !runResponse.data.data.id) {
            throw new Error('Failed to start Instagram profile data scraper');
        }

        const runId = runResponse.data.data.id;
        console.log(`✅ Job 1 (dados do perfil) iniciado com runId: ${runId}`);

        return {
            status: 'started',
            runId,
            jobType: 'profile_data',
            message: 'Instagram profile data scraping job started.'
        };

    } catch (error: any) {
        console.error('Error scraping Instagram profile data:', error);
        throw new Error(error.message || 'Error scraping Instagram profile data');
    }
}

// Função para fazer scraping dos posts
export async function scrapeInstagramPosts(username: string, params: ScrapingParams = {}) {
    try {
        const apifyToken = await getApifyKey();

        console.log(`=== INICIANDO JOB 2: POSTS para @${username} ===`);

        // Parâmetros padrão para posts
        const defaultParams = {
            resultsLimit: 10,
            onlyPostsNewerThan: "365 days"
        };

        const finalParams = { ...defaultParams, ...params };
        console.log(`Parâmetros para posts:`, finalParams);
        console.log(`⚠️ IMPORTANTE: Este job deve retornar APENAS posts de @${username}, não posts onde ele foi marcado!`);

        const runResponse = await axios.post(
            `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apifyToken}`,
            {
                "addParentData": false,
                "directUrls": [
                    `https://www.instagram.com/${username}/`
                ],
                "enhanceUserSearchWithFacebookPage": false,
                "isUserReelFeedURL": false,
                "isUserTaggedFeedURL": false,
                "onlyPostsNewerThan": finalParams.onlyPostsNewerThan,
                "resultsLimit": finalParams.resultsLimit,
                "resultsType": "posts"
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apifyToken}`
                }
            }
        );

        if (!runResponse.data || !runResponse.data.data || !runResponse.data.data.id) {
            throw new Error('Failed to start Instagram posts scraper');
        }

        const runId = runResponse.data.data.id;
        console.log(`✅ Job 2 (posts) iniciado com runId: ${runId}`);

        return {
            status: 'started',
            runId,
            jobType: 'posts',
            message: 'Instagram posts scraping job started.'
        };

    } catch (error: any) {
        console.error('Error scraping Instagram posts:', error);
        throw new Error(error.message || 'Error scraping Instagram posts');
    }
}

// Função principal que coordena os dois jobs
export async function scrapeInstagramProfile(username: string, params: ScrapingParams = {}) {
    try {
        console.log(`=== INICIANDO SCRAPING COMPLETO para @${username} ===`);
        console.log('Parâmetros recebidos:', params);

        // Job 1: Dados do perfil
        const profileJob = await scrapeInstagramProfileData(username, params);

        // Job 2: Posts (só se resultsLimit > 1)
        let postsJob = null;
        if (!params.resultsLimit || params.resultsLimit > 1) {
            postsJob = await scrapeInstagramPosts(username, params);
        }

        return {
            status: 'started',
            profileJob,
            postsJob,
            message: `Instagram scraping jobs started for @${username}. ${postsJob ? 'Two jobs' : 'One job'} running.`
        };

    } catch (error: any) {
        console.error('Error in scrapeInstagramProfile:', error);
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
async function createSafePostObject(post: any, profileIdSupabase: string, postOwnerUsername: string): Promise<InstagramPost> {
    // Validar os campos obrigatórios
    if (!post.id) {
        console.warn('Post sem ID do Instagram detectado:', post);
        throw new Error('Post sem ID do Instagram válido não pode ser processado');
    }

    // Base post object with required fields
    const basePost: InstagramPost = {
        profile_id: profileIdSupabase, // Nosso UUID do perfil no DB
        instagram_id: post.id, // ID do post no Instagram
        short_code: post.shortCode || post.code || '', // Compatibilidade com diferentes formatos
        type: post.type || 'Image',
        url: post.url || post.permalink || post.webLink || '',
        caption: post.caption || post.text || '',
        timestamp: post.timestamp || post.takenAt || post.created_at || new Date().toISOString(),
        likes_count: post.likesCount || post.likes || 0,
        comments_count: post.commentsCount || post.comments || 0,
        video_view_count: post.videoViewCount || post.videoViews || post.video_view_count,
        display_url: post.displayUrl || post.imageUrl || post.imageHighResUrl || post.display_url || '',
        is_video: post.type === 'Video' || post.isVideo || false,
        hashtags: post.hashtags && post.hashtags.length > 0 ? JSON.stringify(post.hashtags) : null,
        mentions: post.mentions && post.mentions.length > 0 ? JSON.stringify(post.mentions) : null,
        product_type: post.productType || post.product_type || null,
        is_comments_disabled: post.isCommentsDisabled !== undefined ? post.isCommentsDisabled : null,
        // image_from_supabase e supabase_url são gerenciados em outro lugar ou não são da Apify diretamente
    };

    // Processar imagem do post
    if (basePost.display_url) {
        const proxiedPostImageUrl = await downloadAndStoreImage(basePost.display_url, `posts/${postOwnerUsername}/${basePost.short_code}`);
        if (proxiedPostImageUrl) {
            basePost.display_url = proxiedPostImageUrl; // Atualiza com a URL do Supabase/proxy
        }
    }

    return basePost;
}

// Função para salvar apenas dados do perfil (sem posts)
export async function saveProfileDataOnly(profileData: any, profileUsername: string) {
    try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
            throw new Error('User not authenticated');
        }

        console.log('=== SALVANDO APENAS DADOS DO PERFIL ===');
        console.log('Profile Data recebido:', profileData);

        // Processar imagem de perfil se existir
        let profilePicUrl = profileData.profilePicUrlHD || profileData.profilePicUrl || '';

        if (profilePicUrl) {
            try {
                const storedImageUrl = await downloadAndStoreImage(profilePicUrl, `profiles/${profileUsername}/profile_pic`);
                if (storedImageUrl) {
                    profilePicUrl = storedImageUrl;
                }
            } catch (imageError) {
                console.warn('Erro ao processar imagem de perfil:', imageError);
            }
        }

        // Gerar ID temporário se não conseguir extrair o ID real do Instagram
        const instagramId = profileData.id || `temp_${Date.now()}_${profileUsername}`;

        const dbProfileData = {
            username: profileUsername,
            full_name: profileData.fullName || profileUsername,
            biography: profileData.biography || '',
            followers_count: profileData.followersCount || 0,
            follows_count: profileData.followsCount || 0,
            posts_count: profileData.postsCount || 0,
            profile_pic_url: profilePicUrl,
            profile_pic_from_supabase: false,
            is_business_account: profileData.isBusinessAccount || false,
            business_category_name: profileData.businessCategoryName || null,
            instagram_id: instagramId,
            user_id: userData.user.id
        };

        console.log('Dados para salvar no banco:', dbProfileData);

        // Verificar se perfil já existe
        const { data: existingProfile } = await supabase
            .from('instagram_profiles')
            .select('id, username, instagram_id')
            .eq('username', profileUsername)
            .eq('user_id', userData.user.id)
            .maybeSingle();

        let savedProfile;

        if (existingProfile) {
            console.log(`Atualizando perfil existente para @${profileUsername}`);
            const { user_id, instagram_id, ...updateData } = dbProfileData;

            const { data: updatedProfile, error: updateError } = await supabase
                .from('instagram_profiles')
                .update(updateData)
                .eq('id', existingProfile.id)
                .select()
                .single();

            if (updateError) {
                console.error('Erro ao atualizar perfil:', updateError);
                throw updateError;
            }

            savedProfile = updatedProfile;
            console.log('✅ Perfil atualizado:', savedProfile);
        } else {
            console.log(`Inserindo novo perfil para @${profileUsername}`);

            const { data: newProfile, error: insertError } = await supabase
                .from('instagram_profiles')
                .insert([dbProfileData])
                .select()
                .single();

            if (insertError) {
                console.error('Erro ao inserir perfil:', insertError);
                throw insertError;
            }

            savedProfile = newProfile;
            console.log('✅ Novo perfil inserido:', savedProfile);
        }

        return {
            success: true,
            profile: savedProfile,
            message: `Profile saved successfully for @${profileUsername}`
        };

    } catch (error: any) {
        console.error(`Error saving profile data for ${profileUsername}:`, error);
        return {
            success: false,
            profile: null,
            error: error.message || 'Error saving profile data',
            message: `Error saving profile for ${profileUsername}: ${error.message}`
        };
    }
}

// Função para processar apenas posts usando perfil existente
export async function fetchPostsOnly(datasetId: string, profileUsernameFromJob: string, profileRecord: any) {
    try {
        const apifyToken = await getApifyKey();
        console.log(`=== PROCESSANDO APENAS POSTS ===`);
        console.log(`Dataset ID: ${datasetId}, Username: ${profileUsernameFromJob}`);
        console.log('Perfil para associar os posts:', profileRecord);

        const resultsResponse = await axios.get(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
        );

        if (!resultsResponse.data || !Array.isArray(resultsResponse.data)) {
            throw new Error('Failed to get posts or data is not an array');
        }

        console.log(`Received ${resultsResponse.data.length} posts from Apify for ${profileUsernameFromJob}`);

        if (resultsResponse.data.length === 0) {
            console.warn(`No posts received from Apify for ${profileUsernameFromJob}.`);
            return {
                success: true,
                postCount: 0,
                message: `No posts found for ${profileUsernameFromJob}`
            };
        }

        const allPostsFromApify = resultsResponse.data;
        const formattedPosts: InstagramPost[] = [];

        console.log('=== PREVIEW DOS POSTS RECEBIDOS ===');
        allPostsFromApify.slice(0, 3).forEach((post, index) => {
            console.log(`Post ${index + 1}:`);
            console.log(`- ID: ${post.id || 'N/A'}`);
            console.log(`- Caption: ${(post.caption || '').substring(0, 50)}...`);
            console.log(`- Owner: ${post.ownerUsername || post.owner?.username || 'N/A'}`);
        });

        // Processar todos os posts
        for (const apifyPost of allPostsFromApify) {
            try {
                if (!apifyPost || (!apifyPost.id && !apifyPost.pk)) {
                    console.warn("Post sem ID válido será ignorado:", apifyPost);
                    continue;
                }

                if (!apifyPost.id && apifyPost.pk) {
                    apifyPost.id = apifyPost.pk;
                }

                const safePost = await createSafePostObject(apifyPost, profileRecord.id, profileRecord.username);
                formattedPosts.push(safePost);
            } catch (postError) {
                console.error(`Erro ao processar post individual:`, postError);
            }
        }

        console.log(`Processados ${formattedPosts.length} posts de ${allPostsFromApify.length} recebidos da Apify.`);

        if (formattedPosts.length > 0) {
            console.log(`Salvando ${formattedPosts.length} posts para o perfil ${profileRecord.username} (ID: ${profileRecord.id})`);

            const postsToUpsert = formattedPosts.map(p => ({
                profile_id: p.profile_id,
                instagram_id: p.instagram_id,
                short_code: p.short_code,
                type: p.type,
                url: p.url,
                caption: p.caption,
                timestamp: p.timestamp,
                likes_count: p.likes_count,
                comments_count: p.comments_count,
                video_view_count: p.video_view_count,
                display_url: p.display_url,
                is_video: p.is_video,
                hashtags: p.hashtags,
                mentions: p.mentions,
                product_type: p.product_type,
                is_comments_disabled: p.is_comments_disabled
            }));

            let successCount = 0;
            let errorCount = 0;

            for (const post of postsToUpsert) {
                try {
                    const { data: existingPost } = await supabase
                        .from('instagram_posts')
                        .select('id')
                        .eq('profile_id', post.profile_id)
                        .eq('instagram_id', post.instagram_id)
                        .maybeSingle();

                    if (existingPost) {
                        const { error: updateError } = await supabase
                            .from('instagram_posts')
                            .update(post)
                            .eq('id', existingPost.id);

                        if (updateError) {
                            console.warn(`Erro ao atualizar post ${post.instagram_id}:`, updateError);
                            errorCount++;
                        } else {
                            successCount++;
                        }
                    } else {
                        const { error: insertError } = await supabase
                            .from('instagram_posts')
                            .insert([post]);

                        if (insertError) {
                            console.warn(`Erro ao inserir post ${post.instagram_id}:`, insertError);
                            errorCount++;
                        } else {
                            successCount++;
                        }
                    }
                } catch (postError) {
                    console.error(`Erro ao processar post ${post.instagram_id}:`, postError);
                    errorCount++;
                }
            }

            console.log(`✅ ${successCount} posts salvos com sucesso. ${errorCount} falharam.`);

            if (errorCount > 0 && successCount === 0) {
                throw new Error(`Falha ao salvar todos os posts para ${profileRecord.username}`);
            }
        }

        return {
            success: true,
            postCount: formattedPosts.length,
            message: `${formattedPosts.length} posts processed successfully for ${profileUsernameFromJob}`
        };

    } catch (error: any) {
        console.error(`Error processing posts for ${profileUsernameFromJob}:`, error);
        return {
            success: false,
            postCount: 0,
            error: error.message || 'Error processing posts',
            message: `Error processing posts for ${profileUsernameFromJob}: ${error.message}`
        };
    }
}

// Função para processar dados do perfil (Job 1)
export async function fetchProfileData(datasetId: string, profileUsernameFromJob: string) {
    try {
        const apifyToken = await getApifyKey();
        console.log(`=== PROCESSANDO DADOS DO PERFIL ===`);
        console.log(`Dataset ID: ${datasetId}, Username: ${profileUsernameFromJob}`);

        const resultsResponse = await axios.get(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
        );

        if (!resultsResponse.data || !Array.isArray(resultsResponse.data)) {
            throw new Error('Failed to get profile data or data is not an array');
        }

        console.log(`Received ${resultsResponse.data.length} items from profile data job`);

        if (resultsResponse.data.length === 0) {
            throw new Error('No profile data received from Apify');
        }

        const profileData = resultsResponse.data[0]; // Primeiro item contém dados do perfil
        console.log('=== DADOS COMPLETOS DO PERFIL DA APIFY ===');
        console.log(JSON.stringify(profileData, null, 2));

        // Extrair dados ricos do perfil
        const extractedProfile = {
            id: profileData.id,
            username: profileData.username,
            fullName: profileData.fullName,
            biography: profileData.biography,
            followersCount: profileData.followersCount,
            followsCount: profileData.followsCount,
            postsCount: profileData.postsCount || 0,
            profilePicUrl: profileData.profilePicUrl,
            profilePicUrlHD: profileData.profilePicUrlHD,
            isBusinessAccount: profileData.isBusinessAccount,
            businessCategoryName: profileData.businessCategoryName,
            verified: profileData.verified,
            private: profileData.private,
            externalUrl: profileData.externalUrl
        };

        console.log('=== DADOS EXTRAÍDOS DO PERFIL ===');
        console.log(extractedProfile);

        return {
            success: true,
            profileData: extractedProfile,
            message: `Profile data extracted successfully for @${profileUsernameFromJob}`
        };

    } catch (error: any) {
        console.error(`Error fetching profile data for ${profileUsernameFromJob}:`, error);
        return {
            success: false,
            profileData: null,
            error: error.message || 'Error fetching profile data',
            message: `Error processing profile data for ${profileUsernameFromJob}: ${error.message}`
        };
    }
}

export async function fetchScrapingResults(datasetId: string, profileUsernameFromJob: string) {
    try {
        const apifyToken = await getApifyKey();
        console.log(`Fetching results for dataset ID: ${datasetId}, for original user: ${profileUsernameFromJob}`);

        const resultsResponse = await axios.get(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
        );

        if (!resultsResponse.data || !Array.isArray(resultsResponse.data)) {
            throw new Error('Failed to get scraping results or data is not an array');
        }

        console.log(`Received ${resultsResponse.data.length} items (posts) from Apify for ${profileUsernameFromJob}`);

        if (resultsResponse.data.length === 0) {
            console.warn(`No posts received from Apify for ${profileUsernameFromJob}. Will attempt to create/update profile info only.`);
        }

        const allPostsFromApify = resultsResponse.data;
        let extractedProfileData: any = {};
        let instagramProfileId: string | undefined = undefined;
        let apifyUsername: string | undefined = undefined;
        let ownerProfilePicUrl: string | undefined = undefined;

        // Informações de debug detalhadas
        console.log('=== DEBUG: ESTRUTURA COMPLETA DOS DADOS DA APIFY ===');
        console.log('Total de posts recebidos:', allPostsFromApify.length);

        if (allPostsFromApify.length > 0) {
            console.log('=== ESTRUTURA DO PRIMEIRO POST COMPLETA ===');
            console.log(JSON.stringify(allPostsFromApify[0], null, 2));

            console.log('=== ANÁLISE DE CAMPOS DO PROPRIETÁRIO ===');
            const firstPost = allPostsFromApify[0];
            console.log('firstPost.ownerId:', firstPost.ownerId);
            console.log('firstPost.owner?.id:', firstPost.owner?.id);
            console.log('firstPost.authorId:', firstPost.authorId);
            console.log('firstPost.userId:', firstPost.userId);
            console.log('firstPost.ownerUsername:', firstPost.ownerUsername);
            console.log('firstPost.owner?.username:', firstPost.owner?.username);
            console.log('firstPost.author:', firstPost.author);
            console.log('firstPost.username:', firstPost.username);
            console.log('firstPost.ownerFullName:', firstPost.ownerFullName);
            console.log('firstPost.owner?.fullName:', firstPost.owner?.fullName);
            console.log('firstPost.owner?.full_name:', firstPost.owner?.full_name);
            console.log('firstPost.authorName:', firstPost.authorName);
            console.log('firstPost.name:', firstPost.name);

            console.log('=== ANÁLISE DE CAMPOS DE IMAGEM DE PERFIL ===');
            console.log('firstPost.ownerProfilePicUrl:', firstPost.ownerProfilePicUrl);
            console.log('firstPost.owner?.profilePicUrl:', firstPost.owner?.profilePicUrl);
            console.log('firstPost.owner?.profile_pic_url:', firstPost.owner?.profile_pic_url);
            console.log('firstPost.authorPicUrl:', firstPost.authorPicUrl);

            console.log('=== ANÁLISE DE COMENTÁRIOS (se existirem) ===');
            if (firstPost.latestComments && Array.isArray(firstPost.latestComments)) {
                console.log('Número de comentários:', firstPost.latestComments.length);
                firstPost.latestComments.forEach((comment: any, index: number) => {
                    console.log(`Comentário ${index}:`, {
                        owner: comment.owner,
                        username: comment.owner?.username,
                        profilePic: comment.owner?.profile_pic_url || comment.owner?.profilePicUrl
                    });
                });
            } else {
                console.log('Nenhum comentário encontrado ou latestComments não é array');
            }

            console.log('=== OUTROS CAMPOS POSSÍVEIS ===');
            console.log('Todas as chaves do primeiro post:', Object.keys(firstPost));
        }

        if (allPostsFromApify.length > 0) {
            const firstPost = allPostsFromApify[0];

            console.log('=== EXTRAÇÃO DE DADOS DO PROPRIETÁRIO ===');
            // Tentar várias possíveis localizações dos dados do proprietário nos formatos de resposta da Apify
            const ownerId = firstPost.ownerId || firstPost.owner?.id || firstPost.authorId || firstPost.userId;
            const ownerUsername = firstPost.ownerUsername || firstPost.owner?.username || firstPost.author || firstPost.username;
            const ownerFullName = firstPost.ownerFullName || firstPost.owner?.fullName || firstPost.owner?.full_name || firstPost.authorName || firstPost.name;

            console.log('Valores extraídos:');
            console.log('- ownerId:', ownerId);
            console.log('- ownerUsername:', ownerUsername);
            console.log('- ownerFullName:', ownerFullName);
            console.log('- profileUsernameFromJob (fallback):', profileUsernameFromJob);

            // VALIDAÇÃO MENOS RESTRITIVA: Verificar se os posts são do usuário solicitado
            if (ownerUsername && ownerUsername.toLowerCase() !== profileUsernameFromJob.toLowerCase()) {
                console.warn(`⚠️ AVISO: Posts retornados são de @${ownerUsername}, mas foi solicitado @${profileUsernameFromJob}`);
                console.warn('Isso pode indicar posts onde o usuário foi marcado, mas continuaremos processando.');

                // Usar dados do post, mas também manter o username do job como fallback
                extractedProfileData = {
                    id: ownerId,
                    username: ownerUsername,
                    fullName: ownerFullName || ownerUsername,
                };
                instagramProfileId = ownerId;
                apifyUsername = ownerUsername; // Usar o username dos posts mesmo que seja diferente
                console.log(`✅ Extracted profile data from post owner fields (different user):`, extractedProfileData);
            } else if (ownerId && ownerUsername) {
                extractedProfileData = {
                    id: ownerId,
                    username: ownerUsername,
                    fullName: ownerFullName || ownerUsername,
                };
                instagramProfileId = ownerId;
                apifyUsername = ownerUsername;
                console.log(`✅ Extracted profile data from first post's owner fields:`, extractedProfileData);
            } else {
                console.warn(`❌ Não foi possível extrair dados completos do proprietário do primeiro post.`);
                console.warn(`- ownerId presente: ${!!ownerId}`);
                console.warn(`- ownerUsername presente: ${!!ownerUsername}`);
                console.warn(`Usando nome de usuário do job: ${profileUsernameFromJob}`);
                apifyUsername = profileUsernameFromJob;
                instagramProfileId = undefined; // Definir explicitamente como undefined
                extractedProfileData = {
                    id: undefined,
                    username: profileUsernameFromJob,
                    fullName: profileUsernameFromJob,
                };
            }

            console.log('=== EXTRAÇÃO DE IMAGEM DE PERFIL ===');
            // Tenta encontrar imagem de perfil nos comentários se disponível
            if (apifyUsername && firstPost.latestComments && Array.isArray(firstPost.latestComments)) {
                console.log(`Procurando imagem de perfil nos comentários para usuário: ${apifyUsername}`);
                for (const comment of firstPost.latestComments) {
                    if (comment.owner && comment.owner.username === apifyUsername) {
                        console.log(`Encontrado comentário do proprietário:`, comment.owner);
                        if (comment.owner.profile_pic_url) {
                            ownerProfilePicUrl = comment.owner.profile_pic_url;
                            console.log(`✅ Imagem de perfil encontrada nos comentários (profile_pic_url): ${ownerProfilePicUrl}`);
                            break;
                        } else if (comment.owner.profilePicUrl) {
                            ownerProfilePicUrl = comment.owner.profilePicUrl;
                            console.log(`✅ Imagem de perfil encontrada nos comentários (profilePicUrl): ${ownerProfilePicUrl}`);
                            break;
                        }
                    }
                }
            } else {
                console.log('Não há comentários disponíveis ou apifyUsername não definido');
            }

            // Se não achou nos comentários, tenta outras localizações possíveis
            if (!ownerProfilePicUrl) {
                console.log('Procurando imagem de perfil em outros campos do post...');
                ownerProfilePicUrl = firstPost.ownerProfilePicUrl ||
                    firstPost.owner?.profilePicUrl ||
                    firstPost.owner?.profile_pic_url ||
                    firstPost.authorPicUrl;

                console.log('Tentativas de campos diretos:');
                console.log('- firstPost.ownerProfilePicUrl:', firstPost.ownerProfilePicUrl);
                console.log('- firstPost.owner?.profilePicUrl:', firstPost.owner?.profilePicUrl);
                console.log('- firstPost.owner?.profile_pic_url:', firstPost.owner?.profile_pic_url);
                console.log('- firstPost.authorPicUrl:', firstPost.authorPicUrl);
                console.log('- Resultado final ownerProfilePicUrl:', ownerProfilePicUrl);
            }

            if (ownerProfilePicUrl) {
                console.log(`✅ Found owner's profile pic URL: ${ownerProfilePicUrl}`);
            } else {
                console.warn(`❌ Could not find owner's profile pic URL for ${apifyUsername}.`);
            }
        } else {
            console.warn(`No posts in Apify data for ${profileUsernameFromJob}, cannot extract owner details from posts.`);
            // Inicializar variáveis quando não há posts
            apifyUsername = profileUsernameFromJob;
            instagramProfileId = undefined;
            extractedProfileData = {
                id: undefined,
                username: profileUsernameFromJob,
                fullName: profileUsernameFromJob,
            };
            ownerProfilePicUrl = undefined;
        }

        const finalUsername = apifyUsername || profileUsernameFromJob;
        if (!finalUsername) {
            throw new Error('Unable to determine a valid username for the profile.');
        }

        console.log('=== PREPARAÇÃO DOS DADOS DO PERFIL ===');
        const profileToSave = {
            id: instagramProfileId,
            username: finalUsername,
            fullName: extractedProfileData.fullName || null,
            biography: null,
            followersCount: 0,
            followsCount: 0,
            postsCount: allPostsFromApify.length,
            profilePicUrl: ownerProfilePicUrl || getBestProfileImageUrl(extractedProfileData),
            isBusinessAccount: false,
            businessCategoryName: null,
        };
        console.log(`Profile data to use/save for ${finalUsername}:`, profileToSave);

        console.log('=== ANÁLISE DOS DADOS PREPARADOS ===');
        console.log('- instagramProfileId:', instagramProfileId);
        console.log('- finalUsername:', finalUsername);
        console.log('- extractedProfileData.fullName:', extractedProfileData.fullName);
        console.log('- ownerProfilePicUrl:', ownerProfilePicUrl);
        console.log('- getBestProfileImageUrl(extractedProfileData):', getBestProfileImageUrl(extractedProfileData));
        console.log('- profileToSave.profilePicUrl (final):', profileToSave.profilePicUrl);

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
            throw new Error('User not authenticated');
        }

        // Validação dos dados mínimos do perfil
        if (!profileToSave.username) {
            throw new Error(`Não foi possível determinar o nome de usuário válido para o perfil. Nome extraído: ${finalUsername}`);
        }

        try {
            const bucketExists = await ensureImageBucketExists();
            if (!bucketExists) {
                console.warn('O bucket de armazenamento não está disponível. As imagens não serão armazenadas no Supabase.');
            } else {
                console.log('Bucket verificado e pronto para armazenamento');
            }
        } catch (bucketError: any) {
            console.warn('Erro ao verificar bucket do Supabase:', bucketError);
            console.warn('As imagens não serão armazenadas no Supabase.');
        }

        let localProfilePicUrl = profileToSave.profilePicUrl;
        let profileImageFromSupabase = false;
        if (profileToSave.profilePicUrl) {
            try {
                const storedProfileImageUrl = await downloadAndStoreImage(profileToSave.profilePicUrl, `profiles/${profileToSave.username}/profile_pic`);
                if (storedProfileImageUrl) {
                    localProfilePicUrl = storedProfileImageUrl;
                    profileImageFromSupabase = storedProfileImageUrl.startsWith('/instagram-img-proxy'); // ou .includes('supabase') se for direto
                }
            } catch (profileImgError) {
                console.error('Error processing profile image:', profileImgError);
            }
        }

        // Lógica para salvar/atualizar o perfil na tabela instagram_profiles
        let savedProfileRecord: any = null; // Usaremos 'any' por simplicidade, mas idealmente um tipo do Supabase

        console.log('=== PREPARAÇÃO DOS DADOS PARA O BANCO DE DADOS ===');
        // Criar um objeto de perfil para inserção/atualização com todos os campos necessários
        // Gerar um ID temporário se não conseguirmos extrair o ID real do Instagram
        const instagramId = profileToSave.id || `temp_${Date.now()}_${profileToSave.username}`;

        const dbProfileData = {
            username: profileToSave.username,
            full_name: profileToSave.fullName || profileToSave.username, // Garantir que tenha algum valor
            biography: profileToSave.biography || '',
            followers_count: profileToSave.followersCount || 0,
            follows_count: profileToSave.followsCount || 0,
            posts_count: profileToSave.postsCount || allPostsFromApify.length,
            profile_pic_url: localProfilePicUrl || '',
            profile_pic_from_supabase: profileImageFromSupabase,
            is_business_account: profileToSave.isBusinessAccount || false,
            business_category_name: profileToSave.businessCategoryName || null,
            instagram_id: instagramId, // Usar ID real ou temporário
            user_id: userData.user.id
        };

        console.log(`Instagram ID usado: ${instagramId} (real: ${!!profileToSave.id})`);

        console.log(`Dados do perfil preparados para salvar:`, dbProfileData);

        console.log('=== MAPEAMENTO DE DADOS ===');
        console.log('profileToSave.username → dbProfileData.username:', profileToSave.username, '→', dbProfileData.username);
        console.log('profileToSave.fullName → dbProfileData.full_name:', profileToSave.fullName, '→', dbProfileData.full_name);
        console.log('localProfilePicUrl → dbProfileData.profile_pic_url:', localProfilePicUrl, '→', dbProfileData.profile_pic_url);
        console.log('profileImageFromSupabase → dbProfileData.profile_pic_from_supabase:', profileImageFromSupabase, '→', dbProfileData.profile_pic_from_supabase);

        // Verificar se o perfil já existe por username
        console.log(`Verificando se o perfil @${profileToSave.username} já existe...`);
        const { data: existingProfile } = await supabase
            .from('instagram_profiles')
            .select('id, username, instagram_id') // Selecionar campos relevantes
            .eq('username', profileToSave.username)
            .eq('user_id', userData.user.id)
            .maybeSingle();

        if (existingProfile) {
            console.log(`=== ATUALIZANDO PERFIL EXISTENTE ===`);
            console.log(`Updating existing profile for ${profileToSave.username} (Supabase ID: ${existingProfile.id})`);
            // Remover user_id e instagram_id do update payload se não devem ser alterados ou causam erro
            const { user_id, instagram_id, ...updateData } = dbProfileData;
            console.log('Dados para atualização (sem user_id e instagram_id):', updateData);

            const { data: updatedProfile, error: updateError } = await supabase
                .from('instagram_profiles')
                .update(updateData)
                .eq('id', existingProfile.id)
                .select()
                .single();
            if (updateError) {
                console.error('Error updating profile:', JSON.stringify(updateError, null, 2));
                throw new Error(`Falha ao atualizar o perfil ${profileToSave.username}: ${updateError.message}`);
            }
            savedProfileRecord = updatedProfile;
            console.log('✅ Perfil atualizado com sucesso:', savedProfileRecord);
        } else {
            console.log(`=== INSERINDO NOVO PERFIL ===`);
            console.log(`Inserting new profile for ${profileToSave.username}`);
            console.log('Dados para inserção:', dbProfileData);

            // user_id e instagram_id já estão em dbProfileData para inserção
            const { data: newProfile, error: insertError } = await supabase
                .from('instagram_profiles')
                .insert([dbProfileData])
                .select()
                .single();
            if (insertError) {
                console.error('Erro ao inserir novo perfil:', JSON.stringify(insertError, null, 2));
                throw new Error(`Falha ao inserir o perfil ${profileToSave.username}: ${insertError.message}`);
            }
            savedProfileRecord = newProfile;
            console.log('✅ Novo perfil inserido com sucesso:', savedProfileRecord);
        }

        const formattedPosts: InstagramPost[] = []; // Declarar aqui para escopo correto

        if (allPostsFromApify && allPostsFromApify.length > 0 && savedProfileRecord) {
            console.log(`Formatting and saving ${allPostsFromApify.length} posts to database for profile ID ${savedProfileRecord.id} (username: ${savedProfileRecord.username})`);

            // Processar todos os posts sem filtrar por username
            console.log(`Processando todos os ${allPostsFromApify.length} posts retornados pela Apify`);

            // Log detalhado dos primeiros posts para debug
            if (allPostsFromApify.length > 0) {
                console.log('=== PREVIEW DOS POSTS RECEBIDOS ===');
                allPostsFromApify.slice(0, 3).forEach((post, index) => {
                    console.log(`Post ${index + 1}:`);
                    console.log(`- ID: ${post.id || 'N/A'}`);
                    console.log(`- Caption: ${(post.caption || '').substring(0, 50)}...`);
                    console.log(`- Owner: ${post.ownerUsername || post.owner?.username || 'N/A'}`);
                });
                if (allPostsFromApify.length > 3) {
                    console.log(`... e mais ${allPostsFromApify.length - 3} posts`);
                }
            }

            // Valida e processa cada post
            for (const apifyPost of allPostsFromApify) {
                try {
                    // Verificar se o post tem campos mínimos necessários antes de tentar processar
                    if (!apifyPost || (!apifyPost.id && !apifyPost.pk)) {
                        console.warn("Post sem ID válido será ignorado:", apifyPost);
                        continue;
                    }

                    // Se o post usar 'pk' em vez de 'id', normalizar
                    if (!apifyPost.id && apifyPost.pk) {
                        apifyPost.id = apifyPost.pk;
                    }

                    // Processar o post para o formato correto
                    const safePost = await createSafePostObject(apifyPost, savedProfileRecord.id, savedProfileRecord.username);
                    formattedPosts.push(safePost);
                } catch (postError) {
                    console.error(`Erro ao processar post individual:`, postError);
                    // Continua com o próximo post em vez de falhar todo o processo
                }
            }

            console.log(`Processados ${formattedPosts.length} posts de ${allPostsFromApify.length} recebidos da Apify.`);

            if (formattedPosts.length > 0) {
                console.log(`Attempting to upsert ${formattedPosts.length} posts.`);
                // Garantir que os objetos em formattedPosts não contenham campos extras não definidos na tabela instagram_posts
                // ou que a definição de InstagramPost (local) corresponda exatamente à tabela do DB
                const postsToUpsert = formattedPosts.map(p => ({
                    profile_id: p.profile_id,
                    instagram_id: p.instagram_id,
                    short_code: p.short_code,
                    type: p.type,
                    url: p.url,
                    caption: p.caption,
                    timestamp: p.timestamp,
                    likes_count: p.likes_count,
                    comments_count: p.comments_count,
                    video_view_count: p.video_view_count,
                    display_url: p.display_url, // Esta é a URL já processada pelo downloadAndStoreImage
                    is_video: p.is_video,
                    hashtags: p.hashtags,
                    mentions: p.mentions,
                    product_type: p.product_type,
                    is_comments_disabled: p.is_comments_disabled
                    // Adicionar aqui quaisquer outros campos que estejam na tabela instagram_posts e na interface InstagramPost
                }));

                // Implementação alternativa: primeiro verificar existência e depois inserir ou atualizar
                console.log(`Implementando estratégia alternativa para salvar ${formattedPosts.length} posts...`);

                // Agrupando posts por lotes de 50 para processamento em chunks
                const processPostsInBatches = async (posts: any[], batchSize = 50) => {
                    let successCount = 0;
                    let errorCount = 0;
                    const validPosts = posts.filter(post => post && post.instagram_id);

                    if (validPosts.length < posts.length) {
                        console.warn(`Filtrados ${posts.length - validPosts.length} posts inválidos sem instagram_id`);
                    }

                    for (let i = 0; i < validPosts.length; i += batchSize) {
                        const batch = validPosts.slice(i, i + batchSize);
                        console.log(`Processando lote ${Math.floor(i / batchSize) + 1} com ${batch.length} posts...`);

                        for (const post of batch) {
                            try {
                                // Verificar se o post já existe
                                const { data: existingPost } = await supabase
                                    .from('instagram_posts')
                                    .select('id')
                                    .eq('profile_id', post.profile_id)
                                    .eq('instagram_id', post.instagram_id)
                                    .maybeSingle();

                                if (existingPost) {
                                    // Atualizar post existente
                                    const { error: updateError } = await supabase
                                        .from('instagram_posts')
                                        .update(post)
                                        .eq('id', existingPost.id);

                                    if (updateError) {
                                        console.warn(`Erro ao atualizar post ${post.instagram_id}:`, updateError);
                                        errorCount++;
                                    } else {
                                        successCount++;
                                    }
                                } else {
                                    // Inserir novo post
                                    const { error: insertError } = await supabase
                                        .from('instagram_posts')
                                        .insert([post]);

                                    if (insertError) {
                                        console.warn(`Erro ao inserir post ${post.instagram_id}:`, insertError);
                                        errorCount++;
                                    } else {
                                        successCount++;
                                    }
                                }
                            } catch (postError) {
                                console.error(`Erro ao processar post ${post.instagram_id}:`, postError);
                                errorCount++;
                            }
                        }
                    }

                    return { successCount, errorCount };
                };

                const { successCount, errorCount } = await processPostsInBatches(postsToUpsert);

                if (errorCount > 0) {
                    console.warn(`${errorCount} posts falharam ao ser salvos. ${successCount} foram salvos com sucesso.`);
                    if (successCount === 0) {
                        throw new Error(`Falha ao salvar todos os posts para ${savedProfileRecord.username}: Todos os ${errorCount} posts falharam.`);
                    }
                } else {
                    console.log(`${successCount} posts salvos com sucesso para perfil ID ${savedProfileRecord.id}.`);
                }
            }
        } else if (!savedProfileRecord) {
            console.warn("Saved profile record not available, cannot save posts.");
        }

        const totalSupabaseImages = (profileImageFromSupabase ? 1 : 0) +
            formattedPosts.filter((post) => post.display_url && post.display_url.startsWith('/instagram-img-proxy')).length;
        const totalImages = 1 + (allPostsFromApify?.length || 0);

        return {
            profile: savedProfileRecord,
            postCount: allPostsFromApify?.length || 0,
            supabaseImageCount: totalSupabaseImages,
            totalImageCount: totalImages,
            success: true,
            message: `Profile for ${profileToSave.username} processed. ${totalSupabaseImages}/${totalImages} images potentially proxied/stored.`
        };

    } catch (error: any) {
        console.error(`Error fetching/processing scraping results for ${profileUsernameFromJob}:`, error);
        return {
            success: false,
            profile: null, // Adicionado para consistência no tipo de retorno
            error: error.message || 'Error fetching scraping results',
            message: `Error processing profile for ${profileUsernameFromJob}: ${error.message}`
        };
    }
}
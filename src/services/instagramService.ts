import axios from 'axios';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';

// Constante com o nome do bucket para uso em toda a aplicação
const INSTAGRAM_IMAGES_BUCKET = 'instagram-images';

// Interface do objeto de post
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
    image_from_supabase?: boolean;
}

// Função para verificar se o bucket existe
async function ensureImageBucketExists(): Promise<boolean> {
    try {
        console.log('Verificando se o bucket existe...');

        const { data, error } = await supabaseAdmin.storage
            .from(INSTAGRAM_IMAGES_BUCKET)
            .list('', { limit: 1 });

        if (!error) {
            console.log(`Acesso ao bucket ${INSTAGRAM_IMAGES_BUCKET} bem-sucedido.`);
            return true;
        }

        if (error.message && (
            error.message.includes('does not exist') ||
            error.message.includes('não existe')
        )) {
            console.log(`Bucket ${INSTAGRAM_IMAGES_BUCKET} não encontrado. Tentando criar...`);

            try {
                const { error: createError } = await supabaseAdmin.storage.createBucket(
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

// Função para gerar um nome de arquivo único
function generateUniqueFileName(originalUrl: string, prefix: string = ''): string {
    try {
        const url = new URL(originalUrl);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1] || 'image';
        
        // Remover parâmetros de query do nome do arquivo
        const cleanFileName = fileName.split('?')[0];
        
        // Garantir que tem uma extensão
        const hasExtension = cleanFileName.includes('.');
        const finalFileName = hasExtension ? cleanFileName : `${cleanFileName}.jpg`;
        
        // Adicionar timestamp para garantir unicidade
        const timestamp = Date.now();
        const nameParts = finalFileName.split('.');
        const extension = nameParts.pop();
        const name = nameParts.join('.');
        
        return prefix ? `${prefix}/${name}_${timestamp}.${extension}` : `${name}_${timestamp}.${extension}`;
    } catch (error) {
        // Fallback se a URL for inválida
        const timestamp = Date.now();
        return prefix ? `${prefix}/image_${timestamp}.jpg` : `image_${timestamp}.jpg`;
    }
}

// Função principal para baixar e armazenar imagens
export async function downloadAndStoreImage(imageUrl: string, storagePath: string): Promise<string | null> {
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        console.warn('URL inválida:', imageUrl);
        return imageUrl;
    }

    try {
        // Verificar se o bucket existe antes de tentar fazer upload
        const bucketExists = await ensureImageBucketExists();
        if (!bucketExists) {
            console.warn('Bucket não disponível. Usando URL de proxy como fallback.');
            return convertToProxyUrl(imageUrl);
        }

        console.log(`Iniciando download da imagem: ${imageUrl}`);

        // Gerar nome único para o arquivo
        const uniqueFileName = generateUniqueFileName(imageUrl, storagePath);
        console.log(`Nome do arquivo gerado: ${uniqueFileName}`);

        // Tentar baixar a imagem diretamente primeiro
        let imageData: ArrayBuffer;
        let contentType = 'image/jpeg';

        try {
            const response = await fetch(imageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Referer': 'https://www.instagram.com/',
                },
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            imageData = await response.arrayBuffer();
            contentType = response.headers.get('content-type') || 'image/jpeg';
            console.log(`Download direto bem-sucedido. Tamanho: ${imageData.byteLength} bytes`);

        } catch (directError) {
            console.log('Download direto falhou, tentando via Edge Function...');
            
            // Tentar usar a Edge Function como fallback
            try {
                const edgeFunctionResponse = await supabase.functions.invoke('download-instagram-image', {
                    body: {
                        imageUrl: imageUrl,
                        storagePath: uniqueFileName,
                        bucketName: INSTAGRAM_IMAGES_BUCKET
                    }
                });

                if (edgeFunctionResponse.error) {
                    throw new Error(`Edge Function error: ${edgeFunctionResponse.error.message}`);
                }

                if (edgeFunctionResponse.data?.success && edgeFunctionResponse.data?.publicUrl) {
                    console.log(`Imagem salva via Edge Function: ${edgeFunctionResponse.data.publicUrl}`);
                    return edgeFunctionResponse.data.publicUrl;
                } else {
                    throw new Error('Edge Function não retornou URL válida');
                }

            } catch (edgeError) {
                console.error('Edge Function também falhou:', edgeError);
                console.log('Usando URL de proxy como último recurso...');
                return convertToProxyUrl(imageUrl);
            }
        }

        // Se chegou até aqui, o download direto funcionou
        // Fazer upload para o Supabase Storage
        console.log(`Fazendo upload para o Supabase Storage...`);
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from(INSTAGRAM_IMAGES_BUCKET)
            .upload(uniqueFileName, imageData, {
                contentType: contentType,
                upsert: true,
                cacheControl: '3600',
            });

        if (uploadError) {
            console.error('Erro no upload:', uploadError);
            throw uploadError;
        }

        // Obter URL pública
        const { data: urlData } = supabaseAdmin.storage
            .from(INSTAGRAM_IMAGES_BUCKET)
            .getPublicUrl(uniqueFileName);

        if (!urlData.publicUrl) {
            throw new Error('Não foi possível obter URL pública');
        }

        console.log(`Imagem salva com sucesso: ${urlData.publicUrl}`);
        return urlData.publicUrl;

    } catch (error) {
        console.error(`Erro ao processar imagem ${imageUrl}:`, error);
        // Como fallback, retornar URL de proxy
        return convertToProxyUrl(imageUrl);
    }
}

// Função para converter URLs do Instagram para proxy local
function convertToProxyUrl(imageUrl: string): string {
    if (!imageUrl || !imageUrl.startsWith('http')) return '';

    if (imageUrl.includes('instagram.com') ||
        imageUrl.includes('cdninstagram') ||
        imageUrl.includes('fbcdn.net')) {

        try {
            const urlParts = new URL(imageUrl);
            const path = urlParts.pathname + urlParts.search;
            return `/instagram-img-proxy${path}`;
        } catch (error) {
            console.error('Erro ao processar URL do Instagram:', error);
            return imageUrl;
        }
    }

    return imageUrl;
}

// Função para componentes verificarem se a URL é do Supabase
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

// Helper function to get the best possible profile image URL
const getBestProfileImageUrl = (profileData: any): string => {
    const possibleUrls = [
        profileData.profilePicUrlHD,
        profileData.profilePicUrl,
        profileData.profile_pic_url_hd,
        profileData.profile_pic_url
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

export async function scrapeInstagramProfile(username: string) {
    try {
        const apifyToken = await getApifyKey();

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

        const defaultDatasetId = statusResponse.data.data?.defaultDatasetId ||
            statusResponse.data.defaultDatasetId;

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

async function createSafePostObject(post: any, profileId: string): Promise<InstagramPost> {
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

        const profileData = resultsResponse.data[0];

        const profilePicUrl = getBestProfileImageUrl(profileData);
        console.log(`Using profile image URL: ${profilePicUrl}`);

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
            throw new Error('User not authenticated');
        }

        console.log('Iniciando download e armazenamento das imagens...');

        // Processar imagem de perfil
        const profileImagePromise = profilePicUrl ?
            downloadAndStoreImage(profilePicUrl, `profiles/${profileData.username}`)
            : Promise.resolve(null);

        // Processar imagens dos posts em paralelo
        const postImagePromises: Promise<void>[] = [];
        if (profileData.latestPosts && profileData.latestPosts.length > 0) {
            console.log(`Processando ${profileData.latestPosts.length} imagens de posts`);

            const CONCURRENT_DOWNLOADS = 3;
            
            for (let i = 0; i < profileData.latestPosts.length; i += CONCURRENT_DOWNLOADS) {
                const batch = profileData.latestPosts.slice(i, i + CONCURRENT_DOWNLOADS);
                
                const batchPromise = async () => {
                    const promises = batch.map(async (post: any, batchIndex: number) => {
                        const globalIndex = i + batchIndex;
                        if (!post.displayUrl) return;

                        try {
                            console.log(`Processando imagem do post ${globalIndex + 1}/${profileData.latestPosts.length}`);

                            const storedImageUrl = await downloadAndStoreImage(
                                post.displayUrl,
                                `posts/${profileData.username}`
                            );

                            if (storedImageUrl && storedImageUrl !== post.displayUrl) {
                                profileData.latestPosts[globalIndex].displayUrl = storedImageUrl;
                                profileData.latestPosts[globalIndex].image_from_supabase = true;
                                console.log(`Imagem do post ${globalIndex + 1} salva: ${storedImageUrl}`);
                            } else {
                                profileData.latestPosts[globalIndex].image_from_supabase = false;
                            }
                        } catch (imgError) {
                            console.error(`Erro ao processar imagem do post ${globalIndex + 1}:`, imgError);
                            profileData.latestPosts[globalIndex].image_from_supabase = false;
                        }
                    });

                    await Promise.all(promises);
                    // Pausa entre batches
                    if (i + CONCURRENT_DOWNLOADS < profileData.latestPosts.length) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                };

                postImagePromises.push(batchPromise());
            }
        }

        // Aguardar processamento da imagem de perfil
        let localProfilePicUrl = profilePicUrl;
        let profileImageFromSupabase = false;

        try {
            console.log('Processando imagem de perfil...');
            const storedProfileImageUrl = await profileImagePromise;

            if (storedProfileImageUrl && storedProfileImageUrl !== profilePicUrl) {
                localProfilePicUrl = storedProfileImageUrl;
                profileImageFromSupabase = true;
                console.log(`Imagem de perfil salva: ${localProfilePicUrl}`);
            }
        } catch (profileImgError) {
            console.error('Erro ao processar imagem de perfil:', profileImgError);
        }

        console.log('Verificando se o perfil já existe...');
        const { data: existingProfile } = await supabase
            .from('instagram_profiles')
            .select('id')
            .eq('instagram_id', profileData.id)
            .eq('user_id', userData.user.id)
            .maybeSingle();

        let profileRecord;

        if (existingProfile) {
            console.log('Atualizando perfil existente...');
            const { data: updatedProfile, error: updateError } = await supabase
                .from('instagram_profiles')
                .update({
                    username: profileData.username,
                    full_name: profileData.fullName,
                    biography: profileData.biography,
                    followers_count: profileData.followersCount,
                    follows_count: profileData.followsCount,
                    posts_count: profileData.postsCount,
                    profile_pic_url: localProfilePicUrl,
                    profile_pic_from_supabase: profileImageFromSupabase,
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
        } else {
            console.log('Inserindo novo perfil...');
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
                        profile_pic_url: localProfilePicUrl,
                        profile_pic_from_supabase: profileImageFromSupabase,
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
        }

        // Aguardar processamento das imagens dos posts
        if (postImagePromises.length > 0) {
            try {
                console.log('Aguardando conclusão do processamento das imagens...');
                await Promise.all(postImagePromises);
                console.log('Processamento das imagens concluído');
            } catch (downloadError) {
                console.error('Erro durante o processamento:', downloadError);
            }
        }

        // Processar e salvar posts
        if (profileData.latestPosts && profileData.latestPosts.length > 0) {
            console.log(`Salvando ${profileData.latestPosts.length} posts no banco de dados`);

            // Deletar posts existentes
            const { error: deleteError } = await supabase
                .from('instagram_posts')
                .delete()
                .eq('profile_id', profileRecord.id);

            if (deleteError) {
                console.error('Error deleting existing posts:', deleteError);
            }

            try {
                const postsToInsert = [];
                for (const post of profileData.latestPosts) {
                    try {
                        const safePost = await createSafePostObject(post, profileRecord.id);
                        safePost.image_from_supabase = post.image_from_supabase === true;
                        postsToInsert.push(safePost);
                    } catch (postError) {
                        console.error('Erro ao processar post:', postError);
                    }
                }

                if (postsToInsert.length > 0) {
                    console.log(`Inserindo ${postsToInsert.length} posts no banco de dados`);
                    const { error: insertError } = await supabase
                        .from('instagram_posts')
                        .insert(postsToInsert);

                    if (insertError) {
                        console.error('Erro ao inserir posts:', insertError);
                    } else {
                        console.log(`${postsToInsert.length} posts salvos com sucesso`);
                    }
                }
            } catch (error) {
                console.error('Erro ao salvar posts:', error);
            }
        }

        const totalSupabaseImages = (profileImageFromSupabase ? 1 : 0) +
            (profileData.latestPosts || []).filter((post: any) => post.image_from_supabase === true).length;

        const totalImages = 1 + (profileData.latestPosts?.length || 0);

        return {
            profile: profileRecord,
            postCount: profileData.latestPosts?.length || 0,
            supabaseImageCount: totalSupabaseImages,
            totalImageCount: totalImages,
            success: true,
            message: `Perfil processado: ${profileData.username}. ${totalSupabaseImages}/${totalImages} imagens salvas no Supabase.`
        };

    } catch (error: any) {
        console.error('Error fetching scraping results:', error);
        return {
            success: false,
            error: error.message || 'Error fetching scraping results',
            message: `Erro ao processar perfil: ${error.message}`
        };
    }
}
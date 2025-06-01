import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { scrapeInstagramProfile, checkScrapingStatus, fetchScrapingResults } from '../services/instagramService';

export interface InstagramProfile {
    id: string;
    instagram_id: string;
    username: string;
    fullName: string;
    biography: string;
    followersCount: number;
    followsCount: number;
    postsCount: number;
    profilePicUrl: string;
    isBusinessAccount: boolean;
    businessCategoryName?: string;
    createdAt: string;
}

export interface InstagramPost {
    id: string;
    profile_id: string;
    instagram_id: string;
    shortCode: string;
    type: string;
    url: string;
    caption: string;
    timestamp: string;
    likesCount: number;
    commentsCount: number;
    videoViewCount?: number;
    displayUrl: string;
    isVideo: boolean;
    hashtags?: string[];
    mentions?: string[];
    productType?: string;
    isCommentsDisabled?: boolean;
}

interface ScrapingJob {
    runId: string;
    profileUsername: string;
    status: 'running' | 'succeeded' | 'failed' | 'timeout';
    startedAt: string;
    finishedAt?: string;
    datasetId?: string;
    error?: string;
}

interface ScrapingOptions {
    postsLimit?: number;
    checkInterval?: number;
    maxTimeout?: number;
}

interface InstagramState {
    profiles: InstagramProfile[];
    currentProfile: InstagramProfile | null;
    posts: InstagramPost[];
    activeScrapingJobs: ScrapingJob[];
    isLoading: boolean;
    error: string | null;
    fetchProfiles: () => Promise<void>;
    scrapeProfile: (username: string, options?: ScrapingOptions) => Promise<void>;
    setCurrentProfile: (profile: InstagramProfile) => void;
    fetchPosts: (profileId: string) => Promise<void>;
    checkActiveScrapingJobs: () => Promise<void>;
    processFinishedScrapingJob: (job: ScrapingJob) => Promise<void>;
    deleteProfile: (profileId: string) => Promise<void>;
}

export const useInstagramStore = create<InstagramState>((set, get) => ({
    profiles: [],
    currentProfile: null,
    posts: [],
    activeScrapingJobs: [],
    isLoading: false,
    error: null,

    fetchProfiles: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('instagram_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const profiles = data?.map(profile => ({
                id: profile.id,
                instagram_id: profile.instagram_id,
                username: profile.username,
                fullName: profile.full_name || '',
                biography: profile.biography || '',
                followersCount: profile.followers_count || 0,
                followsCount: profile.follows_count || 0,
                postsCount: profile.posts_count || 0,
                profilePicUrl: profile.profile_pic_url || '',
                isBusinessAccount: profile.is_business_account || false,
                businessCategoryName: profile.business_category_name,
                createdAt: profile.created_at
            })) || [];

            set({ profiles, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    scrapeProfile: async (username: string, options?: ScrapingOptions) => {
        set({ isLoading: true, error: null });
        try {
            const result = await scrapeInstagramProfile(username, {
                postsLimit: options?.postsLimit || 100,
                checkInterval: options?.checkInterval || 5000,
                maxTimeout: options?.maxTimeout || 600000
            });

            set(state => ({
                activeScrapingJobs: [
                    ...state.activeScrapingJobs,
                    {
                        runId: result.runId,
                        profileUsername: username,
                        status: 'running',
                        startedAt: new Date().toISOString()
                    }
                ],
                isLoading: false
            }));

            setTimeout(() => get().checkActiveScrapingJobs(), 
                options?.checkInterval || 5000);

        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    setCurrentProfile: (profile) => {
        set({ currentProfile: profile });
    },

    fetchPosts: async (profileId) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('instagram_posts')
                .select('*')
                .eq('profile_id', profileId)
                .order('timestamp', { ascending: false });

            if (error) throw error;

            const posts = data?.map(post => ({
                id: post.id,
                profile_id: post.profile_id,
                instagram_id: post.instagram_id,
                shortCode: post.short_code,
                type: post.type || 'Image',
                url: post.url || '',
                caption: post.caption || '',
                timestamp: post.timestamp,
                likesCount: post.likes_count,
                commentsCount: post.comments_count,
                videoViewCount: post.video_view_count,
                displayUrl: post.display_url,
                isVideo: post.is_video,
                hashtags: post.hashtags ? JSON.parse(post.hashtags) : undefined,
                mentions: post.mentions ? JSON.parse(post.mentions) : undefined,
                productType: post.product_type,
                isCommentsDisabled: post.is_comments_disabled
            })) || [];

            set({ posts, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    checkActiveScrapingJobs: async () => {
        const { activeScrapingJobs } = get();

        if (activeScrapingJobs.length === 0) return;

        try {
            const updatedJobs = [...activeScrapingJobs];
            let anyRunning = false;

            for (let i = 0; i < updatedJobs.length; i++) {
                const job = updatedJobs[i];

                if (job.status === 'running') {
                    try {
                        console.log(`Checking status for job ${job.runId} (${job.profileUsername})`);
                        const status = await checkScrapingStatus(job.runId);
                        console.log(`Current status: ${status.status}, Dataset ID: ${status.defaultDatasetId || 'Not available yet'}`);

                        const normalizedStatus = status.status?.toUpperCase();

                        if (status.defaultDatasetId && !updatedJobs[i].datasetId) {
                            updatedJobs[i] = {
                                ...updatedJobs[i],
                                datasetId: status.defaultDatasetId
                            };
                        }

                        if (normalizedStatus === 'SUCCEEDED') {
                            console.log(`Job ${job.runId} succeeded. Dataset ID: ${status.defaultDatasetId}`);
                            updatedJobs[i] = {
                                ...job,
                                status: 'succeeded',
                                finishedAt: status.finishedAt || new Date().toISOString(),
                                datasetId: status.defaultDatasetId || updatedJobs[i].datasetId
                            };

                            if (updatedJobs[i].datasetId) {
                                await get().processFinishedScrapingJob(updatedJobs[i]);
                            } else {
                                console.error('No dataset ID found for completed job', job.runId);
                                updatedJobs[i] = {
                                    ...updatedJobs[i],
                                    status: 'failed',
                                    error: 'No dataset ID found for completed job'
                                };
                            }
                        } else if (
                            normalizedStatus === 'FAILED' ||
                            normalizedStatus === 'TIMED-OUT' ||
                            normalizedStatus === 'ABORTED'
                        ) {
                            console.log(`Job ${job.runId} ended with status: ${normalizedStatus}`);
                            updatedJobs[i] = {
                                ...job,
                                status: normalizedStatus === 'FAILED' ? 'failed' : 'timeout',
                                finishedAt: status.finishedAt || new Date().toISOString(),
                                error: `Job ${normalizedStatus}`
                            };
                        } else if (
                            normalizedStatus === 'READY' ||
                            normalizedStatus === 'RUNNING'
                        ) {
                            console.log(`Job ${job.runId} is still running with status: ${normalizedStatus}`);
                            anyRunning = true;

                            if (updatedJobs[i].datasetId) {
                                console.log(`Job is still running, but dataset ID exists: ${updatedJobs[i].datasetId}. Will try to process available data.`);

                                try {
                                    await get().processFinishedScrapingJob({
                                        ...updatedJobs[i],
                                        status: 'succeeded'
                                    });

                                    updatedJobs[i] = {
                                        ...updatedJobs[i],
                                        status: 'succeeded',
                                        finishedAt: new Date().toISOString()
                                    };
                                    anyRunning = false;
                                } catch (error: any) {
                                    console.log(`Tried to process partial data but failed: ${error.message}. Will continue waiting.`);
                                }
                            }
                        } else {
                            console.log(`Job ${job.runId} has unknown status: ${normalizedStatus}`);
                            anyRunning = true;
                        }
                    } catch (error: any) {
                        console.error(`Error checking status for job ${job.runId}:`, error);
                        updatedJobs[i] = {
                            ...job,
                            status: 'failed',
                            finishedAt: new Date().toISOString(),
                            error: error.message
                        };
                    }
                }
            }

            set({ activeScrapingJobs: updatedJobs });

            if (anyRunning) {
                console.log("Some jobs are still running, scheduling another check in 15 seconds");
                setTimeout(() => get().checkActiveScrapingJobs(), 15000);
            } else {
                console.log("No running jobs remaining");
            }
        } catch (error: any) {
            console.error('Error checking scraping jobs:', error);
        }
    },

    processFinishedScrapingJob: async (job) => {
        if (!job.datasetId) {
            console.error('No dataset ID provided for job', job);
            return;
        }

        console.log(`Processing finished job ${job.runId} with dataset ${job.datasetId}`);

        try {
            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.map(j =>
                    j.runId === job.runId ? { ...j, status: 'running', error: 'Processing data...' } : j
                )
            }));

            const result = await fetchScrapingResults(job.datasetId);
            console.log(`Successfully processed job for ${job.profileUsername}`);

            await get().fetchProfiles();

            const { currentProfile } = get();
            if (currentProfile && currentProfile.username === job.profileUsername) {
                await get().fetchPosts(currentProfile.id);
            }

            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.filter(j => j.runId !== job.runId)
            }));

            set({ error: null });
        } catch (error: any) {
            console.error('Error processing scraping results:', error);

            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.map(j =>
                    j.runId === job.runId
                        ? { ...j, status: 'failed', error: error.message }
                        : j
                )
            }));
        }
    },

    deleteProfile: async (profileId) => {
        set({ isLoading: true, error: null });
        try {
            const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
            if (!serviceKey) {
                console.error(
                    `== CONFIGURAÇÃO NECESSÁRIA ===
A chave de serviço do Supabase não foi encontrada no arquivo .env.
Para habilitar exclusões, adicione a seguinte linha ao seu arquivo .env:

VITE_SUPABASE_SERVICE_KEY=sua_chave_de_servico

Você pode encontrar esta chave no painel do Supabase:
1. Acesse o painel do Supabase
2. Vá para Configurações > API
3. Encontre a chave "service_role key"
4. Copie e adicione ao seu arquivo .env
=================================`
                );
                throw new Error('Chave de serviço Supabase não encontrada. Verifique o console para instruções de configuração.');
            }

            console.log(`Tentando excluir perfil com ID: ${profileId}`);

            const { data: profileData, error: fetchError } = await supabase
                .from('instagram_profiles')
                .select('username')
                .eq('id', profileId)
                .single();

            if (fetchError) {
                console.error('Erro ao verificar o perfil:', fetchError);
                throw fetchError;
            }

            if (!profileData) {
                throw new Error('Perfil não encontrado no banco de dados');
            }

            console.log(`Excluindo perfil do usuário @${profileData.username}...`);

            let deleteSuccess = false;

            try {
                const { error: profileError } = await supabase
                    .from('instagram_profiles')
                    .delete()
                    .eq('id', profileId);

                if (profileError) {
                    console.error('Erro ao excluir perfil (método padrão):', profileError);
                    throw profileError;
                }

                const { data: checkData } = await supabase
                    .from('instagram_profiles')
                    .select('id')
                    .eq('id', profileId);

                if (!checkData || checkData.length === 0) {
                    console.log('Perfil excluído com sucesso (método padrão)');
                    deleteSuccess = true;
                } else {
                    console.warn('Perfil ainda existe após tentativa de exclusão padrão.');
                }
            } catch (standardDeleteError) {
                console.error('Falha na exclusão padrão, tentando método alternativo:', standardDeleteError);
            }

            if (!deleteSuccess) {
                console.log('Tentando método alternativo de exclusão via RPC (se configurado)...');
                if (!deleteSuccess) throw new Error('Falha na exclusão padrão e método RPC não implementado/executado aqui.');
            }

            if (!deleteSuccess) {
                throw new Error('Não foi possível excluir o perfil usando nenhum dos métodos disponíveis');
            }

            set(state => ({
                profiles: state.profiles.filter(profile => profile.id !== profileId),
                currentProfile: state.currentProfile?.id === profileId ? null : state.currentProfile,
                posts: state.currentProfile?.id === profileId ? [] : state.posts,
                isLoading: false
            }));

            console.log('Estado da loja atualizado após exclusão');
        } catch (error: any) {
            console.error('Erro completo ao excluir perfil:', error);
            set({
                error: `Falha ao excluir perfil: ${error.message || 'Erro desconhecido'}`,
                isLoading: false
            });
        }
    }
}));
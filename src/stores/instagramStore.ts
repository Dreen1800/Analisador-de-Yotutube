import { create } from 'zustand';
import { supabase /*, supabaseAdmin */ } from '../lib/supabaseClient'; // supabaseAdmin pode não ser necessário aqui se RLS estiver configurado e o usuário faz as próprias escritas
import { scrapeInstagramProfile, checkScrapingStatus, fetchScrapingResults, fetchProfileData, saveProfileDataOnly, fetchPostsOnly, ScrapingParams } from '../services/instagramService';

// Definição dos novos tipos e interfaces
export type ScrapingJobStatus =
    | 'PENDING_APIFY'
    | 'PROCESSING_APIFY'
    | 'APIFY_SUCCEEDED'
    | 'APIFY_FAILED'
    | 'APIFY_TIMED_OUT'
    | 'PROCESSING_DATA'
    | 'COMPLETED'
    | 'FAILED_PROCESSING'
    | 'USER_CANCELLED';

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

// Interface ScrapingJob atualizada
export interface ScrapingJob {
    id: string; // UUID do Supabase, chave primária da tabela scraping_jobs
    user_id: string; // FK para auth.users
    apify_run_id: string | null;
    profile_username: string;
    status: ScrapingJobStatus;
    apify_dataset_id?: string | null;
    error_message?: string | null;
    job_details?: any;
    job_type?: 'profile_data' | 'posts' | 'combined'; // Novo campo para identificar tipo do job
    parent_job_id?: string | null; // Para jobs de posts que dependem de jobs de perfil
    created_at: string;
    updated_at: string;
}

interface InstagramState {
    profiles: InstagramProfile[];
    currentProfile: InstagramProfile | null;
    posts: InstagramPost[];
    activeScrapingJobs: ScrapingJob[]; // Usará a nova interface
    isLoading: boolean; // Pode ser usado para carregamento inicial de jobs, ou status de botões
    error: string | null;
    fetchProfiles: () => Promise<void>;
    scrapeProfile: (username: string, params?: ScrapingParams) => Promise<void>;
    setCurrentProfile: (profile: InstagramProfile) => void;
    fetchPosts: (profileId: string) => Promise<void>;
    checkActiveScrapingJobs: () => Promise<void>; // Precisará ser refatorado
    processFinishedScrapingJob: (job: ScrapingJob) => Promise<void>; // Precisará ser refatorado
    deleteProfile: (profileId: string) => Promise<void>;
    fetchUserJobs: () => Promise<void>; // Nova função
    updateJobInSupabase: (jobId: string, updates: Partial<Omit<ScrapingJob, 'id' | 'user_id' | 'created_at' | 'profile_username'>>) => Promise<ScrapingJob | null>; // Nova helper
}

export const useInstagramStore = create<InstagramState>((set, get) => ({
    profiles: [],
    currentProfile: null,
    posts: [],
    activeScrapingJobs: [],
    isLoading: false,
    error: null,

    // Nova função para buscar jobs do usuário no Supabase
    fetchUserJobs: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                set({ activeScrapingJobs: [], isLoading: false });
                return;
            }

            const { data: jobs, error: jobsError } = await supabase
                .from('scraping_jobs')
                .select('*')
                .eq('user_id', user.id)
                // Poderia filtrar por status que não sejam finais, como 'COMPLETED' ou 'FAILED_PROCESSING'
                // .not('status', 'in', '(\'COMPLETED\', \'FAILED_PROCESSING\')') 
                .order('created_at', { ascending: false });

            if (jobsError) {
                console.error('Error fetching user jobs:', jobsError);
                throw jobsError;
            }

            // O tipo 'jobs' aqui será (ScrapingJob[] | null) ou similar vindo do Supabase
            // Precisamos garantir que o tipo corresponda ao nosso ScrapingJob
            const typedJobs = (jobs || []) as ScrapingJob[];

            set({ activeScrapingJobs: typedJobs, isLoading: false });

            // Se houver jobs que precisam de verificação, iniciar o polling
            const needsPolling = typedJobs.some(job => job.status === 'PROCESSING_APIFY' || job.status === 'APIFY_SUCCEEDED');
            if (needsPolling) {
                console.log("Jobs pendentes encontrados, iniciando checkActiveScrapingJobs.");
                get().checkActiveScrapingJobs();
            }

        } catch (error: any) {
            console.error('Failed to fetch user jobs:', error);
            set({ error: 'Falha ao buscar seus trabalhos de análise.', isLoading: false });
        }
    },

    // Nova helper para atualizar jobs no Supabase
    updateJobInSupabase: async (jobId, updates) => {
        try {
            const { data, error } = await supabase
                .from('scraping_jobs')
                .update(updates)
                .eq('id', jobId)
                .select()
                .single();

            if (error) {
                console.error(`Error updating job ${jobId} in Supabase:`, error);
                throw error;
            }
            return data as ScrapingJob;
        } catch (error) {
            console.error('Supabase update failed:', error);
            // Retornar null ou propagar o erro, dependendo de como você quer lidar com isso nas chamadas
            return null;
        }
    },

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

    scrapeProfile: async (username, params) => {
        set({ isLoading: true, error: null });
        let supabaseJobIdAsString: string | undefined = undefined; // Declarada aqui para escopo mais amplo

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuário não autenticado.');
            }

            // Verificar jobs existentes para este perfil e usuário
            const { data: existingJobs, error: fetchJobsError } = await supabase
                .from('scraping_jobs')
                .select('*')
                .eq('user_id', user.id)
                .eq('profile_username', username)
                .order('created_at', { ascending: false });

            if (fetchJobsError) {
                console.error('Error fetching existing jobs:', fetchJobsError);
                set({ isLoading: false, error: 'Falha ao verificar jobs existentes.' });
                throw fetchJobsError;
            }

            let jobToConsider: ScrapingJob | null = null;
            if (existingJobs && existingJobs.length > 0) {
                jobToConsider =
                    existingJobs.find(j => j.status === 'COMPLETED') ||
                    existingJobs.find(j => j.status === 'APIFY_SUCCEEDED') ||
                    existingJobs.find(j => j.status === 'PROCESSING_DATA') ||
                    existingJobs.find(j => j.status === 'PENDING_APIFY' || j.status === 'PROCESSING_APIFY') ||
                    null;
            }

            if (jobToConsider) {
                console.log(`Job relevante encontrado para ${username} com status ${jobToConsider.status}:`, jobToConsider);

                if (jobToConsider.status !== 'COMPLETED') {
                    set(state => ({
                        activeScrapingJobs: state.activeScrapingJobs.find(j => j.id === jobToConsider!.id)
                            ? state.activeScrapingJobs
                            : [...state.activeScrapingJobs, jobToConsider as ScrapingJob].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    }));
                }

                if (jobToConsider.status === 'COMPLETED') {
                    // Verificar se o perfil realmente existe no banco de dados
                    const { data: existingProfile, error: profileError } = await supabase
                        .from('instagram_profiles')
                        .select('id')
                        .eq('username', username)
                        .maybeSingle();

                    if (profileError) {
                        console.error('Erro ao verificar perfil existente:', profileError);
                    }

                    if (existingProfile && existingProfile.id) {
                        set({ isLoading: false, error: `O perfil @${username} já foi analisado e completado anteriormente.` });
                        return;
                    } else {
                        console.log(`Job marcado como COMPLETED, mas perfil não encontrado no banco. Reprocessando job: ${jobToConsider.id}`);

                        // Mudar o status para APIFY_SUCCEEDED para reprocessar
                        if (jobToConsider.apify_dataset_id) {
                            const resetJob = await get().updateJobInSupabase(jobToConsider.id, {
                                status: 'APIFY_SUCCEEDED' as ScrapingJobStatus,
                                error_message: 'Reprocessando dados que não foram salvos corretamente.'
                            });

                            if (resetJob) {
                                set({ isLoading: false, error: `Reprocessando dados para @${username} que não foram salvos corretamente.` });
                                await get().processFinishedScrapingJob(resetJob);
                                return;
                            }
                        } else {
                            // Se não tiver dataset_id, criar um novo job
                            console.log(`Job ${jobToConsider.id} não tem dataset_id. Criando novo job.`);
                            // Continuar para o código que cria um novo job (não retornar)
                        }
                    }
                } else if (jobToConsider.status === 'APIFY_SUCCEEDED') {
                    set({ isLoading: false, error: `Resultados da Apify para @${username} prontos. Processando e salvando dados...` });
                    await get().processFinishedScrapingJob(jobToConsider as ScrapingJob);
                    return;
                } else if (jobToConsider.status === 'PENDING_APIFY' || jobToConsider.status === 'PROCESSING_APIFY') {
                    set({ isLoading: false, error: `Uma análise para @${username} já está em andamento na Apify (status: ${jobToConsider.status}). Aguardando conclusão.` });
                    get().checkActiveScrapingJobs();
                    return;
                } else if (jobToConsider.status === 'PROCESSING_DATA') {
                    set({ isLoading: false, error: `Os dados para @${username} já foram coletados e estão sendo processados (status: ${jobToConsider.status}).` });
                    return;
                }
            }

            console.log(`Nenhum job ativo/pendente reutilizável encontrado para ${username}, ou job anterior falhou. Criando novo job.`);

            // supabaseJobIdAsString já foi declarado acima

            const initialJobPayload = {
                user_id: user.id,
                profile_username: username,
                status: 'PENDING_APIFY' as ScrapingJobStatus,
            };
            const { data: newJobData, error: createJobError } = await supabase
                .from('scraping_jobs')
                .insert(initialJobPayload)
                .select()
                .single();

            if (createJobError || !newJobData || !newJobData.id) {
                console.error('Error creating job record in Supabase or newJob.id is missing:', createJobError);
                set({ isLoading: false, error: 'Falha ao criar registro do job no Supabase.' });
                throw createJobError || new Error('Falha ao criar registro do job no Supabase ou ID do job ausente.');
            }

            const newSupabaseJob = newJobData as ScrapingJob;
            supabaseJobIdAsString = newSupabaseJob.id; // Atribuído aqui

            set(state => ({
                activeScrapingJobs: [newSupabaseJob, ...state.activeScrapingJobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }));

            const apifyRunResult = await scrapeInstagramProfile(username, params);

            if (!apifyRunResult || !apifyRunResult.profileJob) {
                throw new Error('Falha ao iniciar o scraper da Apify. Jobs não recebidos.');
            }

            console.log('=== RESULTADO DOS JOBS INICIADOS ===');
            console.log('Profile Job:', apifyRunResult.profileJob);
            console.log('Posts Job:', apifyRunResult.postsJob);

            // Atualizar o job principal com dados do job de perfil
            // Tentar primeiro com os novos campos, se falhar usar campos antigos
            let updatedJobAfterApifyStart;
            try {
                updatedJobAfterApifyStart = await get().updateJobInSupabase(supabaseJobIdAsString, {
                    apify_run_id: apifyRunResult.profileJob.runId,
                    status: 'PROCESSING_APIFY' as ScrapingJobStatus,
                    job_type: 'profile_data' as const,
                    job_details: {
                        profileJobRunId: apifyRunResult.profileJob.runId,
                        postsJobRunId: apifyRunResult.postsJob?.runId || null,
                        scrapingParams: params
                    }
                });
            } catch (error: any) {
                console.warn('Falha ao usar novos campos, tentando com campos antigos:', error);
                // Fallback para campos antigos
                updatedJobAfterApifyStart = await get().updateJobInSupabase(supabaseJobIdAsString, {
                    apify_run_id: apifyRunResult.profileJob.runId,
                    status: 'PROCESSING_APIFY' as ScrapingJobStatus,
                    job_details: {
                        profileJobRunId: apifyRunResult.profileJob.runId,
                        postsJobRunId: apifyRunResult.postsJob?.runId || null,
                        scrapingParams: params,
                        jobType: 'profile_data' // Armazenar no job_details como fallback
                    }
                });
            }

            // Se houver job de posts, criar um job separado no Supabase
            if (apifyRunResult.postsJob) {
                // Tentar primeiro com novos campos, se falhar usar campos antigos
                try {
                    const postsJobPayload = {
                        user_id: user.id,
                        profile_username: username,
                        apify_run_id: apifyRunResult.postsJob.runId,
                        status: 'PROCESSING_APIFY' as ScrapingJobStatus,
                        job_type: 'posts' as const,
                        parent_job_id: supabaseJobIdAsString,
                        job_details: {
                            scrapingParams: params
                        }
                    };

                    const { data: postsJobData, error: postsJobError } = await supabase
                        .from('scraping_jobs')
                        .insert(postsJobPayload)
                        .select()
                        .single();

                    if (postsJobError) {
                        throw postsJobError;
                    }

                    console.log('✅ Posts job created with new fields:', postsJobData);
                    set(state => ({
                        activeScrapingJobs: [postsJobData as ScrapingJob, ...state.activeScrapingJobs]
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    }));

                } catch (error: any) {
                    console.warn('Falha ao criar job de posts com novos campos, tentando com campos antigos:', error);

                    // Fallback para campos antigos
                    const postsJobPayloadFallback = {
                        user_id: user.id,
                        profile_username: username,
                        apify_run_id: apifyRunResult.postsJob.runId,
                        status: 'PROCESSING_APIFY' as ScrapingJobStatus,
                        job_details: {
                            scrapingParams: params,
                            jobType: 'posts', // Armazenar no job_details como fallback
                            parentJobId: supabaseJobIdAsString
                        }
                    };

                    const { data: postsJobData, error: postsJobError } = await supabase
                        .from('scraping_jobs')
                        .insert(postsJobPayloadFallback)
                        .select()
                        .single();

                    if (postsJobError) {
                        console.error('Error creating posts job with fallback:', postsJobError);
                    } else {
                        console.log('✅ Posts job created with fallback fields:', postsJobData);
                        set(state => ({
                            activeScrapingJobs: [postsJobData as ScrapingJob, ...state.activeScrapingJobs]
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        }));
                    }
                }
            }

            if (!updatedJobAfterApifyStart) {
                console.error('Falha ao atualizar o job no Supabase após iniciar Apify. O job pode estar como PENDING_APIFY.');
                set(state => ({
                    activeScrapingJobs: state.activeScrapingJobs.map(j =>
                        j.id === supabaseJobIdAsString
                            ? { ...j, apify_run_id: apifyRunResult.profileJob.runId, status: 'PROCESSING_APIFY' as ScrapingJobStatus, error_message: 'Falha ao atualizar status no DB após Apify.' }
                            : j
                    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
                    isLoading: false,
                    error: 'Job iniciado na Apify, mas houve falha ao atualizar seu status no banco de dados.'
                }));
                get().checkActiveScrapingJobs();
                return;
            }

            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.map(j => j.id === supabaseJobIdAsString ? updatedJobAfterApifyStart : j)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
                isLoading: false
            }));

            get().checkActiveScrapingJobs();

        } catch (error: any) {
            console.error('Error in scrapeProfile:', error);
            if (!get().error) {
                set({ error: error.message || 'Erro desconhecido ao analisar perfil.' });
            }
            set({ isLoading: false });

            const currentJobIdPending = get().activeScrapingJobs.find(j => j.profile_username === username && j.status === 'PENDING_APIFY')?.id;
            const idToUpdateOnFailure = supabaseJobIdAsString || currentJobIdPending; // supabaseJobIdAsString é do escopo da função

            if (idToUpdateOnFailure) {
                try {
                    const failedUpdatePayload = {
                        status: 'APIFY_FAILED' as ScrapingJobStatus, // Cast para ScrapingJobStatus
                        error_message: error.message,
                    };
                    const failedUpdate = await get().updateJobInSupabase(idToUpdateOnFailure, failedUpdatePayload);
                    if (failedUpdate) {
                        set(state => ({
                            activeScrapingJobs: state.activeScrapingJobs.map(j =>
                                j.id === idToUpdateOnFailure ? failedUpdate : j
                            ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
                        }));
                    } else {
                        set(state => ({
                            activeScrapingJobs: state.activeScrapingJobs.map(j =>
                                j.id === idToUpdateOnFailure
                                    ? { ...j, ...failedUpdatePayload } // Espalha o payload de falha
                                    : j
                            ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
                        }));
                    }
                } catch (updateError) {
                    console.error('Failed to update job status to APIFY_FAILED in Supabase:', updateError);
                }
            }
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

    // checkActiveScrapingJobs e processFinishedScrapingJob precisarão de refatoração pesada
    // Vou deixar um esqueleto aqui por enquanto.
    checkActiveScrapingJobs: async () => {
        const { activeScrapingJobs } = get();
        if (!activeScrapingJobs || activeScrapingJobs.length === 0) {
            return;
        }

        console.log(`Verificando ${activeScrapingJobs.length} job(s) ativos.`);

        // Filtrar jobs que estão em estados que precisam ser verificados ou processados
        const jobsToCheck = activeScrapingJobs.filter(job =>
            job.status === 'PROCESSING_APIFY' || job.status === 'APIFY_SUCCEEDED'
        );

        if (jobsToCheck.length === 0) {
            console.log('Nenhum job ativo requer verificação de status.');
            return;
        }

        // Para processamento em paralelo seguro, precisamos criar uma versão local das funções, incluindo atualizações via Supabase
        const processJobs = async () => {
            try {
                // Primeiro, verificamos todos os jobs PROCESSING_APIFY para atualizar seus status
                const processingJobs = jobsToCheck.filter(job => job.status === 'PROCESSING_APIFY');
                for (const job of processingJobs) {
                    try {
                        if (!job.apify_run_id) {
                            console.error(`Job ${job.id} (${job.profile_username}) tem status PROCESSING_APIFY mas apify_run_id é null.`);
                            await get().updateJobInSupabase(job.id, {
                                status: 'APIFY_FAILED' as ScrapingJobStatus,
                                error_message: 'Job apify_run_id é nulo.'
                            });
                            continue;
                        }

                        console.log(`Verificando status do job Apify ${job.apify_run_id} para perfil ${job.profile_username}.`);
                        const apifyStatus = await checkScrapingStatus(job.apify_run_id);

                        if (apifyStatus.status === 'SUCCEEDED') {
                            console.log(`Job Apify ${job.apify_run_id} para perfil ${job.profile_username} foi concluído com sucesso. Dataset ID: ${apifyStatus.defaultDatasetId}`);

                            const updatedJob = await get().updateJobInSupabase(job.id, {
                                status: 'APIFY_SUCCEEDED' as ScrapingJobStatus,
                                apify_dataset_id: apifyStatus.defaultDatasetId,
                                error_message: null // Limpar qualquer erro anterior
                            });

                            if (updatedJob) {
                                // Atualizar o job localmente no estado para o próximo loop verificar para processamento
                                set(state => ({
                                    activeScrapingJobs: state.activeScrapingJobs.map(j =>
                                        j.id === job.id ? updatedJob : j
                                    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                }));

                                // Importante: Processar já o job que acabou de ser confirmado como SUCCEEDED
                                await get().processFinishedScrapingJob(updatedJob);
                            }
                        } else if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(apifyStatus.status)) {
                            console.warn(`Job Apify ${job.apify_run_id} para perfil ${job.profile_username} falhou com status: ${apifyStatus.status}`);

                            // Mapear status da Apify para nosso sistema
                            let newStatus: ScrapingJobStatus = 'APIFY_FAILED';
                            if (apifyStatus.status === 'TIMED-OUT') {
                                newStatus = 'APIFY_TIMED_OUT';
                            }

                            const updatedJob = await get().updateJobInSupabase(job.id, {
                                status: newStatus,
                                error_message: `Apify job falhou com status: ${apifyStatus.status}`
                            });

                            if (updatedJob) {
                                set(state => ({
                                    activeScrapingJobs: state.activeScrapingJobs.map(j =>
                                        j.id === job.id ? updatedJob : j
                                    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                }));
                            }
                        } else if (['READY', 'RUNNING'].includes(apifyStatus.status)) {
                            console.log(`Job Apify ${job.apify_run_id} para perfil ${job.profile_username} ainda está em execução (${apifyStatus.status}).`);
                            // Não atualizamos o status do job, pois continua em PROCESSING_APIFY
                        } else {
                            console.log(`Job Apify ${job.apify_run_id} para perfil ${job.profile_username} tem status desconhecido: ${apifyStatus.status}`);
                        }
                    } catch (jobError: any) {
                        // Verificar se o erro é um "404 Not Found" da Apify, o que significa run_id inválido/não encontrado
                        if (jobError.message && jobError.message.includes('404') && job.apify_run_id) {
                            console.error(`Apify run_id ${job.apify_run_id} não encontrado (404). Job ID: ${job.id}, perfil: ${job.profile_username}`);

                            const updatedJob = await get().updateJobInSupabase(job.id, {
                                status: 'APIFY_FAILED' as ScrapingJobStatus,
                                error_message: `Apify run_id não encontrado (404): ${job.apify_run_id}`
                            });

                            if (updatedJob) {
                                set(state => ({
                                    activeScrapingJobs: state.activeScrapingJobs.map(j =>
                                        j.id === job.id ? updatedJob : j
                                    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                }));
                            }
                        } else {
                            console.error(`Erro ao verificar status do job ${job.id} (${job.profile_username}):`, jobError);
                        }
                    }
                }

                // Em seguida, processamos todos os jobs que estão como APIFY_SUCCEEDED (incluindo os que acabaram de mudar)
                // Reconsultamos o estado pois ele pode ter sido atualizado acima
                const currentState = get().activeScrapingJobs;
                const succeededJobs = currentState.filter(job => job.status === 'APIFY_SUCCEEDED');

                for (const job of succeededJobs) {
                    try {
                        console.log(`Processando job ${job.id} (${job.profile_username}) com status APIFY_SUCCEEDED`);
                        await get().processFinishedScrapingJob(job);
                    } catch (processError) {
                        console.error(`Erro ao processar job ${job.id} (${job.profile_username}):`, processError);
                    }
                }

                // Agendar próxima verificação se ainda houver jobs a serem verificados ou processados
                const currentJobsState = get().activeScrapingJobs;
                const needsMorePolling = currentJobsState.some(job =>
                    job.status === 'PROCESSING_APIFY' || job.status === 'APIFY_SUCCEEDED'
                );

                if (needsMorePolling) {
                    console.log('Ainda há jobs para verificar. Agendando próxima verificação em 10s.');
                    setTimeout(() => {
                        get().checkActiveScrapingJobs();
                    }, 10000); // Verificar a cada 10 segundos
                } else {
                    console.log('Nenhum job pendente para verificar. Polling interrompido.');
                }
            } catch (error) {
                console.error('Erro ao processar jobs:', error);
                // Mesmo com erro, tentamos continuar polling se houver jobs ativos
                setTimeout(() => {
                    get().checkActiveScrapingJobs();
                }, 15000); // Esperar um pouco mais em caso de erro
            }
        };

        // Iniciar processamento
        await processJobs();
    },

    processFinishedScrapingJob: async (jobToProcess) => {
        console.log(`=== PROCESSANDO JOB FINALIZADO ===`);
        console.log('Job:', jobToProcess);
        console.log('Job Type:', jobToProcess.job_type);

        // Verificar se estamos tentando reprocessar um job devido a dados faltantes
        const isReprocessing = jobToProcess.error_message && jobToProcess.error_message.includes('Reprocessando dados');

        // Se estamos reprocessando, ignorar o check de status
        if (!isReprocessing && (jobToProcess.status === 'PROCESSING_DATA' || jobToProcess.status === 'COMPLETED' || jobToProcess.status === 'FAILED_PROCESSING')) {
            console.log(`Job ${jobToProcess.id} (${jobToProcess.profile_username}) is already in a final or processing state (${jobToProcess.status}). Skipping re-processing.`);
            return;
        }

        if (!jobToProcess || !jobToProcess.apify_dataset_id || !jobToProcess.profile_username) {
            console.error('Invalid job passed to processFinishedScrapingJob (missing data):', jobToProcess);
            if (jobToProcess && jobToProcess.id) {
                const updatedJob = await get().updateJobInSupabase(jobToProcess.id, { status: 'FAILED_PROCESSING' as ScrapingJobStatus, error_message: 'Invalid job data for processing.' });
                if (updatedJob) {
                    set(state => ({ activeScrapingJobs: state.activeScrapingJobs.map(j => j.id === jobToProcess.id ? updatedJob : j).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) }));
                }
            }
            return;
        }

        console.log(`Processing data for job ${jobToProcess.id} (${jobToProcess.profile_username}), dataset: ${jobToProcess.apify_dataset_id}, type: ${jobToProcess.job_type}`);

        let currentJobState = jobToProcess;
        // Mudar status para PROCESSING_DATA
        const processingUpdate = await get().updateJobInSupabase(jobToProcess.id, { status: 'PROCESSING_DATA' as ScrapingJobStatus });
        if (processingUpdate) {
            currentJobState = processingUpdate;
            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.map(j => j.id === jobToProcess.id ? currentJobState : j).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }));
        } else {
            console.error(`Failed to update job ${jobToProcess.id} to PROCESSING_DATA. Aborting processing.`);
            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.map(j =>
                    j.id === jobToProcess.id ? { ...j, error_message: 'Failed to set status to PROCESSING_DATA' } : j
                ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }));
            return;
        }

        try {
            let result;

            // Processar baseado no tipo do job (com fallback para job_details)
            const jobType = currentJobState.job_type || currentJobState.job_details?.jobType;

            console.log('=== DEBUG JOB TYPE ===');
            console.log('currentJobState.job_type:', currentJobState.job_type);
            console.log('currentJobState.job_details?.jobType:', currentJobState.job_details?.jobType);
            console.log('jobType final:', jobType);
            console.log('job_details completos:', currentJobState.job_details);
            console.log('apify_run_id:', currentJobState.apify_run_id);

            // Lógica adicional: Se não temos job_type definido, tenta detectar baseado no apify_run_id
            let finalJobType = jobType;
            if (!finalJobType && currentJobState.job_details?.profileJobRunId === currentJobState.apify_run_id) {
                finalJobType = 'profile_data';
                console.log('✅ Detectado job de profile_data baseado no profileJobRunId');
            } else if (!finalJobType && currentJobState.job_details?.postsJobRunId === currentJobState.apify_run_id) {
                finalJobType = 'posts';
                console.log('✅ Detectado job de posts baseado no postsJobRunId');
            }

            console.log('finalJobType (após detecção):', finalJobType);

            if (finalJobType === 'profile_data') {
                console.log('=== PROCESSANDO JOB DE DADOS DO PERFIL ===');
                result = await fetchProfileData(currentJobState.apify_dataset_id!, currentJobState.profile_username);

                if (result.success && result.profileData) {
                    console.log('✅ Dados do perfil processados com sucesso');
                    console.log('Profile Data:', result.profileData);

                    try {
                        // Usar a nova função especializada para salvar apenas dados do perfil
                        const profileResult = await saveProfileDataOnly(result.profileData, currentJobState.profile_username);

                        if (profileResult.success) {
                            console.log('✅ Perfil salvo com sucesso:', profileResult.profile);

                            // Aplicar proxy para imagens do Instagram para evitar CORS
                            if (profileResult.profile.profile_pic_url && (profileResult.profile.profile_pic_url.includes('cdninstagram') || profileResult.profile.profile_pic_url.includes('fbcdn.net'))) {
                                try {
                                    const proxyUrl = `/api/instagram-proxy?url=${encodeURIComponent(profileResult.profile.profile_pic_url)}`;
                                    console.log('✅ URL da imagem de perfil convertida para proxy:', proxyUrl);

                                    // Atualizar o perfil com a URL do proxy
                                    const { error: updateError } = await supabase
                                        .from('instagram_profiles')
                                        .update({ profile_pic_url: proxyUrl })
                                        .eq('id', profileResult.profile.id);

                                    if (!updateError) {
                                        profileResult.profile.profile_pic_url = proxyUrl;
                                    }
                                } catch (proxyError) {
                                    console.warn('Erro ao aplicar proxy à imagem de perfil:', proxyError);
                                }
                            }

                            // Salvar referência do perfil criado no job para que jobs filhos possam usar
                            try {
                                await supabase
                                    .from('scraping_jobs')
                                    .update({
                                        job_details: {
                                            ...currentJobState.job_details,
                                            created_profile_id: profileResult.profile.id
                                        }
                                    })
                                    .eq('id', currentJobState.id);

                                console.log('✅ Profile ID salvo no job para referência dos jobs filhos');
                            } catch (updateJobError) {
                                console.warn('Erro ao salvar profile ID no job:', updateJobError);
                            }
                        } else {
                            console.error('❌ Erro ao salvar perfil:', profileResult.error);
                        }
                    } catch (profileError) {
                        console.error('❌ Erro no processamento do perfil:', profileError);
                    }
                }
            } else if (finalJobType === 'posts') {
                console.log('=== PROCESSANDO JOB DE POSTS ===');

                // Verificar se temos o perfil do job pai
                let profileForPosts = null;

                // Primeiro, tentar encontrar o job pai (profile_data)
                if (currentJobState.parent_job_id) {
                    console.log(`Procurando job pai com ID: ${currentJobState.parent_job_id}`);

                    const { data: parentJob, error: parentError } = await supabase
                        .from('scraping_jobs')
                        .select('*')
                        .eq('id', currentJobState.parent_job_id)
                        .single();

                    if (!parentError && parentJob) {
                        console.log('✅ Job pai encontrado:', parentJob);

                        // Tentar pegar o profile_id do job_details do job pai
                        const profileIdFromParent = parentJob.job_details?.created_profile_id;

                        if (profileIdFromParent) {
                            console.log(`Profile ID encontrado no job pai: ${profileIdFromParent}`);

                            // Buscar o perfil usando o ID direto
                            const { data: profileFromParent } = await supabase
                                .from('instagram_profiles')
                                .select('*')
                                .eq('id', profileIdFromParent)
                                .single();

                            if (profileFromParent) {
                                profileForPosts = profileFromParent;
                                console.log('✅ Usando perfil do job pai (via ID):', profileForPosts);
                            }
                        } else {
                            // Fallback: buscar por username como antes
                            const { data: profileFromParent } = await supabase
                                .from('instagram_profiles')
                                .select('*')
                                .eq('username', currentJobState.profile_username)
                                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                                .single();

                            if (profileFromParent) {
                                profileForPosts = profileFromParent;
                                console.log('✅ Usando perfil do job pai (via username):', profileForPosts);
                            }
                        }
                    } else {
                        console.warn('❌ Não foi possível encontrar o job pai');
                    }
                }

                // Se não encontrou o perfil do job pai, tentar buscar perfil existente
                if (!profileForPosts) {
                    console.log('Tentando encontrar perfil existente para processar posts...');
                    const { data: existingProfile } = await supabase
                        .from('instagram_profiles')
                        .select('*')
                        .eq('username', currentJobState.profile_username)
                        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                        .single();

                    if (existingProfile) {
                        profileForPosts = existingProfile;
                        console.log('✅ Perfil existente encontrado:', profileForPosts);
                    }
                }

                if (profileForPosts) {
                    // Processar apenas os posts usando o perfil existente
                    result = await fetchPostsOnly(currentJobState.apify_dataset_id!, currentJobState.profile_username, profileForPosts);
                } else {
                    console.error('❌ Não foi possível encontrar perfil para associar os posts');
                    result = {
                        success: false,
                        error: 'Perfil não encontrado para associar os posts',
                        message: 'Job de posts não pode ser processado sem um perfil associado'
                    };
                }
            } else {
                // Fallback para jobs antigos sem job_type
                console.log('=== PROCESSANDO JOB LEGADO (SEM TIPO) ===');
                console.log('⚠️ Não foi possível determinar o tipo do job. Tentando como posts...');
                result = await fetchScrapingResults(currentJobState.apify_dataset_id!, currentJobState.profile_username);
            }

            console.log(`Successfully processed Apify data for job ${currentJobState.id} (${currentJobState.profile_username})`);

            const completedUpdate = await get().updateJobInSupabase(currentJobState.id, { status: 'COMPLETED' as ScrapingJobStatus, error_message: null });
            let finalJobState = completedUpdate || { ...currentJobState, status: 'COMPLETED' as ScrapingJobStatus, error_message: null };

            await get().fetchProfiles(); // Atualizar lista de perfis gerais
            const { currentProfile, fetchPosts: fetchPostsForStore } = get();
            if (currentProfile && currentProfile.username === finalJobState.profile_username) {
                await fetchPostsForStore(currentProfile.id); // Atualizar posts do perfil atual se for o caso
            }

            // Remover o job da lista de ativos e atualizar o estado
            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.filter(j => j.id !== finalJobState.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
                error: null, // Limpar erro global se o processamento foi bem sucedido
            }));

        } catch (error: any) {
            console.error(`Error processing scraping results for job ${currentJobState.id}:`, error);
            const failedProcessingUpdate = await get().updateJobInSupabase(currentJobState.id, {
                status: 'FAILED_PROCESSING' as ScrapingJobStatus,
                error_message: error.message || 'Unknown error during data processing.'
            });
            if (failedProcessingUpdate) {
                set(state => ({
                    activeScrapingJobs: state.activeScrapingJobs.map(j => j.id === currentJobState.id ? failedProcessingUpdate : j).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                }));
            } else {
                set(state => ({
                    activeScrapingJobs: state.activeScrapingJobs.map(j =>
                        j.id === currentJobState.id ? { ...j, status: 'FAILED_PROCESSING' as ScrapingJobStatus, error_message: error.message || 'Unknown error during data processing.' } : j
                    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                }));
            }
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
                // Esta parte depende da sua função RPC 'admin_delete_profile'
                // const { error: rpcError } = await supabase.rpc('admin_delete_profile', { profile_id_to_delete: profileId });
                // if (rpcError) throw rpcError;
                // deleteSuccess = true; 
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

// Não se esqueça de chamar get().fetchUserJobs() em algum lugar quando seu app/componente principal for montado,
// por exemplo, no useEffect do seu componente InstagramAnalytics.tsx:
// useEffect(() => {
//   fetchUserJobs();
//   // ... outro código de fetchProfiles etc ...
// }, [fetchUserJobs]);


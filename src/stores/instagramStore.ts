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

interface InstagramState {
    profiles: InstagramProfile[];
    currentProfile: InstagramProfile | null;
    posts: InstagramPost[];
    activeScrapingJobs: ScrapingJob[];
    isLoading: boolean;
    error: string | null;
    fetchProfiles: () => Promise<void>;
    scrapeProfile: (username: string) => Promise<void>;
    setCurrentProfile: (profile: InstagramProfile) => void;
    fetchPosts: (profileId: string) => Promise<void>;
    checkActiveScrapingJobs: () => Promise<void>;
    processFinishedScrapingJob: (job: ScrapingJob) => Promise<void>;
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

            // Map database fields to store fields
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

    scrapeProfile: async (username) => {
        set({ isLoading: true, error: null });
        try {
            // Start the scraping process
            const result = await scrapeInstagramProfile(username);

            // Add the job to active scraping jobs
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

            // Start checking status (poll every 15 seconds initially)
            setTimeout(() => get().checkActiveScrapingJobs(), 15000);

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

            // Map database fields to store fields
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
            // Check each running job
            const updatedJobs = [...activeScrapingJobs];
            let anyRunning = false;

            for (let i = 0; i < updatedJobs.length; i++) {
                const job = updatedJobs[i];

                if (job.status === 'running') {
                    try {
                        console.log(`Checking status for job ${job.runId} (${job.profileUsername})`);
                        const status = await checkScrapingStatus(job.runId);
                        console.log(`Current status: ${status.status}, Dataset ID: ${status.defaultDatasetId || 'Not available yet'}`);

                        // Normalize status comparison to handle response variations
                        const normalizedStatus = status.status?.toUpperCase();

                        // Even if still running, save the dataset ID if available
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

                            // Process this job to fetch results
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
                            // Still running
                            console.log(`Job ${job.runId} is still running with status: ${normalizedStatus}`);
                            anyRunning = true;

                            // If we have dataset ID already, check if it has data
                            if (updatedJobs[i].datasetId) {
                                console.log(`Job is still running, but dataset ID exists: ${updatedJobs[i].datasetId}. Will try to process available data.`);

                                try {
                                    // Try to process available data, even if job is still running
                                    await get().processFinishedScrapingJob({
                                        ...updatedJobs[i],
                                        status: 'succeeded'  // Temporarily mark as succeeded for processing
                                    });

                                    // After processing, mark job as completed
                                    updatedJobs[i] = {
                                        ...updatedJobs[i],
                                        status: 'succeeded',
                                        finishedAt: new Date().toISOString()
                                    };
                                    anyRunning = false;
                                } catch (error: any) {
                                    console.log(`Tried to process partial data but failed: ${error.message}. Will continue waiting.`);
                                    // Keep the job as running if processing fails
                                }
                            }
                        } else {
                            // Unknown status
                            console.log(`Job ${job.runId} has unknown status: ${normalizedStatus}`);
                            anyRunning = true;
                        }
                    } catch (error: any) {
                        // Error checking status, mark as failed
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

            // Update store with new job statuses
            set({ activeScrapingJobs: updatedJobs });

            // If any jobs are still running, check again in 15 seconds
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
            // Set temporary loading state
            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.map(j =>
                    j.runId === job.runId ? { ...j, status: 'running', error: 'Processing data...' } : j
                )
            }));

            // Fetch and save the results
            const result = await fetchScrapingResults(job.datasetId);
            console.log(`Successfully processed job for ${job.profileUsername}`);

            // Update profiles after fetching results
            await get().fetchProfiles();

            // If we have a current profile and no posts, and this job was for that profile,
            // load the posts for it
            const { currentProfile } = get();
            if (currentProfile && currentProfile.username === job.profileUsername) {
                await get().fetchPosts(currentProfile.id);
            }

            // Remove this job from active jobs
            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.filter(j => j.runId !== job.runId)
            }));

            // Show success message
            set({ error: null });
        } catch (error: any) {
            console.error('Error processing scraping results:', error);

            // Mark job as failed
            set(state => ({
                activeScrapingJobs: state.activeScrapingJobs.map(j =>
                    j.runId === job.runId
                        ? { ...j, status: 'failed', error: error.message }
                        : j
                )
            }));
        }
    }
})); 
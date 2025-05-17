import React, { useState, useEffect } from 'react';
import { Instagram, Search, Loader, RefreshCw, Check, AlertCircle, Clock, Info } from 'lucide-react';
import { useInstagramStore } from '../stores/instagramStore';
import InstagramProfile from '../components/InstagramProfile';
import InstagramPosts from '../components/InstagramPosts';

// Define interface for store profile to component props mapping
interface ProfileProps {
    id: string;
    instagram_id: string;
    username: string;
    full_name: string;
    biography: string;
    followers_count: number;
    follows_count: number;
    posts_count: number;
    profile_pic_url: string;
    is_business_account: boolean;
    business_category_name?: string;
    created_at: string;
}

interface PostProps {
    id: string;
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
}

export default function InstagramAnalytics() {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

    const {
        profiles,
        currentProfile,
        posts,
        activeScrapingJobs,
        isLoading,
        error: storeError,
        fetchProfiles,
        scrapeProfile,
        setCurrentProfile,
        fetchPosts,
        checkActiveScrapingJobs
    } = useInstagramStore();

    useEffect(() => {
        fetchProfiles();
        // Check for active jobs on load
        checkActiveScrapingJobs();
    }, [fetchProfiles, checkActiveScrapingJobs]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) return;

        setLoading(true);
        setError(null);

        try {
            // Try to use the store's scrape function
            await scrapeProfile(username.trim());
            setUsername('');
        } catch (err: any) {
            setError(err.message || 'Error analyzing Instagram profile');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSelect = (profile: any) => {
        setCurrentProfile(profile);
        fetchPosts(profile.id);
    };

    const handleRefreshStatus = async () => {
        setCheckingStatus(true);
        try {
            await checkActiveScrapingJobs();

            // If we have active jobs, show a loading message
            if (activeScrapingJobs.length > 0) {
                // Find the job related to the current profile if any
                const currentProfileJob = currentProfile
                    ? activeScrapingJobs.find(job => job.profileUsername === currentProfile.username)
                    : null;

                if (currentProfileJob && currentProfileJob.status === 'succeeded' && currentProfile) {
                    // If job succeeded and we have a current profile, refresh its posts
                    await fetchPosts(currentProfile.id);
                }
            }
        } catch (error) {
            console.error('Error checking job status:', error);
        } finally {
            setTimeout(() => setCheckingStatus(false), 1000);
        }
    };

    const handleImgError = (id: string) => {
        setImgErrors(prev => ({
            ...prev,
            [id]: true
        }));
    };

    const hasActiveJobs = activeScrapingJobs.length > 0;

    // Get job status icon and color
    const getJobStatusInfo = (status: string) => {
        switch (status) {
            case 'succeeded':
                return { icon: <Check className="h-4 w-4 text-green-600" />, color: 'text-green-600' };
            case 'failed':
                return { icon: <AlertCircle className="h-4 w-4 text-red-600" />, color: 'text-red-600' };
            case 'timeout':
                return { icon: <Clock className="h-4 w-4 text-orange-600" />, color: 'text-orange-600' };
            default:
                return { icon: <Loader className="h-4 w-4 text-blue-600 animate-spin" />, color: 'text-blue-600' };
        }
    };

    // Map store data to component props
    const mapProfileToProps = (profile: any): ProfileProps => {
        return {
            id: profile.id,
            instagram_id: profile.instagram_id,
            username: profile.username,
            full_name: profile.fullName || '',
            biography: profile.biography || '',
            followers_count: profile.followersCount || 0,
            follows_count: profile.followsCount || 0,
            posts_count: profile.postsCount || 0,
            profile_pic_url: profile.profilePicUrl || '',
            is_business_account: profile.isBusinessAccount || false,
            business_category_name: profile.businessCategoryName,
            created_at: profile.createdAt || new Date().toISOString()
        };
    };

    const mapPostsToProps = (posts: any[]): PostProps[] => {
        return posts.map(post => ({
            id: post.id,
            instagram_id: post.instagram_id,
            short_code: post.shortCode || '',
            type: post.type || 'Image',
            url: post.url || '',
            caption: post.caption || '',
            timestamp: post.timestamp || new Date().toISOString(),
            likes_count: post.likesCount || 0,
            comments_count: post.commentsCount || 0,
            video_view_count: post.videoViewCount,
            display_url: post.displayUrl || '',
            is_video: post.isVideo || false
        }));
    };

    return (
        <div className="container mx-auto p-6">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center">
                    <Instagram className="h-8 w-8 mr-2 text-purple-600" />
                    Instagram Analytics
                </h1>
                <p className="text-gray-600">
                    Analyze Instagram profiles and get insights about their content and engagement.
                </p>
            </div>

            <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-6 mb-8">
                <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter Instagram username"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            disabled={loading || isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading || isLoading ? (
                            <>
                                <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                Analyzing...
                            </>
                        ) : (
                            'Analyze Profile'
                        )}
                    </button>
                </form>

                {(error || storeError) && (
                    <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                        {error || storeError}
                    </div>
                )}

                {/* Active scraping jobs status */}
                {hasActiveJobs && (
                    <div className="mt-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <Info className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="ml-3 flex-1">
                                    <h3 className="text-sm font-medium text-blue-800">
                                        Instagram Profile Scraping
                                    </h3>
                                    <div className="mt-2 text-sm text-blue-700">
                                        <ul className="divide-y divide-blue-200">
                                            {activeScrapingJobs.map(job => {
                                                const { icon, color } = getJobStatusInfo(job.status);
                                                return (
                                                    <li key={job.runId} className="py-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center">
                                                                {icon}
                                                                <span className="ml-2">@{job.profileUsername}</span>
                                                            </div>
                                                            <div className={`text-xs ${color}`}>
                                                                {job.status === 'running' ? 'Processing...' :
                                                                    job.status === 'succeeded' ? 'Complete' :
                                                                        job.error || job.status}
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={handleRefreshStatus}
                                            disabled={checkingStatus}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${checkingStatus ? 'animate-spin' : ''}`} />
                                            {checkingStatus ? 'Checking...' : 'Update Status'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {profiles.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                    <div className="text-center py-8 text-gray-500">
                        <Instagram className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p>No profiles analyzed yet.</p>
                        <p className="text-sm">Search for an Instagram username to get started.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-white rounded-lg shadow-md p-6">
                        <div className="text-lg font-semibold text-gray-700 mb-4">Saved Profiles</div>
                        <div className="space-y-3">
                            {profiles.map((profile) => (
                                <div
                                    key={profile.id}
                                    className={`flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${currentProfile?.id === profile.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                                        }`}
                                    onClick={() => handleProfileSelect(profile)}
                                >
                                    {profile.profilePicUrl && !imgErrors[profile.id] ? (
                                        <img
                                            src={profile.profilePicUrl}
                                            alt={profile.username}
                                            className="w-10 h-10 rounded-full mr-3"
                                            onError={() => handleImgError(profile.id)}
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                            <Instagram className="w-5 h-5 text-gray-400" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-medium">@{profile.username}</div>
                                        <div className="text-xs text-gray-500">
                                            {profile.followersCount.toLocaleString()} followers
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        {currentProfile ? (
                            <div className="space-y-6">
                                <InstagramProfile profile={mapProfileToProps(currentProfile)} />
                                <InstagramPosts posts={mapPostsToProps(posts)} />
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md p-6 text-center">
                                <div className="text-center py-8 text-gray-500">
                                    <Instagram className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                                    <p>Select a profile to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
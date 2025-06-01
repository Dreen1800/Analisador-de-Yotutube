import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

// Interface for scraping options
interface ScrapingOptions {
  postsLimit?: number;
  checkInterval?: number; // in milliseconds
  maxTimeout?: number; // in milliseconds
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

// Start scraping process
export async function scrapeInstagramProfile(username: string, options: ScrapingOptions = {}) {
  try {
    const apifyToken = await getApifyKey();
    const {
      postsLimit = 100,
      checkInterval = 5000, // 5 seconds
      maxTimeout = 600000 // 10 minutes
    } = options;

    // Start the scraping run
    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs`,
      {
        directUrls: [`https://www.instagram.com/${username}`],
        resultsType: 'details',
        resultsLimit: postsLimit
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apifyToken}`
        }
      }
    );

    if (!runResponse.data?.data?.id) {
      throw new Error('Failed to start Instagram scraper');
    }

    const runId = runResponse.data.data.id;

    return {
      status: 'started',
      runId,
      message: 'Instagram scraping job started. This may take several minutes to complete.',
      options: {
        checkInterval,
        maxTimeout
      }
    };

  } catch (error: any) {
    console.error('Error scraping Instagram profile:', error);
    throw new Error(error.message || 'Error scraping Instagram profile');
  }
}

// Check scraping job status
export async function checkScrapingStatus(runId: string) {
  try {
    const apifyToken = await getApifyKey();

    const statusResponse = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${apifyToken}`
        }
      }
    );

    if (!statusResponse.data) {
      throw new Error('Failed to get scraping status');
    }

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

// Get scraping results
export async function fetchScrapingResults(datasetId: string) {
  try {
    const apifyToken = await getApifyKey();

    const resultsResponse = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      {
        headers: {
          'Authorization': `Bearer ${apifyToken}`
        }
      }
    );

    if (!resultsResponse.data) {
      throw new Error('Failed to get scraping results');
    }

    if (resultsResponse.data.length === 0) {
      throw new Error('No Instagram profile data received');
    }

    const profileData = resultsResponse.data[0];

    // Get user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Save profile to database
    const { data: profileRecord, error: profileError } = await supabase
      .from('instagram_profiles')
      .upsert({
        user_id: user.id,
        instagram_id: profileData.id,
        username: profileData.username,
        full_name: profileData.fullName || '',
        biography: profileData.biography || '',
        followers_count: profileData.followersCount || 0,
        follows_count: profileData.followsCount || 0,
        posts_count: profileData.postsCount || 0,
        profile_pic_url: profileData.profilePicUrl || '',
        is_business_account: profileData.isBusinessAccount || false,
        business_category_name: profileData.businessCategoryName
      }, { onConflict: 'instagram_id' })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    // Save posts
    if (profileData.latestPosts?.length > 0) {
      // Delete existing posts first
      await supabase
        .from('instagram_posts')
        .delete()
        .eq('profile_id', profileRecord.id);

      // Insert new posts
      const postsToInsert = profileData.latestPosts.map((post: any) => ({
        profile_id: profileRecord.id,
        instagram_id: post.id,
        short_code: post.shortCode,
        type: post.type || 'Image',
        url: post.url || '',
        caption: post.caption || '',
        timestamp: post.timestamp,
        likes_count: post.likesCount || 0,
        comments_count: post.commentsCount || 0,
        video_view_count: post.videoViewCount,
        display_url: post.displayUrl || '',
        is_video: post.type === 'Video',
        hashtags: post.hashtags ? JSON.stringify(post.hashtags) : null,
        mentions: post.mentions ? JSON.stringify(post.mentions) : null,
        product_type: post.productType || null,
        is_comments_disabled: post.isCommentsDisabled || false
      }));

      const { error: postsError } = await supabase
        .from('instagram_posts')
        .insert(postsToInsert);

      if (postsError) {
        throw postsError;
      }
    }

    return {
      success: true,
      profile: profileRecord,
      postCount: profileData.latestPosts?.length || 0
    };

  } catch (error: any) {
    console.error('Error fetching scraping results:', error);
    return {
      success: false,
      error: error.message || 'Error fetching scraping results'
    };
  }
}
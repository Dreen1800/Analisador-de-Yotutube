import axios from 'axios';
import { useApiKeyStore } from '../stores/apiKeyStore';

// YouTube API response types
interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string; channelId?: string };
    snippet: {
      title: string;
      publishedAt: string;
      thumbnails: {
        default?: { url: string };
        high?: { url: string };
      };
      customUrl?: string;
    };
  }>;
  nextPageToken?: string;
}

interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl?: string;
      thumbnails: {
        high: { url: string };
      };
    };
    statistics: {
      subscriberCount: string;
      videoCount: string;
      viewCount: string;
    };
  }>;
}

interface YouTubeVideoResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      publishedAt: string;
      description?: string;
      thumbnails: {
        default?: { url: string };
        high?: { url: string };
      };
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    contentDetails?: {
      duration?: string;
    };
  }>;
}

interface AnalysisOptions {
  maxVideos: number;
  sortBy: 'date' | 'views' | 'engagement';
  includeShorts: boolean;
  dateFilter?: {
    publishedAfter?: string; // ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
    publishedBefore?: string; // ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
  };
}

// Helper function to extract channel ID from URL
export const extractChannelId = async (url: string, apiKey: string) => {
  if (!url) {
    throw new Error('Please provide a YouTube channel URL');
  }

  if (!apiKey) {
    throw new Error('API key is required. Please add a valid YouTube API key.');
  }

  // Clean and normalize the URL
  const cleanUrl = url.trim().toLowerCase();

  // Extract handle or identifier using more robust patterns
  const patterns = {
    channel: /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i,
    custom: /youtube\.com\/c\/([^\/\s?&]+)/i,
    handle: /youtube\.com\/@([^\/\s?&]+)/i,
    user: /youtube\.com\/user\/([^\/\s?&]+)/i,
    handleOnly: /@([^\/\s?&]+)/i
  };

  // Try to match each pattern
  let identifier = null;
  let type = null;

  // Check for direct channel ID first
  const channelMatch = cleanUrl.match(patterns.channel);
  if (channelMatch) {
    return decodeURIComponent(channelMatch[1]);
  }

  // Check other patterns
  if (cleanUrl.match(patterns.custom)) {
    identifier = cleanUrl.match(patterns.custom)![1];
    type = 'custom';
  } else if (cleanUrl.match(patterns.handle)) {
    identifier = cleanUrl.match(patterns.handle)![1];
    type = 'handle';
  } else if (cleanUrl.match(patterns.user)) {
    identifier = cleanUrl.match(patterns.user)![1];
    type = 'user';
  } else if (cleanUrl.match(patterns.handleOnly)) {
    identifier = cleanUrl.match(patterns.handleOnly)![1];
    type = 'handle';
  }

  if (!identifier) {
    throw new Error('Invalid YouTube channel URL. Please use a valid channel URL, custom URL, or handle.');
  }

  // Decode the identifier to handle special characters
  identifier = decodeURIComponent(identifier);

  // Use different strategies based on the URL type
  return resolveChannelId(identifier, type, apiKey);
};

// Resolve channel ID using multiple strategies
const resolveChannelId = async (identifier: string, type: string | null, apiKey: string): Promise<string> => {
  if (!apiKey) {
    throw new Error('API key is required. Please add a valid YouTube API key.');
  }

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  try {
    // Strategy 1: Try direct channel lookup first if it's a user
    if (type === 'user') {
      const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        headers,
        params: {
          part: 'id',
          forUsername: identifier,
          key: apiKey
        }
      });

      if (channelResponse.data.items?.length > 0) {
        return channelResponse.data.items[0].id;
      }
    }

    // Strategy 2: Search for the channel by handle or custom URL
    if (type === 'handle' || type === 'custom') {
      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        headers,
        params: {
          part: 'snippet',
          q: type === 'handle' ? `@${identifier}` : identifier,
          type: 'channel',
          maxResults: 1,
          key: apiKey
        }
      });

      if (searchResponse.data.items?.length > 0) {
        const channelId = searchResponse.data.items[0].id.channelId;

        // Verify the channel exists and matches the handle/custom URL
        const verifyResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
          headers,
          params: {
            part: 'snippet',
            id: channelId,
            key: apiKey
          }
        });

        if (verifyResponse.data.items?.length > 0) {
          const channel = verifyResponse.data.items[0];
          const customUrl = channel.snippet?.customUrl?.toLowerCase();
          const title = channel.snippet?.title?.toLowerCase();

          // Check for exact match with handle or custom URL
          if (type === 'handle') {
            if (customUrl === identifier.toLowerCase() ||
              customUrl === `@${identifier.toLowerCase()}`) {
              return channelId;
            }
          } else {
            if (customUrl === identifier.toLowerCase()) {
              return channelId;
            }
          }
        }
      }
    }

    // Strategy 3: Fallback to channel search with exact matching
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      headers,
      params: {
        part: 'snippet',
        q: identifier,
        type: 'channel',
        maxResults: 5, // Get more results to find exact match
        key: apiKey
      }
    });

    if (searchResponse.data.items?.length > 0) {
      // Check each result for exact match
      for (const item of searchResponse.data.items) {
        const channelId = item.id.channelId;
        const verifyResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
          headers,
          params: {
            part: 'snippet',
            id: channelId,
            key: apiKey
          }
        });

        if (verifyResponse.data.items?.length > 0) {
          const channel = verifyResponse.data.items[0];
          const customUrl = channel.snippet?.customUrl?.toLowerCase();
          const title = channel.snippet?.title?.toLowerCase();

          // Check for exact matches
          if (customUrl === identifier.toLowerCase() ||
            customUrl === `@${identifier.toLowerCase()}` ||
            title === identifier.toLowerCase()) {
            return channelId;
          }
        }
      }
    }

    throw new Error('Channel not found. Please verify the URL and try again.');
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('API key quota exceeded or invalid. Please check your YouTube API key.');
    }
    if (error.response?.status === 400) {
      throw new Error('Invalid API key. Please check your YouTube API key.');
    }
    console.error('Error resolving channel ID:', error);
    throw new Error(
      error.message || 'Failed to resolve channel ID. Please verify the URL and try again.'
    );
  }
};

// Get channel information
export const getChannelInfo = async (channelId: string, apiKey: string) => {
  if (!apiKey) {
    throw new Error('API key is required. Please add a valid YouTube API key.');
  }

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get<YouTubeChannelResponse>('https://www.googleapis.com/youtube/v3/channels', {
      headers,
      params: {
        part: 'snippet,statistics',
        id: channelId,
        key: apiKey
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Channel not found');
    }

    const channel = response.data.items[0];
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail_url: channel.snippet.thumbnails.high.url,
      subscriber_count: parseInt(channel.statistics.subscriberCount),
      video_count: parseInt(channel.statistics.videoCount),
      view_count: parseInt(channel.statistics.viewCount)
    };
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('API key quota exceeded or invalid. Please check your YouTube API key.');
    }
    if (error.response?.status === 400) {
      throw new Error('Invalid API key. Please check your YouTube API key.');
    }
    console.error('Error fetching channel info:', error);
    throw new Error('Failed to fetch channel information');
  }
};

// Get top videos from a channel
export const getChannelTopVideos = async (channelId: string, apiKey: string, options: AnalysisOptions) => {
  if (!apiKey) {
    throw new Error('API key is required. Please add a valid YouTube API key.');
  }

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  try {
    const allVideos = [];
    let nextPageToken = undefined;
    let totalVideos = 0;

    // Make multiple requests to get more videos (pagination)
    while (totalVideos < options.maxVideos) {
      const response: { data: YouTubeSearchResponse } = await axios.get<YouTubeSearchResponse>('https://www.googleapis.com/youtube/v3/search', {
        headers,
        params: {
          part: 'snippet',
          channelId: channelId,
          maxResults: Math.min(50, options.maxVideos - totalVideos),
          order: options.sortBy === 'date' ? 'date' : 'viewCount',
          type: 'video',
          pageToken: nextPageToken,
          key: apiKey,
          videoDuration: options.includeShorts ? undefined : 'long', // Filter out shorts if not included
          publishedAfter: options.dateFilter?.publishedAfter,
          publishedBefore: options.dateFilter?.publishedBefore
        }
      });

      for (const item of response.data.items) {
        allVideos.push({
          video_id: item.id.videoId,
          title: item.snippet.title,
          published_at: item.snippet.publishedAt,
          thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
        });
        totalVideos++;
      }

      nextPageToken = response.data.nextPageToken;
      if (!nextPageToken || totalVideos >= options.maxVideos) break;
    }

    return allVideos;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('API key quota exceeded or invalid. Please check your YouTube API key.');
    }
    if (error.response?.status === 400) {
      throw new Error('Invalid API key. Please check your YouTube API key.');
    }
    console.error('Error fetching channel videos:', error);
    throw new Error('Failed to fetch channel videos');
  }
};

// Get detailed metrics for videos
export const getVideoDetails = async (videoIds: string[], apiKey: string, options: AnalysisOptions) => {
  if (!apiKey) {
    throw new Error('API key is required. Please add a valid YouTube API key.');
  }

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  try {
    const allMetrics = [];

    // Process in batches of 50 (API limit)
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);

      const response = await axios.get<YouTubeVideoResponse>('https://www.googleapis.com/youtube/v3/videos', {
        headers,
        params: {
          part: 'statistics,contentDetails,snippet',
          id: batch.join(','),
          key: apiKey
        }
      });

      for (const item of response.data.items) {
        // Extract and process duration
        const duration = item.contentDetails?.duration || '';
        const durationSeconds = parseDuration(duration);
        const durationFormatted = formatDuration(durationSeconds);

        // Calculate basic metrics
        const viewCount = parseInt(item.statistics?.viewCount || '0');
        const likeCount = parseInt(item.statistics?.likeCount || '0');
        const commentCount = parseInt(item.statistics?.commentCount || '0');

        // Calculate engagement rate
        let engagementRate = 0;
        if (viewCount > 0) {
          engagementRate = (likeCount + commentCount) / viewCount;
        }

        // Calculate views per day
        const pubDateStr = item.snippet?.publishedAt || '';
        let viewsPerDay = 0;

        if (pubDateStr) {
          try {
            const pubDate = new Date(pubDateStr);
            const now = new Date();
            const daysSincePub = Math.max(1, Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24)));
            viewsPerDay = viewCount / daysSincePub;
          } catch (e) {
            console.error('Error calculating views per day:', e);
          }
        }

        allMetrics.push({
          video_id: item.id,
          title: item.snippet.title,
          view_count: viewCount,
          like_count: likeCount,
          comment_count: commentCount,
          engagement_rate: engagementRate,
          views_per_day: viewsPerDay,
          duration_seconds: durationSeconds,
          duration_formatted: durationFormatted,
          published_at: pubDateStr,
          description: item.snippet?.description || '',
          thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
        });
      }
    }

    // Sort based on options
    return allMetrics.sort((a, b) => {
      if (options.sortBy === 'date') {
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      } else if (options.sortBy === 'engagement') {
        return b.engagement_rate - a.engagement_rate;
      } else {
        return b.view_count - a.view_count;
      }
    });
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('API key quota exceeded or invalid. Please check your YouTube API key.');
    }
    if (error.response?.status === 400) {
      throw new Error('Invalid API key. Please check your YouTube API key.');
    }
    console.error('Error fetching video details:', error);
    throw new Error('Failed to fetch video details');
  }
};

// Helper function to parse ISO 8601 duration to seconds
export const parseDuration = (durationStr: string): number => {
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
};

// Helper function to format seconds to readable duration
export const formatDuration = (seconds: number): string => {
  if (seconds === 0) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else {
    return `${minutes}m ${remainingSeconds}s`;
  }
};

// Helper functions for date filtering
export const createDateFilter = {
  // Filter videos from the last N days
  lastDays: (days: number) => {
    const now = new Date();
    const publishedAfter = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return {
      publishedAfter: publishedAfter.toISOString()
    };
  },

  // Filter videos from the last N months
  lastMonths: (months: number) => {
    const now = new Date();
    const publishedAfter = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    return {
      publishedAfter: publishedAfter.toISOString()
    };
  },

  // Filter videos from the last N years
  lastYears: (years: number) => {
    const now = new Date();
    const publishedAfter = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
    return {
      publishedAfter: publishedAfter.toISOString()
    };
  },

  // Filter videos between two specific dates
  between: (startDate: Date, endDate: Date) => {
    return {
      publishedAfter: startDate.toISOString(),
      publishedBefore: endDate.toISOString()
    };
  },

  // Filter videos published after a specific date
  after: (date: Date) => {
    return {
      publishedAfter: date.toISOString()
    };
  },

  // Filter videos published before a specific date
  before: (date: Date) => {
    return {
      publishedBefore: date.toISOString()
    };
  },

  // Predefined common filters
  thisYear: () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return {
      publishedAfter: startOfYear.toISOString()
    };
  },

  thisMonth: () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      publishedAfter: startOfMonth.toISOString()
    };
  },

  thisWeek: () => {
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
    startOfWeek.setHours(0, 0, 0, 0);
    return {
      publishedAfter: startOfWeek.toISOString()
    };
  }
};

// Main function to fetch channel data with all metrics
export const fetchChannelData = async (channelUrl: string, options: AnalysisOptions) => {
  // Get API key from store
  const apiKey = useApiKeyStore.getState().currentKey?.key;

  if (!apiKey) {
    throw new Error('No YouTube API key available. Please add an API key in the API Keys section.');
  }

  try {
    // Extract channel ID using the improved method
    const channelId = await extractChannelId(channelUrl, apiKey);

    // Get channel info
    const channelInfo = await getChannelInfo(channelId, apiKey);

    // Get top videos with options
    const videos = await getChannelTopVideos(channelId, apiKey, options);

    // Get detailed metrics for videos
    const videoIds = videos.map(video => video.video_id);
    const videoDetails = await getVideoDetails(videoIds, apiKey, options);

    // Update API key usage count
    const currentKey = useApiKeyStore.getState().currentKey;
    if (currentKey) {
      useApiKeyStore.getState().updateApiKey(currentKey.id, {
        usage_count: currentKey.usage_count + 1
      });
    }

    return {
      channelInfo,
      videos: videoDetails
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to analyze channel. Please verify the URL and try again.');
  }
};

// Function to generate CSV export
export const generateCSV = (videos: any[]): string => {
  if (!videos || videos.length === 0) {
    return '';
  }

  // Define headers
  const headers = [
    'Title', 'Video ID', 'Published At', 'Views', 'Likes',
    'Comments', 'Engagement Rate', 'Views Per Day', 'Duration'
  ];

  // Create CSV content
  let csv = headers.join(',') + '\n';

  videos.forEach(video => {
    const row = [
      `"${video.title.replace(/"/g, '""')}"`,
      video.video_id,
      video.published_at,
      video.view_count,
      video.like_count,
      video.comment_count,
      video.engagement_rate.toFixed(4),
      Math.round(video.views_per_day),
      video.duration_formatted
    ];
    csv += row.join(',') + '\n';
  });

  return csv;
};

// Function to generate JSON export
export const generateJSON = (videos: any[]): string => {
  return JSON.stringify(videos, null, 2);
};
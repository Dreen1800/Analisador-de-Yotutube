import axios from 'axios';
import { useApiKeyStore } from '../stores/apiKeyStore';
import { supabase } from '../lib/supabaseClient';

interface AnalysisOptions {
  maxVideos: number;
  sortBy: 'date' | 'views' | 'engagement';
  includeShorts: boolean;
}

// Interface para dados do canal
interface ChannelData {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  uploads_playlist_id: string;
}

// Interface para dados básicos do vídeo
interface BasicVideoData {
  videoId: string;
  title: string;
  publishedAt: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
}

// Interface para detalhes completos do vídeo
interface VideoDetails {
  video_id: string;
  title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  engagement_rate: number;
  views_per_day: number;
  duration_seconds: number;
  duration_formatted: string;
  published_at: string;
  description: string;
  thumbnail_url: string;
  is_short: boolean;
  video_url: string;
}

// Get YouTube API key from Supabase
const getYouTubeApiKey = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('No active YouTube API key found');

    return data.key;
  } catch (error: any) {
    console.error('Error fetching YouTube API key:', error);
    throw new Error('Failed to retrieve YouTube API key. Please add a YouTube API key in your settings.');
  }
};

// Passo 1: Extrair ID ou Handle do canal da URL
export const extractChannelIdentifier = (channelUrl: string): { identifier: string; pattern: string } => {
  if (!channelUrl) {
    throw new Error('Please provide a YouTube channel URL');
  }

  const url = channelUrl.trim();
  const regexes = [
    { pattern: 'youtube\\.com\\/channel\\/([^\\/\\s]+)', name: 'channel' },
    { pattern: 'youtube\\.com\\/c\\/([^\\/\\s]+)', name: 'custom' },
    { pattern: 'youtube\\.com\\/user\\/([^\\/\\s]+)', name: 'user' },
    { pattern: 'youtube\\.com\\/@([^\\/\\s]+)', name: 'handle' }
  ];

  for (const regex of regexes) {
    const match = url.match(new RegExp(regex.pattern));
    if (match) {
      return { identifier: match[1], pattern: regex.name };
    }
  }

  throw new Error('Invalid YouTube channel URL format');
};

// Passo 2: Resolver ID do canal (caso seja handle/custom URL)
export const resolveChannelId = async (identifier: string, pattern: string): Promise<string> => {
  const apiKey = await getYouTubeApiKey();

  // Se já é um channel ID direto, retornar
  if (pattern === 'channel') {
    return identifier;
  }

  try {
    // Buscar o canal usando Search API
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: identifier,
        type: 'channel',
        maxResults: 1,
        key: apiKey
      }
    });

    const items = searchResponse.data.items || [];
    if (items.length > 0) {
      return items[0].id.channelId;
    }

    throw new Error('Channel ID not resolved');
  } catch (error: any) {
    console.error('Error resolving channel ID:', error);
    throw new Error('Failed to resolve channel ID. Please verify the URL and try again.');
  }
};

// Passo 3: Obter informações do canal e playlist de uploads
export const getChannelInfo = async (channelId: string): Promise<ChannelData> => {
  const apiKey = await getYouTubeApiKey();

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: channelId,
        key: apiKey
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Channel not found');
    }

    const channel = response.data.items[0];
    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

    if (!uploadsPlaylistId) {
      throw new Error('Uploads playlist not found');
    }

    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description || '',
      thumbnail_url: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
      subscriber_count: parseInt(channel.statistics.subscriberCount || '0'),
      video_count: parseInt(channel.statistics.videoCount || '0'),
      view_count: parseInt(channel.statistics.viewCount || '0'),
      uploads_playlist_id: uploadsPlaylistId
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

// Passo 4: Buscar vídeos da playlist com paginação
export const fetchPlaylistVideos = async (
  uploadsPlaylistId: string,
  maxVideos: number = 50
): Promise<BasicVideoData[]> => {
  const apiKey = await getYouTubeApiKey();
  const allVideos: BasicVideoData[] = [];
  let pageToken: string | null = null;
  let totalFetched = 0;

  try {
    while (totalFetched < maxVideos) {
      const params: any = {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: Math.min(50, maxVideos - totalFetched),
        key: apiKey
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params
      });

      const items = response.data.items || [];

      const currentPageVideos = items.map((item: any) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        description: item.snippet.description || '',
        thumbnail: item.snippet?.thumbnails?.high?.url || '',
        channelTitle: item.snippet.channelTitle
      }));

      allVideos.push(...currentPageVideos);
      totalFetched += currentPageVideos.length;

      pageToken = response.data.nextPageToken;
      if (!pageToken || totalFetched >= maxVideos) break;
    }

    return allVideos;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('API key quota exceeded or invalid. Please check your YouTube API key.');
    }
    if (error.response?.status === 400) {
      throw new Error('Invalid API key. Please check your YouTube API key.');
    }
    console.error('Error fetching playlist videos:', error);
    throw new Error('Failed to fetch playlist videos');
  }
};

// Passo 5: Obter detalhes completos dos vídeos
export const getVideoDetails = async (
  videoIds: string[],
  options: AnalysisOptions
): Promise<VideoDetails[]> => {
  const apiKey = await getYouTubeApiKey();
  const allMetrics: VideoDetails[] = [];

  try {
    // Processar em lotes de 50 (limite da API)
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);

      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'statistics,snippet,contentDetails',
          id: batch.join(','),
          key: apiKey
        }
      });

      for (const item of response.data.items) {
        const stats = item.statistics || {};
        const snippet = item.snippet || {};
        const content = item.contentDetails || {};

        const viewCount = parseInt(stats.viewCount || '0');
        const likeCount = parseInt(stats.likeCount || '0');
        const commentCount = parseInt(stats.commentCount || '0');
        const publishedAt = snippet.publishedAt || '';

        // Calcular engagement rate
        let engagementRate = 0;
        if (viewCount > 0) {
          engagementRate = (likeCount + commentCount) / viewCount;
        }

        // Calcular views por dia
        let viewsPerDay = 0;
        if (publishedAt) {
          const publishedDate = new Date(publishedAt);
          const now = new Date();
          const days = Math.max(1, Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)));
          viewsPerDay = viewCount / days;
        }

        // Processar duração
        const durationISO = content.duration || '';
        const durationSeconds = parseDuration(durationISO);
        const durationFormatted = formatDuration(durationSeconds);

        // Verificar se é short (duração <= 60 segundos)
        const isShort = durationSeconds <= 60 && durationSeconds > 0;

        // Filtrar shorts se necessário
        if (!options.includeShorts && isShort) {
          continue;
        }

        allMetrics.push({
          video_id: item.id,
          title: snippet.title,
          view_count: viewCount,
          like_count: likeCount,
          comment_count: commentCount,
          engagement_rate: engagementRate,
          views_per_day: viewsPerDay,
          duration_seconds: durationSeconds,
          duration_formatted: durationFormatted,
          published_at: publishedAt,
          description: snippet.description || '',
          thumbnail_url: snippet?.thumbnails?.high?.url || '',
          is_short: isShort,
          video_url: `https://www.youtube.com/watch?v=${item.id}`
        });
      }
    }

    // Ordenar com base nas opções
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
export const parseDuration = (isoDuration: string): number => {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = isoDuration.match(regex);
  if (!match) return 0;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  return h * 3600 + m * 60 + s;
};

// Helper function to format seconds to readable duration
export const formatDuration = (totalSeconds: number): string => {
  if (!totalSeconds || totalSeconds === 0) return 'N/A';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
};

// FUNÇÃO PRINCIPAL: Coordena todo o processo (seguindo o fluxo n8n)
export const fetchChannelData = async (channelUrl: string, options: AnalysisOptions) => {
  try {
    console.log('=== INICIANDO ANÁLISE DO CANAL (NOVO MÉTODO) ===');
    console.log('URL:', channelUrl);
    console.log('Opções:', options);

    // Passo 1: Extrair identificador da URL
    const { identifier, pattern } = extractChannelIdentifier(channelUrl);
    console.log(`✅ Identificador extraído: ${identifier} (tipo: ${pattern})`);

    // Passo 2: Resolver ID do canal
    const channelId = await resolveChannelId(identifier, pattern);
    console.log(`✅ ID do canal resolvido: ${channelId}`);

    // Passo 3: Obter informações do canal e playlist de uploads
    const channelInfo = await getChannelInfo(channelId);
    console.log(`✅ Informações do canal obtidas: ${channelInfo.title}`);
    console.log(`✅ Playlist de uploads: ${channelInfo.uploads_playlist_id}`);

    // Passo 4: Buscar vídeos da playlist
    const playlistVideos = await fetchPlaylistVideos(
      channelInfo.uploads_playlist_id,
      options.maxVideos
    );
    console.log(`✅ ${playlistVideos.length} vídeos encontrados na playlist`);

    // Passo 5: Obter detalhes completos dos vídeos
    const videoIds = playlistVideos.map(video => video.videoId);
    const videoDetails = await getVideoDetails(videoIds.slice(0, options.maxVideos), options);
    console.log(`✅ Detalhes obtidos para ${videoDetails.length} vídeos`);

    // Update API key usage count
    const currentKey = useApiKeyStore.getState().currentKey;
    if (currentKey) {
      useApiKeyStore.getState().updateApiKey(currentKey.id, {
        usage_count: currentKey.usage_count + 1
      });
    }

    console.log('=== ANÁLISE CONCLUÍDA COM SUCESSO ===');
    return {
      channelInfo: {
        id: channelInfo.id,
        title: channelInfo.title,
        description: channelInfo.description,
        thumbnail_url: channelInfo.thumbnail_url,
        subscriber_count: channelInfo.subscriber_count,
        video_count: channelInfo.video_count,
        view_count: channelInfo.view_count
      },
      videos: videoDetails
    };
  } catch (error: any) {
    console.error('Erro na análise do canal:', error);
    throw new Error(error.message || 'Failed to analyze channel. Please verify the URL and try again.');
  }
};

// COMPATIBILIDADE: Manter funções antigas para não quebrar o código existente
export const extractChannelId = async (url: string, apiKey: string) => {
  const { identifier, pattern } = extractChannelIdentifier(url);
  return resolveChannelId(identifier, pattern);
};

export const getChannelTopVideos = async (channelId: string, apiKey: string, options: AnalysisOptions) => {
  const channelInfo = await getChannelInfo(channelId);
  const playlistVideos = await fetchPlaylistVideos(channelInfo.uploads_playlist_id, options.maxVideos);

  return playlistVideos.map(video => ({
    video_id: video.videoId,
    title: video.title,
    published_at: video.publishedAt,
    thumbnail_url: video.thumbnail
  }));
};

// Function to generate CSV export
export const generateCSV = (videos: any[]): string => {
  if (!videos || videos.length === 0) {
    return '';
  }

  // Define headers
  const headers = [
    'Title', 'Video ID', 'Published At', 'Views', 'Likes',
    'Comments', 'Engagement Rate', 'Views Per Day', 'Duration', 'Is Short', 'Video URL'
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
      video.duration_formatted,
      video.is_short ? 'Yes' : 'No',
      video.video_url
    ];
    csv += row.join(',') + '\n';
  });

  return csv;
};

// Function to generate JSON export
export const generateJSON = (videos: any[]): string => {
  return JSON.stringify(videos, null, 2);
};
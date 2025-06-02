import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { fetchChannelData } from '../services/youtubeService';

interface Channel {
  id: string;
  channel_id: string;
  title: string;
  thumbnail_url: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  created_at: string;
  user_id: string;
  is_main: boolean;
}

interface ChannelAnalysis {
  id: string;
  channel_id: string;
  analysis_date: string;
  videos: VideoDetails[];
}

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
}

interface AnalysisOptions {
  maxVideos: number;
  sortBy: 'date' | 'views' | 'engagement';
  includeShorts: boolean;
}

interface ChannelState {
  channels: Channel[];
  currentChannel: Channel | null;
  currentAnalysis: ChannelAnalysis | null;
  isLoading: boolean;
  error: string | null;
  fetchChannels: () => Promise<void>;
  analyzeChannel: (channelUrl: string, options: AnalysisOptions) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  fetchChannelAnalysis: (channelId: string) => Promise<void>;
  setCurrentChannel: (channel: Channel | null) => void;
  clearCurrentChannel: () => void;
  setMainChannel: (channelId: string) => Promise<void>;
  getMainChannel: () => Promise<Channel | null>;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  currentChannel: null,
  currentAnalysis: null,
  isLoading: false,
  error: null,

  fetchChannels: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ channels: data as Channel[] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  analyzeChannel: async (channelUrl, options) => {
    set({ isLoading: true, error: null });
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Call our backend service to analyze the channel
      const result = await fetchChannelData(channelUrl, options);

      // Check if this is the user's first channel
      const { data: existingChannels, error: countError } = await supabase
        .from('channels')
        .select('channel_id')
        .eq('user_id', user.id);

      if (countError) throw countError;
      const isFirstChannel = existingChannels.length === 0;

      // Save the channel to the database
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .upsert({
          channel_id: result.channelInfo.id,
          title: result.channelInfo.title,
          thumbnail_url: result.channelInfo.thumbnail_url,
          subscriber_count: result.channelInfo.subscriber_count,
          video_count: result.channelInfo.video_count,
          view_count: result.channelInfo.view_count,
          user_id: user.id,
          is_main: isFirstChannel // Set as main if it's the first channel
        }, { onConflict: 'channel_id' })
        .select()
        .single();

      if (channelError) throw channelError;

      // Save the analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from('channel_analyses')
        .insert({
          channel_id: result.channelInfo.id,
          videos: result.videos,
          user_id: user.id
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      set({
        currentChannel: channelData as Channel,
        currentAnalysis: {
          id: analysisData.id,
          channel_id: analysisData.channel_id,
          analysis_date: analysisData.created_at,
          videos: result.videos
        }
      });

      // Add to channels list if not already there
      set(state => {
        const exists = state.channels.some(c => c.channel_id === channelData.channel_id);
        if (!exists) {
          return { channels: [channelData as Channel, ...state.channels] };
        }
        return state;
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteChannel: async (channelId) => {
    set({ isLoading: true, error: null });
    try {
      // Delete analyses first due to foreign key constraint
      const { error: analysesError } = await supabase
        .from('channel_analyses')
        .delete()
        .eq('channel_id', channelId);

      if (analysesError) throw analysesError;

      // Then delete the channel
      const { error: channelError } = await supabase
        .from('channels')
        .delete()
        .eq('channel_id', channelId);

      if (channelError) throw channelError;

      // Update local state
      set(state => ({
        channels: state.channels.filter(c => c.channel_id !== channelId),
        currentChannel: state.currentChannel?.channel_id === channelId ? null : state.currentChannel,
        currentAnalysis: state.currentAnalysis?.channel_id === channelId ? null : state.currentAnalysis
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchChannelAnalysis: async (channelId) => {
    set({ isLoading: true, error: null });
    try {
      // Get the channel first
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (channelError) throw channelError;
      if (!channelData) throw new Error('Channel not found');

      // Get the latest analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from('channel_analyses')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (analysisError) throw analysisError;
      if (!analysisData) throw new Error('No analysis found for this channel');

      if (analysisData) {
        set({
          currentChannel: channelData as Channel,
          currentAnalysis: {
            id: analysisData.id,
            channel_id: analysisData.channel_id,
            analysis_date: analysisData.created_at,
            videos: analysisData.videos
          }
        });
      } else {
        set({
          currentChannel: channelData as Channel,
          currentAnalysis: null
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentChannel: (channel) => {
    set({ currentChannel: channel });
  },

  clearCurrentChannel: () => {
    set({
      currentChannel: null,
      currentAnalysis: null,
      error: null
    });
  },

  setMainChannel: async (channelId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await supabase
        .from('channels')
        .update({ is_main: false })
        .eq('user_id', user.id)
        .eq('is_main', true);

      const { error } = await supabase
        .from('channels')
        .update({ is_main: true })
        .eq('channel_id', channelId);

      if (error) throw error;

      set(state => ({
        channels: state.channels.map(c => ({
          ...c,
          is_main: c.channel_id === channelId
        }))
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  getMainChannel: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('is_main', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as Channel | null;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  }
}));
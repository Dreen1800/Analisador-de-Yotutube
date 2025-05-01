import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  usage_count: number;
  is_active: boolean;
}

interface ApiKeyState {
  apiKeys: ApiKey[];
  currentKey: ApiKey | null;
  isLoading: boolean;
  error: string | null;
  fetchApiKeys: () => Promise<void>;
  addApiKey: (name: string, key: string) => Promise<void>;
  updateApiKey: (id: string, data: Partial<ApiKey>) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  setCurrentKey: (key: ApiKey | null) => void;
}

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  apiKeys: [],
  currentKey: null,
  isLoading: false,
  error: null,
  
  fetchApiKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ apiKeys: data as ApiKey[] });
      
      // Set the first active key as current if none is selected
      const currentKey = get().currentKey;
      if (!currentKey) {
        const activeKey = data.find(key => key.is_active);
        if (activeKey) set({ currentKey: activeKey as ApiKey });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addApiKey: async (name, key) => {
    set({ isLoading: true, error: null });
    try {
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('api_keys')
        .insert([
          { 
            name, 
            key, 
            is_active: true, 
            usage_count: 0,
            user_id: user.id // Set the user_id from the authenticated user
          }
        ])
        .select();
      
      if (error) throw error;
      
      const newKey = data?.[0] as ApiKey;
      set(state => ({ 
        apiKeys: [newKey, ...state.apiKeys],
        currentKey: state.currentKey || newKey
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateApiKey: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('api_keys')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      
      set(state => {
        const updatedKeys = state.apiKeys.map(key => 
          key.id === id ? { ...key, ...data } : key
        );
        
        // Update current key if it was the one modified
        let updatedCurrentKey = state.currentKey;
        if (state.currentKey?.id === id) {
          updatedCurrentKey = { ...state.currentKey, ...data };
        }
        
        return { 
          apiKeys: updatedKeys,
          currentKey: updatedCurrentKey
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteApiKey: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      set(state => {
        const filteredKeys = state.apiKeys.filter(key => key.id !== id);
        
        // If we deleted the current key, set a new one
        let newCurrentKey = state.currentKey;
        if (state.currentKey?.id === id) {
          newCurrentKey = filteredKeys.find(key => key.is_active) || null;
        }
        
        return { 
          apiKeys: filteredKeys,
          currentKey: newCurrentKey
        };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  setCurrentKey: (key) => {
    set({ currentKey: key });
  }
}));
import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface ApifyKey {
    id: string;
    name: string;
    api_key: string;
    created_at: string;
    is_active: boolean;
}

interface ApifyKeyState {
    apifyKeys: ApifyKey[];
    currentKey: ApifyKey | null;
    isLoading: boolean;
    error: string | null;
    fetchApifyKeys: () => Promise<void>;
    addApifyKey: (name: string, key: string) => Promise<void>;
    updateApifyKey: (id: string, updates: Partial<ApifyKey>) => Promise<void>;
    deleteApifyKey: (id: string) => Promise<void>;
    setCurrentKey: (key: ApifyKey | null) => void;
}

export const useApifyKeyStore = create<ApifyKeyState>((set, get) => ({
    apifyKeys: [],
    currentKey: null,
    isLoading: false,
    error: null,

    fetchApifyKeys: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('apify_keys')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            set({ apifyKeys: data as ApifyKey[] });

            // Set the first active key as current if none is selected
            const currentKey = get().currentKey;
            if (!currentKey) {
                const activeKey = data.find(key => key.is_active);
                if (activeKey) set({ currentKey: activeKey as ApifyKey });
            }
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ isLoading: false });
        }
    },

    addApifyKey: async (name, key) => {
        set({ isLoading: true, error: null });
        try {
            // Get the current user's ID
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('apify_keys')
                .insert([
                    {
                        name,
                        api_key: key,
                        is_active: true,
                        user_id: user.id
                    }
                ])
                .select();

            if (error) throw error;

            const newKey = data?.[0] as ApifyKey;
            set(state => ({
                apifyKeys: [newKey, ...state.apifyKeys],
                currentKey: state.currentKey || newKey
            }));
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ isLoading: false });
        }
    },

    updateApifyKey: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase
                .from('apify_keys')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            // If we're updating the active status, update all other keys accordingly
            if (updates.is_active === true) {
                // Set all other keys to inactive
                await supabase
                    .from('apify_keys')
                    .update({ is_active: false })
                    .neq('id', id);

                // Update local state to reflect changes
                set(state => ({
                    apifyKeys: state.apifyKeys.map(key => ({
                        ...key,
                        is_active: key.id === id ? true : false
                    })),
                    currentKey: state.apifyKeys.find(key => key.id === id) || state.currentKey
                }));
            } else {
                // Just update the specific key
                set(state => ({
                    apifyKeys: state.apifyKeys.map(key =>
                        key.id === id ? { ...key, ...updates } : key
                    ),
                    currentKey: state.currentKey?.id === id
                        ? { ...state.currentKey, ...updates }
                        : state.currentKey
                }));
            }
        } catch (error) {
            set({ error: (error as Error).message });
        } finally {
            set({ isLoading: false });
        }
    },

    deleteApifyKey: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await supabase
                .from('apify_keys')
                .delete()
                .eq('id', id);

            if (error) throw error;

            const deletedKeyWasActive = get().apifyKeys.find(key => key.id === id)?.is_active;

            set(state => {
                const updatedKeys = state.apifyKeys.filter(key => key.id !== id);

                // If the deleted key was active and we have other keys, set the first one as active
                if (deletedKeyWasActive && updatedKeys.length > 0) {
                    supabase
                        .from('apify_keys')
                        .update({ is_active: true })
                        .eq('id', updatedKeys[0].id)
                        .then(() => {
                            // This is a side effect, but it ensures we update the DB properly
                        });

                    updatedKeys[0].is_active = true;
                }

                return {
                    apifyKeys: updatedKeys,
                    currentKey: state.currentKey?.id === id
                        ? (updatedKeys.length > 0 ? updatedKeys[0] : null)
                        : state.currentKey
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
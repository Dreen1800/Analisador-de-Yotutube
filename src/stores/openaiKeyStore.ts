import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface OpenAIKey {
    id: string;
    name: string;
    key: string;
    is_active: boolean;
    usage_count: number;
    created_at: string;
}

interface OpenAIKeyStore {
    openaiKeys: OpenAIKey[];
    currentKey: OpenAIKey | null;
    isLoading: boolean;
    error: string | null;

    fetchOpenAIKeys: () => Promise<void>;
    addOpenAIKey: (name: string, key: string) => Promise<void>;
    updateOpenAIKey: (id: string, data: Partial<OpenAIKey>) => Promise<void>;
    deleteOpenAIKey: (id: string) => Promise<void>;
    setCurrentKey: (key: OpenAIKey) => void;
}

export const useOpenAIKeyStore = create<OpenAIKeyStore>((set, get) => ({
    openaiKeys: [],
    currentKey: null,
    isLoading: false,
    error: null,

    fetchOpenAIKeys: async () => {
        set({ isLoading: true, error: null });

        try {
            const { data, error } = await supabase
                .from('openai_keys')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            set({ openaiKeys: data });

            // Define a chave ativa como a chave atual
            const activeKey = data.find(key => key.is_active);
            if (activeKey) {
                set({ currentKey: activeKey });
            } else if (data.length > 0 && !get().currentKey) {
                // Se não houver chave ativa mas existirem chaves, define a primeira como atual
                set({ currentKey: data[0] });
            }
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    addOpenAIKey: async (name: string, key: string) => {
        set({ isLoading: true, error: null });

        try {
            const { data, error } = await supabase
                .from('openai_keys')
                .insert([{
                    name,
                    key,
                    user_id: (await supabase.auth.getSession()).data.session?.user.id
                }])
                .select();

            if (error) throw error;

            // Se for a primeira chave, define como ativa
            if (get().openaiKeys.length === 0 && data && data.length > 0) {
                await get().updateOpenAIKey(data[0].id, { is_active: true });
                set({ currentKey: { ...data[0], is_active: true } });
            }

            set(state => ({
                openaiKeys: [data[0], ...state.openaiKeys]
            }));
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    updateOpenAIKey: async (id: string, data: Partial<OpenAIKey>) => {
        set({ isLoading: true, error: null });

        try {
            const { error } = await supabase
                .from('openai_keys')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            // Atualiza o array de chaves e a chave atual se necessário
            set(state => ({
                openaiKeys: state.openaiKeys.map(key =>
                    key.id === id ? { ...key, ...data } : key
                ),
                currentKey: state.currentKey?.id === id ?
                    { ...state.currentKey, ...data } : state.currentKey
            }));

            // Se esta chave foi definida como ativa, atualiza o currentKey
            if (data.is_active) {
                const updatedKey = get().openaiKeys.find(key => key.id === id);
                if (updatedKey) {
                    set({ currentKey: updatedKey });
                }
            }

            await get().fetchOpenAIKeys();
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    deleteOpenAIKey: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            const { error } = await supabase
                .from('openai_keys')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Remove a chave do array e atualiza a chave atual se necessário
            set(state => {
                const newKeys = state.openaiKeys.filter(key => key.id !== id);
                const newCurrentKey = state.currentKey?.id === id ?
                    (newKeys.length > 0 ? newKeys[0] : null) : state.currentKey;

                return {
                    openaiKeys: newKeys,
                    currentKey: newCurrentKey
                };
            });
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    setCurrentKey: (key: OpenAIKey) => {
        set({ currentKey: key });
    }
})); 
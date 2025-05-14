import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ThemeState {
    isDarkMode: boolean;
    toggleTheme: () => void;
    setDarkMode: (isDark: boolean) => void;
}

// Função para atualizar a classe no HTML diretamente
const updateThemeClass = (isDark: boolean) => {
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

// Determinar o tema inicial do sistema
const getInitialTheme = (): boolean => {
    if (typeof window === 'undefined') return false;

    // Verificar se existe tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme-storage');
    if (savedTheme) {
        try {
            const { state } = JSON.parse(savedTheme);
            return !!state.isDarkMode;
        } catch (e) {
            console.error('Erro ao ler tema salvo:', e);
        }
    }

    // Usar preferência do sistema como fallback
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => {
            // Determinar o estado inicial
            const initialDarkMode = getInitialTheme();

            // Aplicar tema inicial
            updateThemeClass(initialDarkMode);

            return {
                isDarkMode: initialDarkMode,
                toggleTheme: () => set(
                    state => {
                        const newIsDarkMode = !state.isDarkMode;
                        updateThemeClass(newIsDarkMode);
                        return { isDarkMode: newIsDarkMode };
                    },
                    true // Segundo parâmetro true força a atualização do localStorage
                ),
                setDarkMode: (isDark) => set(
                    () => {
                        updateThemeClass(isDark);
                        return { isDarkMode: isDark };
                    },
                    true
                ),
            };
        },
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ isDarkMode: state.isDarkMode }),
        }
    )
); 
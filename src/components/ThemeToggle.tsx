import { useEffect, useState } from 'react';
import { useThemeStore } from '../stores/themeStore';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useThemeStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleToggleClick = () => {
        console.log("Alternando tema - Estado anterior:", isDarkMode);
        toggleTheme();
        console.log("Tema alternado - Novo estado:", !isDarkMode);

        setTimeout(() => {
            console.log("Classe 'dark' presente:", document.documentElement.classList.contains('dark'));
        }, 100);
    };

    if (!mounted) return null;

    return (
        <button
            onClick={handleToggleClick}
            className="p-2.5 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 
                     transition-all duration-200 hover:bg-purple-200 dark:hover:bg-purple-700 
                     shadow-sm border border-purple-200 dark:border-purple-700 focus:outline-none 
                     focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
            aria-label={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
            title={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
        >
            {isDarkMode ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </button>
    );
};

export default ThemeToggle; 
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Menu, X, LayoutDashboard, LineChart, Key, LogOut, User, ChevronDown, Sparkles, Home as HomeIcon, Edit, Instagram } from 'lucide-react';
import ApiKeysModal from './ApiKeysModal';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const { signOut, user } = useAuthStore();
  const location = useLocation();

  // Detecta o scroll para aplicar sombra na navegação
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const openApiKeysModal = () => {
    setIsApiKeysModalOpen(true);
    setShowUserMenu(false);
  };

  const navigation = [
    { name: 'Início', href: '/home', icon: HomeIcon },
    { name: 'Instagram', href: '/instagram-analytics', icon: Instagram },
    { name: 'Canais', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Analisador IA', href: '/ai-analyzer', icon: Sparkles },
    { name: 'Criador de Conteúdo', href: '/content-creator', icon: Edit },
  ];

  return (
    <nav className={`bg-white fixed w-full z-10 transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/dashboard" className="flex items-center group">
                <img
                  src="https://vqptszujydcaedjglhdo.supabase.co/storage/v1/object/public/storage//Logo.webp"
                  alt="Nexia Logo"
                  className="h-8 mr-2 transition-all duration-300"
                />
              </Link>
            </div>

            {/* Navegação Desktop */}
            <div className="hidden sm:ml-10 sm:flex sm:space-x-6">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href ||
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-2 pt-1 text-sm font-medium transition-colors duration-200 ${isActive
                      ? 'border-b-2 border-purple-500 text-purple-700'
                      : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                      }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Menu do usuário (Desktop) */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none transition-colors duration-200 rounded-lg px-3 py-2 hover:bg-gray-100"
              >
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="mr-1">{user?.email?.split('@')[0] || 'Usuário'}</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              {showUserMenu && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                  onBlur={() => setShowUserMenu(false)}
                >
                  <div className="py-1">
                    <button
                      onClick={openApiKeysModal}
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <Key className="w-4 h-4 mr-2" />
                        Chaves API
                      </div>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair da conta
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botão do menu móvel */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-colors"
            >
              <span className="sr-only">{isOpen ? 'Fechar menu principal' : 'Abrir menu principal'}</span>
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Móvel */}
      {isOpen && (
        <div className="sm:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeMenu}
                  className={`block pl-4 pr-4 py-3 border-l-4 text-base font-medium transition-colors ${isActive
                    ? 'border-purple-500 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                    }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                </Link>
              );
            })}

            {/* Informações do usuário no menu móvel */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center px-4 py-2">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{user?.email?.split('@')[0] || 'Usuário'}</p>
                  <p className="text-gray-500 text-xs">{user?.email || ''}</p>
                </div>
              </div>

              <button
                onClick={openApiKeysModal}
                className="block w-full text-left pl-4 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 transition-colors"
              >
                <div className="flex items-center">
                  <Key className="w-5 h-5 mr-3" />
                  Chaves API
                </div>
              </button>

              <button
                onClick={handleSignOut}
                className="block w-full text-left pl-4 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 transition-colors"
              >
                <div className="flex items-center">
                  <LogOut className="w-5 h-5 mr-3" />
                  Sair da conta
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Chaves API */}
      <ApiKeysModal isOpen={isApiKeysModalOpen} onClose={() => setIsApiKeysModalOpen(false)} />
    </nav>
  );
};

export default Navigation;
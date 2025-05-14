import { Github } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <img 
              src="https://vqptszujydcaedjglhdo.supabase.co/storage/v1/object/public/storage//Logo%202.webp" 
              alt="Nexia Logo" 
              className="h-6 mr-2"
            />
            <span className="text-gray-800 font-medium">NexIA Content</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center text-sm text-gray-600">
            <p className="mb-2 md:mb-0 md:mr-4">2025 Todos os direitos reservados</p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
              >
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
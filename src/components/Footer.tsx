import { Github, Youtube } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <Youtube className="h-6 w-6 text-blue-600 mr-2" />
            <span className="text-gray-800 font-medium">YouTube Analytics Platform</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center text-sm text-gray-600">
            <p className="mb-2 md:mb-0 md:mr-4">&copy; {currentYear} All rights reserved</p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
              >
                <span>About</span>
              </a>
              <a 
                href="#" 
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
              >
                <span>Terms</span>
              </a>
              <a 
                href="#" 
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
              >
                <span>Privacy</span>
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
              >
                <Github className="h-4 w-4 mr-1" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
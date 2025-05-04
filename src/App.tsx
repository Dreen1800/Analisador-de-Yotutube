import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChannelAnalysis from './pages/ChannelAnalysis';
import AiChannelAnalyzer from './pages/AiChannelAnalyzer';
import ApiKeys from './pages/ApiKeys';
import NotFound from './pages/NotFound';

// Components
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import { supabase } from './lib/supabaseClient';

function App() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setIsLoading(false);
      
      // Setup auth listener
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });
    }

    getUser();
  }, [setUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-t-blue-600 border-gray-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Pages that don't need the navigation bar
  const authPages = ['/login', '/register'];
  const showNavigation = !authPages.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {showNavigation && user && <Navigation />}
      
      <main className="flex-grow">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={!user ? <Navigate to="/login" /> : <Dashboard />} />
          <Route path="/channel-analysis/:id?" element={!user ? <Navigate to="/login" /> : <ChannelAnalysis />} />
          <Route path="/ai-analyzer" element={!user ? <Navigate to="/login" /> : <AiChannelAnalyzer />} />
          <Route path="/api-keys" element={!user ? <Navigate to="/login" /> : <ApiKeys />} />
          
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      {showNavigation && user && <Footer />}
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home'; // Nova importação
import AiChannelAnalyzer from './pages/AiChannelAnalyzer';
import ContentCreator from './pages/ContentCreator'; // Nova importação
import InstagramAnalytics from './pages/InstagramAnalytics'; // Nova importação
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
  const showNavigation = !authPages.includes(location.pathname) && user;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {showNavigation && <Navigation />}

      <main className={`flex-grow ${showNavigation ? 'pt-20' : ''}`}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/home" /> : <Register />} />

          {/* Protected Routes */}
          <Route path="/home" element={!user ? <Navigate to="/login" /> : <Home />} /> {/* Nova rota */}
          <Route path="/dashboard" element={!user ? <Navigate to="/login" /> : <Dashboard />} />
          <Route path="/ai-analyzer" element={!user ? <Navigate to="/login" /> : <AiChannelAnalyzer />} />
          <Route path="/content-creator" element={!user ? <Navigate to="/login" /> : <ContentCreator />} /> {/* Nova rota */}
          <Route path="/instagram-analytics" element={!user ? <Navigate to="/login" /> : <InstagramAnalytics />} /> {/* Nova rota */}

          <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} /> {/* Alterado para /home */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {showNavigation && <Footer />}
    </div>
  );
}

export default App;
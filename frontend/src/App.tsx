import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AlgoSelection from './pages/AlgoSelection';
import Dashboard from './pages/Dashboard';
import Auth from './components/Auth';
import LandingPage from './pages/LandingPage';
import Settings from './pages/Settings';
import DashboardLayout from './components/DashboardLayout';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center font-mono animate-pulse">Initializing Security Protocols...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth />} />

        {/* Protected Routes Wrapped in Layout */}
        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/select-algo" element={<AlgoSelection />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

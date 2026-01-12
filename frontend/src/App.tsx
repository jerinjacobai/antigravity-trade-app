import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AlgoSelection from './pages/AlgoSelection';
import Dashboard from './pages/Dashboard';
import Auth from './components/Auth';
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

  if (loading) return <div className="h-screen bg-black text-zinc-500 flex items-center justify-center">Connect...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/select-algo" element={
          <ProtectedRoute>
            <AlgoSelection />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App;

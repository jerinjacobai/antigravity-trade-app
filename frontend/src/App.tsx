import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AlgoSelection from './pages/AlgoSelection';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="antialiased text-text bg-background min-h-screen">
        <Routes>
          <Route path="/" element={<AlgoSelection />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

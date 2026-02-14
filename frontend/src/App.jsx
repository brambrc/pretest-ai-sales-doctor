import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LeadsPage from './pages/LeadsPage';
import AddLeadPage from './pages/AddLeadspage';
import DialerPage from './pages/DialerPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><AddLeadPage /></ProtectedRoute>} />
            <Route path="/dialer/:sessionId" element={<ProtectedRoute><DialerPage /></ProtectedRoute>} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import ApplicationDetail from './pages/ApplicationDetail';
import EmailNotifications from './pages/EmailNotifications';
import BulkEmailUpload from './pages/BulkEmailUpload';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-9 w-9 rounded-full border-4 border-gray-200 border-t-brand-primary animate-spin" />
        <p className="text-sm text-gray-400 font-medium tracking-wide">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications/:id"
        element={
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/email-notifications"
        element={
          <ProtectedRoute>
            <EmailNotifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bulk-email-upload"
        element={
          <ProtectedRoute>
            <BulkEmailUpload />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;


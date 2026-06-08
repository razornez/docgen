import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import Layout from './components/Layout.js';
import LandingPage from './pages/Landing.js';
import LoginPage from './pages/Login.js';
import AuthCallbackPage from './pages/AuthCallback.js';
import DashboardPage from './pages/Dashboard.js';
import WalletPage from './pages/Wallet.js';
import TemplatesPage from './pages/Templates.js';
import BatchesPage from './pages/Batches.js';
import ApiKeysPage from './pages/ApiKeys.js';
import WebhooksPage from './pages/Webhooks.js';
import AdminPage from './pages/admin/AdminOverview.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="batches" element={<BatchesPage />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
          <Route path="webhooks" element={<WebhooksPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import Layout from './components/Layout.js';
// Halaman entry (unauth) di-load eager agar first paint tanpa flash.
import LandingPage from './pages/Landing.js';
import LoginPage from './pages/Login.js';
import AuthCallbackPage from './pages/AuthCallback.js';

// Halaman terproteksi di-load lazy (code-splitting) — memangkas bundle awal.
// Yang terberat (Templates + RichEditor) hanya diunduh saat dibuka.
const DashboardPage = lazy(() => import('./pages/Dashboard.js'));
const WalletPage = lazy(() => import('./pages/Wallet.js'));
const TemplatesPage = lazy(() => import('./pages/Templates.js'));
const BatchesPage = lazy(() => import('./pages/Batches.js'));
const ApiKeysPage = lazy(() => import('./pages/ApiKeys.js'));
const WebhooksPage = lazy(() => import('./pages/Webhooks.js'));
const AdminPage = lazy(() => import('./pages/admin/AdminOverview.js'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Halaman 404 ber-UI (bukan JSON mentah) untuk rute yang tidak dikenal. */
function NotFoundPage() {
  const { token } = useAuth();
  const home = token ? '/dashboard' : '/login';
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}
    >
      <p className="text-[80px] font-bold leading-none text-indigo-400">404</p>
      <h1 className="mt-3 text-xl font-semibold text-white">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 text-sm text-slate-400 max-w-sm">
        Tautan yang Anda buka tidak ada atau sudah dipindahkan.
      </p>
      <Link
        to={home}
        className="mt-6 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-all hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        }}
      >
        Kembali ke {token ? 'dashboard' : 'halaman masuk'}
      </Link>
    </div>
  );
}

/** Placeholder ringan saat chunk halaman sedang diunduh. */
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24 text-slate-400">
      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
        />
      </svg>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
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
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="wallet"
            element={
              <Suspense fallback={<PageLoader />}>
                <WalletPage />
              </Suspense>
            }
          />
          <Route
            path="templates"
            element={
              <Suspense fallback={<PageLoader />}>
                <TemplatesPage />
              </Suspense>
            }
          />
          <Route
            path="batches"
            element={
              <Suspense fallback={<PageLoader />}>
                <BatchesPage />
              </Suspense>
            }
          />
          <Route
            path="api-keys"
            element={
              <Suspense fallback={<PageLoader />}>
                <ApiKeysPage />
              </Suspense>
            }
          />
          <Route
            path="webhooks"
            element={
              <Suspense fallback={<PageLoader />}>
                <WebhooksPage />
              </Suspense>
            }
          />
          <Route
            path="admin"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

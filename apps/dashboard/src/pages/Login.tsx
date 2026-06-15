import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { authLogin, authRegister } from '../api/client.js';

type Tab = 'login' | 'register';

const DEMO_EMAIL = 'demo@docgen.razornez.net';
const DEMO_PASSWORD = 'demo1234';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError('');
  }

  function fillDemo() {
    setTab('login');
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authLogin(email.trim(), password);
      login(res.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authRegister(name.trim(), email.trim(), password);
      login(res.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = '/v1/auth/google';
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        background:
          'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}
    >
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              }}
            >
              D
            </div>
            <span className="font-semibold text-white text-lg tracking-tight">
              DocGen
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Generate dokumen
              <br />
              <span className="text-indigo-400">skala besar</span>, mudah.
            </h1>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              Buat PDF dari template Handlebars secara massal via API. Invoice,
              surat, kontrak — semua dalam hitungan detik.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '⚡', text: 'API sederhana, dokumentasi lengkap' },
              { icon: '📄', text: 'Template Handlebars yang fleksibel' },
              { icon: '🔒', text: 'Aman — webhook signature terverifikasi' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white text-xs">
          © 2025 DocGen. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              }}
            >
              D
            </div>
            <span className="font-semibold text-slate-900 text-base">
              DocGen
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {tab === 'login' ? 'Selamat datang kembali' : 'Buat akun baru'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {tab === 'login'
                ? 'Masuk ke dashboard Anda'
                : '100 kredit gratis saat daftar'}
            </p>
          </div>

          {/* Demo banner */}
          <div className="mb-5 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  Akun Demo — coba tanpa daftar
                </p>
                <div className="mt-1.5 space-y-0.5 font-mono text-[11px] text-amber-900">
                  <div>
                    Email:{' '}
                    <span className="rounded-md bg-white/70 border border-amber-200 px-1.5 py-0.5">
                      {DEMO_EMAIL}
                    </span>
                  </div>
                  <div>
                    Pass:{' '}
                    <span className="rounded-md bg-white/70 border border-amber-200 px-1.5 py-0.5">
                      {DEMO_PASSWORD}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-[10.5px] text-amber-500">
                  Reset otomatis tiap 24 jam
                </p>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="flex-shrink-0 text-[11px] font-semibold bg-amber-600 text-white px-2.5 py-1 rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap"
              >
                Isi otomatis
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mb-5 bg-slate-100 rounded-xl p-1 gap-1">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                  tab === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-4"
          >
            <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {tab === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
          </button>

          <div className="relative mb-4">
            <hr className="border-slate-200" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-2 text-[11px] text-slate-400 font-medium">
              atau
            </span>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={(e) => void handleLogin(e)} className="space-y-3.5">
              <div>
                <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                  Kata sandi
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl text-white disabled:opacity-60 transition-all hover:opacity-90"
                style={{
                  background:
                    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                {loading ? 'Masuk…' : 'Masuk'}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => void handleRegister(e)}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                  Nama / perusahaan
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Acme Corp"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                  Kata sandi
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl text-white disabled:opacity-60 transition-all hover:opacity-90"
                style={{
                  background:
                    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                {loading ? 'Membuat akun…' : 'Daftar — 100 kredit gratis'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

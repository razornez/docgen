import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import {
  authLogin,
  authRegister,
  forgotPassword,
  getPublicPricing,
} from '../api/client.js';
import { useLang } from '../i18n/index.js';
import { Flower, LangToggle } from '../components/PublicChrome.js';

type Tab = 'login' | 'register';

const DEMO_EMAIL = 'demo@docgen.razornez.net';
const DEMO_PASSWORD = 'demo1234';

const PAPERS: Array<React.CSSProperties & { '--r': string }> = [
  { bottom: '6%', left: '8%', width: 120, height: 158, '--r': '-9deg' },
  { bottom: '14%', left: '26%', width: 92, height: 122, '--r': '7deg' },
  { bottom: '2%', left: '46%', width: 104, height: 138, '--r': '-5deg' },
];

const inputCls =
  'w-full bg-white/70 border border-white/60 rounded-xl px-3.5 py-2.5 text-[14px] text-ink placeholder:text-mut/70 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 transition-all';

function PwToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="toggle"
      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-mut hover:text-ink transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        {show ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88"
          />
        ) : (
          <>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </>
        )}
      </svg>
    </button>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const [tab, setTab] = useState<Tab>(
    new URLSearchParams(window.location.search).get('tab') === 'register'
      ? 'register'
      : 'login',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified');
  const oauthError = searchParams.get('error');
  const expired = searchParams.get('expired');
  const pricing = useQuery({
    queryKey: ['public-pricing'],
    queryFn: getPublicPricing,
  });
  const bonus = (pricing.data?.signup_bonus_credits ?? 100).toLocaleString(
    lang === 'en' ? 'en-US' : 'id-ID',
  );

  function switchTab(x: Tab) {
    setTab(x);
    setError('');
    setForgotOpen(false);
    setForgotSent(false);
  }
  async function handleForgot() {
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail.trim());
    } catch {
      // Sengaja diabaikan: balasan selalu generik (anti enumeration).
    } finally {
      setForgotSent(true);
      setForgotLoading(false);
    }
  }
  function fillDemo() {
    setTab('login');
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (tab === 'register' && !agree) {
      setError(
        t(
          'Anda harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi.',
          'You must agree to the Terms and Privacy Policy.',
        ),
      );
      return;
    }
    setLoading(true);
    try {
      const res =
        tab === 'login'
          ? await authLogin(email.trim(), password)
          : await authRegister(name.trim(), email.trim(), password);
      login(res.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tab === 'login'
            ? t('Login gagal', 'Login failed')
            : t('Pendaftaran gagal', 'Sign-up failed'),
      );
    } finally {
      setLoading(false);
    }
  }
  function handleGoogle() {
    window.location.href = '/v1/auth/google';
  }

  return (
    <div className="min-h-screen flex text-ink">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden p-12"
        style={{
          background:
            'linear-gradient(160deg, #271847 0%, #3a2566 52%, #4a2c6e 100%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden opacity-[0.18] pointer-events-none">
          {PAPERS.map((style, i) => (
            <div
              key={i}
              className="absolute rounded-lg border border-white/30"
              style={{
                ...style,
                transform: `rotate(${style['--r']})`,
                background:
                  'repeating-linear-gradient(180deg, transparent 0 9px, rgba(255,255,255,0.25) 9px 10.5px), rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
        <div className="relative flex items-center gap-2.5">
          <Flower className="w-9 h-9" />
          <span className="text-[20px] font-extrabold tracking-tight text-white lowercase">
            docgen
          </span>
        </div>
        <div className="relative">
          <h1 className="text-[34px] font-extrabold text-white leading-[1.15]">
            {t(
              'Dari HTML & data, jadi PDF rapi — ',
              'From HTML & data to clean PDFs — ',
            )}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #c8a8ff 0%, #f5a9d4 100%)',
              }}
            >
              {t('dalam satu panggilan.', 'in a single call.')}
            </span>
          </h1>
          <ul className="mt-8 space-y-3.5">
            {[
              t('Template HTML + variabel', 'HTML templates + variables'),
              t('Kredit prepaid', 'Prepaid credits'),
              t('API & Webhooks', 'API & Webhooks'),
            ].map((txt) => (
              <li key={txt} className="flex items-center gap-3">
                <svg
                  className="w-4 h-4 text-[#c8a8ff] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-[14px] text-slate-200">{txt}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="num relative text-[11px] text-slate-400/80">
          {t('Tanpa kartu kredit', 'No credit card')} ·{' '}
          {t('Kredit prepaid', 'Prepaid credits')} · QRIS / VA / e-wallet
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 relative flex flex-col app-canvas overflow-hidden">
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          {PAPERS.map((style, i) => (
            <div
              key={i}
              className="paper animate-floatPaper"
              style={{
                ...style,
                left: undefined,
                bottom: undefined,
                top: `${15 + i * 26}%`,
                right: `${6 + i * 5}%`,
              }}
            />
          ))}
        </div>

        <div className="relative flex items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[13px] font-medium text-mut hover:text-ink transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('Kembali ke beranda', 'Back to home')}
          </Link>
          <LangToggle />
        </div>

        <div className="relative flex-1 flex items-center justify-center px-6 pb-10">
          <div className="glass rounded-[22px] p-7 w-full max-w-[420px]">
            <h2 className="text-[22px] font-extrabold text-ink">
              {tab === 'login'
                ? t('Masuk ke DocGen', 'Sign in to DocGen')
                : t('Buat akun DocGen', 'Create your DocGen account')}
            </h2>
            <p className="text-[13px] text-mut mt-1">
              {tab === 'login'
                ? t('Lanjutkan ke dasbormu.', 'Continue to your dashboard.')
                : t(
                    `${bonus} kredit gratis saat daftar.`,
                    `${bonus} free credits on sign-up.`,
                  )}
            </p>

            <div className="flex mt-5 mb-4 glass-soft rounded-full p-1 gap-1">
              {(['login', 'register'] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => switchTab(x)}
                  className={`flex-1 py-2 text-[13px] font-bold rounded-full transition-all ${
                    tab === x
                      ? 'bg-grad text-white shadow-[0_4px_12px_rgba(155,93,229,0.35)]'
                      : 'text-mut hover:text-ink'
                  }`}
                >
                  {x === 'login'
                    ? t('Masuk', 'Sign in')
                    : t('Daftar', 'Sign up')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white/80 border border-white/70 rounded-xl text-[13.5px] font-semibold text-ink hover:bg-white transition-colors"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
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
              {t('Lanjutkan dengan Google', 'Continue with Google')}
            </button>

            <div className="relative my-4">
              <hr className="border-white/50" />
              <span className="num absolute left-1/2 -translate-x-1/2 -top-2 px-2 text-[10.5px] text-mut bg-white/50 backdrop-blur-sm rounded">
                {t('atau', 'or')}
              </span>
            </div>

            {expired && tab === 'login' && (
              <div className="mb-3 text-[12.5px] rounded-xl px-3 py-2.5 border text-amber-700 bg-amber-50/80 border-amber-200">
                {t(
                  'Sesi kamu sudah berakhir. Silakan masuk lagi.',
                  'Your session has expired. Please sign in again.',
                )}
              </div>
            )}

            {oauthError === 'oauth_failed' && (
              <div className="mb-3 text-[12.5px] rounded-xl px-3 py-2.5 border text-rose-700 bg-rose-50/80 border-rose-200">
                {t(
                  'Login dengan Google gagal. Silakan coba lagi.',
                  'Google sign-in failed. Please try again.',
                )}
              </div>
            )}

            {verified && (
              <div
                className={`mb-3 text-[12.5px] rounded-xl px-3 py-2.5 border ${
                  verified === 'success' || verified === 'used'
                    ? 'text-emerald-700 bg-emerald-50/80 border-emerald-200'
                    : 'text-amber-700 bg-amber-50/80 border-amber-200'
                }`}
              >
                {verified === 'success'
                  ? t(
                      'Email berhasil diverifikasi. Silakan masuk.',
                      'Email verified successfully. Please sign in.',
                    )
                  : verified === 'used'
                    ? t(
                        'Email sudah pernah diverifikasi. Silakan masuk.',
                        'Email was already verified. Please sign in.',
                      )
                    : verified === 'expired'
                      ? t(
                          'Link verifikasi sudah kedaluwarsa. Masuk lalu kirim ulang dari pengaturan.',
                          'Verification link expired. Sign in, then resend it.',
                        )
                      : t(
                          'Link verifikasi tidak valid.',
                          'Invalid verification link.',
                        )}
              </div>
            )}

            {error && (
              <div className="mb-3 flex items-start gap-2 text-[12.5px] text-rose-700 bg-rose-50/80 border border-rose-200 rounded-xl px-3 py-2.5">
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

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-3.5"
            >
              {tab === 'register' && (
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut mb-1.5">
                    {t('Nama / perusahaan', 'Name / company')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="PT Karya Sejahtera"
                    className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut mb-1.5">
                  {t('Email kerja', 'Work email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="budi@perusahaan.co.id"
                  className={inputCls}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut">
                    {t('Kata sandi', 'Password')}
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotOpen((v) => !v);
                        setForgotEmail(email);
                        setForgotSent(false);
                      }}
                      className="text-[11.5px] font-bold text-brand-purple hover:opacity-80 transition-opacity"
                    >
                      {t('Lupa sandi?', 'Forgot password?')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={tab === 'register' ? 8 : undefined}
                    autoComplete={
                      tab === 'login' ? 'current-password' : 'new-password'
                    }
                    placeholder="••••••••"
                    className={`${inputCls} pr-11`}
                  />
                  <PwToggle
                    show={showPw}
                    onToggle={() => setShowPw((v) => !v)}
                  />
                </div>
                {forgotOpen && tab === 'login' && (
                  <div className="mt-2 bg-white/50 border border-white/50 rounded-lg px-3 py-2.5">
                    {forgotSent ? (
                      <p className="text-[11.5px] text-emerald-700 leading-relaxed">
                        {t(
                          'Jika email terdaftar, link reset sandi sudah dikirim. Cek inbox kamu.',
                          'If the email is registered, a reset link has been sent. Check your inbox.',
                        )}
                      </p>
                    ) : (
                      <>
                        <p className="text-[11.5px] text-mut mb-2 leading-relaxed">
                          {t(
                            'Masukkan email akunmu, kami kirim link reset sandi.',
                            'Enter your account email and we’ll send a reset link.',
                          )}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="budi@perusahaan.co.id"
                            className={`${inputCls} py-2 text-[12.5px]`}
                          />
                          <button
                            type="button"
                            disabled={forgotLoading || !forgotEmail.trim()}
                            onClick={() => void handleForgot()}
                            className="flex-shrink-0 px-3.5 py-2 text-[12px] font-bold rounded-lg text-white bg-grad disabled:opacity-60 hover:opacity-90 transition-all"
                          >
                            {forgotLoading
                              ? t('Mengirim…', 'Sending…')
                              : t('Kirim', 'Send')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {tab === 'login' && (
                <label className="flex items-center gap-2 text-[12.5px] text-mut cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#9b5de5]"
                  />
                  {t('Ingat saya', 'Remember me')}
                </label>
              )}

              {tab === 'register' && (
                <label className="flex items-start gap-2 text-[12px] text-mut cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => {
                      setAgree(e.target.checked);
                      if (error) setError('');
                    }}
                    className="w-4 h-4 mt-0.5 rounded accent-[#9b5de5] flex-shrink-0"
                  />
                  <span className="leading-snug">
                    {t('Saya menyetujui ', 'I agree to the ')}
                    <a
                      href="/p/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-purple hover:opacity-80"
                    >
                      {t('Syarat & Ketentuan', 'Terms & Conditions')}
                    </a>
                    {t(' dan ', ' and ')}
                    <a
                      href="/p/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-purple hover:opacity-80"
                    >
                      {t('Kebijakan Privasi', 'Privacy Policy')}
                    </a>
                    .
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading || (tab === 'register' && !agree)}
                className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-bold rounded-full text-white bg-grad shadow-[0_6px_18px_rgba(155,93,229,0.4)] disabled:opacity-60 hover:opacity-90 transition-all"
              >
                {loading
                  ? tab === 'login'
                    ? t('Masuk…', 'Signing in…')
                    : t('Membuat akun…', 'Creating account…')
                  : tab === 'login'
                    ? t('Masuk', 'Sign in')
                    : t(
                        `Daftar — ${bonus} kredit gratis`,
                        `Sign up — ${bonus} free credits`,
                      )}
                {!loading && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                )}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-[12.5px] text-mut">
                {tab === 'login'
                  ? t('Belum punya akun? ', "Don't have an account? ")
                  : t('Sudah punya akun? ', 'Already have an account? ')}
                <button
                  type="button"
                  onClick={() =>
                    switchTab(tab === 'login' ? 'register' : 'login')
                  }
                  className="font-bold text-brand-purple hover:opacity-80"
                >
                  {tab === 'login'
                    ? t('Daftar', 'Sign up')
                    : t('Masuk', 'Sign in')}
                </button>
              </p>
              <button
                type="button"
                onClick={fillDemo}
                className="text-[11.5px] font-semibold text-mut hover:text-ink transition-colors"
                title={t(
                  'Isi otomatis akun demo',
                  'Auto-fill the demo account',
                )}
              >
                {t('Pakai akun demo', 'Use demo account')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/client.js';
import { useT, useLang } from '../i18n/index.js';

/* ── Brand flower logo (4 petals, gradient) ─────────────────────────── */
function FlowerLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="dg-flower" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f15bb5" />
          <stop offset="0.5" stopColor="#9b5de5" />
          <stop offset="1" stopColor="#fca15b" />
        </linearGradient>
      </defs>
      <g fill="url(#dg-flower)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse
            key={a}
            cx="16"
            cy="8.5"
            rx="4"
            ry="6.6"
            transform={`rotate(${a} 16 16)`}
          />
        ))}
      </g>
      <circle cx="16" cy="16" r="3.1" fill="#fff" opacity="0.92" />
    </svg>
  );
}

/* ── Latar aplikasi: gradient + blobs + lantai kertas dokumen ───────── */
/** Kertas bertebaran — animasi latar ringan (pengganti bola 3D). */
const PAPERS: Array<
  React.CSSProperties & { '--r': string; animationDelay: string }
> = [
  {
    top: '7%',
    left: '5%',
    width: 82,
    height: 108,
    '--r': '-9deg',
    animationDelay: '0s',
  },
  {
    top: '12%',
    right: '9%',
    width: 98,
    height: 128,
    '--r': '11deg',
    animationDelay: '2.2s',
  },
  {
    top: '38%',
    left: '3%',
    width: 70,
    height: 92,
    '--r': '6deg',
    animationDelay: '4.1s',
  },
  {
    top: '50%',
    right: '4%',
    width: 108,
    height: 138,
    '--r': '-13deg',
    animationDelay: '1.1s',
  },
  {
    top: '70%',
    left: '11%',
    width: 86,
    height: 112,
    '--r': '-4deg',
    animationDelay: '3.3s',
  },
  {
    bottom: '9%',
    right: '15%',
    width: 92,
    height: 120,
    '--r': '9deg',
    animationDelay: '5.2s',
  },
  {
    top: '24%',
    left: '47%',
    width: 64,
    height: 84,
    '--r': '15deg',
    animationDelay: '2.7s',
  },
];

function AppBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden app-canvas"
      aria-hidden="true"
    >
      {/* Lantai kertas dokumen (bawah) */}
      <div className="absolute -bottom-16 left-0 right-0 flex justify-center">
        <div className="doc-floor">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className="sheet"
              style={{ transform: `translateY(${(i % 3) * 16}px)` }}
            />
          ))}
        </div>
      </div>

      {/* Kertas bertebaran (melayang pelan) */}
      {PAPERS.map((style, i) => (
        <div key={i} className="paper animate-floatPaper" style={style} />
      ))}
    </div>
  );
}

type NavItem = {
  to: string;
  tkey: string;
  exact?: boolean;
  icon: JSX.Element;
};

const ICON = {
  overview: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  ),
  wallet: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  ),
  templates: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  ),
  batches: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  ),
  apiKeys: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
    />
  ),
  webhooks: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  ),
  admin: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </>
  ),
};

const workspaceNav: NavItem[] = [
  { to: '/dashboard', exact: true, tkey: 'nav.overview', icon: ICON.overview },
  { to: '/dashboard/wallet', tkey: 'nav.wallet', icon: ICON.wallet },
  { to: '/dashboard/templates', tkey: 'nav.templates', icon: ICON.templates },
  { to: '/dashboard/batches', tkey: 'nav.batches', icon: ICON.batches },
];

const developerNav: NavItem[] = [
  { to: '/dashboard/api-keys', tkey: 'nav.apiKeys', icon: ICON.apiKeys },
  { to: '/dashboard/webhooks', tkey: 'nav.webhooks', icon: ICON.webhooks },
];

/** pathname → { judul, sub } untuk header. */
const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'nav.overview', sub: 'sub.overview' },
  '/dashboard/wallet': { title: 'nav.wallet', sub: 'sub.wallet' },
  '/dashboard/templates': { title: 'nav.templates', sub: 'sub.templates' },
  '/dashboard/batches': { title: 'nav.batches', sub: 'sub.batches' },
  '/dashboard/api-keys': { title: 'nav.apiKeys', sub: 'sub.apiKeys' },
  '/dashboard/webhooks': { title: 'nav.webhooks', sub: 'sub.webhooks' },
  '/dashboard/admin': { title: 'nav.admin', sub: 'sub.admin' },
};

function NavRow({ to, tkey, exact, icon }: NavItem) {
  const t = useT();
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-200 ${
          isActive
            ? 'bg-[#ece4fb] text-ink shadow-[0_1px_6px_rgba(99,60,160,0.09)]'
            : 'text-mut hover:text-ink hover:bg-white/45'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex items-center justify-center transition-colors ${
              isActive ? 'text-brand-purple' : 'text-mut group-hover:text-ink'
            }`}
          >
            <svg
              className="w-[18px] h-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.85}
              viewBox="0 0 24 24"
            >
              {icon}
            </svg>
          </span>
          {t(tkey)}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const { lang, setLang, fmtNum } = useLang();
  const { data } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const meta = PAGE_META[location.pathname] ?? {
    title: 'nav.overview',
    sub: 'sub.overview',
  };
  const initials = data?.tenant.name?.slice(0, 2).toUpperCase() ?? 'DG';
  const balance = data?.wallet.balance ?? null;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden text-ink">
      <AppBackground />

      {/* Backdrop drawer (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#2a1c4a]/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col bg-white/40 backdrop-blur-xl border-r border-white/50 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <FlowerLogo className="w-8 h-8" />
            <div className="leading-none">
              <p className="text-[18px] font-extrabold tracking-tight text-ink lowercase">
                docgen
              </p>
              <p className="num mt-1 text-[10px] text-mut tracking-tight">
                {t('brand.tagline')}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-1 overflow-y-auto">
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mut/80">
            {t('group.workspace')}
          </p>
          <div className="space-y-1">
            {workspaceNav.map((item) => (
              <NavRow key={item.to} {...item} />
            ))}
          </div>

          <p className="px-3 mt-6 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mut/80">
            {t('group.developer')}
          </p>
          <div className="space-y-1">
            {developerNav.map((item) => (
              <NavRow key={item.to} {...item} />
            ))}
          </div>
        </nav>

        {/* Bottom: Admin + tenant card */}
        <div className="px-3 pb-4 pt-2 space-y-2">
          <NavRow to="/dashboard/admin" tkey="nav.admin" icon={ICON.admin} />

          <div className="relative">
            {menuOpen && (
              <div
                className="fixed inset-0 z-0"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
            )}
            {menuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-10 rounded-xl overflow-hidden glass py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-semibold text-ink hover:bg-white/60 transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-mut"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.85}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  {t('profile.signout')}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl glass-soft hover:bg-white/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-grad flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-white shadow-[0_2px_8px_rgba(155,93,229,0.4)]">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12.5px] font-semibold text-ink truncate">
                  {data?.tenant.name ?? '…'}
                </p>
                <p className="num text-[11px] text-mut">
                  {balance !== null ? (
                    <>
                      {fmtNum(balance)}{' '}
                      {lang === 'en'
                        ? balance === 1
                          ? 'credit'
                          : 'credits'
                        : t('unit.credit')}
                    </>
                  ) : (
                    '…'
                  )}
                </p>
              </div>
              <svg
                className={`w-4 h-4 flex-shrink-0 text-mut transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.85}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-7 py-3.5 bg-white/30 backdrop-blur-xl border-b border-white/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden -ml-1 p-1.5 rounded-lg text-mut hover:bg-white/50 transition-colors"
              aria-label={t('a11y.openMenu')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.85}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              </svg>
            </button>
            <h1 className="text-[17px] font-bold text-ink truncate">
              {t(meta.title)}
            </h1>
            <span className="num hidden sm:inline text-[12px] text-mut truncate">
              / {t(meta.sub)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full glass-soft text-mut w-[230px]">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder={t('topbar.search')}
                className="bg-transparent text-[12.5px] text-ink placeholder:text-mut focus:outline-none flex-1 min-w-0"
              />
              <span className="num text-[10px] text-mut bg-white/60 rounded px-1.5 py-0.5 flex-shrink-0">
                ⌘K
              </span>
            </div>

            {/* ID/EN toggle */}
            <div className="flex items-center p-0.5 rounded-full glass-soft">
              {(['id', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase transition-all ${
                    lang === l
                      ? 'bg-grad text-white shadow-sm'
                      : 'text-mut hover:text-ink'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Bell */}
            <button
              type="button"
              aria-label={t('a11y.notifications')}
              className="relative w-9 h-9 rounded-full glass-soft flex items-center justify-center text-mut hover:text-ink transition-colors"
            >
              <svg
                className="w-[18px] h-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.85}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-brand-pink" />
            </button>

            {/* Credit pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
              <svg
                className="w-3.5 h-3.5 text-brand-purple"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.4 6.9L21 9.3l-5.2 4.2 1.8 6.9L12 16.9 6.4 20.4l1.8-6.9L3 9.3l6.6-.4z" />
              </svg>
              <span className="num text-[12.5px] font-bold text-ink">
                {balance !== null ? fmtNum(balance) : '…'}
              </span>
              <span className="text-[12px] text-mut">{t('unit.credits')}</span>
            </div>

            {/* Buat dokumen */}
            <button
              type="button"
              onClick={() => navigate('/dashboard/templates')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-grad text-white text-[12.5px] font-bold shadow-[0_4px_14px_rgba(155,93,229,0.4)] hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden sm:inline">{t('topbar.create')}</span>
            </button>
          </div>
        </header>

        {/* Page content — kolom fokus terpusat (minimalis) */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-7">
          <div className="mx-auto w-full max-w-[1040px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

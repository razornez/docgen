import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/client.js';

type NavItem = {
  to: string;
  label: string;
  exact?: boolean;
  icon: JSX.Element;
};

const workspaceNav: NavItem[] = [
  {
    to: '/dashboard',
    exact: true,
    label: 'Overview',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    to: '/dashboard/wallet',
    label: 'Wallet',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    to: '/dashboard/templates',
    label: 'Templates',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    to: '/dashboard/batches',
    label: 'Batches',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
];

const developerNav: NavItem[] = [
  {
    to: '/dashboard/api-keys',
    label: 'API Keys',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
  },
  {
    to: '/dashboard/webhooks',
    label: 'Webhooks',
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/wallet': 'Wallet',
  '/dashboard/templates': 'Templates',
  '/dashboard/batches': 'Batches',
  '/dashboard/api-keys': 'API Keys',
  '/dashboard/webhooks': 'Webhooks',
  '/dashboard/admin': 'Admin',
};

function NavRow({ to, label, exact, icon }: NavItem) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 ${
          isActive
            ? 'text-white'
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active spotlight background */}
          {isActive && (
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/[0.22] via-indigo-500/[0.08] to-transparent shadow-[inset_0_0_0_1px_rgba(99,102,241,0.18)]" />
          )}
          {/* Active accent bar */}
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-full transition-all duration-200 ${
              isActive
                ? 'w-[3px] h-5 bg-gradient-to-b from-indigo-400 to-violet-500 shadow-[0_0_12px_rgba(129,140,248,0.75)]'
                : 'w-0.5 h-0 bg-transparent'
            }`}
          />
          <span
            className={`relative flex items-center justify-center transition-colors duration-200 ${
              isActive
                ? 'text-indigo-300'
                : 'text-slate-500 group-hover:text-slate-300'
            }`}
          >
            {icon}
          </span>
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useQuery({ queryKey: ['me'], queryFn: getMe });

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'DocGen';
  const initials = data?.tenant.name?.slice(0, 2).toUpperCase() ?? 'DG';

  // Drawer (mobile) + menu profil. Ditutup otomatis saat pindah halaman.
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
    <div className="flex h-screen" style={{ background: '#f8f7fc' }}>
      {/* Backdrop drawer (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, #0f1729 0%, #0d1322 100%)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        {/* Subtle top glow blob */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-24 bg-indigo-600/[0.08] blur-3xl rounded-full pointer-events-none" />

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-[0_4px_14px_rgba(99,102,241,0.45)]"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              }}
            >
              D
            </div>
            <span className="font-semibold text-white tracking-tight text-[15px]">
              DocGen
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Workspace
          </p>
          <div className="space-y-0.5">
            {workspaceNav.map((item) => (
              <NavRow key={item.to} {...item} />
            ))}
          </div>

          <p className="px-3 mt-5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Developer
          </p>
          <div className="space-y-0.5">
            {developerNav.map((item) => (
              <NavRow key={item.to} {...item} />
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 pt-3 mt-1 border-t border-white/[0.06] space-y-2">
          <NavRow
            to="/dashboard/admin"
            label="Admin"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
              >
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
              </svg>
            }
          />

          {/* User card → menu profil */}
          <div className="relative">
            {menuOpen && (
              <div
                className="fixed inset-0 z-0"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
            )}
            {menuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-10 rounded-xl overflow-hidden border border-white/10 bg-[#131a2b] shadow-[0_8px_30px_rgba(0,0,0,0.5)] py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-slate-200 hover:bg-white/[0.06] transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Keluar
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] transition-colors hover:bg-white/[0.06]"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-white shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
                style={{
                  background:
                    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-medium text-slate-200 truncate">
                  {data?.tenant.name ?? '…'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {(data?.wallet.balance ?? 0).toLocaleString()} credits
                </p>
              </div>
              <svg
                className={`w-4 h-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
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

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden -ml-1 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Buka menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              </svg>
            </button>
            <h1 className="text-[15px] font-semibold text-slate-800">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[13px] font-semibold text-indigo-700">
                  {data.wallet.balance.toLocaleString()} credits
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

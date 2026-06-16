import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearOwnerToken } from '../../api/client.js';

const PAPERS: Array<React.CSSProperties & { '--r': string }> = [
  { top: '10%', right: '6%', width: 92, height: 120, '--r': '10deg' },
  { top: '46%', right: '3%', width: 84, height: 110, '--r': '-8deg' },
  { bottom: '12%', right: '12%', width: 96, height: 124, '--r': '7deg' },
  { bottom: '18%', right: '24%', width: 70, height: 92, '--r': '-12deg' },
];

function Flower({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="ownl-flower" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f15bb5" />
          <stop offset="0.5" stopColor="#9b5de5" />
          <stop offset="1" stopColor="#fca15b" />
        </linearGradient>
      </defs>
      <g fill="url(#ownl-flower)">
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

type NavItem = {
  to?: string;
  label: string;
  icon: JSX.Element;
  soon?: boolean;
};

const NAV: NavItem[] = [
  {
    to: '/owner',
    label: 'Ringkasan',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8V3h-8zM3 21h8v-6H3v6z"
      />
    ),
  },
  {
    to: '/owner/tenants',
    label: 'Tenant',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m6-14h6m-6 4h6m-6 4h6"
      />
    ),
  },
  {
    to: '/owner/render',
    label: 'Render',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 7h10v10H7z"
      />
    ),
  },
  {
    to: '/owner/billing',
    label: 'Tagihan',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    ),
  },
  {
    to: '/owner/health',
    label: 'Sistem',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    ),
  },
  {
    to: '/owner/settings',
    label: 'Pengaturan',
    icon: (
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
  },
];

function NavRow({ item, onNav }: { item: NavItem; onNav: () => void }) {
  const icon = (active: boolean) => (
    <span
      className={`flex items-center justify-center ${active ? 'text-brand-purple' : 'text-mut group-hover:text-ink'}`}
    >
      <svg
        className="w-[18px] h-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.85}
        viewBox="0 0 24 24"
      >
        {item.icon}
      </svg>
    </span>
  );
  if (item.soon || !item.to) {
    return (
      <div
        className="group flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold text-mut/60 cursor-default"
        title="Segera"
      >
        {icon(false)}
        <span className="flex-1">{item.label}</span>
        <span className="text-[9px] font-bold uppercase tracking-wide text-mut/60 bg-white/40 rounded px-1.5 py-0.5">
          segera
        </span>
      </div>
    );
  }
  return (
    <NavLink
      to={item.to}
      end
      onClick={onNav}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-200 ${
          isActive
            ? 'bg-[#ece4fb] text-ink shadow-[0_1px_6px_rgba(99,60,160,0.09)]'
            : 'text-mut hover:text-ink hover:bg-white/45'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {icon(isActive)}
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function OwnerLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  function logout() {
    clearOwnerToken();
    navigate('/owner/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden text-ink">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden app-canvas"
        aria-hidden
      >
        {PAPERS.map((style, i) => (
          <div key={i} className="paper animate-floatPaper" style={style} />
        ))}
      </div>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-[#2a1c4a]/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col bg-white/40 backdrop-blur-xl border-r border-white/50 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <Flower className="w-8 h-8" />
            <div className="leading-none">
              <p className="text-[18px] font-extrabold tracking-tight text-ink lowercase">
                docgen
              </p>
              <p className="num mt-1 text-[10px] text-brand-purple font-bold uppercase tracking-wider">
                Owner Console
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-1 overflow-y-auto">
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mut/80">
            Platform
          </p>
          <div className="space-y-1">
            {NAV.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                onNav={() => setOpen(false)}
              />
            ))}
          </div>
        </nav>

        <div className="px-3 pb-4 pt-2">
          <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl glass-soft">
            <div className="w-8 h-8 rounded-lg bg-grad flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              OW
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-ink truncate">
                Owner
              </p>
              <p className="num text-[11px] text-mut truncate">
                Platform admin
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Keluar"
              aria-label="Keluar"
              className="flex-shrink-0 p-1 rounded-md text-mut hover:text-ink hover:bg-white/50 transition-colors"
            >
              <svg
                className="w-4 h-4"
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
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-2.5 px-4 py-3.5 bg-white/30 backdrop-blur-xl border-b border-white/40">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg text-mut hover:bg-white/50 transition-colors"
            aria-label="Buka menu"
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
          <span className="text-[15px] font-bold text-ink">Owner Console</span>
        </header>
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-7">
          <div className="mx-auto w-full max-w-[1080px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

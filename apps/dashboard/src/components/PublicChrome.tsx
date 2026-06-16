import { Link } from 'react-router-dom';
import { useLang } from '../i18n/index.js';
import type { Loc, PublicContent } from '../api/client.js';

export type Lang = 'id' | 'en';
export const pick = (lang: Lang, loc?: Loc): string =>
  loc ? (loc[lang] ?? loc.id) : '';

export function Flower({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="pub-flower" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f15bb5" />
          <stop offset="0.5" stopColor="#9b5de5" />
          <stop offset="1" stopColor="#fca15b" />
        </linearGradient>
      </defs>
      <g fill="url(#pub-flower)">
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

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center rounded-full glass-soft p-0.5 text-[11px] font-bold">
      {(['id', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-full uppercase transition-all ${
            lang === l ? 'bg-grad text-white' : 'text-mut hover:text-ink'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const ORBS = [
  { top: '14%', left: '3%', size: 70, from: '#b388f5', to: '#9b5de5' },
  { top: '8%', right: '7%', size: 56, from: '#c8a8ff', to: '#9b5de5' },
  { top: '40%', left: '6%', size: 44, from: '#f5a9d4', to: '#f15bb5' },
  { top: '52%', right: '5%', size: 64, from: '#b388f5', to: '#9b5de5' },
  { top: '72%', left: '4%', size: 50, from: '#f5a9d4', to: '#f15bb5' },
];

export function OrbsBg() {
  return (
    <div className="fixed inset-0 -z-10 app-canvas overflow-hidden" aria-hidden>
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-[2px] opacity-70"
          style={{
            top: o.top,
            left: o.left,
            right: o.right,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle at 32% 28%, ${o.from}, ${o.to})`,
            boxShadow: `0 18px 40px ${o.to}55`,
          }}
        />
      ))}
    </div>
  );
}

const NAV_LINKS: { to: string; label: Loc }[] = [
  { to: '/p/fitur', label: { id: 'Fitur', en: 'Features' } },
  { to: '/p/harga', label: { id: 'Harga', en: 'Pricing' } },
  { to: '/p/dokumentasi', label: { id: 'Dokumentasi', en: 'Docs' } },
  { to: '/p/api', label: { id: 'API', en: 'API' } },
];

export function PublicNav() {
  const { lang } = useLang();
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/30 border-b border-white/40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Flower className="w-7 h-7" />
          <span className="text-[18px] font-extrabold tracking-tight lowercase">
            docgen
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-mut">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="hover:text-ink transition-colors"
            >
              {pick(lang, l.label)}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <LangToggle />
          <Link
            to="/login"
            className="hidden sm:block px-3.5 py-1.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
          >
            {lang === 'en' ? 'Sign in' : 'Masuk'}
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.35)] hover:opacity-90 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3l14 9-14 9V3z"
              />
            </svg>
            {lang === 'en' ? 'Start free' : 'Mulai gratis'}
          </Link>
        </div>
      </div>
    </nav>
  );
}

function FooterLinkItem({ href, label }: { href: string; label: string }) {
  const cls = 'text-[13px] text-mut hover:text-ink transition-colors';
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href || '#'} className={cls}>
      {label}
    </a>
  );
}

export function PublicFooter({ content }: { content?: PublicContent }) {
  const { lang } = useLang();
  const tagline =
    pick(lang, content?.footer_tagline) ||
    (lang === 'en'
      ? 'Document generation engine via API.'
      : 'Mesin generate dokumen via API.');
  const cols = content?.footer_columns ?? [];
  return (
    <footer className="border-t border-white/40 backdrop-blur-xl bg-white/20">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <Flower className="w-7 h-7" />
            <span className="text-[17px] font-extrabold tracking-tight lowercase">
              docgen
            </span>
          </div>
          <p className="text-[12px] text-mut mt-3 max-w-[200px]">{tagline}</p>
        </div>
        {cols.map((col, ci) => (
          <div key={ci}>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut/80">
              {pick(lang, col.head)}
            </p>
            <ul className="mt-3 space-y-2">
              {col.items.map((it, i) => (
                <li key={i}>
                  <FooterLinkItem href={it.href} label={pick(lang, it.label)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-center text-[11.5px] text-mut/70 pb-8">
        © 2026 DocGen.{' '}
        {lang === 'en' ? 'All rights reserved.' : 'Semua hak dilindungi.'}
      </p>
    </footer>
  );
}

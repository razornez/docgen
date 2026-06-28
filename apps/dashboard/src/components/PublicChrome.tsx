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

type DocType = 'lined' | 'headed' | 'plain';
interface PaperDef {
  x: string;
  y: string;
  w: number;
  h: number;
  r: number;
  delay: number;
  dur: number;
  type: DocType;
  opacity?: number;
}

const LINED_BG =
  'repeating-linear-gradient(180deg,transparent 0 9px,rgba(120,95,180,0.13) 9px 10.5px),rgba(255,255,255,0.62)';
const HEADED_BG =
  'repeating-linear-gradient(180deg,transparent 0 9px,rgba(120,95,180,0.13) 9px 10.5px),' +
  'linear-gradient(180deg,rgba(155,93,229,0.22) 0% 22%,rgba(255,255,255,0.62) 22%)';
const PLAIN_BG = 'rgba(255,255,255,0.58)';

const BG: Record<DocType, string> = {
  lined: LINED_BG,
  headed: HEADED_BG,
  plain: PLAIN_BG,
};

const PAPERS: PaperDef[] = [
  /* kiri */
  { x: '1%', y: '7%', w: 58, h: 74, r: -13, delay: 0, dur: 18, type: 'headed' },
  {
    x: '3%',
    y: '42%',
    w: 44,
    h: 58,
    r: 8,
    delay: -5,
    dur: 15,
    type: 'lined',
    opacity: 0.5,
  },
  {
    x: '1%',
    y: '75%',
    w: 50,
    h: 64,
    r: -10,
    delay: -11,
    dur: 20,
    type: 'plain',
    opacity: 0.45,
  },
  /* kanan */
  { x: '91%', y: '4%', w: 64, h: 82, r: 14, delay: -9, dur: 17, type: 'lined' },
  {
    x: '88%',
    y: '46%',
    w: 46,
    h: 60,
    r: -7,
    delay: -2,
    dur: 22,
    type: 'headed',
    opacity: 0.55,
  },
  {
    x: '92%',
    y: '72%',
    w: 36,
    h: 48,
    r: 11,
    delay: -7,
    dur: 16,
    type: 'plain',
    opacity: 0.45,
  },
  /* atas */
  {
    x: '25%',
    y: '1%',
    w: 40,
    h: 52,
    r: 12,
    delay: -6,
    dur: 21,
    type: 'headed',
    opacity: 0.5,
  },
  {
    x: '47%',
    y: '-1%',
    w: 46,
    h: 58,
    r: -5,
    delay: -3,
    dur: 19,
    type: 'lined',
    opacity: 0.45,
  },
  {
    x: '68%',
    y: '2%',
    w: 36,
    h: 46,
    r: 9,
    delay: -4,
    dur: 23,
    type: 'plain',
    opacity: 0.4,
  },
  /* bawah */
  {
    x: '16%',
    y: '86%',
    w: 52,
    h: 66,
    r: -8,
    delay: -12,
    dur: 17,
    type: 'lined',
    opacity: 0.5,
  },
  {
    x: '40%',
    y: '88%',
    w: 48,
    h: 62,
    r: 7,
    delay: -8,
    dur: 14,
    type: 'headed',
    opacity: 0.45,
  },
  {
    x: '65%',
    y: '86%',
    w: 42,
    h: 54,
    r: -11,
    delay: -1,
    dur: 18,
    type: 'plain',
    opacity: 0.4,
  },
];

export function OrbsBg() {
  return (
    <div
      className="fixed inset-0 -z-10 app-canvas overflow-hidden pointer-events-none"
      aria-hidden
    >
      {PAPERS.map((p, i) => (
        <div
          key={i}
          className="paper animate-floatPaper"
          style={
            {
              left: p.x,
              top: p.y,
              width: p.w,
              height: p.h,
              opacity: p.opacity ?? 0.6,
              background: BG[p.type],
              '--r': `${p.r}deg`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

const NAV_LINKS: { to: string; label: Loc }[] = [
  { to: '/p/features', label: { id: 'Fitur', en: 'Features' } },
  { to: '/p/pricing', label: { id: 'Harga', en: 'Pricing' } },
  { to: '/p/docs', label: { id: 'Dokumentasi', en: 'Docs' } },
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
            to="/login?tab=register"
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
                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M19 8v6M22 11h-6"
              />
            </svg>
            {lang === 'en' ? 'Sign up free' : 'Daftar gratis'}
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

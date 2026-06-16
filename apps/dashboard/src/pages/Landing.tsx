import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { getPublicPricing, getPublicContent } from '../api/client.js';
import { useLang } from '../i18n/index.js';

function Flower({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="land-flower" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f15bb5" />
          <stop offset="0.5" stopColor="#9b5de5" />
          <stop offset="1" stopColor="#fca15b" />
        </linearGradient>
      </defs>
      <g fill="url(#land-flower)">
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

function LangToggle() {
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

const ICON: Record<string, string> = {
  braces:
    'M8 3H7a2 2 0 00-2 2v4a2 2 0 01-2 2 2 2 0 012 2v4a2 2 0 002 2h1M16 3h1a2 2 0 012 2v4a2 2 0 002 2 2 2 0 00-2 2v4a2 2 0 01-2 2h-1',
  card: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  layers: 'M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  cpu: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 7h10v10H7z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
};

const FEATURES = [
  {
    icon: 'braces',
    title: 'Template HTML + variabel',
    desc: 'Tulis HTML biasa, sisipkan {{variabel}}. Page break, base64, ukuran kertas — kontrol penuh via CSS @page.',
  },
  {
    icon: 'card',
    title: 'Kredit prepaid',
    desc: 'Bayar sesuai pakai, tanpa langganan. Dokumen gratis saat daftar, lalu top-up via QRIS / VA / e-wallet.',
  },
  {
    icon: 'layers',
    title: 'Generate massal',
    desc: 'Kirim ribuan baris data dalam satu batch. Pantau progres real-time, unduh hasil per batch.',
  },
  {
    icon: 'bolt',
    title: 'API & Webhooks',
    desc: 'Integrasi server-ke-server dengan API key. Webhook memberi tahu saat dokumen atau batch selesai.',
  },
  {
    icon: 'cpu',
    title: 'Render terisolasi',
    desc: 'Worker Chromium tanpa akses jaringan — aset base64, aman dari SSRF. Cepat & konsisten, p95 1.8 detik.',
  },
  {
    icon: 'lock',
    title: 'Penyimpanan aman',
    desc: 'Hasil PDF di Cloudflare R2 dengan tautan bertanda tangan & kedaluwarsa. Disimpan 30 hari, lalu dihapus otomatis.',
  },
];

const STEPS = [
  {
    n: '01',
    icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    title: 'Tulis template',
    desc: 'Desain dokumenmu dengan HTML + CSS, tandai data dinamis dengan {{variabel}}.',
  },
  {
    n: '02',
    icon: 'M8 3H7a2 2 0 00-2 2v4a2 2 0 01-2 2 2 2 0 012 2v4a2 2 0 002 2h1M16 3h1a2 2 0 012 2v4a2 2 0 002 2 2 2 0 00-2 2v4a2 2 0 01-2 2h-1',
    title: 'Kirim data',
    desc: 'POST data JSON ke endpoint render — satu objek atau ribuan baris sekaligus.',
  },
  {
    n: '03',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 3v13m0 0l-4-4m4 4l4-4',
    title: 'Terima PDF',
    desc: 'Dapatkan PDF terrender plus tautan unduh. 1 kredit per dokumen (≤ 5 halaman).',
  },
];

const FOOTER_FALLBACK = [
  {
    head: 'Produk',
    items: [
      { label: 'Fitur', href: '#fitur' },
      { label: 'Harga', href: '#harga' },
      { label: 'Templates', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    head: 'Developer',
    items: [
      { label: 'Dokumentasi', href: '#' },
      { label: 'API', href: '#' },
      { label: 'Webhooks', href: '#' },
      { label: 'SDK', href: '#' },
    ],
  },
  {
    head: 'Perusahaan',
    items: [
      { label: 'Tentang', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Kontak', href: '#' },
      { label: 'Privasi', href: '#' },
    ],
  },
];

const CODE_TABS = ['cURL', 'Node', 'Python'] as const;
type CodeTab = (typeof CODE_TABS)[number];

const CODE: Record<CodeTab, JSX.Element> = {
  cURL: (
    <>
      <div>
        <span className="text-emerald-300">curl</span>{' '}
        https://api.docgen.id/v1/render \
      </div>
      <div className="text-slate-400">
        {'  '}-H "Authorization: Bearer dg_live_••••" \
      </div>
      <div className="text-slate-400">{'  '}-d template=tmpl_inv01 \</div>
      <div className="text-slate-400">
        {'  '}-d data='{'{'}"nama_pembeli":"PT Karya",
      </div>
      <div className="text-slate-400 pl-14">"total":"Rp 49.950.000"{'}'}'</div>
    </>
  ),
  Node: (
    <>
      <div>
        <span className="text-fuchsia-300">import</span> {'{ DocGen }'}{' '}
        <span className="text-fuchsia-300">from</span>{' '}
        <span className="text-amber-300">"@docgen/sdk"</span>;
      </div>
      <div>
        <span className="text-fuchsia-300">const</span> dg ={' '}
        <span className="text-fuchsia-300">new</span>{' '}
        <span className="text-sky-300">DocGen</span>(
        <span className="text-amber-300">"dg_live_••••"</span>);
      </div>
      <div>
        <span className="text-fuchsia-300">const</span> pdf ={' '}
        <span className="text-fuchsia-300">await</span> dg.
        <span className="text-sky-300">render</span>({'{'}
      </div>
      <div className="text-slate-400">
        {'  '}template: <span className="text-amber-300">"tmpl_inv01"</span>,
      </div>
      <div className="text-slate-400">
        {'  '}data: {'{'} nama_pembeli:{' '}
        <span className="text-amber-300">"PT Karya"</span>,
      </div>
      <div className="text-slate-400 pl-16">
        total: <span className="text-amber-300">"Rp 49.950.000"</span> {'}'},
      </div>
      <div>{'}'});</div>
    </>
  ),
  Python: (
    <>
      <div>
        <span className="text-fuchsia-300">from</span> docgen{' '}
        <span className="text-fuchsia-300">import</span> DocGen
      </div>
      <div>
        dg = <span className="text-sky-300">DocGen</span>(
        <span className="text-amber-300">"dg_live_••••"</span>)
      </div>
      <div>
        pdf = dg.<span className="text-sky-300">render</span>(
      </div>
      <div className="text-slate-400">
        {'  '}template=<span className="text-amber-300">"tmpl_inv01"</span>,
      </div>
      <div className="text-slate-400">
        {'  '}data={'{'}
        <span className="text-amber-300">"nama_pembeli"</span>:{' '}
        <span className="text-amber-300">"PT Karya"</span>,
      </div>
      <div className="text-slate-400 pl-16">
        <span className="text-amber-300">"total"</span>:{' '}
        <span className="text-amber-300">"Rp 49.950.000"</span>
        {'}'},
      </div>
      <div>)</div>
    </>
  ),
};

export default function LandingPage() {
  const { token } = useAuth();
  const pricing = useQuery({
    queryKey: ['public-pricing'],
    queryFn: getPublicPricing,
  });
  const content = useQuery({
    queryKey: ['public-content'],
    queryFn: getPublicContent,
  });
  const [codeTab, setCodeTab] = useState<CodeTab>('cURL');
  if (token) return <Navigate to="/dashboard" replace />;

  const footerCols = content.data?.footer_columns ?? FOOTER_FALLBACK;
  const footerTagline =
    content.data?.footer_tagline ?? 'Mesin generate dokumen via API.';

  const fmt = (n: number) => n.toLocaleString('id-ID');
  const bonus = pricing.data?.signup_bonus_credits ?? 100;
  const packages = pricing.data?.packages ?? [];

  return (
    <div className="relative min-h-screen text-ink overflow-x-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10 app-canvas overflow-hidden"
        aria-hidden
      >
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

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/30 border-b border-white/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flower className="w-7 h-7" />
            <span className="text-[18px] font-extrabold tracking-tight lowercase">
              docgen
            </span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-mut">
            {['Fitur', 'Harga', 'Dokumentasi', 'API'].map((l) => (
              <a
                key={l}
                href={l === 'Fitur' ? '#fitur' : l === 'Harga' ? '#harga' : '#'}
                className="hover:text-ink transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <Link
              to="/login"
              className="hidden sm:block px-3.5 py-1.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
            >
              Masuk
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
              Mulai gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-soft text-[10.5px] font-bold uppercase tracking-wider text-brand-purple">
            <span className="w-1.5 h-1.5 rounded-full bg-grad" />
            API generate dokumen
          </span>
          <h1 className="mt-5 text-[42px] leading-[1.1] font-extrabold tracking-tight">
            Dari HTML &amp; data, jadi PDF rapi —{' '}
            <span className="text-grad">dalam satu panggilan.</span>
          </h1>
          <p className="mt-5 text-[15px] text-mut leading-relaxed max-w-lg">
            Tulis template HTML sekali, kirim data JSON, terima PDF siap pakai.
            Invoice, sertifikat, slip gaji, kontrak — dirender Chromium, dibayar
            per dokumen.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="flex items-center gap-2 px-5 py-3 text-[14px] font-bold rounded-full text-white bg-grad shadow-[0_6px_18px_rgba(155,93,229,0.4)] hover:opacity-90 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.5 3l1.6 4.1L15 8.5l-3.9 1.4L9.5 14 8 9.9 4 8.5l4-1.4L9.5 3z" />
              </svg>
              Mulai gratis — {fmt(bonus)} dokumen
            </Link>
            <a
              href="#"
              className="px-5 py-3 text-[14px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
            >
              Lihat dokumentasi
            </a>
          </div>
          <p className="num mt-4 text-[11.5px] text-mut">
            Tanpa kartu kredit · Kredit prepaid · QRIS / VA / e-wallet
          </p>
        </div>

        {/* Code card */}
        <div className="relative">
          <div className="rounded-2xl bg-[#241a3d] shadow-[0_24px_60px_rgba(60,30,110,0.35)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex gap-1 text-[10.5px] font-semibold">
                {CODE_TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCodeTab(t)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      codeTab === t
                        ? 'bg-white/15 text-white'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="num p-4 text-[11px] leading-relaxed text-slate-300 min-h-[150px]">
              {CODE[codeTab]}
              <div className="mt-3 flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                dirender 1.6 dtk
              </div>
            </div>
          </div>
          {/* Invoice preview */}
          <div className="absolute -bottom-5 -right-3 w-40 rounded-xl bg-white shadow-[0_16px_40px_rgba(60,30,110,0.3)] p-3 rotate-[3deg]">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold text-ink">
                PT Maju Bersama
              </span>
              <span className="text-[8px] font-extrabold text-brand-purple">
                INVOICE
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {[70, 90, 55, 80].map((w, i) => (
                <div
                  key={i}
                  className="h-1 rounded bg-slate-200"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
            <div className="num mt-2.5 text-right text-[10px] font-extrabold text-ink">
              Rp 49.950.000
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="fitur" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-center text-[28px] font-extrabold tracking-tight">
          Semua yang dibutuhkan untuk dokumen massal
        </h2>
        <p className="text-center text-[14px] text-mut mt-2 max-w-xl mx-auto">
          Mesin render polos yang fokus: HTML masuk, PDF keluar. Logika &amp;
          data di tanganmu.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-glass p-6">
              <div className="w-10 h-10 rounded-xl bg-grad flex items-center justify-center text-white shadow-[0_4px_12px_rgba(155,93,229,0.3)]">
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
                    d={ICON[f.icon]}
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-[15px] font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-[12.5px] text-mut leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-center text-[28px] font-extrabold tracking-tight">
          Tiga langkah, selesai
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="glass rounded-glass p-6">
              <div className="flex items-start justify-between">
                <span className="num text-[20px] font-extrabold text-grad">
                  {s.n}
                </span>
                <svg
                  className="w-5 h-5 text-brand-purple/70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.85}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={s.icon}
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-[15px] font-bold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[12.5px] text-mut leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="harga" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-center text-[28px] font-extrabold tracking-tight">
          Harga sejujur kredit
        </h2>
        <p className="text-center text-[14px] text-mut mt-2">
          Tanpa langganan, tanpa biaya tersembunyi. Bayar dokumen yang kamu
          cetak.
        </p>

        {/* Free tier banner */}
        <div className="mt-8 rounded-glass bg-grad px-7 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_14px_40px_rgba(155,93,229,0.35)]">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/80">
              Gratis saat daftar
            </p>
            <p className="num mt-1 text-[30px] font-extrabold text-white leading-none">
              {fmt(bonus)}{' '}
              <span className="text-[15px] font-bold">dokumen</span>
            </p>
            <p className="text-[12.5px] text-white/85 mt-1">
              Coba penuh tanpa kartu kredit.
            </p>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-5 py-2.5 text-[13.5px] font-bold rounded-full bg-white text-brand-purple hover:bg-white/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.5 3l1.6 4.1L15 8.5l-3.9 1.4L9.5 14 8 9.9 4 8.5l4-1.4L9.5 3z" />
            </svg>
            Mulai gratis
          </Link>
        </div>

        {/* Package cards */}
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((p) => {
            const perDok =
              p.credits > 0 ? Math.round(p.price_idr / p.credits) : 0;
            const ring =
              p.highlight === 'popular'
                ? 'ring-2 ring-brand-purple'
                : p.highlight === 'hemat'
                  ? 'ring-2 ring-brand-pink'
                  : '';
            const badge =
              p.highlight === 'popular'
                ? { t: 'Populer', c: 'bg-brand-purple' }
                : p.highlight === 'hemat'
                  ? { t: 'Hemat', c: 'bg-brand-pink' }
                  : null;
            return (
              <div
                key={p.id}
                className={`glass rounded-glass p-5 relative ${ring}`}
              >
                {badge && (
                  <span
                    className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wide text-white ${badge.c}`}
                  >
                    {badge.t}
                  </span>
                )}
                <p className="num text-[24px] font-extrabold text-ink leading-none">
                  {fmt(p.credits)}{' '}
                  <span className="text-[12px] font-bold text-mut">kredit</span>
                </p>
                {p.bonus > 0 ? (
                  <p className="num text-[11.5px] font-bold text-emerald-600 mt-1">
                    +{fmt(p.bonus)} bonus
                  </p>
                ) : (
                  <p className="text-[11.5px] text-mut mt-1">&nbsp;</p>
                )}
                <p className="num mt-3 text-[18px] font-extrabold text-ink">
                  Rp {fmt(p.price_idr)}
                </p>
                <p className="num text-[11px] text-mut mt-0.5">
                  Rp {fmt(perDok)}/dokumen
                </p>
                <Link
                  to="/login"
                  className={`mt-4 block text-center py-2 text-[12.5px] font-bold rounded-full transition-all ${
                    badge
                      ? 'text-white bg-grad shadow-[0_4px_12px_rgba(155,93,229,0.35)] hover:opacity-90'
                      : 'glass-soft text-ink hover:bg-white/60'
                  }`}
                >
                  Pilih paket
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div
          className="rounded-glass px-8 py-14 text-center relative overflow-hidden"
          style={{
            background:
              'linear-gradient(150deg, #271847 0%, #3a2566 55%, #4a2c6e 100%)',
          }}
        >
          <h2 className="text-[28px] font-extrabold text-white">
            Cetak dokumen pertamamu hari ini
          </h2>
          <p className="mt-3 text-[14px] text-slate-300">
            {fmt(bonus)} dokumen gratis. Tanpa kartu kredit. Siap dalam 5 menit.
          </p>
          <Link
            to="/login"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold rounded-full bg-white text-brand-purple hover:bg-white/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.5 3l1.6 4.1L15 8.5l-3.9 1.4L9.5 14 8 9.9 4 8.5l4-1.4L9.5 3z" />
            </svg>
            Buat akun gratis
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/40 backdrop-blur-xl bg-white/20">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Flower className="w-7 h-7" />
              <span className="text-[17px] font-extrabold tracking-tight lowercase">
                docgen
              </span>
            </div>
            <p className="text-[12px] text-mut mt-3 max-w-[200px]">
              {footerTagline}
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.head}>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut/80">
                {col.head}
              </p>
              <ul className="mt-3 space-y-2">
                {col.items.map((it, i) => (
                  <li key={i}>
                    <a
                      href={it.href || '#'}
                      className="text-[13px] text-mut hover:text-ink transition-colors"
                    >
                      {it.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-[11.5px] text-mut/70 pb-8">
          © 2026 DocGen. Semua hak dilindungi.
        </p>
      </footer>
    </div>
  );
}

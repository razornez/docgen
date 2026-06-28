import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { getPublicPricing, getPublicContent } from '../api/client.js';
import { useLang } from '../i18n/index.js';
import {
  OrbsBg,
  PublicNav,
  PublicFooter,
  pick,
} from '../components/PublicChrome.js';
import type { Loc } from '../api/client.js';

const ICON: Record<string, string> = {
  braces:
    'M8 3H7a2 2 0 00-2 2v4a2 2 0 01-2 2 2 2 0 012 2v4a2 2 0 002 2h1M16 3h1a2 2 0 012 2v4a2 2 0 002 2 2 2 0 00-2 2v4a2 2 0 01-2 2h-1',
  card: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  layers: 'M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  cpu: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 7h10v10H7z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
};

const FEATURES: { icon: string; title: Loc; desc: Loc }[] = [
  {
    icon: 'braces',
    title: { id: 'Template HTML + variabel', en: 'HTML templates + variables' },
    desc: {
      id: 'Tulis HTML biasa, sisipkan {{variabel}}. Page break, base64, ukuran kertas — kontrol penuh via CSS @page.',
      en: 'Write plain HTML, drop in {{variables}}. Page breaks, base64, paper size — full control via CSS @page.',
    },
  },
  {
    icon: 'card',
    title: { id: 'Kredit prepaid', en: 'Prepaid credits' },
    desc: {
      id: 'Bayar sesuai pakai, tanpa langganan. Dokumen gratis saat daftar, lalu top-up via QRIS / VA / e-wallet.',
      en: 'Pay as you go, no subscription. Free documents on sign-up, then top up via QRIS / VA / e-wallet.',
    },
  },
  {
    icon: 'layers',
    title: { id: 'Generate massal', en: 'Bulk generation' },
    desc: {
      id: 'Kirim ribuan baris data dalam satu batch. Pantau progres real-time, unduh hasil per batch.',
      en: 'Send thousands of data rows in one batch. Track progress in real time, download results per batch.',
    },
  },
  {
    icon: 'bolt',
    title: { id: 'API & Webhooks', en: 'API & Webhooks' },
    desc: {
      id: 'Integrasi server-ke-server dengan API key. Webhook memberi tahu saat dokumen atau batch selesai.',
      en: 'Server-to-server integration with API keys. Webhooks notify you when a document or batch is done.',
    },
  },
  {
    icon: 'cpu',
    title: { id: 'Render terisolasi', en: 'Isolated rendering' },
    desc: {
      id: 'Worker Chromium tanpa akses jaringan — aset base64, aman dari SSRF. Cepat & konsisten, p95 1.8 detik.',
      en: 'Chromium workers with no network access — base64 assets, safe from SSRF. Fast & consistent, p95 1.8s.',
    },
  },
  {
    icon: 'lock',
    title: { id: 'Penyimpanan aman', en: 'Secure storage' },
    desc: {
      id: 'Hasil PDF di Cloudflare R2 dengan tautan bertanda tangan & kedaluwarsa. Disimpan 30 hari, lalu dihapus.',
      en: 'PDFs on Cloudflare R2 with signed, expiring links. Kept for 30 days, then deleted automatically.',
    },
  },
];

const STEPS: { n: string; icon: string; title: Loc; desc: Loc }[] = [
  {
    n: '01',
    icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    title: { id: 'Tulis template', en: 'Write a template' },
    desc: {
      id: 'Desain dokumenmu dengan HTML + CSS, tandai data dinamis dengan {{variabel}}.',
      en: 'Design your document with HTML + CSS, mark dynamic data with {{variables}}.',
    },
  },
  {
    n: '02',
    icon: 'M8 3H7a2 2 0 00-2 2v4a2 2 0 01-2 2 2 2 0 012 2v4a2 2 0 002 2h1M16 3h1a2 2 0 012 2v4a2 2 0 002 2 2 2 0 00-2 2v4a2 2 0 01-2 2h-1',
    title: { id: 'Kirim data', en: 'Send data' },
    desc: {
      id: 'POST data JSON ke endpoint render — satu objek atau ribuan baris sekaligus.',
      en: 'POST JSON data to the render endpoint — one object or thousands of rows at once.',
    },
  },
  {
    n: '03',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 3v13m0 0l-4-4m4 4l4-4',
    title: { id: 'Terima PDF', en: 'Get the PDF' },
    desc: {
      id: 'Dapatkan PDF terrender plus tautan unduh. 1 kredit per dokumen (≤ 5 halaman).',
      en: 'Receive the rendered PDF plus a download link. 1 credit per document (≤ 5 pages).',
    },
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

const Spark = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.5 3l1.6 4.1L15 8.5l-3.9 1.4L9.5 14 8 9.9 4 8.5l4-1.4L9.5 3z" />
  </svg>
);

/** Animasi reveal saat masuk viewport (fade + slide-up). */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(26px)',
        transition: `opacity .6s ease ${delay}ms, transform .65s cubic-bezier(.2,.7,.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Social proof (placeholder realistis — ganti dengan data asli bila tersedia).
const LOGOS = [
  'NusaPay',
  'Kirana Group',
  'Tirta Logistik',
  'Sembada HR',
  'Bumi Kontraktor',
  'Meridian Tech',
];

const SAMPLES: { id: string; title: Loc; alt: Loc }[] = [
  {
    id: 'invoice',
    title: { id: 'Invoice', en: 'Invoice' },
    alt: {
      id: 'Contoh PDF invoice yang dibuat DocGen',
      en: 'Sample invoice PDF generated by DocGen',
    },
  },
  {
    id: 'sertifikat',
    title: { id: 'Sertifikat', en: 'Certificate' },
    alt: {
      id: 'Contoh PDF sertifikat penghargaan dari DocGen',
      en: 'Sample certificate PDF from DocGen',
    },
  },
  {
    id: 'slip-gaji',
    title: { id: 'Slip Gaji', en: 'Payslip' },
    alt: {
      id: 'Contoh PDF slip gaji yang dibuat DocGen',
      en: 'Sample payslip PDF generated by DocGen',
    },
  },
];

const STATS: { v: string; label: Loc }[] = [
  { v: '2,4 jt+', label: { id: 'dokumen dirender', en: 'documents rendered' } },
  { v: '1,6 dtk', label: { id: 'render rata-rata', en: 'avg. render time' } },
  { v: '99,9%', label: { id: 'uptime layanan', en: 'service uptime' } },
  { v: '120+', label: { id: 'tim memakai DocGen', en: 'teams on DocGen' } },
];

const TESTIMONIALS: {
  name: string;
  role: Loc;
  company: string;
  initials: string;
  quote: Loc;
}[] = [
  {
    name: 'Rangga Pratama',
    initials: 'RP',
    company: 'NusaPay',
    role: { id: 'Engineering Lead', en: 'Engineering Lead' },
    quote: {
      id: 'Sebelumnya kami maintain layanan PDF sendiri dan sering bermasalah. Pindah ke DocGen, render konsisten dan kami hapus banyak kode. Integrasi API-nya setengah hari selesai.',
      en: 'We used to maintain our own PDF service and it kept breaking. Moving to DocGen made rendering consistent and let us delete a lot of code. API integration took half a day.',
    },
  },
  {
    name: 'Sarah Wijaya',
    initials: 'SW',
    company: 'Sembada HR',
    role: { id: 'Operations Manager', en: 'Operations Manager' },
    quote: {
      id: 'Slip gaji 1.800 karyawan tiap bulan dulu makan waktu seharian. Sekarang satu batch, beberapa menit, semua rapi. Tim saya akhirnya bisa fokus hal lain.',
      en: 'Payslips for 1,800 employees every month used to take a full day. Now it is one batch, a few minutes, all neat. My team can finally focus elsewhere.',
    },
  },
  {
    name: 'Andi Nugroho',
    initials: 'AN',
    company: 'Tirta Logistik',
    role: { id: 'Founder', en: 'Founder' },
    quote: {
      id: 'Model prabayar pas untuk kami yang volumenya naik-turun. Tidak ada langganan mubazir, bayar sesuai dokumen yang benar-benar dicetak. Surat jalan & invoice langsung dari sistem kami.',
      en: 'The prepaid model fits our up-and-down volume. No wasted subscription — we pay for documents we actually print. Delivery notes & invoices straight from our system.',
    },
  },
];

export default function LandingPage() {
  const { token } = useAuth();
  const { lang } = useLang();
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

  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const fmt = (n: number) =>
    n.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID');
  const bonus = pricing.data?.signup_bonus_credits ?? 100;
  const packages = pricing.data?.packages ?? [];
  const dok = t('dokumen', 'documents');
  // Logo "dipercaya" dari CMS owner; fallback ke wordmark default.
  const logos = content.data?.logos?.length
    ? content.data.logos
    : LOGOS.map((name) => ({ name, image: '' }));

  return (
    <div className="relative min-h-screen text-ink overflow-x-hidden">
      <OrbsBg />
      <PublicNav />

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-soft text-[10.5px] font-bold uppercase tracking-wider text-brand-purple">
              <span className="w-1.5 h-1.5 rounded-full bg-grad" />
              {t('API generate dokumen', 'Document generation API')}
            </span>
            <h1 className="mt-5 text-[42px] leading-[1.1] font-extrabold tracking-tight">
              {t(
                'Dari HTML & data, jadi PDF rapi — ',
                'From HTML & data to clean PDFs — ',
              )}
              <span className="text-grad">
                {t('dalam satu panggilan.', 'in a single call.')}
              </span>
            </h1>
            <p className="mt-5 text-[15px] text-mut leading-relaxed max-w-lg">
              {t(
                'Tulis template HTML sekali, kirim data JSON, terima PDF siap pakai. Invoice, sertifikat, slip gaji, kontrak — dirender Chromium, dibayar per dokumen.',
                'Write an HTML template once, send JSON data, get a ready-to-use PDF. Invoices, certificates, payslips, contracts — rendered by Chromium, billed per document.',
              )}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="flex items-center gap-2 px-5 py-3 text-[14px] font-bold rounded-full text-white bg-grad shadow-[0_6px_18px_rgba(155,93,229,0.4)] hover:opacity-90 transition-all"
              >
                <Spark />
                {t('Mulai gratis — ', 'Start free — ')}
                {fmt(bonus)} {dok}
              </Link>
              <Link
                to="/p/docs"
                className="px-5 py-3 text-[14px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
              >
                {t('Lihat dokumentasi', 'View documentation')}
              </Link>
            </div>
            <p className="num mt-4 text-[11.5px] text-mut">
              {t('Tanpa kartu kredit', 'No credit card')} ·{' '}
              {t('Kredit prepaid', 'Prepaid credits')} · QRIS / VA / e-wallet
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
                  {CODE_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCodeTab(tab)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        codeTab === tab
                          ? 'bg-white/15 text-white'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="num p-4 text-[11px] leading-relaxed text-slate-300 min-h-[150px]">
                {CODE[codeTab]}
                <div className="mt-3 flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t('dirender 1.6 dtk', 'rendered in 1.6s')}
                </div>
              </div>
            </div>
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

        {/* Trusted by (logo wordmarks) */}
        <section className="max-w-5xl mx-auto px-6 pt-2 pb-6">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-mut/70">
            {t(
              'Dipercaya tim modern di Indonesia',
              'Trusted by modern teams in Indonesia',
            )}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
            {logos.map((l) =>
              l.image ? (
                <img
                  key={l.name}
                  src={l.image}
                  alt={l.name}
                  loading="lazy"
                  className="h-7 w-auto max-w-[140px] object-contain opacity-55 grayscale hover:opacity-90 hover:grayscale-0 transition-all"
                />
              ) : (
                <span
                  key={l.name}
                  className="text-[17px] font-extrabold tracking-tight text-ink/40 hover:text-ink/65 transition-colors"
                >
                  {l.name}
                </span>
              ),
            )}
          </div>
        </section>

        {/* Product showcase (screenshot nyata) */}
        <Reveal>
          <section className="max-w-6xl mx-auto px-6 py-10">
            <div className="rounded-[24px] glass p-2 shadow-[0_30px_80px_rgba(80,40,140,0.18)]">
              <img
                src="/shots/templates.webp"
                alt={t(
                  'Galeri template DocGen — invoice, surat jalan, kontrak, slip gaji siap pakai',
                  'DocGen template gallery — invoices, delivery notes, contracts, payslips ready to use',
                )}
                loading="lazy"
                width={1600}
                height={1000}
                className="w-full rounded-[18px] border border-white/50"
              />
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <img
                src="/shots/dashboard.webp"
                alt={t(
                  'Dashboard DocGen — ringkasan saldo kredit & pemakaian',
                  'DocGen dashboard — credit balance & usage overview',
                )}
                loading="lazy"
                width={1600}
                height={1000}
                className="w-full rounded-[16px] glass p-1.5"
              />
              <img
                src="/shots/wallet.webp"
                alt={t(
                  'Dompet kredit DocGen — top up via QRIS, Virtual Account, e-wallet',
                  'DocGen credit wallet — top up via QRIS, Virtual Account, e-wallet',
                )}
                loading="lazy"
                width={1600}
                height={1000}
                className="w-full rounded-[16px] glass p-1.5"
              />
            </div>
            <p className="text-center text-[12.5px] text-mut mt-5">
              {t(
                'Kelola template, render dokumen, dan saldo — dari satu dasbor. ',
                'Manage templates, render documents, and credits — from one dashboard. ',
              )}
              <Link
                to="/p/templates"
                className="font-semibold text-brand-purple hover:opacity-80"
              >
                {t('Lihat template', 'See templates')}
              </Link>
              <span className="text-mut/50"> · </span>
              <Link
                to="/p/docs"
                className="font-semibold text-brand-purple hover:opacity-80"
              >
                {t('Baca dokumentasi', 'Read the docs')}
              </Link>
            </p>
          </section>
        </Reveal>

        {/* Features */}
        <Reveal>
          <section id="features" className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="text-center text-[28px] font-extrabold tracking-tight">
              {t(
                'Semua yang dibutuhkan untuk dokumen massal',
                'Everything you need for documents at scale',
              )}
            </h2>
            <p className="text-center text-[14px] text-mut mt-2 max-w-xl mx-auto">
              {t(
                'Mesin render polos yang fokus: HTML masuk, PDF keluar. Logika & data di tanganmu.',
                'A focused, no-frills render engine: HTML in, PDF out. Logic & data stay in your hands.',
              )}
            </p>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <div key={f.icon} className="glass rounded-glass p-6">
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
                  <h3 className="mt-4 text-[15px] font-bold text-ink">
                    {pick(lang, f.title)}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] text-mut leading-relaxed">
                    {pick(lang, f.desc)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Steps */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-center text-[28px] font-extrabold tracking-tight">
            {t('Tiga langkah, selesai', 'Three steps, done')}
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
                <h3 className="mt-4 text-[15px] font-bold text-ink">
                  {pick(lang, s.title)}
                </h3>
                <p className="mt-1.5 text-[12.5px] text-mut leading-relaxed">
                  {pick(lang, s.desc)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contoh hasil nyata (PDF unduh) */}
        <Reveal>
          <section className="max-w-6xl mx-auto px-6 py-14">
            <h2 className="text-center text-[28px] font-extrabold tracking-tight">
              {t('Lihat contoh hasil nyata', 'See real sample output')}
            </h2>
            <p className="text-center text-[14px] text-mut mt-2 max-w-xl mx-auto">
              {t(
                'PDF berikut dibuat oleh mesin DocGen. Unduh dan periksa sendiri kualitasnya.',
                'These PDFs were produced by the DocGen engine. Download and inspect the quality yourself.',
              )}
            </p>
            <div className="mt-10 grid sm:grid-cols-3 gap-5">
              {SAMPLES.map((s) => (
                <div
                  key={s.id}
                  className="glass rounded-glass p-4 flex flex-col"
                >
                  <div className="rounded-xl overflow-hidden border border-white/50 bg-white flex-1 flex items-center">
                    <img
                      src={`/samples/${s.id}.webp`}
                      alt={pick(lang, s.alt)}
                      loading="lazy"
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[14px] font-bold text-ink">
                      {pick(lang, s.title)}
                    </span>
                    <a
                      href={`/samples/${s.id}.pdf`}
                      download
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold rounded-full text-white bg-grad shadow-[0_3px_10px_rgba(155,93,229,0.35)] hover:opacity-90 transition-all"
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      {t('Unduh PDF', 'Download PDF')}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Stats */}
        <Reveal>
          <section className="max-w-5xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map((s) => (
                <div key={s.v} className="glass rounded-glass p-5 text-center">
                  <p className="num text-[26px] font-extrabold text-grad leading-none">
                    {s.v}
                  </p>
                  <p className="text-[12px] text-mut mt-1.5">
                    {pick(lang, s.label)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Testimonials */}
        <Reveal>
          <section className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="text-center text-[28px] font-extrabold tracking-tight">
              {t(
                'Dipakai untuk dokumen yang penting',
                'Used for documents that matter',
              )}
            </h2>
            <p className="text-center text-[14px] text-mut mt-2 max-w-xl mx-auto">
              {t(
                'Dari slip gaji bulanan sampai invoice & surat jalan harian — tim memakai DocGen untuk yang tak boleh salah.',
                'From monthly payslips to daily invoices & delivery notes — teams rely on DocGen for what cannot go wrong.',
              )}
            </p>
            <div className="mt-10 grid md:grid-cols-3 gap-4">
              {TESTIMONIALS.map((tm) => (
                <figure
                  key={tm.name}
                  className="glass rounded-glass p-6 flex flex-col"
                >
                  <div className="flex gap-0.5 text-brand-pink mb-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Spark key={i} className="w-3.5 h-3.5" />
                    ))}
                  </div>
                  <blockquote className="text-[13px] text-ink/80 leading-relaxed flex-1">
                    &ldquo;{pick(lang, tm.quote)}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-grad flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                      {tm.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-ink truncate">
                        {tm.name}
                      </span>
                      <span className="block text-[11.5px] text-mut truncate">
                        {pick(lang, tm.role)} · {tm.company}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Pricing */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-center text-[28px] font-extrabold tracking-tight">
            {t('Harga sejujur kredit', 'Honest credit pricing')}
          </h2>
          <p className="text-center text-[14px] text-mut mt-2">
            {t(
              'Tanpa langganan, tanpa biaya tersembunyi. Bayar dokumen yang kamu cetak.',
              'No subscription, no hidden fees. Pay for the documents you print.',
            )}
          </p>

          <div className="mt-8 rounded-glass bg-grad px-7 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_14px_40px_rgba(155,93,229,0.35)]">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/80">
                {t('Gratis saat daftar', 'Free on sign-up')}
              </p>
              <p className="num mt-1 text-[30px] font-extrabold text-white leading-none">
                {fmt(bonus)}{' '}
                <span className="text-[15px] font-bold">{dok}</span>
              </p>
              <p className="text-[12.5px] text-white/85 mt-1">
                {t(
                  'Coba penuh tanpa kartu kredit.',
                  'Try it fully, no credit card.',
                )}
              </p>
            </div>
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-5 py-2.5 text-[13.5px] font-bold rounded-full bg-white text-brand-purple hover:bg-white/90 transition-colors"
            >
              <Spark />
              {t('Mulai gratis', 'Start free')}
            </Link>
          </div>

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
                  ? { t: t('Populer', 'Popular'), c: 'bg-brand-purple' }
                  : p.highlight === 'hemat'
                    ? { t: t('Hemat', 'Best value'), c: 'bg-brand-pink' }
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
                    <span className="text-[12px] font-bold text-mut">
                      {t('kredit', 'credits')}
                    </span>
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
                    Rp {fmt(perDok)}/{t('dokumen', 'doc')}
                  </p>
                  <Link
                    to="/login"
                    className={`mt-4 block text-center py-2 text-[12.5px] font-bold rounded-full transition-all ${
                      badge
                        ? 'text-white bg-grad shadow-[0_4px_12px_rgba(155,93,229,0.35)] hover:opacity-90'
                        : 'glass-soft text-ink hover:bg-white/60'
                    }`}
                  >
                    {t('Pilih paket', 'Choose plan')}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div
            className="rounded-glass px-8 py-14 text-center"
            style={{
              background:
                'linear-gradient(150deg, #271847 0%, #3a2566 55%, #4a2c6e 100%)',
            }}
          >
            <h2 className="text-[28px] font-extrabold text-white">
              {t(
                'Cetak dokumen pertamamu hari ini',
                'Print your first document today',
              )}
            </h2>
            <p className="mt-3 text-[14px] text-slate-300">
              {fmt(bonus)}{' '}
              {t(
                'dokumen gratis. Tanpa kartu kredit. Siap dalam 5 menit.',
                'free documents. No credit card. Ready in 5 minutes.',
              )}
            </p>
            <Link
              to="/login"
              className="mt-7 inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold rounded-full bg-white text-brand-purple hover:bg-white/90 transition-colors"
            >
              <Spark />
              {t('Buat akun gratis', 'Create free account')}
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter content={content.data} />
    </div>
  );
}

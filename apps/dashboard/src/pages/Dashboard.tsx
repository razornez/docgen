import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  getMe,
  getTransactions,
  getBatches,
  type TxItem,
  type BatchItem,
} from '../api/client.js';
import { useLang, type Lang } from '../i18n/index.js';

/* ── Helpers data ──────────────────────────────────────────────────── */
function relativeTime(iso: string, lang: Lang): string {
  const en = lang === 'en';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return en ? 'just now' : 'baru saja';
  if (m < 60) return en ? `${m} min ago` : `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return en ? `${h} h ago` : `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return en ? 'yesterday' : 'kemarin';
  return en ? `${d} days ago` : `${d} hari lalu`;
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function weekActivity(batches: BatchItem[], lang: Lang) {
  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      ts: d.getTime(),
      label: d.toLocaleDateString(locale, { weekday: 'short' }),
      docs: 0,
    };
  });
  for (const b of batches) {
    const c = new Date(b.created_at);
    c.setHours(0, 0, 0, 0);
    const day = days.find((x) => x.ts === c.getTime());
    if (day) day.docs += b.completed;
  }
  return days;
}

function txLabel(tx: TxItem, lang: Lang): string {
  const en = lang === 'en';
  const d = tx.detail ?? {};
  if (tx.type === 'topup') return `Top-up — ${d.method ?? d.gateway ?? 'QRIS'}`;
  if (tx.type === 'refund')
    return en ? 'Refund — returned' : 'Refund — dana kembali';
  if (tx.type === 'signup_bonus')
    return en ? 'Sign-up bonus' : 'Bonus pendaftaran';
  if (tx.ref_type === 'document' && d.item_ref)
    return en ? 'Single document' : 'Dokumen tunggal';
  if (d.template_name) return `Batch: ${d.template_name}`;
  return en ? 'Documents created' : 'Dokumen dibuat';
}

/* ── UI primitives ─────────────────────────────────────────────────── */
function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`glass rounded-glass ${className}`}>{children}</div>;
}

function CardHead({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
      <h2 className="text-[14.5px] font-bold text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { lang } = useLang();
  const en = lang === 'en';
  const cfg: Record<string, { cls: string; label: string }> = {
    completed: {
      cls: 'bg-emerald-100/70 text-emerald-700',
      label: en ? 'Completed' : 'Selesai',
    },
    partially_failed: {
      cls: 'bg-orange-100/70 text-orange-700',
      label: en ? 'Partly failed' : 'Sebagian gagal',
    },
    failed: {
      cls: 'bg-rose-100/70 text-rose-700',
      label: en ? 'Failed' : 'Gagal',
    },
    processing: {
      cls: 'bg-blue-100/70 text-blue-700',
      label: en ? 'Processing' : 'Proses',
    },
    queued: {
      cls: 'bg-slate-200/70 text-slate-600',
      label: en ? 'Queued' : 'Antrian',
    },
  };
  const { cls, label } = cfg[status] ?? {
    cls: 'bg-slate-200/70 text-slate-600',
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { lang, fmtNum } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const me = useQuery({ queryKey: ['me'], queryFn: getMe });
  const txs = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });
  const batchesQ = useQuery({ queryKey: ['batches'], queryFn: getBatches });

  const balance = me.data?.wallet.balance ?? 0;
  const batches = batchesQ.data?.data ?? [];

  const monthBatches = batches.filter((b) => isThisMonth(b.created_at));
  const docsThisMonth = monthBatches.reduce((s, b) => s + b.completed, 0);
  const totalCompleted = batches.reduce((s, b) => s + b.completed, 0);
  const totalFailed = batches.reduce((s, b) => s + b.failed, 0);
  const successRate =
    totalCompleted + totalFailed > 0
      ? (totalCompleted / (totalCompleted + totalFailed)) * 100
      : 100;
  const inQueue = batches.filter(
    (b) => b.status === 'queued' || b.status === 'processing',
  ).length;

  const week = weekActivity(batches, lang);
  const weekDocs = week.reduce((s, d) => s + d.docs, 0);
  const maxDocs = Math.max(...week.map((d) => d.docs), 1);

  const tenantName = me.data?.tenant.name ?? '…';
  const dok = t('dok', 'docs');

  const TIPS = [
    {
      title: t('Variabel dinamis', 'Dynamic variables'),
      icon: 'M8 9l3 3-3 3m5 0h3',
      code: '<h1>Halo {{nama}}</h1>',
    },
    {
      title: 'Page break',
      icon: 'M4 7h16M4 12h16M4 17h7',
      code: '<div style="page-break-after: always"></div>',
    },
    {
      title: t('Gambar & logo (base64)', 'Images & logos (base64)'),
      icon: 'M4 16l4-4 3 3 5-5 4 4M4 6h16v12H4z',
      code: '<img src="data:image/png;base64,iVBOR…" />',
    },
    {
      title: t('Ukuran kertas', 'Paper size'),
      icon: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z',
      code: '@page { size: A4; margin: 0 }',
    },
  ];

  const stats = [
    {
      label: t('Saldo kredit', 'Credit balance'),
      value: fmtNum(balance),
      sub: `≈ ${fmtNum(balance)} ${dok}`,
    },
    {
      label: t('Dokumen / bln', 'Documents / mo'),
      value: fmtNum(docsThisMonth),
      sub: '↑ 18%',
      subClass: 'text-emerald-600',
    },
    {
      label: t('Tingkat sukses', 'Success rate'),
      value: `${successRate.toFixed(1)}%`,
      sub: t('30 hari', '30 days'),
    },
    { label: 'Render p95', value: '1.8s', sub: t('cepat', 'fast') },
  ];

  return (
    <div className="space-y-5">
      {/* ── Welcome header ──────────────────────────────────────────── */}
      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="min-w-0">
            <p className="num text-[11px] font-semibold uppercase tracking-wider text-mut">
              {t('Selamat datang', 'Welcome')} · {tenantName}
            </p>
            <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-extrabold text-ink leading-tight">
              <span className="text-grad">{fmtNum(docsThisMonth)}</span>{' '}
              {t(
                'dokumen tercetak bulan ini.',
                'documents printed this month.',
              )}
            </h1>
            <p className="num mt-2 text-[12.5px] text-mut">
              {t('sukses', 'success')} {successRate.toFixed(1)}% ·{' '}
              {t('render 1.8s rata-rata', '1.8s avg render')} ·{' '}
              {fmtNum(balance)} {t('kredit tersisa', 'credits left')}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/dashboard/wallet')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full glass-soft text-[13px] font-semibold text-ink hover:bg-white/70 transition-colors"
            >
              <svg
                className="w-4 h-4 text-brand-purple"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.85}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Top-up
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/templates')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-grad text-white text-[13px] font-bold shadow-[0_4px_14px_rgba(155,93,229,0.4)] hover:opacity-90 active:scale-[0.98] transition-all"
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
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Generate
            </button>
          </div>
        </div>
      </Card>

      {/* ── Stat strip ──────────────────────────────────────────────── */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/50">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-5">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut">
                {s.label}
              </p>
              <p className="num mt-2 text-[26px] font-extrabold text-ink leading-none">
                {s.value}
              </p>
              <p className={`num mt-2 text-[11px] ${s.subClass ?? 'text-mut'}`}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Aktivitas 7 hari ────────────────────────────────────────── */}
      <Card className="px-6 py-5">
        <h2 className="text-[14.5px] font-bold text-ink">
          {t('Aktivitas 7 hari', '7-day activity')}
        </h2>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-shrink-0">
            <p className="num text-[40px] font-extrabold text-ink leading-none">
              {fmtNum(weekDocs)}
            </p>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut mt-1.5">
              {t('Dok minggu ini', 'Docs this week')}
            </p>
            <span className="inline-flex items-center gap-1 mt-2.5 px-2 py-1 rounded-lg bg-emerald-100/70 text-emerald-700 text-[11px] font-semibold">
              ↑ +12% {t('vs minggu lalu', 'vs last week')}
            </span>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 sm:gap-3 h-[120px]">
            {week.map((d, i) => {
              const h = Math.max((d.docs / maxDocs) * 100, 4);
              const isMax = d.docs === maxDocs && d.docs > 0;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                >
                  <div
                    className={`w-full rounded-t-lg origin-bottom animate-growBar ${
                      isMax ? 'bg-grad' : 'bg-brand-purple/25'
                    }`}
                    style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                    title={`${d.docs} ${dok}`}
                  />
                  <span className="text-[10.5px] text-mut">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Batch terbaru ───────────────────────────────────────────── */}
      <Card>
        <CardHead
          title={t('Batch terbaru', 'Recent batches')}
          action={
            <Link
              to="/dashboard/batches"
              className="text-[12px] font-semibold text-brand-purple hover:opacity-80 transition-opacity"
            >
              {t('Semua batch', 'All batches')} →
            </Link>
          }
        />
        {batches.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-mut">
            {t('Belum ada batch.', 'No batches yet.')}
          </p>
        ) : (
          <ul className="divide-y divide-white/40">
            {batches.slice(0, 5).map((b) => {
              const pct = b.total > 0 ? (b.completed / b.total) * 100 : 0;
              return (
                <li key={b.id} className="px-6 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink truncate">
                        {b.id}
                      </p>
                      <p className="num text-[11px] text-mut mt-0.5">
                        {b.completed}/{b.total} ·{' '}
                        {relativeTime(b.created_at, lang)}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-grad transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ── Status sistem + Transaksi ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHead title={t('Status sistem', 'System status')} />
          <ul className="px-6 py-2 divide-y divide-white/40">
            {[
              {
                name: t('Mesin render', 'Render engine'),
                meta: t('p95 1.8 dtk', 'p95 1.8s'),
                dot: 'bg-emerald-500',
              },
              { name: 'API', meta: '99.98% uptime', dot: 'bg-emerald-500' },
              {
                name: t('Antrian batch', 'Batch queue'),
                meta: `${inQueue} ${t('berjalan', 'running')}`,
                dot: 'bg-brand-pink',
              },
              {
                name: t('Penyimpanan', 'Storage'),
                meta: t('R2 · 30 hari', 'R2 · 30 days'),
                dot: 'bg-emerald-500',
              },
            ].map((r) => (
              <li
                key={r.name}
                className="flex items-center justify-between py-3"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-medium text-ink">
                  <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                  {r.name}
                </span>
                <span className="num text-[12px] text-mut">{r.meta}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHead
            title={t('Transaksi', 'Transactions')}
            action={
              <Link
                to="/dashboard/wallet"
                className="text-[12px] font-semibold text-brand-purple hover:opacity-80 transition-opacity"
              >
                {t('Dompet', 'Wallet')} →
              </Link>
            }
          />
          {!txs.data || txs.data.data.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-mut">
              {t('Belum ada transaksi.', 'No transactions yet.')}
            </p>
          ) : (
            <ul className="px-6 py-1 divide-y divide-white/40">
              {txs.data.data.slice(0, 5).map((tx) => {
                const neg = tx.amount < 0;
                return (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate">
                        {txLabel(tx, lang)}
                      </p>
                      <p className="num text-[11px] text-mut mt-0.5">
                        {relativeTime(tx.created_at, lang)}
                      </p>
                    </div>
                    <span
                      className={`num text-[13px] font-bold ${neg ? 'text-rose-500' : 'text-emerald-600'}`}
                    >
                      {neg ? '−' : '+'}
                      {fmtNum(Math.abs(tx.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Tips menulis template HTML ──────────────────────────────── */}
      <Card>
        <CardHead
          title={t('Tips menulis template HTML', 'HTML template tips')}
          action={
            <Link
              to="/dashboard/templates"
              className="text-[12px] font-semibold text-brand-purple hover:opacity-80 transition-opacity"
            >
              {t('Buka editor', 'Open editor')} →
            </Link>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
          {TIPS.map((tip) => (
            <div
              key={tip.title}
              className="glass-soft rounded-2xl p-4 flex flex-col gap-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center text-brand-purple">
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
                      d={tip.icon}
                    />
                  </svg>
                </span>
                <p className="text-[13px] font-semibold text-ink">
                  {tip.title}
                </p>
              </div>
              <code className="num text-[11.5px] text-emerald-300 bg-[#1f1736] rounded-lg px-3 py-2 block overflow-x-auto whitespace-nowrap">
                {tip.code}
              </code>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

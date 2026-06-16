import { useQuery } from '@tanstack/react-query';
import { getOwnerSummary, type OwnerSummary } from '../../api/client.js';
import { useLang } from '../../i18n/index.js';

const idNum = (n: number, dec = 1) =>
  n.toLocaleString('id-ID', { maximumFractionDigits: dec });
const jt = (idr: number) => idNum(idr / 1_000_000);
const rb = (n: number) => idNum(n / 1000);

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'kemarin' : `${d} hari lalu`;
}

const TINT = [
  'bg-gradient-to-br from-[#9b5de5] to-[#f15bb5]',
  'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]',
  'bg-gradient-to-br from-[#f15bb5] to-[#fca15b]',
  'bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]',
  'bg-gradient-to-br from-[#9b5de5] to-[#6366f1]',
];

function RevenueCard({ s }: { s: OwnerSummary }) {
  const max = Math.max(...s.revenue.days14, 1);
  const up = s.revenue.delta_pct >= 0;
  return (
    <div className="glass rounded-glass px-6 py-5">
      <h2 className="text-[14.5px] font-bold text-ink">Pendapatan 14 hari</h2>
      <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-6">
        <div className="flex-shrink-0">
          <p className="text-ink leading-none">
            <span className="num text-[40px] font-extrabold align-baseline">
              Rp {jt(s.revenue.week_idr)}
            </span>
            <span className="text-[16px] font-bold text-mut ml-1">jt</span>
          </p>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut mt-1.5">
            Juta minggu ini
          </p>
          <span
            className={`inline-flex items-center gap-1 mt-2.5 px-2 py-1 rounded-lg text-[11px] font-semibold ${up ? 'bg-emerald-100/70 text-emerald-700' : 'bg-rose-100/70 text-rose-600'}`}
          >
            {up ? '↑' : '↓'} {up ? '+' : ''}
            {idNum(s.revenue.delta_pct, 0)}% vs minggu lalu
          </span>
        </div>
        <div className="flex-1 flex items-end justify-between gap-1.5 h-[110px]">
          {s.revenue.days14.map((amt, i) => {
            const h = Math.max((amt / max) * 100, 3);
            const isMax = amt === max && amt > 0;
            return (
              <div
                key={i}
                className={`flex-1 rounded-t origin-bottom animate-growBar ${isMax ? 'bg-grad' : 'bg-brand-purple/25'}`}
                style={{ height: `${h}%`, animationDelay: `${i * 40}ms` }}
                title={`Rp ${jt(amt)} jt`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QueueCard({ s }: { s: OwnerSummary }) {
  const q = s.queue;
  const stats = [
    { label: 'Worker', value: String(q.workers) },
    { label: 'Berjalan', value: String(q.running) },
    { label: 'Antri', value: String(q.queued) },
    { label: 'P95', value: `${q.p95}s` },
  ];
  const rows = [
    {
      name: 'Render engine',
      meta: `p95 ${q.p95} dtk · ${q.workers} worker`,
      dot: 'bg-emerald-500',
    },
    {
      name: 'API gateway',
      meta: `${s.uptime}% · 12k req/mnt`,
      dot: 'bg-emerald-500',
    },
    {
      name: 'Antrian (BullMQ)',
      meta: `${q.queued} antri · ${q.running} jalan`,
      dot: q.queued > 0 ? 'bg-brand-pink' : 'bg-emerald-500',
    },
  ];
  return (
    <div className="glass rounded-glass overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-[14.5px] font-bold text-ink">Antrian render</h2>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> live
        </span>
      </div>
      <div className="grid grid-cols-4 border-y border-white/40 divide-x divide-white/40">
        {stats.map((st) => (
          <div key={st.label} className="px-4 py-3.5">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-mut">
              {st.label}
            </p>
            <p className="num mt-1.5 text-[20px] font-extrabold text-ink leading-none">
              {st.value}
            </p>
          </div>
        ))}
      </div>
      <ul className="px-6 py-1 divide-y divide-white/40">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between py-3">
            <span className="flex items-center gap-2.5 text-[13px] font-medium text-ink">
              <span className={`w-2 h-2 rounded-full ${r.dot}`} />
              {r.name}
            </span>
            <span className="num text-[11.5px] text-mut">{r.meta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OwnerConsole() {
  const { fmtNum } = useLang();
  const q = useQuery({ queryKey: ['owner-summary'], queryFn: getOwnerSummary });
  const s = q.data;

  const stats = s
    ? [
        { label: 'Tenant aktif', value: fmtNum(s.tenants_active) },
        {
          label: 'Pendapatan / bln',
          value: `Rp ${jt(s.revenue_month_idr)} jt`,
        },
        { label: 'Dokumen (30 hr)', value: `${rb(s.documents_30d)} rb` },
        { label: 'Uptime', value: `${s.uptime}%` },
      ]
    : [];

  return (
    <div className="space-y-5 max-w-[1080px]">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="glass rounded-glass px-7 py-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mut">
          Owner console · 30 hari terakhir
        </p>
        <h1 className="text-[24px] font-extrabold text-ink mt-1.5">
          Ringkasan platform
        </h1>
      </div>

      {/* ── Stat strip ──────────────────────────────────────────────── */}
      <div className="glass rounded-glass">
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x divide-y sm:divide-y-0 divide-white/40">
          {(s ? stats : Array.from({ length: 4 })).map((st, i) => (
            <div key={i} className="px-6 py-5">
              {s ? (
                <>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut">
                    {(st as { label: string }).label}
                  </p>
                  <p className="num mt-2 text-[26px] font-extrabold text-ink leading-none">
                    {(st as { value: string }).value}
                  </p>
                </>
              ) : (
                <div className="h-12 animate-pulse bg-white/40 rounded-lg" />
              )}
            </div>
          ))}
        </div>
      </div>

      {s && (
        <>
          {/* ── Revenue + Queue ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RevenueCard s={s} />
            <QueueCard s={s} />
          </div>

          {/* ── Top tenants + Recent signups ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tenant teratas */}
            <div className="glass rounded-glass overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
                <h2 className="text-[14.5px] font-bold text-ink">
                  Tenant teratas
                </h2>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-mut">
                  dok
                </span>
              </div>
              <div className="divide-y divide-white/40">
                {s.top_tenants.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-6 py-3.5"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${TINT[i % TINT.length]}`}
                    >
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink truncate">
                        {t.name}
                      </p>
                      <p className="num text-[11px] text-mut">
                        Prepaid · Rp {jt(t.revenue_idr)} jt
                      </p>
                    </div>
                    <span className="num text-[14px] font-bold text-ink flex-shrink-0">
                      {fmtNum(t.docs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pendaftar baru */}
            <div className="glass rounded-glass overflow-hidden">
              <div className="px-6 py-4 border-b border-white/40">
                <h2 className="text-[14.5px] font-bold text-ink">
                  Pendaftar baru
                </h2>
              </div>
              <div className="divide-y divide-white/40">
                {s.recent_signups.map((t) => {
                  const trial = t.plan === 'trial';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-6 py-3.5"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center text-brand-purple flex-shrink-0">
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-ink truncate">
                          {t.name}
                        </p>
                        <p className="num text-[11px] text-mut">
                          {relativeTime(t.created_at)}
                        </p>
                      </div>
                      <span
                        className={`flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0 ${trial ? 'text-mut' : 'text-emerald-600'}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${trial ? 'bg-slate-400' : 'bg-emerald-500'}`}
                        />
                        {trial ? 'Trial' : 'Prepaid'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

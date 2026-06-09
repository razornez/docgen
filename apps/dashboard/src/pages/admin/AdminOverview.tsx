import { useQuery } from '@tanstack/react-query';
import {
  getMe,
  getBatches,
  getApiKeys,
  getTemplates,
} from '../../api/client.js';

/* ── helpers ─────────────────────────────────────────────────────────── */

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

/* ── sub-components ─────────────────────────────────────────────────── */

function SoftCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  from,
  to,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  from: string;
  to: string;
}) {
  return (
    <div
      className="rounded-3xl p-6 flex flex-col gap-4 ring-1 ring-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.07)] transition-transform duration-200 hover:-translate-y-0.5"
      style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}
    >
      <div className="w-10 h-10 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-[28px] font-bold text-slate-800 leading-none">
          {value}
        </p>
        <p className="text-[12.5px] text-slate-500 font-medium mt-1.5">
          {label}
        </p>
      </div>
    </div>
  );
}

const BATCH_STATUS_CFG = [
  {
    key: 'completed',
    label: 'Selesai',
    color: '#22c55e',
    bg: 'bg-emerald-500',
  },
  {
    key: 'processing',
    label: 'Diproses',
    color: '#6366f1',
    bg: 'bg-indigo-500',
  },
  { key: 'queued', label: 'Antrian', color: '#94a3b8', bg: 'bg-slate-400' },
  {
    key: 'partially_failed',
    label: 'Sebagian gagal',
    color: '#f59e0b',
    bg: 'bg-amber-500',
  },
  { key: 'failed', label: 'Gagal', color: '#ef4444', bg: 'bg-rose-500' },
] as const;

/* ── main component ─────────────────────────────────────────────────── */

export default function AdminOverview() {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe });
  const batches = useQuery({ queryKey: ['batches'], queryFn: getBatches });
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: getApiKeys });
  const templates = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const tenantName = me.data?.tenant.name ?? '…';
  const tenantId = me.data?.tenant.id ?? '…';
  const balance = me.data?.wallet.balance ?? 0;
  const totalDocs =
    batches.data?.data.reduce((s, b) => s + b.completed, 0) ?? 0;
  const failedDocs = batches.data?.data.reduce((s, b) => s + b.failed, 0) ?? 0;
  const activeKeys =
    keys.data?.data.filter((k) => k.status === 'active').length ?? 0;
  const totalBatches = batches.data?.data.length ?? 0;

  const initials = tenantName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-7 max-w-5xl">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-7 flex items-center gap-6 ring-1 ring-indigo-100"
        style={{
          background:
            'linear-gradient(135deg, #eef2ff 0%, #faf5ff 60%, #eff6ff 100%)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{tenantName}</h1>
          <p className="text-[12.5px] text-slate-400 font-mono mt-0.5">
            {tenantId}
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <span className="text-[11px] text-slate-400 font-medium">
            Saldo tersedia
          </span>
          <span className="text-2xl font-bold text-indigo-600">
            {balance.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400">credits</span>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Saldo kredit"
          value={balance.toLocaleString()}
          from="#eef2ff"
          to="#faf5ff"
          icon={
            <svg
              className="w-5 h-5 text-indigo-500"
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
          }
        />
        <StatCard
          label="Dokumen dihasilkan"
          value={totalDocs.toLocaleString()}
          from="#ecfdf5"
          to="#f0fdf4"
          icon={
            <svg
              className="w-5 h-5 text-emerald-500"
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
          }
        />
        <StatCard
          label="Dokumen gagal"
          value={failedDocs.toLocaleString()}
          from="#fff1f2"
          to="#fff5f5"
          icon={
            <svg
              className="w-5 h-5 text-rose-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="API keys aktif"
          value={String(activeKeys)}
          from="#fffbeb"
          to="#fefce8"
          icon={
            <svg
              className="w-5 h-5 text-amber-500"
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
          }
        />
      </div>

      {/* ── Batch breakdown + Templates ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch breakdown */}
        <SoftCard>
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14.5px] font-semibold text-slate-800">
                Status Batch
              </h2>
              <span className="text-[12px] text-slate-400">
                {totalBatches} total
              </span>
            </div>

            {/* Total bar */}
            {totalBatches > 0 && (
              <div className="flex h-2.5 rounded-full overflow-hidden mb-5 gap-0.5">
                {BATCH_STATUS_CFG.map(({ key, bg }) => {
                  const count =
                    batches.data?.data.filter((b) => b.status === key).length ??
                    0;
                  const width = pct(count, totalBatches);
                  return width > 0 ? (
                    <div
                      key={key}
                      className={`${bg} rounded-full`}
                      style={{ width: `${width}%` }}
                    />
                  ) : null;
                })}
              </div>
            )}

            <div className="space-y-3">
              {BATCH_STATUS_CFG.map(({ key, label, color, bg }) => {
                const count =
                  batches.data?.data.filter((b) => b.status === key).length ??
                  0;
                const width = pct(count, totalBatches);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bg}`} />
                        <span className="text-[13px] text-slate-600">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-slate-400">
                          {width}%
                        </span>
                        <span className="text-[13px] font-semibold text-slate-800 w-5 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${width}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SoftCard>

        {/* Templates */}
        <SoftCard>
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14.5px] font-semibold text-slate-800">
                Templates
              </h2>
              <span
                className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#eef2ff', color: '#6366f1' }}
              >
                {templates.data?.data.length ?? 0} aktif
              </span>
            </div>

            {!templates.data ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
              </div>
            ) : templates.data.data.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">Belum ada template.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {templates.data.data.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3.5 h-3.5 text-indigo-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <span className="text-[13px] text-slate-700 font-medium truncate">
                        {t.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                      v{t.current_version}
                    </span>
                  </li>
                ))}
                {templates.data.data.length > 8 && (
                  <p className="text-[12px] text-slate-400 text-center pt-1">
                    +{templates.data.data.length - 8} template lainnya
                  </p>
                )}
              </ul>
            )}
          </div>
        </SoftCard>
      </div>

      {/* ── Info note ───────────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-6 ring-1 ring-indigo-100/80"
        style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
        }}
      >
        <div className="flex gap-4">
          <div className="w-9 h-9 rounded-2xl bg-white/70 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg
              className="w-4.5 h-4.5 w-[18px] h-[18px] text-indigo-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-indigo-900 mb-1">
              Catatan
            </p>
            <p className="text-[12.5px] text-indigo-700/80 leading-relaxed">
              Panel admin ini menampilkan data untuk tenant yang sedang login.
              Tampilan multi-tenant penuh (lintas semua tenant) memerlukan
              endpoint admin khusus dengan kontrol akses berbasis peran.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

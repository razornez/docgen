import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMe, getTransactions, getBatches } from '../api/client.js';

const TX_LABELS: Record<string, string> = {
  signup_bonus: 'Signup bonus',
  topup: 'Top-up',
  debit: 'Dokumen dibuat',
  refund: 'Refund',
  adjustment: 'Penyesuaian',
};

function StatCard({
  label,
  value,
  sub,
  icon,
  from,
  to,
  ring,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  from: string;
  to: string;
  ring: string;
}) {
  return (
    <div
      className="rounded-3xl p-6 flex flex-col gap-4 ring-1 shadow-[0_4px_24px_rgba(0,0,0,0.07)] transition-transform duration-200 hover:-translate-y-0.5"
      style={
        {
          background: `linear-gradient(145deg, ${from}, ${to})`,
          '--tw-ring-color': ring,
        } as React.CSSProperties
      }
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
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export default function DashboardPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe });
  const txs = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });
  const batches = useQuery({ queryKey: ['batches'], queryFn: getBatches });

  const balance = me.data?.wallet.balance ?? 0;
  const completed =
    batches.data?.data.filter((b) => b.status === 'completed').length ?? 0;
  const inProgress =
    batches.data?.data.filter(
      (b) => b.status === 'queued' || b.status === 'processing',
    ).length ?? 0;
  const totalDocs =
    batches.data?.data.reduce((s, b) => s + b.completed, 0) ?? 0;

  // Akun baru: belum pernah membuat batch → tampilkan panduan langkah awal.
  const showOnboarding = batches.data?.data.length === 0;

  return (
    <div className="space-y-6">
      {/* ── Onboarding (akun baru) ──────────────────────────────────── */}
      {showOnboarding && (
        <div className="rounded-3xl ring-1 ring-indigo-100 bg-white shadow-[0_4px_24px_rgba(99,102,241,0.06)] overflow-hidden">
          <div
            className="px-6 py-4 border-b border-indigo-50"
            style={{ background: 'linear-gradient(135deg, #eef2ff, #faf5ff)' }}
          >
            <h2 className="text-[14.5px] font-semibold text-slate-800">
              Mulai dari sini
            </h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Tiga langkah untuk membuat dokumen pertama Anda.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {[
              {
                n: 1,
                to: '/dashboard/templates',
                title: 'Buat template',
                desc: 'Susun dokumen dengan variabel {{...}}.',
                cta: 'Ke Templates',
              },
              {
                n: 2,
                to: '/dashboard/batches',
                title: 'Buat batch',
                desc: 'Isi data dan hasilkan PDF massal.',
                cta: 'Ke Batches',
              },
              {
                n: 3,
                to: '/dashboard/api-keys',
                title: 'Ambil API key',
                desc: 'Integrasikan ke aplikasi Anda via API.',
                cta: 'Ke API Keys',
              },
            ].map((step) => (
              <div key={step.n} className="p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                    {step.n}
                  </span>
                  <p className="text-[13px] font-semibold text-slate-700">
                    {step.title}
                  </p>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
                <Link
                  to={step.to}
                  className="mt-auto text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  {step.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Saldo kredit"
          value={balance.toLocaleString()}
          sub={me.data?.wallet.currency}
          from="#eef2ff"
          to="#faf5ff"
          ring="rgba(99,102,241,0.2)"
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
          label="Batch selesai"
          value={String(completed)}
          from="#ecfdf5"
          to="#f0fdf4"
          ring="rgba(34,197,94,0.2)"
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Sedang proses"
          value={String(inProgress)}
          from="#fffbeb"
          to="#fefce8"
          ring="rgba(245,158,11,0.2)"
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Dokumen dihasilkan"
          value={totalDocs.toLocaleString()}
          from="#f5f3ff"
          to="#faf5ff"
          ring="rgba(139,92,246,0.2)"
          icon={
            <svg
              className="w-5 h-5 text-violet-500"
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
      </div>

      {/* ── Lists ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[14.5px] font-semibold text-slate-800">
              Transaksi terbaru
            </h2>
            <Link
              to="/dashboard/wallet"
              className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Lihat semua →
            </Link>
          </div>

          {!txs.data ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
            </div>
          ) : txs.data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-400">Belum ada transaksi.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {txs.data.data.slice(0, 6).map((tx) => {
                const isDebit = tx.type === 'debit';
                return (
                  <li
                    key={tx.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDebit ? 'bg-rose-50 text-rose-400' : 'bg-emerald-50 text-emerald-500'}`}
                      >
                        {isDebit ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-700">
                          {TX_LABELS[tx.type] ?? tx.type}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {relativeTime(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[13.5px] font-bold tabular-nums ${isDebit ? 'text-rose-500' : 'text-emerald-600'}`}
                    >
                      {isDebit ? '-' : '+'}
                      {Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Batches */}
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[14.5px] font-semibold text-slate-800">
              Batch terbaru
            </h2>
            <Link
              to="/dashboard/batches"
              className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Lihat semua →
            </Link>
          </div>

          {!batches.data ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
            </div>
          ) : batches.data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-400">Belum ada batch.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {batches.data.data.slice(0, 6).map((b) => (
                <li
                  key={b.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-mono text-slate-400 truncate">
                      {b.id}
                    </p>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      {b.completed}/{b.total} dok · {relativeTime(b.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    completed: {
      cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      label: 'Selesai',
    },
    partially_failed: {
      cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
      label: 'Sebagian gagal',
    },
    failed: {
      cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
      label: 'Gagal',
    },
    processing: {
      cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      label: 'Proses',
    },
    queued: {
      cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
      label: 'Antrian',
    },
  };
  const { cls, label } = cfg[status] ?? {
    cls: 'bg-slate-100 text-slate-600',
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

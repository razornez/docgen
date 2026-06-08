import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMe, getTransactions, getBatches } from '../api/client.js';

const TX_LABELS: Record<string, string> = {
  signup_bonus: 'Signup bonus',
  topup: 'Top-up',
  debit: 'Document generated',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 flex items-start gap-4 shadow-sm">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] text-slate-500 font-medium">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900 leading-tight">
          {value}
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

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Credits remaining"
          value={balance.toLocaleString()}
          sub={me.data?.wallet.currency}
          accent="bg-indigo-50 text-indigo-600"
          icon={
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
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
        />
        <StatCard
          label="Batches completed"
          value={String(completed)}
          accent="bg-emerald-50 text-emerald-600"
          icon={
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="In progress"
          value={String(inProgress)}
          accent="bg-amber-50 text-amber-600"
          icon={
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Documents generated"
          value={totalDocs.toLocaleString()}
          accent="bg-violet-50 text-violet-600"
          icon={
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-slate-900">
              Transaksi terbaru
            </h2>
            <Link
              to="/dashboard/wallet"
              className="text-[12px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Lihat semua →
            </Link>
          </div>
          {!txs.data ? (
            <div className="px-5 py-8 text-center">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : txs.data.data.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              Belum ada transaksi.
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {txs.data.data.slice(0, 6).map((tx) => {
                const isDebit = tx.type === 'debit';
                return (
                  <li
                    key={tx.id}
                    className="px-5 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDebit ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}
                      >
                        {isDebit ? (
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
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        ) : (
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
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">
                          {TX_LABELS[tx.type] ?? tx.type}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {relativeTime(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[13.5px] font-semibold tabular-nums ${isDebit ? 'text-red-500' : 'text-emerald-600'}`}
                    >
                      {isDebit ? '-' : '+'}
                      {tx.amount.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent batches */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-slate-900">
              Batch terbaru
            </h2>
            <Link
              to="/dashboard/batches"
              className="text-[12px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Lihat semua →
            </Link>
          </div>
          {!batches.data ? (
            <div className="px-5 py-8 text-center">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : batches.data.data.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              Belum ada batch.
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {batches.data.data.slice(0, 6).map((b) => (
                <li
                  key={b.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-mono text-slate-400 truncate">
                      {b.id}
                    </p>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      {b.completed}/{b.total} dokumen ·{' '}
                      {relativeTime(b.created_at)}
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
      cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',
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
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

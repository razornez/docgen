import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMe, getTransactions, getBatches } from '../api/client.js';

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const TX_LABELS: Record<string, string> = {
  signup_bonus: 'Signup bonus',
  topup: 'Top-up',
  debit: 'Document generated',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

export default function DashboardPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe });
  const txs = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });
  const batches = useQuery({ queryKey: ['batches'], queryFn: getBatches });

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
      <h1 className="text-xl font-bold text-gray-900">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Credits remaining"
          value={(me.data?.wallet.balance ?? 0).toLocaleString()}
          sub={me.data?.wallet.currency}
        />
        <StatCard label="Batches completed" value={String(completed)} />
        <StatCard label="In progress" value={String(inProgress)} />
        <StatCard
          label="Documents generated"
          value={totalDocs.toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent transactions</h2>
            <Link
              to="/wallet"
              className="text-xs text-indigo-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {txs.data?.data.slice(0, 5).map((tx) => (
              <li
                key={tx.id}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {TX_LABELS[tx.type] ?? tx.type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`font-semibold ${tx.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}
                >
                  {tx.type === 'debit' ? '-' : '+'}
                  {tx.amount}
                </span>
              </li>
            ))}
            {txs.data?.data.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-gray-400">
                No transactions yet
              </li>
            )}
          </ul>
        </div>

        {/* Recent batches */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent batches</h2>
            <Link
              to="/batches"
              className="text-xs text-indigo-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {batches.data?.data.slice(0, 5).map((b) => (
              <li
                key={b.id}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-mono text-xs text-gray-500">{b.id}</p>
                  <p className="text-xs text-gray-400">
                    {b.completed}/{b.total} docs ·{' '}
                    {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
            {batches.data?.data.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-gray-400">
                No batches yet
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    partially_failed: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    queued: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

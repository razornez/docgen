import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWallet,
  getTransactions,
  getPackages,
  createTopup,
} from '../api/client.js';

const TX_LABELS: Record<string, string> = {
  signup_bonus: 'Signup bonus',
  topup: 'Top-up',
  debit: 'Document generated',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

export default function WalletPage() {
  const qc = useQueryClient();
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet });
  const txs = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });
  const packages = useQuery({ queryKey: ['packages'], queryFn: getPackages });

  const [selectedPkg, setSelectedPkg] = useState('');
  const [topupError, setTopupError] = useState('');

  const topup = useMutation({
    mutationFn: createTopup,
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['wallet'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      window.open(data.payment_url, '_blank');
    },
    onError: (e) =>
      setTopupError(e instanceof Error ? e.message : 'Top-up failed'),
  });

  function handleTopup() {
    if (!selectedPkg) return;
    setTopupError('');
    topup.mutate(selectedPkg);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Wallet</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 col-span-1">
          <p className="text-sm text-gray-500 font-medium">Available balance</p>
          <p className="mt-1 text-4xl font-bold text-gray-900">
            {(wallet.data?.balance ?? 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-400 mt-1">credits</p>

          <hr className="my-4 border-gray-100" />

          <p className="text-sm font-semibold text-gray-700 mb-3">
            Top up credits
          </p>

          <div className="space-y-2">
            {packages.data?.data.map((pkg) => (
              <label
                key={pkg.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="package"
                  value={pkg.id}
                  checked={selectedPkg === pkg.id}
                  onChange={() => setSelectedPkg(pkg.id)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">
                  <strong>{pkg.credits.toLocaleString()} credits</strong>
                  <span className="text-gray-400">
                    {' '}
                    — Rp {pkg.price_idr.toLocaleString()}
                  </span>
                </span>
              </label>
            ))}
            {packages.data?.data.length === 0 && (
              <p className="text-sm text-gray-400">No packages available</p>
            )}
          </div>

          {topupError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 rounded p-2">
              {topupError}
            </p>
          )}

          <button
            onClick={handleTopup}
            disabled={!selectedPkg || topup.isPending}
            className="mt-4 w-full py-2 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {topup.isPending ? 'Opening payment…' : 'Pay via Midtrans'}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            QRIS · Virtual Account · E-wallet
          </p>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 col-span-2">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Transaction history</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase text-left border-b border-gray-100">
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txs.data?.data.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {TX_LABELS[tx.type] ?? tx.type}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-semibold ${
                        tx.type === 'debit' ? 'text-red-500' : 'text-green-600'
                      }`}
                    >
                      {tx.type === 'debit' ? '-' : '+'}
                      {Math.abs(tx.amount)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {tx.balance_after}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
                {txs.data?.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-gray-400"
                    >
                      No transactions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

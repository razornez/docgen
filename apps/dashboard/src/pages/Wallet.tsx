import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWallet,
  getTransactions,
  getPackages,
  getPaymentMethods,
  createTopup,
  type TxItem,
} from '../api/client.js';

const TX_LABELS: Record<string, string> = {
  signup_bonus: 'Signup bonus',
  topup: 'Top-up',
  debit: 'Dokumen dibuat',
  refund: 'Refund',
  adjustment: 'Penyesuaian',
};

const GATEWAY_LABELS: Record<string, string> = {
  kasugai: 'Kasugai',
  midtrans: 'Midtrans',
  xendit: 'Xendit',
};

/** Baris detail manusiawi per transaksi (metode bayar, ref, template, dll). */
function txDetailText(tx: TxItem): string {
  const d = tx.detail ?? {};
  if (tx.type === 'topup') {
    const parts: string[] = [];
    if (d.gateway) parts.push(GATEWAY_LABELS[d.gateway] ?? d.gateway);
    if (d.method) parts.push(d.method);
    if (typeof d.amount_idr === 'number')
      parts.push('Rp ' + d.amount_idr.toLocaleString('id-ID'));
    if (d.payment_ref) parts.push(d.payment_ref);
    return parts.join(' · ');
  }
  if (tx.ref_type === 'document') {
    const parts: string[] = [];
    if (d.template_name) parts.push(d.template_name);
    if (typeof d.batch_total === 'number')
      parts.push(`${d.batch_total} dokumen`);
    if (d.item_ref) parts.push(`ref: ${d.item_ref}`);
    parts.push(d.batch_id ?? d.document_id ?? tx.ref_id);
    return parts.join(' · ');
  }
  if (tx.type === 'signup_bonus') return 'Bonus pendaftaran akun';
  return tx.ref_id;
}

/** Tanggal + jam lengkap, mis. "10 Jun 2026, 20.16". */
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}
interface SnapApi {
  pay: (token: string, cb?: SnapCallbacks) => void;
}
declare global {
  interface Window {
    snap?: SnapApi;
  }
}

/**
 * Muat script Midtrans Snap (snap.js) secara dinamis dengan client key.
 * Sandbox vs produksi dideteksi dari prefix client key: 'SB-' = sandbox.
 * Mengembalikan window.snap saat siap.
 */
function loadSnap(clientKey: string): Promise<SnapApi> {
  const isSandbox = clientKey.startsWith('SB-');
  const src = isSandbox
    ? 'https://app.sandbox.midtrans.com/snap/snap.js'
    : 'https://app.midtrans.com/snap/snap.js';
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-snap="1"]`,
    );
    if (existing && window.snap) {
      resolve(window.snap);
      return;
    }
    const s = existing ?? document.createElement('script');
    s.src = src;
    s.setAttribute('data-client-key', clientKey);
    s.setAttribute('data-snap', '1');
    s.onload = () => {
      if (window.snap) resolve(window.snap);
      else reject(new Error('Snap tidak tersedia setelah load'));
    };
    s.onerror = () => reject(new Error('Gagal memuat Snap'));
    if (!existing) document.body.appendChild(s);
  });
}

export default function WalletPage() {
  const qc = useQueryClient();
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet });
  const txs = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });
  const packages = useQuery({ queryKey: ['packages'], queryFn: getPackages });
  const methods = useQuery({
    queryKey: ['payment-methods'],
    queryFn: getPaymentMethods,
  });

  const [selectedPkg, setSelectedPkg] = useState('');
  const [topupError, setTopupError] = useState('');
  const [confirmMsg, setConfirmMsg] = useState('');

  // Saldo sebelum bayar (untuk deteksi kredit masuk) & timer polling.
  const balanceBeforeRef = useRef(0);
  const pollRef = useRef<number | null>(null);

  // Bersihkan timer polling saat komponen unmount.
  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  function refreshWallet() {
    void qc.invalidateQueries({ queryKey: ['wallet'] });
    void qc.invalidateQueries({ queryKey: ['transactions'] });
    void qc.invalidateQueries({ queryKey: ['me'] });
  }

  /**
   * Setelah Snap sukses, kredit final datang dari webhook (server→server) yang
   * tiba beberapa detik kemudian. Kita poll saldo tiap 2 dtk (maks ~40 dtk)
   * sampai bertambah dari saldo sebelum bayar → update otomatis, tanpa klik manual.
   */
  function pollUntilCredited() {
    if (pollRef.current) window.clearInterval(pollRef.current);
    setConfirmMsg('Mengonfirmasi pembayaran…');
    let tries = 0;
    pollRef.current = window.setInterval(() => {
      tries += 1;
      void getWallet()
        .then((w) => {
          if (w.balance > balanceBeforeRef.current) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            pollRef.current = null;
            refreshWallet();
            setConfirmMsg('Pembayaran berhasil — saldo diperbarui.');
            window.setTimeout(() => setConfirmMsg(''), 5000);
          } else if (tries >= 20) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            pollRef.current = null;
            refreshWallet();
            setConfirmMsg(
              'Pembayaran sedang diproses. Saldo akan terupdate otomatis sebentar lagi.',
            );
          }
        })
        .catch(() => undefined);
    }, 2000);
  }

  const topup = useMutation({
    mutationFn: createTopup,
    onSuccess: async (data) => {
      // Tampilkan widget Snap embedded bila ada snapToken + clientKey.
      if (data.snap_token && data.client_key) {
        try {
          const snap = await loadSnap(data.client_key);
          snap.pay(data.snap_token, {
            onSuccess: () => pollUntilCredited(),
            onPending: () => pollUntilCredited(),
            onClose: () => undefined,
            onError: () => setTopupError('Pembayaran gagal di Snap.'),
          });
          return;
        } catch {
          // Fallback ke redirect bila Snap gagal dimuat.
        }
      }
      if (data.payment_url) window.open(data.payment_url, '_blank');
      else setTopupError('Gateway tidak mengembalikan token pembayaran.');
    },
    onError: (e) =>
      setTopupError(e instanceof Error ? e.message : 'Top-up gagal'),
  });

  // Klik "Bayar pakai Midtrans" → buat transaksi → tampilkan Snap popup.
  // Channel ditentukan widget Snap sendiri; kita kirim 1 method valid sbg
  // syarat API Kasugai (default: method pertama yang aktif).
  function handleTopup() {
    if (!selectedPkg) return;
    setTopupError('');
    setConfirmMsg('');
    // Rekam saldo sekarang agar polling bisa mendeteksi kredit webhook masuk.
    balanceBeforeRef.current = wallet.data?.balance ?? 0;
    const method = methods.data?.data[0]?.code ?? 'midtrans_qris';
    topup.mutate({ packageId: selectedPkg, method });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance + Top-up */}
        <div
          className="col-span-1 rounded-3xl p-6 ring-1 ring-indigo-100 shadow-[0_4px_32px_rgba(99,102,241,0.08)]"
          style={{ background: 'linear-gradient(145deg, #eef2ff, #faf5ff)' }}
        >
          <p className="text-[12.5px] font-semibold text-indigo-400 uppercase tracking-widest">
            Saldo tersedia
          </p>
          <p className="mt-2 text-5xl font-bold text-slate-900 leading-none">
            {(wallet.data?.balance ?? 0).toLocaleString()}
          </p>
          <p className="text-sm text-slate-400 mt-1.5">credits</p>

          <div className="my-5 h-px bg-indigo-100" />

          <p className="text-[13px] font-semibold text-slate-700 mb-3">
            Top up kredit
          </p>

          <div className="space-y-2.5">
            {packages.data?.data.map((pkg) => (
              <label
                key={pkg.id}
                className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-2xl ring-1 transition-all ${
                  selectedPkg === pkg.id
                    ? 'ring-indigo-400 bg-indigo-50/60'
                    : 'ring-slate-200 bg-white/70 hover:ring-indigo-200'
                }`}
              >
                <input
                  type="radio"
                  name="package"
                  value={pkg.id}
                  checked={selectedPkg === pkg.id}
                  onChange={() => setSelectedPkg(pkg.id)}
                  className="accent-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  <strong className="text-slate-900">
                    {pkg.credits.toLocaleString()} credits
                  </strong>
                  <span className="text-slate-400">
                    {' '}
                    — Rp {pkg.price_idr.toLocaleString()}
                  </span>
                </span>
              </label>
            ))}
            {packages.data?.data.length === 0 && (
              <p className="text-sm text-slate-400">Paket belum tersedia</p>
            )}
          </div>

          {topupError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-xl px-3 py-2">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {topupError}
            </div>
          )}

          <button
            onClick={handleTopup}
            disabled={!selectedPkg || topup.isPending}
            className="mt-4 w-full py-3 px-4 text-sm font-semibold rounded-2xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-indigo-200"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {topup.isPending ? 'Membuka pembayaran…' : 'Bayar pakai Midtrans'}
          </button>
          <p className="text-[11px] text-slate-400 mt-2.5 text-center">
            QRIS · Virtual Account · E-wallet · Kartu
          </p>

          {confirmMsg && (
            <div className="mt-3 flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded-xl px-3 py-2">
              {pollRef.current !== null ? (
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {confirmMsg}
            </div>
          )}
        </div>

        {/* Transaction history */}
        <div className="col-span-2 bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-[14.5px] font-semibold text-slate-800">
              Riwayat transaksi
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
                  <th className="px-6 py-3 font-semibold">Tipe</th>
                  <th className="px-6 py-3 font-semibold text-right">Jumlah</th>
                  <th className="px-6 py-3 font-semibold text-right">
                    Saldo akhir
                  </th>
                  <th className="px-6 py-3 font-semibold text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {txs.data?.data.map((tx) => {
                  const isDebit = tx.type === 'debit';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center ${isDebit ? 'bg-rose-50 text-rose-400' : 'bg-emerald-50 text-emerald-500'}`}
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
                          <div className="min-w-0">
                            <span className="font-medium text-slate-700 block">
                              {TX_LABELS[tx.type] ?? tx.type}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[260px]">
                              {txDetailText(tx)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-6 py-3.5 text-right font-semibold tabular-nums ${isDebit ? 'text-rose-500' : 'text-emerald-600'}`}
                      >
                        {isDebit ? '-' : '+'}
                        {Math.abs(tx.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-400 tabular-nums">
                        {tx.balance_after.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-400 whitespace-nowrap">
                        {fmtDateTime(tx.created_at)}
                      </td>
                    </tr>
                  );
                })}
                {txs.data?.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-400 text-sm"
                    >
                      Belum ada transaksi.
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

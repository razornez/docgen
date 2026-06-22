import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWallet,
  getTransactions,
  getPackages,
  getBatches,
  getMe,
  createTopup,
  confirmTopup,
  type TxItem,
  type TopupResult,
} from '../api/client.js';
import { useLang } from '../i18n/index.js';

/* ── Helpers ───────────────────────────────────────────────────────── */
function relativeTime(iso: string, lang: 'id' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === 'en' ? 'just now' : 'baru saja';
  if (m < 60) return lang === 'en' ? `${m} min ago` : `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'en' ? `${h} hr ago` : `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return lang === 'en' ? 'yesterday' : 'kemarin';
  return lang === 'en' ? `${d} days ago` : `${d} hari lalu`;
}

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

type Translate = (id: string, en: string) => string;

function catLabel(type: string, t: Translate): string {
  const map: Record<string, string> = {
    topup: 'Top-up',
    debit: t('Pemakaian', 'Usage'),
    refund: 'Refund',
    signup_bonus: t('Bonus', 'Bonus'),
    adjustment: t('Penyesuaian', 'Adjustment'),
  };
  return map[type] ?? type;
}

/** Judul transaksi manusiawi, mis. "Batch — Slip gaji Juni". */
function txTitle(tx: TxItem, t: Translate): string {
  const d = tx.detail ?? {};
  if (tx.type === 'topup') return `Top-up — ${d.method ?? d.gateway ?? 'QRIS'}`;
  if (tx.type === 'refund')
    return `Refund — ${(d as { reason?: string }).reason ?? t('dana kembali', 'refunded')}`;
  if (tx.type === 'signup_bonus') return t('Bonus pendaftaran', 'Signup bonus');
  if (d.item_ref)
    return `${t('Dokumen tunggal', 'Single document')} — ${d.template_name ?? 'Invoice'}`;
  if (d.template_name) return `Batch — ${d.template_name}`;
  return t('Dokumen dibuat', 'Document created');
}

type FilterKey = 'all' | 'topup' | 'debit' | 'refund';
function filters(t: Translate): { key: FilterKey; label: string }[] {
  return [
    { key: 'all', label: t('Semua', 'All') },
    { key: 'topup', label: 'Top-up' },
    { key: 'debit', label: t('Pemakaian', 'Usage') },
    { key: 'refund', label: 'Refund' },
  ];
}

const CONFIRM_POLL_INTERVAL_MS = 2000;
const CONFIRM_POLL_MAX_TRIES = 30;

/* ── Widget Kasugai (widget.js) ────────────────────────────────────────
 * Widget menangani daftar metode bayar (Tunai · Dompet Digital · Transfer
 * Bank · Gateway) + Snap. Kita hanya membuat order di backend lalu mount
 * widget dengan orderId-nya. Saldo bertambah lewat webhook payment.paid
 * (sumber kebenaran); onSuccess hanya memicu polling konfirmasi cepat.
 */
const WIDGET_MOUNT_ID = 'kasugai-bayar';

interface KasugaiMountOptions {
  publicKey: string;
  orderId: string;
  amount: number; // tampilan saja — nominal terkunci di order
  apiBase: string;
  onSuccess?: (orderId: string) => void;
  onPending?: (orderId: string) => void;
  onError?: (err: unknown) => void;
}
interface KasugaiWidgetApi {
  mount: (target: string | HTMLElement, options: KasugaiMountOptions) => void;
}
declare global {
  interface Window {
    KasugaiWidget?: KasugaiWidgetApi;
  }
}

/** Muat widget.js Kasugai sekali (idempoten), resolve global KasugaiWidget. */
function loadKasugaiWidget(apiBase: string): Promise<KasugaiWidgetApi> {
  return new Promise((resolve, reject) => {
    if (window.KasugaiWidget) {
      resolve(window.KasugaiWidget);
      return;
    }
    const ready = () => {
      if (window.KasugaiWidget) resolve(window.KasugaiWidget);
      else reject(new Error('KasugaiWidget tidak tersedia setelah dimuat'));
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-kasugai-widget="1"]',
    );
    if (existing) {
      existing.addEventListener('load', ready, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Gagal memuat widget Kasugai')),
        { once: true },
      );
      return;
    }
    const s = document.createElement('script');
    s.src = `${apiBase.replace(/\/+$/, '')}/widget.js`;
    s.async = true;
    s.setAttribute('data-kasugai-widget', '1');
    s.onload = ready;
    s.onerror = () => reject(new Error('Gagal memuat widget Kasugai'));
    document.body.appendChild(s);
  });
}

/* ── UI ────────────────────────────────────────────────────────────── */
export default function WalletPage() {
  const qc = useQueryClient();
  const { fmtNum, lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: getWallet });
  const txs = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });
  const packages = useQuery({ queryKey: ['packages'], queryFn: getPackages });
  const batchesQ = useQuery({ queryKey: ['batches'], queryFn: getBatches });
  const me = useQuery({ queryKey: ['me'], queryFn: getMe });

  const [selectedPkg, setSelectedPkg] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [topupError, setTopupError] = useState('');
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirming, setConfirming] = useState(false);
  // Order aktif yang sedang dibayar lewat widget Kasugai (null = modal tertutup).
  const [payInfo, setPayInfo] = useState<TopupResult | null>(null);
  const [widgetError, setWidgetError] = useState('');

  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const pkgList = packages.data?.data ?? [];
  const effPkgId = selectedPkg || pkgList[0]?.id || '';
  const selPkg = pkgList.find((p) => p.id === effPkgId);
  const filterList = filters(t);

  const balance = wallet.data?.balance ?? null;
  const usageThisMonth = (batchesQ.data?.data ?? [])
    .filter((b) => isThisMonth(b.created_at))
    .reduce((s, b) => s + b.completed, 0);

  function refreshWallet() {
    void qc.invalidateQueries({ queryKey: ['wallet'] });
    void qc.invalidateQueries({ queryKey: ['transactions'] });
    void qc.invalidateQueries({ queryKey: ['me'] });
  }

  function pollConfirm(paymentId: string) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    setConfirming(true);
    setConfirmMsg(
      t(
        'Pembayaran diterima — mengonfirmasi & memasukkan saldo…',
        'Payment received — confirming & adding balance…',
      ),
    );
    let tries = 0;
    const tick = () => {
      tries += 1;
      void confirmTopup(paymentId)
        .then((r) => {
          if (r.status === 'paid') {
            if (pollRef.current) window.clearInterval(pollRef.current);
            pollRef.current = null;
            setConfirming(false);
            refreshWallet();
            setConfirmMsg(
              t(
                'Pembayaran berhasil — saldo sudah masuk.',
                'Payment successful — balance added.',
              ),
            );
            window.setTimeout(() => setConfirmMsg(''), 6000);
          } else if (tries >= CONFIRM_POLL_MAX_TRIES) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            pollRef.current = null;
            setConfirming(false);
            refreshWallet();
            setConfirmMsg(
              t(
                'Pembayaran sedang diproses. Saldo akan masuk otomatis — aman meski halaman ditutup.',
                'Payment is being processed. Your balance will be added automatically — safe to close this page.',
              ),
            );
          }
        })
        .catch(() => undefined);
    };
    tick();
    pollRef.current = window.setInterval(tick, CONFIRM_POLL_INTERVAL_MS);
  }

  const topup = useMutation({
    mutationFn: createTopup,
    onSuccess: (data) => {
      if (!data.public_key) {
        setTopupError(
          t(
            'Konfigurasi pembayaran belum lengkap. Hubungi admin.',
            'Payment is not configured yet. Please contact admin.',
          ),
        );
        return;
      }
      // Buka modal — widget di-mount oleh effect setelah container ter-render.
      setWidgetError('');
      setPayInfo(data);
    },
    onError: (e) =>
      setTopupError(
        e instanceof Error ? e.message : t('Top-up gagal', 'Top-up failed'),
      ),
  });

  // Mount widget Kasugai ketika modal terbuka (container sudah ada di DOM).
  useEffect(() => {
    if (!payInfo) return;
    let cancelled = false;
    const el = document.getElementById(WIDGET_MOUNT_ID);
    if (el) el.innerHTML = '';

    loadKasugaiWidget(payInfo.kasugai_base_url)
      .then((widget) => {
        if (cancelled) return;
        widget.mount(`#${WIDGET_MOUNT_ID}`, {
          publicKey: payInfo.public_key,
          orderId: payInfo.payment_id,
          amount: payInfo.amount_idr,
          apiBase: payInfo.kasugai_base_url,
          onSuccess: (orderId) => {
            setPayInfo(null);
            pollConfirm(orderId);
          },
          onPending: (orderId) => {
            setPayInfo(null);
            pollConfirm(orderId);
          },
          onError: () => {
            setWidgetError(
              t(
                'Pembayaran gagal. Coba lagi.',
                'Payment failed. Please try again.',
              ),
            );
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPayInfo(null);
        setTopupError(
          t(
            'Gagal memuat widget pembayaran. Coba lagi.',
            'Failed to load the payment widget. Please try again.',
          ),
        );
      });

    return () => {
      cancelled = true;
    };
    // Re-run hanya saat order (payInfo) berubah — pollConfirm & t cukup stabil.
  }, [payInfo]);

  function handleTopup() {
    if (!effPkgId) return;
    setTopupError('');
    setConfirmMsg('');
    topup.mutate({ packageId: effPkgId });
  }

  const allTx = txs.data?.data ?? [];
  const shownTx =
    filter === 'all' ? allTx : allTx.filter((t) => t.type === filter);

  return (
    <div className="mx-auto w-full max-w-[840px] space-y-5">
      {/* ── Saldo kredit ────────────────────────────────────────────── */}
      <div className="glass rounded-glass px-6 py-6 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-mut">
              {t('Saldo kredit', 'Credit balance')}
            </p>
            <p className="num mt-2 text-[44px] font-extrabold text-ink leading-none">
              {balance !== null ? fmtNum(balance) : '–'}
              <span className="text-[18px] font-bold text-mut ml-1">
                {t('kredit', 'credits')}
              </span>
            </p>
            <p className="num mt-3 text-[12.5px] text-mut">
              ≈ {balance !== null ? fmtNum(balance) : '–'}{' '}
              {t('dokumen', 'documents')} · {me.data?.tenant.name ?? '…'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-mut">
              {t('Pemakaian bln ini', 'Usage this month')}
            </p>
            <p className="num mt-1 text-[22px] font-bold text-brand-purple">
              {fmtNum(usageThisMonth)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Isi ulang ───────────────────────────────────────────────── */}
      <div className="glass rounded-glass px-6 py-6 sm:px-7">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">
            {t('Isi ulang', 'Top up')}
          </h2>
          <p className="num text-[11.5px] text-mut">
            {t(
              '1 kredit = 1 dokumen (≤ 5 hlm)',
              '1 credit = 1 document (≤ 5 pages)',
            )}
          </p>
        </div>

        {/* Paket */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pkgList.map((pkg, i) => {
            const active = pkg.id === effPkgId;
            const badge =
              i === 1
                ? t('POPULER', 'POPULAR')
                : i === pkgList.length - 1
                  ? t('HEMAT', 'BEST VALUE')
                  : null;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedPkg(pkg.id)}
                className={`relative text-left rounded-2xl px-3.5 py-3.5 border transition-all ${
                  active
                    ? 'border-brand-purple bg-white/70 shadow-[0_4px_16px_rgba(155,93,229,0.18)]'
                    : 'border-white/60 glass-soft hover:border-brand-purple/40'
                }`}
              >
                {badge && (
                  <span className="absolute top-2 right-2 text-[8.5px] font-bold tracking-wide text-brand-purple">
                    {badge}
                  </span>
                )}
                <p className="num text-[20px] font-extrabold text-ink leading-none">
                  {fmtNum(pkg.credits)}
                </p>
                <p className="num text-[12px] text-mut mt-1.5">
                  Rp {fmtNum(pkg.price_idr)}
                </p>
              </button>
            );
          })}
          {pkgList.length === 0 && (
            <p className="col-span-full text-[13px] text-mut">
              {t('Paket belum tersedia.', 'No packages available yet.')}
            </p>
          )}
        </div>

        {/* Metode bayar dipilih di popup pembayaran (Snap) */}
        <p className="mt-4 flex items-center gap-1.5 text-[12px] text-mut">
          <svg
            className="w-4 h-4 flex-shrink-0 text-brand-purple"
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
          {t(
            'Pilih metode bayar (QRIS, VA, e-wallet, kartu) saat pembayaran.',
            'Choose your payment method (QRIS, VA, e-wallet, card) at checkout.',
          )}
        </p>

        {topupError && (
          <div className="mt-4 flex items-center gap-2 text-[12.5px] text-rose-700 bg-rose-100/60 rounded-xl px-3 py-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
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

        <div className="my-5 h-px bg-white/50" />

        {/* Ringkasan + Bayar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="num text-[26px] font-extrabold text-ink leading-none">
              Rp {fmtNum(selPkg?.price_idr ?? 0)}
            </p>
            <p className="num text-[12px] text-mut mt-1.5">
              {fmtNum(selPkg?.credits ?? 0)} {t('kredit', 'credits')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleTopup}
            disabled={!effPkgId || topup.isPending}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-grad text-white text-[13.5px] font-bold shadow-[0_4px_16px_rgba(155,93,229,0.42)] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {topup.isPending ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
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
                {t('Membuka…', 'Opening…')}
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
                </svg>
                {t('Bayar sekarang', 'Pay now')}
              </>
            )}
          </button>
        </div>

        {confirmMsg && (
          <div className="mt-4 flex items-center gap-2 text-[12.5px] text-brand-purple bg-white/60 rounded-xl px-3 py-2">
            {confirming && (
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
            )}
            {confirmMsg}
          </div>
        )}
      </div>

      {/* ── Riwayat transaksi ───────────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
          <h2 className="text-[15px] font-bold text-ink">
            {t('Riwayat transaksi', 'Transaction history')}
          </h2>
          <div className="flex items-center p-0.5 rounded-full glass-soft">
            {filterList.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 text-[11.5px] font-semibold rounded-full transition-all ${
                  filter === f.key
                    ? 'bg-white/80 text-ink shadow-sm'
                    : 'text-mut hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {shownTx.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-mut">
            {t('Belum ada transaksi.', 'No transactions yet.')}
          </p>
        ) : (
          <ul className="divide-y divide-white/40">
            {shownTx.map((tx) => {
              const neg = tx.amount < 0;
              return (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-white/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink truncate">
                      {txTitle(tx, t)}
                    </p>
                    <p className="num text-[11px] text-mut mt-0.5 truncate">
                      {catLabel(tx.type, t)} · {tx.ref_id} ·{' '}
                      {relativeTime(tx.created_at, lang)}
                    </p>
                  </div>
                  <span
                    className={`num text-[14px] font-bold flex-shrink-0 ${neg ? 'text-rose-500' : 'text-emerald-600'}`}
                  >
                    {neg ? '−' : '+'}
                    {fmtNum(Math.abs(tx.amount))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Modal pembayaran (widget Kasugai) ───────────────────────── */}
      {payInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2a1c4a]/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setPayInfo(null)}
        >
          <div
            className="glass rounded-[22px] w-full max-w-[440px] max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[16px] font-bold text-ink">
                  {t('Pembayaran', 'Payment')}
                </h3>
                <p className="num text-[12px] text-mut mt-0.5">
                  {fmtNum(payInfo.credits)} {t('kredit', 'credits')} · Rp{' '}
                  {fmtNum(payInfo.amount_idr)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayInfo(null)}
                aria-label={t('Tutup', 'Close')}
                className="flex-shrink-0 p-1.5 rounded-lg text-mut hover:text-ink hover:bg-white/50 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {widgetError && (
              <div className="mb-3 text-[12.5px] text-rose-700 bg-rose-100/60 rounded-xl px-3 py-2">
                {widgetError}
              </div>
            )}

            {/* Target mount widget Kasugai */}
            <div id={WIDGET_MOUNT_ID} className="min-h-[180px]" />

            <p className="mt-4 text-[11px] text-mut leading-relaxed">
              {t(
                'Saldo masuk otomatis setelah pembayaran terkonfirmasi — aman meski halaman ditutup.',
                'Your balance is added automatically once payment is confirmed — safe to close this page.',
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOwnerTenants,
  getOwnerTenantAudit,
  ownerAddCredit,
  type OwnerTenant,
} from '../../api/client.js';
import { useLang } from '../../i18n/index.js';

type Lang = 'id' | 'en';

const jt = (idr: number) =>
  (idr / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
const rupiah = (idr: number) => idr.toLocaleString('id-ID');

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const TXN_LABEL: Record<string, { id: string; en: string }> = {
  topup: { id: 'Top-up', en: 'Top-up' },
  debit: { id: 'Pemakaian', en: 'Usage' },
  signup_bonus: { id: 'Bonus daftar', en: 'Signup bonus' },
  refund: { id: 'Refund', en: 'Refund' },
  adjustment: { id: 'Hibah owner', en: 'Owner grant' },
};
const PAY_STATUS: Record<
  string,
  { label: { id: string; en: string }; cls: string }
> = {
  paid: {
    label: { id: 'Lunas', en: 'Paid' },
    cls: 'text-emerald-700 bg-emerald-100/70',
  },
  pending: {
    label: { id: 'Menunggu', en: 'Pending' },
    cls: 'text-amber-700 bg-amber-100/70',
  },
  failed: {
    label: { id: 'Gagal', en: 'Failed' },
    cls: 'text-rose-600 bg-rose-100/70',
  },
  expired: {
    label: { id: 'Kadaluarsa', en: 'Expired' },
    cls: 'text-slate-600 bg-slate-200/70',
  },
};
const METHOD_LABEL: Record<string, { id: string; en: string }> = {
  qris: { id: 'QRIS', en: 'QRIS' },
  va: { id: 'Virtual Account', en: 'Virtual Account' },
  ewallet: { id: 'E-Wallet', en: 'E-Wallet' },
  card: { id: 'Kartu', en: 'Card' },
};

const STATUS_CFG: Record<
  string,
  { label: { id: string; en: string }; cls: string; dot: string }
> = {
  active: {
    label: { id: 'Aktif', en: 'Active' },
    cls: 'text-emerald-700 bg-emerald-100/70',
    dot: 'bg-emerald-500',
  },
  low: {
    label: { id: 'Saldo rendah', en: 'Low balance' },
    cls: 'text-orange-700 bg-orange-100/70',
    dot: 'bg-orange-500',
  },
  trial: {
    label: { id: 'Trial', en: 'Trial' },
    cls: 'text-slate-600 bg-slate-200/70',
    dot: 'bg-slate-400',
  },
};

const TINT = [
  'bg-gradient-to-br from-[#9b5de5] to-[#f15bb5]',
  'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]',
  'bg-gradient-to-br from-[#f15bb5] to-[#fca15b]',
  'bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]',
];

export default function OwnerTenants() {
  const qc = useQueryClient();
  const { lang, fmtNum } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const tenants = useQuery({
    queryKey: ['owner-tenants'],
    queryFn: getOwnerTenants,
  });

  const [search, setSearch] = useState('');
  const [creditTarget, setCreditTarget] = useState<OwnerTenant | null>(null);
  const [amount, setAmount] = useState('1000');
  const [auditTarget, setAuditTarget] = useState<OwnerTenant | null>(null);
  const [error, setError] = useState('');

  const addCredit = useMutation({
    mutationFn: ({ id, amt }: { id: string; amt: number }) =>
      ownerAddCredit(id, amt),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['owner-tenants'] });
      void qc.invalidateQueries({ queryKey: ['owner-summary'] });
      setCreditTarget(null);
      setAmount('1000');
      setError('');
    },
    onError: (e) =>
      setError(
        e instanceof Error
          ? e.message
          : t('Gagal menambah kredit', 'Failed to add credit'),
      ),
  });

  const audit = useQuery({
    queryKey: ['owner-audit', auditTarget?.id],
    queryFn: () => getOwnerTenantAudit(auditTarget!.id),
    enabled: !!auditTarget,
  });

  const list = tenants.data?.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? list.filter((tn) => tn.name.toLowerCase().includes(q)) : list;
  }, [list, search]);

  return (
    <div className="space-y-5">
      <div className="glass rounded-glass overflow-hidden">
        {/* Header + search */}
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <h1 className="text-[17px] font-bold text-ink">
            {t('Tenant', 'Tenants')}
          </h1>
          <div className="relative w-full max-w-[260px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mut pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('cari tenant…', 'search tenant…')}
              className="num w-full pl-9 pr-3 py-2 rounded-full glass-soft text-[12.5px] text-ink placeholder:text-mut focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-[10.5px] text-mut uppercase tracking-wider text-left border-y border-white/40">
                <th className="px-6 py-3 font-bold">{t('Tenant', 'Tenant')}</th>
                <th className="px-4 py-3 font-bold">{t('Paket', 'Plan')}</th>
                <th className="px-4 py-3 font-bold text-right">
                  {t('Dokumen', 'Documents')}
                </th>
                <th className="px-4 py-3 font-bold text-right">
                  {t('Sisa kredit', 'Credit left')}
                </th>
                <th className="px-4 py-3 font-bold text-right">MRR</th>
                <th className="px-4 py-3 font-bold">{t('Status', 'Status')}</th>
                <th className="px-6 py-3 font-bold text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {filtered.map((tn, i) => {
                const st = STATUS_CFG[tn.status] ?? STATUS_CFG.active!;
                const lowBal = tn.balance < 500;
                return (
                  <tr
                    key={tn.id}
                    className="hover:bg-white/25 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10.5px] font-bold flex-shrink-0 ${TINT[i % TINT.length]}`}
                        >
                          {tn.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13.5px] font-semibold text-ink">
                          {tn.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-mut capitalize">
                      {tn.plan === 'trial' ? 'Trial' : 'Prepaid'}
                    </td>
                    <td className="num px-4 py-3.5 text-right text-[13px] font-semibold text-ink">
                      {fmtNum(tn.docs)}
                    </td>
                    <td className="num px-4 py-3.5 text-right">
                      <span
                        className={`text-[13px] font-semibold ${lowBal ? 'text-orange-600' : 'text-ink'}`}
                      >
                        {fmtNum(tn.balance)}
                      </span>
                      <span className="text-[10px] text-mut ml-1">
                        {t('KREDIT', 'CREDIT')}
                      </span>
                    </td>
                    <td className="num px-4 py-3.5 text-right text-[12.5px] text-mut">
                      {tn.mrr_idr > 0
                        ? `Rp ${jt(tn.mrr_idr)} ${t('jt', 'M')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${st.cls}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                        />
                        {t(st.label.id, st.label.en)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAuditTarget(tn)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-soft text-[12px] font-semibold text-ink hover:bg-white/60 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-mut"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.85}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 6h16M4 12h16M4 18h10"
                            />
                          </svg>
                          {t('Audit', 'Audit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreditTarget(tn);
                            setError('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-brand-purple bg-white/50 hover:bg-white/70 transition-colors"
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
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          {t('Tambah kredit', 'Add credit')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-[13px] text-mut"
                  >
                    {tenants.isLoading
                      ? t('Memuat…', 'Loading…')
                      : t(
                          'Tidak ada tenant yang cocok.',
                          'No matching tenants.',
                        )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tambah kredit modal */}
      {creditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#2a1c4a]/40 backdrop-blur-sm"
            onClick={() => setCreditTarget(null)}
          />
          <div className="relative z-10 w-full max-w-[380px] glass rounded-[20px] p-6">
            <h3 className="text-[15px] font-bold text-ink">
              {t('Tambah kredit', 'Add credit')}
            </h3>
            <p className="text-[12.5px] text-mut mt-0.5 mb-4">
              {t('Hibah kredit untuk', 'Grant credit to')}{' '}
              <span className="font-semibold text-ink">
                {creditTarget.name}
              </span>{' '}
              ({t('saldo', 'balance')}: {fmtNum(creditTarget.balance)}{' '}
              {t('kredit', 'credits')}).
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = parseInt(amount, 10);
                if (!amt || amt <= 0) {
                  setError(
                    t(
                      'Jumlah harus lebih dari 0.',
                      'Amount must be greater than 0.',
                    ),
                  );
                  return;
                }
                addCredit.mutate({ id: creditTarget.id, amt });
              }}
              className="space-y-3"
            >
              <label className="block text-[12px] font-semibold text-ink">
                {t('Jumlah kredit', 'Credit amount')}
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="num w-full glass-soft rounded-xl px-3.5 py-2.5 text-[14px] text-ink focus:outline-none"
              />
              <div className="flex gap-1.5">
                {[500, 1000, 5000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="num px-2.5 py-1 rounded-lg glass-soft text-[11.5px] text-mut hover:text-ink transition-colors"
                  >
                    +{fmtNum(v)}
                  </button>
                ))}
              </div>
              {error && <p className="text-[12px] text-rose-600">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={addCredit.isPending}
                  className="px-5 py-2.5 text-[13px] font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.4)] disabled:opacity-50 hover:opacity-90 transition-all"
                >
                  {addCredit.isPending
                    ? t('Menambah…', 'Adding…')
                    : t('Tambah kredit', 'Add credit')}
                </button>
                <button
                  type="button"
                  onClick={() => setCreditTarget(null)}
                  className="px-5 py-2.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
                >
                  {t('Batal', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit modal */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#2a1c4a]/40 backdrop-blur-sm"
            onClick={() => setAuditTarget(null)}
          />
          <div className="relative z-10 w-full max-w-[480px] max-h-[85vh] overflow-y-auto glass rounded-[20px] p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-ink truncate">
                  {t('Audit', 'Audit')} — {auditTarget.name}
                </h3>
                <p className="num text-[11px] text-mut mt-0.5">
                  {auditTarget.id}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0 ${(STATUS_CFG[auditTarget.status] ?? STATUS_CFG.active!).cls}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${(STATUS_CFG[auditTarget.status] ?? STATUS_CFG.active!).dot}`}
                />
                {STATUS_CFG[auditTarget.status]
                  ? t(
                      STATUS_CFG[auditTarget.status]!.label.id,
                      STATUS_CFG[auditTarget.status]!.label.en,
                    )
                  : '—'}
              </span>
            </div>

            {audit.isLoading && (
              <div className="mt-5 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse bg-white/40 rounded-xl"
                  />
                ))}
              </div>
            )}

            {audit.isError && (
              <p className="mt-5 text-[12.5px] text-rose-600">
                {t('Gagal memuat audit', 'Failed to load audit')}:{' '}
                {audit.error instanceof Error
                  ? audit.error.message
                  : t('kesalahan tak dikenal', 'unknown error')}
              </p>
            )}

            {audit.data && (
              <>
                {/* Stat grid */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {[
                    {
                      label: t('Dokumen', 'Documents'),
                      value: fmtNum(audit.data.documents.total),
                    },
                    {
                      label: t('Selesai', 'Completed'),
                      value: fmtNum(audit.data.documents.completed),
                    },
                    {
                      label: t('Gagal', 'Failed'),
                      value: fmtNum(audit.data.documents.failed),
                    },
                    {
                      label: t('Sisa saldo', 'Balance left'),
                      value: `${fmtNum(audit.data.balance)} ${t('kr', 'cr')}`,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="glass-soft rounded-xl px-3.5 py-2.5"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-mut">
                        {s.label}
                      </p>
                      <p className="num mt-1 text-[16px] font-extrabold text-ink leading-none">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between glass-soft rounded-xl px-3.5 py-2.5">
                  <span className="text-[12px] text-mut">
                    {t('Pendapatan total', 'Total revenue')} (
                    {fmtNum(audit.data.payments_count)}{' '}
                    {t('pembayaran', 'payments')})
                  </span>
                  <span className="num text-[14px] font-bold text-emerald-600">
                    Rp {rupiah(audit.data.lifetime_revenue_idr)}
                  </span>
                </div>
                <p className="text-[11px] text-mut mt-2">
                  {t('Terdaftar', 'Registered')}{' '}
                  {fmtDate(audit.data.tenant.created_at, lang)}
                </p>

                {/* Transaksi saldo */}
                <h4 className="text-[12.5px] font-bold text-ink mt-5 mb-2">
                  {t('Transaksi saldo terakhir', 'Recent balance transactions')}
                </h4>
                {audit.data.transactions.length === 0 ? (
                  <p className="text-[12px] text-mut">
                    {t('Belum ada transaksi.', 'No transactions yet.')}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {audit.data.transactions.map((tx, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 py-1.5 border-b border-white/30 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-ink">
                            {TXN_LABEL[tx.type]
                              ? t(
                                  TXN_LABEL[tx.type]!.id,
                                  TXN_LABEL[tx.type]!.en,
                                )
                              : tx.type}
                          </p>
                          <p className="num text-[10.5px] text-mut">
                            {fmtDate(tx.created_at, lang)}
                            {tx.ref_type ? ` · ${tx.ref_type}` : ''}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p
                            className={`num text-[12.5px] font-bold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                          >
                            {tx.amount > 0 ? '+' : ''}
                            {fmtNum(tx.amount)}
                          </p>
                          <p className="num text-[10px] text-mut">
                            saldo {fmtNum(tx.balance_after)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Pembayaran */}
                <h4 className="text-[12.5px] font-bold text-ink mt-5 mb-2">
                  {t('Pembayaran', 'Payments')}
                </h4>
                {audit.data.payments.length === 0 ? (
                  <p className="text-[12px] text-mut">
                    {t('Belum ada pembayaran.', 'No payments yet.')}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {audit.data.payments.map((p, i) => {
                      const ps = PAY_STATUS[p.status] ?? PAY_STATUS.pending!;
                      return (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-3 py-1.5 border-b border-white/30 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="num text-[12.5px] font-semibold text-ink">
                              Rp {rupiah(p.amount_idr)}
                            </p>
                            <p className="num text-[10.5px] text-mut">
                              {METHOD_LABEL[p.method]
                                ? t(
                                    METHOD_LABEL[p.method]!.id,
                                    METHOD_LABEL[p.method]!.en,
                                  )
                                : p.method}{' '}
                              · {fmtDate(p.at, lang)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold flex-shrink-0 ${ps.cls}`}
                          >
                            {t(ps.label.id, ps.label.en)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setAuditTarget(null)}
              className="mt-5 w-full py-2.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
            >
              {t('Tutup', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

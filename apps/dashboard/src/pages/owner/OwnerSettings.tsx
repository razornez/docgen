import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOwnerSettings,
  saveOwnerSettings,
  type OwnerSettings,
} from '../../api/client.js';
import { useLang } from '../../i18n/index.js';

type HL = 'none' | 'popular' | 'hemat';
interface Row {
  key: string;
  id?: string;
  credits: string;
  bonus: string;
  price_idr: string;
  highlight: HL;
}

const HL_OPTIONS: { value: HL; id: string; en: string }[] = [
  { value: 'none', id: 'Tidak', en: 'No' },
  { value: 'popular', id: 'Populer', en: 'Popular' },
  { value: 'hemat', id: 'Hemat', en: 'Value' },
];

const num = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
};
const idr = (n: number) => n.toLocaleString('id-ID');

export default function OwnerSettings() {
  const { lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['owner-settings'],
    queryFn: getOwnerSettings,
  });
  const [bonus, setBonus] = useState('100');
  const [lowBal, setLowBal] = useState('100');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const keyRef = useRef(0);

  const seed = (data: OwnerSettings) => {
    setBonus(String(data.signup_bonus_credits));
    setLowBal(String(data.low_balance_threshold));
    setRows(
      data.packages.map((p) => ({
        key: `k${keyRef.current++}`,
        id: p.id,
        credits: String(p.credits),
        bonus: String(p.bonus),
        price_idr: String(p.price_idr),
        highlight: p.highlight,
      })),
    );
    setError('');
  };

  useEffect(() => {
    if (q.data) seed(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => {
      const packages = rows.map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        credits: num(r.credits),
        bonus: num(r.bonus),
        price_idr: num(r.price_idr),
        highlight: r.highlight,
      }));
      return saveOwnerSettings({
        signup_bonus_credits: num(bonus),
        low_balance_threshold: num(lowBal),
        packages,
      });
    },
    onSuccess: () => {
      setSaved(true);
      setError('');
      void qc.invalidateQueries({ queryKey: ['owner-settings'] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) =>
      setError(
        e instanceof Error
          ? e.message
          : t('Gagal menyimpan pengaturan', 'Failed to save settings'),
      ),
  });

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [
      ...rs,
      {
        key: `k${keyRef.current++}`,
        credits: '1000',
        bonus: '0',
        price_idr: '149000',
        highlight: 'none',
      },
    ]);
  const delRow = (key: string) =>
    setRows((rs) => rs.filter((r) => r.key !== key));

  const onSave = () => {
    if (rows.some((r) => num(r.credits) <= 0)) {
      setError(
        t(
          'Setiap paket harus punya kredit lebih dari 0.',
          'Each package must have more than 0 credits.',
        ),
      );
      return;
    }
    save.mutate();
  };

  const inputCls =
    'num w-full bg-white/70 border border-white/60 rounded-xl px-3.5 py-2.5 text-[13.5px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30';

  return (
    <div className="space-y-5">
      {/* ── Saldo gratis pendaftar baru ──────────────────────────────── */}
      <div className="glass rounded-glass px-6 py-5">
        <h1 className="text-[16px] font-bold text-ink">
          {t('Saldo gratis pendaftar baru', 'New signup free credits')}
        </h1>
        <p className="text-[12.5px] text-mut mt-0.5">
          {t(
            'Diberikan otomatis saat tenant baru mendaftar. Tampil di halaman publik.',
            'Granted automatically when a new tenant signs up. Shown on the public page.',
          )}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="number"
            min={0}
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            className="num w-[150px] bg-white/70 border border-white/60 rounded-xl px-4 py-3 text-[24px] font-extrabold text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <span className="text-[13px] text-mut">{t('kredit', 'credits')}</span>
          <span className="num ml-auto text-[12px] text-mut">
            ≈ {idr(num(bonus))} {t('dok', 'docs')}
          </span>
        </div>
      </div>

      {/* ── Ambang saldo rendah ──────────────────────────────────────── */}
      <div className="glass rounded-glass px-6 py-5">
        <h2 className="text-[16px] font-bold text-ink">
          {t('Ambang saldo rendah', 'Low balance threshold')}
        </h2>
        <p className="text-[12.5px] text-mut mt-0.5">
          {t(
            'Email peringatan dikirim ke tenant saat saldo turun di bawah angka ini. Isi 0 untuk menonaktifkan.',
            'A warning email is sent to the tenant when their balance drops below this. Set 0 to disable.',
          )}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="number"
            min={0}
            value={lowBal}
            onChange={(e) => setLowBal(e.target.value)}
            className="num w-[150px] bg-white/70 border border-white/60 rounded-xl px-4 py-3 text-[24px] font-extrabold text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <span className="text-[13px] text-mut">{t('kredit', 'credits')}</span>
        </div>
      </div>

      {/* ── Paket harga ──────────────────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h2 className="text-[16px] font-bold text-ink">
              {t('Paket harga', 'Pricing packages')}
            </h2>
            <p className="text-[12.5px] text-mut mt-0.5">
              {t(
                'Dipakai di halaman publik & dompet.',
                'Used on the public page & wallet.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-semibold text-brand-purple bg-white/55 hover:bg-white/75 transition-colors flex-shrink-0"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('Tambah paket', 'Add package')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="text-[10.5px] text-mut uppercase tracking-wider text-left border-y border-white/40">
                <th className="px-6 py-2.5 font-bold">
                  {t('Kredit', 'Credits')}
                </th>
                <th className="px-3 py-2.5 font-bold">{t('Bonus', 'Bonus')}</th>
                <th className="px-3 py-2.5 font-bold">
                  {t('Harga (Rp)', 'Price (Rp)')}
                </th>
                <th className="px-3 py-2.5 font-bold text-right">
                  {t('/Dok', '/Doc')}
                </th>
                <th className="px-3 py-2.5 font-bold">
                  {t('Sorot', 'Highlight')}
                </th>
                <th className="px-6 py-2.5 font-bold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30">
              {rows.map((r) => {
                const c = num(r.credits);
                const perDok = c > 0 ? Math.round(num(r.price_idr) / c) : 0;
                return (
                  <tr key={r.key}>
                    <td className="px-6 py-3 w-[150px]">
                      <input
                        type="number"
                        min={1}
                        value={r.credits}
                        onChange={(e) =>
                          setRow(r.key, { credits: e.target.value })
                        }
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-3 w-[130px]">
                      <input
                        type="number"
                        min={0}
                        value={r.bonus}
                        onChange={(e) =>
                          setRow(r.key, { bonus: e.target.value })
                        }
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-3 w-[170px]">
                      <input
                        type="number"
                        min={0}
                        value={r.price_idr}
                        onChange={(e) =>
                          setRow(r.key, { price_idr: e.target.value })
                        }
                        className={inputCls}
                      />
                    </td>
                    <td className="num px-3 py-3 text-right text-[13px] font-bold text-ink whitespace-nowrap">
                      Rp {idr(perDok)}
                    </td>
                    <td className="px-3 py-3 w-[150px]">
                      <select
                        value={r.highlight}
                        onChange={(e) =>
                          setRow(r.key, { highlight: e.target.value as HL })
                        }
                        className="w-full bg-white/70 border border-white/60 rounded-xl px-3 py-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                      >
                        {HL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {t(o.id, o.en)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => delRow(r.key)}
                        aria-label={t('Hapus paket', 'Delete package')}
                        className="p-2 rounded-lg bg-white/55 text-mut hover:text-rose-600 hover:bg-white/75 transition-colors"
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-[13px] text-mut"
                  >
                    {t(
                      'Belum ada paket. Tambah paket baru.',
                      'No packages yet. Add a new package.',
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer aksi ──────────────────────────────────────────────── */}
      {error && (
        <p className="text-[12.5px] text-rose-600 text-right">{error}</p>
      )}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-[12.5px] font-semibold text-emerald-600">
            {t('Tersimpan ✓', 'Saved ✓')}
          </span>
        )}
        <button
          type="button"
          onClick={() => q.data && seed(q.data)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
        >
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t('Reset', 'Reset')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={save.isPending}
          className="flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.4)] disabled:opacity-50 hover:opacity-90 transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {save.isPending
            ? t('Menyimpan…', 'Saving…')
            : t('Simpan pengaturan', 'Save settings')}
        </button>
      </div>
    </div>
  );
}

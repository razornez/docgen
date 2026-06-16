import { useQuery } from '@tanstack/react-query';
import { getOwnerBilling } from '../../api/client.js';

const jt = (idr: number) =>
  (idr / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 });
const rupiah = (idr: number) => idr.toLocaleString('id-ID');

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

const METHOD_LABEL: Record<string, string> = {
  qris: 'QRIS',
  va: 'Virtual Account',
  ewallet: 'E-Wallet',
  card: 'Kartu',
  bank_transfer: 'Transfer Bank',
};

function PlanBar({
  label,
  count,
  pct,
}: {
  label: string;
  count: number;
  pct: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="num text-[12px] text-mut">
          {count} · {pct}%
        </span>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-white/45 overflow-hidden">
        <div
          className="h-full rounded-full bg-grad origin-left animate-growBar"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function OwnerBilling() {
  const q = useQuery({ queryKey: ['owner-billing'], queryFn: getOwnerBilling });
  const d = q.data;

  const stats: { label: string; value: string }[] = d
    ? [
        { label: 'MRR', value: `Rp ${jt(d.mrr_idr)} jt` },
        { label: 'Pendapatan 30 hr', value: `Rp ${jt(d.revenue_30d_idr)} jt` },
        { label: 'Top-up 30 hr', value: `Rp ${jt(d.topup_30d_idr)} jt` },
        { label: 'Refund 30 hr', value: `Rp ${jt(d.refund_30d_idr)} jt` },
      ]
    : [];

  const total = d ? d.plan_split.prepaid + d.plan_split.trial : 0;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-5">
      {/* ── Header + stat strip ─────────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden">
        <div className="px-6 py-5">
          <h1 className="text-[17px] font-bold text-ink">Tagihan</h1>
          <p className="text-[12.5px] text-mut mt-0.5">
            Pendapatan, paket, dan pembayaran tenant.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/40 sm:divide-x divide-y sm:divide-y-0 divide-white/40">
          {(d ? stats : Array.from({ length: 4 })).map((s, i) => (
            <div key={i} className="px-6 py-4">
              {d ? (
                <>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut">
                    {(s as { label: string }).label}
                  </p>
                  <p className="num mt-1.5 text-[23px] font-extrabold text-ink leading-none">
                    {(s as { value: string }).value}
                  </p>
                </>
              ) : (
                <div className="h-10 animate-pulse bg-white/40 rounded-lg" />
              )}
            </div>
          ))}
        </div>
      </div>

      {d && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── Sebaran paket ─────────────────────────────────────── */}
          <div className="glass rounded-glass px-6 py-5">
            <h2 className="text-[14.5px] font-bold text-ink">Sebaran paket</h2>
            <div className="mt-5 space-y-4">
              <PlanBar
                label="Prepaid"
                count={d.plan_split.prepaid}
                pct={pct(d.plan_split.prepaid)}
              />
              <PlanBar
                label="Trial"
                count={d.plan_split.trial}
                pct={pct(d.plan_split.trial)}
              />
            </div>
          </div>

          {/* ── Pembayaran terbaru ────────────────────────────────── */}
          <div className="glass rounded-glass overflow-hidden">
            <div className="px-6 py-4 border-b border-white/40">
              <h2 className="text-[14.5px] font-bold text-ink">
                Pembayaran terbaru
              </h2>
            </div>
            <div className="divide-y divide-white/40">
              {d.recent_payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100/70 flex items-center justify-center text-emerald-600 flex-shrink-0">
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
                        d="M12 4v12m0 0l-4-4m4 4l4-4"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink truncate">
                      {p.tenant}
                    </p>
                    <p className="num text-[11px] text-mut truncate">
                      {METHOD_LABEL[p.method] ?? p.method} ·{' '}
                      {relativeTime(p.paid_at)}
                    </p>
                  </div>
                  <span className="num text-[13.5px] font-bold text-emerald-600 flex-shrink-0">
                    Rp {rupiah(p.amount_idr)}
                  </span>
                </div>
              ))}
              {d.recent_payments.length === 0 && (
                <p className="px-6 py-10 text-center text-[13px] text-mut">
                  Belum ada pembayaran.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

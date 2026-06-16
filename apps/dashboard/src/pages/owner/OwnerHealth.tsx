import { useQuery } from '@tanstack/react-query';
import { getOwnerHealth } from '../../api/client.js';
import { useLang } from '../../i18n/index.js';

export default function OwnerHealth() {
  const { lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const q = useQuery({ queryKey: ['owner-health'], queryFn: getOwnerHealth });
  const d = q.data;

  return (
    <div className="space-y-5">
      {/* ── Kesehatan sistem ─────────────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-[17px] font-bold text-ink">
              {t('Kesehatan sistem', 'System health')}
            </h1>
            <p className="text-[12.5px] text-mut mt-0.5">
              {t(
                'Worker render, API, antrian, penyimpanan, dan gateway bayar.',
                'Render workers, API, queue, storage, and payment gateway.',
              )}
            </p>
          </div>
          {d && (
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${d.status_ok ? 'bg-emerald-100/70 text-emerald-700' : 'bg-rose-100/70 text-rose-600'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${d.status_ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              {d.status_ok
                ? t('Semua sistem normal', 'All systems normal')
                : t('Ada gangguan', 'Disruption detected')}
            </span>
          )}
        </div>
        <div className="border-t border-white/40 divide-y divide-white/40">
          {(d ? d.systems : Array.from({ length: 5 })).map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 px-6 py-3.5"
            >
              {d ? (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${(s as { ok: boolean }).ok ? 'bg-emerald-500' : 'bg-[#f15bb5]'}`}
                    />
                    <span className="text-[13.5px] font-semibold text-ink truncate">
                      {(s as { label: string }).label}
                    </span>
                  </div>
                  <span className="num text-[11px] text-mut text-right flex-shrink-0">
                    {(s as { meta: string }).meta}
                  </span>
                </>
              ) : (
                <div className="h-4 w-full animate-pulse bg-white/40 rounded" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Insiden terbaru ──────────────────────────────────────────── */}
      <div className="glass rounded-glass px-6 py-5">
        <h2 className="text-[14.5px] font-bold text-ink">
          {t('Insiden terbaru', 'Recent incidents')}
        </h2>
        {d && d.incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-xl bg-grad flex items-center justify-center text-white shadow-[0_4px_14px_rgba(155,93,229,0.35)]">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <p className="mt-3 text-[13px] text-mut">
              {t(
                'Tidak ada insiden 90 hari terakhir.',
                'No incidents in the last 90 days.',
              )}
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-white/40">
            {d?.incidents.map((inc, i) => (
              <li
                key={i}
                className="flex items-center justify-between py-2.5 text-[13px]"
              >
                <span className="text-ink">{inc.title}</span>
                <span className="num text-[11px] text-mut">{inc.at}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

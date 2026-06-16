import { useQuery } from '@tanstack/react-query';
import { getOwnerRender, type OwnerRender } from '../../api/client.js';
import { useLang } from '../../i18n/index.js';

const JOB_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  completed: {
    label: 'Selesai',
    cls: 'text-emerald-700 bg-emerald-100/70',
    dot: 'bg-emerald-500',
  },
  processing: {
    label: 'Proses',
    cls: 'text-blue-700 bg-blue-100/70',
    dot: 'bg-blue-500',
  },
  failed: {
    label: 'Gagal',
    cls: 'text-rose-600 bg-rose-100/70',
    dot: 'bg-rose-500',
  },
  queued: {
    label: 'Antrian',
    cls: 'text-slate-600 bg-slate-200/70',
    dot: 'bg-slate-400',
  },
};

function durationText(status: string, dur: number | null): string {
  if (status === 'failed') return 'durasi timeout';
  if (status === 'completed' && dur != null)
    return `durasi ${dur.toLocaleString('id-ID', { maximumFractionDigits: 1 })}s`;
  return 'durasi —';
}

function ThroughputCard({ d }: { d: OwnerRender }) {
  const { fmtNum } = useLang();
  const max = Math.max(...d.throughput.days14, 1);
  return (
    <div className="glass rounded-glass px-6 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[14.5px] font-bold text-ink">Throughput 14 hari</h2>
        <span className="num text-[11px] text-mut">
          {fmtNum(d.throughput.per_day)} dok/hari
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-2 h-[150px]">
        {d.throughput.days14.map((v, i) => {
          const hPx = Math.max((v / max) * 116, 6);
          const isLast = i === d.throughput.days14.length - 1;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-1.5"
              title={`${fmtNum(v)} dok`}
            >
              <span
                className={`num text-[8.5px] font-semibold leading-none ${isLast ? 'text-brand-purple' : 'text-mut'}`}
              >
                {fmtNum(v)}
              </span>
              <div
                className={`w-full rounded-t-lg origin-bottom animate-growBar ${isLast ? 'bg-grad' : 'bg-brand-purple/25'}`}
                style={{ height: `${hPx}px`, animationDelay: `${i * 40}ms` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OwnerSystem() {
  const { fmtNum } = useLang();
  const q = useQuery({ queryKey: ['owner-render'], queryFn: getOwnerRender });
  const d = q.data;

  const stats = d
    ? [
        { label: 'Worker', value: fmtNum(d.stats.workers) },
        { label: 'Berjalan', value: fmtNum(d.stats.running) },
        { label: 'Antri', value: fmtNum(d.stats.queued) },
        { label: 'P95', value: `${d.stats.p95}s` },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* ── Header + stat strip ─────────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-[17px] font-bold text-ink">Render</h1>
            <p className="text-[12.5px] text-mut mt-0.5">
              Worker Chromium, throughput, dan job render terbaru.
            </p>
          </div>
          {d && (
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${d.status_ok ? 'bg-emerald-100/70 text-emerald-700' : 'bg-rose-100/70 text-rose-600'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${d.status_ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              {d.status_ok ? 'Semua sistem normal' : 'Ada gangguan'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/40 sm:divide-x divide-y sm:divide-y-0 divide-white/40">
          {(d ? stats : Array.from({ length: 4 })).map((s, i) => (
            <div key={i} className="px-6 py-4">
              {d ? (
                <>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut">
                    {(s as { label: string }).label}
                  </p>
                  <p className="num mt-1.5 text-[24px] font-extrabold text-ink leading-none">
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
        <>
          {/* ── Throughput ─────────────────────────────────────────── */}
          <ThroughputCard d={d} />

          {/* ── Job render terbaru ─────────────────────────────────── */}
          <div className="glass rounded-glass overflow-hidden">
            <div className="px-6 py-4 border-b border-white/40">
              <h2 className="text-[14.5px] font-bold text-ink">
                Job render terbaru
              </h2>
            </div>
            <div className="divide-y divide-white/40">
              {d.recent_jobs.map((j) => {
                const cfg = JOB_CFG[j.status] ?? JOB_CFG.queued!;
                return (
                  <div
                    key={j.id}
                    className="flex items-center gap-3 px-6 py-3.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center text-brand-purple flex-shrink-0">
                      <svg
                        className="w-4 h-4"
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
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink truncate">
                        {j.tenant}
                      </p>
                      <p className="num text-[11px] text-mut truncate">
                        {j.template} · {durationText(j.status, j.duration_s)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0 ${cfg.cls}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
              {d.recent_jobs.length === 0 && (
                <p className="px-6 py-10 text-center text-[13px] text-mut">
                  Belum ada job render.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

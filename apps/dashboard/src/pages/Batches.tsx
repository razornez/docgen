import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBatches,
  getBatchDocuments,
  getTemplates,
  createBatch,
  type BatchDocumentItem,
  type BatchItem,
} from '../api/client.js';
import { StatusBadge } from './Dashboard.js';
import { useLang } from '../i18n/index.js';

const PLACEHOLDER_ITEMS = `[
  { "ref": "doc-001", "data": { "nama": "Andi Wijaya", "total": "Rp 500.000" } },
  { "ref": "doc-002", "data": { "nama": "Budi Santoso", "total": "Rp 750.000" } }
]`;

const inputCls =
  'w-full glass-soft rounded-2xl px-4 py-2.5 text-sm text-ink focus:outline-none placeholder:text-mut';

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

const ICON_TINT: Record<string, string> = {
  completed: 'bg-emerald-100/70 text-emerald-600',
  partially_failed: 'bg-orange-100/70 text-orange-600',
  failed: 'bg-rose-100/70 text-rose-600',
  processing: 'bg-indigo-100/70 text-brand-purple',
  queued: 'bg-slate-200/70 text-slate-500',
};

function DocStatusBadge({
  status,
  lang,
}: {
  status: string;
  lang: 'id' | 'en';
}) {
  const cfg: Record<string, { cls: string; label: string }> = {
    completed: {
      cls: 'bg-emerald-100/70 text-emerald-700',
      label: lang === 'en' ? 'Done' : 'Selesai',
    },
    failed: {
      cls: 'bg-rose-100/70 text-rose-600',
      label: lang === 'en' ? 'Failed' : 'Gagal',
    },
    processing: {
      cls: 'bg-blue-100/70 text-blue-700',
      label: lang === 'en' ? 'Processing' : 'Proses',
    },
    queued: {
      cls: 'bg-slate-200/70 text-slate-500',
      label: lang === 'en' ? 'Queued' : 'Antrian',
    },
  };
  const { cls, label } = cfg[status] ?? {
    cls: 'bg-slate-200/70 text-slate-500',
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function BatchDocumentsPanel({
  batchId,
  lang,
}: {
  batchId: string;
  lang: 'id' | 'en';
}) {
  const docs = useQuery({
    queryKey: ['batch-documents', batchId],
    queryFn: () => getBatchDocuments(batchId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return data.data.some(
        (d) => d.status === 'queued' || d.status === 'processing',
      )
        ? 3000
        : false;
    },
  });

  return (
    <div className="mt-3 rounded-2xl glass-soft p-4">
      {docs.isLoading && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-white/60 border-t-brand-purple rounded-full animate-spin" />
        </div>
      )}
      {docs.data && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10.5px] text-mut uppercase tracking-wider text-left border-b border-white/50">
              <th className="pb-2 pr-4 font-semibold">Ref</th>
              <th className="pb-2 pr-4 font-semibold">Status</th>
              <th className="pb-2 pr-4 text-center font-semibold">
                {lang === 'en' ? 'Pages' : 'Halaman'}
              </th>
              <th className="pb-2 text-right font-semibold">
                {lang === 'en' ? 'Action' : 'Aksi'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {docs.data.data.map((doc: BatchDocumentItem) => (
              <tr key={doc.id}>
                <td className="py-2 pr-4">
                  <span className="num text-[12px] text-ink">
                    {doc.ref ?? doc.id}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <DocStatusBadge status={doc.status} lang={lang} />
                  {doc.error && (
                    <p
                      className="text-[11px] text-rose-500 mt-0.5 max-w-xs truncate"
                      title={doc.error}
                    >
                      {doc.error}
                    </p>
                  )}
                </td>
                <td className="num py-2 pr-4 text-center text-mut text-[12px]">
                  {doc.page_count ?? '—'}
                </td>
                <td className="py-2 text-right">
                  {doc.status === 'completed' && doc.output_url ? (
                    <a
                      href={doc.output_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-xl text-white bg-grad hover:opacity-90 transition-opacity"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      PDF
                    </a>
                  ) : (
                    <span className="text-[12px] text-mut">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BatchRow({
  b,
  open,
  onToggle,
  lang,
}: {
  b: BatchItem;
  open: boolean;
  onToggle: () => void;
  lang: 'id' | 'en';
}) {
  const pct = b.total > 0 ? (b.completed / b.total) * 100 : 0;
  const done = b.status === 'completed' || b.status === 'partially_failed';
  const failed = b.status === 'partially_failed' || b.status === 'failed';
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-4">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ICON_TINT[b.status] ?? 'bg-slate-200/70 text-slate-500'}`}
        >
          <svg
            className="w-4.5 h-4.5"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.85}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="num text-[13.5px] font-semibold text-ink truncate">
            {b.id}
          </p>
          <p className="num text-[11px] text-mut mt-0.5">
            {b.completed}/{b.total} · {relativeTime(b.created_at, lang)}
          </p>
        </div>
        <StatusBadge status={b.status} />
        {done && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={lang === 'en' ? 'View documents' : 'Lihat dokumen'}
            className="w-8 h-8 rounded-lg glass-soft flex items-center justify-center text-mut hover:text-ink transition-colors flex-shrink-0"
          >
            {failed ? (
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
            ) : (
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="mt-2.5 h-1.5 rounded-full bg-white/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-grad transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {open && <BatchDocumentsPanel batchId={b.id} lang={lang} />}
    </div>
  );
}

export default function BatchesPage() {
  const qc = useQueryClient();
  const { fmtNum, lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const batches = useQuery({
    queryKey: ['batches'],
    queryFn: getBatches,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5000;
      return data.data.some(
        (b) => b.status === 'queued' || b.status === 'processing',
      )
        ? 5000
        : false;
    },
  });
  const templates = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const [showForm, setShowForm] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [itemsJson, setItemsJson] = useState(PLACEHOLDER_ITEMS);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [formError, setFormError] = useState('');

  const list = batches.data?.data ?? [];
  const batchesThisMonth = list.filter((b) => isThisMonth(b.created_at)).length;
  const docsPrinted = list.reduce((s, b) => s + b.completed, 0);
  const totalFailed = list.reduce((s, b) => s + b.failed, 0);
  const successRate =
    docsPrinted + totalFailed > 0
      ? (docsPrinted / (docsPrinted + totalFailed)) * 100
      : 100;

  const create = useMutation({
    mutationFn: createBatch,
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['batches'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
      setShowForm(false);
      setItemsJson(PLACEHOLDER_ITEMS);
      setTemplateId('');
      setWebhookUrl('');
      setSelectedBatchId(res.id);
    },
    onError: (e) =>
      setFormError(
        e instanceof Error
          ? e.message
          : t('Gagal membuat batch', 'Failed to create batch'),
      ),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    let items: { ref: string; data: Record<string, unknown> }[];
    try {
      const parsed = JSON.parse(itemsJson) as unknown;
      if (!Array.isArray(parsed))
        throw new Error(t('Harus berupa array JSON', 'Must be a JSON array'));
      items = parsed as typeof items;
    } catch {
      setFormError(
        t(
          'Format JSON tidak valid. Pastikan berupa array [ { "ref": "...", "data": {...} }, ... ]',
          'Invalid JSON format. Make sure it is an array [ { "ref": "...", "data": {...} }, ... ]',
        ),
      );
      return;
    }
    create.mutate({
      template: templateId,
      items,
      ...(webhookUrl.trim() ? { webhook_url: webhookUrl.trim() } : {}),
    });
  }

  const stats = [
    {
      label: t('Batch bulan ini', 'Batches this month'),
      value: fmtNum(batchesThisMonth),
    },
    {
      label: t('Dokumen tercetak', 'Documents generated'),
      value: fmtNum(docsPrinted),
    },
    {
      label: t('Tingkat sukses', 'Success rate'),
      value: `${successRate.toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header card + stat strip ────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-[17px] font-bold text-ink">Batch</h1>
            <p className="text-[12.5px] text-mut mt-0.5">
              {t(
                'Generate banyak dokumen sekaligus dari satu template + data.',
                'Generate many documents at once from a single template + data.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormError('');
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-grad text-white text-[12.5px] font-bold shadow-[0_4px_14px_rgba(155,93,229,0.4)] hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('Buat batch', 'New batch')}
          </button>
        </div>
        <div className="grid grid-cols-3 border-t border-white/40 divide-x divide-white/40">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-4">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-mut">
                {s.label}
              </p>
              <p className="num mt-1.5 text-[24px] font-extrabold text-ink leading-none">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Create form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass rounded-glass p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14.5px] font-bold text-ink">
              {t('Buat batch baru', 'Create a new batch')}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormError('');
              }}
              className="w-7 h-7 rounded-xl glass-soft flex items-center justify-center text-mut hover:text-ink transition-colors"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
                {t('Template', 'Template')}
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                required
                className={inputCls}
              >
                <option value="">
                  {t('-- Pilih template --', '-- Select template --')}
                </option>
                {templates.data?.data.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (v{t.current_version})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
                {t('Data items', 'Data items')}{' '}
                <span className="font-normal text-mut">
                  {t(
                    '(JSON array, maks. 500 item)',
                    '(JSON array, max. 500 items)',
                  )}
                </span>
              </label>
              <textarea
                value={itemsJson}
                onChange={(e) => setItemsJson(e.target.value)}
                required
                rows={9}
                className="num w-full glass-soft rounded-2xl px-4 py-3 text-[12.5px] text-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
                Webhook URL{' '}
                <span className="font-normal text-mut">
                  {t('(opsional)', '(optional)')}
                </span>
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourapp.com/webhooks/batch"
                className={inputCls}
              />
            </div>
            {formError && (
              <div className="flex items-start gap-2 text-[12.5px] text-rose-700 bg-rose-100/60 rounded-2xl px-4 py-3">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
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
                {formError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={create.isPending}
                className="px-5 py-2.5 text-sm font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.4)] disabled:opacity-50 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {create.isPending
                  ? t('Membuat…', 'Creating…')
                  : t('Buat batch', 'Create batch')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
                className="px-5 py-2.5 text-sm font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
              >
                {t('Batal', 'Cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Batch list ──────────────────────────────────────────────── */}
      <div className="glass rounded-glass overflow-hidden divide-y divide-white/40">
        {list.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-mut">
            {t(
              'Belum ada batch. Klik "Buat batch" untuk mulai.',
              'No batches yet. Click "New batch" to get started.',
            )}
          </p>
        ) : (
          list.map((b) => (
            <BatchRow
              key={b.id}
              b={b}
              open={selectedBatchId === b.id}
              onToggle={() =>
                setSelectedBatchId(selectedBatchId === b.id ? null : b.id)
              }
              lang={lang}
            />
          ))
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBatches,
  getBatchDocuments,
  getTemplates,
  createBatch,
  type BatchDocumentItem,
} from '../api/client.js';
import { StatusBadge } from './Dashboard.js';

const PLACEHOLDER_ITEMS = `[
  { "ref": "doc-001", "data": { "nama": "Andi Wijaya", "total": "Rp 500.000" } },
  { "ref": "doc-002", "data": { "nama": "Budi Santoso", "total": "Rp 750.000" } }
]`;

const inputCls =
  'w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all placeholder:text-slate-300';

function DocStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    failed: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
    processing: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    queued: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${cfg[status] ?? 'bg-slate-100 text-slate-500'}`}
    >
      {status}
    </span>
  );
}

function BatchDocumentsPanel({
  batchId,
  onClose,
}: {
  batchId: string;
  onClose: () => void;
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
    <div
      className="mx-4 mb-4 rounded-2xl p-4 ring-1 ring-indigo-100"
      style={{ background: 'linear-gradient(135deg, #eef2ff, #faf5ff)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-indigo-600 uppercase tracking-wider">
          Dokumen — {batchId}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-indigo-400 hover:text-indigo-600 transition-colors"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {docs.isLoading && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {docs.data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-indigo-400 uppercase tracking-wider text-left border-b border-indigo-100/60">
                <th className="pb-2 pr-4 font-semibold">Ref</th>
                <th className="pb-2 pr-4 font-semibold">Status</th>
                <th className="pb-2 pr-4 text-center font-semibold">Halaman</th>
                <th className="pb-2 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100/40">
              {docs.data.data.map((doc: BatchDocumentItem) => (
                <tr
                  key={doc.id}
                  className="hover:bg-white/40 transition-colors"
                >
                  <td className="py-2 pr-4">
                    <span className="font-mono text-[12px] text-slate-600">
                      {doc.ref ?? doc.id}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <DocStatusBadge status={doc.status} />
                    {doc.error && (
                      <p
                        className="text-[11px] text-rose-500 mt-0.5 max-w-xs truncate"
                        title={doc.error}
                      >
                        {doc.error}
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-center text-slate-400 text-[12px]">
                    {doc.page_count ?? '—'}
                  </td>
                  <td className="py-2 text-right">
                    {doc.status === 'completed' && doc.output_url ? (
                      <a
                        href={doc.output_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-xl text-white transition-all hover:opacity-90 shadow-sm shadow-indigo-200"
                        style={{
                          background:
                            'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        }}
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
                      <span className="text-[12px] text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {docs.data.has_more && (
            <p className="text-[11.5px] text-indigo-400 mt-3 text-center">
              Ada lebih banyak dokumen — gunakan API untuk mengambil semua.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function BatchesPage() {
  const qc = useQueryClient();
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

  const create = useMutation({
    mutationFn: createBatch,
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['batches'] });
      // Batch mendebit kredit → segarkan saldo (header baca ['me'], Wallet baca keduanya).
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
      setShowForm(false);
      setItemsJson(PLACEHOLDER_ITEMS);
      setTemplateId('');
      setWebhookUrl('');
      setSelectedBatchId(res.id);
    },
    onError: (e) =>
      setFormError(e instanceof Error ? e.message : 'Gagal membuat batch'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    let items: { ref: string; data: Record<string, unknown> }[];
    try {
      const parsed = JSON.parse(itemsJson) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Harus berupa array JSON');
      items = parsed as typeof items;
    } catch {
      setFormError(
        'Format JSON tidak valid. Pastikan berupa array [ { "ref": "...", "data": {...} }, ... ]',
      );
      return;
    }
    create.mutate({
      template: templateId,
      items,
      ...(webhookUrl.trim() ? { webhook_url: webhookUrl.trim() } : {}),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setFormError('');
          }}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-2xl text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-indigo-200"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Batch baru
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14.5px] font-semibold text-slate-800">
              Buat batch baru
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormError('');
              }}
              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
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
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                required
                className={inputCls}
              >
                <option value="">-- Pilih template --</option>
                {templates.data?.data.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (v{t.current_version})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                Data items{' '}
                <span className="font-normal text-slate-400">
                  (JSON array, maks. 500 item)
                </span>
              </label>
              <p className="text-[11.5px] text-slate-400 mb-2">
                Setiap item butuh{' '}
                <code className="bg-slate-100 px-1 rounded-md">ref</code> unik
                dan <code className="bg-slate-100 px-1 rounded-md">data</code>{' '}
                sesuai template.
              </p>
              <textarea
                value={itemsJson}
                onChange={(e) => setItemsJson(e.target.value)}
                required
                rows={10}
                className="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                Webhook URL{' '}
                <span className="font-normal text-slate-400">(opsional)</span>
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourapp.com/webhooks/batch"
                className={inputCls}
              />
              <p className="text-[11.5px] text-slate-400 mt-1.5">
                Notifikasi dikirim ke URL ini saat batch selesai.
              </p>
            </div>

            {formError && (
              <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-2xl px-4 py-3">
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
                className="px-5 py-2.5 text-sm font-semibold rounded-2xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-indigo-200"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                }}
              >
                {create.isPending ? 'Membuat…' : 'Buat batch'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
                className="px-5 py-2.5 text-sm font-semibold rounded-2xl text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch list */}
      <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-[14.5px] font-semibold text-slate-800">Batch</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
                <th className="px-6 py-3 font-semibold">Batch ID</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-center">Total</th>
                <th className="px-6 py-3 font-semibold text-center">Selesai</th>
                <th className="px-6 py-3 font-semibold text-center">Gagal</th>
                <th className="px-6 py-3 font-semibold text-right">Kredit</th>
                <th className="px-6 py-3 font-semibold text-right">Dibuat</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {batches.data?.data.map((b) => (
                <>
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-50/60 transition-colors border-t border-slate-50 first:border-t-0 ${selectedBatchId === b.id ? 'bg-indigo-50/30' : ''}`}
                  >
                    <td className="px-6 py-3.5 font-mono text-[12px] text-slate-500">
                      {b.id}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-3.5 text-center text-slate-600">
                      {b.total}
                    </td>
                    <td className="px-6 py-3.5 text-center text-emerald-600 font-semibold">
                      {b.completed}
                    </td>
                    <td className="px-6 py-3.5 text-center text-rose-500 font-semibold">
                      {b.failed}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      {b.credits_reserved}
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-400">
                      {new Date(b.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBatchId(
                            selectedBatchId === b.id ? null : b.id,
                          )
                        }
                        className={`text-[12px] font-semibold transition-colors px-3 py-1 rounded-xl ${
                          selectedBatchId === b.id
                            ? 'text-indigo-600 bg-indigo-50'
                            : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'
                        }`}
                      >
                        {selectedBatchId === b.id ? '▲ Tutup' : '▼ Dokumen'}
                      </button>
                    </td>
                  </tr>
                  {selectedBatchId === b.id && (
                    <tr key={`${b.id}-docs`}>
                      <td colSpan={8} className="pt-0 pb-2">
                        <BatchDocumentsPanel
                          batchId={b.id}
                          onClose={() => setSelectedBatchId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {batches.data?.data.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    Belum ada batch. Klik "Batch baru" untuk mulai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

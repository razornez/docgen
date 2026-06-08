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

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-600',
    processing: 'bg-yellow-100 text-yellow-700',
    queued: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}
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
      const hasProcessing = data.data.some(
        (d) => d.status === 'queued' || d.status === 'processing',
      );
      return hasProcessing ? 3000 : false;
    },
  });

  return (
    <div className="bg-indigo-50 border-t border-indigo-100 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
          Dokumen — {batchId}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-indigo-400 hover:text-indigo-700"
        >
          ✕ Tutup
        </button>
      </div>

      {docs.isLoading && (
        <p className="text-sm text-indigo-400 text-center py-4">
          Memuat dokumen…
        </p>
      )}

      {docs.data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-indigo-400 uppercase text-left border-b border-indigo-200">
                <th className="pb-2 pr-4">Ref</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4 text-center">Halaman</th>
                <th className="pb-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100">
              {docs.data.data.map((doc: BatchDocumentItem) => (
                <tr key={doc.id} className="hover:bg-indigo-100/40">
                  <td className="py-2 pr-4">
                    <span className="font-mono text-xs text-gray-700">
                      {doc.ref ?? doc.id}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <DocStatusBadge status={doc.status} />
                    {doc.error && (
                      <p
                        className="text-xs text-red-500 mt-0.5 max-w-xs truncate"
                        title={doc.error}
                      >
                        {doc.error}
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-center text-gray-500 text-xs">
                    {doc.page_count ?? '—'}
                  </td>
                  <td className="py-2 text-right">
                    {doc.status === 'completed' && doc.output_url ? (
                      <a
                        href={doc.output_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        ↓ PDF
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {docs.data.has_more && (
            <p className="text-xs text-indigo-400 mt-2 text-center">
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
      const hasActive = data.data.some(
        (b) => b.status === 'queued' || b.status === 'processing',
      );
      return hasActive ? 5000 : false;
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
      setShowForm(false);
      setItemsJson(PLACEHOLDER_ITEMS);
      setTemplateId('');
      setWebhookUrl('');
      setSelectedBatchId(res.batch.id);
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Batches</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setFormError('');
          }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + New batch
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Buat batch baru</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data items (JSON array)
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Setiap item butuh{' '}
                <code className="bg-gray-100 px-1 rounded">ref</code> unik dan{' '}
                <code className="bg-gray-100 px-1 rounded">data</code> sesuai
                template. Maksimal 500 item.
              </p>
              <textarea
                value={itemsJson}
                onChange={(e) => setItemsJson(e.target.value)}
                required
                rows={10}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL{' '}
                <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourapp.com/webhooks/batch"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Notifikasi dikirim ke URL ini saat batch selesai.
              </p>
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={create.isPending}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {create.isPending ? 'Membuat…' : 'Buat batch'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase text-left border-b border-gray-100">
                <th className="px-5 py-3">Batch ID</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Total</th>
                <th className="px-5 py-3 text-center">Selesai</th>
                <th className="px-5 py-3 text-center">Gagal</th>
                <th className="px-5 py-3 text-right">Kredit</th>
                <th className="px-5 py-3 text-right">Dibuat</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {batches.data?.data.map((b) => (
                <>
                  <tr
                    key={b.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedBatchId === b.id ? 'bg-indigo-50/60' : ''} border-t border-gray-100 first:border-t-0`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">
                      {b.id}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-3 text-center text-gray-700">
                      {b.total}
                    </td>
                    <td className="px-5 py-3 text-center text-green-600">
                      {b.completed}
                    </td>
                    <td className="px-5 py-3 text-center text-red-500">
                      {b.failed}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {b.credits_reserved}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {new Date(b.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBatchId(
                            selectedBatchId === b.id ? null : b.id,
                          )
                        }
                        className={`text-xs font-medium transition-colors ${
                          selectedBatchId === b.id
                            ? 'text-indigo-600 hover:text-indigo-800'
                            : 'text-gray-400 hover:text-indigo-600'
                        }`}
                      >
                        {selectedBatchId === b.id ? '▲ Tutup' : '▼ Dokumen'}
                      </button>
                    </td>
                  </tr>
                  {selectedBatchId === b.id && (
                    <tr key={`${b.id}-docs`}>
                      <td colSpan={8} className="p-0">
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
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Belum ada batch. Klik "+ New batch" untuk mulai.
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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWebhooks, createWebhook, deleteWebhook } from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.js';

const EVENTS = [
  'batch.completed',
  'batch.partially_failed',
  'batch.failed',
  'document.failed',
  'balance.low',
];

export default function WebhooksPage() {
  const qc = useQueryClient();
  const webhooks = useQuery({ queryKey: ['webhooks'], queryFn: getWebhooks });

  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'batch.completed',
  ]);
  const [formError, setFormError] = useState('');
  const [secret, setSecret] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: createWebhook,
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['webhooks'] });
      setSecret(data.secret);
      setShowForm(false);
      setUrl('');
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Failed'),
  });

  const del = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  function toggleEvent(ev: string) {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSecret('');
    create.mutate({ url: url.trim(), events: selectedEvents });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Webhook Endpoints</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setSecret('');
          }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Add endpoint
        </button>
      </div>

      {secret && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Signing secret — save it now, won't be shown again.
          </p>
          <code className="text-sm font-mono text-amber-900 break-all">
            {secret}
          </code>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">New endpoint</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL (HTTPS)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://yourapp.com/webhooks/docgen"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Events
              </p>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map((ev) => (
                  <label
                    key={ev}
                    className="flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="text-indigo-600"
                    />
                    <span className="text-gray-700">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={create.isPending || selectedEvents.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {create.isPending ? 'Adding…' : 'Add endpoint'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError('');
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase text-left border-b border-gray-100">
                <th className="px-5 py-3">URL</th>
                <th className="px-5 py-3">Events</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {webhooks.data?.data.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700 max-w-xs truncate">
                    {w.url}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {w.events.map((ev) => (
                        <span
                          key={ev}
                          className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        w.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {w.active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(w.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {w.active && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(w.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {webhooks.data?.data.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    No webhook endpoints configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Hapus webhook endpoint?"
        message="Endpoint yang dihapus tidak akan menerima notifikasi lagi. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, hapus"
        danger
        onConfirm={() => {
          if (deleteTarget) del.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-sm text-gray-600 space-y-1">
        <p className="font-semibold text-gray-800">Signature verification</p>
        <p>
          Each request includes{' '}
          <code className="bg-gray-100 px-1 rounded">
            X-DocGen-Signature-256
          </code>{' '}
          — HMAC-SHA256 of the payload body using your endpoint secret.
        </p>
        <p className="font-mono text-xs">
          sha256=&lt;hex&gt; = HMAC-SHA256(secret, body)
        </p>
      </div>
    </div>
  );
}

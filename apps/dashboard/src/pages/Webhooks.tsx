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

const inputCls =
  'w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all placeholder:text-slate-300';

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
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Gagal'),
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
    <div className="space-y-6 max-w-4xl">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div />
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setSecret('');
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
          Tambah endpoint
        </button>
      </div>

      {/* Signing secret alert */}
      {secret && (
        <div
          className="rounded-3xl p-5 ring-1 ring-amber-200"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fefce8)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4.5 h-4.5 w-[18px] h-[18px] text-amber-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-amber-800 mb-1.5">
                Signing secret — simpan sekarang, tidak akan ditampilkan lagi.
              </p>
              <code className="text-[12px] font-mono text-amber-900 break-all bg-amber-100/60 rounded-xl px-3 py-2 block">
                {secret}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14.5px] font-semibold text-slate-800">
              Endpoint baru
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
                URL (HTTPS)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://yourapp.com/webhooks/docgen"
                className={inputCls}
              />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-slate-600 mb-2">
                Events
              </p>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map((ev) => (
                  <label
                    key={ev}
                    className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-2xl ring-1 text-[12.5px] transition-all ${
                      selectedEvents.includes(ev)
                        ? 'bg-indigo-50 ring-indigo-300 text-indigo-700 font-semibold'
                        : 'bg-white ring-slate-200 text-slate-600 hover:ring-indigo-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="accent-indigo-500"
                    />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-2xl px-4 py-3">
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
                {formError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={create.isPending || selectedEvents.length === 0}
                className="px-5 py-2.5 text-sm font-semibold rounded-2xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-indigo-200"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                }}
              >
                {create.isPending ? 'Menambahkan…' : 'Tambah endpoint'}
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

      {/* Webhooks list */}
      <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-[14.5px] font-semibold text-slate-800">
            Endpoints terdaftar
          </h2>
        </div>
        {webhooks.data?.data.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            Belum ada webhook endpoint.
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {webhooks.data?.data.map((w) => (
              <li
                key={w.id}
                className="px-6 py-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${w.active ? 'text-emerald-600' : 'text-slate-400'}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${w.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        />
                        {w.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <span className="text-slate-200">·</span>
                      <span className="text-[11.5px] text-slate-400">
                        {new Date(w.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <p className="font-mono text-[12.5px] text-slate-600 truncate mb-2.5">
                      {w.url}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {w.events.map((ev) => (
                        <span
                          key={ev}
                          className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-medium"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                  {w.active && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(w.id)}
                      className="flex-shrink-0 text-[12px] font-semibold text-rose-400 hover:text-rose-600 transition-colors px-3 py-1.5 rounded-xl hover:bg-rose-50"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Signature info */}
      <div
        className="rounded-3xl p-5 ring-1 ring-indigo-100"
        style={{ background: 'linear-gradient(135deg, #eef2ff, #faf5ff)' }}
      >
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-indigo-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-indigo-900 mb-1">
              Verifikasi signature
            </p>
            <p className="text-[12.5px] text-indigo-700/80 leading-relaxed">
              Setiap request menyertakan header{' '}
              <code className="bg-white/70 px-1.5 py-0.5 rounded-lg font-mono text-[11.5px]">
                X-DocGen-Signature-256
              </code>{' '}
              — HMAC-SHA256 dari body payload menggunakan secret endpoint Anda.
            </p>
            <p className="font-mono text-[11.5px] text-indigo-500 mt-1.5 bg-white/50 px-2 py-1 rounded-lg inline-block">
              sha256=&lt;hex&gt; = HMAC-SHA256(secret, body)
            </p>
          </div>
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
    </div>
  );
}

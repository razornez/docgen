import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWebhooks,
  createWebhook,
  deleteWebhook,
  type WebhookEndpoint,
} from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.js';
import { useLang } from '../i18n/index.js';

const EVENTS = [
  'batch.completed',
  'batch.partially_failed',
  'batch.failed',
  'document.failed',
  'balance.low',
];

const inputCls =
  'w-full glass-soft rounded-2xl px-4 py-2.5 text-sm text-ink focus:outline-none placeholder:text-mut';

/** Secret tersamar untuk tampilan. */
function maskSecret(s: string): string {
  const tail = s.slice(-4);
  return `whsec_****${tail}`;
}

function EndpointRow({
  w,
  onDelete,
  t,
}: {
  w: WebhookEndpoint;
  onDelete: () => void;
  t: (id: string, en: string) => string;
}) {
  return (
    <div className="group flex items-center gap-4 px-6 py-4">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${w.active ? 'bg-indigo-100/70 text-brand-purple' : 'bg-slate-200/70 text-slate-400'}`}
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="num text-[12.5px] font-semibold text-ink truncate">
          {w.url}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {w.events.map((ev) => (
            <span
              key={ev}
              className="num text-[10.5px] text-mut bg-white/60 rounded-md px-1.5 py-0.5"
            >
              {ev}
            </span>
          ))}
        </div>
        <p className="num text-[10.5px] text-mut mt-1.5">
          {t('Secret', 'Secret')}: {maskSecret(w.id)}
        </p>
      </div>
      <span
        className={`flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide flex-shrink-0 ${w.active ? 'text-emerald-600' : 'text-mut'}`}
      >
        {w.active ? t('Aktif', 'Active') : t('Nonaktif', 'Inactive')}
        <span
          className={`w-9 h-5 rounded-full p-0.5 flex ${w.active ? 'bg-grad justify-end' : 'bg-slate-300 justify-start'}`}
        >
          <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
        </span>
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t('Hapus endpoint', 'Delete endpoint')}
        title={t('Hapus endpoint', 'Delete endpoint')}
        className="w-8 h-8 rounded-lg glass-soft flex items-center justify-center text-mut hover:text-rose-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
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
    </div>
  );
}

export default function WebhooksPage() {
  const { lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
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
    onError: (e) =>
      setFormError(e instanceof Error ? e.message : t('Gagal', 'Failed')),
  });

  const [deleteError, setDeleteError] = useState('');

  const del = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['webhooks'] });
      setDeleteError('');
    },
    onError: (e) =>
      setDeleteError(
        e instanceof Error
          ? e.message
          : t('Gagal menghapus endpoint.', 'Failed to delete endpoint.'),
      ),
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
    const trimmed = url.trim();
    if (!/^https:\/\//i.test(trimmed)) {
      setFormError(
        t(
          'URL harus diawali https:// (endpoint webhook wajib HTTPS).',
          'URL must start with https:// (webhook endpoints require HTTPS).',
        ),
      );
      return;
    }
    create.mutate({ url: trimmed, events: selectedEvents });
  }

  const list = webhooks.data?.data ?? [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="glass rounded-glass overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-[17px] font-bold text-ink">Webhooks</h1>
            <p className="text-[12.5px] text-mut mt-0.5">
              {t(
                'Terima notifikasi saat dokumen atau batch selesai.',
                'Receive notifications when a document or batch finishes.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v);
              setSecret('');
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
            {t('Tambah endpoint', 'Add endpoint')}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mx-6 mb-4 p-4 rounded-2xl glass-soft space-y-4"
          >
            <div>
              <label className="block text-[11.5px] font-semibold text-ink mb-1.5">
                {t('URL (HTTPS)', 'URL (HTTPS)')}
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourapp.com/webhooks/docgen"
                className={inputCls}
              />
            </div>
            <div>
              <p className="text-[11.5px] font-semibold text-ink mb-2">
                {t('Events', 'Events')}
              </p>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map((ev) => (
                  <label
                    key={ev}
                    className={`num flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full text-[11.5px] transition-all ${
                      selectedEvents.includes(ev)
                        ? 'bg-grad text-white'
                        : 'glass-soft text-mut hover:text-ink'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="hidden"
                    />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
            {formError && (
              <p className="text-[12px] text-rose-600">{formError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={create.isPending || selectedEvents.length === 0}
                className="px-4 py-2 rounded-full bg-grad text-white text-[12.5px] font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {create.isPending
                  ? t('Menambahkan…', 'Adding…')
                  : t('Tambah endpoint', 'Add endpoint')}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-full glass-soft text-ink text-[12.5px] font-semibold hover:bg-white/60 transition-colors"
              >
                {t('Batal', 'Cancel')}
              </button>
            </div>
          </form>
        )}

        {/* Secret reveal */}
        {secret && (
          <div
            className="mx-6 mb-4 rounded-2xl p-4 ring-1 ring-amber-200"
            style={{ background: 'linear-gradient(135deg,#fffbeb,#fefce8)' }}
          >
            <p className="text-[12.5px] font-semibold text-amber-800 mb-1.5">
              {t(
                'Signing secret — simpan sekarang, tidak akan ditampilkan lagi.',
                'Signing secret — save it now, it won’t be shown again.',
              )}
            </p>
            <code className="num text-[12px] text-amber-900 break-all bg-amber-100/60 rounded-xl px-3 py-2 block">
              {secret}
            </code>
          </div>
        )}

        {/* Endpoints list */}
        <div className="divide-y divide-white/40 border-t border-white/40">
          {list.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-mut">
              {t('Belum ada webhook endpoint.', 'No webhook endpoints yet.')}
            </p>
          ) : (
            list.map((w) => (
              <EndpointRow
                key={w.id}
                w={w}
                onDelete={() => {
                  setDeleteError('');
                  setDeleteTarget(w.id);
                }}
                t={t}
              />
            ))
          )}
          {deleteError && (
            <p className="px-6 py-3 text-[12px] text-rose-600">{deleteError}</p>
          )}
        </div>
      </div>

      {/* Signature info */}
      <div className="glass rounded-glass p-5">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0 text-brand-purple">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink mb-1">
              {t('Verifikasi signature', 'Verify signature')}
            </p>
            <p className="text-[12.5px] text-mut leading-relaxed">
              {t(
                'Setiap request menyertakan header',
                'Every request includes the header',
              )}{' '}
              <code className="num bg-white/60 px-1.5 py-0.5 rounded-lg text-[11.5px]">
                X-Docgen-Signature-256
              </code>{' '}
              {t(
                '— HMAC-SHA256 dari body payload memakai secret endpoint Anda.',
                '— HMAC-SHA256 of the payload body using your endpoint secret.',
              )}
            </p>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={t('Hapus webhook endpoint?', 'Delete webhook endpoint?')}
        message={t(
          'Endpoint yang dihapus tidak akan menerima notifikasi lagi. Tindakan ini tidak bisa dibatalkan.',
          'A deleted endpoint will no longer receive notifications. This action cannot be undone.',
        )}
        confirmLabel={t('Ya, hapus', 'Yes, delete')}
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

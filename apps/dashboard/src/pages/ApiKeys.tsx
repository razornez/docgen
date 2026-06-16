import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKeyItem,
} from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.js';
import { formatDate } from '../lib/format.js';

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

function KeyRow({
  k,
  onCopy,
  copied,
  onRevoke,
}: {
  k: ApiKeyItem;
  onCopy: () => void;
  copied: boolean;
  onRevoke: () => void;
}) {
  const live = k.mode === 'live';
  const revoked = k.status !== 'active';
  return (
    <div
      className={`flex items-center gap-4 px-6 py-4 ${revoked ? 'opacity-50' : ''}`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${live ? 'bg-emerald-100/70 text-emerald-600' : 'bg-blue-100/70 text-blue-600'}`}
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
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="num text-[13.5px] font-semibold text-ink truncate">
            {k.prefix}····{k.last4}
          </p>
          <span
            className={`text-[9.5px] font-bold tracking-wide px-1.5 py-0.5 rounded uppercase ${live ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
          >
            {k.mode}
          </span>
        </div>
        <p className="num text-[11px] text-mut mt-0.5">
          Dibuat {formatDate(k.created_at)}
          {k.last_used_at
            ? ` · ${relativeTime(k.last_used_at)} dipakai`
            : ' · belum dipakai'}
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Salin referensi key"
        title="Salin referensi key"
        className="w-8 h-8 rounded-lg glass-soft flex items-center justify-center text-mut hover:text-ink transition-colors flex-shrink-0"
      >
        {copied ? (
          <svg
            className="w-4 h-4 text-emerald-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
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
              d="M8 8V5a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-3M5 8h9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2z"
            />
          </svg>
        )}
      </button>
      {!revoked && (
        <button
          type="button"
          onClick={onRevoke}
          aria-label="Cabut key"
          title="Cabut key"
          className="w-8 h-8 rounded-lg glass-soft flex items-center justify-center text-mut hover:text-rose-500 transition-colors flex-shrink-0"
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
      )}
    </div>
  );
}

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: getApiKeys });

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<'live' | 'test'>('live');
  const [newKey, setNewKey] = useState('');
  const [createError, setCreateError] = useState('');
  const [copied, setCopied] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKey(data.api_key.key);
      setShowForm(false);
    },
    onError: (e) => setCreateError(e instanceof Error ? e.message : 'Gagal'),
  });

  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  function copyRef(k: ApiKeyItem) {
    void navigator.clipboard?.writeText(`${k.prefix}····${k.last4}`);
    setCopied(k.id);
    window.setTimeout(() => setCopied(''), 1200);
  }

  const list = keys.data?.data ?? [];
  const activeCount = list.filter((k) => k.status === 'active').length;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="glass rounded-glass overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-[17px] font-bold text-ink">API Keys</h1>
            <p className="text-[12.5px] text-mut mt-0.5">
              Kunci untuk integrasi server-ke-server. Jaga kerahasiaannya.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v);
              setNewKey('');
              setCreateError('');
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
            Buat API key
          </button>
        </div>

        {/* Create form (inline) */}
        {showForm && (
          <div className="mx-6 mb-4 p-4 rounded-2xl glass-soft flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-ink mb-1.5">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'live' | 'test')}
                className="glass-soft rounded-xl px-3 py-2 text-[13px] text-ink focus:outline-none"
              >
                <option value="live">Live (produksi)</option>
                <option value="test">Test (uji coba)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateError('');
                create.mutate({ mode });
              }}
              disabled={create.isPending}
              className="px-4 py-2 rounded-full bg-grad text-white text-[12.5px] font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {create.isPending ? 'Membuat…' : 'Buat key'}
            </button>
            {createError && (
              <span className="text-[12px] text-rose-600">{createError}</span>
            )}
          </div>
        )}

        {/* New key reveal (once) */}
        {newKey && (
          <div
            className="mx-6 mb-4 rounded-2xl p-4 ring-1 ring-amber-200"
            style={{ background: 'linear-gradient(135deg,#fffbeb,#fefce8)' }}
          >
            <p className="text-[12.5px] font-semibold text-amber-800 mb-1.5">
              Simpan key ini sekarang — tidak akan ditampilkan lagi.
            </p>
            <code className="num text-[12px] text-amber-900 break-all bg-amber-100/60 rounded-xl px-3 py-2 block">
              {newKey}
            </code>
          </div>
        )}

        <p className="px-6 text-[10.5px] font-bold uppercase tracking-wider text-mut">
          {activeCount} kunci aktif
        </p>

        {/* Keys list */}
        <div className="mt-2 divide-y divide-white/40 border-t border-white/40">
          {list.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-mut">
              Belum ada API key.
            </p>
          ) : (
            list.map((k) => (
              <KeyRow
                key={k.id}
                k={k}
                copied={copied === k.id}
                onCopy={() => copyRef(k)}
                onRevoke={() => setRevokeTarget(k.id)}
              />
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={revokeTarget !== null}
        title="Cabut API key?"
        message="Key yang sudah dicabut tidak bisa diaktifkan kembali. Pastikan tidak ada sistem yang masih menggunakannya."
        confirmLabel="Ya, cabut"
        danger
        onConfirm={() => {
          if (revokeTarget) revoke.mutate(revokeTarget);
          setRevokeTarget(null);
        }}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}

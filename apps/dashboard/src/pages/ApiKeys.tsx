import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiKeys, createApiKey, revokeApiKey } from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.js';
import { formatDate } from '../lib/format.js';

const inputCls =
  'bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all';

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: getApiKeys });

  const [mode, setMode] = useState<'live' | 'test'>('live');
  const [newKey, setNewKey] = useState('');
  const [createError, setCreateError] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKey(data.api_key.key);
    },
    onError: (e) => setCreateError(e instanceof Error ? e.message : 'Gagal'),
  });

  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setNewKey('');
    create.mutate({ mode });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Create key card */}
      <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] p-6">
        <h2 className="text-[14.5px] font-semibold text-slate-800 mb-5">
          Buat API key baru
        </h2>
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-4"
        >
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
              Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'live' | 'test')}
              className={inputCls}
            >
              <option value="live">Live (sk_live_…)</option>
              <option value="test">Test (sk_test_…)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-5 py-2.5 text-sm font-semibold rounded-2xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-indigo-200"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {create.isPending ? 'Membuat…' : 'Buat key'}
          </button>
        </form>

        {createError && (
          <div className="mt-4 flex items-center gap-2 text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-2xl px-4 py-3">
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
            {createError}
          </div>
        )}

        {newKey && (
          <div
            className="mt-5 rounded-2xl p-4 ring-1 ring-amber-200"
            style={{ background: 'linear-gradient(135deg, #fffbeb, #fefce8)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-amber-600"
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
                  Simpan key ini sekarang — tidak akan ditampilkan lagi.
                </p>
                <code className="text-[12px] font-mono text-amber-900 break-all bg-amber-100/60 rounded-xl px-3 py-2 block">
                  {newKey}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keys list */}
      <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-[14.5px] font-semibold text-slate-800">
            API Keys
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
                <th className="px-6 py-3 font-semibold">Key</th>
                <th className="px-6 py-3 font-semibold">Mode</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Terakhir dipakai</th>
                <th className="px-6 py-3 font-semibold">Dibuat</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {keys.data?.data.map((k) => (
                <tr
                  key={k.id}
                  className={`hover:bg-slate-50/60 transition-colors ${k.status === 'revoked' ? 'opacity-40' : ''}`}
                >
                  <td className="px-6 py-3.5 font-mono text-[12px] text-slate-600">
                    {k.prefix}…{k.last4}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ring-1 ${
                        k.mode === 'live'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-blue-50 text-blue-700 ring-blue-200'
                      }`}
                    >
                      {k.mode}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium ${k.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${k.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      />
                      {k.status === 'active' ? 'Aktif' : 'Direvoke'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-400">
                    {k.last_used_at
                      ? formatDate(k.last_used_at)
                      : 'Belum pernah'}
                  </td>
                  <td className="px-6 py-3.5 text-slate-400">
                    {formatDate(k.created_at)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {k.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(k.id)}
                        className="text-[12px] font-semibold text-rose-400 hover:text-rose-600 transition-colors px-3 py-1 rounded-xl hover:bg-rose-50"
                      >
                        Cabut
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.data?.data.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    Belum ada API key.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

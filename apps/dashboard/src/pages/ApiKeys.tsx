import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiKeys, createApiKey, revokeApiKey } from '../api/client.js';
import ConfirmModal from '../components/ConfirmModal.js';

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
    onError: (e) => setCreateError(e instanceof Error ? e.message : 'Failed'),
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
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">API Keys</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Create new key</h2>
        <form onSubmit={handleCreate} className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'live' | 'test')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="live">Live (sk_live_…)</option>
              <option value="test">Test (sk_test_…)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {create.isPending ? 'Creating…' : 'Create key'}
          </button>
        </form>

        {createError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {createError}
          </p>
        )}

        {newKey && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Save this key — it won't be shown again.
            </p>
            <code className="text-sm font-mono text-amber-900 break-all">
              {newKey}
            </code>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase text-left border-b border-gray-100">
                <th className="px-5 py-3">Key</th>
                <th className="px-5 py-3">Mode</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last used</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.data?.data.map((k) => (
                <tr
                  key={k.id}
                  className={`hover:bg-gray-50 ${k.status === 'revoked' ? 'opacity-50' : ''}`}
                >
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">
                    {k.prefix}…{k.last4}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        k.mode === 'live'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {k.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">
                    {k.status}
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {k.last_used_at
                      ? new Date(k.last_used_at).toLocaleDateString('id-ID')
                      : 'Never'}
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(k.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {k.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(k.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.data?.data.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    No keys found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={revokeTarget !== null}
        title="Revoke API key?"
        message="Key yang sudah direvoke tidak bisa diaktifkan kembali. Pastikan tidak ada sistem yang masih menggunakannya."
        confirmLabel="Ya, revoke"
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

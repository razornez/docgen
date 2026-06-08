import { useQuery } from '@tanstack/react-query';
import {
  getMe,
  getBatches,
  getApiKeys,
  getTemplates,
} from '../../api/client.js';

export default function AdminOverview() {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe });
  const batches = useQuery({ queryKey: ['batches'], queryFn: getBatches });
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: getApiKeys });
  const templates = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const totalDocs =
    batches.data?.data.reduce((s, b) => s + b.completed, 0) ?? 0;
  const failedDocs = batches.data?.data.reduce((s, b) => s + b.failed, 0) ?? 0;
  const activeKeys =
    keys.data?.data.filter((k) => k.status === 'active').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Admin panel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tenant: <strong>{me.data?.tenant.name}</strong> ({me.data?.tenant.id})
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Credit balance',
            value: (me.data?.wallet.balance ?? 0).toLocaleString(),
          },
          { label: 'Docs generated', value: totalDocs.toLocaleString() },
          { label: 'Docs failed', value: failedDocs.toLocaleString() },
          { label: 'Active API keys', value: String(activeKeys) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Batch breakdown</h2>
          {(
            [
              'completed',
              'partially_failed',
              'failed',
              'processing',
              'queued',
            ] as const
          ).map((s) => {
            const count =
              batches.data?.data.filter((b) => b.status === s).length ?? 0;
            return (
              <div
                key={s}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="capitalize text-gray-600">
                  {s.replace('_', ' ')}
                </span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Templates */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Templates ({templates.data?.data.length ?? 0})
          </h2>
          <ul className="space-y-2">
            {templates.data?.data.slice(0, 8).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">{t.name}</span>
                <span className="text-xs text-gray-400">
                  v{t.current_version}
                </span>
              </li>
            ))}
            {templates.data?.data.length === 0 && (
              <li className="text-sm text-gray-400">No templates</li>
            )}
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-sm text-blue-700">
        <p className="font-semibold text-blue-900 mb-1">Note</p>
        <p>
          This admin panel shows data for the currently authenticated tenant. A
          full multi-tenant admin view (across all tenants) requires dedicated
          backend admin endpoints and role-based access control.
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getApiKeys, type TemplateItem } from '../api/client.js';

type CodeTab = 'curl' | 'js' | 'python';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors flex-shrink-0"
    >
      {copied ? (
        <>
          <svg
            className="w-3 h-3 text-emerald-400"
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
          Tersalin
        </>
      ) : (
        <>
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Salin
        </>
      )}
    </button>
  );
}

export function ApiGuideModal({
  template,
  vars,
  onClose,
}: {
  template: TemplateItem;
  vars: string[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<CodeTab>('curl');
  const apiKeys = useQuery({ queryKey: ['api-keys'], queryFn: getApiKeys });
  const activeKeys =
    apiKeys.data?.data.filter((k) => k.status === 'active') ?? [];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const baseUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    window.location.origin;
  const keyPlaceholder =
    activeKeys.length > 0
      ? `${activeKeys[0]!.prefix}...${activeKeys[0]!.last4}`
      : 'sk_live_XXXXXXXXXX';

  const sampleData =
    vars.length > 0
      ? vars.reduce<Record<string, string>>((acc, v) => {
          acc[v] = `nilai_${v}`;
          return acc;
        }, {})
      : { nama: 'Budi Santoso', jabatan: 'Manager' };

  const requestBody = {
    template: template.id,
    items: [{ ref: 'doc-001', data: sampleData }],
  };

  const curlCode = `curl -X POST ${baseUrl}/v1/batches \\
  -H "Authorization: Bearer ${keyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestBody, null, 2)}'`;

  const jsCode = `const response = await fetch('${baseUrl}/v1/batches', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${keyPlaceholder}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${JSON.stringify(requestBody, null, 2)}),
});

const batch = await response.json();
console.log(batch.id); // gunakan ID ini untuk cek status`;

  const pythonCode = `import requests

response = requests.post(
  '${baseUrl}/v1/batches',
  headers={
    'Authorization': 'Bearer ${keyPlaceholder}',
    'Content-Type': 'application/json',
  },
  json=${JSON.stringify(requestBody, null, 2)
    .replace(/^/gm, '  ')
    .replace(/true/g, 'True')
    .replace(/false/g, 'False')
    .replace(/null/g, 'None')},
)

batch = response.json()
print(batch['id'])`;

  const codeMap: Record<CodeTab, string> = {
    curl: curlCode,
    js: jsCode,
    python: pythonCode,
  };
  const currentCode = codeMap[tab];

  const Step = ({ n, label }: { n: number; label: string }) => (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        {n}
      </div>
      <p className="text-[13.5px] font-semibold text-slate-800">{label}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-8 pb-12">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative w-full max-w-2xl z-10">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
                  }}
                >
                  <svg
                    className="w-4.5 h-4.5 text-indigo-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[14.5px] font-semibold text-slate-800">
                    Integrasi API
                  </h2>
                  <p className="text-[12px] text-slate-400 truncate max-w-xs">
                    {template.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Step 1: Template ID */}
              <div>
                <Step n={1} label="Catat Template ID" />
                <div className="flex items-center gap-2 bg-slate-900 rounded-2xl px-4 py-3">
                  <code className="flex-1 text-[13px] font-mono text-emerald-400 break-all">
                    {template.id}
                  </code>
                  <CopyButton text={template.id} />
                </div>
                <p className="text-[12px] text-slate-400 mt-2">
                  Gunakan ID ini di field{' '}
                  <code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-[11px]">
                    template
                  </code>{' '}
                  saat membuat batch.
                </p>
              </div>

              {/* Step 2: API Key */}
              <div>
                <Step n={2} label="Siapkan API Key" />
                {apiKeys.isLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
                    <span className="text-sm text-slate-400">
                      Memuat API key…
                    </span>
                  </div>
                ) : activeKeys.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
                    <svg
                      className="w-5 h-5 text-amber-500 flex-shrink-0"
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
                    <div>
                      <p className="text-[13px] font-semibold text-amber-700">
                        Belum ada API key aktif
                      </p>
                      <Link
                        to="/dashboard/api-keys"
                        className="text-[12px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                      >
                        Buat API key di sini →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeKeys.slice(0, 3).map((k) => (
                      <div
                        key={k.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200"
                      >
                        <svg
                          className="w-4 h-4 text-slate-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                          />
                        </svg>
                        <code className="flex-1 text-[13px] font-mono text-slate-700">
                          {k.prefix}···{k.last4}
                        </code>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${k.mode === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {k.mode}
                        </span>
                      </div>
                    ))}
                    <p className="text-[11.5px] text-slate-400 pt-1">
                      Full key hanya ditampilkan sekali saat dibuat.{' '}
                      <Link
                        to="/dashboard/api-keys"
                        onClick={onClose}
                        className="text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                      >
                        Kelola API key →
                      </Link>
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3: Code */}
              <div>
                <Step n={3} label="Buat Batch Dokumen" />
                <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200">
                  {/* Tab bar */}
                  <div className="flex items-center gap-1 px-3 py-2 bg-slate-800 border-b border-white/10">
                    {(['curl', 'js', 'python'] as CodeTab[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-1 rounded-lg text-[11.5px] font-semibold transition-colors ${tab === t ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {t === 'curl'
                          ? 'cURL'
                          : t === 'js'
                            ? 'JavaScript'
                            : 'Python'}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <CopyButton text={currentCode} />
                  </div>
                  {/* Code block */}
                  <pre className="bg-slate-900 px-4 py-3 text-[11.5px] font-mono text-slate-200 overflow-x-auto overflow-y-auto leading-relaxed whitespace-pre max-h-[180px]">
                    {currentCode}
                  </pre>
                </div>
              </div>

              {/* Step 4: Response */}
              <div>
                <Step n={4} label="Cek Status & Unduh PDF" />
                <div className="space-y-3 text-[13px] text-slate-600">
                  <p>
                    Response dari step 3 mengembalikan{' '}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px] text-slate-700">
                      batch.id
                    </code>
                    . Gunakan untuk cek status:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-900 rounded-2xl px-4 py-3">
                    <code className="flex-1 text-[12px] font-mono text-sky-400">
                      GET {baseUrl}/v1/batches/
                      <span className="text-slate-400">{'{batch_id}'}</span>
                    </code>
                    <CopyButton text={`GET ${baseUrl}/v1/batches/{batch_id}`} />
                  </div>
                  <p className="text-[12px] text-slate-500">
                    Saat status{' '}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px]">
                      completed
                    </code>
                    , setiap dokumen bisa diunduh:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-900 rounded-2xl px-4 py-3">
                    <code className="flex-1 text-[12px] font-mono text-sky-400">
                      GET {baseUrl}/v1/batches/
                      <span className="text-slate-400">{'{batch_id}'}</span>
                      /documents/
                      <span className="text-slate-400">{'{doc_id}'}</span>/pdf
                    </code>
                    <CopyButton
                      text={`GET ${baseUrl}/v1/batches/{batch_id}/documents/{doc_id}/pdf`}
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
                    <svg
                      className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-[12px] text-indigo-700">
                      Untuk notifikasi otomatis saat batch selesai, tambahkan{' '}
                      <code className="bg-indigo-100 px-1.5 py-0.5 rounded-md text-[11px]">
                        webhook_url
                      </code>{' '}
                      di request body.
                      <Link
                        to="/dashboard/webhooks"
                        onClick={onClose}
                        className="ml-1 font-semibold hover:underline"
                      >
                        Kelola webhook →
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

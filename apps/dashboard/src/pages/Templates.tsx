import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates,
  getTemplateCategories,
  importDefaultTemplates,
  createTemplate,
  getTemplateBody,
  createTemplateVersion,
  previewTemplate,
  getApiKeys,
  TEMPLATE_CATEGORIES,
  type TemplateItem,
} from '../api/client.js';
import RichEditor from '../components/RichEditor.js';

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; margin: 40px; }
  h1 { font-size: 16pt; }
</style>
</head>
<body>
  <h1>{{judul}}</h1>
  <p>Kepada Yth. <strong>{{nama}}</strong>,</p>
  <p>{{isi}}</p>
</body>
</html>`;

const CATEGORY_CHIP: Record<string, string> = {
  HR: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  Legal: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200',
  Keuangan: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
  Operasional: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
  Marketing: 'bg-pink-50 text-pink-600 ring-1 ring-pink-200',
  Umum: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const CATEGORY_DOT: Record<string, string> = {
  HR: 'bg-blue-400',
  Legal: 'bg-violet-400',
  Keuangan: 'bg-emerald-400',
  Operasional: 'bg-orange-400',
  Marketing: 'bg-pink-400',
  Umum: 'bg-slate-300',
};

const CATEGORY_ICON: Record<string, string> = {
  HR: 'bg-blue-100 text-blue-500',
  Legal: 'bg-violet-100 text-violet-500',
  Keuangan: 'bg-emerald-100 text-emerald-500',
  Operasional: 'bg-orange-100 text-orange-500',
  Marketing: 'bg-pink-100 text-pink-500',
  Umum: 'bg-slate-100 text-slate-400',
};

const inputCls =
  'w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all placeholder:text-slate-300';

type Panel =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; template: TemplateItem }
  | { type: 'preview'; template: TemplateItem };

function extractVars(html: string): string[] {
  const matches = [...html.matchAll(/\{\{(\w+)\}\}/g)];
  return [
    ...new Set(
      matches.map((m) => m[1]).filter((v): v is string => v !== undefined),
    ),
  ];
}

function buildDefaultJson(vars: string[]): string {
  if (vars.length === 0) return '{}';
  const obj: Record<string, string> = {};
  for (const v of vars) obj[v] = '';
  return JSON.stringify(obj, null, 2);
}

function DocIcon({ cls }: { cls?: string }) {
  return (
    <svg
      className={cls ?? 'w-5 h-5'}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function Modal({
  onClose,
  maxWidth = 'max-w-4xl',
  children,
}: {
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-8 pb-12">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className={`relative w-full ${maxWidth} z-10`}>{children}</div>
      </div>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 rounded-xl bg-white/70 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
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
  );
}

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

function ApiGuideModal({
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

  const baseUrl = window.location.origin;
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
        <div className="relative w-full max-w-3xl z-10">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
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

            <div className="p-6 space-y-7">
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
                  <pre className="bg-slate-900 px-5 py-4 text-[12px] font-mono text-slate-200 overflow-x-auto leading-relaxed whitespace-pre">
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

export default function TemplatesPage() {
  const qc = useQueryClient();
  const templates = useQuery({
    queryKey: ['templates'],
    queryFn: () => getTemplates(),
  });
  const categoriesQ = useQuery({
    queryKey: ['template-categories'],
    queryFn: () => getTemplateCategories().then((r) => r.categories),
  });
  const categories: string[] = categoriesQ.data ?? [...TEMPLATE_CATEGORIES];

  const [panel, setPanel] = useState<Panel>({ type: 'none' });
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [apiGuide, setApiGuide] = useState<{
    template: TemplateItem;
    vars: string[];
  } | null>(null);

  const autoImported = useRef(false);
  const importMut = useMutation({
    mutationFn: importDefaultTemplates,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      void qc.invalidateQueries({ queryKey: ['template-categories'] });
    },
  });
  useEffect(() => {
    if (
      templates.data?.data.length === 0 &&
      !autoImported.current &&
      !importMut.isPending
    ) {
      autoImported.current = true;
      importMut.mutate();
    }
  }, [templates.data, importMut]);

  // Create
  const [createName, setCreateName] = useState('');
  const [createCategory, setCreateCategory] = useState('Umum');
  const [createNewCat, setCreateNewCat] = useState('');
  const [createBody, setCreateBody] = useState(PLACEHOLDER_HTML);
  const [createError, setCreateError] = useState('');

  const createMut = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      void qc.invalidateQueries({ queryKey: ['template-categories'] });
      setPanel({ type: 'none' });
      setCreateName('');
      setCreateCategory('Umum');
      setCreateNewCat('');
      setCreateBody(PLACEHOLDER_HTML);
      setCreateError('');
    },
    onError: (e) =>
      setCreateError(e instanceof Error ? e.message : 'Gagal membuat template'),
  });

  // Edit
  const [editBody, setEditBody] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      createTemplateVersion(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      setPanel({ type: 'none' });
    },
    onError: (e) =>
      setEditError(
        e instanceof Error ? e.message : 'Gagal menyimpan versi baru',
      ),
  });

  async function openEdit(t: TemplateItem) {
    setEditError('');
    setEditLoading(true);
    setPanel({ type: 'edit', template: t });
    try {
      const res = await getTemplateBody(t.id);
      setEditBody(res.version.body);
    } catch {
      setEditError('Gagal memuat konten template');
    } finally {
      setEditLoading(false);
    }
  }

  // Preview
  const [previewData, setPreviewData] = useState('{}');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVars, setPreviewVars] = useState<string[]>([]);

  async function openPreview(t: TemplateItem) {
    setPreviewError('');
    setPreviewHtml('');
    setPreviewVars([]);
    setPreviewLoading(true);
    setPanel({ type: 'preview', template: t });
    try {
      const res = await getTemplateBody(t.id);
      const vars = extractVars(res.version.body);
      setPreviewVars(vars);
      const defaultJson = buildDefaultJson(vars);
      setPreviewData(defaultJson);
      const defaultData: Record<string, string> = {};
      for (const v of vars) defaultData[v] = '';
      const html = await previewTemplate(t.id, defaultData);
      setPreviewHtml(html);
    } catch {
      setPreviewError('Gagal memuat template');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function runPreview(id: string) {
    setPreviewError('');
    setPreviewHtml('');
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(previewData) as Record<string, unknown>;
    } catch {
      setPreviewError('Data harus berupa JSON object yang valid');
      return;
    }
    setPreviewLoading(true);
    try {
      const html = await previewTemplate(id, data);
      setPreviewHtml(html);
    } catch {
      setPreviewError('Gagal menjalankan preview');
    } finally {
      setPreviewLoading(false);
    }
  }

  const closePanel = useCallback(() => {
    setPanel({ type: 'none' });
    setCreateError('');
    setEditError('');
    setPreviewError('');
    setPreviewHtml('');
    setPreviewVars([]);
  }, []);

  async function openApiGuide(t: TemplateItem) {
    try {
      const res = await getTemplateBody(t.id);
      setApiGuide({ template: t, vars: extractVars(res.version.body) });
    } catch {
      setApiGuide({ template: t, vars: [] });
    }
  }

  // Filtering
  const allTemplates = templates.data?.data ?? [];
  const activeCats = [...new Set(allTemplates.map((t) => t.category))];

  const filtered = allTemplates.filter((t) => {
    const matchesCat = !filterCat || t.category === filterCat;
    const matchesSearch =
      !search || t.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const groupMap: Record<string, TemplateItem[]> = {};
  for (const t of filtered) {
    if (!groupMap[t.category]) groupMap[t.category] = [];
    groupMap[t.category]!.push(t);
  }
  const orderedCats = [
    ...categories.filter((c) => groupMap[c]),
    ...Object.keys(groupMap).filter((c) => !categories.includes(c)),
  ];
  const allGrouped: Array<[string, TemplateItem[]]> = orderedCats.map((c) => [
    c,
    groupMap[c]!,
  ]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari template…"
            className="w-full pl-9 pr-8 py-2 bg-white ring-1 ring-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all placeholder:text-slate-300"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
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
          )}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterCat(null)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              filterCat === null
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua
          </button>
          {activeCats.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                filterCat === cat
                  ? (CATEGORY_CHIP[cat] ?? 'bg-slate-100 text-slate-600')
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${CATEGORY_DOT[cat] ?? 'bg-slate-300'}`}
              />
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        {allTemplates.length > 0 && (
          <button
            type="button"
            onClick={() => importMut.mutate()}
            disabled={importMut.isPending}
            className="flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-semibold rounded-xl text-slate-500 ring-1 ring-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {importMut.isPending ? 'Mengimpor…' : 'Impor default'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            closePanel();
            setPanel({ type: 'create' });
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-semibold rounded-xl text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-sm shadow-indigo-200"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Template baru
        </button>
      </div>

      {/* ── Count hint ───────────────────────────────────────────────── */}
      {allTemplates.length > 0 && (
        <p className="text-[12px] text-slate-400">
          {filtered.length} template
          {search && (
            <span>
              {' '}
              untuk{' '}
              <span className="font-semibold text-slate-600">
                &ldquo;{search}&rdquo;
              </span>
            </span>
          )}
          {filterCat && !search && (
            <span>
              {' '}
              dalam kategori{' '}
              <span className="font-semibold text-slate-600">{filterCat}</span>
            </span>
          )}
        </p>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}

      {/* Create */}
      {panel.type === 'create' && (
        <Modal onClose={closePanel} maxWidth="max-w-4xl">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{
                background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
              }}
            >
              <div>
                <h2 className="text-[15px] font-semibold text-slate-800">
                  Buat template baru
                </h2>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  Gunakan{' '}
                  <code className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md text-[11px]">
                    {'{{variabel}}'}
                  </code>{' '}
                  untuk data dinamis
                </p>
              </div>
              <CloseBtn onClick={closePanel} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCreateError('');
                const finalCat =
                  createCategory === '__new__'
                    ? createNewCat.trim() || 'Umum'
                    : createCategory;
                createMut.mutate({
                  name: createName.trim(),
                  category: finalCat,
                  body: createBody.trim(),
                });
              }}
              className="p-6 space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                    Nama template
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    placeholder="cth: Kontrak Kerja Tetap"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => {
                      setCreateCategory(e.target.value);
                      setCreateNewCat('');
                    }}
                    className={inputCls}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__new__">+ Kategori baru…</option>
                  </select>
                  {createCategory === '__new__' && (
                    <input
                      type="text"
                      value={createNewCat}
                      onChange={(e) => setCreateNewCat(e.target.value)}
                      required
                      placeholder="Nama kategori baru"
                      maxLength={60}
                      autoFocus
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-slate-600 mb-2">
                  Konten dokumen
                </label>
                <RichEditor
                  value={createBody}
                  onChange={setCreateBody}
                  placeholder="Isi dokumen..."
                />
              </div>
              {createError && (
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
                  {createError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="px-5 py-2.5 text-sm font-semibold rounded-2xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-indigo-200"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  }}
                >
                  {createMut.isPending ? 'Menyimpan…' : 'Simpan template'}
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  className="px-5 py-2.5 text-sm font-semibold rounded-2xl text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Edit */}
      {panel.type === 'edit' && (
        <Modal onClose={closePanel} maxWidth="max-w-4xl">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{
                background: 'linear-gradient(135deg, #f5f3ff, #eef2ff)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${CATEGORY_ICON[panel.template.category] ?? 'bg-slate-100 text-slate-400'}`}
                >
                  <DocIcon cls="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-slate-800 truncate">
                    {panel.template.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11.5px] font-mono font-semibold text-slate-400 bg-white/70 px-2 py-0.5 rounded-lg ring-1 ring-slate-200">
                      v{panel.template.current_version}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="text-[11.5px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg ring-1 ring-indigo-200">
                      v{panel.template.current_version + 1}
                    </span>
                  </div>
                </div>
              </div>
              <CloseBtn onClick={closePanel} />
            </div>
            <div className="p-6">
              {editLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">
                    Memuat konten template…
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEditError('');
                    editMut.mutate({
                      id: panel.template.id,
                      body: editBody.trim(),
                    });
                  }}
                  className="space-y-5"
                >
                  <RichEditor value={editBody} onChange={setEditBody} />
                  {editError && (
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
                      {editError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={editMut.isPending}
                      className="px-5 py-2.5 text-sm font-semibold rounded-2xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-indigo-200"
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      }}
                    >
                      {editMut.isPending ? 'Menyimpan…' : 'Simpan versi baru'}
                    </button>
                    <button
                      type="button"
                      onClick={closePanel}
                      className="px-5 py-2.5 text-sm font-semibold rounded-2xl text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50 transition-all"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Preview */}
      {panel.type === 'preview' && (
        <Modal onClose={closePanel} maxWidth="max-w-6xl">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-lg px-3 py-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-[12px] text-slate-500 font-medium max-w-[260px] truncate">
                    {panel.template.name}
                  </span>
                  <span
                    className={`ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${CATEGORY_CHIP[panel.template.category] ?? 'bg-slate-100 text-slate-500'}`}
                  >
                    {panel.template.category}
                  </span>
                </div>
              </div>
              <CloseBtn onClick={closePanel} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
              <div
                className="flex flex-col gap-4 p-5"
                style={{
                  background:
                    'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
                }}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">
                    Data Variabel
                  </p>
                  {previewVars.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {previewVars.map((v) => (
                        <span
                          key={v}
                          className="text-[10px] font-mono text-indigo-300 bg-indigo-500/15 ring-1 ring-indigo-500/20 px-2 py-0.5 rounded-md"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={previewData}
                    onChange={(e) => setPreviewData(e.target.value)}
                    rows={14}
                    spellCheck={false}
                    className="w-full bg-white/5 ring-1 ring-white/10 rounded-2xl px-4 py-3 text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none leading-relaxed"
                  />
                </div>
                {previewError && (
                  <div className="flex items-start gap-2 text-[12px] text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/20 rounded-xl px-3 py-2.5">
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
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
                    {previewError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void runPreview(panel.template.id)}
                  disabled={previewLoading}
                  className="w-full py-3 text-sm font-semibold rounded-2xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  }}
                >
                  {previewLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Merender…
                    </>
                  ) : (
                    <>
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
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Render ulang
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-600">
                  v{panel.template.current_version} ·{' '}
                  {formatDate(panel.template.updated_at)}
                </p>
              </div>

              <div className="flex flex-col p-5 bg-slate-50/40 min-h-[560px]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Hasil render
                </p>
                {previewLoading && !previewHtml ? (
                  <div className="flex-1 rounded-2xl bg-white ring-1 ring-slate-200 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Merender dokumen…</p>
                  </div>
                ) : previewHtml ? (
                  <div className="flex-1 rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.09)] ring-1 ring-slate-200 bg-white">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-full min-h-[520px] border-0"
                      sandbox="allow-same-origin"
                      title="Template preview"
                    />
                  </div>
                ) : (
                  <div className="flex-1 rounded-2xl ring-2 ring-dashed ring-slate-200 bg-white flex flex-col items-center justify-center gap-4">
                    <div
                      className="w-16 h-16 rounded-3xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
                      }}
                    >
                      <svg
                        className="w-8 h-8 text-indigo-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-400">
                      Isi data lalu klik Render ulang
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {templates.isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!templates.isLoading && allTemplates.length === 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 px-6 py-16 text-center">
          <DocIcon cls="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-[13px] font-medium text-slate-400">
            {importMut.isPending
              ? 'Memuat template default…'
              : 'Belum ada template'}
          </p>
        </div>
      )}

      {/* ── No search results ───────────────────────────────────────── */}
      {!templates.isLoading &&
        allTemplates.length > 0 &&
        filtered.length === 0 && (
          <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 px-6 py-12 text-center">
            <svg
              className="w-7 h-7 text-slate-200 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-[13px] font-medium text-slate-400">
              Tidak ada template yang cocok
            </p>
            <button
              onClick={() => {
                setSearch('');
                setFilterCat(null);
              }}
              className="mt-3 text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Reset filter
            </button>
          </div>
        )}

      {/* ── Template list ───────────────────────────────────────────── */}
      {allGrouped.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
          {allGrouped.map(([cat, items], gi) => (
            <div key={cat}>
              {/* Category sub-header */}
              <div
                className={`flex items-center gap-2 px-5 py-2.5 ${gi > 0 ? 'border-t border-slate-100' : ''}`}
                style={{
                  background: 'linear-gradient(90deg, #f8f7fc, #ffffff)',
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_DOT[cat] ?? 'bg-slate-300'}`}
                />
                <span className="text-[12px] font-semibold text-slate-600">
                  {cat}
                </span>
                <span className="text-[11px] text-slate-400">
                  · {items.length}
                </span>
              </div>

              {/* Rows */}
              {items.map((t, ri) => (
                <div
                  key={t.id}
                  className={`group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors ${ri < items.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  {/* Name */}
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${CATEGORY_ICON[t.category] ?? 'bg-slate-100 text-slate-400'}`}
                    >
                      <DocIcon cls="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[13.5px] font-semibold text-slate-800 truncate">
                      {t.name}
                    </p>
                  </div>

                  {/* Meta */}
                  <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
                    v{t.current_version}
                  </span>
                  <span className="text-[12px] text-slate-400 flex-shrink-0 w-28 text-right hidden sm:block">
                    {formatDate(t.updated_at)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        closePanel();
                        void openEdit(t);
                      }}
                      className="px-3 py-1.5 text-[12px] font-semibold rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void openPreview(t)}
                      className="px-3 py-1.5 text-[12px] font-semibold rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      title="Panduan integrasi API"
                      onClick={() => void openApiGuide(t)}
                      className="px-2.5 py-1.5 text-[12px] font-semibold rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* API Guide Modal */}
      {apiGuide && (
        <ApiGuideModal
          template={apiGuide.template}
          vars={apiGuide.vars}
          onClose={() => setApiGuide(null)}
        />
      )}
    </div>
  );
}

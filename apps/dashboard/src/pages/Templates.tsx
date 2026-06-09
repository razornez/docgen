import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates,
  getTemplateCategories,
  importDefaultTemplates,
  createTemplate,
  getTemplateBody,
  createTemplateVersion,
  previewTemplate,
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

const CATEGORY_LABELS: Record<string, string> = {
  HR: 'HR — Sumber Daya Manusia',
  Legal: 'Legal — Hukum & Kepatuhan',
  Keuangan: 'Keuangan — Finance',
  Operasional: 'Operasional',
  Marketing: 'Marketing & Sales',
  Umum: 'Umum',
};

const CATEGORY_CHIP: Record<string, string> = {
  HR: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  Legal: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  Keuangan: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Operasional: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  Marketing: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200',
  Umum: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

const inputCls =
  'w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all placeholder:text-slate-300';

type Panel =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; template: TemplateItem }
  | { type: 'preview'; template: TemplateItem };

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

  // Auto-import silently when list is empty
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

  const previewTemplateId = panel.type === 'preview' ? panel.template.id : null;
  useEffect(() => {
    if (!previewTemplateId) return;
    setPreviewError('');
    setPreviewHtml('');
    setPreviewLoading(true);
    previewTemplate(previewTemplateId, {})
      .then((html) => setPreviewHtml(html))
      .catch(() => setPreviewError('Gagal menjalankan preview'))
      .finally(() => setPreviewLoading(false));
  }, [previewTemplateId]);

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

  function closePanel() {
    setPanel({ type: 'none' });
    setCreateError('');
    setEditError('');
    setPreviewError('');
    setPreviewHtml('');
  }

  // Group by category
  const allTemplates = templates.data?.data ?? [];
  const groupMap: Record<string, TemplateItem[]> = {};
  for (const t of allTemplates) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-3">
        {allTemplates.length > 0 && (
          <button
            type="button"
            onClick={() => importMut.mutate()}
            disabled={importMut.isPending}
            title="Impor template default (skip yang sudah ada)"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-2xl text-slate-600 ring-1 ring-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all"
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
          Template baru
        </button>
      </div>

      {/* ---- Panel: Create ---- */}
      {panel.type === 'create' && (
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14.5px] font-semibold text-slate-800">
              Buat template baru
            </h2>
            <button
              type="button"
              onClick={closePanel}
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
            className="space-y-5"
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
                      {CATEGORY_LABELS[c] ?? c}
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
      )}

      {/* ---- Panel: Edit ---- */}
      {panel.type === 'edit' && (
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-[14.5px] font-semibold text-slate-800">
                Edit — {panel.template.name}
              </h2>
              <p className="text-[12px] text-slate-400 mt-0.5">
                Versi baru akan disimpan (v{panel.template.current_version} → v
                {panel.template.current_version + 1})
              </p>
            </div>
            <button
              type="button"
              onClick={closePanel}
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
          {editLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
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
              <div>
                <label className="block text-[12.5px] font-semibold text-slate-600 mb-2">
                  Konten dokumen
                </label>
                <RichEditor value={editBody} onChange={setEditBody} />
              </div>
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
      )}

      {/* ---- Panel: Preview ---- */}
      {panel.type === 'preview' && (
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14.5px] font-semibold text-slate-800">
              Preview — {panel.template.name}
            </h2>
            <button
              type="button"
              onClick={closePanel}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                Data (JSON)
              </label>
              <textarea
                value={previewData}
                onChange={(e) => setPreviewData(e.target.value)}
                rows={8}
                placeholder={'{ "nama": "Budi", "total": "Rp 500.000" }'}
                className="w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
              />
              {previewError && (
                <p className="text-sm text-rose-600 mt-1.5">{previewError}</p>
              )}
              <button
                type="button"
                onClick={() => void runPreview(panel.template.id)}
                disabled={previewLoading}
                className="mt-3 px-5 py-2.5 text-sm font-semibold rounded-2xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] shadow-md shadow-indigo-200"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                }}
              >
                {previewLoading ? 'Memuat…' : 'Render preview'}
              </button>
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                Hasil render
              </label>
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-80 rounded-2xl border-0 ring-1 ring-slate-200 bg-white"
                  sandbox="allow-same-origin"
                  title="Template preview"
                />
              ) : (
                <div className="w-full h-80 rounded-2xl ring-1 ring-dashed ring-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-sm text-slate-400">
                  <svg
                    className="w-8 h-8 text-slate-300"
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
                  Klik "Render preview" untuk melihat hasil
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {templates.isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {templates.data?.data.length === 0 && (
        <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] px-6 py-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-slate-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-400">
            {importMut.isPending
              ? 'Memuat template default…'
              : 'Belum ada template.'}
          </p>
        </div>
      )}

      {/* Grouped template list */}
      {allGrouped.map(([cat, items]) => (
        <div
          key={cat}
          className="bg-white rounded-3xl ring-1 ring-slate-200/70 shadow-[0_4px_32px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          {/* Category header */}
          <div className="flex items-center gap-3 px-6 py-3.5 border-b border-slate-100">
            <span
              className={`px-2.5 py-1 rounded-xl text-[12px] font-semibold ${CATEGORY_CHIP[cat] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
            <span className="text-[12px] text-slate-400">
              {items.length} template
            </span>
          </div>

          {/* Templates */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-slate-400 uppercase tracking-wider text-left border-b border-slate-50">
                  <th className="px-6 py-3 font-semibold">Nama</th>
                  <th className="px-6 py-3 font-semibold">Versi</th>
                  <th className="px-6 py-3 font-semibold">Dibuat</th>
                  <th className="px-6 py-3 font-semibold">Diperbarui</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-slate-800">{t.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {t.id}
                      </p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[12px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        v{t.current_version}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {new Date(t.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {new Date(t.updated_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            closePanel();
                            void openEdit(t);
                          }}
                          className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closePanel();
                            setPreviewData('{}');
                            setPreviewHtml('');
                            setPanel({ type: 'preview', template: t });
                          }}
                          className="text-[12px] font-semibold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          Preview
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

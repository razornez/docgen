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

const CATEGORY_COLORS: Record<string, string> = {
  HR: 'bg-blue-50 border-blue-200 text-blue-700',
  Legal: 'bg-purple-50 border-purple-200 text-purple-700',
  Keuangan: 'bg-green-50 border-green-200 text-green-700',
  Operasional: 'bg-orange-50 border-orange-200 text-orange-700',
  Marketing: 'bg-pink-50 border-pink-200 text-pink-700',
  Umum: 'bg-gray-50 border-gray-200 text-gray-600',
};

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

  // --- Import defaults ---
  const autoImported = useRef(false);
  const importMut = useMutation({
    mutationFn: importDefaultTemplates,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      void qc.invalidateQueries({ queryKey: ['template-categories'] });
    },
  });

  // Auto-import silently when template list is empty after first load
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

  // --- Create ---
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

  // --- Edit ---
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

  // --- Preview ---
  const [previewData, setPreviewData] = useState('{}');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Auto-render with {} when preview panel opens or switches template
  const previewTemplateId = panel.type === 'preview' ? panel.template.id : null;
  useEffect(() => {
    if (!previewTemplateId) return;
    setPreviewError('');
    setPreviewHtml('');
    setPreviewLoading(true);
    previewTemplate(previewTemplateId, {})
      .then((html) => {
        setPreviewHtml(html);
      })
      .catch(() => {
        setPreviewError('Gagal menjalankan preview');
      })
      .finally(() => {
        setPreviewLoading(false);
      });
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

  // Group templates by category (use server-derived category order)
  const allTemplates = templates.data?.data ?? [];
  const groupMap: Record<string, TemplateItem[]> = {};
  for (const t of allTemplates) {
    if (!groupMap[t.category]) groupMap[t.category] = [];
    groupMap[t.category]!.push(t);
  }
  // Order: categories from API first (base + custom), then any stray ones
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Templates</h1>
        <div className="flex items-center gap-2">
          {allTemplates.length > 0 && (
            <button
              type="button"
              onClick={() => importMut.mutate()}
              disabled={importMut.isPending}
              title="Impor template default (skip yang sudah ada)"
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {importMut.isPending ? 'Mengimpor…' : '↓ Impor default'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              closePanel();
              setPanel({ type: 'create' });
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Template baru
          </button>
        </div>
      </div>

      {/* ---- Panel: Create ---- */}
      {panel.type === 'create' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Buat template baru
          </h2>
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
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama template
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  placeholder="cth: Kontrak Kerja Tetap"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  value={createCategory}
                  onChange={(e) => {
                    setCreateCategory(e.target.value);
                    setCreateNewCat('');
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="mt-2 w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konten dokumen
              </label>
              <RichEditor
                value={createBody}
                onChange={setCreateBody}
                placeholder="Isi dokumen..."
              />
            </div>

            {createError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {createError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMut.isPending}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {createMut.isPending ? 'Menyimpan…' : 'Simpan template'}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---- Panel: Edit ---- */}
      {panel.type === 'edit' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Edit — {panel.template.name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Versi baru akan disimpan (v{panel.template.current_version} → v
                {panel.template.current_version + 1})
              </p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {editLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Memuat konten…
            </p>
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
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konten dokumen
                </label>
                <RichEditor value={editBody} onChange={setEditBody} />
              </div>
              {editError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {editError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={editMut.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {editMut.isPending ? 'Menyimpan…' : 'Simpan versi baru'}
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Preview — {panel.template.name}
            </h2>
            <button
              type="button"
              onClick={closePanel}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              ✕ Tutup
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data (JSON)
              </label>
              <textarea
                value={previewData}
                onChange={(e) => setPreviewData(e.target.value)}
                rows={8}
                placeholder={'{ "nama": "Budi", "total": "Rp 500.000" }'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {previewError && (
                <p className="text-sm text-red-600 mt-2">{previewError}</p>
              )}
              <button
                type="button"
                onClick={() => void runPreview(panel.template.id)}
                disabled={previewLoading}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {previewLoading ? 'Memuat…' : 'Render preview'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasil render
              </label>
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-80 border border-gray-200 rounded-lg bg-white"
                  sandbox="allow-same-origin"
                  title="Template preview"
                />
              ) : (
                <div className="w-full h-80 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-400">
                  Klik "Render preview" untuk melihat hasil
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Template list grouped by category ---- */}
      {templates.isLoading && (
        <p className="text-sm text-gray-400 text-center py-8">Memuat…</p>
      )}

      {templates.data?.data.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <p className="text-sm text-gray-400">
            {importMut.isPending
              ? 'Memuat template default…'
              : 'Belum ada template.'}
          </p>
        </div>
      )}

      {allGrouped.map(([cat, items]) => (
        <div
          key={cat}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          {/* Category header */}
          <div
            className={`flex items-center gap-3 px-5 py-3 border-b ${CATEGORY_COLORS[cat] ?? 'bg-gray-50 border-gray-200 text-gray-600'}`}
          >
            <span className="text-sm font-semibold">
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
            <span className="text-xs opacity-70">{items.length} template</span>
          </div>

          {/* Templates table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase text-left border-b border-gray-100">
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Versi</th>
                  <th className="px-5 py-3">Dibuat</th>
                  <th className="px-5 py-3">Diperbarui</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {t.id}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      v{t.current_version}
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(t.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(t.updated_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            closePanel();
                            void openEdit(t);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
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
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates,
  getTemplateCategories,
  importDefaultTemplates,
  createTemplate,
  getTemplateBody,
  createTemplateVersion,
  previewTemplate,
  createBatch,
  getBatch,
  getBatchDocuments,
  TEMPLATE_CATEGORIES,
  type TemplateItem,
} from '../api/client.js';
import RichEditor from '../components/RichEditor.js';
import {
  PLACEHOLDER_HTML,
  CATEGORY_CHIP,
  CATEGORY_DOT,
  CATEGORY_ICON,
  inputCls,
  extractVars,
  buildDummyJson,
} from '../lib/templateData.js';
import { ApiGuideModal } from '../components/ApiGuideModal.js';

type Panel =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; template: TemplateItem }
  | { type: 'preview'; template: TemplateItem };

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
      <div className="flex min-h-full items-center justify-center p-4 py-6">
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

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
      const dummyJson = buildDummyJson(vars);
      setPreviewData(dummyJson);
      const dummyData = JSON.parse(dummyJson) as Record<string, string>;
      const html = await previewTemplate(t.id, dummyData);
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

  async function downloadPdf(templateId: string, templateName: string) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(previewData) as Record<string, unknown>;
    } catch {
      setPdfError('Data harus berupa JSON object yang valid');
      return;
    }
    setPdfLoading(true);
    setPdfError('');
    try {
      let b = await createBatch({
        template: templateId,
        items: [{ ref: 'preview-dl', data }],
      });
      for (
        let i = 0;
        i < 30 &&
        b.status !== 'completed' &&
        b.status !== 'failed' &&
        b.status !== 'partially_failed';
        i++
      ) {
        await new Promise((r) => setTimeout(r, 2000));
        b = await getBatch(b.id);
      }
      if (b.status !== 'completed') {
        if (b.status === 'failed' || b.status === 'partially_failed') {
          const failDocs = await getBatchDocuments(b.id).catch(() => null);
          const errDoc = failDocs?.data.find((d) => d.error);
          throw new Error(errDoc?.error ?? 'Batch gagal diproses oleh worker');
        }
        throw new Error('Timeout: PDF belum selesai dalam 60 detik');
      }
      const docs = await getBatchDocuments(b.id);
      const doc = docs.data[0];
      if (!doc) throw new Error('Dokumen tidak ditemukan');
      if (doc.status !== 'completed' || !doc.output_url)
        throw new Error(doc.error ?? 'Dokumen gagal diproses');
      const resp = await fetch(doc.output_url);
      if (!resp.ok) throw new Error('Gagal mengunduh PDF');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Gagal mengunduh PDF');
    } finally {
      setPdfLoading(false);
      // Batch mendebit kredit saat dibuat → segarkan saldo (header & wallet).
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    }
  }

  const closePanel = useCallback(() => {
    setPanel({ type: 'none' });
    setCreateError('');
    setEditError('');
    setPreviewError('');
    setPreviewHtml('');
    setPreviewVars([]);
    setPdfError('');
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
        <Modal onClose={closePanel} maxWidth="max-w-3xl">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto">
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
                  title="Simpan"
                  aria-label="Simpan"
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
        <Modal onClose={closePanel} maxWidth="max-w-3xl">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto">
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
                      title="Simpan"
                      aria-label="Simpan"
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
        <Modal onClose={closePanel} maxWidth="max-w-7xl">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Browser chrome bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-md px-2.5 py-1">
                  <svg
                    className="w-3 h-3 text-slate-300"
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
                  <span className="text-[11.5px] text-slate-500 font-medium max-w-[220px] truncate">
                    {panel.template.name}
                  </span>
                  <span
                    className={`ml-0.5 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md ${CATEGORY_CHIP[panel.template.category] ?? 'bg-slate-100 text-slate-500'}`}
                  >
                    {panel.template.category}
                  </span>
                </div>
              </div>
              <CloseBtn onClick={closePanel} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
              {/* Left: controls */}
              <div
                className="flex flex-col gap-3 p-4"
                style={{
                  background:
                    'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
                }}
              >
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-indigo-400 mb-1.5">
                    Data Variabel
                  </p>
                  {previewVars.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {previewVars.map((v) => (
                        <span
                          key={v}
                          className="text-[9.5px] font-mono text-indigo-300 bg-indigo-500/15 ring-1 ring-indigo-500/20 px-1.5 py-0.5 rounded"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={previewData}
                    onChange={(e) => setPreviewData(e.target.value)}
                    rows={16}
                    spellCheck={false}
                    className="w-full bg-white/5 ring-1 ring-white/10 rounded-xl px-3 py-2.5 text-[12px] font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-y leading-relaxed"
                  />
                </div>
                {(previewError || pdfError) && (
                  <div className="flex items-start gap-1.5 text-[11px] text-rose-300 bg-rose-500/10 ring-1 ring-rose-500/20 rounded-lg px-2.5 py-2">
                    <svg
                      className="w-3 h-3 flex-shrink-0 mt-0.5"
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
                    {previewError || pdfError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void runPreview(panel.template.id)}
                  disabled={previewLoading || pdfLoading}
                  className="w-full py-2 text-[12.5px] font-semibold rounded-xl text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-900/40"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  }}
                >
                  {previewLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Merender…
                    </>
                  ) : (
                    <>
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
                {/* Download PDF */}
                <button
                  type="button"
                  onClick={() =>
                    void downloadPdf(panel.template.id, panel.template.name)
                  }
                  disabled={pdfLoading || previewLoading}
                  className="w-full py-2 text-[12.5px] font-semibold rounded-xl disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/20"
                >
                  {pdfLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
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
                      Download PDF
                      <span className="text-[10px] opacity-60 font-normal">
                        −1 kredit
                      </span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-600">
                  v{panel.template.current_version} ·{' '}
                  {formatDate(panel.template.updated_at)}
                </p>
              </div>

              {/* Right: preview */}
              <div className="flex flex-col p-4 bg-slate-50/40">
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Hasil render
                </p>
                {previewLoading && !previewHtml ? (
                  <div className="flex-1 rounded-xl bg-white ring-1 ring-slate-200 flex flex-col items-center justify-center gap-3 min-h-[560px]">
                    <div className="w-7 h-7 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Merender…</p>
                  </div>
                ) : previewHtml ? (
                  <div
                    className="rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.09)] ring-1 ring-slate-200 bg-white"
                    style={{ height: '600px', position: 'relative' }}
                  >
                    <iframe
                      srcDoc={previewHtml}
                      sandbox="allow-same-origin"
                      title="Template preview"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '133%',
                        height: '133%',
                        transform: 'scale(0.75)',
                        transformOrigin: 'top left',
                        border: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 rounded-xl ring-2 ring-dashed ring-slate-200 bg-white flex flex-col items-center justify-center gap-3 min-h-[560px]">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
                      }}
                    >
                      <svg
                        className="w-6 h-6 text-indigo-300"
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

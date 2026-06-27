import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates,
  getTemplateCategories,
  importDefaultTemplates,
  getTemplateBody,
  TEMPLATE_CATEGORIES,
  type TemplateItem,
} from '../api/client.js';
import {
  CATEGORY_DOT,
  CATEGORY_THUMB,
  extractVars,
} from '../lib/templateData.js';
import { renderTemplate } from '../lib/renderTemplate.js';
import { ApiGuideModal } from '../components/ApiGuideModal.js';
import { TemplateEditor } from '../components/TemplateEditor.js';
import { TemplateCreator } from '../components/TemplateCreator.js';
import { formatDate } from '../lib/format.js';
import { useLang } from '../i18n/index.js';

type Panel =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; template: TemplateItem }
  | { type: 'preview'; template: TemplateItem };

const A4_W = 794;
const A4_H = 1123;

/**
 * Thumbnail dokumen ASLI: render body template (Handlebars) dengan data contoh
 * tersimpan ke dalam iframe ter-skala, terpotong di bagian atas (kop/judul)
 * agar langsung dikenali jenis dokumennya. Iframe disandbox penuh (tanpa skrip).
 */
function TemplateThumb({
  template,
  bg,
}: {
  template: TemplateItem;
  bg: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setW(cr.width);
    });
    ro.observe(el);
    // Render thumbnail hanya saat masuk viewport (hemat: 19 kartu tak sekaligus).
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const q = useQuery({
    queryKey: ['template-thumb', template.id, template.current_version],
    queryFn: () => getTemplateBody(template.id),
    staleTime: 5 * 60 * 1000,
    enabled: seen,
  });
  const html = useMemo(
    () =>
      q.data
        ? renderTemplate(q.data.version.body, q.data.version.schema ?? {})
        : '',
    [q.data],
  );
  const scale = w > 0 ? w / A4_W : 0;

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={{ background: bg }}
    >
      {q.data && scale > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: A4_W,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <iframe
            title={template.name}
            srcDoc={html}
            sandbox=""
            scrolling="no"
            tabIndex={-1}
            aria-hidden="true"
            style={{
              width: A4_W,
              height: A4_H,
              border: 0,
              background: '#fff',
              pointerEvents: 'none',
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/60 border-t-brand-purple rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
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

export default function TemplatesPage() {
  const { lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  const closePanel = useCallback(() => {
    setPanel({ type: 'none' });
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
  const filtered = allTemplates.filter((t) => {
    const matchesCat = !filterCat || t.category === filterCat;
    const matchesSearch =
      !search || t.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
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
            placeholder={t('Cari template…', 'Search templates…')}
            className="w-full pl-9 pr-8 py-2 glass-soft rounded-full text-sm text-ink focus:outline-none placeholder:text-mut"
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
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              filterCat === null
                ? 'bg-grad text-white shadow-sm'
                : 'glass-soft text-mut hover:text-ink'
            }`}
          >
            {t('Semua', 'All')}
          </button>
          {categories.map((cat) => {
            const active = filterCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(active ? null : cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                  active
                    ? 'bg-grad text-white shadow-sm'
                    : 'glass-soft text-mut hover:text-ink'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white/90' : (CATEGORY_DOT[cat] ?? 'bg-slate-300')}`}
                />
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center p-0.5 rounded-full glass-soft">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label={t('Mode kartu', 'Grid view')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-grad text-white shadow-sm' : 'text-mut hover:text-ink'}`}
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
                d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 13h6v6h-6z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label={t('Mode daftar', 'List view')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-grad text-white shadow-sm' : 'text-mut hover:text-ink'}`}
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
                d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"
              />
            </svg>
          </button>
        </div>

        {/* Actions */}
        {allTemplates.length > 0 && (
          <button
            type="button"
            onClick={() => importMut.mutate()}
            disabled={importMut.isPending}
            className="flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-semibold rounded-full glass-soft text-mut hover:text-ink disabled:opacity-40 transition-all"
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
            {importMut.isPending
              ? t('Mengimpor…', 'Importing…')
              : t('Impor default', 'Import defaults')}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            closePanel();
            setPanel({ type: 'create' });
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.4)] transition-all hover:opacity-90 active:scale-[0.98]"
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
          {t('Template baru', 'New template')}
        </button>
      </div>

      {/* ── Count hint ───────────────────────────────────────────────── */}
      {allTemplates.length > 0 && (
        <p className="text-[12px] text-slate-400">
          {filtered.length} {t('template', 'templates')}
          {search && (
            <span>
              {' '}
              {t('untuk', 'for')}{' '}
              <span className="font-semibold text-slate-600">
                &ldquo;{search}&rdquo;
              </span>
            </span>
          )}
          {filterCat && !search && (
            <span>
              {' '}
              {t('dalam kategori', 'in category')}{' '}
              <span className="font-semibold text-slate-600">{filterCat}</span>
            </span>
          )}
        </p>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}

      {/* Create — editor premium (WYSIWYG + panel variabel) */}
      {panel.type === 'create' && (
        <TemplateCreator
          categories={categories}
          onClose={closePanel}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: ['templates'] });
            void qc.invalidateQueries({ queryKey: ['template-categories'] });
          }}
        />
      )}

      {/* Edit — editor premium 2-panel (HTML/Data + preview langsung) */}
      {panel.type === 'edit' && (
        <TemplateEditor
          template={panel.template}
          onClose={closePanel}
          onSaved={() => void qc.invalidateQueries({ queryKey: ['templates'] })}
        />
      )}

      {/* Preview — editor read-only tanpa tombol simpan/generate */}
      {panel.type === 'preview' && (
        <TemplateEditor
          template={panel.template}
          onClose={closePanel}
          onSaved={() => undefined}
          readOnly
        />
      )}

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {templates.isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-white/60 border-t-brand-purple rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!templates.isLoading && allTemplates.length === 0 && (
        <div className="glass rounded-glass px-6 py-16 text-center">
          <DocIcon cls="w-8 h-8 text-mut/50 mx-auto mb-3" />
          <p className="text-[13px] font-medium text-mut">
            {importMut.isPending
              ? t('Memuat template default…', 'Loading default templates…')
              : t('Belum ada template', 'No templates yet')}
          </p>
        </div>
      )}

      {/* ── No search results ───────────────────────────────────────── */}
      {!templates.isLoading &&
        allTemplates.length > 0 &&
        filtered.length === 0 && (
          <div className="glass rounded-glass px-6 py-12 text-center">
            <svg
              className="w-7 h-7 text-mut/50 mx-auto mb-3"
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
            <p className="text-[13px] font-medium text-mut">
              {t('Tidak ada template yang cocok', 'No matching templates')}
            </p>
            <button
              onClick={() => {
                setSearch('');
                setFilterCat(null);
              }}
              className="mt-3 text-[12px] font-semibold text-brand-purple hover:opacity-80 transition-opacity"
            >
              {t('Reset filter', 'Reset filters')}
            </button>
          </div>
        )}

      {/* ── Galeri (large icon) ─────────────────────────────────────── */}
      {!templates.isLoading && filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => {
            const thumb = CATEGORY_THUMB[tpl.category] ?? CATEGORY_THUMB.Umum!;
            return (
              <div
                key={tpl.id}
                className="group glass rounded-glass overflow-hidden flex flex-col"
              >
                <div className="relative h-[150px] overflow-hidden border-b border-white/40">
                  <TemplateThumb template={tpl} bg={thumb.bg} />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() =>
                        setPanel({ type: 'preview', template: tpl })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/90 text-[12px] font-semibold text-ink shadow hover:bg-white transition-colors"
                    >
                      {t('Pratinjau', 'Preview')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closePanel();
                        setPanel({ type: 'edit', template: tpl });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-grad text-white text-[12px] font-semibold shadow"
                    >
                      {t('Ubah', 'Edit')}
                    </button>
                    <button
                      type="button"
                      title={t(
                        'Panduan integrasi API',
                        'API integration guide',
                      )}
                      onClick={() => void openApiGuide(tpl)}
                      className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center text-ink hover:bg-white transition-colors"
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
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-grad">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                      {tpl.category}
                    </span>
                    <span className="num text-[11px] text-mut">
                      v{tpl.current_version}
                    </span>
                  </div>
                  <p className="text-[14px] font-bold text-ink leading-snug">
                    {tpl.name}
                  </p>
                  <p className="num text-[11px] text-mut mt-auto">
                    {t('Diperbarui', 'Updated')} {formatDate(tpl.updated_at)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Template kosong */}
          <button
            type="button"
            onClick={() => {
              closePanel();
              setPanel({ type: 'create' });
            }}
            className="rounded-glass border-2 border-dashed border-white/70 hover:border-brand-purple/50 flex flex-col items-center justify-center gap-1.5 py-10 min-h-[280px] transition-colors"
          >
            <span className="w-12 h-12 rounded-full bg-grad flex items-center justify-center text-white shadow-[0_4px_14px_rgba(155,93,229,0.4)]">
              <svg
                className="w-6 h-6"
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
            </span>
            <p className="text-[13px] font-bold text-ink mt-1">
              {t('Template kosong', 'Blank template')}
            </p>
            <p className="text-[11px] text-mut">
              {t('Mulai dari HTML kosong', 'Start from empty HTML')}
            </p>
          </button>
        </div>
      )}

      {/* ── Daftar (list) ───────────────────────────────────────────── */}
      {!templates.isLoading && filtered.length > 0 && viewMode === 'list' && (
        <div className="glass rounded-glass overflow-hidden divide-y divide-white/40">
          {filtered.map((tpl) => {
            const thumb = CATEGORY_THUMB[tpl.category] ?? CATEGORY_THUMB.Umum!;
            return (
              <div
                key={tpl.id}
                className="group flex items-center gap-4 px-5 py-3.5 hover:bg-white/30 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: thumb.bg, color: thumb.bar }}
                >
                  <DocIcon cls="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink truncate">
                    {tpl.name}
                  </p>
                  <span className="flex items-center gap-1.5 mt-0.5 text-[11px] text-mut">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${CATEGORY_DOT[tpl.category] ?? 'bg-slate-300'}`}
                    />
                    {tpl.category} · v{tpl.current_version}
                  </span>
                </div>
                <span className="num text-[11.5px] text-mut hidden sm:block flex-shrink-0">
                  {formatDate(tpl.updated_at)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      closePanel();
                      setPanel({ type: 'edit', template: tpl });
                    }}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-lg text-brand-purple hover:bg-white/50 transition-colors"
                  >
                    {t('Ubah', 'Edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel({ type: 'preview', template: tpl })}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-lg text-mut hover:text-ink hover:bg-white/50 transition-colors"
                  >
                    {t('Pratinjau', 'Preview')}
                  </button>
                  <button
                    type="button"
                    title={t('Panduan integrasi API', 'API integration guide')}
                    onClick={() => void openApiGuide(tpl)}
                    className="px-2.5 py-1.5 rounded-lg text-mut hover:text-brand-purple hover:bg-white/50 transition-colors"
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
            );
          })}
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

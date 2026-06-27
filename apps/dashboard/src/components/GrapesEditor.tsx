import { useEffect, useRef, useState } from 'react';
import grapesjs, { type Editor } from 'grapesjs';
import presetWebpage from 'grapesjs-preset-webpage';
import 'grapesjs/dist/css/grapes.min.css';
import {
  getTemplateBody,
  createTemplateVersion,
  type TemplateItem,
} from '../api/client.js';
import { guardHandlebars, reconstructDoc } from '../lib/handlebarsGuard.js';
import { useLang } from '../i18n/index.js';

/**
 * Editor LAYOUT visual (GrapesJS) untuk template HTML lanjutan. Memuat body +
 * CSS template, lalu user bisa drag/atur blok & gaya tanpa menulis HTML. Loop
 * Handlebars dilindungi (guardHandlebars) agar tak rusak saat diurai DOM, dan
 * dipulihkan saat disimpan (reconstructDoc).
 */
export function GrapesEditor({
  template,
  onClose,
  onSaved,
}: {
  template: TemplateItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const schemaRef = useRef<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );

  useEffect(() => {
    let alive = true;
    let editor: Editor | null = null;
    void (async () => {
      try {
        const res = await getTemplateBody(template.id);
        if (!alive || !holderRef.current) return;
        schemaRef.current = res.version.schema ?? {};
        editor = grapesjs.init({
          container: holderRef.current,
          height: '100%',
          width: 'auto',
          fromElement: false,
          storageManager: false,
          plugins: [
            (ed: Editor) =>
              presetWebpage(ed, {
                modalImportTitle: 'Import HTML',
                showStylesOnChange: true,
              }),
          ],
        });
        // Lindungi loop Handlebars sebelum diurai jadi komponen DOM.
        editor.setComponents(guardHandlebars(res.version.body));
        editorRef.current = editor;
        if (alive) setLoading(false);
      } catch {
        if (alive) {
          setError(
            t('Gagal memuat editor layout', 'Failed to load layout editor'),
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
      try {
        editor?.destroy();
      } catch {
        /* ignore */
      }
      editorRef.current = null;
    };
  }, [template.id]);

  // Esc untuk tutup.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  async function save() {
    const editor = editorRef.current;
    if (!editor) return;
    setSaveState('saving');
    setError('');
    try {
      const css = editor.getCss() ?? '';
      const inner = editor.getHtml();
      const body = reconstructDoc(inner, css);
      await createTemplateVersion(template.id, body, schemaRef.current);
      setSaveState('saved');
      onSaved();
      window.setTimeout(() => setSaveState('idle'), 2500);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('Gagal menyimpan versi', 'Failed to save version'),
      );
      setSaveState('idle');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f2f8]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-black/10 bg-white flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Kembali', 'Back')}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors flex-shrink-0"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-800 truncate">
              {template.name}
            </p>
            <p className="num text-[11px] text-slate-400 truncate">
              {t('Editor layout visual', 'Visual layout editor')} · v
              {template.current_version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {error && (
            <span className="text-[12px] text-rose-600 max-w-[280px] truncate">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saveState === 'saving' || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-grad text-white text-[12.5px] font-bold shadow-[0_4px_14px_rgba(155,93,229,0.4)] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {saveState === 'saved'
              ? t('✓ Tersimpan', '✓ Saved')
              : saveState === 'saving'
                ? t('Menyimpan…', 'Saving…')
                : t('Simpan versi', 'Save version')}
          </button>
        </div>
      </div>

      {/* Canvas GrapesJS */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f4f2f8]">
            <div className="w-7 h-7 border-2 border-slate-300 border-t-brand-purple rounded-full animate-spin" />
          </div>
        )}
        <div ref={holderRef} className="absolute inset-0" />
      </div>
    </div>
  );
}

export default GrapesEditor;

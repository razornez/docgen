import { useEffect, useMemo, useState } from 'react';
import {
  getTemplateBody,
  createTemplateVersion,
  createBatch,
  getBatch,
  getBatchDocuments,
  type TemplateItem,
} from '../api/client.js';
import { extractVars, buildDummyJson } from '../lib/templateData.js';

/** Render klien sederhana (mesin polos {{ }} / {{{ }}}) untuk preview instan. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function renderClient(body: string, data: Record<string, string>): string {
  return body
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, k: string) => data[k] ?? '')
    .replace(/\{\{(\w+)\}\}/g, (_, k: string) => esc(data[k] ?? ''));
}

const A4_W = 794;
const SCALE = 0.6;

export function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: TemplateItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<'html' | 'data'>('data');
  const [body, setBody] = useState('');
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );
  const [pdf, setPdf] = useState<{ loading: boolean; error: string }>({
    loading: false,
    error: '',
  });
  const [showTips, setShowTips] = useState(false);

  const vars = useMemo(() => extractVars(body), [body]);
  const preview = useMemo(() => renderClient(body, data), [body, data]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await getTemplateBody(template.id);
        if (!alive) return;
        setBody(res.version.body);
        const v = extractVars(res.version.body);
        setData(JSON.parse(buildDummyJson(v)) as Record<string, string>);
      } catch {
        if (alive) setError('Gagal memuat konten template');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [template.id]);

  // Esc untuk tutup
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  async function save() {
    setSaveState('saving');
    setError('');
    try {
      await createTemplateVersion(template.id, body.trim());
      setSaveState('saved');
      onSaved();
      window.setTimeout(() => setSaveState('idle'), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan versi');
      setSaveState('idle');
    }
  }

  async function generate() {
    setPdf({ loading: true, error: '' });
    try {
      let b = await createBatch({
        template: template.id,
        items: [{ ref: 'editor-preview', data }],
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
      const docs = await getBatchDocuments(b.id);
      const doc = docs.data[0];
      if (!doc || doc.status !== 'completed' || !doc.output_url)
        throw new Error(doc?.error ?? 'Dokumen gagal diproses');
      // Ambil lewat path relatif (proxy same-origin) agar tak kena CORS.
      const u = new URL(doc.output_url, window.location.origin);
      const resp = await fetch(u.pathname + u.search);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdf({
        loading: false,
        error: e instanceof Error ? e.message : 'Gagal generate PDF',
      });
      return;
    }
    setPdf({ loading: false, error: '' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="fixed inset-0 bg-[#2a1c4a]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[1180px] h-[90vh] flex flex-col rounded-[22px] overflow-hidden glass shadow-2xl">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/40 bg-white/30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Kembali"
              className="w-9 h-9 rounded-full glass-soft flex items-center justify-center text-mut hover:text-ink transition-colors flex-shrink-0"
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
            <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5"
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
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-ink truncate">
                {template.name}
              </p>
              <p className="num text-[11px] text-mut truncate">
                {template.id} · v{template.current_version} · {vars.length}{' '}
                variabel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTips((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full glass-soft text-[12.5px] font-semibold text-ink hover:bg-white/60 transition-colors"
              >
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Tips
              </button>
              {showTips && (
                <div className="absolute right-0 top-full mt-2 w-64 glass rounded-2xl p-3.5 z-20 text-[11.5px] text-ink space-y-2">
                  <p className="font-semibold text-[12px]">
                    Tips template HTML
                  </p>
                  {[
                    ['Variabel', '{{nama}} diganti dari data'],
                    ['Raw HTML', '{{{konten}}} tanpa escape'],
                    ['Page break', 'page-break-after: always'],
                    ['Ukuran', '@page { size: A4 }'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="font-semibold">{k}</span> —{' '}
                      <code className="num text-[10.5px] text-brand-purple">
                        {v}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saveState === 'saving' || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full glass-soft text-[12.5px] font-semibold text-ink hover:bg-white/60 disabled:opacity-50 transition-colors"
            >
              {saveState === 'saved'
                ? '✓ Tersimpan'
                : saveState === 'saving'
                  ? 'Menyimpan…'
                  : 'Simpan versi'}
            </button>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={pdf.loading || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-grad text-white text-[12.5px] font-bold shadow-[0_4px_14px_rgba(155,93,229,0.4)] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {pdf.loading ? 'Membuat…' : 'Generate PDF'}
            </button>
          </div>
        </div>

        {/* ── Body 2 panel ───────────────────────────────────────── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
          {/* Left */}
          <div className="flex flex-col min-h-0 border-r border-white/40 bg-white/20">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/40">
              <div className="flex items-center p-0.5 rounded-full glass-soft">
                <button
                  type="button"
                  onClick={() => setTab('html')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${tab === 'html' ? 'bg-grad text-white shadow-sm' : 'text-mut hover:text-ink'}`}
                >
                  <span className="num">&lt;/&gt;</span> HTML
                </button>
                <button
                  type="button"
                  onClick={() => setTab('data')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${tab === 'data' ? 'bg-grad text-white shadow-sm' : 'text-mut hover:text-ink'}`}
                >
                  <span className="num">{'{}'}</span> Data
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/40 text-[10px]">
                    {vars.length}
                  </span>
                </button>
              </div>
              <span className="num text-[10px] font-semibold uppercase tracking-wider text-mut">
                application/json
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-white/60 border-t-brand-purple rounded-full animate-spin" />
                </div>
              ) : tab === 'html' ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  spellCheck={false}
                  className="num w-full h-full min-h-[420px] resize-none rounded-2xl bg-[#1c1530] text-emerald-200 text-[12px] leading-relaxed p-4 focus:outline-none"
                />
              ) : (
                <>
                  <div className="glass-soft rounded-2xl px-3.5 py-2.5 text-[12px] text-ink mb-3">
                    <span className="num text-brand-purple font-semibold">
                      {'{}'}
                    </span>{' '}
                    <b>{vars.length} variabel</b> terdeteksi dari template. Isi
                    nilai contoh untuk preview.
                  </div>
                  {vars.length === 0 ? (
                    <p className="text-[12px] text-mut text-center py-8">
                      Tidak ada variabel {'{{...}}'} pada template.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {vars.map((v) => (
                        <div
                          key={v}
                          className="flex items-center gap-3 glass-soft rounded-2xl px-2.5 py-2"
                        >
                          <span className="num text-[11.5px] text-brand-purple bg-white/50 rounded-lg px-2 py-1 w-[140px] flex-shrink-0 truncate">
                            {`{{${v}}}`}
                          </span>
                          <input
                            value={data[v] ?? ''}
                            onChange={(e) =>
                              setData((d) => ({ ...d, [v]: e.target.value }))
                            }
                            placeholder={`nilai ${v}`}
                            className="flex-1 min-w-0 bg-transparent text-[12.5px] text-ink placeholder:text-mut focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {error && (
                <p className="mt-3 text-[12px] text-rose-600">{error}</p>
              )}
            </div>
          </div>

          {/* Right — preview */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mut flex-shrink-0">
                Preview langsung
              </span>
              <div className="flex items-center gap-1 flex-wrap justify-end overflow-hidden">
                {vars.slice(0, 4).map((v) => (
                  <span
                    key={v}
                    className="num text-[9.5px] text-brand-purple bg-white/50 rounded px-1.5 py-0.5 truncate max-w-[100px]"
                  >
                    {v}
                  </span>
                ))}
                <span className="num text-[10px] text-mut ml-1 flex-shrink-0">
                  A4 · 1 hlm
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex justify-center bg-white/10">
              <div
                className="bg-white rounded-md shadow-[0_10px_40px_rgba(80,40,140,0.18)] overflow-hidden flex-shrink-0"
                style={{ width: A4_W * SCALE, height: 1123 * SCALE }}
              >
                <iframe
                  title="Preview"
                  srcDoc={preview}
                  sandbox="allow-same-origin"
                  style={{
                    width: A4_W,
                    height: 1123,
                    border: 0,
                    transform: `scale(${SCALE})`,
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/40 bg-white/30">
              <span className="num text-[11px] text-mut flex items-center gap-1.5">
                <span className="text-brand-purple">✦</span> 1 kredit / dokumen
              </span>
              {pdf.error ? (
                <span className="text-[11px] text-rose-600">{pdf.error}</span>
              ) : (
                <span className="text-[11px] text-emerald-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  sinkron
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

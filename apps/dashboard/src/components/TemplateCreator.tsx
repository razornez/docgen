import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Editor } from '@tiptap/react';
import { createTemplate } from '../api/client.js';
import RichEditor from './RichEditor.js';
import {
  CATEGORY_DOT,
  VARIABLE_CATALOG,
  extractVars,
} from '../lib/templateData.js';
import { useLang } from '../i18n/index.js';

const STARTER =
  '<h1>Judul Dokumen</h1>' +
  '<p>Halo {{nama}}, ini dokumen resmi dari {{nama_perusahaan}}.</p>' +
  '<p>Tanggal: {{tanggal}}</p>' +
  '<p>Tulis isi dokumenmu di sini, lalu sisipkan variabel dari panel kanan.</p>';

export function TemplateCreator({
  categories,
  onClose,
  onCreated,
}: {
  categories: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Umum');
  const [body, setBody] = useState(STARTER);
  const [search, setSearch] = useState('');
  const [customVars, setCustomVars] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const editorRef = useRef<Editor | null>(null);

  const used = useMemo(() => extractVars(body), [body]);
  const allVars = useMemo(
    () => [...new Set([...customVars, ...VARIABLE_CATALOG])],
    [customVars],
  );
  const catalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allVars.filter((v) => v.includes(q)) : allVars;
  }, [search, allVars]);

  // Variabel baru dari kotak pencarian (huruf/angka/underscore).
  const newVarKey = search
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '');
  const canAddVar = newVarKey.length > 0 && !allVars.includes(newVarKey);

  function addNewVar() {
    if (!canAddVar) return;
    setCustomVars((prev) => [newVarKey, ...prev]);
    insertVar(newVarKey);
    setSearch('');
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const create = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : '';
      setError(
        /already exists/i.test(msg)
          ? t(
              'Nama template sudah dipakai — pilih nama lain.',
              'Template name already in use — choose another.',
            )
          : /at least 1 character|name/i.test(msg)
            ? t('Nama template wajib diisi.', 'Template name is required.')
            : msg ||
              t(
                'Gagal menyimpan template. Coba lagi.',
                'Failed to save template. Try again.',
              ),
      );
    },
  });

  function insertVar(v: string) {
    editorRef.current?.chain().focus().insertContent(`{{${v}}}`).run();
  }
  function copyVar(v: string) {
    void navigator.clipboard?.writeText(`{{${v}}}`);
    setCopied(v);
    window.setTimeout(() => setCopied(''), 1200);
  }
  function save() {
    setError('');
    if (!name.trim()) {
      setError(t('Nama template wajib diisi', 'Template name is required'));
      return;
    }
    create.mutate({ name: name.trim(), category, body: body.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="fixed inset-0 bg-[#2a1c4a]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[1180px] h-[90vh] flex flex-col rounded-[22px] overflow-hidden glass shadow-2xl">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/40 bg-white/30">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Kembali', 'Back')}
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
          <div className="w-9 h-9 rounded-lg bg-grad text-white flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(155,93,229,0.4)]">
            <svg
              className="w-4.5 h-4.5"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.85}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
              />
            </svg>
          </div>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder={t('Nama template…', 'Template name…')}
            className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl glass-soft text-[14px] text-ink placeholder:text-mut focus:outline-none ${
              error ? 'ring-1 ring-rose-400' : ''
            }`}
          />
          <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-end max-w-[320px]">
            {categories.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
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
          <button
            type="button"
            onClick={save}
            disabled={create.isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-grad text-white text-[12.5px] font-bold shadow-[0_4px_14px_rgba(155,93,229,0.4)] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all flex-shrink-0"
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            {create.isPending
              ? t('Menyimpan…', 'Saving…')
              : t('Simpan template', 'Save template')}
          </button>
        </div>

        {/* Banner error — selalu terlihat di atas */}
        {error && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-[12.5px] font-medium text-rose-700">
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
            {error}
          </div>
        )}

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-0">
          {/* Editor — area putih (kertas) */}
          <div className="min-h-0 overflow-y-auto p-5 bg-white">
            <div className="mx-auto max-w-[680px]">
              <RichEditor
                value={body}
                onChange={setBody}
                onEditorReady={(e) => {
                  editorRef.current = e;
                }}
              />
            </div>
          </div>

          {/* Variabel panel */}
          <div className="min-h-0 border-l border-white/40 flex flex-col gap-4 p-4 overflow-hidden bg-white/15">
            <div className="glass rounded-glass p-4 flex flex-col min-h-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="num text-brand-purple font-bold">{'{}'}</span>
                <h2 className="text-[14px] font-bold text-ink">
                  {t('Variabel', 'Variables')}
                </h2>
              </div>
              <p className="text-[11.5px] text-mut mt-1 leading-snug">
                {t('Klik untuk', 'Click to')}{' '}
                <b>{t('menyisipkan', 'insert')}</b>{' '}
                {t(
                  'di posisi kursor · ikon salin untuk copy.',
                  'at the cursor · copy icon to copy.',
                )}
              </p>
              <div className="relative mt-3">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mut pointer-events-none"
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canAddVar) {
                      e.preventDefault();
                      addNewVar();
                    }
                  }}
                  placeholder={t(
                    'cari / ketik variabel baru…',
                    'search / type a new variable…',
                  )}
                  className="num w-full pl-9 pr-3 py-2 rounded-xl glass-soft text-[12px] text-ink placeholder:text-mut focus:outline-none"
                />
              </div>
              <div className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {canAddVar && (
                  <button
                    type="button"
                    onClick={addNewVar}
                    className="w-full flex items-center gap-2 rounded-xl bg-grad text-white px-3 py-2 text-[12px] font-semibold shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
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
                    <span className="num truncate">
                      {t('Tambah', 'Add')} {`{{${newVarKey}}}`}
                    </span>
                  </button>
                )}
                {catalog.map((v) => (
                  <div
                    key={v}
                    className="group flex items-center justify-between glass-soft rounded-xl pl-3 pr-2 py-2 hover:bg-white/60 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => insertVar(v)}
                      className="num text-[12px] text-brand-purple text-left flex-1 truncate"
                      title={t('Sisipkan di kursor', 'Insert at cursor')}
                    >
                      {`{{${v}}}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyVar(v)}
                      aria-label={t(`Salin ${v}`, `Copy ${v}`)}
                      title={t('Salin', 'Copy')}
                      className="ml-2 p-1 rounded-md text-mut hover:text-ink hover:bg-white/60 transition-colors flex-shrink-0"
                    >
                      {copied === v ? (
                        <svg
                          className="w-3.5 h-3.5 text-emerald-500"
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
                      ) : (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.85}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 8V5a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-3M5 8h9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
                {catalog.length === 0 && (
                  <p className="text-[12px] text-mut text-center py-6">
                    {t('Tidak ada variabel cocok.', 'No matching variables.')}
                  </p>
                )}
              </div>
            </div>

            {/* Dipakai */}
            <div className="glass rounded-glass p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-ink">
                  {t('Dipakai', 'Used')}
                </h3>
                <span className="num text-[11px] font-bold text-brand-purple bg-white/50 rounded-full w-6 h-6 flex items-center justify-center">
                  {used.length}
                </span>
              </div>
              {used.length === 0 ? (
                <p className="text-[11.5px] text-mut mt-2">
                  {t(
                    'Belum ada variabel pada dokumen.',
                    'No variables in the document yet.',
                  )}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {used.map((v) => (
                    <span
                      key={v}
                      className="num text-[11px] text-brand-purple bg-white/50 rounded-lg px-2 py-1"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

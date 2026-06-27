import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOwnerContent,
  saveOwnerContent,
  type OwnerSiteContent,
} from '../../api/client.js';
import { useLang } from '../../i18n/index.js';
import ConfirmModal from '../../components/ConfirmModal.js';
import { Markdown } from '../../lib/markdown.js';

interface LocS {
  id: string;
  en: string;
}
interface LinkS {
  key: string;
  label: LocS;
  href: string;
}
interface ColS {
  key: string;
  head: LocS;
  items: LinkS[];
}
interface PageS {
  key: string;
  slug: string;
  title: LocS;
  body: LocS;
}
type Tab = 'pages' | 'footer';

const inputCls =
  'w-full bg-white/70 border border-white/60 rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-mut/60 focus:outline-none focus:ring-2 focus:ring-brand-purple/30';

/** Field dwibahasa pendek (ID + EN berdampingan). */
function LocRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocS;
  onChange: (v: LocS) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-mut mb-1">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(['id', 'en'] as const).map((l) => (
          <div key={l} className="relative">
            <span className="num absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase text-mut/70">
              {l}
            </span>
            <input
              value={value[l]}
              onChange={(e) => onChange({ ...value, [l]: e.target.value })}
              className={`${inputCls} pl-8`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OwnerContent() {
  const { lang } = useLang();
  const t = (id: string, en: string) => (lang === 'en' ? en : id);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['owner-content'], queryFn: getOwnerContent });
  const [tab, setTab] = useState<Tab>('pages');
  const [tagline, setTagline] = useState<LocS>({ id: '', en: '' });
  const [cols, setCols] = useState<ColS[]>([]);
  const [pages, setPages] = useState<PageS[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  // Bahasa yang ditampilkan di pratinjau per halaman, null = tertutup.
  const [previewLang, setPreviewLang] = useState<Record<string, 'id' | 'en'>>(
    {},
  );
  const k = useRef(0);
  const nk = () => `k${k.current++}`;

  const seed = (d: OwnerSiteContent) => {
    setTagline(d.footer_tagline);
    setCols(
      d.footer_columns.map((c) => ({
        key: nk(),
        head: c.head,
        items: c.items.map((it) => ({
          key: nk(),
          label: it.label,
          href: it.href,
        })),
      })),
    );
    setPages(
      d.pages.map((p) => ({
        key: nk(),
        slug: p.slug,
        title: p.title,
        body: p.body,
      })),
    );
    setError('');
  };

  useEffect(() => {
    if (q.data) seed(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      saveOwnerContent({
        footer_tagline: tagline,
        footer_columns: cols.map((c) => ({
          head: c.head,
          items: c.items
            .filter((it) => it.label.id.trim())
            .map((it) => ({ label: it.label, href: it.href.trim() })),
        })),
        pages: pages.map((p) => ({
          slug: p.slug.trim(),
          title: p.title,
          body: p.body,
        })),
      }),
    onSuccess: () => {
      setSaved(true);
      setError('');
      void qc.invalidateQueries({ queryKey: ['owner-content'] });
      void qc.invalidateQueries({ queryKey: ['public-content'] });
      void qc.invalidateQueries({ queryKey: ['public-page'] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) =>
      setError(
        e instanceof Error
          ? e.message
          : t('Gagal menyimpan konten', 'Failed to save content'),
      ),
  });

  const onSave = () => {
    if (pages.some((p) => !/^[a-z0-9-]+$/.test(p.slug.trim()))) {
      setError(
        t(
          'Slug halaman hanya boleh huruf kecil, angka, dan strip.',
          'Page slug may only contain lowercase letters, numbers, and dashes.',
        ),
      );
      return;
    }
    const slugs = pages.map((p) => p.slug.trim());
    if (new Set(slugs).size !== slugs.length) {
      setError(t('Slug halaman harus unik.', 'Page slugs must be unique.'));
      return;
    }
    if (cols.some((c) => !c.head.id.trim())) {
      setError(
        t('Judul kolom (ID) wajib diisi.', 'Column title (ID) is required.'),
      );
      return;
    }
    save.mutate();
  };

  // page helpers
  const patchPage = (pk: string, p: Partial<PageS>) =>
    setPages((ps) => ps.map((x) => (x.key === pk ? { ...x, ...p } : x)));
  const addPage = () =>
    setPages((ps) => [
      ...ps,
      {
        key: nk(),
        slug: 'halaman-baru',
        title: { id: '', en: '' },
        body: { id: '', en: '' },
      },
    ]);
  const delPage = (pk: string) =>
    setPages((ps) => ps.filter((x) => x.key !== pk));

  // footer helpers
  const patchCol = (ck: string, p: Partial<ColS>) =>
    setCols((cs) => cs.map((c) => (c.key === ck ? { ...c, ...p } : c)));
  const patchLink = (ck: string, lk: string, p: Partial<LinkS>) =>
    setCols((cs) =>
      cs.map((c) =>
        c.key === ck
          ? {
              ...c,
              items: c.items.map((it) =>
                it.key === lk ? { ...it, ...p } : it,
              ),
            }
          : c,
      ),
    );
  const colItems = (ck: string, fn: (items: LinkS[]) => LinkS[]) =>
    setCols((cs) =>
      cs.map((c) => (c.key === ck ? { ...c, items: fn(c.items) } : c)),
    );
  const addCol = () =>
    setCols((cs) => [
      ...cs,
      { key: nk(), head: { id: '', en: '' }, items: [] },
    ]);

  return (
    <>
      <ConfirmModal
        isOpen={confirmDeleteKey !== null}
        title={t('Hapus halaman?', 'Delete page?')}
        message={t(
          'Halaman ini akan dihapus dari daftar. Perubahan belum tersimpan hingga Anda klik Simpan.',
          'This page will be removed from the list. Changes are not saved until you click Save.',
        )}
        confirmLabel={t('Hapus', 'Delete')}
        cancelLabel={t('Batal', 'Cancel')}
        danger
        onConfirm={() => {
          if (confirmDeleteKey) delPage(confirmDeleteKey);
          setConfirmDeleteKey(null);
        }}
        onCancel={() => setConfirmDeleteKey(null)}
      />
      <div className="space-y-5">
        <div className="glass rounded-glass px-6 py-5">
          <h1 className="text-[16px] font-bold text-ink">
            {t('Konten publik', 'Public content')}
          </h1>
          <p className="text-[12.5px] text-mut mt-0.5">
            {t(
              'Halaman & footer landing — dwibahasa (ID / EN). Perubahan langsung live.',
              'Landing pages & footer — bilingual (ID / EN). Changes go live instantly.',
            )}
          </p>
          <div className="flex mt-4 glass-soft rounded-full p-1 gap-1 w-fit">
            {(
              [
                ['pages', t('Halaman', 'Pages')],
                ['footer', t('Footer', 'Footer')],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setTab(v)}
                className={`px-4 py-1.5 text-[12.5px] font-bold rounded-full transition-all ${
                  tab === v ? 'bg-grad text-white' : 'text-mut hover:text-ink'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Halaman (CMS) ──────────────────────────────────────────── */}
        {tab === 'pages' && (
          <div className="space-y-4">
            {pages.map((p) => (
              <div key={p.key} className="glass rounded-glass p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-mut mb-1">
                      {t('Slug', 'Slug')} · URL: /p/{p.slug || '…'}
                    </p>
                    <input
                      value={p.slug}
                      onChange={(e) =>
                        patchPage(p.key, { slug: e.target.value })
                      }
                      placeholder={t('contoh-halaman', 'example-page')}
                      className={`num ${inputCls}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteKey(p.key)}
                    aria-label={t('Hapus halaman', 'Delete page')}
                    className="self-end p-2 rounded-lg bg-white/55 text-mut hover:text-rose-600 hover:bg-white/75 transition-colors"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                <LocRow
                  label={t('Judul', 'Title')}
                  value={p.title}
                  onChange={(v) => patchPage(p.key, { title: v })}
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-mut mb-1">
                    {t(
                      'Isi (markdown polos, pisah paragraf dgn baris baru)',
                      'Content (plain markdown, separate paragraphs with new lines)',
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['id', 'en'] as const).map((l) => (
                      <textarea
                        key={l}
                        value={p.body[l]}
                        onChange={(e) =>
                          patchPage(p.key, {
                            body: { ...p.body, [l]: e.target.value },
                          })
                        }
                        rows={4}
                        placeholder={l.toUpperCase()}
                        className={`${inputCls} resize-y`}
                      />
                    ))}
                  </div>
                </div>

                {/* Pratinjau markdown (sama dengan render halaman publik) */}
                <div className="border-t border-white/40 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-mut">
                      {t('Pratinjau', 'Preview')}
                    </span>
                    {(['id', 'en'] as const).map((l) => {
                      const active = previewLang[p.key] === l;
                      return (
                        <button
                          key={l}
                          type="button"
                          onClick={() =>
                            setPreviewLang((s) => ({
                              ...s,
                              [p.key]: active ? (undefined as never) : l,
                            }))
                          }
                          className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full transition-all ${
                            active
                              ? 'bg-grad text-white shadow-sm'
                              : 'glass-soft text-mut hover:text-ink'
                          }`}
                        >
                          {l}
                        </button>
                      );
                    })}
                    {previewLang[p.key] && (
                      <span className="num text-[10.5px] text-mut ml-1">
                        /p/{p.slug || '…'}
                      </span>
                    )}
                  </div>
                  {previewLang[p.key] && (
                    <div className="mt-3 rounded-xl bg-white/70 border border-white/60 px-5 py-4 max-h-[420px] overflow-y-auto">
                      <h1 className="text-[24px] font-extrabold tracking-tight text-grad mb-1">
                        {p.title[previewLang[p.key]!]}
                      </h1>
                      <Markdown text={p.body[previewLang[p.key]!]} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addPage}
              className="text-[13px] font-semibold text-brand-purple hover:opacity-80"
            >
              {t('+ Tambah halaman', '+ Add page')}
            </button>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        {tab === 'footer' && (
          <div className="space-y-4">
            <div className="glass rounded-glass p-5">
              <LocRow
                label={t('Tagline', 'Tagline')}
                value={tagline}
                onChange={setTagline}
              />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cols.map((c) => (
                <div key={c.key} className="glass rounded-glass p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <LocRow
                        label={t('Judul kolom', 'Column title')}
                        value={c.head}
                        onChange={(v) => patchCol(c.key, { head: v })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCols((cs) => cs.filter((x) => x.key !== c.key))
                      }
                      aria-label={t('Hapus kolom', 'Delete column')}
                      className="mt-5 p-2 rounded-lg bg-white/55 text-mut hover:text-rose-600 flex-shrink-0"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  {c.items.map((it) => (
                    <div
                      key={it.key}
                      className="border-t border-white/40 pt-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-mut">
                          {t('Tautan', 'Link')}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            colItems(c.key, (its) =>
                              its.filter((x) => x.key !== it.key),
                            )
                          }
                          className="text-[11px] text-mut hover:text-rose-600"
                        >
                          {t('hapus', 'remove')}
                        </button>
                      </div>
                      <LocRow
                        label={t('Label', 'Label')}
                        value={it.label}
                        onChange={(v) => patchLink(c.key, it.key, { label: v })}
                      />
                      <input
                        value={it.href}
                        onChange={(e) =>
                          patchLink(c.key, it.key, { href: e.target.value })
                        }
                        placeholder={t(
                          '/p/slug atau https://…',
                          '/p/slug or https://…',
                        )}
                        className={`num ${inputCls}`}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      colItems(c.key, (its) => [
                        ...its,
                        {
                          key: nk(),
                          label: { id: 'Tautan', en: 'Link' },
                          href: '#',
                        },
                      ])
                    }
                    className="text-[12px] font-semibold text-brand-purple hover:opacity-80"
                  >
                    {t('+ Tautan', '+ Link')}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCol}
              className="text-[13px] font-semibold text-brand-purple hover:opacity-80"
            >
              {t('+ Tambah kolom', '+ Add column')}
            </button>
          </div>
        )}

        {/* ── Aksi ───────────────────────────────────────────────────── */}
        {error && (
          <p className="text-[12.5px] text-rose-600 text-right">{error}</p>
        )}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-[12.5px] font-semibold text-emerald-600">
              {t('Tersimpan ✓', 'Saved ✓')}
            </span>
          )}
          <button
            type="button"
            onClick={() => q.data && seed(q.data)}
            className="px-4 py-2.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
          >
            {t('Reset', 'Reset')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={save.isPending}
            className="px-5 py-2.5 text-[13px] font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.4)] disabled:opacity-50 hover:opacity-90 transition-all"
          >
            {save.isPending
              ? t('Menyimpan…', 'Saving…')
              : t('Simpan konten', 'Save content')}
          </button>
        </div>
      </div>
    </>
  );
}

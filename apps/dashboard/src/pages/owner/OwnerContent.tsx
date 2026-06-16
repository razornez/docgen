import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOwnerContent,
  saveOwnerContent,
  type SiteContent,
} from '../../api/client.js';

interface Link {
  key: string;
  label: string;
  href: string;
}
interface Col {
  key: string;
  head: string;
  items: Link[];
}

const inputCls =
  'w-full bg-white/70 border border-white/60 rounded-lg px-3 py-2 text-[13px] text-ink placeholder:text-mut/70 focus:outline-none focus:ring-2 focus:ring-brand-purple/30';

export default function OwnerContent() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['owner-content'], queryFn: getOwnerContent });
  const [tagline, setTagline] = useState('');
  const [cols, setCols] = useState<Col[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const k = useRef(0);
  const nextKey = () => `k${k.current++}`;

  const seed = (d: SiteContent) => {
    setTagline(d.footer_tagline);
    setCols(
      d.footer_columns.map((c) => ({
        key: nextKey(),
        head: c.head,
        items: c.items.map((it) => ({
          key: nextKey(),
          label: it.label,
          href: it.href,
        })),
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
          head: c.head.trim(),
          items: c.items
            .filter((it) => it.label.trim())
            .map((it) => ({ label: it.label.trim(), href: it.href.trim() })),
        })),
      }),
    onSuccess: () => {
      setSaved(true);
      setError('');
      void qc.invalidateQueries({ queryKey: ['owner-content'] });
      void qc.invalidateQueries({ queryKey: ['public-content'] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : 'Gagal menyimpan konten'),
  });

  const patchCol = (ck: string, p: Partial<Col>) =>
    setCols((cs) => cs.map((c) => (c.key === ck ? { ...c, ...p } : c)));
  const patchLink = (ck: string, lk: string, p: Partial<Link>) =>
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
  const addLink = (ck: string) =>
    patchColItems(ck, (items) => [
      ...items,
      { key: nextKey(), label: 'Tautan', href: '#' },
    ]);
  const delLink = (ck: string, lk: string) =>
    patchColItems(ck, (items) => items.filter((it) => it.key !== lk));
  const patchColItems = (ck: string, fn: (items: Link[]) => Link[]) =>
    setCols((cs) =>
      cs.map((c) => (c.key === ck ? { ...c, items: fn(c.items) } : c)),
    );
  const addCol = () =>
    setCols((cs) => [...cs, { key: nextKey(), head: 'Kolom baru', items: [] }]);
  const delCol = (ck: string) =>
    setCols((cs) => cs.filter((c) => c.key !== ck));

  const onSave = () => {
    if (cols.some((c) => !c.head.trim())) {
      setError('Setiap kolom harus punya judul.');
      return;
    }
    save.mutate();
  };

  return (
    <div className="space-y-5">
      {/* Tagline */}
      <div className="glass rounded-glass px-6 py-5">
        <h1 className="text-[16px] font-bold text-ink">Konten footer publik</h1>
        <p className="text-[12.5px] text-mut mt-0.5">
          Tampil di footer halaman landing. Perubahan langsung live.
        </p>
        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut mt-4 mb-1.5">
          Tagline
        </label>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Mesin generate dokumen via API."
          className={`${inputCls} max-w-md`}
        />
      </div>

      {/* Columns */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cols.map((c) => (
          <div key={c.key} className="glass rounded-glass p-5">
            <div className="flex items-center gap-2">
              <input
                value={c.head}
                onChange={(e) => patchCol(c.key, { head: e.target.value })}
                placeholder="Judul kolom"
                className={`${inputCls} font-bold`}
              />
              <button
                type="button"
                onClick={() => delCol(c.key)}
                aria-label="Hapus kolom"
                className="p-2 rounded-lg bg-white/55 text-mut hover:text-rose-600 hover:bg-white/75 transition-colors flex-shrink-0"
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
            <div className="mt-3 space-y-2">
              {c.items.map((it) => (
                <div key={it.key} className="flex items-center gap-1.5">
                  <input
                    value={it.label}
                    onChange={(e) =>
                      patchLink(c.key, it.key, { label: e.target.value })
                    }
                    placeholder="Label"
                    className={`${inputCls} w-[40%]`}
                  />
                  <input
                    value={it.href}
                    onChange={(e) =>
                      patchLink(c.key, it.key, { href: e.target.value })
                    }
                    placeholder="URL / #"
                    className={`num ${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => delLink(c.key, it.key)}
                    aria-label="Hapus tautan"
                    className="p-1.5 rounded-md text-mut hover:text-rose-600 flex-shrink-0"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addLink(c.key)}
              className="mt-3 text-[12px] font-semibold text-brand-purple hover:opacity-80"
            >
              + Tautan
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addCol}
        className="text-[13px] font-semibold text-brand-purple hover:opacity-80"
      >
        + Tambah kolom
      </button>

      {/* Footer aksi */}
      {error && (
        <p className="text-[12.5px] text-rose-600 text-right">{error}</p>
      )}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-[12.5px] font-semibold text-emerald-600">
            Tersimpan ✓
          </span>
        )}
        <button
          type="button"
          onClick={() => q.data && seed(q.data)}
          className="px-4 py-2.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={save.isPending}
          className="px-5 py-2.5 text-[13px] font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.4)] disabled:opacity-50 hover:opacity-90 transition-all"
        >
          {save.isPending ? 'Menyimpan…' : 'Simpan konten'}
        </button>
      </div>
    </div>
  );
}

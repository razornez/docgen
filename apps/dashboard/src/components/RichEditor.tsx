import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { compressImageToDataUrl, dataUrlKb } from '../lib/image.js';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Dipanggil saat editor siap — untuk insert variabel di posisi kursor. */
  onEditorReady?: (editor: Editor) => void;
}

// Simple SVG icon component
function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const PRESET_COLORS = [
  '#000000',
  '#374151',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#4f46e5',
  '#7c3aed',
  '#db2777',
  '#ffffff',
];

function ToolbarBtn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors',
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        disabled ? 'opacity-30 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5" />;
}

export default function RichEditor({
  value,
  onChange,
  placeholder,
  onEditorReady,
}: Props) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(value);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [imgStatus, setImgStatus] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      Image,
    ],
    content: value,
    editorProps: {
      attributes: { class: 'tiptap-content px-4 py-3 focus:outline-none' },
    },
    onUpdate({ editor: e }) {
      const html = e.getHTML();
      setSourceHtml(html);
      onChange(html);
    },
  });

  // Ekspos instance editor ke parent (untuk insert variabel di kursor).
  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Sync external value changes (e.g., when loading edit panel)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
      setSourceHtml(value);
    }
  }, [value, editor]);

  const toggleSource = useCallback(() => {
    if (!editor) return;
    if (!sourceMode) {
      // WYSIWYG → Source
      setSourceHtml(editor.getHTML());
    } else {
      // Source → WYSIWYG
      editor.commands.setContent(sourceHtml);
      onChange(sourceHtml);
    }
    setSourceMode((s) => !s);
  }, [editor, sourceMode, sourceHtml, onChange]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL tautan:', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  // Upload gambar dari komputer → kompres → base64 inline.
  const fileRef = useRef<HTMLInputElement>(null);
  const insertImage = useCallback(() => fileRef.current?.click(), []);
  const handleImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;
      setImgStatus('Mengompres gambar…');
      try {
        const url = await compressImageToDataUrl(file);
        editor.chain().focus().setImage({ src: url }).run();
        setImgStatus(`Gambar disisipkan · ${dataUrlKb(url)} KB`);
        window.setTimeout(() => setImgStatus(''), 3000);
      } catch (err) {
        setImgStatus(
          err instanceof Error ? err.message : 'Gagal memproses gambar',
        );
        window.setTimeout(() => setImgStatus(''), 4000);
      }
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        {/* Undo/Redo */}
        <ToolbarBtn
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Icon d="M3 7v6h6M3.51 15A9 9 0 1 0 4.5 4.5L3 7" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Icon d="M21 7v6h-6M20.49 15A9 9 0 1 1 19.5 4.5L21 7" />
        </ToolbarBtn>

        <Sep />

        {/* Bold, Italic, Underline, Strike */}
        <ToolbarBtn
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold text-sm">B</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic text-sm font-serif">I</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline text-sm">U</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through text-sm">S</span>
        </ToolbarBtn>

        <Sep />

        {/* Headings */}
        <ToolbarBtn
          title="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <span className="text-xs font-bold">H1</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <span className="text-xs font-bold">H2</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <span className="text-xs font-bold">H3</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Paragraph"
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <span className="text-xs">¶</span>
        </ToolbarBtn>

        <Sep />

        {/* Alignment */}
        <ToolbarBtn
          title="Rata kiri"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <Icon d="M3 6h18M3 12h12M3 18h15" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Rata tengah"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <Icon d="M3 6h18M6 12h12M4 18h16" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Rata kanan"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <Icon d="M3 6h18M9 12h12M6 18h15" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Justify"
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <Icon d="M3 6h18M3 12h18M3 18h18" />
        </ToolbarBtn>

        <Sep />

        {/* Lists */}
        <ToolbarBtn
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <Icon d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Ordered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <Icon d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 15.5c.833-.333 1-.5 1-1 0-.333-.25-.5-.5-.5S4 14.333 4 15c0 .5.5 1 1 1.5S6 17.5 6 18.5s-.5 1.5-2 1.5" />
        </ToolbarBtn>

        <Sep />

        {/* Blockquote, HR */}
        <ToolbarBtn
          title="Kutipan"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Icon d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Garis horizontal"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Icon d="M5 12h14" />
        </ToolbarBtn>

        <Sep />

        {/* Table */}
        <ToolbarBtn title="Sisipkan tabel" onClick={insertTable}>
          <Icon d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Tambah kolom kanan"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!editor.can().addColumnAfter()}
        >
          <span className="text-xs">+col</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Tambah baris bawah"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editor.can().addRowAfter()}
        >
          <span className="text-xs">+row</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Hapus tabel"
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.can().deleteTable()}
        >
          <span className="text-xs text-red-500">del⊞</span>
        </ToolbarBtn>

        <Sep />

        {/* Link, Image */}
        <ToolbarBtn
          title="Tautan"
          active={editor.isActive('link')}
          onClick={setLink}
        >
          <Icon d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </ToolbarBtn>
        <ToolbarBtn title="Sisipkan gambar" onClick={insertImage}>
          <Icon d="M21 15l-5-5L5 21M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        </ToolbarBtn>

        <Sep />

        {/* Highlight */}
        <ToolbarBtn
          title="Sorot teks"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <span className="text-xs">🖊</span>
        </ToolbarBtn>

        {/* Text color */}
        <div className="relative">
          <ToolbarBtn
            title="Warna teks"
            onClick={() => setShowColorPicker((s) => !s)}
          >
            <span
              className="text-xs font-bold"
              style={{
                color:
                  (editor.getAttributes('textStyle').color as
                    | string
                    | undefined) ?? '#000',
              }}
            >
              A
            </span>
          </ToolbarBtn>
          {showColorPicker && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 w-44">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    editor.chain().focus().setColor(c).run();
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ background: c }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className="text-xs text-gray-500 hover:text-red-500 mt-1 w-full text-left px-1"
              >
                Hapus warna
              </button>
            </div>
          )}
        </div>

        <Sep />

        {/* Source toggle */}
        <button
          type="button"
          onClick={toggleSource}
          title="Toggle HTML source"
          className={[
            'inline-flex items-center gap-1 px-2 h-7 rounded text-xs font-mono transition-colors',
            sourceMode
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-500 hover:bg-gray-100',
          ].join(' ')}
        >
          {'</>'}
        </button>
      </div>

      {/* Input file tersembunyi untuk upload gambar */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleImageFile(e)}
      />

      {/* Editor area */}
      {sourceMode ? (
        <textarea
          value={sourceHtml}
          onChange={(e) => {
            setSourceHtml(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          rows={16}
          className="w-full px-4 py-3 text-sm font-mono text-gray-800 bg-gray-950 text-green-300 focus:outline-none resize-y"
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      {/* Footer: word hint */}
      <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-2">
        <span>
          Gunakan{' '}
          <code className="bg-gray-100 text-gray-600 px-1 rounded">
            {'{{variabel}}'}
          </code>{' '}
          untuk data dinamis
        </span>
        {imgStatus && (
          <span className="ml-auto text-indigo-500 font-medium">
            {imgStatus}
          </span>
        )}
        <span className={imgStatus ? '' : 'ml-auto'}>
          {editor.storage.characterCount?.characters?.() ?? ''}
        </span>
      </div>
    </div>
  );
}

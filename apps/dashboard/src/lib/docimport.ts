import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ImportResult {
  html: string;
  warnings: string[];
  kind: 'docx' | 'pdf';
  pages?: number;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Deteksi tipe + arahkan ke konverter yang sesuai. */
export async function importDocumentToHtml(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  const isDocx =
    name.endsWith('.docx') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
  if (isDocx) return convertDocx(file);
  if (isPdf) return convertPdf(file);
  if (name.endsWith('.doc'))
    throw new Error(
      'Format .doc lama tidak didukung — simpan ulang sebagai .docx.',
    );
  throw new Error('Format tidak didukung. Unggah berkas .docx atau .pdf.');
}

// ── DOCX ───────────────────────────────────────────────────────────────────
/** DOCX → HTML (mammoth) — pertahankan heading, daftar, tabel, gambar, lalu rapikan. */
async function convertDocx(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const styleMap = [
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Subtitle'] => h2:fresh",
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "r[style-name='Strong'] => strong",
    'b => strong',
    'i => em',
    'u => u',
  ];
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    { styleMap, includeDefaultStyleMap: true },
  );
  return {
    kind: 'docx',
    html: cleanDocxHtml(result.value),
    warnings: dedupe(result.messages.map((m) => m.message)),
  };
}

/** Rapikan HTML mammoth: buang paragraf kosong, beri gaya tabel yang konsisten. */
function cleanDocxHtml(html: string): string {
  return html
    .replace(/<p>(\s|&nbsp;)*<\/p>/g, '')
    .replace(
      /<table>/g,
      '<table style="border-collapse:collapse;width:100%;margin:10px 0">',
    )
    .replace(
      /<td>/g,
      '<td style="border:1px solid #d1d5db;padding:6px 9px;vertical-align:top">',
    )
    .replace(
      /<th>/g,
      '<th style="border:1px solid #d1d5db;padding:6px 9px;text-align:left;background:#f8f7fc">',
    )
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// ── PDF ────────────────────────────────────────────────────────────────────
/** PDF → HTML (pdfjs) — rekonstruksi struktur: heading, paragraf, daftar, alignment. */
async function convertPdf(file: File): Promise<ImportResult> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const blocks: string[] = [];
  let textPages = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const html = pageToHtml(content);
    if (html) {
      blocks.push(html);
      textPages++;
    }
    if (i < pdf.numPages) blocks.push('<hr />');
    page.cleanup();
  }
  return {
    kind: 'pdf',
    pages: pdf.numPages,
    html: blocks.join('\n') || '<p></p>',
    warnings:
      textPages === 0
        ? ['PDF tampaknya hasil scan (tanpa teks). OCR belum didukung.']
        : [],
  };
}

interface Tok {
  x: number;
  y: number;
  h: number;
  w: number;
  s: string;
}
interface Line {
  y: number;
  h: number;
  text: string;
  x0: number;
  x1: number;
}
type Align = 'left' | 'center' | 'right';

function pageToHtml(content: { items: unknown[] }): string {
  // 1) Kumpulkan token teks.
  const toks: Tok[] = [];
  for (const raw of content.items) {
    const it = raw as {
      str?: string;
      transform?: number[];
      height?: number;
      width?: number;
    };
    if (typeof it.str !== 'string' || !it.transform) continue;
    const h = it.height || Math.abs(it.transform[3] ?? 0) || 10;
    toks.push({
      x: it.transform[4] ?? 0,
      y: it.transform[5] ?? 0,
      h,
      w: it.width ?? it.str.length * h * 0.5,
      s: it.str,
    });
  }
  if (!toks.length) return '';

  // 2) Urut atas→bawah, kiri→kanan; gabung jadi baris.
  toks.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x));
  const lines: Line[] = [];
  for (const tk of toks) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - tk.y) <= Math.max(last.h, tk.h) * 0.6) {
      const gap = tk.x - last.x1;
      const space =
        last.text.endsWith(' ') || tk.s.startsWith(' ') || !tk.s
          ? ''
          : gap > tk.h * 0.25
            ? ' '
            : '';
      last.text += space + tk.s;
      last.h = Math.max(last.h, tk.h);
      last.x1 = Math.max(last.x1, tk.x + tk.w);
    } else if (tk.s.trim()) {
      lines.push({ y: tk.y, h: tk.h, text: tk.s, x0: tk.x, x1: tk.x + tk.w });
    }
  }
  const valid = lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text);
  if (!valid.length) return '';

  // 3) Margin & median tinggi untuk alignment + heading.
  const left = Math.min(...valid.map((l) => l.x0));
  const right = Math.max(...valid.map((l) => l.x1));
  const fullW = Math.max(right - left, 1);
  const center = (left + right) / 2;
  const med = median(valid.map((l) => l.h));
  const tol = Math.max(12, med * 0.8);

  const alignOf = (l: Line): Align => {
    const cx = (l.x0 + l.x1) / 2;
    const short = l.x1 - l.x0 < fullW * 0.85;
    const indented = l.x0 - left > tol;
    if (short && indented && Math.abs(cx - center) < tol) return 'center';
    if (short && indented && right - l.x1 < tol) return 'right';
    return 'left';
  };
  const styleOf = (a: Align) =>
    a === 'left' ? '' : ` style="text-align:${a}"`;

  // 4) Bangun blok: heading, daftar, paragraf.
  const out: string[] = [];
  let i = 0;
  while (i < valid.length) {
    const l = valid[i]!;
    const align = alignOf(l);

    // Heading: font jauh lebih besar dari median + baris pendek.
    if (l.h > med * 1.35 && l.text.length < 90) {
      const tag = l.h > med * 1.8 ? 'h1' : 'h2';
      out.push(`<${tag}${styleOf(align)}>${esc(l.text)}</${tag}>`);
      i++;
      continue;
    }

    // Daftar: bullet atau bernomor.
    const listType = listKind(l.text);
    if (listType) {
      const tag = listType === 'ul' ? 'ul' : 'ol';
      const items: string[] = [];
      while (i < valid.length && listKind(valid[i]!.text) === listType) {
        items.push(`<li>${esc(stripMarker(valid[i]!.text))}</li>`);
        i++;
      }
      out.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    // Paragraf: gabung baris berurutan dgn alignment sama & jarak wajar.
    const parts = [l.text];
    let j = i + 1;
    while (
      j < valid.length &&
      l.h <= med * 1.35 &&
      valid[j]!.h <= med * 1.35 &&
      !listKind(valid[j]!.text) &&
      alignOf(valid[j]!) === align &&
      valid[j - 1]!.y - valid[j]!.y <=
        Math.max(valid[j - 1]!.h, valid[j]!.h) * 1.7
    ) {
      parts.push(valid[j]!.text);
      j++;
    }
    out.push(`<p${styleOf(align)}>${esc(parts.join(' '))}</p>`);
    i = j;
  }
  return out.join('\n');
}

function median(nums: number[]): number {
  if (!nums.length) return 10;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

const BULLET_RE = /^\s*[•·●◦▪‣*‐-]\s+/;
const ORDERED_RE = /^\s*(\d{1,3}|[a-zA-Z])[.)]\s+/;

function listKind(text: string): 'ul' | 'ol' | null {
  if (BULLET_RE.test(text)) return 'ul';
  if (ORDERED_RE.test(text)) return 'ol';
  return null;
}
function stripMarker(text: string): string {
  return text.replace(BULLET_RE, '').replace(ORDERED_RE, '').trim();
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)].slice(0, 8);
}

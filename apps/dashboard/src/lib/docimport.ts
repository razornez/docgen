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

/** DOCX → HTML (mammoth) — pertahankan heading, daftar, tabel, gambar base64. */
async function convertDocx(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const styleMap = [
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Subtitle'] => h2:fresh",
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "r[style-name='Strong'] => strong",
    'b => strong',
    'i => em',
  ];
  const result = await mammoth.convertToHtml({ arrayBuffer }, { styleMap });
  return {
    kind: 'docx',
    html: tidy(result.value),
    warnings: dedupe(result.messages.map((m) => m.message)),
  };
}

/** PDF → HTML (pdfjs) — rekonstruksi baris→paragraf via posisi, deteksi heading. */
async function convertPdf(file: File): Promise<ImportResult> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const blocks: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageHtml = pageToHtml(content);
    if (pageHtml) blocks.push(pageHtml);
    if (i < pdf.numPages) blocks.push('<hr />');
    page.cleanup();
  }
  return {
    kind: 'pdf',
    pages: pdf.numPages,
    html: blocks.join('\n') || '<p></p>',
    warnings:
      pdf.numPages > 0 && blocks.every((b) => b === '<hr />')
        ? ['PDF tampaknya hasil scan (tanpa teks). Hanya teks yang dikonversi.']
        : [],
  };
}

interface Tok {
  x: number;
  y: number;
  h: number;
  s: string;
}

function pageToHtml(content: { items: unknown[] }): string {
  const toks: Tok[] = [];
  for (const raw of content.items) {
    const it = raw as {
      str?: string;
      transform?: number[];
      height?: number;
    };
    if (typeof it.str !== 'string' || !it.transform) continue;
    toks.push({
      x: it.transform[4] ?? 0,
      y: it.transform[5] ?? 0,
      h: it.height || Math.abs(it.transform[3] ?? 0) || 10,
      s: it.str,
    });
  }
  if (!toks.length) return '';

  // Urut atas→bawah, kiri→kanan.
  toks.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x));

  // Gabung token sebaris (selisih y kecil).
  const lines: { y: number; h: number; text: string }[] = [];
  for (const tk of toks) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - tk.y) <= Math.max(last.h, tk.h) * 0.6) {
      const space =
        last.text.endsWith(' ') || tk.s.startsWith(' ') || !tk.s ? '' : ' ';
      last.text += space + tk.s;
      last.h = Math.max(last.h, tk.h);
    } else if (tk.s.trim()) {
      lines.push({ y: tk.y, h: tk.h, text: tk.s });
    }
  }
  const valid = lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text);
  if (!valid.length) return '';

  // Tinggi median → ambang heading.
  const sorted = valid.map((l) => l.h).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 10;

  const out: string[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${esc(para.join(' '))}</p>`);
    para = [];
  };
  for (let i = 0; i < valid.length; i++) {
    const l = valid[i]!;
    const prev = valid[i - 1];
    const gap = prev ? prev.y - l.y : 0; // y mengecil ke bawah
    const isHeading = l.h > median * 1.35 && l.text.length < 90;
    if (prev && gap > Math.max(prev.h, l.h) * 1.8) flushPara();
    if (isHeading) {
      flushPara();
      const tag = l.h > median * 1.8 ? 'h1' : 'h2';
      out.push(`<${tag}>${esc(l.text)}</${tag}>`);
      continue;
    }
    para.push(l.text);
  }
  flushPara();
  return out.join('\n');
}

/** Rapikan HTML hasil mammoth: buang paragraf kosong, normalkan spasi. */
function tidy(html: string): string {
  return html.replace(/<p>\s*<\/p>/g, '').trim();
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)].slice(0, 8);
}

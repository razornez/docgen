import Handlebars from 'handlebars';

/**
 * Render template Handlebars di browser — cermin mesin server
 * (packages/renderer/html-renderer.ts): knownHelpersOnly, escape default.
 * Dipakai untuk preview langsung di editor & thumbnail kartu template.
 *
 * Tahan banting: bila kompilasi/isian gagal (sintaks rusak saat user mengetik),
 * jatuh ke render naif {{var}} agar preview tidak blank.
 */
function naive(body: string, data: Record<string, unknown>): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return body
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, k: string) => String(data[k] ?? ''))
    .replace(/\{\{(\w+)\}\}/g, (_, k: string) => esc(String(data[k] ?? '')));
}

export function renderTemplate(body: string, data: unknown): string {
  try {
    const tpl = Handlebars.compile(body, {
      noEscape: false,
      knownHelpersOnly: true,
    });
    return tpl(data ?? {});
  } catch {
    return naive(body, (data as Record<string, unknown>) ?? {});
  }
}

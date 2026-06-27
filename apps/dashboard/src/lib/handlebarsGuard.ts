/**
 * Pelindung block helper Handlebars untuk editor visual berbasis DOM (GrapesJS).
 *
 * Masalah: token block seperti `{{#each items}}` / `{{/each}}` yang berada
 * sebagai teks telanjang di dalam <table>/<tbody> akan "di-foster-parent" (di-
 * pindah keluar tabel) saat HTML diurai jadi DOM — merusak loop. Komentar HTML
 * TIDAK dipindah, jadi kita bungkus token block ke dalam komentar sebelum dimuat
 * ke editor, lalu buka lagi saat diekspor. Token inline `{{var}}` aman, dibiarkan.
 */
const BLOCK_TOKEN = /(\{\{[#/^][^}]*\}\}|\{\{~?\s*else\s*~?\}\})/g;
const GUARD = /<!--HB:([\s\S]*?)-->/g;

/** Bungkus token block Handlebars jadi komentar agar tahan parsing DOM. */
export function guardHandlebars(html: string): string {
  return html.replace(BLOCK_TOKEN, '<!--HB:$1-->');
}

/** Kembalikan komentar penjaga menjadi token Handlebars asli. */
export function unguardHandlebars(html: string): string {
  return html.replace(GUARD, '$1');
}

/** Susun ulang dokumen lengkap dari body + css hasil ekspor editor. */
export function reconstructDoc(innerHtml: string, css: string): string {
  const body = innerHtml
    .replace(/^\s*<body[^>]*>/i, '')
    .replace(/<\/body>\s*$/i, '');
  return (
    '<!DOCTYPE html>\n<html lang="id"><head><meta charset="utf-8">' +
    `<style>${css}</style></head><body>${unguardHandlebars(body)}</body></html>`
  );
}

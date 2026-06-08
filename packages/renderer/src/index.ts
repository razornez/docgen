/**
 * @docgen/renderer — mesin polos (docs/00): isi-template (Handlebars) + cetak PDF
 * (Chromium/Playwright). MURNI terhadap jaringan keluar (docs/08): konten di-set
 * langsung, tanpa mengambil resource eksternal. Dipakai oleh worker render.
 */
export { renderHtml, TemplateRenderError } from './html-renderer.js';
export { PdfRenderer } from './pdf-renderer.js';

// Offline deployment preflight: no API request, tenant data, or credit charge.
import { PdfRenderer } from '../packages/renderer/dist/index.js';

const renderer = new PdfRenderer();
try {
  const { pdf, pageCount } = await renderer.render(
    '<!doctype html><html><body><h1>DocGen deployment check</h1></body></html>',
  );
  if (pdf.subarray(0, 5).toString() !== '%PDF-' || pageCount < 1) {
    throw new Error('Chromium did not produce a valid PDF');
  }
  process.stdout.write(`Renderer ready (${pageCount} page)\n`);
} finally {
  await renderer.close();
}

import { afterAll, describe, expect, it } from 'vitest';
import { PdfRenderer } from '../src/index.js';

const renderer = new PdfRenderer();

afterAll(async () => {
  await renderer.close();
});

describe('PdfRenderer (Chromium)', () => {
  it('mencetak HTML menjadi PDF (header %PDF, ≥1 halaman)', async () => {
    const { pdf, pageCount } = await renderer.render(
      '<!doctype html><html><body><h1>Halo PDF</h1></body></html>',
      { format: 'A4' },
    );
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
    expect(pageCount).toBeGreaterThanOrEqual(1);
  }, 60_000);
});

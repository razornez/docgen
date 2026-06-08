import type { RenderOptions } from '@docgen/shared';
import { chromium, type Browser } from 'playwright';

/**
 * Pencetak HTML→PDF berbasis Chromium (Playwright). Mesin "polos" (docs/00):
 * hanya mencetak HTML yang sudah jadi. MURNI terhadap jaringan keluar — konten
 * di-set langsung via `setContent` (bukan navigasi URL) dan menunggu `load`
 * saja, selaras keputusan aset base64 + worker tanpa internet (docs/08).
 *
 * Instance menahan satu Browser dan memakainya ulang antar render (disiplin
 * sumber daya, docs/08). Worker membuat satu instance, lalu `close()` saat mati.
 */
export class PdfRenderer {
  private browser: Browser | undefined;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({ args: ['--no-sandbox'] });
    }
    return this.browser;
  }

  /** Mencetak `html` lengkap menjadi PDF. Mengembalikan byte PDF + jumlah halaman. */
  async render(
    html: string,
    options: RenderOptions = {},
  ): Promise<{ pdf: Buffer; pageCount: number }> {
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      // 'load' (bukan 'networkidle') — tidak ada resource eksternal yang diambil.
      await page.setContent(html, { waitUntil: 'load' });
      // Buang nilai margin yang undefined; Playwright menerima string CSS.
      const margin = options.margin
        ? Object.fromEntries(
            Object.entries(options.margin).filter(([, v]) => v !== undefined),
          )
        : undefined;
      const pdf = await page.pdf({
        format: options.format ?? 'A4',
        landscape: options.landscape ?? false,
        printBackground: options.printBackground ?? true,
        ...(margin && Object.keys(margin).length > 0 ? { margin } : {}),
      });
      return { pdf, pageCount: countPages(pdf) };
    } finally {
      await context.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}

/**
 * Hitung jumlah halaman dari byte PDF dengan menghitung objek `/Type /Page`.
 * Cukup andal untuk PDF yang dihasilkan Chromium; dipakai untuk metrik/penagihan
 * (docs/05 `page_count`).
 */
function countPages(pdf: Buffer): number {
  const matches = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

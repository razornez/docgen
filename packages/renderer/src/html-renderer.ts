import Handlebars from 'handlebars';

/**
 * Galat saat mengisi template (sintaks Handlebars rusak / helper tak dikenal).
 * Ini kesalahan template milik klien, bukan kesalahan sistem — pemanggil
 * memetakannya ke kode HTTP yang sesuai (mis. 422).
 */
export class TemplateRenderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TemplateRenderError';
  }
}

/**
 * Mesin "polos" (docs/00): mengisi nilai dari `data` ke `body` Handlebars
 * APA ADANYA. Tidak menghitung, tidak memformat, tidak memvalidasi isi.
 *
 * Yang didukung hanyalah primitif STRUKTURAL bawaan Handlebars:
 *   - `{{var}}` / `{{obj.prop}}`  → isi nilai (HTML-escaped untuk keamanan)
 *   - `{{{var}}}`                 → isi nilai mentah (tanpa escape)
 *   - `{{#each list}}…{{/each}}`  → ulang daftar
 *   - `{{#if x}}…{{/if}}` / `{{#unless}}` / `{{#with}}` → seksi kondisional
 *   - variabel tak dikirim → dibiarkan KOSONG (mode non-strict)
 *
 * SENGAJA TIDAK ada helper format/hitung (mis. `rupiah`, `inc`, math): klien
 * mengirim nilai yang sudah jadi & terformat (docs/00). Helper tak dikenal di
 * template akan melempar TemplateRenderError.
 *
 * Fungsi ini MURNI: tidak ada I/O jaringan/berkas (selaras isolasi worker, docs/08).
 */
export function renderHtml(body: string, data: unknown): string {
  let template: Handlebars.TemplateDelegate;
  try {
    // knownHelpersOnly: tolak helper kustom — hanya built-in struktural.
    template = Handlebars.compile(body, {
      noEscape: false,
      knownHelpersOnly: true,
    });
  } catch (err) {
    throw new TemplateRenderError(
      `Template gagal dikompilasi: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  try {
    return template(data);
  } catch (err) {
    throw new TemplateRenderError(
      `Template gagal diisi: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

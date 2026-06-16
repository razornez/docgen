/**
 * Kompres gambar di sisi klien lalu ubah ke data URL base64 untuk disisipkan
 * ke template (dokumen di-render tanpa jaringan, jadi gambar harus inline).
 *
 * Strategi: resize ke dimensi maksimum, encode JPEG dengan kualitas menurun,
 * lalu turunkan dimensi bertahap sampai ukuran biner ≤ maxBytes.
 * Transparansi di-flatten ke putih (dokumen berlatar putih).
 */
export interface CompressOptions {
  /** Sisi terpanjang maksimum (px). Default 1280. */
  maxDim?: number;
  /** Target ukuran biner maksimum (byte). Default 100 KB. */
  maxBytes?: number;
}

const DEFAULT_MAX_DIM = 1280;
const DEFAULT_MAX_BYTES = 100 * 1024; // 100 KB — ideal untuk logo/foto dokumen

/** Perkiraan ukuran biner (byte) dari sebuah data URL base64. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export function dataUrlKb(dataUrl: string): number {
  return Math.round(dataUrlBytes(dataUrl) / 1024);
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error('Gagal membaca berkas'));
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Berkas bukan gambar yang valid'));
    img.src = src;
  });
}

export async function compressImageToDataUrl(
  file: File,
  opts: CompressOptions = {},
): Promise<string> {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  const img = await loadImage(await readFile(file));

  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const fit = Math.min(1, maxDim / Math.max(w, h));
  w = Math.max(1, Math.round(w * fit));
  h = Math.max(1, Math.round(h * fit));

  const encode = (width: number, height: number, quality: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak didukung');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  };

  let quality = 0.85;
  let out = encode(w, h, quality);
  while (dataUrlBytes(out) > maxBytes && quality > 0.35) {
    quality -= 0.1;
    out = encode(w, h, quality);
  }
  // Masih terlalu besar → kecilkan dimensi bertahap (sampai batas wajar).
  while (dataUrlBytes(out) > maxBytes && Math.max(w, h) > 420) {
    w = Math.round(w * 0.85);
    h = Math.round(h * 0.85);
    quality = 0.8;
    out = encode(w, h, quality);
    while (dataUrlBytes(out) > maxBytes && quality > 0.35) {
      quality -= 0.1;
      out = encode(w, h, quality);
    }
  }
  return out;
}

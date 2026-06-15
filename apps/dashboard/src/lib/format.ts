/**
 * Util pemformatan angka untuk dashboard.
 *
 * Sebelumnya tiap halaman memanggil `.toLocaleString()` sendiri-sendiri —
 * sebagian dengan locale `'id-ID'`, sebagian tanpa argumen (mengikuti locale
 * browser) — sehingga pemisah ribuan bisa berbeda antar layar. Modul ini jadi
 * satu sumber kebenaran agar angka, rupiah, dan kredit tampil konsisten.
 */

/** Locale tampilan angka di seluruh dashboard. */
const NUMBER_LOCALE = 'id-ID';

/**
 * Jadikan input angka yang aman dipakai. Nilai non-finite (NaN, Infinity) atau
 * non-number dianggap 0 supaya UI tidak pernah menampilkan "NaN".
 */
function toSafeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Format angka dengan pemisah ribuan ala Indonesia (mis. 1234567 → "1.234.567").
 * Nilai kosong / tidak valid menjadi "0".
 */
export function formatNumber(value: number | null | undefined): string {
  return toSafeNumber(value).toLocaleString(NUMBER_LOCALE);
}

/**
 * Format nominal rupiah dengan prefix "Rp " (mis. 50000 → "Rp 50.000").
 */
export function formatIdr(value: number | null | undefined): string {
  return 'Rp ' + formatNumber(value);
}

/**
 * Format jumlah kredit/saldo. Saat ini identik dengan {@link formatNumber},
 * namun dipisah sebagai fungsi tersendiri agar satuan kredit punya satu titik
 * ubah bila kelak butuh sufiks (mis. " kredit").
 */
export function formatCredits(value: number | null | undefined): string {
  return formatNumber(value);
}

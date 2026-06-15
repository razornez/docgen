/**
 * Format tanggal terpusat agar konsisten di seluruh dashboard.
 * Satu sumber kebenaran — hindari campur "9/6/2026" vs "9 Jun 2026".
 */

/** Tanggal ringkas, mis. "9 Jun 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Tanggal + jam, mis. "9 Jun 2026, 20.16". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

import type { BatchId, DocumentId, TemplateId, TenantId } from './ids.js';

/** Nama antrian BullMQ untuk job render dokumen tunggal (dipakai api & worker). */
export const RENDER_QUEUE = 'render';

/**
 * Opsi cetak PDF (docs/08). Satu sumber kebenaran dipakai bersama oleh API
 * (validasi request), worker (eksekusi), dan packages/renderer.
 */
// `| undefined` eksplisit agar kompatibel dengan output Zod `.optional()` di
// bawah exactOptionalPropertyTypes (request API → opsi render).
export interface RenderOptions {
  format?: 'A4' | 'A5' | 'Letter' | 'Legal' | undefined;
  landscape?: boolean | undefined;
  printBackground?: boolean | undefined;
  margin?:
    | {
        top?: string | undefined;
        right?: string | undefined;
        bottom?: string | undefined;
        left?: string | undefined;
      }
    | undefined;
}

/**
 * Payload job render yang dikirim API → worker lewat antrian. Worker memuat
 * body template dari DB berdasarkan (templateId, version) lalu mengisi `data`
 * (mesin polos, docs/00) dan mencetak ke `storageKey`.
 */
export interface RenderJobData {
  readonly documentId: DocumentId;
  readonly tenantId: TenantId;
  readonly templateId: TemplateId;
  readonly version: number;
  readonly data: unknown;
  readonly options: RenderOptions;
  /** Lokasi objek tujuan di storage (sudah ditentukan API, docs/10). */
  readonly storageKey: string;
  /** ID batch — diisi bila dokumen bagian dari batch (docs/06). */
  readonly batchId?: BatchId | undefined;
}

/** Hasil yang dikembalikan worker setelah render sukses. */
export interface RenderJobResult {
  readonly storageKey: string;
  readonly pageCount: number;
}

/**
 * Penamaan objek PDF per tenant (docs/10): `{tenant}/{tahun}/{bulan}/{doc}.pdf`.
 * Memudahkan isolasi antar tenant & pengelolaan masa simpan.
 */
export function buildStorageKey(
  tenantId: TenantId,
  documentId: DocumentId,
  at: Date,
): string {
  const year = at.getUTCFullYear();
  const month = String(at.getUTCMonth() + 1).padStart(2, '0');
  return `${tenantId}/${year}/${month}/${documentId}.pdf`;
}

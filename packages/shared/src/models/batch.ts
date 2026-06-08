import type { BatchId, TemplateId, TenantId } from '../ids.js';

export type BatchStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'partially_failed'
  | 'failed';

/**
 * Satu pekerjaan generate massal (tabel `batches`). Kredit dicadangkan saat
 * submit; refund untuk item gagal dilakukan setelah batch selesai (docs/03, docs/06).
 */
export interface Batch {
  id: BatchId;
  tenantId: TenantId;
  templateId: TemplateId;
  templateVersion: number;
  status: BatchStatus;
  total: number;
  completed: number;
  failed: number;
  creditsReserved: number;
  webhookUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

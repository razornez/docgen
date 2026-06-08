import type { BatchId, DocumentId, TemplateId, TenantId } from '../ids.js';

export type DocumentStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Satu dokumen yang dirender (tabel `documents`). `storageKey` menyimpan lokasi
 * objek; signed URL diterbitkan saat dibaca, tidak disimpan (docs/10). `charged`
 * menandai apakah saldo sudah dipotong. `batchId` diisi bila dokumen bagian dari
 * batch (docs/06).
 */
export interface Document {
  id: DocumentId;
  tenantId: TenantId;
  batchId: BatchId | null;
  templateId: TemplateId;
  templateVersion: number;
  status: DocumentStatus;
  inputHash: string | null;
  storageKey: string | null;
  pageCount: number | null;
  itemRef: string | null;
  charged: boolean;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

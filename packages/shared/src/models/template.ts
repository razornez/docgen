import type { TemplateId, TemplateVersionId, TenantId } from '../ids.js';

/**
 * Handle template yang stabil (tabel `templates`). `currentVersion` dipelihara
 * aplikasi (nomor versi terbaru); null sebelum ada versi pertama.
 */
export interface Template {
  id: TemplateId;
  tenantId: TenantId;
  name: string;
  category: string;
  currentVersion: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateEngine = 'html';

/**
 * Satu versi template (tabel `template_versions`) — IMMUTABLE setelah dibuat
 * (docs/21): tidak pernah di-UPDATE/DELETE. Menyimpan HTML `body` dan
 * `variableSchema` (kontrak bentuk data — disimpan sebagai DOKUMENTASI, tidak
 * dipakai memvalidasi/menolak isi karena mesin polos, docs/00).
 */
export interface TemplateVersion {
  id: TemplateVersionId;
  templateId: TemplateId;
  version: number;
  engine: TemplateEngine;
  body: string;
  variableSchema: unknown;
  createdAt: Date;
}

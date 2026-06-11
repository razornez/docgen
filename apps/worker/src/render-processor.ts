import { createHash } from 'node:crypto';
import { applyWalletCredit } from '@docgen/db';
import type { Queryable } from '@docgen/db';
import { PdfRenderer, renderHtml, TemplateRenderError } from '@docgen/renderer';
import type {
  BatchId,
  RenderJobData,
  RenderJobResult,
  StoragePort,
} from '@docgen/shared';
import { deliverWebhook } from './webhook-delivery.js';

export interface RenderProcessorDeps {
  readonly db: Queryable;
  readonly renderer: PdfRenderer;
  readonly storage: StoragePort;
}

async function loadTemplateBody(
  db: Queryable,
  templateId: string,
  version: number,
  tenantId: string,
): Promise<string | null> {
  const { rows } = await db.query<{ body: string }>(
    `SELECT tv.body
       FROM template_versions tv
       JOIN templates t ON t.id = tv.template_id
      WHERE tv.template_id = $1 AND tv.version = $2 AND t.tenant_id = $3`,
    [templateId, version, tenantId],
  );
  return rows[0]?.body ?? null;
}

async function markCompleted(
  db: Queryable,
  id: string,
  tenantId: string,
  storageKey: string,
  pageCount: number,
): Promise<void> {
  await db.query(
    `UPDATE documents
        SET status = 'completed', storage_key = $3, page_count = $4, completed_at = now()
      WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId, storageKey, pageCount],
  );
}

async function markFailed(
  db: Queryable,
  id: string,
  tenantId: string,
  error: string,
): Promise<void> {
  await db.query(
    `UPDATE documents SET status = 'failed', error = $3 WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId, error],
  );
}

/**
 * Perbarui counter batch setelah item selesai/gagal. Satu UPDATE atomik yang
 * juga menentukan status akhir batch (completed/partially_failed/failed).
 * Refund kredit untuk item gagal dilakukan di sini bila batch sudah selesai.
 */
async function updateBatchProgress(
  db: Queryable,
  batchId: BatchId,
  tenantId: string,
  succeeded: boolean,
): Promise<void> {
  const completedDelta = succeeded ? 1 : 0;
  const failedDelta = succeeded ? 0 : 1;

  const { rows } = await db.query<{
    completed: number;
    failed: number;
    total: number;
    done: boolean;
  }>(
    `UPDATE batches
        SET completed = completed + $1,
            failed    = failed    + $2,
            status    = CASE
              WHEN (completed + $1 + failed + $2) >= total THEN
                CASE
                  WHEN failed + $2 = 0     THEN 'completed'
                  WHEN completed + $1 = 0  THEN 'failed'
                  ELSE                          'partially_failed'
                END
              ELSE 'processing'
            END,
            completed_at = CASE
              WHEN (completed + $1 + failed + $2) >= total THEN now()
              ELSE NULL
            END
      WHERE id = $3 AND tenant_id = $4
        AND status NOT IN ('completed', 'failed', 'partially_failed')
      RETURNING completed, failed, total,
                ((completed + $1 + failed + $2) >= total) AS done`,
    [completedDelta, failedDelta, batchId, tenantId],
  );

  const row = rows[0];
  if (!row || !row.done) return;

  // Trigger webhook batch.* saat batch selesai.
  const webhookEvent =
    row.failed === 0
      ? 'batch.completed'
      : row.completed === 0
        ? 'batch.failed'
        : 'batch.partially_failed';

  await deliverWebhook(db, tenantId, webhookEvent, {
    batch_id: batchId,
    total: row.total,
    completed: row.completed,
    failed: row.failed,
  }).catch(() => undefined);

  if (row.failed === 0) return;

  // Batch selesai dan ada item gagal → refund kredit untuk item gagal.
  // id deterministik (worker tanpa IdGenerator); idempotensi tetap dijamin
  // UNIQUE(refund, batchId) di ledger + guard status batch terminal di atas.
  const txnId =
    'txn_' + createHash('md5').update(`${batchId}:refund`).digest('hex');
  await applyWalletCredit(db, {
    id: txnId,
    tenantId,
    type: 'refund',
    amount: row.failed,
    refType: 'document',
    refId: batchId,
  });
}

/**
 * Handler job render (mesin polos, docs/00; isolasi worker, docs/08).
 * Mendukung render tunggal dan batch. Untuk batch: memperbarui progress
 * dan melakukan refund otomatis untuk item gagal saat batch selesai.
 */
export function createRenderProcessor(
  deps: RenderProcessorDeps,
): (data: RenderJobData) => Promise<RenderJobResult> {
  return async function handle(data: RenderJobData): Promise<RenderJobResult> {
    try {
      const body = await loadTemplateBody(
        deps.db,
        data.templateId,
        data.version,
        data.tenantId,
      );
      if (body == null) {
        throw new TemplateRenderError('template/versi tidak ditemukan');
      }

      const html = renderHtml(body, data.data);
      const { pdf, pageCount } = await deps.renderer.render(html, data.options);
      await deps.storage.put(data.storageKey, pdf, 'application/pdf');
      await markCompleted(
        deps.db,
        data.documentId,
        data.tenantId,
        data.storageKey,
        pageCount,
      );

      if (data.batchId) {
        await updateBatchProgress(
          deps.db,
          data.batchId,
          data.tenantId,
          true,
        ).catch(() => undefined);
      }

      return { storageKey: data.storageKey, pageCount };
    } catch (err) {
      const message =
        err instanceof TemplateRenderError
          ? `template_render_error: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);

      await markFailed(deps.db, data.documentId, data.tenantId, message).catch(
        () => undefined,
      );

      if (data.batchId) {
        await updateBatchProgress(
          deps.db,
          data.batchId,
          data.tenantId,
          false,
        ).catch(() => undefined);
      }

      throw new Error(message);
    }
  };
}

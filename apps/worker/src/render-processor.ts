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
  readonly transaction: <T>(fn: (tx: Queryable) => Promise<T>) => Promise<T>;
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
): Promise<boolean> {
  const result = await db.query(
    `UPDATE documents
        SET status = 'completed', storage_key = $3, page_count = $4, completed_at = now()
      WHERE id = $1 AND tenant_id = $2 AND status IN ('queued', 'processing')`,
    [id, tenantId, storageKey, pageCount],
  );
  return (result.rowCount ?? 0) === 1;
}

export async function markFailed(
  db: Queryable,
  id: string,
  tenantId: string,
  error: string,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE documents SET status = 'failed', error = $3
      WHERE id = $1 AND tenant_id = $2 AND status IN ('queued', 'processing')`,
    [id, tenantId, error],
  );
  return (result.rowCount ?? 0) === 1;
}

/**
 * Perbarui counter batch setelah item selesai/gagal. Satu UPDATE atomik yang
 * juga menentukan status akhir batch (completed/partially_failed/failed).
 * Refund kredit untuk item gagal dilakukan di sini bila batch sudah selesai.
 */
export async function updateBatchProgress(
  db: Queryable,
  batchId: BatchId,
  tenantId: string,
  completedDelta: number,
  failedDelta: number,
): Promise<{
  event: string;
  data: { batch_id: BatchId; total: number; completed: number; failed: number };
} | null> {
  const { rows } = await db.query<{
    completed: number;
    failed: number;
    total: number;
    done: boolean;
    credits_reserved: string;
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
        AND completed + failed + $1 + $2 <= total
      RETURNING completed, failed, total, credits_reserved,
                (completed + failed >= total) AS done`,
    [completedDelta, failedDelta, batchId, tenantId],
  );

  const row = rows[0];
  if (!row || !row.done) return null;

  // Trigger webhook batch.* saat batch selesai.
  const webhookEvent =
    row.failed === 0
      ? 'batch.completed'
      : row.completed === 0
        ? 'batch.failed'
        : 'batch.partially_failed';

  const refundable = Math.min(row.failed, Number(row.credits_reserved));
  if (refundable > 0) {
    // This runs in the same transaction as the batch status change.
    const txnId =
      'txn_' + createHash('md5').update(`${batchId}:refund`).digest('hex');
    await applyWalletCredit(db, {
      id: txnId,
      tenantId,
      type: 'refund',
      amount: refundable,
      refType: 'document',
      refId: batchId,
    });
  }
  return {
    event: webhookEvent,
    data: {
      batch_id: batchId,
      total: row.total,
      completed: row.completed,
      failed: row.failed,
    },
  };
}

export async function notifyBatch(
  db: Queryable,
  tenantId: string,
  result: Awaited<ReturnType<typeof updateBatchProgress>>,
) {
  if (result)
    await deliverWebhook(
      db,
      tenantId,
      result.event as
        | 'batch.completed'
        | 'batch.failed'
        | 'batch.partially_failed',
      result.data,
    ).catch(() => undefined);
}

/**
 * Handler job render (mesin polos, docs/00; isolasi worker, docs/08).
 * Mendukung render tunggal dan batch. Untuk batch: memperbarui progress
 * dan melakukan refund otomatis untuk item gagal saat batch selesai.
 */
export function createRenderProcessor(
  deps: RenderProcessorDeps,
): (data: RenderJobData, finalAttempt?: boolean) => Promise<RenderJobResult> {
  return async function handle(
    data: RenderJobData,
    finalAttempt = true,
  ): Promise<RenderJobResult> {
    let pdf: Buffer;
    let pageCount: number;
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
      ({ pdf, pageCount } = await deps.renderer.render(html, data.options));
      await deps.storage.put(data.storageKey, pdf, 'application/pdf');
    } catch (err) {
      const message =
        err instanceof TemplateRenderError
          ? `template_render_error: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);

      if (finalAttempt) {
        const notification = await deps.transaction(async (tx) => {
          const failed = await markFailed(
            tx,
            data.documentId,
            data.tenantId,
            message,
          );
          return data.batchId && failed
            ? updateBatchProgress(tx, data.batchId, data.tenantId, 0, 1)
            : null;
        });
        await notifyBatch(deps.db, data.tenantId, notification);
      }

      throw new Error(message);
    }
    const notification = await deps.transaction(async (tx) => {
      const completed = await markCompleted(
        tx,
        data.documentId,
        data.tenantId,
        data.storageKey,
        pageCount,
      );
      return data.batchId && completed
        ? updateBatchProgress(tx, data.batchId, data.tenantId, 1, 0)
        : null;
    });
    await notifyBatch(deps.db, data.tenantId, notification);
    return { storageKey: data.storageKey, pageCount };
  };
}

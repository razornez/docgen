import type { Queryable } from '@docgen/db';
import type { BatchId } from '@docgen/shared';
import {
  markFailed,
  notifyBatch,
  updateBatchProgress,
} from './render-processor.js';

interface PendingDocument {
  id: string;
  batch_id: BatchId;
  tenant_id: string;
}

interface IncompleteBatch {
  id: BatchId;
  tenant_id: string;
}

export interface BatchReconcilerDeps {
  db: Queryable;
  transaction: <T>(fn: (tx: Queryable) => Promise<T>) => Promise<T>;
  hasJob: (documentId: string) => Promise<boolean>;
}

/**
 * A crash between reserving credits and queueing jobs can leave a batch open.
 * Never regenerate unknown input. After ten minutes, missing jobs are failed
 * and refunded, while jobs still present in BullMQ are left untouched.
 * Historical batches older than a day require manual audit before mutation.
 */
export async function reconcileAbandonedBatches(
  deps: BatchReconcilerDeps,
): Promise<void> {
  const pending = await deps.db.query<PendingDocument>(
    `SELECT d.id, d.batch_id, d.tenant_id
       FROM documents d JOIN batches b ON b.id = d.batch_id
      WHERE d.status IN ('queued', 'processing')
        AND b.status NOT IN ('completed', 'failed', 'partially_failed')
        AND b.created_at < now() - interval '10 minutes'
        AND b.created_at >= now() - interval '24 hours'
      ORDER BY d.created_at ASC LIMIT 100`,
  );
  for (const document of pending.rows) {
    if (await deps.hasJob(document.id)) continue;
    const notice = await deps.transaction(async (tx) => {
      const failed = await markFailed(
        tx,
        document.id,
        document.tenant_id,
        'render_job_missing_after_enqueue',
      );
      return failed
        ? updateBatchProgress(tx, document.batch_id, document.tenant_id, 0, 1)
        : null;
    });
    await notifyBatch(deps.db, document.tenant_id, notice);
  }

  const batches = await deps.db.query<IncompleteBatch>(
    `SELECT id, tenant_id FROM batches
      WHERE status NOT IN ('completed', 'failed', 'partially_failed')
        AND created_at < now() - interval '10 minutes'
        AND created_at >= now() - interval '24 hours'
      ORDER BY created_at ASC LIMIT 100`,
  );
  for (const batch of batches.rows) {
    const notice = await deps.transaction(async (tx) => {
      const locked = await tx.query<{
        total: number;
        failed: number;
        document_count: string;
        failed_documents: string;
      }>(
        `SELECT b.total, b.failed,
                (SELECT count(*) FROM documents d WHERE d.batch_id = b.id) AS document_count,
                (SELECT count(*) FROM documents d WHERE d.batch_id = b.id AND d.status = 'failed') AS failed_documents
           FROM batches b WHERE b.id = $1 AND b.tenant_id = $2
             AND b.status NOT IN ('completed', 'failed', 'partially_failed') FOR UPDATE`,
        [batch.id, batch.tenant_id],
      );
      const row = locked.rows[0];
      if (!row) return null;
      const alreadyCountedMissing =
        Number(row.failed) - Number(row.failed_documents);
      const missing = Math.max(
        0,
        Number(row.total) - Number(row.document_count) - alreadyCountedMissing,
      );
      return missing > 0
        ? updateBatchProgress(tx, batch.id, batch.tenant_id, 0, missing)
        : null;
    });
    await notifyBatch(deps.db, batch.tenant_id, notice);
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyWalletCredit } from '@docgen/db';
import type { Queryable } from '@docgen/db';

vi.mock('@docgen/db', () => ({
  applyWalletCredit: vi.fn(async () => undefined),
}));
vi.mock('../src/webhook-delivery.js', () => ({
  deliverWebhook: vi.fn(async () => undefined),
}));

import { reconcileAbandonedBatches } from '../src/reconcile-batches.js';

describe('interrupted batch submission', () => {
  beforeEach(() => vi.mocked(applyWalletCredit).mockClear());

  it('fails a missing job and an uncreated item, then refunds live credits once', async () => {
    let failed = 0;
    let documentFailed = false;
    const db = {
      query: vi.fn(async (sql: string) => {
        if (sql.startsWith('SELECT d.id'))
          return {
            rows: [{ id: 'doc_1', batch_id: 'batch_1', tenant_id: 'tenant_1' }],
          };
        if (sql.startsWith('SELECT id, tenant_id FROM batches'))
          return { rows: [{ id: 'batch_1', tenant_id: 'tenant_1' }] };
        if (sql.includes("SET status = 'failed'")) {
          if (documentFailed) return { rows: [], rowCount: 0 };
          documentFailed = true;
          return { rows: [], rowCount: 1 };
        }
        if (sql.includes('UPDATE batches')) {
          failed += 1;
          return {
            rows: [
              {
                total: 2,
                completed: 0,
                failed,
                done: failed === 2,
                credits_reserved: '2',
              },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes('FOR UPDATE'))
          return {
            rows: [
              {
                total: 2,
                failed,
                document_count: '1',
                failed_documents: documentFailed ? '1' : '0',
              },
            ],
          };
        return { rows: [] };
      }),
    } as unknown as Queryable;
    await reconcileAbandonedBatches({
      db,
      transaction: async <T>(fn: (tx: Queryable) => Promise<T>) => fn(db),
      hasJob: async () => false,
    });
    expect(failed).toBe(2);
    expect(applyWalletCredit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(applyWalletCredit).mock.calls[0]?.[1].amount).toBe(2);
  });

  it('leaves a pending document alone when BullMQ still has its job', async () => {
    const db = {
      query: vi.fn(async (sql: string) =>
        sql.startsWith('SELECT d.id')
          ? {
              rows: [
                { id: 'doc_1', batch_id: 'batch_1', tenant_id: 'tenant_1' },
              ],
            }
          : { rows: [] },
      ),
    } as unknown as Queryable;
    await reconcileAbandonedBatches({
      db,
      transaction: async <T>(fn: (tx: Queryable) => Promise<T>) => fn(db),
      hasJob: async () => true,
    });
    expect(
      vi
        .mocked(db.query)
        .mock.calls.some(([sql]) => String(sql).includes('UPDATE documents')),
    ).toBe(false);
  });
});

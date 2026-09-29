import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyWalletCredit } from '@docgen/db';
import type { Queryable } from '@docgen/db';
import type { PdfRenderer } from '@docgen/renderer';
import type { RenderJobData, StoragePort } from '@docgen/shared';

vi.mock('@docgen/db', () => ({
  applyWalletCredit: vi.fn(async () => undefined),
}));
vi.mock('../src/webhook-delivery.js', () => ({
  deliverWebhook: vi.fn(async () => undefined),
}));

import { createRenderProcessor } from '../src/render-processor.js';

const job = {
  documentId: 'doc_test',
  tenantId: 'tenant_test',
  templateId: 'tpl_test',
  version: 1,
  data: {},
  options: {},
  storageKey: 'test.pdf',
  batchId: 'batch_test',
} as RenderJobData;

function fixture(failures: number, reservedCredits = 1) {
  let documentStatus = 'processing';
  let completed = 0;
  let failed = 0;
  let renderCalls = 0;
  const db = {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('SELECT tv.body'))
        return { rows: [{ body: '<h1>Test</h1>' }], rowCount: 1 };
      if (sql.includes("SET status = 'completed'")) {
        if (documentStatus !== 'processing') return { rows: [], rowCount: 0 };
        documentStatus = 'completed';
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("SET status = 'failed'")) {
        if (documentStatus !== 'processing') return { rows: [], rowCount: 0 };
        documentStatus = 'failed';
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('UPDATE batches')) {
        if (documentStatus === 'completed') completed += 1;
        else failed += 1;
        return {
          rows: [
            {
              completed,
              failed,
              total: 1,
              done: true,
              credits_reserved: String(reservedCredits),
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    }),
  } as unknown as Queryable;
  const renderer = {
    render: vi.fn(async () => {
      renderCalls += 1;
      if (renderCalls <= failures)
        throw new Error('temporary Chromium failure');
      return { pdf: Buffer.from('%PDF-test'), pageCount: 1 };
    }),
  } as unknown as PdfRenderer;
  const storage = {
    put: vi.fn(async () => undefined),
  } as unknown as StoragePort;
  const transaction = async <T>(fn: (tx: Queryable) => Promise<T>) => fn(db);
  return {
    handle: createRenderProcessor({ db, transaction, renderer, storage }),
    state: () => ({ documentStatus, completed, failed }),
  };
}

describe('batch render retries', () => {
  beforeEach(() => vi.mocked(applyWalletCredit).mockClear());
  it('does not finalize or refund an intermediate failure; success counts once', async () => {
    const f = fixture(1);
    await expect(f.handle(job, false)).rejects.toThrow(
      'temporary Chromium failure',
    );
    expect(f.state()).toEqual({
      documentStatus: 'processing',
      completed: 0,
      failed: 0,
    });
    await f.handle(job, true);
    expect(f.state()).toEqual({
      documentStatus: 'completed',
      completed: 1,
      failed: 0,
    });
    await f.handle(job, true);
    expect(f.state().completed).toBe(1);
  });

  it('marks failure only on the final attempt', async () => {
    const f = fixture(3);
    await expect(f.handle(job, false)).rejects.toThrow();
    await expect(f.handle(job, false)).rejects.toThrow();
    expect(f.state().failed).toBe(0);
    await expect(f.handle(job, true)).rejects.toThrow();
    expect(f.state()).toEqual({
      documentStatus: 'failed',
      completed: 0,
      failed: 1,
    });
    expect(applyWalletCredit).toHaveBeenCalledTimes(1);
    await f.handle(job, true);
    expect(applyWalletCredit).toHaveBeenCalledTimes(1);
  });

  it('does not award refund credits for a free test-mode batch', async () => {
    const f = fixture(1, 0);
    await expect(f.handle(job, true)).rejects.toThrow();
    expect(f.state().failed).toBe(1);
    expect(applyWalletCredit).not.toHaveBeenCalled();
  });
});

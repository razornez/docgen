import {
  withTransaction,
  applyWalletCredit,
  reserveWalletCredits,
} from '@docgen/db';
import { Errors, ID_PREFIXES } from '@docgen/shared';
import type {
  BatchId,
  DocumentId,
  IdGenerator,
  TenantId,
} from '@docgen/shared';

/**
 * Antarmuka kredit untuk RenderService — dipisah agar testable tanpa DB.
 * reserve() melempar 402 bila saldo kurang. refund() mengembalikan kredit
 * bila render gagal. markCharged() menandai dokumen sudah ditagih (docs/03).
 */
export interface CreditGate {
  reserve(tenantId: TenantId, documentId: DocumentId): Promise<number>;
  refund(tenantId: TenantId, documentId: DocumentId): Promise<void>;
  markCharged(tenantId: TenantId, documentId: DocumentId): Promise<void>;
}

const UNIT_PRICE = 1; // 1 kredit per dokumen (docs/03 — Unit Billing)

/**
 * Implementasi sistem kredit prepaid (docs/03). Semua perubahan saldo terjadi
 * dalam satu transaksi DB bersama baris ledger — tidak ada perubahan saldo
 * tanpa catatan ledger (prinsip inti docs/03).
 */
export class WalletService implements CreditGate {
  constructor(private readonly idGen: IdGenerator) {}

  /**
   * Cadangan kredit atomik untuk satu dokumen. UPDATE saldo dengan guard
   * `balance >= amount` — bila 0 baris berubah maka saldo kurang → 402.
   * Mengembalikan saldo sesudah reserve.
   */
  async reserve(tenantId: TenantId, documentId: DocumentId): Promise<number> {
    return withTransaction(async (tx) => {
      const reserved = await reserveWalletCredits(tx, {
        id: this.idGen.generate(ID_PREFIXES.transaction),
        tenantId,
        type: 'debit',
        amount: UNIT_PRICE,
        refType: 'document',
        refId: documentId,
        unitPrice: UNIT_PRICE,
      });
      if (!reserved) throw Errors.insufficientCredit();
      return reserved.balanceAfter;
    });
  }

  /** Kembalikan kredit yang sudah dicadangkan bila render gagal. */
  async refund(tenantId: TenantId, documentId: DocumentId): Promise<void> {
    await withTransaction((tx) =>
      applyWalletCredit(tx, {
        id: this.idGen.generate(ID_PREFIXES.transaction),
        tenantId,
        type: 'refund',
        amount: UNIT_PRICE,
        refType: 'document',
        refId: documentId,
        unitPrice: UNIT_PRICE,
      }),
    );
  }

  /** Tandai dokumen sebagai sudah ditagih (commit billing — docs/03). */
  async markCharged(tenantId: TenantId, documentId: DocumentId): Promise<void> {
    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE documents SET charged = TRUE
          WHERE id = $1 AND tenant_id = $2 AND charged = FALSE`,
        [documentId, tenantId],
      );
    });
  }

  /**
   * Cadangkan `amount` kredit untuk satu batch sekaligus. Idempoten via
   * UNIQUE(debit, batchId). Mengembalikan saldo sesudah reserve.
   */
  async reserveBatch(
    tenantId: TenantId,
    batchId: BatchId,
    amount: number,
  ): Promise<number> {
    return withTransaction(async (tx) => {
      const reserved = await reserveWalletCredits(tx, {
        id: this.idGen.generate(ID_PREFIXES.transaction),
        tenantId,
        type: 'debit',
        amount,
        refType: 'document',
        refId: batchId,
        unitPrice: UNIT_PRICE,
      });
      if (!reserved) throw Errors.insufficientCredit();
      return reserved.balanceAfter;
    });
  }

  /**
   * Kembalikan `failedCount` kredit setelah batch selesai dengan sebagian gagal.
   * Idempoten via UNIQUE(refund, batchId).
   */
  async refundBatch(
    tenantId: TenantId,
    batchId: BatchId,
    failedCount: number,
  ): Promise<void> {
    if (failedCount <= 0) return;
    await withTransaction((tx) =>
      applyWalletCredit(tx, {
        id: this.idGen.generate(ID_PREFIXES.transaction),
        tenantId,
        type: 'refund',
        amount: failedCount,
        refType: 'document',
        refId: batchId,
        unitPrice: UNIT_PRICE,
      }),
    );
  }
}

import { withTransaction } from '@docgen/db';
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
      const upd = await tx.query<{ balance: string }>(
        `UPDATE wallets
            SET balance = balance - $1
          WHERE tenant_id = $2 AND balance >= $1
          RETURNING balance`,
        [UNIT_PRICE, tenantId],
      );

      if ((upd.rowCount ?? 0) === 0) {
        throw Errors.insufficientCredit();
      }

      const balanceAfter = Number(upd.rows[0]!.balance);
      const txnId = this.idGen.generate(ID_PREFIXES.transaction);

      await tx.query(
        `INSERT INTO wallet_transactions
           (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata)
         VALUES ($1, $2, 'debit', $3, $4, 'document', $5, $6, '{}')
         ON CONFLICT (type, ref_id) DO NOTHING`,
        [txnId, tenantId, -UNIT_PRICE, balanceAfter, documentId, UNIT_PRICE],
      );

      return balanceAfter;
    });
  }

  /** Kembalikan kredit yang sudah dicadangkan bila render gagal. */
  async refund(tenantId: TenantId, documentId: DocumentId): Promise<void> {
    await withTransaction(async (tx) => {
      const upd = await tx.query<{ balance: string }>(
        `UPDATE wallets SET balance = balance + $1 WHERE tenant_id = $2
         RETURNING balance`,
        [UNIT_PRICE, tenantId],
      );
      const balanceAfter = Number(upd.rows[0]!.balance);
      const txnId = this.idGen.generate(ID_PREFIXES.transaction);

      await tx.query(
        `INSERT INTO wallet_transactions
           (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata)
         VALUES ($1, $2, 'refund', $3, $4, 'document', $5, $6, '{}')
         ON CONFLICT (type, ref_id) DO NOTHING`,
        [txnId, tenantId, UNIT_PRICE, balanceAfter, documentId, UNIT_PRICE],
      );
    });
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
      const upd = await tx.query<{ balance: string }>(
        `UPDATE wallets
            SET balance = balance - $1
          WHERE tenant_id = $2 AND balance >= $1
          RETURNING balance`,
        [amount, tenantId],
      );
      if ((upd.rowCount ?? 0) === 0) throw Errors.insufficientCredit();

      const balanceAfter = Number(upd.rows[0]!.balance);
      const txnId = this.idGen.generate(ID_PREFIXES.transaction);

      await tx.query(
        `INSERT INTO wallet_transactions
           (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata)
         VALUES ($1, $2, 'debit', $3, $4, 'document', $5, $6, '{}')
         ON CONFLICT (type, ref_id) DO NOTHING`,
        [txnId, tenantId, -amount, balanceAfter, batchId, UNIT_PRICE],
      );

      return balanceAfter;
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
    await withTransaction(async (tx) => {
      const upd = await tx.query<{ balance: string }>(
        `UPDATE wallets SET balance = balance + $1 WHERE tenant_id = $2 RETURNING balance`,
        [failedCount, tenantId],
      );
      const balanceAfter = Number(upd.rows[0]!.balance);
      const txnId = this.idGen.generate(ID_PREFIXES.transaction);

      await tx.query(
        `INSERT INTO wallet_transactions
           (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata)
         VALUES ($1, $2, 'refund', $3, $4, 'document', $5, $6, '{}')
         ON CONFLICT (type, ref_id) DO NOTHING`,
        [txnId, tenantId, failedCount, balanceAfter, batchId, UNIT_PRICE],
      );
    });
  }
}

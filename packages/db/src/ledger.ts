/**
 * Primitif ledger dompet terpusat (docs/03 — "tidak ada perubahan saldo tanpa
 * catatan ledger"). Satu sumber kebenaran untuk pola "UPDATE wallets + INSERT
 * wallet_transactions" yang dulu tersebar di wallet.service, payment.service,
 * dan worker. SQL-nya identik dengan versi lama — ini konsolidasi (DRY), bukan
 * perubahan perilaku.
 *
 * Idempotensi ditegakkan oleh UNIQUE(type, ref_id) pada ledger ditambah guard
 * di pemanggil (status payment 'pending', status batch terminal, dst).
 * Selalu panggil di dalam transaksi (withTransaction) agar atomik.
 */
import type { Queryable } from './pool.js';

export type LedgerType =
  | 'signup_bonus'
  | 'topup'
  | 'debit'
  | 'refund'
  | 'adjustment';

export type LedgerRefType = 'document' | 'payment' | 'signup' | 'manual';

export interface LedgerEntry {
  /** id transaksi (txn_...), dibuat pemanggil via IdGenerator atau deterministik. */
  readonly id: string;
  readonly tenantId: string;
  readonly type: LedgerType;
  /** Jumlah kredit yang dipindahkan (selalu POSITIF). Tanda diatur per operasi. */
  readonly amount: number;
  readonly refType: LedgerRefType;
  readonly refId: string;
  readonly unitPrice?: number;
}

async function insertLedger(
  db: Queryable,
  entry: LedgerEntry,
  signedAmount: number,
  balanceAfter: number,
): Promise<void> {
  await db.query(
    `INSERT INTO wallet_transactions
       (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '{}')
     ON CONFLICT (type, ref_id) DO NOTHING`,
    [
      entry.id,
      entry.tenantId,
      entry.type,
      signedAmount,
      balanceAfter,
      entry.refType,
      entry.refId,
      entry.unitPrice ?? 1,
    ],
  );
}

/**
 * Tambah kredit ke saldo (topup/refund) lalu catat ledger. `amount` positif
 * menambah saldo. Mengembalikan saldo sesudahnya.
 */
export async function applyWalletCredit(
  db: Queryable,
  entry: LedgerEntry,
): Promise<{ balanceAfter: number }> {
  const upd = await db.query<{ balance: string }>(
    `UPDATE wallets SET balance = balance + $1 WHERE tenant_id = $2 RETURNING balance`,
    [entry.amount, entry.tenantId],
  );
  const balanceAfter = Number(upd.rows[0]!.balance);
  await insertLedger(db, entry, entry.amount, balanceAfter);
  return { balanceAfter };
}

/**
 * Cadangkan (debit) kredit dengan guard saldo cukup. `amount` positif = jumlah
 * yang dikurangi; ledger dicatat bertanda negatif (tipe 'debit'). Mengembalikan
 * null bila saldo tidak cukup (0 baris ter-update) — pemanggil memutuskan 402.
 */
export async function reserveWalletCredits(
  db: Queryable,
  entry: LedgerEntry,
): Promise<{ balanceAfter: number } | null> {
  const upd = await db.query<{ balance: string }>(
    `UPDATE wallets
        SET balance = balance - $1
      WHERE tenant_id = $2 AND balance >= $1
      RETURNING balance`,
    [entry.amount, entry.tenantId],
  );
  if ((upd.rowCount ?? 0) === 0) return null;
  const balanceAfter = Number(upd.rows[0]!.balance);
  await insertLedger(db, entry, -entry.amount, balanceAfter);
  return { balanceAfter };
}

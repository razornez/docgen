import type { TenantId, Wallet } from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface WalletRepository {
  /** Membuat dompet saldo 0 TANPA transaksi ledger (Tahap 2). */
  create(tenantId: TenantId): Promise<Wallet>;
  findByTenant(tenantId: TenantId): Promise<Wallet | null>;
  /**
   * Memberikan bonus kredit secara atomik: INSERT ledger lalu UPDATE saldo.
   * Idempoten — pemanggilan ulang dengan tenantId yang sama diabaikan
   * (UNIQUE signup_bonus + tenantId). Dipanggil di dalam transaksi UoW
   * (this.db sudah berupa PoolClient) sehingga tidak membungkus transaksi baru.
   */
  grantBonus(tenantId: TenantId, amount: number, txnId: string): Promise<void>;
}

interface WalletRow {
  tenant_id: string;
  balance: string; // BIGINT dikembalikan pg sebagai string
  currency: string;
  updated_at: Date;
}

function toWallet(row: WalletRow): Wallet {
  return {
    tenantId: row.tenant_id as TenantId,
    balance: Number(row.balance),
    currency: row.currency,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = 'tenant_id, balance, currency, updated_at';

export class PgWalletRepository implements WalletRepository {
  constructor(private readonly db: Queryable) {}

  async create(tenantId: TenantId): Promise<Wallet> {
    const { rows } = await this.db.query<WalletRow>(
      `INSERT INTO wallets (tenant_id, balance) VALUES ($1, 0)
       RETURNING ${COLUMNS}`,
      [tenantId],
    );
    return toWallet(rows[0]!);
  }

  async findByTenant(tenantId: TenantId): Promise<Wallet | null> {
    const { rows } = await this.db.query<WalletRow>(
      `SELECT ${COLUMNS} FROM wallets WHERE tenant_id = $1`,
      [tenantId],
    );
    const row = rows[0];
    return row ? toWallet(row) : null;
  }

  async grantBonus(
    tenantId: TenantId,
    amount: number,
    txnId: string,
  ): Promise<void> {
    // INSERT ledger first — ON CONFLICT is the idempotency guard (docs/03).
    // If the row already exists (duplicate bonus attempt), rowCount = 0 → skip.
    const ins = await this.db.query(
      `INSERT INTO wallet_transactions
         (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata)
       VALUES ($1, $2, 'signup_bonus', $3, 0, 'signup', $2, 1, '{}')
       ON CONFLICT (type, ref_id) DO NOTHING`,
      [txnId, tenantId, amount],
    );
    if ((ins.rowCount ?? 0) === 0) return; // already granted

    // Update wallet balance and capture new total.
    const upd = await this.db.query<{ balance: string }>(
      `UPDATE wallets SET balance = balance + $1 WHERE tenant_id = $2
       RETURNING balance`,
      [amount, tenantId],
    );
    const balanceAfter = Number(upd.rows[0]!.balance);

    // Backfill balance_after now that we know the real value.
    await this.db.query(
      `UPDATE wallet_transactions SET balance_after = $1 WHERE id = $2`,
      [balanceAfter, txnId],
    );
  }
}

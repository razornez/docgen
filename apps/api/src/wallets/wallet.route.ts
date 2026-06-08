import type {
  TransactionId,
  TenantId,
  WalletTransaction,
} from '@docgen/shared';
import type { Queryable } from '@docgen/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import type { WalletRepository } from './wallet.repository.js';

const CursorQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

interface TxRow {
  id: string;
  tenant_id: string;
  type: string;
  amount: string;
  balance_after: string;
  ref_type: string;
  ref_id: string;
  unit_price: number;
  metadata: Record<string, unknown>;
  created_at: Date;
}

function toTx(row: TxRow): WalletTransaction {
  return {
    id: row.id as TransactionId,
    tenantId: row.tenant_id as TenantId,
    type: row.type as WalletTransaction['type'],
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    refType: row.ref_type as WalletTransaction['refType'],
    refId: row.ref_id,
    unitPrice: row.unit_price,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function presentTx(tx: WalletTransaction) {
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    balance_after: tx.balanceAfter,
    ref_type: tx.refType,
    ref_id: tx.refId,
    created_at: tx.createdAt.toISOString(),
  };
}

/**
 * Rute dompet terproteksi (docs/03 — Endpoint Dompet).
 * - GET /v1/wallet         → saldo saat ini
 * - GET /v1/wallet/transactions → riwayat ledger (cursor pagination, terbaru dulu)
 */
export function registerWalletRoutes(
  app: FastifyInstance,
  walletRepo: WalletRepository,
  db: Queryable,
): void {
  app.get('/wallet', async (request) => {
    const ctx = requireAuth(request);
    const wallet = await walletRepo.findByTenant(ctx.tenantId);
    if (!wallet) {
      return { balance: 0, currency: 'credit' };
    }
    return { balance: wallet.balance, currency: wallet.currency };
  });

  app.get('/wallet/transactions', async (request) => {
    const ctx = requireAuth(request);
    const { cursor, limit } = CursorQuery.parse(request.query);

    const params: unknown[] = [ctx.tenantId, limit + 1];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor);
      cursorClause = `AND wt.created_at < (SELECT created_at FROM wallet_transactions WHERE id = $${params.length})`;
    }

    const { rows } = await db.query<TxRow>(
      `SELECT id, tenant_id, type, amount, balance_after, ref_type, ref_id,
              unit_price, metadata, created_at
         FROM wallet_transactions wt
        WHERE tenant_id = $1
          ${cursorClause}
        ORDER BY created_at DESC
        LIMIT $2`,
      params,
    );

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).map(toTx).map(presentTx);
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { data, has_more: hasMore, next_cursor: nextCursor ?? null };
  });
}

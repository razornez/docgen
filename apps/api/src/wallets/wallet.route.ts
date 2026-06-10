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
  type: string;
  amount: string;
  balance_after: string;
  ref_type: string;
  ref_id: string;
  created_at: Date;
  // join payments (untuk topup)
  pay_gateway: string | null;
  pay_amount_idr: string | null;
  pay_ref: string | null;
  pay_method: string | null;
  // join documents (untuk debit dokumen tunggal)
  doc_ref: string | null;
  doc_batch_id: string | null;
  // join batches (untuk debit/refund batch)
  batch_total: number | null;
  // nama template (dari documents atau batches)
  template_name: string | null;
}

/** Bangun objek detail yang manusiawi sesuai jenis transaksi. */
function buildDetail(row: TxRow): Record<string, unknown> {
  const detail: Record<string, unknown> = {};
  if (row.type === 'topup') {
    if (row.pay_gateway) detail['gateway'] = row.pay_gateway;
    if (row.pay_amount_idr != null)
      detail['amount_idr'] = Number(row.pay_amount_idr);
    if (row.pay_ref) detail['payment_ref'] = row.pay_ref;
    if (row.pay_method) detail['method'] = row.pay_method;
  } else if (row.ref_type === 'document') {
    if (row.template_name) detail['template_name'] = row.template_name;
    if (row.doc_ref) detail['item_ref'] = row.doc_ref;
    if (row.batch_total != null) detail['batch_total'] = row.batch_total;
    // ref_id menunjuk ke document atau batch
    detail[
      row.doc_batch_id !== null || row.batch_total != null
        ? 'batch_id'
        : 'document_id'
    ] = row.ref_id;
  }
  return detail;
}

function presentTx(row: TxRow) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    balance_after: Number(row.balance_after),
    ref_type: row.ref_type,
    ref_id: row.ref_id,
    created_at: row.created_at.toISOString(),
    detail: buildDetail(row),
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
      `SELECT wt.id, wt.type, wt.amount, wt.balance_after, wt.ref_type, wt.ref_id,
              wt.created_at,
              p.gateway       AS pay_gateway,
              p.amount_idr    AS pay_amount_idr,
              p.gateway_ref   AS pay_ref,
              p.method        AS pay_method,
              d.item_ref      AS doc_ref,
              d.batch_id      AS doc_batch_id,
              b.total         AS batch_total,
              t.name          AS template_name
         FROM wallet_transactions wt
         LEFT JOIN payments  p ON wt.ref_type = 'payment'  AND p.id = wt.ref_id
         LEFT JOIN documents d ON wt.ref_type = 'document' AND d.id = wt.ref_id
         LEFT JOIN batches   b ON wt.ref_type = 'document' AND b.id = wt.ref_id
         LEFT JOIN templates t ON t.id = COALESCE(d.template_id, b.template_id)
        WHERE wt.tenant_id = $1
          ${cursorClause}
        ORDER BY wt.created_at DESC
        LIMIT $2`,
      params,
    );

    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).map(presentTx);
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { data, has_more: hasMore, next_cursor: nextCursor ?? null };
  });
}

import type { TenantId, TransactionId } from '../ids.js';

export type WalletTransactionType =
  | 'signup_bonus'
  | 'topup'
  | 'debit'
  | 'refund'
  | 'adjustment';

export type WalletTransactionRefType =
  | 'document'
  | 'payment'
  | 'signup'
  | 'manual';

/**
 * Satu baris ledger append-only (`wallet_transactions`). Sumber kebenaran saldo
 * (docs/03). Tabel ini hanya di-INSERT, tidak pernah di-UPDATE/DELETE.
 */
export interface WalletTransaction {
  id: TransactionId;
  tenantId: TenantId;
  type: WalletTransactionType;
  /** Bertanda: positif untuk kredit masuk, negatif untuk debit. */
  amount: number;
  balanceAfter: number;
  refType: WalletTransactionRefType;
  refId: string;
  unitPrice: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

import type { TenantId } from '../ids.js';

/**
 * Dompet kredit (tabel `wallets`). `balance` adalah cache cepat; sumber
 * kebenaran ada di `wallet_transactions` (ledger, Tahap 5). Di Tahap 2 dompet
 * dibuat dengan saldo 0 TANPA transaksi ledger.
 */
export interface Wallet {
  tenantId: TenantId;
  /** Saldo kredit. BIGINT di DB; jumlah kredit aman di Number (< 2^53). */
  balance: number;
  currency: string;
  updatedAt: Date;
}

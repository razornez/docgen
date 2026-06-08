import { Errors } from '@docgen/shared';
import type { Tenant, TenantId, Wallet } from '@docgen/shared';
import type { WalletRepository } from '../wallets/wallet.repository.js';
import type { TenantRepository } from './tenant.repository.js';

export interface Account {
  readonly tenant: Tenant;
  readonly wallet: Wallet;
}

/**
 * Membaca ringkasan akun untuk tenant terautentikasi (GET /v1/me).
 * Selalu disaring berdasarkan `tenantId` dari context request (isolasi, docs/13).
 */
export class AccountService {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly wallets: WalletRepository,
  ) {}

  async getAccount(tenantId: TenantId): Promise<Account> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw Errors.notFound('Tenant not found');

    const wallet = await this.wallets.findByTenant(tenantId);
    if (!wallet) throw Errors.notFound('Wallet not found');

    return { tenant, wallet };
  }
}

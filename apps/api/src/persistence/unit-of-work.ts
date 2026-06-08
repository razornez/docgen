import { withTransaction } from '@docgen/db';
import type { Queryable } from '@docgen/db';
import {
  PgTenantRepository,
  type TenantRepository,
} from '../tenants/tenant.repository.js';
import {
  PgUserRepository,
  type UserRepository,
} from '../users/user.repository.js';
import {
  PgWalletRepository,
  type WalletRepository,
} from '../wallets/wallet.repository.js';
import {
  PgApiKeyRepository,
  type ApiKeyRepository,
} from '../api-keys/api-key.repository.js';

/** Kumpulan repository yang terikat ke SATU transaksi (registrasi atomik). */
export interface RegistrationRepositories {
  readonly tenants: TenantRepository;
  readonly users: UserRepository;
  readonly wallets: WalletRepository;
  readonly apiKeys: ApiKeyRepository;
}

/**
 * Port "unit of work": menjalankan `fn` dengan repository yang terikat ke satu
 * transaksi DB. Diabstraksikan agar registrasi mudah diuji (fake in-memory)
 * tanpa DB (docs/21 — Ports & Adapters / testability).
 */
export interface RegistrationUnitOfWork {
  transaction<T>(
    fn: (repos: RegistrationRepositories) => Promise<T>,
  ): Promise<T>;
}

function buildRepos(db: Queryable): RegistrationRepositories {
  return {
    tenants: new PgTenantRepository(db),
    users: new PgUserRepository(db),
    wallets: new PgWalletRepository(db),
    apiKeys: new PgApiKeyRepository(db),
  };
}

/** Implementasi nyata: membungkus `withTransaction` (BEGIN/COMMIT/ROLLBACK). */
export class PgRegistrationUnitOfWork implements RegistrationUnitOfWork {
  transaction<T>(
    fn: (repos: RegistrationRepositories) => Promise<T>,
  ): Promise<T> {
    return withTransaction((client) => fn(buildRepos(client)));
  }
}

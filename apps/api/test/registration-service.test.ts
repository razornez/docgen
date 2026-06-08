import { PrefixedIdGenerator } from '@docgen/shared';
import type { Tenant, TenantId, User, Wallet } from '@docgen/shared';
import { describe, expect, it } from 'vitest';
import { ApiKeyHasher } from '../src/auth/api-key-hasher.js';
import type {
  RegistrationRepositories,
  RegistrationUnitOfWork,
} from '../src/persistence/unit-of-work.js';
import { RegistrationService } from '../src/registration/registration.service.js';
import type {
  CreateTenantInput,
  TenantRepository,
} from '../src/tenants/tenant.repository.js';
import type {
  CreateUserInput,
  UserRepository,
} from '../src/users/user.repository.js';
import type { WalletRepository } from '../src/wallets/wallet.repository.js';
import { FakeApiKeyRepository } from './fakes.js';

const EPOCH = new Date('2026-01-01T00:00:00.000Z');

class FakeTenantRepo implements TenantRepository {
  public readonly created: Tenant[] = [];
  async create(input: CreateTenantInput): Promise<Tenant> {
    const tenant: Tenant = {
      id: input.id,
      name: input.name,
      status: 'active',
      kycStatus: 'none',
      country: input.country,
      defaultLocale: input.defaultLocale,
      createdAt: EPOCH,
      updatedAt: EPOCH,
    };
    this.created.push(tenant);
    return tenant;
  }
  async findById(id: TenantId): Promise<Tenant | null> {
    return this.created.find((t) => t.id === id) ?? null;
  }
}

class FakeUserRepo implements UserRepository {
  public readonly created: User[] = [];
  async create(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: input.id,
      tenantId: input.tenantId,
      email: input.email,
      emailVerifiedAt: null,
      locale: null,
      createdAt: EPOCH,
      updatedAt: EPOCH,
    };
    this.created.push(user);
    return user;
  }
}

class FakeWalletRepo implements WalletRepository {
  public readonly created: Wallet[] = [];
  async create(tenantId: TenantId): Promise<Wallet> {
    const wallet: Wallet = {
      tenantId,
      balance: 0,
      currency: 'credit',
      updatedAt: EPOCH,
    };
    this.created.push(wallet);
    return wallet;
  }
  async findByTenant(tenantId: TenantId): Promise<Wallet | null> {
    return this.created.find((w) => w.tenantId === tenantId) ?? null;
  }
  async grantBonus(tenantId: TenantId, amount: number): Promise<void> {
    const wallet = this.created.find((w) => w.tenantId === tenantId);
    if (wallet) wallet.balance += amount;
  }
}

class FakeUnitOfWork implements RegistrationUnitOfWork {
  readonly tenants = new FakeTenantRepo();
  readonly users = new FakeUserRepo();
  readonly wallets = new FakeWalletRepo();
  readonly apiKeys = new FakeApiKeyRepository();
  transaction<T>(
    fn: (repos: RegistrationRepositories) => Promise<T>,
  ): Promise<T> {
    return fn({
      tenants: this.tenants,
      users: this.users,
      wallets: this.wallets,
      apiKeys: this.apiKeys,
    });
  }
}

function setup() {
  const uow = new FakeUnitOfWork();
  const service = new RegistrationService(
    uow,
    new PrefixedIdGenerator(),
    new ApiKeyHasher('pepper'),
  );
  return { uow, service };
}

describe('RegistrationService', () => {
  it('membuat tenant + user + wallet + key; bonus 100 kredit diberikan', async () => {
    const { uow, service } = setup();
    const res = await service.register({
      name: 'Acme',
      email: 'a@acme.com',
      country: 'US',
      keyMode: 'live',
    });

    expect(res.tenant.id.startsWith('ten_')).toBe(true);
    expect(res.user.id.startsWith('usr_')).toBe(true);
    expect(res.user.tenantId).toBe(res.tenant.id);

    // Dompet dibuat lalu diberi bonus 100 kredit (Tahap 5).
    expect(uow.wallets.created).toHaveLength(1);
    expect(uow.wallets.created[0]?.balance).toBe(100);

    // API key awal dikembalikan plaintext sekali, milik tenant ini.
    expect(res.plaintextKey.startsWith('sk_live_')).toBe(true);
    expect(res.apiKey.tenantId).toBe(res.tenant.id);
    expect(res.apiKey.last4).toBe(res.plaintextKey.slice(-4));
  });

  it('default_locale: country ID → id; selain itu / null → en (docs/22)', async () => {
    const { service } = setup();
    const idTenant = await service.register({
      name: 'PT Nusantara',
      email: 'id@x.com',
      country: 'ID',
      keyMode: 'live',
    });
    expect(idTenant.tenant.defaultLocale).toBe('id');

    const usTenant = await service.register({
      name: 'Globex Inc',
      email: 'us@x.com',
      country: 'US',
      keyMode: 'live',
    });
    expect(usTenant.tenant.defaultLocale).toBe('en');

    const noCountry = await service.register({
      name: 'No Country',
      email: 'no@x.com',
      country: null,
      keyMode: 'test',
    });
    expect(noCountry.tenant.defaultLocale).toBe('en');
  });
});

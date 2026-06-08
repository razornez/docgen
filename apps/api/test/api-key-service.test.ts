import { PrefixedIdGenerator, SystemClock } from '@docgen/shared';
import type { TenantId } from '@docgen/shared';
import { describe, expect, it } from 'vitest';
import { ApiKeyService } from '../src/api-keys/api-key.service.js';
import { ApiKeyHasher } from '../src/auth/api-key-hasher.js';
import { FakeApiKeyRepository } from './fakes.js';

const TENANT_A = 'ten_aaa' as TenantId;
const TENANT_B = 'ten_bbb' as TenantId;

function makeService() {
  const repo = new FakeApiKeyRepository();
  const service = new ApiKeyService(
    repo,
    new ApiKeyHasher('pepper'),
    new PrefixedIdGenerator(),
    new SystemClock(),
  );
  return { service, repo };
}

async function expectUnauthorized(p: Promise<unknown>): Promise<void> {
  await expect(p).rejects.toMatchObject({
    type: 'unauthorized',
    httpStatus: 401,
  });
}

describe('ApiKeyService.authenticate', () => {
  it('menolak header Authorization yang hilang', async () => {
    const { service } = makeService();
    await expectUnauthorized(service.authenticate(undefined));
  });

  it('menolak skema selain Bearer / malformed', async () => {
    const { service } = makeService();
    await expectUnauthorized(service.authenticate('Token abc'));
  });

  it('menolak token bukan API key (bukan sk_)', async () => {
    const { service } = makeService();
    await expectUnauthorized(service.authenticate('Bearer abc123'));
  });

  it('menolak key yang tidak dikenal', async () => {
    const { service } = makeService();
    await expectUnauthorized(
      service.authenticate('Bearer sk_live_unknownsecret'),
    );
  });

  it('menerima key aktif: AuthContext benar + mencatat last_used', async () => {
    const { service, repo } = makeService();
    const issued = await service.create(TENANT_A, 'live');
    const ctx = await service.authenticate(`Bearer ${issued.plaintext}`);
    expect(ctx.tenantId).toBe(TENANT_A);
    expect(ctx.apiKeyId).toBe(issued.apiKey.id);
    expect(ctx.mode).toBe('live');
    expect(repo.touchCount).toBe(1);
  });

  it('menolak key yang sudah dicabut', async () => {
    const { service } = makeService();
    const issued = await service.create(TENANT_A, 'live');
    await service.revoke(TENANT_A, issued.apiKey.id);
    await expectUnauthorized(
      service.authenticate(`Bearer ${issued.plaintext}`),
    );
  });
});

describe('ApiKeyService — isolasi tenant (docs/13)', () => {
  it('tenant tidak bisa mencabut key milik tenant lain → 404', async () => {
    const { service } = makeService();
    const issuedB = await service.create(TENANT_B, 'live');

    await expect(
      service.revoke(TENANT_A, issuedB.apiKey.id),
    ).rejects.toMatchObject({ type: 'not_found', httpStatus: 404 });

    // Key B tetap aktif: percobaan revoke lintas-tenant tidak berdampak.
    const ctx = await service.authenticate(`Bearer ${issuedB.plaintext}`);
    expect(ctx.tenantId).toBe(TENANT_B);
  });

  it('list hanya mengembalikan key milik tenant tersebut', async () => {
    const { service } = makeService();
    await service.create(TENANT_A, 'live');
    await service.create(TENANT_A, 'test');
    await service.create(TENANT_B, 'live');

    const a = await service.list(TENANT_A);
    const b = await service.list(TENANT_B);
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(1);
    expect(a.every((k) => k.tenantId === TENANT_A)).toBe(true);
  });
});

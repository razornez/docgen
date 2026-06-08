import { PrefixedIdGenerator } from '@docgen/shared';
import type { TenantId } from '@docgen/shared';
import { describe, expect, it } from 'vitest';
import { buildApiKeyMaterial } from '../src/api-keys/api-key.factory.js';
import { ApiKeyHasher } from '../src/auth/api-key-hasher.js';

describe('ApiKeyHasher', () => {
  it('deterministik untuk input yang sama', () => {
    const h = new ApiKeyHasher('pepper');
    expect(h.hash('sk_live_abc')).toBe(h.hash('sk_live_abc'));
  });

  it('berbeda bila pepper berbeda (pepper ikut menentukan hash)', () => {
    expect(new ApiKeyHasher('p1').hash('x')).not.toBe(
      new ApiKeyHasher('p2').hash('x'),
    );
  });

  it('berbeda bila plaintext berbeda', () => {
    const h = new ApiKeyHasher('p');
    expect(h.hash('a')).not.toBe(h.hash('b'));
  });
});

describe('buildApiKeyMaterial', () => {
  const idGen = new PrefixedIdGenerator();
  const hasher = new ApiKeyHasher('pepper');
  const tenantId = 'ten_test' as TenantId;

  it('plaintext berprefix mode, hash cocok, last4 & id benar', () => {
    const live = buildApiKeyMaterial({ tenantId, mode: 'live', idGen, hasher });
    expect(live.plaintext.startsWith('sk_live_')).toBe(true);
    expect(live.record.prefix).toBe('sk_live_');
    expect(live.record.keyHash).toBe(hasher.hash(live.plaintext));
    expect(live.record.last4).toBe(live.plaintext.slice(-4));
    expect(live.record.id.startsWith('key_')).toBe(true);

    const test = buildApiKeyMaterial({ tenantId, mode: 'test', idGen, hasher });
    expect(test.plaintext.startsWith('sk_test_')).toBe(true);
    expect(test.record.prefix).toBe('sk_test_');
  });

  it('rahasia berbeda tiap pemanggilan', () => {
    const a = buildApiKeyMaterial({ tenantId, mode: 'live', idGen, hasher });
    const b = buildApiKeyMaterial({ tenantId, mode: 'live', idGen, hasher });
    expect(a.plaintext).not.toBe(b.plaintext);
  });
});

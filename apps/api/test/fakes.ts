import type { ApiKey, ApiKeyId, TenantId } from '@docgen/shared';
import type {
  ApiKeyRepository,
  CreateApiKeyInput,
} from '../src/api-keys/api-key.repository.js';

/** Catatan internal fake: ApiKey + keyHash (yang tak pernah keluar ke model). */
type StoredKey = ApiKey & { keyHash: string };

const EPOCH = new Date('2026-01-01T00:00:00.000Z');

function strip(k: StoredKey): ApiKey {
  return {
    id: k.id,
    tenantId: k.tenantId,
    mode: k.mode,
    prefix: k.prefix,
    last4: k.last4,
    status: k.status,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
    revokedAt: k.revokedAt,
  };
}

/**
 * Repository API key in-memory untuk unit test (tanpa DB). Menegakkan isolasi
 * tenant sama seperti implementasi Pg: revoke/list disaring per tenant.
 */
export class FakeApiKeyRepository implements ApiKeyRepository {
  private readonly byId = new Map<string, StoredKey>();
  public touchCount = 0;

  async create(input: CreateApiKeyInput): Promise<ApiKey> {
    const key: StoredKey = {
      id: input.id,
      tenantId: input.tenantId,
      mode: input.mode,
      prefix: input.prefix,
      last4: input.last4,
      status: 'active',
      lastUsedAt: null,
      createdAt: EPOCH,
      revokedAt: null,
      keyHash: input.keyHash,
    };
    this.byId.set(input.id, key);
    return strip(key);
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    for (const k of this.byId.values()) {
      if (k.keyHash === keyHash) return strip(k);
    }
    return null;
  }

  async listByTenant(tenantId: TenantId): Promise<ApiKey[]> {
    return [...this.byId.values()]
      .filter((k) => k.tenantId === tenantId)
      .map(strip);
  }

  async revoke(
    tenantId: TenantId,
    id: ApiKeyId,
    revokedAt: Date,
  ): Promise<ApiKey | null> {
    const k = this.byId.get(id);
    if (!k || k.tenantId !== tenantId || k.status !== 'active') return null;
    k.status = 'revoked';
    k.revokedAt = revokedAt;
    return strip(k);
  }

  async touchLastUsed(id: ApiKeyId, at: Date): Promise<void> {
    this.touchCount += 1;
    const k = this.byId.get(id);
    if (k) k.lastUsedAt = at;
  }
}

import { Errors } from '@docgen/shared';
import type {
  ApiKey,
  ApiKeyId,
  ApiKeyMode,
  Clock,
  IdGenerator,
  TenantId,
} from '@docgen/shared';
import type { ApiKeyHasher } from '../auth/api-key-hasher.js';
import type { AuthContext } from '../auth/auth-context.js';
import { buildApiKeyMaterial } from './api-key.factory.js';
import type { ApiKeyRepository } from './api-key.repository.js';

export interface IssuedApiKey {
  readonly apiKey: ApiKey;
  /** Plaintext lengkap — hanya dikembalikan saat pembuatan (docs/09). */
  readonly plaintext: string;
}

/** Mengubah `Authorization: Bearer <token>` menjadi token mentah, atau 401. */
function parseBearer(header: string | undefined): string {
  if (!header) throw Errors.unauthorized('Missing Authorization header');
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw Errors.unauthorized('Malformed Authorization header');
  }
  return token;
}

/**
 * Logika bisnis API key (docs/09): pembuatan, daftar tersamar, pencabutan, dan
 * autentikasi. Tidak tahu detail HTTP. Semua operasi disaring per tenant kecuali
 * `authenticate` (yang justru menentukan tenant dari key).
 */
export class ApiKeyService {
  constructor(
    private readonly repo: ApiKeyRepository,
    private readonly hasher: ApiKeyHasher,
    private readonly idGen: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async create(tenantId: TenantId, mode: ApiKeyMode): Promise<IssuedApiKey> {
    const material = buildApiKeyMaterial({
      tenantId,
      mode,
      idGen: this.idGen,
      hasher: this.hasher,
    });
    const apiKey = await this.repo.create(material.record);
    return { apiKey, plaintext: material.plaintext };
  }

  list(tenantId: TenantId): Promise<ApiKey[]> {
    return this.repo.listByTenant(tenantId);
  }

  async revoke(tenantId: TenantId, id: ApiKeyId): Promise<ApiKey> {
    const revoked = await this.repo.revoke(tenantId, id, this.clock.now());
    if (!revoked) {
      // Tidak ada / bukan milik tenant ini / sudah dicabut — jangan bocorkan beda.
      throw Errors.notFound('API key not found', 'id');
    }
    return revoked;
  }

  /**
   * Memverifikasi key dari header Authorization dan mengembalikan AuthContext.
   * Key hilang/tak cocok/dicabut → 401 (tanpa membedakan alasannya ke klien).
   */
  async authenticate(header: string | undefined): Promise<AuthContext> {
    const token = parseBearer(header);
    if (!token.startsWith('sk_')) {
      throw Errors.unauthorized('Invalid API key');
    }

    const apiKey = await this.repo.findByHash(this.hasher.hash(token));
    if (!apiKey || apiKey.status !== 'active') {
      throw Errors.unauthorized('Invalid API key');
    }

    await this.repo.touchLastUsed(apiKey.id, this.clock.now());

    return {
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.id,
      mode: apiKey.mode,
    };
  }
}

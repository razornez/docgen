import type { ApiKey, ApiKeyId, ApiKeyMode, TenantId } from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface CreateApiKeyInput {
  readonly id: ApiKeyId;
  readonly tenantId: TenantId;
  readonly mode: ApiKeyMode;
  readonly keyHash: string;
  readonly prefix: string;
  readonly last4: string;
}

export interface ApiKeyRepository {
  create(input: CreateApiKeyInput): Promise<ApiKey>;
  /** Cari key berdasarkan hash (untuk autentikasi). Null bila tak ada. */
  findByHash(keyHash: string): Promise<ApiKey | null>;
  /** Daftar key milik SATU tenant (isolasi, docs/13). */
  listByTenant(tenantId: TenantId): Promise<ApiKey[]>;
  /**
   * Cabut key milik tenant. Disaring `tenant_id` agar tenant tidak bisa
   * mencabut key tenant lain. Null bila tidak ada / bukan miliknya / sudah dicabut.
   */
  revoke(
    tenantId: TenantId,
    id: ApiKeyId,
    revokedAt: Date,
  ): Promise<ApiKey | null>;
  /** Catat waktu pakai terakhir (best-effort, dipanggil saat auth sukses). */
  touchLastUsed(id: ApiKeyId, at: Date): Promise<void>;
}

interface ApiKeyRow {
  id: string;
  tenant_id: string;
  mode: string;
  prefix: string;
  last4: string;
  status: string;
  last_used_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

function toApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id as ApiKeyId,
    tenantId: row.tenant_id as TenantId,
    mode: row.mode as ApiKeyMode,
    prefix: row.prefix,
    last4: row.last4,
    status: row.status as ApiKey['status'],
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

// CATATAN: `key_hash` SENGAJA tidak pernah di-SELECT untuk dipetakan ke model.
const COLUMNS =
  'id, tenant_id, mode, prefix, last4, status, last_used_at, created_at, revoked_at';

export class PgApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateApiKeyInput): Promise<ApiKey> {
    const { rows } = await this.db.query<ApiKeyRow>(
      `INSERT INTO api_keys (id, tenant_id, mode, key_hash, prefix, last4)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNS}`,
      [
        input.id,
        input.tenantId,
        input.mode,
        input.keyHash,
        input.prefix,
        input.last4,
      ],
    );
    return toApiKey(rows[0]!);
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const { rows } = await this.db.query<ApiKeyRow>(
      `SELECT ${COLUMNS} FROM api_keys WHERE key_hash = $1`,
      [keyHash],
    );
    const row = rows[0];
    return row ? toApiKey(row) : null;
  }

  async listByTenant(tenantId: TenantId): Promise<ApiKey[]> {
    const { rows } = await this.db.query<ApiKeyRow>(
      `SELECT ${COLUMNS} FROM api_keys
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(toApiKey);
  }

  async revoke(
    tenantId: TenantId,
    id: ApiKeyId,
    revokedAt: Date,
  ): Promise<ApiKey | null> {
    const { rows } = await this.db.query<ApiKeyRow>(
      `UPDATE api_keys
       SET status = 'revoked', revoked_at = $3
       WHERE id = $1 AND tenant_id = $2 AND status = 'active'
       RETURNING ${COLUMNS}`,
      [id, tenantId, revokedAt],
    );
    const row = rows[0];
    return row ? toApiKey(row) : null;
  }

  async touchLastUsed(id: ApiKeyId, at: Date): Promise<void> {
    await this.db.query(`UPDATE api_keys SET last_used_at = $2 WHERE id = $1`, [
      id,
      at,
    ]);
  }
}

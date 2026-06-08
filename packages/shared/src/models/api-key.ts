import type { ApiKeyId, TenantId } from '../ids.js';

export type ApiKeyMode = 'live' | 'test';
export type ApiKeyStatus = 'active' | 'revoked';

/**
 * API key (tabel `api_keys`). Model ini SENGAJA tidak memuat `key_hash` —
 * rahasia hanya hidup sesaat saat pembuatan dan tidak pernah dikembalikan lagi.
 * `prefix` + `last4` cukup untuk tampilan tersamar di dashboard (docs/09).
 */
export interface ApiKey {
  id: ApiKeyId;
  tenantId: TenantId;
  mode: ApiKeyMode;
  prefix: string;
  last4: string;
  status: ApiKeyStatus;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

/** Prefix plaintext API key per mode (docs/02, docs/09). */
export const API_KEY_PREFIX: Record<ApiKeyMode, string> = {
  live: 'sk_live_',
  test: 'sk_test_',
};

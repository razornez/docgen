import { API_KEY_PREFIX, randomBase62 } from '@docgen/shared';
import type {
  ApiKeyId,
  ApiKeyMode,
  IdGenerator,
  TenantId,
} from '@docgen/shared';
import type { ApiKeyHasher } from '../auth/api-key-hasher.js';
import type { CreateApiKeyInput } from './api-key.repository.js';

/** Panjang bagian acak rahasia API key (~190 bit entropi pada base62). */
const SECRET_LENGTH = 32;

export interface ApiKeyMaterial {
  /** Baris siap di-INSERT (hanya hash + metadata tampilan, bukan rahasia). */
  readonly record: CreateApiKeyInput;
  /** Plaintext lengkap (`sk_live_...`/`sk_test_...`) — DITAMPILKAN SEKALI saja. */
  readonly plaintext: string;
}

/**
 * Membentuk material API key baru: plaintext berprefix mode, hash untuk disimpan,
 * dan `last4` untuk tampilan tersamar (docs/09). Pemanggil menyimpan `record` dan
 * mengembalikan `plaintext` ke klien tepat sekali.
 */
export function buildApiKeyMaterial(params: {
  tenantId: TenantId;
  mode: ApiKeyMode;
  idGen: IdGenerator;
  hasher: ApiKeyHasher;
}): ApiKeyMaterial {
  const prefix = API_KEY_PREFIX[params.mode];
  const plaintext = `${prefix}${randomBase62(SECRET_LENGTH)}`;
  return {
    record: {
      id: params.idGen.generate('key') as ApiKeyId,
      tenantId: params.tenantId,
      mode: params.mode,
      keyHash: params.hasher.hash(plaintext),
      prefix,
      last4: plaintext.slice(-4),
    },
    plaintext,
  };
}

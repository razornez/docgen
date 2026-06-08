import { createHash } from 'node:crypto';

/**
 * Hash API key untuk disimpan/diverifikasi (docs/09, docs/13).
 * SHA-256 atas (plaintext + pepper). Pepper datang dari env `APIKEY_HASH_PEPPER`
 * sehingga hash di DB tak berguna tanpa rahasia aplikasi. Deterministik agar
 * verifikasi = hash ulang lalu cocokkan; rahasia asli tak pernah disimpan.
 */
export class ApiKeyHasher {
  constructor(private readonly pepper: string) {}

  hash(plaintext: string): string {
    return createHash('sha256')
      .update(plaintext + this.pepper)
      .digest('hex');
  }
}

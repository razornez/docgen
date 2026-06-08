import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Tanda tangan tautan unduh berumur pendek (docs/10). HMAC-SHA256 atas
 * `key:expires` dengan rahasia aplikasi. Tautan TIDAK disimpan — dibuat baru
 * tiap `GET /v1/documents/{id}` dan otomatis kedaluwarsa.
 */
export function signToken(
  secret: string,
  key: string,
  expires: number,
): string {
  return createHmac('sha256', secret).update(`${key}:${expires}`).digest('hex');
}

/** Verifikasi tanda tangan + masa berlaku (timing-safe). */
export function verifyToken(
  secret: string,
  key: string,
  expires: number,
  sig: string,
  nowMs: number,
): boolean {
  if (!Number.isFinite(expires) || expires < nowMs) return false;
  const expected = signToken(secret, key, expires);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Membentuk URL bertanda tangan menuju endpoint unduh dev (`GET /v1/files`). */
export function buildSignedUrl(params: {
  publicBaseUrl: string;
  secret: string;
  key: string;
  ttlSeconds: number;
  nowMs: number;
}): string {
  const expires = params.nowMs + params.ttlSeconds * 1000;
  const sig = signToken(params.secret, params.key, expires);
  const url = new URL('/v1/files', params.publicBaseUrl);
  url.searchParams.set('key', params.key);
  url.searchParams.set('expires', String(expires));
  url.searchParams.set('sig', sig);
  return url.toString();
}

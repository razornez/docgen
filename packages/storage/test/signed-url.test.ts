import { describe, expect, it } from 'vitest';
import { buildSignedUrl, signToken, verifyToken } from '../src/index.js';

describe('signed token', () => {
  const secret = 'rahasia';
  const key = 'ten_a/2026/06/doc_x.pdf';

  it('token sah terverifikasi sebelum kedaluwarsa', () => {
    const expires = 1000 + 60_000;
    const sig = signToken(secret, key, expires);
    expect(verifyToken(secret, key, expires, sig, 1000)).toBe(true);
  });

  it('menolak key/sig/secret yang dirusak', () => {
    const expires = 61_000;
    const sig = signToken(secret, key, expires);
    expect(verifyToken(secret, 'ten_a/lain.pdf', expires, sig, 1000)).toBe(
      false,
    );
    expect(verifyToken(secret, key, expires, 'deadbeef', 1000)).toBe(false);
    expect(verifyToken('secret-lain', key, expires, sig, 1000)).toBe(false);
  });

  it('menolak token kedaluwarsa', () => {
    const expires = 500;
    const sig = signToken(secret, key, expires);
    expect(verifyToken(secret, key, expires, sig, 1000)).toBe(false);
  });

  it('buildSignedUrl memuat key, expires, sig', () => {
    const url = buildSignedUrl({
      publicBaseUrl: 'http://localhost:3001',
      secret,
      key,
      ttlSeconds: 60,
      nowMs: 1000,
    });
    const u = new URL(url);
    expect(u.pathname).toBe('/v1/files');
    expect(u.searchParams.get('key')).toBe(key);
    expect(Number(u.searchParams.get('expires'))).toBe(61_000);
    expect(u.searchParams.get('sig')).toBeTruthy();
  });
});

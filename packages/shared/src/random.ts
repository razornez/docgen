import { randomBytes } from 'node:crypto';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * String acak base62 sepanjang `length` (CSPRNG). Dipakai untuk bagian acak
 * ID berprefix dan rahasia API key. ~5.95 bit entropi per karakter.
 */
export function randomBase62(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    // bytes[i] selalu terdefinisi untuk i < length.
    out += BASE62[bytes[i]! % 62];
  }
  return out;
}

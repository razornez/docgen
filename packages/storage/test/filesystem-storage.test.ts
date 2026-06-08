import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FilesystemStorage } from '../src/index.js';

let baseDir: string;

beforeAll(async () => {
  baseDir = await mkdtemp(join(tmpdir(), 'docgen-storage-'));
});
afterAll(async () => {
  await rm(baseDir, { recursive: true, force: true });
});

function makeStorage(nowMs = 1000) {
  return new FilesystemStorage(
    { baseDir, publicBaseUrl: 'http://localhost:3001', secret: 'sec' },
    () => nowMs,
  );
}

describe('FilesystemStorage', () => {
  it('put lalu read mengembalikan byte yang sama', async () => {
    const s = makeStorage();
    const key = 'ten_a/2026/06/doc_1.pdf';
    await s.put(key, Buffer.from('%PDF-1.7 halo'), 'application/pdf');
    const buf = await s.read(key);
    expect(buf.toString()).toBe('%PDF-1.7 halo');
  });

  it('signedUrl menghasilkan tautan yang lolos verify', async () => {
    const s = makeStorage();
    const url = await s.signedUrl('ten_a/x.pdf', 60);
    const u = new URL(url);
    const expires = Number(u.searchParams.get('expires'));
    const sig = u.searchParams.get('sig') ?? '';
    expect(s.verify('ten_a/x.pdf', expires, sig)).toBe(true);
    // Token untuk key lain tidak valid.
    expect(s.verify('ten_b/x.pdf', expires, sig)).toBe(false);
  });

  it('menolak path traversal di luar baseDir', async () => {
    const s = makeStorage();
    await expect(
      s.put('../escape.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toThrow(/path traversal/i);
  });

  it('delete objek yang tidak ada bersifat no-op', async () => {
    const s = makeStorage();
    await expect(s.delete('ten_a/tidakada.pdf')).resolves.toBeUndefined();
  });
});

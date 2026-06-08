import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { StoragePort } from '@docgen/shared';
import { buildSignedUrl, verifyToken } from './signed-url.js';

export interface FilesystemStorageConfig {
  /** Folder root penyimpanan PDF lokal (dev). */
  readonly baseDir: string;
  /** Basis URL publik untuk membentuk signed URL (mis. http://localhost:3001). */
  readonly publicBaseUrl: string;
  /** Rahasia untuk menandatangani tautan unduh. */
  readonly secret: string;
}

/**
 * Adapter StoragePort berbasis filesystem untuk DEV (tanpa MinIO/Docker).
 * Objek privat di disk; "signed URL" menunjuk ke endpoint unduh API yang
 * memverifikasi token (lihat `verify`/`read`). Ditukar ke S3/R2/MinIO cukup
 * dengan mengganti adapter ini (Open/Closed — docs/21, docs/10).
 *
 * Catatan: untuk S3/MinIO, `signedUrl` akan menghasilkan presigned URL yang
 * menunjuk LANGSUNG ke object storage, sehingga endpoint `/v1/files` (read-through)
 * hanya relevan untuk adapter filesystem ini.
 */
export class FilesystemStorage implements StoragePort {
  constructor(
    private readonly config: FilesystemStorageConfig,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Path absolut tervalidasi — menolak path traversal di luar baseDir. */
  private pathFor(key: string): string {
    const base = resolve(this.config.baseDir);
    const target = resolve(base, key);
    if (target !== base && !target.startsWith(base + sep)) {
      throw new Error(`Kunci storage tidak valid (path traversal): ${key}`);
    }
    return target;
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  signedUrl(key: string, ttlSeconds: number): Promise<string> {
    return Promise.resolve(
      buildSignedUrl({
        publicBaseUrl: this.config.publicBaseUrl,
        secret: this.config.secret,
        key,
        ttlSeconds,
        nowMs: this.now(),
      }),
    );
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  // --- Khusus dev (dipakai endpoint /v1/files; tidak ada di kontrak StoragePort) ---

  /** Verifikasi token signed URL (key + expires + sig). */
  verify(key: string, expires: number, sig: string): boolean {
    return verifyToken(this.config.secret, key, expires, sig, this.now());
  }

  /** Membaca byte objek dari disk (setelah token diverifikasi). */
  read(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }
}

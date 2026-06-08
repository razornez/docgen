/**
 * Port penyimpanan objek (docs/21). Adapter: R2 / S3 / MinIO.
 * PDF & aset disimpan di sini; signed URL diterbitkan saat dibaca, tidak disimpan.
 */
export interface StoragePort {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** URL bertanda tangan berumur pendek (detik) untuk mengunduh objek. */
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

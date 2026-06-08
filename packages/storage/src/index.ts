/**
 * @docgen/storage — adapter StoragePort (docs/21 Ports & Adapters, docs/10).
 * Saat ini: filesystem (dev). Adapter S3/R2/MinIO menyusul tanpa mengubah
 * logika bisnis (cukup tukar adapter).
 */
export { FilesystemStorage } from './filesystem-storage.js';
export type { FilesystemStorageConfig } from './filesystem-storage.js';
export { S3Storage } from './s3-storage.js';
export type { S3StorageConfig } from './s3-storage.js';
export { signToken, verifyToken, buildSignedUrl } from './signed-url.js';

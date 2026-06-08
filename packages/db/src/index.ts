/**
 * Akses data terpusat (docs/21 — Batas Modul). Hanya skema & akses DB ada di sini;
 * repository milik domain (di apps/*) memakai pool/transaksi ini. Tidak ada logika bisnis.
 */
export { getPool, closePool, pingDatabase, withTransaction } from './pool.js';
export type {
  Queryable,
  Pool,
  PoolClient,
  QueryResult,
  QueryResultRow,
} from './pool.js';

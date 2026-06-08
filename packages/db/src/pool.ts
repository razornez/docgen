import { loadConfig } from '@docgen/config';
import pg from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

const { Pool } = pg;

let pool: pg.Pool | undefined;

/**
 * Antarmuka minimal "bisa di-query". Pool maupun PoolClient memenuhinya,
 * sehingga repository bisa menerima salah satunya — pool untuk operasi tunggal,
 * client untuk operasi di dalam satu transaksi (docs/21 — atomik).
 */
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<R>>;
}

/**
 * Pool koneksi Postgres bersama (lazy singleton). Dibuat dari DATABASE_URL
 * yang sudah divalidasi (packages/config). Semua akses DB lewat sini.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const config = loadConfig();
    pool = new Pool({ connectionString: config.DATABASE_URL });
  }
  return pool;
}

/**
 * Menjalankan `fn` dalam satu transaksi DB (BEGIN/COMMIT, ROLLBACK bila error).
 * Dipakai untuk operasi multi-tabel yang harus atomik (mis. registrasi tenant:
 * tenant + user + wallet + api_key sekaligus).
 */
export async function withTransaction<T>(
  fn: (tx: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Menutup pool (dipakai saat shutdown bersih / akhir skrip). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/** Ping ringan untuk health check (docs/20): `SELECT 1`. */
export async function pingDatabase(): Promise<void> {
  await getPool().query('SELECT 1');
}

export type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

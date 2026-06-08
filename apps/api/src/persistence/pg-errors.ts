/**
 * Deteksi pelanggaran UNIQUE Postgres (SQLSTATE 23505) pada constraint/index
 * tertentu, untuk dipetakan ke 409 Conflict (docs/02). Satu sumber kebenaran
 * agar tidak diulang di tiap service (DRY, docs/21).
 */
export function isUniqueViolation(err: unknown, constraint: string): boolean {
  const e = err as { code?: string; constraint?: string };
  return e.code === '23505' && e.constraint === constraint;
}

/**
 * Runner migrasi SQL-first (docs/05 sebagai sumber kebenaran).
 *
 * KENAPA SQL langsung, bukan ORM/Drizzle/Prisma:
 *   DDL kita kaya fitur Postgres yang merepotkan ORM — fungsi plpgsql + trigger
 *   `set_updated_at`, partial index (`WHERE ...`), tipe array `TEXT[]`/`INET[]`,
 *   CHECK kompleks (`chk_amount_sign`), dan ledger append-only. Menulis ini di
 *   SQL menjaga DDL tetap satu sumber kebenaran yang persis sama dengan docs/05,
 *   tanpa "lost in translation" lewat lapisan abstraksi. Runner kecil ini hanya
 *   menambahkan: urutan deterministik, pelacakan migrasi, dan deteksi drift.
 *
 * Penggunaan:
 *   tsx src/migrate.ts up       # terapkan migrasi yang belum dijalankan
 *   tsx src/migrate.ts status   # tampilkan terapan vs tertunda
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, getPool } from './pool.js';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'migrations',
);

interface MigrationFile {
  readonly id: string; // nama file, mis. '0001_init.sql'
  readonly sql: string;
  readonly checksum: string;
}

function loadMigrationFiles(): MigrationFile[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort() // penamaan 0001_, 0002_ menjamin urutan leksikografis = urutan jalan
    .map((id) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, id), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      return { id, sql, checksum };
    });
}

async function ensureMigrationsTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getApplied(): Promise<Map<string, string>> {
  const { rows } = await getPool().query<{ id: string; checksum: string }>(
    'SELECT id, checksum FROM schema_migrations ORDER BY id',
  );
  return new Map(rows.map((r) => [r.id, r.checksum]));
}

/** Memastikan migrasi yang sudah terapan tidak diubah isinya (deteksi drift). */
function assertNoDrift(
  files: MigrationFile[],
  applied: Map<string, string>,
): void {
  for (const file of files) {
    const recorded = applied.get(file.id);
    if (recorded !== undefined && recorded !== file.checksum) {
      throw new Error(
        `Migrasi '${file.id}' sudah diterapkan tetapi isinya berubah ` +
          `(checksum berbeda). Migrasi bersifat immutable — buat file migrasi ` +
          `baru, jangan edit yang lama.`,
      );
    }
  }
}

async function up(): Promise<void> {
  await ensureMigrationsTable();
  const files = loadMigrationFiles();
  const applied = await getApplied();
  assertNoDrift(files, applied);

  const pending = files.filter((f) => !applied.has(f.id));
  if (pending.length === 0) {
    console.log('Tidak ada migrasi tertunda. Database sudah mutakhir.');
    return;
  }

  const pool = getPool();
  for (const file of pending) {
    const client = await pool.connect();
    try {
      // Tiap migrasi dijalankan dalam satu transaksi: semua-atau-tidak.
      await client.query('BEGIN');
      await client.query(file.sql);
      await client.query(
        'INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)',
        [file.id, file.checksum],
      );
      await client.query('COMMIT');
      console.log(`✓ Terapkan ${file.id}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Gagal menerapkan migrasi '${file.id}': ${String(err)}`, {
        cause: err,
      });
    } finally {
      client.release();
    }
  }
  console.log(`Selesai. ${pending.length} migrasi diterapkan.`);
}

async function status(): Promise<void> {
  await ensureMigrationsTable();
  const files = loadMigrationFiles();
  const applied = await getApplied();
  assertNoDrift(files, applied);

  console.log('Status migrasi:');
  for (const file of files) {
    console.log(`  [${applied.has(file.id) ? 'x' : ' '}] ${file.id}`);
  }
  const pending = files.filter((f) => !applied.has(f.id)).length;
  console.log(`Terapan: ${applied.size}, Tertunda: ${pending}`);
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'up';
  switch (command) {
    case 'up':
      await up();
      break;
    case 'status':
      await status();
      break;
    default:
      throw new Error(
        `Perintah tidak dikenal: '${command}'. Pakai 'up' atau 'status'.`,
      );
  }
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => closePool());

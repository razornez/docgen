/**
 * Loader environment terpusat (docs/21 — "Konfigurasi & Rahasia").
 *
 * Aturan: environment divalidasi SEKALI saat start dengan Zod dan aplikasi
 * GAGAL CEPAT bila ada yang kurang/salah — bukan error di tengah jalan.
 * Bagian dalam aplikasi hanya menerima `AppConfig` yang sudah bersih & bertipe
 * ("parse, don't validate").
 */
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Mencari `.env` dengan menelusuri ke atas dari `cwd`. Penting di monorepo:
 * `pnpm --filter <app>` menjalankan skrip dengan cwd di folder app, sedangkan
 * `.env` tinggal di root repo. Mengembalikan undefined bila tak ada (di
 * produksi variabel datang dari environment asli, bukan file).
 */
function findEnvFile(start: string): string | undefined {
  let dir = start;
  for (;;) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

// Memuat .env ke process.env (no-op bila variabel sudah diset di lingkungan).
const envPath = findEnvFile(process.cwd());
loadDotenv(envPath ? { path: envPath } : {});

/** Boolean dari string env: "true"/"1" -> true, sisanya false. */
const envBool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Database & antrian
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // API service
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Penyimpanan objek (R2/S3/MinIO)
  STORAGE_ENDPOINT: z
    .string()
    .url()
    .optional()
    .default('http://localhost:9000'),
  STORAGE_REGION: z.string().min(1).default('us-east-1'),
  STORAGE_ACCESS_KEY: z.string().default(''),
  STORAGE_SECRET_KEY: z.string().default(''),
  STORAGE_BUCKET: z.string().min(1).default('docgen-files'),
  STORAGE_FORCE_PATH_STYLE: envBool.default('true'),
  // Driver storage aktif. 'filesystem' = dev tanpa MinIO; 's3' = R2/S3/MinIO.
  STORAGE_DRIVER: z.enum(['filesystem', 's3']).default('filesystem'),
  // Folder PDF lokal saat driver=filesystem.
  STORAGE_DIR: z.string().min(1).default('./var/storage'),
  // Umur tautan unduh bertanda tangan (detik) — pendek demi keamanan (docs/10).
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  // Render (Tahap 4)
  // Batas tunggu API atas job render sync (ms). Worker harus selesai < ini.
  RENDER_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  // Konkurensi job render per worker (disiplin sumber daya, docs/08).
  RENDER_CONCURRENCY: z.coerce.number().int().positive().default(2),

  // Kasugai payment gateway (proxy di atas Midtrans). Top-up kredit lewat sini.
  // Boleh kosong di dev; diperketat di produksi (top-up akan gagal tanpa key).
  KASUGAI_BASE_URL: z.string().default('https://kasugai.razornez.net'),
  KASUGAI_SECRET_KEY: z.string().default(''), // sk_... (BUKAN pk_) — server only
  KASUGAI_PUBLISHABLE_KEY: z.string().default(''), // pk_... — untuk snap.js di browser
  KASUGAI_WEBHOOK_SECRET: z.string().default(''), // whsec_... (dari dashboard)

  // Rahasia aplikasi
  SESSION_SECRET: z.string().min(16),
  APIKEY_HASH_PEPPER: z.string().min(16),

  // Akun OWNER platform (Owner Console lintas-tenant). Terpisah dari akun
  // tenant. Di produksi WAJIB diganti nilai kuat via .env.
  OWNER_EMAIL: z.string().default('owner@docgen.local'),
  OWNER_PASSWORD: z.string().min(6).default('owner12345'),
  /** Alternatif aman: hash bcrypt password owner. Jika di-set, dipakai
   *  menggantikan OWNER_PASSWORD plaintext. */
  OWNER_PASSWORD_HASH: z.string().optional(),

  // Login Google (dipakai tahap auth)
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),

  // Email (Brevo SMTP relay)
  EMAIL_SMTP_HOST: z.string().default('smtp-relay.brevo.com'),
  EMAIL_SMTP_PORT: z.coerce.number().default(587),
  EMAIL_SMTP_USER: z.string().default(''),
  EMAIL_SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default(''),

  // Observability
  SENTRY_DSN: z.string().default(''),

  // i18n (docs/22) — basis/fallback selalu 'en'
  DEFAULT_LOCALE: z.enum(['id', 'en']).default('en'),

  // URL frontend dashboard — dipakai untuk redirect setelah Google OAuth callback.
  DASHBOARD_URL: z.string().url().default('http://localhost:5173'),
});

export type AppConfig = Readonly<z.infer<typeof EnvSchema>>;

let cached: AppConfig | undefined;

/**
 * Memuat & memvalidasi konfigurasi dari `process.env`. Hasilnya di-cache,
 * jadi aman dipanggil berkali-kali. Melempar (gagal cepat) bila tidak valid.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => ` - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Konfigurasi environment tidak valid. Perbaiki .env Anda:\n${issues}`,
    );
  }

  // STORAGE_DIR di-resolve absolut terhadap ROOT REPO (folder .env), bukan cwd —
  // agar api & worker (cwd berbeda) memakai folder storage yang SAMA.
  const repoRoot = envPath ? dirname(envPath) : process.cwd();
  const resolved: z.infer<typeof EnvSchema> = {
    ...parsed.data,
    STORAGE_DIR: isAbsolute(parsed.data.STORAGE_DIR)
      ? parsed.data.STORAGE_DIR
      : resolve(repoRoot, parsed.data.STORAGE_DIR),
  };

  cached = Object.freeze(resolved);
  return cached;
}

/** Hanya untuk pengujian: mengosongkan cache konfigurasi. */
export function resetConfigCache(): void {
  cached = undefined;
}

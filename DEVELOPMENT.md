# DEVELOPMENT — Menjalankan DocGen Secara Lokal

Panduan menjalankan kerangka **Tahap 1** (pondasi). Mengacu pada
[docs/07](docs/07-pondasi-teknologi-dan-build.md),
[docs/20](docs/20-persiapan-development.md), dan
[docs/21](docs/21-standar-kode-dan-best-practices.md).

## Prasyarat

- **Node.js 20+**
- **pnpm 9** — aktifkan via Corepack: `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- **Docker + Docker Compose** — untuk Postgres, Redis, dan MinIO lokal

## 1. Pasang dependency

```bash
pnpm install
```

## 2. Siapkan environment

```bash
cp .env.example .env
```

Nilai bawaan di `.env.example` sudah cocok dengan `docker-compose.yml` (Postgres,
Redis, MinIO), jadi untuk dev lokal bisa langsung dipakai. Konfigurasi
**divalidasi sekali saat start** (Zod) dan **gagal cepat** bila ada yang kurang —
isi semua yang wajib. Jangan commit `.env` (sudah di `.gitignore`).

## 3. Nyalakan infrastruktur

```bash
docker compose up -d
```

Menyalakan:

| Layanan  | Port lokal       | Catatan                                      |
| -------- | ---------------- | -------------------------------------------- |
| Postgres | `127.0.0.1:5433` | host 5433 → container 5432 (hindari bentrok) |
| Redis    | `127.0.0.1:6379` | appendonly aktif (data persist di volume)    |
| MinIO    | `127.0.0.1:9000` | S3 API; Console di `:9001`                   |

Volume (`pgdata`, `redisdata`, `miniodata`) membuat data **persist** antar
restart. Bucket `docgen-files` dibuat otomatis oleh service `minio-setup`.

Cek semua sehat: `docker compose ps`.

## 4. Jalankan migrasi database

```bash
pnpm db:migrate           # menerapkan migrasi yang belum dijalankan
pnpm --filter @docgen/db run migrate:status   # melihat status
```

Migrasi memakai **SQL langsung** (lihat `packages/db/migrations/`) dengan runner
kecil yang melacak migrasi di tabel `schema_migrations` dan menolak perubahan
pada migrasi yang sudah terapan (immutable). Alasan memilih SQL langsung
dijelaskan di komentar `packages/db/src/migrate.ts`.

## 5. Jalankan layanan

```bash
pnpm dev:api      # API (Fastify) — default http://localhost:3001
pnpm dev:worker   # Worker render (Playwright/Chromium) — WAJIB untuk /v1/documents
```

> API memakai port **3001** (3000 sering dipakai dev server lain). Ubah lewat
> `API_PORT` di `.env` bila perlu.
>
> **Render dokumen (Tahap 4)** butuh `dev:worker` berjalan: API meng-enqueue job
> ke Redis lalu menunggu worker mencetak PDF (Chromium). Sekali pasang Chromium:
> `pnpm --filter @docgen/renderer exec playwright install chromium`. PDF disimpan
> via `STORAGE_DRIVER` (dev: `filesystem` → `STORAGE_DIR`), diunduh lewat signed
> URL berumur pendek (`GET /v1/files`).

## 6. Cek kesehatan

```bash
curl -s http://localhost:3001/health | jq
```

Respons saat semua sehat (HTTP `200`):

```json
{
  "status": "ok",
  "checks": {
    "postgres": { "ok": true, "latencyMs": 3 },
    "redis": { "ok": true, "latencyMs": 1 }
  }
}
```

Bila ada dependensi mati, endpoint membalas HTTP `503` dengan `status: "degraded"`
dan detail per-dependensi (`ok`, `latencyMs`, `error`).

## Perintah lain

```bash
pnpm typecheck      # tsc --noEmit di semua paket (strict)
pnpm lint           # ESLint
pnpm format         # Prettier --write
pnpm format:check   # Prettier --check
```

Husky memasang **pre-commit** yang menjalankan `lint-staged` (ESLint + Prettier
pada file yang di-stage) lalu `pnpm typecheck`.

## Struktur monorepo

```
docgen/
├─ apps/
│  ├─ api/        Fastify: /health, /v1 (tenant, api-key, template, document)
│  └─ worker/     worker render (BullMQ consumer + Chromium → PDF)
├─ packages/
│  ├─ config/     loader environment Zod (validasi sekali, gagal cepat)
│  ├─ shared/     tipe bersama: Locale, IDs, AppError, PORTS, render job/opsi
│  ├─ i18n/       katalog en/id + util pemilih locale sisi-server
│  ├─ renderer/   mesin polos (docs/00): isi-template Handlebars + cetak PDF
│  ├─ storage/    adapter StoragePort (dev: filesystem) + signed URL
│  └─ db/         pool Postgres + migrasi SQL + runner migrasi
├─ docs/  schemas/  examples/   → dokumen, skema, contoh
├─ docker-compose.yml
└─ .env.example
```

Batas modul (docs/21): `apps/*` boleh impor `packages/*`; `packages/*` **tidak
boleh** impor `apps/*` (ditegakkan ESLint). Tidak ada dependensi melingkar.

## Catatan tahap berikutnya

- **i18n switcher**: pemilih bahasa ID/EN di halaman login & daftar dibangun saat
  **dashboard/login (frontend) dibuat** — Tahap 2 fokus backend (API key), belum ada
  UI. Lihat catatan requirement di `packages/i18n/src/index.ts`.
- **Adapter stub** (Storage/Payment/Queue/Mailer) di `packages/shared` melempar
  `NotImplementedError`; diganti implementasi nyata per tahap (docs/07).

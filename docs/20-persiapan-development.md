# 20 — Persiapan Development

Checklist sebelum menulis baris kode pertama. Coding sebaiknya dilakukan di Claude Code (terhubung ke GitHub, bisa menjalankan & menguji), dengan dokumen 00–19 sebagai acuan.

## Prasyarat Tools

- **Node.js** (versi 20+)
- **pnpm** (pengelola paket untuk monorepo)
- **Docker + Docker Compose** (menjalankan Postgres & Redis lokal, dan wadah layanan)
- **Git**
- Playwright akan mengunduh Chromium sendiri saat dipasang di worker.

## Akun & Layanan yang Disiapkan

- **Midtrans** — daftar dan ambil kunci **Sandbox** dulu (untuk dev), produksi belakangan.
- **Google Cloud** — buat kredensial OAuth (untuk login Google).
- **Pengiriman email** — penyedia untuk email verifikasi (mis. SMTP / Resend / Mailgun).
- **Penyimpanan objek** — Cloudflare R2 atau AWS S3; untuk dev bisa jalankan **MinIO** lokal di Docker.
- **Sentry** — pelacak error (opsional, kamu sudah punya akun).
- **VPS** — nanti saat deploy, belum perlu untuk mulai.

## Environment Variables (.env.example)

```
# Database & antrian
DATABASE_URL=postgresql://user:pass@localhost:5432/docgen
REDIS_URL=redis://localhost:6379

# Penyimpanan objek (R2/S3/MinIO)
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=docgen-files

# Midtrans (mulai dari sandbox)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# Rahasia aplikasi
SESSION_SECRET=
APIKEY_HASH_PEPPER=

# Login Google (OAuth)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email verifikasi
EMAIL_API_KEY=
EMAIL_FROM=

# Lain-lain
SENTRY_DSN=
PUBLIC_BASE_URL=http://localhost:3000
```

Semua rahasia lewat environment, tidak masuk repo (lihat dokumen 13).

## Menjalankan Lokal

1. `docker compose up` — menyalakan Postgres + Redis (+ MinIO bila dipakai).
2. Jalankan **migrasi database** dari DDL (dokumen 05) untuk membuat tabel.
3. Jalankan layanan **api** dan **worker**.
4. Cek endpoint `/health` memastikan hidup.

## Urutan Build (ringkas, detail di dokumen 07)

1. Kerangka — repo, migrasi DB, Postgres+Redis lokal, health check.
2. Tenant & API key.
3. Template + preview.
4. Render 1 dokumen (sync) — inti JSON→PDF.
5. Kredit prepaid (ledger, reserve/commit/refund).
6. Top-up via Midtrans (sandbox).
7. Panel owner.
8. Batch + keadilan.
9. Webhook keluar.
10. Pengerasan (log, isolasi worker, masa simpan, backup).

## Cara Memulai di Claude Code

Buka folder repo di Claude Code, lalu minta secara bertahap mengikuti urutan build. Contoh untuk tahap 1: *"Bikin monorepo TypeScript (pnpm) sesuai struktur di docs/07, tambahkan docker-compose untuk Postgres+Redis, buat migrasi database dari docs/05-skema-ddl.sql, dan endpoint /health di apps/api."* Lanjutkan tahap demi tahap, uji tiap tahap sebelum lanjut.

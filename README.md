# DocGen — Sistem Generate Dokumen Massal (API)

Layanan API untuk menghasilkan dokumen (invoice, sertifikat, kontrak, slip gaji, dll.) secara massal: **kirim JSON → dapat PDF rapi**. Klien membuat template HTML sendiri, mengirim data, dan sistem mencetaknya jadi PDF. Monetisasi memakai **kredit prepaid** (bayar sesuai pakai).

Repo ini berisi dokumen perancangan lengkap plus kerangka kode (monorepo pnpm). Untuk menjalankan lokal (Docker, migrasi, API, `/health`), lihat **[DEVELOPMENT.md](DEVELOPMENT.md)**.

## Struktur Repositori

```
docgen/
├─ apps/       → layanan: api (Fastify), worker (render, Tahap 4)
├─ packages/   → modul bersama: config, shared, i18n, db
├─ docs/       → dokumen perancangan (00–22, .sql, .mermaid)
├─ schemas/    → skema bentuk data template (template-schemas.json)
├─ examples/   → contoh template + data + hasil (invoice)
├─ docker-compose.yml  pnpm-workspace.yaml  package.json
└─ README.md  DEVELOPMENT.md  QA.md
```

Menjalankan lokal: **[DEVELOPMENT.md](DEVELOPMENT.md)**. Rencana & runbook uji QA: **[QA.md](QA.md)**.

## Urutan Baca (Daftar Isi)

Mulai dari `00`, lalu berurutan.

| #   | Dokumen                                                                               | Isi                                                                         |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 00  | [Prinsip Rendering & Tanggung Jawab](docs/00-prinsip-rendering-dan-tanggung-jawab.md) | **Baca pertama.** Mesin "polos": tampil apa adanya, tanggung jawab di klien |
| 01  | [Arsitektur & Scope MVP](docs/01-arsitektur-dan-scope-mvp.md)                         | Gambaran besar & batas MVP                                                  |
| 02  | [Desain API](docs/02-desain-api.md)                                                   | Endpoint, error, idempotency                                                |
| 03  | [Sistem Kredit Prepaid](docs/03-sistem-kredit-prepaid.md)                             | Ledger, reserve/refund, top-up                                              |
| 04  | [Pencegahan Fraud](docs/04-pencegahan-fraud.md)                                       | Bonus, pembayaran, API key, dokumen palsu                                   |
| 05  | [Skema Database (SQL)](docs/05-skema-ddl.sql)                                         | DDL PostgreSQL lengkap                                                      |
| 06  | [Pemrosesan Batch & Keadilan](docs/06-pemrosesan-batch-dan-keadilan.md)               | Batch massal & antar-klien adil                                             |
| 07  | [Pondasi: Teknologi & Build](docs/07-pondasi-teknologi-dan-build.md)                  | Stack, hosting VPS, struktur repo, urutan build                             |
| 08  | [Worker Render & Opsi PDF](docs/08-worker-render-dan-opsi-pdf.md)                     | Chromium, opsi cetak, base64, keamanan                                      |
| 09  | [Auth & API Key](docs/09-auth-dan-api-key.md)                                         | Login email/Google, API key                                                 |
| 10  | [Penyimpanan & Siklus File](docs/10-penyimpanan-dan-siklus-file.md)                   | Signed URL, masa simpan per akun                                            |
| 11  | [Webhook Keluar](docs/11-webhook-keluar.md)                                           | Notifikasi ke klien                                                         |
| 12  | [Pemantauan & Operasional](docs/12-pemantauan-dan-operasional.md)                     | Log, metrik, alert                                                          |
| 13  | [Keamanan & Data](docs/13-keamanan-dan-data.md)                                       | PII, enkripsi, isolasi, UU PDP                                              |
| 14  | [Pengujian](docs/14-pengujian.md)                                                     | Billing, isolasi, visual regression, beban                                  |
| 15  | [Deploy & Infrastruktur](docs/15-deploy-dan-infrastruktur.md)                         | VPS, environment, CI/CD                                                     |
| 16  | [Landing Page & Legal](docs/16-landing-page-dan-legal.md)                             | Halaman publik, T&C, privasi                                                |
| 17  | [Model Harga & Kredit](docs/17-model-harga-dan-kredit.md)                             | Kredit, untung-rugi, keunggulan harga                                       |
| 18  | [Salinan Landing Page](docs/18-salinan-landing-page.md)                               | Teks landing siap tayang                                                    |
| 19  | [Diagram Alur](docs/19-diagram-alur.md)                                               | 3 sequence diagram: render, batch, top-up                                   |
| 20  | [Persiapan Development](docs/20-persiapan-development.md)                             | Tools, akun, env, run lokal                                                 |
| 21  | [Standar Kode & Best Practices](docs/21-standar-kode-dan-best-practices.md)           | SOLID, DRY, ports & adapters, aturan ledger, testing                        |
| 22  | [Internasionalisasi & Dua Bahasa](docs/22-internasionalisasi-dan-dua-bahasa.md)       | ID/EN, default per negara, switcher dari login                              |

Berkas pendukung: [`schemas/template-schemas.json`](schemas/template-schemas.json) (contoh bentuk data tiap template) dan folder [`examples/`](examples/) (template invoice + data + PDF hasil).

## Keputusan yang Sudah Dikunci

- **Model bisnis:** kredit prepaid — 100 dokumen gratis saat daftar, lalu top-up sesuai pakai, tanpa langganan.
- **Harga:** 1 kredit = sampai 5 halaman (kontrak 10 halaman = 2 kredit); mulai ~Rp 120/kredit, bayar Rupiah via QRIS/VA/e-wallet. Detail di dokumen 17.
- **Mesin render:** HTML → PDF via Chromium (Playwright). Mesin **"polos"**: tidak menghitung dan tidak memvalidasi isi — semua tanggung jawab di klien.
- **Aset (font/gambar):** ditempel base64 → worker render dikunci tanpa akses internet.
- **Pembayaran:** Midtrans.
- **Hosting:** VPS dengan Docker Compose.
- **Penyimpanan PDF:** object storage; masa simpan diatur per akun (bawaan 30 hari).
- **Login:** email + kata sandi atau akun Google; ada verifikasi email.
- **Audit saldo:** ledger append-only — saldo hanya berubah karena ada catatan transaksi.
- **Keamanan:** dienkripsi saat dikirim & disimpan, data terpisah per klien. (Bukan end-to-end encryption.)
- **Bahasa:** dua bahasa (Indonesia/Inggris); default dari negara tenant (ID → Indonesia, selain itu Inggris), dengan pemilih bahasa sejak halaman login. UI kita yang diterjemahkan, bukan isi dokumen PDF.

## Tech Stack

TypeScript (Node.js) · Fastify/NestJS · Redis + BullMQ · PostgreSQL · Playwright + Chromium · Cloudflare R2 / S3 · Midtrans · Docker di VPS.

## Urutan Build (ringkas, detail di dok 07)

1. Kerangka (repo, migrasi DB, health check)
2. Tenant & API key
3. Template + preview
4. Render 1 dokumen (sync) — inti JSON→PDF
5. Kredit prepaid
6. Top-up via Midtrans
7. Panel owner
8. Batch + keadilan
9. Webhook keluar
10. Pengerasan (log, isolasi, masa simpan, backup)

## Catatan

Teks legal (Syarat & Ketentuan, Kebijakan Privasi) dan kewajiban UU PDP sebaiknya ditinjau ahli hukum sebelum dipublikasikan — lihat dokumen 13 dan 16. Dokumen di repo ini perancangan teknis, bukan nasihat hukum.

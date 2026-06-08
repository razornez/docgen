# 01 — Arsitektur & Scope MVP

## Ringkasan Produk

Layanan generate dokumen massal berbasis API. Klien mengirim JSON, sistem mengembalikan PDF rapi sesuai template (invoice, sertifikat, kontrak, slip gaji, dan lainnya). Produk bersifat API-first: sekali klien mengintegrasikan endpoint ke sistem mereka, perpindahan menjadi mahal sehingga pemakaian berulang dan revenue lengket. Monetisasi memakai model prepaid credit — klien mendaftar, mendapat kredit gratis, tiap dokumen yang berhasil digenerate memotong saldo, dan klien bisa top-up kapan saja.

## Dua Keputusan Arsitektur Inti

Dua keputusan ini membentuk hampir seluruh desain sistem.

### 1. Rendering Engine: HTML/CSS → PDF

Output dirender dari HTML/CSS memakai headless Chromium (Playwright atau Puppeteer). Alasan pemilihan:

- Layout engine browser sudah sangat matang, sehingga output "rapi" mudah dicapai tanpa effort besar.
- Template bisa ditulis siapa pun yang paham HTML/CSS, dan preview praktis gratis.
- Templating dinamis memakai engine seperti Handlebars, Liquid, atau Jinja2: JSON masuk, di-interpolasi ke HTML, lalu dirender ke PDF.

Alternatif yang dipertimbangkan dan ditolak untuk tahap awal:

- **ReportLab / PDFKit** — kontrol penuh atas penempatan, tetapi authoring template sangat menyiksa dan lambat untuk iterasi desain.
- **LaTeX** — tipografi sangat baik, tetapi berat, lambat, dan kurva belajar tinggi.

### 2. Sinkron vs Asinkron

Karena kebutuhan inti adalah dokumen massal, pemrosesan batch adalah fitur utama, bukan tambahan.

- **Dokumen tunggal** dirender sinkron (request → PDF langsung), karena umumnya selesai di bawah ~2 detik.
- **Batch** wajib asinkron melalui antrian. Worker render rakus CPU dan memori serta lambat, jadi harus dipisah dari API layer. Tanpa pemisahan ini, satu klien yang menggenerate 10.000 slip gaji akan membekukan request klien lain.

## Diagram Alur Tingkat Tinggi

```
Client
  │  Authorization: Bearer sk_live_...
  ▼
API Gateway ── auth API key
            ── rate limit (token bucket per key)
            ── validasi JSON terhadap schema template
            ── cek & reserve saldo kredit (atomik)
  │
  ├── dokumen tunggal & cepat ──► render inline (sync) ──► commit/refund saldo
  │
  └── batch ──► enqueue job
                    │
                    ▼
              Queue (Redis/BullMQ atau SQS)
                    │
                    ▼
        Render Worker (Playwright, pool terbatas, autoscale)
                    │
                    ▼
        Object Storage (S3/R2/GCS) ──► signed URL berumur pendek
                    │
                    ▼
        Tulis transaksi ledger (debit) ──► agregasi usage
```

## Komponen Sistem

| Komponen | Tanggung jawab |
|---|---|
| API service | Auth, rate limit, validasi request terhadap schema, gerbang saldo, orkestrasi job |
| Template service | Menyimpan template (HTML + schema variabel + versi), preview, versioning |
| Render worker | Merender HTML→PDF dengan Chromium; terisolasi dari API; autoscale |
| Object storage | Menyimpan PDF hasil dan aset template; menerbitkan signed URL berumur pendek |
| Postgres | Data tenant, template, dokumen/job, ledger kredit, usage |
| Redis | Antrian job, rate limiting, gerbang saldo hot-path |
| Billing/credit module | Ledger kredit, reserve/commit/refund, top-up, rekonsiliasi |

## Model Data Tingkat Tinggi

```
tenants ─┬─ api_keys
         ├─ templates ── template_versions (immutable: html, variable_schema)
         ├─ documents / jobs (status, template_version, input_hash, output_url, charged)
         ├─ batches (status, total, completed, failed)
         ├─ wallets (balance, currency)
         ├─ wallet_transactions (ledger append-only: signup_bonus|topup|debit|refund)
         └─ usage_events (turunan untuk analitik & pelaporan)
```

Detail model kredit dan ledger ada di dokumen **03 — Sistem Kredit Prepaid**.

## Scope MVP

### Masuk MVP

- Auth via API key, rate limit per key (token bucket di Redis).
- Template berbasis HTML + schema variabel sederhana, plus endpoint preview. **Bukan** visual drag-and-drop builder.
- Endpoint generate tunggal (sync) dan batch (async dengan polling status).
- Render HTML→PDF via headless Chromium.
- Storage dengan signed URL berumur pendek.
- Sistem kredit prepaid: bonus pendaftaran, pemotongan per dokumen sukses, top-up via payment gateway.
- Ledger append-only dengan audit trail penuh.
- Pembedaan jelas antara batas komersial (`402`) dan rate limit (`429`).
- Mode test (key `sk_test_`) yang merender gratis dengan watermark.

### Ditunda dari MVP

- Visual template builder (scope raksasa tersendiri — mulai dari HTML mentah dulu).
- Paket langganan dengan kuota termasuk + overage (model pertumbuhan tahap berikutnya).
- Auto-invoicing dan proration saat ganti paket.
- Upload file data (NDJSON/CSV) untuk batch raksasa puluhan ribu dokumen.
- Multi-format output selain PDF, digital signature, internasionalisasi.
- Template faktur pajak / bukti potong yang patuh format resmi DJP (butuh ketelitian compliance).

## Titik Kematangan Engineering

Bagian ini adalah yang membedakan produk yang matang. Semua poin di bawah harus diperhatikan sejak awal walau implementasinya bertahap.

- **Metering correctness.** Dokumen ditagih hanya saat render sukses. Idempotency mencegah penghitungan ganda saat retry. Detail di dokumen 03.
- **Keamanan template (SSRF).** Jika klien mengirim HTML, Chromium bisa di-trick untuk fetch URL internal. Worker harus berjalan tanpa akses jaringan keluar; resource eksternal di-block atau di-allowlist. Detail di dokumen 04.
- **Resource discipline.** Chromium bocor memori seiring waktu. Set timeout per render, batasi konkurensi per worker, dan restart worker secara berkala.
- **Penanganan font.** Untuk output rapi dan dukungan karakter non-Latin atau font khusus klien, font harus tertanam dan tersedia di lingkungan worker.
- **PII.** Slip gaji dan kontrak berisi data sensitif. Enkripsi at-rest, signed URL berumur pendek, dan kebijakan retensi yang jelas.
- **Determinisme.** Input + versi template yang sama menghasilkan output identik. Ini membuka caching, dedup, dan membuat billing mudah diaudit.

## Stack Rekomendasi

Stack berikut pragmatis dan terbukti; bukan keharusan.

- **API service:** Node (Fastify/NestJS) atau Python (FastAPI).
- **Antrian:** Redis + BullMQ (Node) atau Celery/RQ (Python), atau SQS.
- **Render worker:** layanan terpisah berisi Playwright, di-autoscale, dengan pool dan timeout terbatas.
- **Database:** Postgres.
- **Cache & rate limit & gerbang saldo:** Redis.
- **Storage:** S3 / Cloudflare R2 / GCS.
- **Payment gateway:** Xendit atau Midtrans (QRIS, virtual account, e-wallet) untuk pasar Indonesia; Stripe untuk internasional.

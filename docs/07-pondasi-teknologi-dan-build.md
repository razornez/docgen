# 07 — Pondasi: Teknologi, Hosting, Struktur & Urutan Build

Dokumen ini mengunci keputusan teknis dasar agar tim bisa langsung mulai membangun.

## Pilihan Teknologi

Satu bahasa untuk semua: **TypeScript (Node.js)**, karena mesin render andalan (Playwright) dan antrian (BullMQ) keduanya paling mulus di Node — tim tidak perlu lompat-lompat bahasa.

| Bagian | Pilihan |
|---|---|
| API | NestJS (terstruktur) atau Fastify (ringan) |
| Antrian tugas | Redis + BullMQ (coba-ulang, dead-letter, prioritas, batas per grup) |
| Database | PostgreSQL (DDL ada di dokumen 05); akses lewat Prisma atau Drizzle |
| Penyimpanan file | S3 / Cloudflare R2 (atau MinIO bila ingin self-host di VPS) |
| Render | Playwright + Chromium, sebagai layanan worker terpisah |
| Pembayaran | **Midtrans** (Snap, VA, QRIS, e-wallet) |
| Wadah | Docker, dijalankan di **VPS** |

## Hosting di VPS

VPS cocok untuk MVP: murah dan sederhana. Untuk awal, satu VPS sudah cukup menjalankan semua komponen lewat Docker Compose (api + worker + Postgres + Redis). Yang perlu diperhatikan:

- **Ukuran RAM.** Worker Chromium boros memori (satu proses render bisa makan ratusan MB). Sediakan VPS yang cukup besar (mis. mulai 4–8 GB) dan batasi jumlah render bersamaan agar muat. Worker yang berat sebaiknya diberi porsi sumber daya lebih besar daripada api.
- **File di penyimpanan objek, bukan disk VPS.** Simpan PDF di S3/R2 (atau MinIO yang dipasang sendiri di VPS). Ini membuat file aman walau VPS di-restart, memudahkan signed URL, dan mencegah disk penuh.
- **Backup database manual.** Di VPS tidak ada backup otomatis seperti layanan terkelola. Pasang jadwal backup Postgres sendiri (mis. dump harian ke penyimpanan objek).
- **Keamanan dasar.** Hanya buka port API ke publik; Postgres dan Redis jangan bisa diakses dari luar. Pasang firewall.
- **Cara naik kelas (scaling).** Mulai dengan satu VPS. Saat ramai: pertama perbesar VPS-nya (lebih banyak RAM/CPU) dan tambah jumlah container worker. Kalau masih kurang, tambah VPS lain untuk worker, dengan Postgres dan Redis dipakai bersama. Autoscaling penuh bisa menyusul kalau memang perlu.

## Struktur Repo (monorepo)

Satu repo, beberapa bagian yang berbagi kode.

```
docgen/
├─ apps/
│  ├─ api/          → layanan HTTP: auth, terima request, reserve kredit, enqueue
│  ├─ worker/       → ambil tugas dari antrian, render PDF, simpan, potong kredit
│  └─ admin/        → panel owner: kelola tenant, saldo, top-up manual, dll.
├─ packages/
│  ├─ db/           → skema database + migrasi (dari DDL kita)
│  ├─ shared/       → tipe data & util bersama
│  └─ renderer/     → logika isi-template + cetak PDF (dipakai worker)
└─ docker-compose.yml  → Postgres + Redis untuk development lokal
```

Inti layanannya dua: **api** (cepat, tidak pernah mencetak) dan **worker** (berat, yang mencetak), berkomunikasi lewat Redis dan berbagi database. **admin** adalah antarmuka internal terpisah untuk owner.

## Panel Owner / Admin

Antarmuka internal terpisah dari API publik, dengan login sendiri (email + kata sandi, sebaiknya plus verifikasi dua langkah karena menyentuh uang). Diakses hanya oleh owner dan staf yang ditunjuk.

### Yang bisa dilakukan

- Melihat & mencari daftar tenant/klien yang mendaftar.
- Melihat detail satu tenant: saldo, riwayat transaksi (ledger), pemakaian, batch, dan dokumen.
- **Menambah saldo gratis** (promo / kompensasi).
- **Top-up manual** bila pembayaran klien bermasalah.
- Menyesuaikan atau mengembalikan kredit saat ada sengketa.
- Menangguhkan atau mengaktifkan kembali akun.
- Melihat riwayat pembayaran untuk menyelesaikan masalah.

### Aturan penting: perubahan saldo tetap lewat ledger

Saat owner menambah atau menyesuaikan saldo, sistem **tidak** mengedit angka saldo secara langsung. Perubahan tetap ditulis sebagai transaksi di ledger (jenis `adjustment`, atau `topup` untuk top-up manual), dalam satu transaksi database bersama perubahan saldo, sambil mencatat **siapa admin-nya dan apa alasannya** di bagian metadata. Dengan begitu jejaknya tetap utuh — selalu bisa dijawab "saldo ini ditambah oleh admin siapa, kapan, dan kenapa". Ini memakai mekanisme yang sama dengan dokumen 03, hanya sumbernya tindakan admin.

### Tabel tambahan (melengkapi DDL di dokumen 05)

```sql
-- akun internal owner/staf
CREATE TABLE admin_users (
  id             TEXT PRIMARY KEY,                 -- adm_...
  email          TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'staff'
                   CHECK (role IN ('owner', 'staff')),
  twofa_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'disabled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_admin_users_email ON admin_users (lower(email));

-- jejak tindakan admin yang bukan soal saldo (suspend, edit, dll.)
-- (perubahan saldo sudah terekam di wallet_transactions)
CREATE TABLE admin_actions (
  id           TEXT PRIMARY KEY,                   -- aac_...
  admin_id     TEXT NOT NULL REFERENCES admin_users(id),
  action       TEXT NOT NULL,                      -- mis. 'suspend_tenant'
  target_type  TEXT NOT NULL,                      -- 'tenant' | 'wallet' | ...
  target_id    TEXT NOT NULL,
  detail       JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_actions_target ON admin_actions (target_type, target_id);
```

### Cara membangun (cepat untuk MVP)

Untuk hemat waktu, panel ini bisa dibuat dengan kerangka admin siap pakai (mis. AdminJS yang cocok dengan Node + Prisma) yang otomatis membuat tampilan kelola data. **Tapi** operasi yang menyentuh saldo jangan dibiarkan mengedit tabel langsung — buatkan aksi khusus "tambah saldo" yang menulis ledger dengan benar. Sisanya (lihat data, suspend) boleh memakai CRUD bawaan.

## Pembayaran via Midtrans

Alur dan keamanannya sama dengan rancangan di dokumen 03, dengan detail khas Midtrans:

1. Klien memilih paket → sistem membuat transaksi ke Midtrans → dapat token/halaman bayar **Snap**.
2. Klien membayar (VA / QRIS / e-wallet).
3. Midtrans mengirim **notifikasi pembayaran** ke URL notifikasi kita.
4. Verifikasi **`signature_key`** pada notifikasi (cocokkan hash dari `order_id` + `status_code` + `gross_amount` + Server Key). Tolak bila tidak cocok.
5. **Konfirmasi balik** ke Midtrans lewat API status transaksi — jangan percaya notifikasi mentah.
6. Bila statusnya lunas, tulis transaksi `topup` di ledger (`ref_id` = `order_id`) bersama penambahan saldo. Karena `order_id` unik, notifikasi ganda aman.

Di tabel `payments`, `gateway` diisi `midtrans` dan `gateway_ref` diisi `order_id` Midtrans.

## Urutan Build (dari kosong sampai siap)

Disusun agar inti JSON→PDF jalan lebih dulu, baru ditempel urusan uang, panel, dan skala. Tiap tahap menghasilkan sesuatu yang bisa dicoba.

1. **Kerangka** — repo, migrasi database dari DDL, Postgres+Redis lokal, endpoint cek-sehat.
2. **Tenant & API key** — daftar, terbitkan key, cek key saat request.
3. **Template** — simpan HTML + (opsional) aturan + versi, plus endpoint preview.
4. **Render 1 dokumen (sync)** — inti produk: kirim JSON → dapat PDF. Belum ada kredit. Tulang punggung.
5. **Kredit prepaid** — dompet, ledger, reserve/commit/refund, lalu sambungkan ke render.
6. **Top-up via Midtrans** — Snap + notifikasi + verifikasi.
7. **Panel owner** — kelola tenant, tambah saldo (lewat ledger), top-up manual, suspend.
8. **Batch** — enqueue, worker pool, batas per klien, pengemasan zip/manifest, cek status.
9. **Webhook keluar** — beri tahu klien saat batch selesai.
10. **Pengerasan** — log, metrik, isolasi worker (SSRF), masa simpan file, backup.

Setelah tahap 4, produk sudah "hidup" untuk demo. Tahap 5–6 membuatnya menghasilkan uang. Tahap 7 memberi kontrol ke owner. Tahap 8 membuatnya massal.

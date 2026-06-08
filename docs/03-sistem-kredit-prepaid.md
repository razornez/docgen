# 03 — Sistem Kredit Prepaid

Model monetisasi: prepaid credit. Klien mendaftar dan menerima kredit gratis (mis. 100). Setiap dokumen yang berhasil digenerate memotong satu kredit. Klien dapat top-up kapan saja. Tidak ada risiko penagihan/collection karena klien membayar di muka.

## Prinsip Inti: Ledger-First, Saldo Adalah Turunan

Aturan paling penting dari seluruh sistem billing:

> **Saldo tidak pernah diubah tanpa menulis baris transaksi. Setiap perubahan saldo adalah hasil dari sebuah transaksi yang dicatat.**

Konsepnya bukan "update saldo lalu mungkin catat log", melainkan "catat transaksi, dan saldo mengikuti". Ledger (`wallet_transactions`) bersifat append-only dan menjadi **sumber kebenaran**. Kolom `wallets.balance` hanyalah running total yang dimaterialisasi agar pembacaan dan pengecekan saldo cepat.

Manfaatnya:

- **Audit trail aman.** Saldo tidak bisa berubah secara misterius. Setiap kredit yang masuk atau keluar punya satu baris yang menjelaskan kapan, berapa, jenisnya apa, dan untuk apa.
- **Bisa ditelusuri.** Karena tiap baris debit menyimpan referensi ke dokumen, kamu bisa menjawab "kredit ini dipakai untuk dokumen apa, milik klien mana, template apa, kapan".
- **Bisa direkonstruksi.** Bila kolom saldo rusak atau diragukan, saldo benar selalu bisa dihitung ulang dari jumlah seluruh transaksi.

### Nuansa Atomicity yang Wajib Benar

Insert baris ledger dan perubahan kolom saldo **harus terjadi dalam satu transaksi database yang sama**. Ini bukan dua langkah terpisah. Jika salah satu gagal, keduanya batal (rollback). Pengecekan "saldo cukup" dilekatkan pada operasi perubahan saldo, sehingga tidak mungkin saldo menjadi negatif atau terjual berlebih (oversell) walau ada banyak request bersamaan.

## Model Data

```
wallets(
  tenant_id      PK,
  balance        BIGINT NOT NULL DEFAULT 0,   -- running total (cache cepat)
  currency       TEXT   DEFAULT 'credit',
  updated_at     TIMESTAMPTZ
)

wallet_transactions(
  id             PK,                  -- txn_...
  tenant_id      FK,
  type           TEXT,                -- signup_bonus | topup | debit | refund | adjustment
  amount         BIGINT,              -- bertanda: +100, -1, +1
  balance_after  BIGINT,              -- snapshot saldo sesudah transaksi ini
  ref_type       TEXT,                -- document | payment | signup | manual
  ref_id         TEXT,                -- document_id | payment_id | tenant_id
  unit_price     INT DEFAULT 1,       -- biaya kredit per unit saat transaksi terjadi
  metadata       JSONB,               -- mis. { "template": "invoice", "batch_id": "..." }
  created_at     TIMESTAMPTZ,
  UNIQUE(type, ref_id)                -- kunci idempotency
)
```

### Kunci Idempotency: `UNIQUE(type, ref_id)`

Satu constraint ini menyelesaikan tiga masalah sekaligus:

- **debit** dengan `ref_id = document_id` → satu dokumen tidak bisa memotong saldo dua kali.
- **topup** dengan `ref_id = payment_id` → webhook gateway yang datang berkali-kali tidak menambah kredit berulang.
- **signup_bonus** dengan `ref_id = tenant_id` → bonus tidak bisa diberikan dua kali ke tenant yang sama.

### Traceability: Menelusuri Tiap Pengurangan Saldo

Karena setiap baris `debit` menyimpan `ref_type = 'document'` dan `ref_id = document_id`, riwayat pemakaian kredit dapat ditelusuri dengan menggabungkannya ke tabel dokumen:

```sql
SELECT t.created_at,
       t.amount,
       t.balance_after,
       d.id            AS document_id,
       d.template,
       d.batch_id
FROM wallet_transactions t
JOIN documents d ON d.id = t.ref_id
WHERE t.tenant_id = :tenant
  AND t.type = 'debit'
ORDER BY t.created_at DESC;
```

Hasilnya menjawab persis: "saldo turun 1 kredit pada jam sekian, untuk dokumen `doc_...` template invoice di dalam batch `batch_...`". Inilah audit trail yang diminta.

## Alur 1 — Pendaftaran: Bonus 100 Kredit

Saat tenant terbentuk (dan terverifikasi, lihat dokumen 04), tulis satu transaksi `signup_bonus` bernilai `+100`. Karena `UNIQUE(signup_bonus, tenant_id)`, pemberian ganda mustahil.

```
INSERT wallet_transactions(type='signup_bonus', amount=+100,
                           ref_type='signup', ref_id=<tenant_id>, ...)
  ── dalam transaksi DB yang sama dengan ──
UPDATE wallets SET balance = balance + 100 WHERE tenant_id = <tenant_id>
```

Opsi: beri masa kedaluwarsa pada kredit gratis (mis. 30 hari) untuk mendorong konversi ke top-up. Detail pencegahan abuse bonus ada di dokumen 04.

## Alur 2 — Generate: Pemotongan Saldo (Reserve → Commit → Refund)

Karena hanya dokumen sukses yang ditagih, pemotongan memakai pola tiga fase.

### Reserve (saat request masuk)

Operasi atomik tunggal: perubahan saldo dengan guard, di dalam satu transaksi DB bersama baris ledger.

```sql
-- guard mencegah saldo negatif & oversell
UPDATE wallets
SET balance = balance - :n
WHERE tenant_id = :t AND balance >= :n
RETURNING balance;          -- 0 baris dikembalikan → saldo kurang → 402
```

Bila berhasil, tulis baris ledger `debit` dengan `balance_after` dari nilai `RETURNING` di atas, semuanya dalam transaksi DB yang sama.

### Commit (render sukses)

Tidak ada perubahan saldo tambahan. Baris `debit` yang sudah ditulis saat reserve menjadi final, dan `output_url` diterbitkan.

### Refund (render gagal)

Tulis transaksi `refund` bernilai `+1` (dengan `ref_id` yang menautkan ke dokumen gagal) dan kembalikan saldo, dalam satu transaksi DB.

```sql
INSERT wallet_transactions(type='refund', amount=+1,
                           ref_type='document', ref_id=<document_id>, ...)
UPDATE wallets SET balance = balance + 1 WHERE tenant_id = :t
```

### Untuk Batch

Reserve seluruh N kredit saat submit (fail-fast bila saldo < N — jangan render separuh lalu kehabisan). Worker meng-commit per item yang sukses. Di akhir batch, refund sebanyak item yang gagal (N − M). `Idempotency-Key` pada request mencegah reservasi ganda saat klien melakukan retry.

## Alur 3 — Top-up Kapan Saja

Klien membeli paket kredit. Jual dalam beberapa paket dengan diskon volume (paket besar lebih murah per kredit) sebagai tuas harga.

```json
POST /v1/wallet/topups
{ "package": "pack_1000" }

→ 201
{
  "payment_id": "pay_…",
  "amount": 250000,
  "credits": 1000,
  "currency": "IDR",
  "payment_url": "https://…",       // VA / QRIS / e-wallet via Xendit/Midtrans
  "status": "pending"
}
```

### Keamanan Top-up — Hanya Kredit dari Webhook Terverifikasi

Aturan keras: **kredit hanya ditambahkan ketika webhook server-to-server dari gateway diterima dan diverifikasi — bukan ketika halaman "pembayaran sukses" muncul di browser klien.** Halaman redirect klien mudah dipalsukan.

Alur konfirmasi pembayaran:

1. Gateway mengirim webhook ke `POST /v1/webhooks/payments`.
2. Verifikasi signature webhook (HMAC) milik gateway.
3. Konfirmasi status pembayaran dengan memanggil balik API gateway (server-side) untuk `payment_id` tersebut.
4. Tulis transaksi `topup` dengan `ref_id = payment_id`, dalam satu transaksi DB bersama penambahan saldo.
5. Karena `UNIQUE(topup, payment_id)`, webhook ganda aman — yang kedua ditolak constraint tanpa efek.

## Endpoint Dompet

```
GET  /v1/wallet
→ { "balance": 87, "currency": "credit" }

GET  /v1/wallet/transactions          (cursor pagination)
→ { "data": [ { "id": "txn_…", "type": "debit", "amount": -1,
                "balance_after": 87, "ref_type": "document",
                "ref_id": "doc_…", "created_at": "…" } ],
    "has_more": true }

POST /v1/wallet/topups                 (lihat Alur 3)
POST /v1/webhooks/payments             (internal; verifikasi signature)
```

Setiap response generate juga menyertakan header `X-Credits-Remaining` agar klien selalu sadar posisinya. Webhook keluar `balance.low` dipicu saat saldo turun di bawah ambang (mis. 10 kredit) supaya klien top-up sebelum kena `402`, bukan setelah produksinya berhenti.

## Unit Billing

Default sederhana untuk launch: **1 kredit = 1 dokumen**. Kolom `unit_price` di ledger tetap memungkinkan sebagian template berharga lebih (mis. kontrak tebal = 2 kredit, atau penetapan per halaman) tanpa mengubah arsitektur. Apa pun pilihannya, deklarasikan unit secara eksplisit di dokumentasi API.

## Rekonsiliasi

Walau saldo dan ledger ditulis dalam satu transaksi DB, jalankan job rekonsiliasi berkala (mis. nightly) untuk ketenangan operasional:

- Pastikan `wallets.balance` sama dengan `SUM(amount)` seluruh `wallet_transactions` per tenant.
- Cocokkan jumlah transaksi `debit` dengan jumlah dokumen sukses di storage.
- Bila ada hot-path counter di Redis (untuk gerbang saldo cepat), cocokkan dengan ledger Postgres dan tangani drift.

## Ringkasan Titik Rawan

- Saldo = cache, **ledger = kebenaran**; keduanya berubah dalam satu transaksi DB atomik.
- Idempotency lewat `UNIQUE(type, ref_id)` untuk debit, topup, dan bonus.
- Decrement atomik dengan guard `balance >= n` — saldo tidak pernah negatif.
- Refund saat render gagal; reserve di muka untuk batch.
- Kredit hanya dari webhook terverifikasi, tidak pernah dari redirect klien.
- `402` saat saldo kurang, terpisah dari `429` rate limit.
- Rekonsiliasi berkala untuk menangkap drift.

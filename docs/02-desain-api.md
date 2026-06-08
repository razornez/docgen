# 02 — Desain API

Dokumen ini menjelaskan permukaan API publik. Desain bersifat resource-oriented dengan konvensi yang konsisten agar terasa matang dan mudah diintegrasikan.

## Prinsip Desain

- Semua endpoint di bawah prefix versi `/v1`.
- Autentikasi memakai header `Authorization: Bearer sk_live_...` (atau `sk_test_...` untuk mode test).
- Semua identifier memiliki prefix tipe: `tpl_`, `doc_`, `batch_`, `pay_`, `txn_`.
- Semua timestamp dalam format ISO 8601 UTC.
- Pagination memakai cursor (`?limit=&starting_after=`), bukan offset.
- Amplop error konsisten dengan `request_id` di setiap response.

## Permukaan Endpoint

```
POST   /v1/templates                 buat template
GET    /v1/templates/{id}            ambil template
GET    /v1/templates                 list template (cursor pagination)
POST   /v1/templates/{id}/versions   buat versi baru (immutable)
POST   /v1/templates/{id}/preview    render data contoh; tidak ditagih

POST   /v1/documents                 generate 1 dokumen (sync)
GET    /v1/documents/{id}            ambil status + terbitkan signed URL baru

POST   /v1/batches                   generate massal (async)
GET    /v1/batches/{id}              poll progress
GET    /v1/batches/{id}/documents    hasil per-item (paginated)

GET    /v1/wallet                    saldo kredit terkini
GET    /v1/wallet/transactions       ledger transaksi (cursor pagination)
POST   /v1/wallet/topups             buat top-up, balikkan payment_url
GET    /v1/usage                     agregasi pemakaian

POST   /v1/webhooks/payments         callback gateway (internal, verifikasi signature)
```

Detail endpoint dompet dan pembayaran ada di dokumen **03 — Sistem Kredit Prepaid**.

## Template dan Kontrak Schema

Template menyimpan `body` (HTML) **dan** `schema` (JSON Schema variabel). Schema adalah kontrak: payload `data` dari klien divalidasi terhadapnya sebelum render. Versi template bersifat immutable; klien dapat mem-pin versi agar output tidak berubah diam-diam.

```json
POST /v1/templates
{
  "name": "invoice-standard",
  "engine": "html",
  "body": "<html>…{{customer.name}}…</html>",
  "schema": {
    "type": "object",
    "required": ["customer", "items"],
    "properties": { "customer": {}, "items": {} }
  }
}

→ 201
{
  "id": "tpl_8x2…",
  "name": "invoice-standard",
  "version": 1,
  "created_at": "2026-06-04T12:00:00Z"
}
```

Registry JSON Schema untuk seluruh template tersedia terpisah dalam `template-schemas.json`.

## Dokumen Tunggal — Sinkron

Render satuan dilakukan sinkron. Header `Idempotency-Key` wajib didukung untuk mencegah render dan pemotongan saldo ganda saat terjadi timeout jaringan.

```json
POST /v1/documents
Idempotency-Key: 1f3c8a90-…    (UUID dari klien)
{
  "template": "invoice-standard",
  "version": 3,
  "data": { "customer": {}, "items": [] },
  "options": { "format": "pdf", "page_size": "A4" }
}

→ 201
{
  "id": "doc_8x2…",
  "status": "completed",
  "template": "invoice-standard",
  "version": 3,
  "output_url": "https://…signed…",
  "expires_at": "2026-06-04T12:30:00Z",
  "credits_charged": 1,
  "created_at": "2026-06-04T12:00:00Z"
}
```

`output_url` adalah signed URL berumur pendek. Untuk meminta URL baru tanpa render ulang dan tanpa pemotongan saldo ulang, klien memanggil `GET /v1/documents/{id}`.

Header `X-Credits-Remaining` disertakan di setiap response generate agar klien selalu sadar posisi saldonya.

## Batch — Asinkron

Pemrosesan massal tidak boleh sinkron. Server mengembalikan `202` lalu klien melakukan polling atau menerima webhook.

```json
POST /v1/batches
{
  "template": "payslip-2025",
  "version": 5,
  "items": [
    { "ref": "emp_001", "data": {} },
    { "ref": "emp_002", "data": {} }
  ],
  "webhook_url": "https://klien/hooks/…"
}

→ 202
{
  "id": "batch_a91…",
  "status": "processing",
  "total": 2,
  "completed": 0,
  "failed": 0,
  "credits_reserved": 2
}
```

Status agregat batch: `queued | processing | completed | partially_failed | failed`. Satu item gagal tidak menjatuhkan seluruh batch — tiap item memiliki status dan error sendiri, dan **hanya item sukses yang memotong saldo**. Kredit di-reserve sebanyak total item saat submit (fail-fast bila saldo kurang), lalu di akhir batch saldo dikembalikan sebanyak item yang gagal.

```json
GET /v1/batches/{id}
{
  "id": "batch_a91…",
  "status": "partially_failed",
  "total": 2,
  "completed": 1,
  "failed": 1,
  "credits_charged": 1,
  "results_url": "https://…manifest.ndjson…"
}
```

`GET /v1/batches/{id}/documents` mengembalikan hasil per-item terpaginasi, memetakan `ref` → `output_url` atau error.

Catatan scaling: `items` inline cukup untuk batch kecil (beri batas, mis. 500 item). Untuk puluhan ribu dokumen, jalur pertumbuhannya adalah upload file data (NDJSON/CSV) lalu mengirim referensinya. Ini ditunda dari MVP.

## Webhooks

Sistem mengirim webhook untuk peristiwa penting, ditandatangani dengan HMAC sehingga penerima dapat memverifikasi keasliannya.

- `batch.completed`, `batch.partially_failed`, `batch.failed`
- `balance.low` (saldo di bawah ambang, mis. 10 kredit)
- `document.failed`

## Error Model

Satu amplop untuk semua error, selalu menyertakan `request_id` untuk debugging.

```json
{
  "error": {
    "type": "schema_validation_error",
    "message": "data.items harus array tidak kosong",
    "param": "data.items",
    "request_id": "req_77…"
  }
}
```

Pemetaan kode HTTP yang penting dibedakan:

| Kode | Makna |
|---|---|
| `400` | Request malformed (JSON rusak, field wajib hilang) |
| `401` | API key tidak valid atau hilang |
| `402` | Saldo kredit tidak cukup — perlu top-up |
| `404` | Resource tidak ditemukan |
| `409` | Konflik idempotency (key sama, body berbeda) |
| `422` | Payload `data` tidak sesuai schema template (sertakan `param`) |
| `429` | Rate limit terlampaui (sertakan `Retry-After`) |
| `5xx` | Kesalahan server |

Pembedaan `402` dan `429` penting: `429` berarti "pelan-pelan, coba lagi"; `402` berarti "saldo habis, lakukan top-up". Keduanya bisa menyala independen.

## Rate Limit Headers

Setiap response menyertakan header rate limit yang konsisten:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (hanya pada response `429`)

## Idempotency

`Idempotency-Key` didukung pada semua POST yang menghasilkan dokumen (`/v1/documents`, `/v1/batches`). Server menyimpan map key → response selama 24 jam. Retry akibat timeout mengembalikan response asli, bukan melakukan render dan pemotongan saldo dua kali. Jika key yang sama dipakai dengan body berbeda, server merespons `409`.

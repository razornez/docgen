# 19 — Diagram Alur (Sequence)

Diagram urutan untuk melengkapi dokumen arsitektur (01). Ditulis dalam Mermaid sehingga tampil otomatis di GitHub dan bisa disunting sebagai teks.

## 1. Render Dokumen Tunggal (Sinkron)

```mermaid
sequenceDiagram
    autonumber
    participant C as Klien
    participant API as API
    participant DB as Database
    participant R as Renderer
    participant S as Storage
    C->>API: POST /v1/documents (template, data)
    API->>API: Cek API key + rate limit
    API->>DB: Reserve kredit (atomik, saldo >= n)
    alt Saldo tidak cukup
        DB-->>API: gagal
        API-->>C: 402 saldo kurang
    else Saldo cukup
        DB-->>API: kredit dipesan
        API->>R: Isi template, render HTML ke PDF
        alt Render sukses
            R-->>API: PDF + jumlah halaman
            API->>S: Simpan PDF
            API->>DB: Potong kredit sesuai halaman
            API-->>C: 201 + tautan unduh
        else Render gagal
            R-->>API: error
            API->>DB: Kembalikan kredit (refund)
            API-->>C: error (saldo tidak dipotong)
        end
    end
```

## 2. Generate Massal (Batch, Asinkron)

```mermaid
sequenceDiagram
    autonumber
    participant C as Klien
    participant API as API
    participant Q as Antrian
    participant W as Worker
    participant S as Storage
    participant DB as Database
    C->>API: POST /v1/batches (template, items)
    API->>DB: Reserve N kredit (fail-fast bila kurang)
    API->>Q: Masukkan N tugas
    API-->>C: 202 (batch diterima, beri batch_id)
    loop Tiap tugas (paralel, batas per klien)
        Q->>W: Ambil tugas
        W->>S: Simpan PDF hasil
        W->>DB: Potong / kembalikan kredit per item
    end
    W->>API: Batch selesai
    API-->>C: Webhook batch.completed
    C->>API: GET hasil batch
    API-->>C: Tautan unduh (manifest / zip)
```

## 3. Top-up Saldo (Midtrans)

```mermaid
sequenceDiagram
    autonumber
    participant C as Klien
    participant API as API
    participant M as Midtrans
    participant DB as Database
    C->>API: POST /v1/wallet/topups (paket)
    API->>M: Buat transaksi
    M-->>API: Halaman bayar (Snap)
    API-->>C: payment_url
    C->>M: Bayar (QRIS / VA / e-wallet)
    M->>API: Webhook notifikasi pembayaran
    API->>API: Verifikasi signature
    API->>M: Konfirmasi status transaksi (jangan percaya notifikasi mentah)
    alt Lunas
        API->>DB: Tambah saldo via ledger (topup, ref = order_id)
        API-->>M: 200 OK
    end
```

Catatan: detail tiap langkah ada di dokumen terkait — render & kredit (00, 03, 08), batch & keadilan (06), serta pembayaran (03, 07).

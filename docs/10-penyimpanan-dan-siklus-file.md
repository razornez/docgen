# 10 — Penyimpanan & Siklus File

Dokumen ini mengurus PDF hasil cetak — dari dibuat, disajikan ke klien, sampai dihapus. (Template tetap di database; ini khusus file PDF.)

## Di Mana & Bagaimana Disimpan

PDF hasil disimpan di penyimpanan objek (Cloudflare R2 / S3 / MinIO), **bersifat privat** — tidak bisa diakses lewat tautan terbuka. Tiap file diberi penamaan rapi per tenant, misalnya:

```
{tenant_id}/{tahun}/{bulan}/{doc_id}.pdf
```

Penamaan per tenant memudahkan pemisahan antar klien dan pengelolaan masa simpan.

## Tautan Unduh Berumur Pendek

Karena file privat, saat klien mengunduh, sistem membuatkan **tautan sementara yang otomatis kedaluwarsa** (misalnya beberapa jam). Tautan ini:

- **Tidak disimpan** — dibuat baru tiap kali diminta lewat `GET /v1/documents/{id}`.
- **Berumur pendek** demi keamanan: dokumen seperti slip gaji dan kontrak berisi data pribadi, jadi tautannya tidak boleh berlaku selamanya bila bocor atau ter-forward.
- Bisa diminta ulang kapan saja **tanpa mencetak ulang**, sehingga tidak memotong kredit lagi.

## Masa Simpan: Diatur Per Akun

Tiap klien mengatur sendiri berapa lama PDF-nya disimpan, lewat dashboard.

- **Nilai bawaan** untuk akun baru: 30 hari (aman untuk data sensitif dan hemat).
- **Pilihan** yang disediakan: misalnya 7 / 30 / 90 / 365 hari, atau "simpan selamanya" (klien menghapus sendiri bila perlu).
- Opsi "selamanya" diberi catatan bahwa biaya penyimpanan terus bertambah dan data pribadi makin lama mengendap.

### Cara kerjanya

Karena masa simpan berbeda-beda per akun, pembersihan dijalankan oleh **tugas terjadwal** (misalnya harian) yang menghapus file yang sudah melewati batas masing-masing akun, beserta menandai catatannya. Ini lebih luwes daripada aturan hapus-otomatis bawaan penyimpanan yang biasanya seragam satu bucket.

### Efek mengubah pengaturan

- Memperpendek masa simpan → file lama yang sudah lewat batas akan terhapus pada pembersihan berikutnya.
- Memperpanjang masa simpan → hanya berlaku untuk file yang masih ada; file yang sudah terlanjur dihapus tidak bisa dikembalikan.

### Tambahan pada data model (melengkapi DDL dokumen 05)

```sql
-- masa simpan PDF per tenant, dalam hari; NULL = simpan selamanya
ALTER TABLE tenants ADD COLUMN retention_days INT DEFAULT 30;
```

## Pengemasan Hasil Batch

Untuk batch besar, hasilnya dikemas jadi satu paket setelah selesai:

- **Daftar (manifest)** — satu berkas berisi pasangan "ref dokumen → tautan unduhnya", cocok bila klien memprosesnya kembali secara otomatis.
- **Satu file zip** — semua PDF dibungkus jadi satu unduhan. Zip dibangun dengan cara mengalirkan file satu per satu (streaming) agar tidak memuat 1000 PDF ke memori sekaligus. Zip ini juga disimpan sebagai satu objek dengan tautan sementara sendiri, dan tunduk pada masa simpan akun yang sama.

## Pembersihan & Kasus Khusus

- **Akun ditutup** → seluruh file klien dihapus (demi data pribadi).
- **Render gagal** → tidak menyimpan file apa pun.
- Penyimpanan objek seperti R2 menarik karena tidak mengenakan biaya unduh (egress), padahal kita banyak menyajikan PDF.

## Catatan untuk Nanti

Karena template + data yang sama selalu menghasilkan PDF identik (lihat prinsip determinisme di dokumen 01), kita bisa memilih **tidak menyimpan PDF lama-lama dan membuatnya ulang saat diperlukan** — hemat penyimpanan dan mengurangi data sensitif yang mengendap. Untuk awal, menyimpan dengan batas waktu per akun lebih sederhana; opsi buat-ulang bisa jadi optimasi belakangan.

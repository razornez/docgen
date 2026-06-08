# 14 — Pengujian

## Kenapa Perlu

Sistem ini menyentuh uang (kredit) dan menghasilkan dokumen resmi. Bug bisa mahal: salah potong kredit, atau mencetak 1000 invoice yang rusak sekaligus. Pengujian membuat masalah ketahuan sebelum sampai ke klien.

## Tingkatan Pengujian

- **Unit** — menguji potongan kecil sendiri-sendiri: hitungan kredit, logika idempotency, pengisian variabel template, verifikasi tanda tangan webhook.
- **Integrasi** — menguji bagian-bagian bekerja sama: alur penuh "kirim JSON → dapat PDF", pemotongan kredit dari ujung ke ujung, top-up menambah saldo, alur batch.
- **End-to-end** — menelusuri jalur sungguhan: API → antrian → worker → penyimpanan.

## Yang Wajib Diuji Khusus untuk Sistem Ini

Empat ini paling penting karena dampaknya besar:

### 1. Kebenaran billing (uang)

- Reserve → commit memotong **tepat satu kali**.
- Render gagal **mengembalikan** kredit.
- Idempotency: permintaan sama dua kali tidak memotong dua kali; webhook pembayaran ganda tidak menambah kredit dua kali.
- **Uji balapan (concurrency):** banyak permintaan bersamaan terhadap saldo tipis — pastikan saldo tidak pernah minus dan tidak terjual berlebih.
- Batch: pesan N, M berhasil, kembalikan N−M.

### 2. Pemisahan data antar-klien

Uji eksplisit bahwa klien A **tidak bisa** menyentuh dokumen, template, atau saldo klien B. Ini pengaman kebocoran data yang harus benar-benar dipastikan (lihat dokumen 13).

### 3. PDF tidak berubah tak sengaja (visual regression)

Setiap kali kode atau mesin diubah, ada risiko tampilan PDF ikut berubah tanpa sengaja — misalnya perubahan kecil yang diam-diam merusak tata letak invoice semua klien.

Caranya: render template + data yang sudah dikenal, lalu **bandingkan hasilnya dengan PDF acuan yang sudah disimpan**. Kalau berbeda, pengujian menandainya, dan kamu memutuskan apakah perubahan itu memang disengaja. Ini mencegah desain rusak tanpa ketahuan.

### 4. Uji beban batch (load test)

Sebelum klien sungguhan melakukannya, simulasikan batch besar (1000+ dokumen) dan banyak klien berbarengan, untuk memeriksa: apakah sistem tetap responsif? apakah aturan keadilan (batas per klien) bekerja? apakah antrian habis terkuras? Dari sini ketahuan berapa worker yang dibutuhkan dan di titik mana sistem mulai kewalahan — sebelum hal itu terjadi di dunia nyata.

## Pengujian Lain yang Berguna

- Respons error memakai kode yang benar (`402` saldo, `429` rate limit, `422` data, dan seterusnya).
- Tanda tangan & coba-ulang webhook.
- Auth: key tidak valid/dicabut ditolak; mode test vs live berperilaku benar.
- Tautan unduh berumur pendek benar-benar kedaluwarsa.

## Data & Lingkungan Uji

- Pakai key mode test (`sk_test_`) dan lingkungan uji terpisah.
- **Jangan menguji dengan data produksi.** Gunakan data palsu, tanpa data pribadi sungguhan.
- Pakai **sandbox Midtrans** untuk menguji pembayaran tanpa uang sungguhan.

## Dijalankan Otomatis (CI)

Pengujian dijalankan otomatis tiap kali kode berubah, sebelum dirilis — supaya regresi tidak ikut terkirim ke produksi.

## MVP vs Nanti

**Masuk MVP:**
- Uji kebenaran billing (termasuk uji balapan & idempotency).
- Uji pemisahan data antar-klien.
- Visual regression untuk template-template utama.
- Uji integrasi alur inti JSON→PDF→kredit.
- Uji beban batch dasar.
- Semua dijalankan otomatis di CI.

**Nanti:**
- Visual regression menyeluruh untuk semua template.
- Uji beban berkelanjutan dan uji ketahanan (chaos).
- Uji penetrasi keamanan oleh pihak luar.

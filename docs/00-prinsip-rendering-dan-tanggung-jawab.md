# 00 — Prinsip Rendering & Pembagian Tanggung Jawab

Dokumen ini menegaskan satu keputusan desain mendasar yang memengaruhi seluruh sistem. **Baca ini lebih dulu.** Bila ada bagian di dokumen lain yang bertentangan dengan prinsip di sini, prinsip ini yang berlaku.

## Keputusan Inti

**Mesin render bersifat "polos" (pure passthrough).** Tugasnya hanya menempelkan nilai dari JSON ke template, apa adanya. Mesin **tidak** menghitung, **tidak** memvalidasi isi, dan **tidak** mengubah format apa pun.

Apa pun yang dikirim klien, itulah yang tercetak. Klien kirim `total: 77700000`, tercetak `77700000`. Klien kirim tanggal `10/05/2026`, tercetak `10/05/2026`.

## Yang Dilakukan Sistem

Sistem hanya melakukan tiga hal sederhana saat merender:

1. **Mengisi variabel** — mengganti `{{nama}}` dengan nilai yang sama dari JSON.
2. **Mengulang daftar** — `{{#each items}}` diulang sebanyak isi daftar yang dikirim.
3. **Membiarkan kosong bila tidak ada** — kalau sebuah variabel tidak dikirim, bagian itu dibiarkan kosong, bukan menyebabkan error.

Sistem **tidak** melakukan:

- Perhitungan apa pun (subtotal, pajak, total, perkalian harga × jumlah).
- Validasi isi data (tidak ada pengecekan wajib-isi, tipe angka, format tanggal, email, dan sebagainya).
- Pemformatan tampilan (tidak mengubah `18000000` menjadi `Rp 18.000.000`, tidak mengubah format tanggal).

Karena mesin tidak menghitung apa pun, tidak ada field yang "harus berupa angka" dari sisi mesin — semuanya diperlakukan sebagai teks yang ditempel.

## Tanggung Jawab Klien

Seluruh kebenaran data ada di sisi klien. Sebelum mengirim, klien bertanggung jawab penuh untuk:

- **Menghitung sendiri** seluruh nilai turunan (subtotal, diskon, pajak, total) dan mengirimnya sebagai angka jadi di dalam JSON.
- **Memformat sendiri** tampilan yang diinginkan (tanggal, mata uang, dan lainnya) sebelum dikirim, bila ingin tampil dengan gaya tertentu.
- **Memastikan kelengkapan dan kebenaran** data yang dikirim.
- **Menentukan apa yang muncul** lewat template HTML mereka sendiri. Bila `{{subtotal}}` dipasang di template, baris itu tampil; bila tidak, tidak muncul.

## Implikasi

- **Tidak ada tanggung jawab di sisi sistem atas kesalahan input.** Jika klien salah hitung, salah ketik, atau mengirim data tidak lengkap, dokumen tetap tercetak sesuai yang dikirim. Kesalahan tersebut sepenuhnya tanggung jawab klien.
- **Render yang berhasil tetap memotong kredit.** Karena sistem tidak menilai benar atau salahnya isi, satu dokumen yang berhasil dicetak tetap memotong satu kredit walau isinya keliru menurut klien. Ini perlu dinyatakan jelas ke klien.
- **Mesin bersifat universal.** Karena hanya menempel nilai, mesin yang sama melayani invoice, sertifikat, kontrak, slip gaji, dan jenis dokumen apa pun tanpa perlu mengerti isinya. Ini menyederhanakan sistem dan memudahkan penambahan jenis dokumen baru.

## Yang Perlu Dinyatakan ke Klien (Syarat Layanan)

Karena tanggung jawab kebenaran data ada di klien, hal-hal berikut sebaiknya dituliskan eksplisit dalam syarat layanan:

- Klien bertanggung jawab penuh atas keakuratan, kelengkapan, dan format data yang dikirim.
- Sistem menampilkan data apa adanya tanpa verifikasi, perhitungan, atau koreksi.
- Dokumen yang berhasil dirender memotong kredit, terlepas dari benar atau salahnya isi menurut klien.

## Catatan Penyelarasan dengan Dokumen Lain

Beberapa dokumen sebelumnya ditulis sebelum keputusan ini final, sehingga ada bagian yang perlu dibaca dalam terang prinsip ini:

- **01 — Arsitektur & Scope MVP** menyebut mesin "boleh menghitung dari qty × unit_price". Dengan prinsip ini, mesin **tidak** menghitung; klien yang mengirim nilai jadi.
- **02 — Desain API** dan **03 — Sistem Kredit Prepaid** menyebut alur validasi schema yang menolak data dengan kode `422`. Dengan prinsip ini, validasi isi **dimatikan** secara default. Registry aturan di `template-schemas.json` boleh tetap disimpan sebagai dokumentasi bentuk data yang disarankan, tetapi tidak dipakai untuk menolak request.
- Bagian billing prepaid lainnya (ledger, idempotency, reserve/refund, top-up) **tetap berlaku penuh** dan tidak terpengaruh keputusan ini.

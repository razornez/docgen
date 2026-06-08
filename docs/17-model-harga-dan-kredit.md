# 17 — Model Harga & Kredit

Model harga lengkap: konversi kredit, perhitungan dokumen panjang, untung-rugi, dan poin keunggulan landing. Angka ilustratif, validasi ke biaya nyata sebelum diumumkan.

## Model Kredit

- **1 kredit = sampai 5 halaman** (dibulatkan ke atas). 1–5 halaman = 1 kredit, 6–10 halaman = 2 kredit, dan seterusnya.
- **Mayoritas dokumen ≤5 halaman** (invoice, sertifikat, slip gaji, kwitansi), jadi untuk kebanyakan pengguna tetap **1 kredit = 1 dokumen**.
- **Dokumen panjang dihitung wajar:** kontrak 10 halaman = 2 kredit, 12 halaman = 3 kredit. Adil ke kita tanpa membuat dokumen panjang jadi mahal.
- **Semua jenis dokumen bertarif sama** (per kredit), karena biaya kita ditentukan proses render per halaman, bukan jenis dokumennya.
- **100 kredit gratis saat daftar ≈ 100 dokumen gratis** (untuk dokumen ≤5 halaman).

Struktur "1 kredit per 5 halaman" ini juga **standar industri**, sehingga mudah dibandingkan dengan kompetitor — bedanya angka Rupiah kita lebih murah.

## Cara Menghitung & Catatan Implementasi

Jumlah halaman baru diketahui **setelah** render. Kredit difinalisasi setelah cetak:

1. **Reserve** minimal saat permintaan masuk (untuk memastikan ada saldo).
2. **Render**, hitung jumlah halaman, lalu kredit = pembulatan ke atas (jumlah halaman ÷ 5).
3. **Potong saldo** sesuai kredit aktual, sesuaikan selisih dari reservasi.

Sistem sudah siap: tiap dokumen mencatat `page_count`, dan ledger menyimpan jumlah kredit aktual per transaksi.

## Harga Paket Kredit (Ilustratif, Rupiah)

Kurs acuan ~Rp18.000/USD. Diskon volume.

| Paket | Harga/kredit (≤5 halaman) | Harga total | Cocok untuk |
|---|---|---|---|
| 1.000 kredit | ~Rp 300 | Rp 300.000 | pengguna kecil |
| 10.000 kredit | ~Rp 200 | Rp 2.000.000 | bisnis menengah |
| 100.000 kredit | ~Rp 120 | Rp 12.000.000 | volume besar |

- **Minimum top-up** (mis. Rp 50.000) agar tidak habis dimakan biaya Midtrans.
- Saldo **tidak hangus**, **tanpa langganan**.

## Hitungan Untung-Rugi

Asumsi: VPS ~Rp 500.000/bulan melayani ~100.000 halaman/bulan; biaya ~Rp 6/halaman → **~Rp 30/kredit** (5 halaman). Biaya Midtrans ~0,7% pada top-up.

| Paket | Harga/kredit | Margin/kredit | Margin |
|---|---|---|---|
| 1.000 | Rp 300 | ~Rp 268 | ~89% |
| 10.000 | Rp 200 | ~Rp 169 | ~84% |
| 100.000 | Rp 120 | ~Rp 89 | ~74% |

Contoh biaya ke klien (harga tengah Rp 200/kredit): 1–5 halaman = Rp 200; 10 halaman = Rp 400; 12 halaman = Rp 600.

**Titik impas** satu VPS (Rp 500.000/bulan): ~3.000 kredit/bulan. Margin lebar, titik impas rendah — tantangan utamamu menggaet pengguna, bukan biaya per halaman.

## Keunggulan untuk Landing Page

- **100 dokumen gratis saat daftar** — coba tanpa bayar.
- **Bayar sesuai pakai, tanpa langganan** — saldo tidak hangus.
- **Harga transparan** — 1 kredit per 5 halaman, semua jenis sama, mulai ~Rp 120.
- **Bayar Rupiah** lewat QRIS / VA / e-wallet — tanpa kartu, tanpa biaya kurs.
- **Lebih hemat** dari layanan global yang menagih dolar lewat kartu.

## Catatan

- Angka ilustratif; **validasi ke biaya nyata** sebelum diumumkan.
- Harga murah bukan satu-satunya senjata; pasangkan dengan nilai lokal.
- Bonus gratis rawan disalahgunakan — andalkan verifikasi (dokumen 04).

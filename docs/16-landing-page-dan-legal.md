# 16 — Landing Page & Halaman Legal

Prinsip: **simpel tapi berguna.** Tujuannya bukan tampil mewah, melainkan menjelaskan produk dengan jelas dan memudahkan orang mendaftar. Hindari desain berlebihan.

## Tujuan Landing Page

Halaman publik (tanpa login) yang:

- Menjelaskan produk dalam sekejap.
- Menunjukkan manfaat utamanya.
- Mengarahkan pengunjung untuk mendaftar/mencoba.
- Menyediakan tautan ke dokumentasi dan halaman legal.

## Bagian Landing Page

1. **Hero (paling atas)** — satu kalimat nilai jelas, misalnya "Generate dokumen massal lewat API — kirim JSON, dapat PDF rapi", dengan tombol **Daftar / Coba gratis**.
2. **Fitur** — beberapa poin ringkas:
   - API bersih dan mudah diintegrasikan.
   - Template HTML custom sepenuhnya milik klien.
   - Generate massal — ribuan dokumen sekaligus.
   - Bayar sesuai pakai (prepaid), mulai dengan **100 kredit gratis**.
   - Aman — data dienkripsi saat dikirim dan saat disimpan, serta terpisah antar klien.
3. **Cara kerja (3 langkah)** — Buat template → Kirim data JSON → Dapat PDF.
4. **Harga ringkas** — 100 kredit gratis saat daftar, lalu top-up sesuai pakai. (Rincian harga bisa di halaman terpisah.)
5. **Ajakan daftar (CTA)** — ulang tombol daftar.
6. **Footer** — tautan ke **Syarat & Ketentuan**, **Kebijakan Privasi**, **dokumentasi API**, dan **kontak/dukungan**.

## Keamanan (untuk Ditonjolkan)

Bagian kepercayaan yang bisa ditampilkan di landing — semua klaim ini benar:

- Data dienkripsi **saat dikirim** (HTTPS) dan **saat disimpan** (at rest).
- **Data tiap klien terpisah** — satu klien tidak bisa melihat data klien lain.
- **Tautan unduh berumur pendek** demi melindungi dokumen sensitif.
- Kata sandi dan API key disimpan **teracak (hash)**, bukan polos.
- **Worker render terisolasi tanpa akses internet keluar.**
- Backup terjadwal.

**Jangan** memakai istilah "end-to-end encryption". Itu bermakna teknis bahwa penyedia pun tidak bisa membaca data, padahal sistem kita harus membaca data untuk mencetak PDF. Klaim itu akan menyesatkan dan berisiko. Gunakan "dienkripsi saat dikirim dan saat disimpan" yang akurat.

## Salinan Siap Pakai: Fitur & Keunggulan

Teks ini bisa langsung dipasang di landing.

### Fitur

- **Kirim JSON, dapat PDF rapi** lewat satu panggilan API.
- **Template HTML sepenuhnya milikmu** — bebas atur desain, font, dan logo.
- **Generate massal** — ribuan dokumen sekali jalan.
- **100 dokumen gratis** untuk mulai, lalu bayar sesuai pakai.
- **Aman** — data dienkripsi saat dikirim & saat disimpan, dan terpisah antar klien.
- **Bayar lokal** — QRIS, Virtual Account, atau e-wallet dalam Rupiah.

### Kenapa Pilih Kami Dibanding Penyedia Lain

| | Kami | Penyedia global pada umumnya |
|---|---|---|
| Pembayaran | Rupiah — QRIS, VA, e-wallet | Kartu kredit, USD |
| Model | Prepaid, bayar sesuai pakai, saldo tidak hangus | Langganan bulanan |
| Gratis di awal | 100 dokumen | 20–50 dokumen/bulan |
| Harga | 1 kredit per 5 halaman, mulai ~Rp 120 | ~Rp 300–2.000 per dokumen |
| Dokumen khas Indonesia | Faktur pajak, slip gaji, surat jalan | Umumnya tidak |
| Bahasa & dukungan | Bahasa Indonesia, lokal | Inggris |

Pesan utama: **harga lebih hemat, bayar dalam Rupiah tanpa langganan, dan paham kebutuhan dokumen Indonesia.** (Detail model harga di dokumen 17.)

## Daftar / Masuk

Dari landing, pengunjung bisa mendaftar/masuk lewat **email + kata sandi** atau **akun Google** (lihat dokumen 09). Untuk pendaftaran email, ada **verifikasi email** sebelum akun aktif dan bonus cair; akun Google langsung terverifikasi.

## Halaman Legal

Dua halaman ini penting dan isinya harus mencerminkan keputusan yang sudah kita kunci.

### Syarat & Ketentuan

Poin yang perlu tercakup:

- **Tanggung jawab data ada di klien** — sistem menampilkan data apa adanya tanpa memvalidasi atau menghitung; keakuratan dan kelengkapan adalah tanggung jawab klien (lihat dokumen 00).
- **Kredit dipotong untuk dokumen yang berhasil dicetak**, terlepas dari benar atau salahnya isi menurut klien (lihat dokumen 00 & 03).
- **Kredit prepaid tidak dapat dicairkan kembali menjadi uang** (lihat dokumen 04).
- **Larangan penyalahgunaan** — tidak boleh membuat dokumen menyesatkan atau melanggar hukum, dengan hak penangguhan akun (lihat dokumen 04).

### Kebijakan Privasi

Poin yang perlu tercakup:

- Data apa yang dikumpulkan dan untuk apa.
- Peran: umumnya **klien sebagai pengendali data, layanan kita sebagai pemroses** (lihat dokumen 13).
- Penyimpanan dan masa simpan data (lihat dokumen 10).
- Langkah keamanan yang diterapkan (lihat dokumen 13).
- Hak menghapus data dan cara menghubungi.
- Kepatuhan terhadap UU PDP.

**Catatan:** teks legal final sebaiknya ditinjau oleh ahli hukum sebelum dipublikasikan — ini bukan nasihat hukum, dan datanya menyangkut hal sensitif seperti penggajian.

## MVP

Cukup satu halaman landing sederhana (hero + fitur + cara kerja + harga ringkas + CTA + footer) dan dua halaman legal. Tidak perlu animasi atau desain rumit di awal — yang penting jelas dan mudah mendaftar.

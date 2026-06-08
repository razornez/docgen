# 08 — Worker Render & Opsi PDF

Dokumen ini menjelaskan cara worker mengubah HTML menjadi PDF, pengaturan yang tersedia, dan bagaimana keputusan "semua aset ditempel (base64)" menyederhanakan keamanan.

## Alur Kerja Satu Worker

1. Worker mengambil satu tugas dari antrian (satu dokumen).
2. Mengambil template (HTML + versinya) dan data dokumen.
3. Mengisi template dengan data → menjadi halaman HTML lengkap.
4. Menyerahkan halaman ke Chromium (lewat Playwright), yang mencetaknya menjadi PDF sesuai pengaturan halaman.
5. Menyimpan PDF ke penyimpanan objek.
6. Bila berhasil, potong kredit; bila gagal, kembalikan kredit dan coba ulang.

Chromium di sini berperan sebagai "pencetak": ia membuka halaman tanpa jendela (headless) lalu mencetak ke PDF, sama seperti Print → Save as PDF di browser, tetapi otomatis. Hasilnya akurat mengikuti desain HTML/CSS.

## Pengaturan PDF (Menempel di Template)

Karena template yang menentukan bentuk dokumen, pengaturan berikut disimpan bersama template:

- **Ukuran kertas** — A4, Letter, A5, atau ukuran khusus (struk, label).
- **Orientasi** — tegak (portrait) atau melintang (landscape).
- **Margin** — jarak tepi atas/bawah/kiri/kanan.
- **Header & footer berulang** — misalnya logo di atas tiap halaman, dan "halaman X dari Y" di bawah.
- **Nomor halaman otomatis.**
- **Cetak warna latar** — agar blok warna/desain ikut tercetak (browser secara default kadang menghilangkannya).

## Font & Gambar: Semua Ditempel (Base64)

Keputusan desain: seluruh aset disertakan langsung di dalam halaman sebagai base64, bukan diambil dari alamat luar.

- **Gambar** (logo, foto, dan lain-lain) dikirim sebagai base64.
- **Font** diatur penuh oleh klien lewat CSS mereka sendiri (`@font-face` dengan font yang ditempel base64). Klien bebas penuh atas styling, font, dan CSS — karena HTML memang milik mereka.
- **QR / barcode** dibuat oleh sistem saat mencetak lalu ditempel sebagai base64. Tidak perlu mengambil dari luar.

### Penempatan yang hemat

Base64 memperbesar ukuran, terutama font (bisa ratusan KB). Karena itu:

- **Aset yang dipakai berulang dan tetap** (font merek, logo tetap) → tempel di dalam **template**, sehingga hanya disimpan sekali, tidak dikirim ulang tiap request.
- **Gambar yang berbeda tiap dokumen** (foto atau QR unik) → kirim di dalam **data**.

Konsekuensi: untuk MVP **tidak perlu membuat fitur unggah aset** terpisah — aset cukup ditempel di template atau data.

## Keamanan: Worker Tanpa Akses Keluar

Karena semua aset sudah tertanam di halaman, **tidak ada satu pun resource yang perlu diambil dari luar saat mencetak.** Ini memungkinkan pengamanan paling kuat:

- Worker Chromium dijalankan **tanpa akses internet keluar sama sekali**.
- Dengan tidak adanya jalan keluar, risiko template nakal menyuruh Chromium mengambil alamat internal kita (SSRF) **praktis hilang** — tidak ada yang bisa diambil.
- Chromium tetap dijalankan dalam wadah terisolasi dengan hak seminimal mungkin sebagai lapis pengaman tambahan.

Inilah keuntungan besar dari memilih base64: kebebasan penuh klien atas tampilan, sekaligus keamanan maksimal di sisi kita.

## Disiplin Sumber Daya

Chromium berat dan bisa bocor memori bila dipakai terus-menerus, jadi:

- **Batas waktu per cetakan** — bila sebuah template macet atau terlalu lama, render dihentikan agar tidak menggantung worker (dianggap gagal lalu dicoba ulang).
- **Batas jumlah cetakan bersamaan per worker** — disesuaikan dengan RAM yang tersedia.
- **Restart worker berkala** (atau setelah sekian banyak cetakan) untuk membersihkan memori.
- **Batas memori per cetakan** — bila satu cetakan memakai memori berlebih, dihentikan dan dicoba ulang.

## Catatan Implementasi

- Gunakan Playwright untuk mengendalikan Chromium; fungsi cetak-ke-PDF-nya mendukung seluruh pengaturan halaman di atas (ukuran, margin, header/footer, nomor halaman, warna latar).
- Karena mesin "polos" (lihat dokumen 00), worker hanya mengisi template dan mencetak — tidak menghitung dan tidak memvalidasi isi.
- Satu jenis worker yang sama melayani semua jenis dokumen, karena ia tidak perlu tahu isinya invoice atau sertifikat.

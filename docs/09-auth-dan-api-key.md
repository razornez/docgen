# 09 — Autentikasi & Kelola API Key

## Permukaan Produk (di mana auth berperan)

Produk ini punya beberapa antarmuka, dan masing-masing punya cara "masuk" yang berbeda:

- **Landing page publik** — untuk mengenalkan dan memasarkan produk. Tidak ada login (terbuka untuk umum).
- **Dashboard klien** — klien login untuk mengurus dirinya: membuat/mencabut API key, menyunting template (editor), melihat pemakaian & saldo, dan top-up.
- **Panel owner/admin** — internal, untuk owner mengelola semua klien (sudah dibahas di dokumen 07).
- **API publik** — dipakai oleh sistem klien (mesin), memakai API key.

Repo bertambah beberapa bagian frontend (mis. `apps/web` untuk landing page + dashboard klien, di samping `apps/admin` yang sudah ada).

## Dua Jenis Autentikasi

Ini inti yang perlu dibedakan: ada yang "masuk" itu manusia, ada yang mesin.

1. **Login dashboard (manusia).** Klien membuka dashboard dan masuk untuk mengelola akun lewat layar. Tersedia dua cara daftar/masuk: **email + kata sandi**, atau **akun Google** (login sekali klik). Setelah masuk, klien mendapat sesi.
2. **API key (mesin).** Server klien memanggil API generate. Ini bukan login manusia, melainkan kunci rahasia yang dikirim di tiap permintaan lewat header `Authorization: Bearer sk_live_...`.

Keduanya milik klien yang sama, tapi dipakai untuk hal berbeda: dashboard untuk orang, API key untuk sistem.

## API Key — Siklus Hidup

- **Diterbitkan dari dashboard klien.**
- **Berprefix jelas:** `sk_live_...` (memotong kredit) dan `sk_test_...` (gratis, hasil diberi watermark — untuk uji coba integrasi).
- **Disimpan sebagai hash, bukan aslinya.** Kunci asli hanya ditampilkan **sekali** saat dibuat; klien wajib menyalinnya saat itu. Kita tidak pernah menyimpan kunci mentah, jadi tidak bisa "dilihat lagi".
- **Boleh punya beberapa key** (misalnya untuk beberapa sistem berbeda), masing-masing bisa dicabut sendiri.
- **Rotasi tanpa mati layanan:** buat key baru → pindahkan ke sistem → cabut key lama.
- **Pencabutan instan** bila key bocor.
- Opsional: beri nama/label tiap key, batasi per alamat IP, dan lihat kapan terakhir dipakai.

(Tabel `api_keys` sudah ada di DDL dokumen 05: menyimpan hash, prefix, 4 digit terakhir untuk tampilan, mode live/test, status, dan waktu pakai terakhir.)

## Alur Daftar sampai Dapat Key (Klien)

1. Daftar di dashboard, lewat **email + kata sandi** atau **akun Google**.
2. **Verifikasi email** — untuk pendaftaran email + kata sandi, klien menerima tautan verifikasi yang harus diklik. Verifikasi inilah yang mengaktifkan akun sekaligus mencairkan bonus 100 kredit (lihat dokumen 04 soal pencegahan abuse bonus). Untuk pendaftaran lewat Google, emailnya sudah terverifikasi oleh Google, jadi langkah ini terlewati otomatis dan bonus langsung aktif.
3. Masuk dashboard → buat API key → salin saat itu juga.
4. Pasang key di sistem mereka → mulai memanggil API.

## Cara API Memeriksa Key Tiap Permintaan

1. Ambil key dari header `Authorization`.
2. Hitung hash-nya, cari di tabel `api_keys`.
3. Periksa: key aktif? mode-nya live atau test? milik tenant mana?
4. Lanjut ke pengecekan rate limit dan saldo kredit.
5. Catat waktu pakai terakhir.

## Login Owner/Admin

Akun internal yang **terpisah total** dari akun klien (tabel `admin_users`, dokumen 07). Masuk dengan email + kata sandi, plus **verifikasi dua langkah** karena bisa menyentuh uang (tambah saldo, top-up manual). Peran dibedakan: owner dan staf.

## Keamanan

- **Kata sandi** disimpan sebagai hash kuat (mis. bcrypt atau argon2), tidak pernah polos.
- **API key** disimpan sebagai hash; ditampilkan sekali saja.
- **Sesi dashboard** berupa token berumur terbatas, bisa logout/dicabut.
- **Verifikasi dua langkah** wajib untuk admin, opsional untuk klien.
- **Batas percobaan login** untuk mencegah penebakan kata sandi.
- Pemisahan tegas key **test vs live** agar uji coba tidak menyentuh saldo nyata.
- Catatan data model: akun Google tidak punya kata sandi, jadi tabel `users` perlu menyimpan penanda penyedia login (mis. `auth_provider` dan id Google) dan kolom kata sandi boleh kosong untuk akun Google.

## Ringkasan

- Manusia masuk lewat **login dashboard**; mesin masuk lewat **API key**.
- API key diterbitkan dari dashboard, disimpan sebagai hash, bisa banyak, bisa dicabut/dirotasi kapan saja.
- Akun klien dan akun owner benar-benar terpisah.

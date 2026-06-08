# 13 — Keamanan & Perlindungan Data

Dokumen ini menyatukan sisi perlindungan data. Beberapa hal sudah dibahas di tempat lain dan cukup dirujuk; fokus di sini pada yang belum, terutama pemisahan data antar-klien dan pengelolaan rahasia.

## Data Pribadi (PII)

Dokumen yang dibuat berisi data sensitif — slip gaji memuat penghasilan, kontrak memuat identitas, ada NPWP dan alamat. Prinsipnya:

- **Simpan seperlunya.** Jangan menyimpan lebih dari yang dibutuhkan.
- **Jangan masuk log.** Isi dokumen tidak boleh tercatat di log (lihat dokumen 12).
- **Simpan singkat.** Masa simpan PDF diatur per akun dan bisa pendek (lihat dokumen 10).

## Enkripsi

- **Saat berpindah (in transit):** semua jalur lewat HTTPS/TLS — API, dashboard, webhook, dan akses ke penyimpanan.
- **Saat disimpan (at rest):** database dan penyimpanan objek dienkripsi. Layanan seperti S3/R2 mengenkripsi otomatis; di VPS, pastikan enkripsi pada penyimpanan dan database diaktifkan.
- **Kata sandi & kunci** disimpan sebagai hash (kata sandi pakai bcrypt/argon2; API key di-hash) — bukan disimpan apa adanya (lihat dokumen 09).

## Pemisahan Data Antar-Klien (Paling Krusial)

Pada sistem dengan banyak klien, satu klien tidak boleh bisa melihat data klien lain. Kalau bocor di sini, satu klien bisa melihat slip gaji klien lain — fatal.

- **Setiap akses data disaring berdasarkan tenant.** API key menentukan tenant; semua kueri data otomatis dibatasi ke tenant itu.
- **File diberi ruang nama per tenant** di penyimpanan (lihat dokumen 10).
- **Ditegakkan di lapisan akses data**, bukan diserahkan ke pengecekan satu per satu yang mudah lupa.
- **Diuji khusus** — ada pengujian yang memastikan klien A tidak bisa menyentuh data klien B (lihat dokumen pengujian).

## Kelola Rahasia (Secrets)

Rahasia = kata sandi database, kunci penyimpanan, Server Key Midtrans, kunci tanda tangan webhook, dan sebagainya.

- **Jangan ditulis di dalam kode** dan **jangan ikut masuk ke repo**. Simpan lewat environment variable atau pengelola rahasia; berkas `.env` tidak dimasukkan ke git.
- **Putar berkala**, dan **segera putar bila bocor**.
- **Batasi aksesnya** — hanya layanan dan orang yang memang perlu.

## Hak Seminimal Mungkin & Jaringan

- Tiap layanan hanya diberi akses yang ia butuhkan. Contoh: worker render tidak butuh internet keluar sama sekali (lihat dokumen 08).
- Panel owner dibatasi dan memakai verifikasi dua langkah; tindakan admin punya jejak (lihat dokumen 07 & 09).
- Di server: hanya buka yang perlu (API, dashboard); database dan Redis tidak bisa diakses dari luar; pasang firewall (lihat dokumen 07).

## Backup & Pemulihan

- Backup database berkala (lihat dokumen 07), disimpan terenkripsi dan terbatas aksesnya.
- **Uji pemulihannya** — backup hanya berguna kalau benar-benar bisa dikembalikan.

## Kepatuhan Data Pribadi (UU PDP)

Karena memproses data pribadi, ada kewajiban menurut UU Perlindungan Data Pribadi (UU PDP) di Indonesia yang perlu diperhatikan: punya kebijakan privasi, kejelasan peran (umumnya **klien sebagai pengendali data, layanan kita sebagai pemroses**), perjanjian pemrosesan data dengan klien, kemampuan menghapus data, dan kewajiban memberi tahu bila terjadi kebocoran.

Ini bukan nasihat hukum — sebaiknya dikonsultasikan dengan ahli hukum untuk memastikan kewajiban spesifiknya, terutama karena datanya menyangkut hal sensitif seperti penggajian.

## Rencana Insiden

Siapkan langkah bila terjadi kebocoran: kurung/hentikan dulu, nilai dampaknya, beri tahu klien yang terkena, dan penuhi kewajiban hukum. Lebih baik punya rencana sebelum dibutuhkan.

## MVP vs Nanti

**Masuk MVP:**
- HTTPS di semua jalur; enkripsi penyimpanan & database aktif.
- Kata sandi & API key di-hash.
- Pemisahan data per tenant ditegakkan di lapisan akses data + diuji.
- Rahasia lewat environment variable, tidak masuk repo.
- Backup database berkala + uji pemulihan.
- Worker tanpa internet; firewall; DB/Redis tertutup dari luar.

**Nanti:**
- Pengelola rahasia khusus dengan rotasi otomatis.
- Enkripsi tingkat kolom untuk data paling sensitif.
- Audit keamanan / uji penetrasi oleh pihak luar.
- Kebijakan privasi & perjanjian pemrosesan data yang ditinjau ahli hukum.

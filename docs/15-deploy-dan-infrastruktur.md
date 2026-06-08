# 15 — Deploy & Infrastruktur

Dokumen penutup: cara menjalankan semua komponen, memisahkan lingkungan, dan merilis perubahan dengan aman.

## Apa yang Dijalankan

Komponen dari dokumen 07, masing-masing dibungkus dalam wadah (Docker):

- **api** — layanan HTTP (terima request, auth, reserve kredit, enqueue).
- **worker** — render PDF (berisi Chromium, lebih berat).
- **web** — landing page + dashboard klien.
- **admin** — panel owner.
- **PostgreSQL** — database.
- **Redis** — antrian & rate limit.
- **Penyimpanan objek** — R2/S3/MinIO untuk PDF (di luar atau di-host sendiri).

Untuk MVP, semua dijalankan di **satu VPS** lewat Docker Compose. Wadah worker dibuat lebih besar porsinya karena Chromium berat.

## Lingkungan (dev / staging / prod)

- **dev** — di komputer developer (Docker Compose dengan Postgres+Redis lokal), pakai sandbox Midtrans dan key mode test.
- **staging** — salinan prod untuk uji coba sebelum rilis; pakai pembayaran sandbox dan data palsu.
- **prod** — yang sungguhan: Midtrans asli, data asli.

Pisahkan ketiganya; jangan pernah menguji di data prod. Untuk awal dengan anggaran terbatas, cukup **dev (lokal) + prod (satu VPS)** dulu; tambahkan staging saat tim/trafik bertumbuh.

## CI/CD (Rilis Otomatis)

Karena kode di git, pakai alat seperti GitHub Actions:

1. Tiap kode berubah → **jalankan pengujian otomatis** (dokumen 14).
2. Bila lolos → **bangun image Docker**.
3. **Deploy** ke staging, lalu ke prod (bisa dengan persetujuan manual untuk prod).
4. **Migrasi database** dijalankan sebagai bagian dari deploy (menerapkan perubahan skema dari dokumen 05).

## Reverse Proxy, Domain & TLS

- Pasang **reverse proxy** (Nginx atau Caddy) di depan untuk mengatur TLS dan mengarahkan lalu lintas ke layanan yang tepat — misalnya `api.domain.com` ke api, `app.domain.com` ke dashboard, `domain.com` ke landing page.
- **Sertifikat TLS** otomatis lewat Let's Encrypt (Caddy mengurus ini sendiri; Nginx pakai certbot).

## Naik Kelas di VPS

- **Mulai:** satu VPS, semua lewat Compose.
- **Tumbuh:** tambah jumlah wadah worker; perbesar VPS.
- **Lebih besar:** pindahkan worker ke VPS sendiri yang berbagi database, Redis, dan penyimpanan yang sama; pasang pembagi beban di depan api.
- Database dan Redis bisa dipindah ke layanan terkelola kalau ingin mengurangi beban operasional.

## Keamanan Saat Rilis

- **Restart bergulir untuk worker** — worker menyelesaikan tugas yang sedang berjalan sebelum berhenti, jadi tidak ada cetakan yang terputus.
- **Bisa mundur (rollback)** — simpan image versi sebelumnya supaya bisa kembali bila rilis bermasalah.
- **Migrasi database yang aman** — buat perubahan skema yang tetap kompatibel dengan versi lama, agar rilis tidak mematikan layanan.
- **Health check menjaga rilis** — layanan baru dipastikan "hidup" sebelum menerima lalu lintas (dokumen 12).

## Backup & Operasional

- Backup database terjadwal ke penyimpanan objek, dan **uji pemulihannya** (dokumen 07 & 13).
- Pemantauan dan alert berjalan (dokumen 12).

## MVP vs Nanti

**Masuk MVP:**
- Satu VPS + Docker Compose.
- Reverse proxy + TLS otomatis.
- Satu Postgres + Redis; penyimpanan objek (R2).
- GitHub Actions: tes → build → deploy, plus migrasi database.
- Sandbox Midtrans untuk dev/staging.
- Backup terjadwal.

**Nanti:**
- Worker terpisah / penambahan otomatis (autoscale).
- Database terkelola.
- Orkestrasi wadah (mis. Kubernetes) bila memang perlu.
- Lingkungan staging penuh dan rilis tanpa downtime (blue-green).

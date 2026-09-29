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

Deploy VPS saat ini dijalankan oleh `.github/workflows/deploy.yml` pada push ke `main`.
Workflow memeriksa tes, tipe, lint, format berkas yang berubah, build, dan render PDF
lokal tanpa API/kredit sebelum SSH. Di VPS, deploy berhenti bila checkout kotor,
PM2 tidak tersedia, atau ruang kosong kurang dari 2 GB. Setelah pull fast-forward,
Chromium Playwright dipasang eksplisit dan `node scripts/check-renderer.mjs`
harus berhasil sebelum PM2 di-reload. `/health` baru sehat bila worker dapat
mencetak PDF uji berkala; status database/Redis saja tidak cukup.

Worker merekonsiliasi batch berusia 10 menit sampai 24 jam yang kehilangan job
BullMQ: item tanpa job ditandai gagal dan kredit live dikembalikan sekali saat
batch selesai. Batch lebih lama dari 24 jam tidak diubah otomatis; periksa
ledger dan dokumen secara manual sebelum tindakan pemulihan. Bila health gagal
setelah deploy, periksa log `docgen-worker`, Chromium, Redis, dan disk. Pulihkan
kode lewat commit pembalik pada `main`, bukan force-push atau reset checkout VPS.

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

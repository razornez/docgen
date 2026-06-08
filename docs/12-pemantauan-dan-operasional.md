# 12 — Pemantauan & Operasional

## Kenapa Perlu

Begitu sistem jalan, kamu perlu tahu: sehat atau tidak? cepat atau lambat? ada cetakan yang gagal? antrian menumpuk? Tanpa pemantauan, kamu baru sadar ada masalah saat klien sudah marah. Pemantauan membuat masalah terlihat lebih dulu.

## Log (Catatan Kejadian) + Jejak Request

Tiap permintaan dan kejadian penting dicatat, masing-masing diberi **nomor jejak (request id)** yang sama dari awal sampai akhir. Jadi satu permintaan bisa ditelusuri menembus seluruh perjalanannya: dari API → masuk antrian → dikerjakan worker.

- Ini nyambung dengan pesan error kita (dokumen 02) yang selalu memuat `request_id`. Klien melapor error sambil menyebut nomor itu, dan kamu bisa langsung menemukan cerita lengkapnya.
- Untuk batch, ditambah nomor batch dan nomor tiap item, sehingga bisa menelusuri "invoice ke-457 di batch B123" sampai detail.
- Log dibuat terstruktur (bisa dicari), bukan sekadar tumpukan teks.
- **Jangan mencatat data sensitif** — isi dokumen (data pribadi), API key, dan kata sandi tidak boleh masuk log.

## Metrik (Angka yang Dipantau)

Angka-angka yang ditampilkan di layar pantau:

- **Render** — berapa cetakan per menit, persentase berhasil vs gagal, dan berapa lama tiap cetakan.
- **Antrian** — berapa tugas menunggu dan seberapa lama menunggunya (peringatan dini kalau mulai menumpuk).
- **API** — permintaan per menit, persentase error, dan kecepatan respons.
- **Worker** — berapa yang berjalan, pemakaian memori/CPU.
- **Bisnis** — jumlah dokumen dibuat, kredit terpakai, top-up masuk, klien aktif.

Pecahan per klien membantu mengenali satu klien yang perilakunya tidak wajar.

## Alert (Peringatan Otomatis)

Dapat pemberitahuan saat ada yang tidak beres, sebelum klien komplain. Yang penting dipasang:

- Persentase cetakan gagal melonjak.
- Antrian terlalu menumpuk / tugas menunggu terlalu lama (tanda kapasitas kurang).
- Persentase error API naik.
- Worker mati atau memorinya penuh.
- Penyimpanan mulai penuh.
- Pengiriman/penerimaan pembayaran (webhook Midtrans) gagal.

Peringatan dikirim ke tempat yang kamu pantau (mis. Telegram, Slack, atau email).

## Health Check

Tiap layanan punya alamat "/health" sederhana untuk mengabarkan "saya hidup". Dipakai untuk me-restart otomatis layanan yang mati dan oleh pembagi beban.

## Pelacakan Error

Selain log, pakai alat pelacak error (misalnya **Sentry**) yang menangkap setiap error beserta konteksnya, sehingga kamu melihat error baru dan seberapa sering terjadi — bukan menunggu laporan klien. (Sentry termasuk yang umum dipakai dan mudah disambungkan.)

## Alat & MVP vs Nanti

Untuk awal di VPS, jaga tetap ringan — yang penting esensialnya ada:

**Masuk MVP:**
- Log terstruktur ber-`request_id`.
- Health check tiap layanan.
- Pelacak error (Sentry).
- Beberapa metrik kunci: persentase render berhasil/gagal, kedalaman antrian, persentase error API.
- Alert untuk yang kritis: lonjakan render gagal, antrian menumpuk, layanan mati, dan kegagalan pembayaran.

**Nanti:**
- Layar pantau lengkap (mis. Grafana) dan dashboard per klien.
- Analitik bisnis mendalam dan pelacakan jejak antar-layanan yang lebih rinci.
- Target layanan (SLO) dan laporan ketersediaan.

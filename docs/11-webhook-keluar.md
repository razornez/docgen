# 11 — Webhook Keluar

## Untuk Apa

Tanpa webhook, klien harus terus bertanya "batch saya sudah selesai belum?" berulang-ulang (polling) — boros di kedua sisi. Dengan webhook, **kita yang memberi tahu klien** begitu ada kejadian, dengan mengirim pesan ke alamat (URL) yang mereka daftarkan. Klien cukup menunggu diberi tahu.

## Peristiwa yang Didukung

- `batch.completed` — batch selesai semua.
- `batch.partially_failed` — batch selesai tapi ada sebagian yang gagal.
- `batch.failed` — batch gagal total.
- `balance.low` — saldo kredit menipis (agar klien top-up sebelum kehabisan).
- `document.failed` — sebuah dokupun gagal (opsional).

Klien memilih peristiwa mana yang ingin diterima saat mendaftarkan alamatnya.

## Cara Kerja

1. Klien mendaftarkan alamat webhook (URL + peristiwa yang diinginkan) di dashboard.
2. Saat sebuah peristiwa terjadi, sistem menyusun pesannya dan mengirimkannya sebagai permintaan ke alamat klien.
3. Pengiriman dicatat (tabel `webhook_deliveries` di DDL dokumen 05): isinya, status, jumlah percobaan, dan kapan akan dicoba lagi.

Isi pesan memuat: jenis peristiwa, **id peristiwa**, waktu, dan data terkait (misalnya nomor batch, statusnya, jumlah berhasil/gagal, dan tautan untuk mengambil hasil).

## Tanda Tangan (Memastikan Pesan Asli dari Kita)

Tanpa pengaman, siapa pun bisa mengirim pesan palsu "batch selesai" ke alamat klien. Karena itu tiap pesan diberi **tanda tangan** yang dihitung dengan kunci rahasia yang hanya diketahui kita dan klien (disimpan di `webhook_endpoints.secret`). Klien memverifikasi tanda tangan ini untuk memastikan pesan benar-benar dari kita. Disertakan juga waktu di dalam pesan agar pesan lama tidak bisa dikirim ulang oleh penyerang.

## Coba Ulang dengan Jeda Bertambah

Server klien bisa saja sedang mati atau lambat. Bila alamat klien tidak menjawab "berhasil", sistem **mencoba lagi dengan jeda yang makin panjang** (misalnya setelah 1 menit, 5 menit, 30 menit, beberapa jam), sampai sejumlah percobaan. Bila tetap gagal, pengiriman ditandai gagal dan ditampilkan di dashboard agar klien bisa menyelidiki atau mengambil hasilnya secara manual.

## Bisa Terkirim Lebih dari Sekali

Karena ada coba-ulang, sebuah pesan bisa sampai lebih dari sekali (misalnya pesan sebenarnya sudah sampai, tapi jawaban "berhasil"-nya telat sehingga kita mengirim ulang). Karena itu tiap pesan punya **id peristiwa** yang unik, sehingga klien bisa mengabaikan pesan yang sudah pernah diterima. Jaminannya "minimal satu kali sampai".

## Tidak Mengganggu Sistem

- Pengiriman webhook lewat antrian tersendiri, jadi klien yang lambat tidak memperlambat hal lain.
- Tiap pengiriman diberi **batas waktu** — kita tidak menunggu selamanya pada server klien yang lambat.

## Keamanan Tambahan

- Hanya mengirim ke alamat **HTTPS**.
- Alamat webhook divalidasi harus alamat publik; alamat internal (seperti `localhost` atau alamat jaringan dalam) diblokir, agar fitur ini tidak bisa disalahgunakan untuk mengintip jaringan kita.

## Di Dashboard

Klien bisa melihat riwayat pengiriman webhook beserta statusnya, **mengirim ulang** secara manual bila perlu, dan **mengganti kunci rahasia** (secret) tanda tangannya.

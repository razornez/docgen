# 06 — Pemrosesan Batch & Keadilan Antar-Klien

Dokumen ini menjelaskan cara sistem menangani permintaan massal (misalnya satu klien mengirim 1000 invoice sekaligus) tanpa membuat klien lain ikut terdampak.

## Prinsip Inti

**Batch besar tidak dirender sekaligus, melainkan dipecah menjadi banyak tugas kecil yang dikerjakan paralel oleh sekumpulan pekerja.** Bukan satu tugas raksasa berisi 1000 invoice, tetapi 1000 tugas kecil yang masing-masing berdiri sendiri.

## Alur dari "Kirim" sampai "Dapat 1000 PDF"

1. **Terima cepat, jangan dikerjakan di tempat.** Saat klien mengirim batch, API hanya menerima, mengecek hal dasar, lalu langsung menjawab dengan nomor batch. Request selesai dalam milidetik. Pencetakan terjadi di belakang layar (asinkron).

2. **Potong kredit di muka.** Karena prepaid, sistem memesan 1000 kredit saat submit. Bila saldo klien kurang dari 1000, batch ditolak saat itu juga — bukan setelah mencetak sebagian lalu kehabisan di tengah jalan.

3. **Pecah menjadi banyak tugas.** Batch dipecah menjadi tugas-tugas kecil (satu invoice = satu tugas), lalu dimasukkan ke antrian.

4. **Banyak pekerja mengambil dari antrian.** Sekumpulan pekerja render (tiap pekerja menjalankan mesin Chromium) menarik tugas dan mencetak berbarengan. Jumlah pekerja dapat ditambah otomatis saat antrian menumpuk dan dikurangi saat sepi.

5. **Simpan tiap hasil.** Tiap PDF yang jadi langsung disimpan, dan progres batch diperbarui (berapa selesai, berapa gagal).

6. **Kemas dan beri tahu.** Setelah selesai, klien diberi tahu lewat webhook atau dengan mengecek status batch, lalu mengunduh hasilnya sebagai satu paket (lihat bagian Pengambilan Hasil).

Gambaran kecepatan: bila satu pekerja mencetak ~1 invoice/detik dan dijalankan 20 pekerja, 1000 invoice selesai di bawah satu menit. Untuk lebih cepat, tambah pekerja.

## Pengaman agar Tahan Banting

- **Kegagalan sebagian tidak menjatuhkan seluruh batch.** Tiap tugas berdiri sendiri. Yang gagal dicatat beserta alasannya; yang berhasil tetap jadi. Batch berakhir dengan status "selesai" atau "selesai sebagian".
- **Coba ulang otomatis.** Bila sebuah cetakan gagal karena gangguan sesaat (pekerja mati, timeout), tugas itu dicoba ulang beberapa kali sebelum dinyatakan gagal permanen. Kegagalan permanen masuk "kotak tugas gagal" (dead-letter) untuk ditinjau.
- **Kembalikan kredit yang gagal.** Dipesan 1000 di muka; bila 990 berhasil dan 10 gagal, 10 kredit dikembalikan. Klien hanya dipotong untuk dokumen yang benar-benar tercetak.
- **Aman dari kirim ganda.** Bila klien tidak sengaja mengirim dua kali atau koneksinya putus lalu mengulang, sistem mengenali itu batch yang sama (idempotency) — tidak membuat dua batch dan tidak memotong 2000 kredit.
- **Disiplin sumber daya.** Mesin Chromium boros memori bila dipakai terus-menerus, jadi pekerja di-restart berkala dan tiap cetakan diberi batas waktu agar tidak menggantung.

## Keadilan Antar-Klien (Masalah "Tetangga Berisik")

Tantangannya: satu klien yang mengirim 1000 invoice tidak boleh memonopoli seluruh pekerja sehingga klien lain harus menunggu lama.

### Pilihan Teknologi: Tidak Perlu Kafka

Isolasi antar-klien adalah soal *cara menjadwalkan pekerjaan*, bukan soal teknologi antriannya. Kafka tidak menyelesaikan masalah ini secara bawaan dan terlalu berat untuk beban kerja "tugas render". Gunakan **antrian tugas biasa** (misalnya Redis + BullMQ, SQS, atau RabbitMQ) yang sudah mendukung coba-ulang, dead-letter, prioritas, dan jalur antrian terpisah. Keadilan dibangun di atasnya dengan aturan berikut.

### Aturan yang Membuat Klien Tidak Saling Terdampak

- **Batas kerja bersamaan per klien.** Tuas paling ampuh. Walau satu klien mengantre 1000 tugas, sistem hanya mengerjakan sejumlah tertentu miliknya sekaligus (misal 20). Sisanya menunggu sementara slot lain tetap terbuka untuk klien lain.
- **Antrian adil (bergiliran).** Beri tiap klien aktif jatah bergiliran, bukan satu antrian FIFO global, sehingga batch besar mendapat porsi wajar, bukan seluruh pipa.
- **Jalur terpisah untuk cepat vs massal.** Invoice tunggal yang mendesak punya jalur sendiri agar tidak terjebak di belakang batch besar.
- **Tambah pekerja otomatis** untuk menambah kapasitas total saat ramai. (Menambah pekerja mempercepat semuanya; yang membuat *adil* tetap batas per-klien.)
- **Pinjam pekerja menganggur.** Saat tidak ada klien lain, batch besar boleh memakai pekerja yang nganggur agar lebih cepat, lalu dikembalikan begitu klien lain datang. Adil saat ramai, ngebut saat sepi.

### Contoh dengan Angka

Asumsi: 50 pekerja total, batas 20 pekerja per klien, 1 invoice ≈ 1 detik. Tiga klien mengirim bersamaan — A (1000 invoice), B (1000 invoice), C (1 invoice mendesak).

| | A (1000) | B (1000) | C (1, mendesak) |
|---|---|---|---|
| Tanpa batas (siapa cepat dapat semua) | 20 dtk | 40 dtk | **40 dtk** |
| Batas 20 per klien | 50 dtk | 50 dtk | **1 dtk** |

Tanpa batas, bila A menyerobot semua pekerja, C yang cuma 1 invoice harus menunggu ~40 detik di belakang 2000 invoice. Dengan batas per klien, A dan B masing-masing memakai 20 pekerja dan berjalan bersamaan, sedangkan C selesai dalam ~1 detik. Konsekuensinya, batch raksasa A sedikit lebih lambat (50 detik, bukan 20), tetapi sebagai gantinya B dan C tidak ikut tersandera.

## Pengambilan Hasil

Klien tidak menerima 1000 tautan satu per satu. Disediakan satu paket, biasanya dalam dua bentuk:

- **Daftar tautan (manifest)** — satu berkas berisi pasangan "invoice nomor sekian → tautan unduh PDF-nya". Cocok bila klien memprosesnya kembali secara otomatis.
- **Satu file zip** — semua PDF dibungkus jadi satu unduhan. Cocok bila klien hanya ingin menyimpan semuanya.

Tautan unduh berumur pendek demi keamanan. Klien dapat meminta tautan baru kapan saja tanpa mencetak ulang, sehingga tidak terkena potong kredit lagi.

## Catatan Ukuran Kirim

Seribu invoice dalam satu JSON masih wajar. Untuk puluhan ribu sekaligus, JSON menjadi terlalu besar — jalur pertumbuhannya adalah klien meng-upload satu file data (misalnya CSV) lalu sistem membacanya, bukan menjejalkan semuanya ke dalam satu request. Ini ditunda dari MVP.

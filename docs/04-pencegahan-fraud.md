# 04 — Pencegahan Fraud

Ya, fraud pada sistem ini nyata dan berlapis. Karena ada kredit gratis di pendaftaran, pembayaran top-up, dan produk yang bisa disalahgunakan untuk membuat dokumen palsu, pertahanannya harus berlapis pula. Dokumen ini memetakan setiap vektor dan mitigasinya, lalu menutup dengan apa yang masuk MVP versus apa yang bisa menyusul.

## Vektor 1 — Penyalahgunaan Bonus Kredit Gratis (Bonus Farming)

Ancaman: satu orang membuat banyak akun untuk memanen kredit gratis berulang kali. Inilah risiko terbesar dari memberi 100 kredit cuma-cuma di pendaftaran.

Mitigasi berlapis:

- **Verifikasi identitas sebelum bonus aktif.** Bonus baru bisa dipakai setelah email terverifikasi, dan idealnya juga nomor telepon (OTP). Akun yang belum terverifikasi boleh ada tetapi saldonya belum bisa dibelanjakan.
- **Blokir email sekali pakai.** Tolak domain disposable/temporary email yang umum dipakai untuk membuat akun massal.
- **Satu bonus per identitas terverifikasi.** Constraint `UNIQUE(signup_bonus, tenant_id)` mencegah dobel per tenant; lapisi dengan deteksi identitas yang sama dipakai lintas tenant (email/telepon yang dinormalisasi).
- **Fingerprinting perangkat dan IP.** Tandai banyak pendaftaran dari perangkat atau rentang IP yang sama dalam waktu singkat. Rate-limit jumlah registrasi per IP.
- **Batasi nilai dan masa berlaku bonus.** Nilai bonus dijaga rendah relatif terhadap biaya, dan beri kedaluwarsa (mis. 30 hari) agar tidak ditimbun.
- **Kurangi nilai output gratis.** Output dari mode test atau yang dibiayai bonus dapat diberi watermark, sehingga kredit gratis tidak cukup berharga untuk dipanen demi produksi nyata.
- **Syarat kartu/metode bayar untuk membuka fitur penuh.** Opsional: bonus penuh hanya aktif setelah klien menautkan metode pembayaran yang valid.

## Vektor 2 — Fraud Pembayaran dan Chargeback (Top-up)

Ancaman: kartu curian dipakai untuk top-up, kredit dihabiskan, lalu pemilik kartu asli melakukan chargeback — kamu kehilangan kredit sekaligus kena biaya chargeback.

Mitigasi:

- **Utamakan metode pembayaran "push".** QRIS, virtual account, dan e-wallet jauh lebih kecil risiko chargeback-nya dibanding kartu. Jadikan ini default untuk pasar Indonesia.
- **3D Secure untuk kartu.** Wajibkan 3DS pada pembayaran kartu untuk memindahkan tanggung jawab fraud.
- **Manfaatkan skoring risiko gateway.** Xendit/Midtrans menyediakan sinyal risiko; tahan atau tinjau transaksi berisiko tinggi.
- **Velocity checks.** Tandai top-up dengan frekuensi atau nominal tidak wajar dari akun baru.
- **Tahan pemakaian kredit dari sumber berisiko.** Kredit hasil top-up kartu pada akun yang sangat baru dapat ditahan sebentar atau dibatasi laju pemakaiannya sampai pembayaran "matang".
- **KYC/KYB untuk nominal besar.** Top-up besar atau akun bisnis melewati verifikasi tambahan.
- **Kebijakan kredit non-refundable ke kas.** Tuangkan di syarat layanan bahwa kredit tidak dapat dicairkan kembali menjadi uang, untuk menutup skema pencucian via refund.
- **Pantau rasio chargeback** dan ambil tindakan pada akun bermasalah.

## Vektor 3 — Spoofing Webhook Pembayaran

Ancaman: penyerang mengirim webhook palsu "pembayaran sukses" ke endpoint kamu untuk menambah kredit tanpa benar-benar membayar.

Mitigasi:

- **Verifikasi signature HMAC** setiap webhook terhadap secret gateway. Tolak yang tidak cocok.
- **Konfirmasi balik ke gateway.** Setelah menerima webhook, panggil API gateway secara server-side untuk memastikan status pembayaran `payment_id` benar-benar lunas sebelum memberi kredit.
- **Idempotency.** `UNIQUE(topup, payment_id)` membuat webhook ganda atau replay tidak berefek.
- **Allowlist IP** sumber webhook gateway bila tersedia.
- **Jangan pernah memberi kredit dari sinyal sisi klien** (halaman redirect "sukses"). Hanya webhook server-to-server terverifikasi yang menambah kredit.

## Vektor 4 — Pencurian dan Penyalahgunaan API Key

Ancaman: API key bocor (mis. ter-commit ke repo publik) lalu dipakai pihak lain untuk menghabiskan kredit klien.

Mitigasi:

- **Prefix key yang dapat dipindai.** Format seperti `sk_live_...` memudahkan pemindai rahasia (mis. di GitHub) mendeteksi kebocoran.
- **Pencabutan instan dan rotasi.** Klien dapat mencabut dan memutar key kapan saja.
- **Rate limit per key** membatasi kerusakan dari key yang bocor.
- **Deteksi anomali.** Lonjakan pemakaian mendadak atau pola tak biasa memicu alert dan, bila perlu, penangguhan otomatis.
- **Pemisahan key test dan live.** Key `sk_test_` tidak memotong saldo nyata.
- **Opsi IP allowlist** per key untuk klien yang menginginkannya.
- **Webhook `balance.low`** membantu klien menyadari penghabisan saldo tak wajar lebih cepat.

## Vektor 5 — Double-Spend dan Race Condition

Ancaman: mengeksploitasi konkurensi untuk membelanjakan kredit yang sama dua kali atau menghabiskan saldo melebihi yang dimiliki.

Mitigasi (sudah inheren pada desain billing di dokumen 03):

- **Decrement atomik dengan guard** `balance >= n` — mustahil oversell walau request bersamaan.
- **Idempotency** `UNIQUE(type, ref_id)` — retry tidak menggandakan debit, top-up, atau bonus.
- **Refund hanya tertaut dokumen gagal**, sehingga skema "picu gagal untuk dapat refund sambil tetap memperoleh output" tertutup: `output_url` hanya diterbitkan untuk dokumen yang ter-commit (tertagih), bukan yang di-refund.

## Vektor 6 — Penyalahgunaan untuk Membuat Dokumen Palsu

Ancaman khusus produk ini: layanan dipakai untuk memproduksi invoice palsu, sertifikat palsu, atau kontrak yang dipalsukan. Risiko ini melekat pada produk generate dokumen dan perlu ditangani secara serius.

Mitigasi:

- **Syarat layanan yang jelas** melarang pembuatan dokumen menyesatkan atau melanggar hukum, dengan hak penangguhan akun.
- **KYC/KYB untuk akun bisnis**, terutama yang membuat dokumen bernilai tinggi atau ber-stempel resmi.
- **Audit trail menyeluruh.** Setiap dokumen tertaut ke tenant, API key, waktu, versi template, dan hash input data. Digabung dengan ledger kredit (dokumen 03), setiap dokumen yang pernah dibuat dapat ditelusuri sepenuhnya untuk investigasi.
- **Metadata verifikasi tertanam.** Untuk sertifikat dan dokumen yang perlu dapat diverifikasi, sematkan URL verifikasi atau QR code yang menunjuk ke catatan resmi penerbit, sehingga keaslian dapat dicek pihak ketiga.
- **Retensi untuk investigasi.** Simpan jejak (bukan tentu PDF-nya) cukup lama untuk mendukung penyelidikan, seimbang dengan kebijakan PII.
- **Mekanisme pelaporan penyalahgunaan** bagi pihak yang menemukan dokumen palsu buatan layanan.

## Pengerasan Pendukung

Beberapa kontrol umum yang memperkuat semua vektor di atas:

- **Isolasi worker render (SSRF).** Worker yang merender HTML klien berjalan tanpa akses jaringan keluar; pengambilan resource eksternal di-block atau di-allowlist. Ini mencegah template jahat menjadikan server kamu perantara serangan ke jaringan internal.
- **PII dan retensi.** Slip gaji dan kontrak berisi data sensitif. Enkripsi at-rest, signed URL berumur pendek, dan kebijakan retensi yang jelas mengurangi dampak bila terjadi insiden.
- **Logging dan alerting** pada peristiwa keamanan: kegagalan verifikasi signature, lonjakan registrasi, anomali pemakaian key.

## MVP versus Menyusul

### Masuk MVP

- Verifikasi email (blokir disposable) sebelum bonus aktif.
- `UNIQUE(type, ref_id)` untuk idempotency debit/topup/bonus.
- Decrement atomik dengan guard (anti oversell).
- Kredit hanya dari webhook terverifikasi (signature + konfirmasi balik ke gateway).
- Utamakan QRIS/VA/e-wallet; 3DS untuk kartu.
- Rate limit per key; key dapat dicabut; prefix key yang dapat dipindai.
- Mode test dengan watermark.
- Audit trail dokumen (tenant, key, waktu, versi template, hash input).
- Isolasi jaringan worker render.

### Menyusul

- OTP telepon dan fingerprinting perangkat/IP untuk anti bonus farming tingkat lanjut.
- Skoring risiko pembayaran lanjutan dan penahanan kredit dari sumber berisiko.
- KYC/KYB untuk akun bisnis dan top-up besar.
- Deteksi anomali otomatis dengan penangguhan key.
- Metadata verifikasi (URL/QR) tertanam pada sertifikat.
- IP allowlist per key.

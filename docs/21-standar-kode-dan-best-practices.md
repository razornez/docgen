# 21 — Standar Kode & Best Practices

Tujuan dokumen ini: menjaga kode **mudah dirawat, mudah diuji, dan mudah diubah**, serta konsisten antar kontributor dan antar sesi (mis. Claude Code). Berlaku untuk seluruh `apps/*` dan `packages/*`. Bila ada bagian dokumen lain yang lebih spesifik (mis. ledger di dok 03, error model di dok 02), dokumen itu yang menang pada detailnya — di sini kita merangkum *cara menulisnya*.

## Prinsip Dasar

- **SOLID**
  - **S — Single Responsibility:** satu modul/kelas/fungsi punya satu alasan untuk berubah. Contoh: `RenderService` hanya merender, `WalletService` hanya mengurus saldo. Jangan campur.
  - **O — Open/Closed:** tambah jenis dokumen atau gateway baru lewat penambahan adapter/strategi, bukan mengubah kode inti yang sudah jalan.
  - **L — Liskov Substitution:** semua implementasi sebuah interface harus bisa saling menggantikan tanpa mengubah perilaku pemanggil (mis. `StoragePort` R2 vs MinIO).
  - **I — Interface Segregation:** interface kecil dan spesifik. Jangan paksa implementor menyediakan method yang tidak dipakai.
  - **D — Dependency Inversion:** logika bisnis bergantung pada **abstraksi (port)**, bukan implementasi konkret. Lihat bagian Ports & Adapters.
- **DRY** — satu sumber kebenaran untuk tiap aturan. Logika billing, pembuatan ID, mapping error, dan tipe data ditulis sekali di tempat bersama (`packages/shared`, `packages/db`), bukan disalin.
- **KISS** — pilih solusi paling sederhana yang benar. Jangan menambah abstraksi sebelum ada dua pemakai nyata.
- **YAGNI** — jangan bangun fitur "untuk jaga-jaga". Ikuti scope MVP (dok 01); yang ditunda biarkan ditunda.
- **Composition over inheritance** — utamakan menyusun fungsi/objek kecil daripada hierarki pewarisan yang dalam.
- **Fail fast & explicit** — validasi di awal, lempar error jelas, jangan diam-diam melanjutkan dengan data yang salah.

## Arsitektur Berlapis (Pisahkan Tanggung Jawab)

Aliran tetap satu arah: **Route → Service → Repository → Adapter infra.**

- **Route/controller tipis.** Hanya parsing request, panggil service, bentuk response. **Tidak ada logika bisnis dan tidak ada query DB di route.**
- **Service** memuat logika bisnis (reserve kredit, orkestrasi render, dll.) dan tidak tahu detail HTTP.
- **Repository** satu-satunya yang menyentuh tabel. Service memanggil repository, bukan menulis SQL di mana-mana.
- **Adapter** membungkus dunia luar (storage, gateway bayar, antrian, email).

Aturan ini berlaku sama di `apps/api` dan `apps/worker`.

## Ports & Adapters (Hexagonal) untuk Infra yang Bisa Ditukar

Semua ketergantungan eksternal diakses lewat **interface (port)** yang didefinisikan di `packages/shared`, dengan **adapter** konkret yang bisa ditukar. Ini wujud nyata Dependency Inversion: mempermudah ganti penyedia dan **mempermudah test** (tinggal pasang implementasi palsu).

Port yang minimal perlu ada:

- `StoragePort` — simpan objek, buat signed URL (adapter: R2 / S3 / MinIO).
- `PaymentGatewayPort` — buat transaksi, verifikasi notifikasi, cek status (adapter: Midtrans; siap ditambah Xendit).
- `QueuePort` — enqueue/konsumsi job (adapter: BullMQ).
- `MailerPort` — kirim email verifikasi (adapter: SMTP/Resend/Mailgun).
- `Clock` & `IdGenerator` — waktu dan pembuatan ID berprefix; di-inject agar deterministik saat test.

```ts
// packages/shared/ports/storage.ts
export interface StoragePort {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// packages/shared/ports/payment-gateway.ts
export interface PaymentGatewayPort {
  createTransaction(input: CreateTxInput): Promise<{ orderId: string; paymentUrl: string }>;
  verifyNotificationSignature(payload: unknown): boolean;
  getStatus(orderId: string): Promise<PaymentStatus>;
}
```

Logika bisnis menerima port lewat konstruktor (dependency injection), bukan meng-`import` adapter langsung:

```ts
class TopupService {
  constructor(private gateway: PaymentGatewayPort, private wallet: WalletService) {}
}
```

## Aturan Emas Uang (Paling Penting untuk Core)

Ini bukan saran, tapi aturan keras yang menjaga billing tidak rusak (lihat dok 03 & 04):

- **Satu pintu.** Semua perubahan saldo hanya lewat satu service (`WalletService`/`LedgerService`). **Dilarang** ada `UPDATE wallets ... balance` di tempat lain mana pun, termasuk panel admin.
- **Atomik.** Insert baris `wallet_transactions` dan perubahan `wallets.balance` selalu dalam **satu transaksi DB**. Pakai guard `WHERE balance >= :n` agar tidak pernah minus/oversell.
- **Idempoten.** Andalkan `UNIQUE(type, ref_id)` untuk debit (per `document_id`), topup (per `payment_id`/`order_id`), dan bonus (per `tenant_id`).
- **Kredit hanya dari sumber terverifikasi** — webhook gateway yang signature-nya valid dan dikonfirmasi balik, tidak pernah dari redirect klien.

Setiap PR yang menyentuh uang wajib punya test untuk poin-poin di atas (dok 14).

## Idempotency sebagai Concern Lintas

- Endpoint POST penghasil dokumen mendukung header `Idempotency-Key` (dok 02): simpan map key→response, retry mengembalikan response asli.
- **Handler job worker harus aman dijalankan ulang.** Antrian menjamin "minimal sekali sampai", jadi job bisa diproses dua kali (retry). Pastikan efeknya idempoten (cek status dokumen sebelum memotong kredit, dll.).

## Validasi di Batas (Boundary)

- **Parse, don't validate.** Validasi dan ubah input mentah menjadi tipe yang sudah pasti di tepi sistem (mis. dengan **Zod**), sehingga bagian dalam hanya menerima data yang sudah bersih dan bertipe.
- **Penting (mesin polos, dok 00):** yang divalidasi adalah **bentuk request API** (field wajib, tipe), **bukan isi/kebenaran data dokumen**. Validasi isi dokumen tetap OFF — tanggung jawab klien.

## Type Safety

- TypeScript **strict** menyala (`strict`, `noImplicitAny`, `noUncheckedIndexedAccess`).
- **Hindari `any`.** Pakai `unknown` lalu persempit (narrow). Tipe bersama hidup di `packages/shared`.
- Pertimbangkan **branded types** untuk ID (`type DocumentId = string & { __brand: 'doc' }`) agar `tenant_id` tidak tertukar dengan `document_id`.

## Penanganan Error

- Satu hierarki error aplikasi (mis. `AppError` dengan `type`, `httpStatus`, `param?`) yang dipetakan ke amplop error & kode HTTP di dok 02 (`400/401/402/404/409/422/429/5xx`). `request_id` selalu disertakan.
- **Jangan menelan error** (no empty `catch`). Tangani, bungkus dengan konteks, atau lempar ulang.
- Bedakan error yang bisa diretry (gangguan sesaat) dari yang tidak (input salah) agar worker tidak retry sia-sia.

## Worker & Antrian

- Handler job **kecil, satu tanggung jawab, idempoten**.
- Selalu pasang **timeout**, **retry dengan backoff**, dan **dead-letter** (dok 06).
- Tidak menyimpan state global antar-job. Bersihkan/recycle resource berat (Chromium) dan restart worker berkala (dok 08).

## Logging & Observability

- Log **terstruktur** dan selalu membawa `request_id` (dok 12).
- **Jangan pernah** menulis PII (isi dokumen), API key, atau secret ke log (dok 13).

## Konfigurasi & Rahasia

- Muat & **validasi environment sekali saat start** (mis. skema Zod); aplikasi **gagal cepat** bila ada yang kurang/salah, bukan error di tengah jalan.
- Tidak ada secret di kode atau repo; semua lewat environment (dok 13, `.env.example` di dok 20).

## Konvensi Penamaan & Struktur

- `camelCase` untuk variabel/fungsi, `PascalCase` untuk tipe/kelas, `kebab-case` untuk nama file.
- ID berprefix tipe konsisten: `ten_`, `usr_`, `key_`, `tpl_`, `doc_`, `batch_`, `pay_`, `txn_` (dok 02 & 05).
- Susun folder per domain/fitur (mis. `wallet/`, `templates/`, `render/`), bukan per jenis teknis saja.
- Hindari singkatan yang tidak jelas; nama mengungkap maksud.

## Batas Modul Monorepo

- `apps/*` boleh meng-impor `packages/*`. `packages/*` **tidak boleh** meng-impor `apps/*`.
- **Tidak ada dependensi melingkar** antar package.
- `packages/db` hanya untuk skema & akses data. `packages/renderer` harus **murni**: isi template + cetak PDF, tanpa I/O jaringan (selaras isolasi worker, dok 08). `packages/shared` untuk tipe & port bersama.

## Immutability

- `template_versions` immutable dan `wallet_transactions` append-only — jangan pernah meng-UPDATE/DELETE keduanya.
- Utamakan `const` dan data tidak bermutasi; bila perlu ubah, buat salinan baru.

## Testing (selaras dok 14)

- Desain ber-port membuat unit test gampang: ganti adapter dengan mock.
- Wajib: **kebenaran billing** (reserve/commit/refund, idempotency, uji balapan), **isolasi antar-tenant**, **visual regression PDF**, integrasi alur inti JSON→PDF→kredit.
- Tulis test bersama fitur, bukan belakangan. Test ikut jadi dokumentasi perilaku.

## Tooling & Otomatisasi

- **ESLint + Prettier** (format otomatis, gaya seragam) dan **TypeScript strict** sebagai gerbang.
- **Husky pre-commit**: jalankan lint + typecheck + test cepat sebelum commit.
- **CI** (dok 15): lint, typecheck, dan test wajib hijau sebelum merge.

## Konvensi Git

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- PR kecil dan fokus pada satu hal; mudah ditinjau, mudah di-rollback.
- Nama branch deskriptif: `feat/wallet-reserve`, `fix/webhook-signature`.

## Komentar & Dokumentasi

- Komentar menjelaskan **"kenapa"**, bukan "apa" (kode sudah menjelaskan "apa").
- Perbarui dokumen di `docs/` saat sebuah keputusan berubah, supaya spesifikasi dan kode tidak melenceng.
- Beri JSDoc pada API publik antar-package (port, service yang dipakai lintas modul).

## Definition of Done (Ceklis per Fitur)

Sebuah fitur dianggap selesai bila:

- Lulus lint, typecheck, dan test (termasuk test yang relevan untuk billing/isolasi bila menyentuh keduanya).
- Error ditangani dan dipetakan ke kode HTTP yang benar (dok 02).
- Operasi uang lewat `WalletService` + satu transaksi DB + idempotency, dan ada test-nya.
- Tidak ada secret/PII yang bocor ke log atau ter-commit.
- Dependensi eksternal diakses lewat port, bukan adapter langsung.
- Dokumen terkait di `docs/` diperbarui bila ada keputusan yang berubah.

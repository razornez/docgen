# 22 — Internasionalisasi & Dukungan Dua Bahasa (ID / EN)

Produk dijual ke seluruh dunia, jadi UI harus mendukung **Inggris** dan **Indonesia**. Aturan default: tenant Indonesia memakai **Bahasa Indonesia**, selain itu **Inggris**. Tersedia **pemilih bahasa (switcher)** mulai dari halaman login. Bahasa basis/fallback adalah **Inggris (en)**, dengan **Indonesia (id)** sebagai terjemahan penuh.

## Lingkup: Apa yang Diterjemahkan vs Tidak

**Diterjemahkan (permukaan UI milik kita):** landing page, halaman login & daftar, dashboard klien, panel owner/admin, email transaksional, pesan error yang ditampilkan ke pengguna di layar, halaman legal, dan dokumentasi.

**TIDAK diterjemahkan oleh kita:**

- **Isi dokumen/PDF hasil.** Itu template + data milik klien (mesin polos, dok 00). Bahasa dokumen 100% tanggung jawab klien. i18n kita **tidak** menyentuh output render sama sekali.
- **Payload mesin.** `error.type` dan `error.param` (dok 02), nama event webhook (dok 11), serta nama field API tetap **stabil dalam Inggris** (machine-readable). Menerjemahkannya akan merusak integrasi klien.
- **Data milik tenant** (nama template, isi data, dll.).

## Aturan Bahasa Default & Deteksi

- **Basis/fallback:** Inggris (`en`). Bila sebuah teks belum diterjemahkan di `id`, tampilkan versi `en`.
- **Sebelum login (halaman publik):** pakai cookie pilihan bila sudah ada; bila belum, deteksi dari header `Accept-Language` browser — diawali `id` → `id`, selain itu `en`. Switcher tetap tersedia untuk menimpa.
- **Saat daftar:** tentukan `country` tenant (dari input/deteksi). `ID` → default `id`, selain itu `en`. Simpan sebagai default tenant.
- **Setelah login:** pakai `users.locale` (override pengguna) bila diisi; jika tidak, ikut `tenants.default_locale`. Pilihan tersimpan di akun sehingga konsisten lintas perangkat.

## Pemilih Bahasa (Switcher)

- Komponen ID/EN muncul di **semua layout**, termasuk **halaman login & daftar** (sesuai permintaan), header dashboard, header admin, dan footer landing.
- **Pra-login:** simpan pilihan ke cookie (mis. `locale`) dan set atribut `<html lang>` sesuai.
- **Pasca-login:** ubah `users.locale` lewat API sekaligus cookie, supaya pilihan ikut pengguna di mana pun login.

## Permukaan yang Disisir (Checklist)

Setiap permukaan di bawah harus memakai key terjemahan (bukan teks hardcoded) dan menyediakan `id` + `en`:

| Permukaan | Catatan | Rujukan |
|---|---|---|
| Landing page | Hero, fitur, cara kerja, harga, FAQ, CTA, footer | dok 16, 18 |
| Halaman login & daftar | **Switcher dimulai di sini**; label form, tombol, pesan validasi | dok 09 |
| Email verifikasi & transaksional | Dikirim sesuai locale penerima | dok 09, 11 |
| Dashboard klien | API key, editor template (label UI, bukan isi template), usage, saldo, top-up, pengaturan | dok 09 |
| Panel owner/admin | Menu, label, aksi (tambah saldo, suspend) | dok 07 |
| Halaman error & empty state | 404, 402/limit, kondisi kosong | dok 02 |
| Halaman legal | T&C & Kebijakan Privasi versi id & en | dok 16 |
| Dokumentasi API | Panduan integrasi | — |
| Pesan `balance.low` & notifikasi yang dibaca manusia | Teks email/dashboard, bukan payload webhook | dok 11 |

## Pesan Error API (penting)

- `error.type` dan `error.param` **stabil dalam Inggris** — jangan diterjemahkan.
- `error.message` boleh dilokalkan untuk ditampilkan. Pilih bahasa dari header `Accept-Language` pada request, atau dari locale tenant; default `en`.
- Dokumentasikan bahwa klien sebaiknya mengandalkan `type` (bukan `message`) untuk logika.

## Email Transaksional

- Dikirim dalam locale penerima (`users.locale`, fallback default tenant). Setiap template email punya versi `id` dan `en`: verifikasi email, `balance.low`, konfirmasi/kegagalan pembayaran, dan lainnya.

## Format Tanggal / Angka / Mata Uang (di UI kita)

- Format tampilan UI mengikuti locale (tanggal, pemisah ribuan, dll.).
- **Mata uang tetap IDR.** Bahasa ≠ mata uang; harga dan pembayaran tetap Rupiah (dok 17). Multi-currency adalah keputusan bisnis terpisah dan **di luar scope sekarang** (YAGNI).
- Pengingat: format **di dalam dokumen PDF** tetap urusan klien (mesin polos, dok 00).

## Halaman Legal

- Syarat & Ketentuan dan Kebijakan Privasi disediakan dalam `id` dan `en`. Tiap versi bahasa sebaiknya **ditinjau ahli hukum**; terjemahan tidak boleh mengubah makna hukum (dok 13, 16).

## Pendekatan Teknis (TypeScript)

- **Frontend:** gunakan library i18n yang matang (mis. `i18next` / `react-i18next`; bila memakai Next.js, `next-intl`). Katalog pesan per bahasa: `en.json`, `id.json`.
- **Letak katalog:** di paket bersama, mis. `packages/i18n` (atau `locales/` per app), agar DRY dan bisa dipakai bersama oleh web, admin, dan email.
- **Tidak ada string hardcoded** di komponen — semua lewat key (selaras dok 21). Ini juga membuka jalan menambah bahasa lain nanti tanpa mengubah komponen (Open/Closed).
- **Locale aktif** disimpan di context/provider frontend; atribut `<html lang>` di-set sesuai.
- **Sisi server:** util kecil untuk (a) memilih locale dari `Accept-Language`/tenant dan (b) memformat pesan; dipakai untuk `error.message` dan email.
- **Tipe bersama:** `type Locale = 'id' | 'en';` di `packages/shared`.

## Tambahan Data Model (melengkapi DDL dok 05)

```sql
-- negara asal + default bahasa tenant
ALTER TABLE tenants ADD COLUMN country TEXT;                          -- mis. 'ID', 'US'
ALTER TABLE tenants ADD COLUMN default_locale TEXT NOT NULL DEFAULT 'en'
  CHECK (default_locale IN ('id', 'en'));

-- override per pengguna; NULL = ikut default tenant
ALTER TABLE users ADD COLUMN locale TEXT
  CHECK (locale IN ('id', 'en'));
```

Saat pendaftaran: set `default_locale = 'id'` bila `country = 'ID'`, selain itu `'en'`.

## Urutan Pengerjaan (Saran)

1. Pasang infrastruktur i18n + util pemilih locale + tipe `Locale`.
2. Pasang **switcher di layout login lebih dulu** (sesuai permintaan), lalu rambah ke seluruh layout.
3. Ekstrak semua string UI ke key (`id` + `en`).
4. Lokalkan pesan error yang tampil dan email transaksional.
5. Sediakan halaman legal `id` + `en`.

## Selaras dengan Dokumen Lain

- **00** — output dokumen/PDF tetap urusan klien, di luar i18n kita.
- **02** — `type`/`param` stabil; hanya `message` yang boleh dilokalkan.
- **09** — switcher dimulai di halaman login; locale disimpan di akun.
- **16 & 18** — landing & legal dua bahasa.
- **21** — tidak ada string hardcoded; akses lewat key; mudah menambah bahasa.

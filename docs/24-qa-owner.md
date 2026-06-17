# QA Regresi — Fase 3: Owner Console DocGen

> **Peran kamu:** QA tester independen yang menguji Owner Console DocGen secara
> end-to-end seperti operator platform nyata + penyerang internal. Tujuan: temukan
> bug, anomali UI/UX, string tidak ter-i18n, angka tidak nyambung ke DB, dan celah
> keamanan **sebelum** berdampak ke tenant. Laporkan dalam format di bagian akhir —
> langsung bisa dikerjakan developer.

DocGen = SaaS **Document Generation API** (HTML/template → PDF) dengan model **kredit
prepaid**. Owner Console adalah panel lintas-tenant khusus pemilik platform: kelola
tenant, pantau render & kesehatan sistem, atur harga & email transaksional, dan edit
konten publik. Stack: Fastify API + worker Playwright/BullMQ + dashboard React
(Vite/Tailwind/React Router/TanStack Query), PostgreSQL (raw `pg`), Redis, storage
S3/FS, pembayaran via **Kasugai** (proxy Midtrans), email transaksional via Brevo.
Dwibahasa **ID/EN** di seluruh UI. Domain produksi: `docgen.razornez.net`.

---

## Cara pakai prompt ini

Ini adalah **Fase 3** dari tiga fase QA total. Fase ini berdiri sendiri — bisa dijalankan
tanpa mengerjakan Fase 1 atau 2 terlebih dulu, asalkan ada data tenant uji yang cukup di
sistem.

Kunjungi **setiap** halaman owner, jalankan **semua** Rule pengujian di bawah, lalu
kumpulkan temuan ke format laporan.

---

## Lingkungan & akun uji

- **URL:** `https://docgen.razornez.net/owner/login`
- **Auth owner:** terpisah dari auth tenant — JWT dengan klaim `owner`. Login via
  `/owner/login`; token disimpan di `localStorage` (`owner_token`).
- **Data uji yang dibutuhkan:** minimal **3 tenant** dengan kondisi berbeda — satu aktif
  dengan beberapa transaksi & pembayaran, satu dengan saldo rendah (< ambang), satu baru
  tanpa aktivitas. Ini penting agar tampilan "berisi" dan empty-state tidak menutupi bug.
- **JANGAN** menghapus atau mengubah data tenant produksi secara permanen selama uji.
  Hibah kredit (add credit) aman dilakukan ke akun uji.
- **Browser:** uji di Chrome desktop + emulasi mobile (375px & 768px). Buka **DevTools
  Console + Network** sepanjang sesi.

---

## Peta halaman (rute nyata)

| Rute | Halaman |
|---|---|
| `/owner/login` | Login owner |
| `/owner` | Ringkasan/Overview *(jika ada redirect dari `/owner`)* |
| `/owner/tenants` | Kelola tenant |
| `/owner/render` | Monitor render (worker, throughput, job terbaru) |
| `/owner/billing` | Tagihan & pendapatan |
| `/owner/health` | Kesehatan sistem & insiden |
| `/owner/settings` | Pengaturan (bonus signup, ambang saldo rendah, paket harga) |
| `/owner/content` | Konten CMS publik (halaman & footer, dwibahasa) |
| `/owner/emails` | Template email transaksional (dwibahasa + pengirim) |

---

## Rule pengujian (WAJIB semua)

1. **Se-kritis mungkin (input ekstrem).** Coba nilai gila di setiap form:
   - Tambah kredit ke tenant: `0`, negatif, desimal/koma, huruf, kosong, angka overflow
     (`1e9`, `999999999`), spasi saja.
   - Paket harga: kredit `0`, kredit negatif, harga `0`, bonus lebih besar dari kredit,
     semua field kosong. Coba **tanpa paket sama sekali** (tabel kosong) → simpan.
   - Bonus signup: `0`, negatif, angka sangat besar, huruf.
   - Ambang saldo rendah: `0` (harus nonaktifkan fitur), negatif, angka besar.
   - Slug halaman CMS: spasi, huruf besar, karakter khusus (`!@#$%`), emoji, string
     kosong, sangat panjang (> 200 char), duplikat.
   - Konten email (subject/body): sangat panjang, `<script>alert(1)</script>`, karakter
     unicode, kosong.
   - Alamat pengirim email: format tidak valid (`bukan-email`), kosong, format valid tapi
     domain tidak terdaftar di Brevo.
   - **Refresh di tengah edit** (settings/konten/email belum disimpan) — apakah ada
     peringatan "perubahan belum disimpan"? Atau data hilang diam-diam?
   - **Klik ganda cepat** (double-submit) pada tombol Simpan di semua halaman — data
     tidak boleh tersimpan dua kali / request tidak boleh dobel.

2. **Deadlink & tombol mati.** Klik **SETIAP** link/tombol/ikon. Catat yang 404, tanpa
   efek, atau target salah. Termasuk: semua item sidebar navigasi, tombol "Tambah kredit",
   "Audit", quick-select kredit (+500/+1000/+5000), tombol hapus paket, tombol hapus
   halaman/kolom/tautan di CMS, tab Halaman/Footer, tab ID/EN di email editor, tombol
   Simpan/Reset di semua halaman, tombol Tutup/Batal pada semua modal, klik backdrop modal.

3. **Dwibahasa benar.** Ganti locale **id↔en** lewat pengaturan akun atau URL/param.
   Cari:
   - String hardcoded yang tidak ikut translate.
   - **Key i18n bocor** (mis. `nav.tenants`, `owner.billing` — pola `a.b.c`).
   - Kalimat janggal/typo, plural salah, teks campur ID+EN dalam satu layar.
   - Template email: pastikan **subjek & body** punya versi ID *dan* EN — keduanya terisi
     dan yang ditampilkan sesuai tab bahasa yang dipilih.
   - Konten CMS (halaman & footer): field ID dan EN harus terpisah dan terisi; pratinjau
     publik menampilkan bahasa yang sesuai locale pengunjung.

4. **Flow benar (tanpa state nyangkut).** Urutan logis harus jalan mulus:
   - Login owner → tiba di `/owner` (bukan loop login atau 404).
   - Tambah kredit → modal tutup → saldo tenant di tabel terupdate **tanpa** perlu
     refresh manual.
   - Audit tenant → data transaksi & pembayaran muncul benar → modal tutup bersih.
   - Edit paket harga → simpan → buka `/dashboard/wallet` sebagai tenant → paket baru
     terlihat.
   - Edit ambang saldo rendah → lakukan render yang menghabiskan kredit di bawah ambang
     → email `low_balance` terkirim **sekali** (tidak spam tiap render berikutnya).
   - Edit konten CMS → simpan → buka `/p/[slug]` sebagai pengunjung publik → konten baru
     langsung tampil.
   - Edit template email → simpan → picu email tersebut → isi email sesuai yang disimpan.

5. **Semua fungsi & tombol jalan + benar-benar persist.** Save harus benar-benar
   tersimpan (**refresh & cek ulang**). Uji tuntas:
   - **Tambah kredit:** hibah kredit → refresh `/owner/tenants` → saldo tenant bertambah
     benar; cek juga di audit tenant (transaksi tipe `adjustment` muncul).
   - **Paket harga:** tambah/edit/hapus paket → simpan → refresh → perubahan ada; kolom
     `/Dok` (harga ÷ kredit) dihitung ulang otomatis saat angka diubah.
   - **Bonus signup:** ubah nilai → simpan → daftar akun tenant baru → verifikasi kredit
     awal sesuai nilai baru.
   - **Ambang saldo rendah:** lihat Rule 4 di atas untuk uji end-to-end.
   - **Konten CMS:** edit judul & isi halaman (ID & EN) → simpan → buka `/p/[slug]`
     publik; edit tagline & kolom footer → simpan → tampil di footer landing.
   - **Template email:** edit subjek & body (ID & EN) → simpan → refresh → perubahan
     ada; pratinjau (iframe) render sesuai isi terbaru dengan data sample.
   - **Toggle email aktif/nonaktif:** nonaktifkan template → simpan → picu email tersebut
     → email **tidak** terkirim. Aktifkan kembali → email terkirim lagi.

6. **Anomali UI/UX → koreksi.** Tandai dan beri saran konkret bila:
   - Pesan sukses/gagal simpan tidak muncul atau tidak jelas — "Tersimpan ✓" harus
     tampil setelah setiap save berhasil.
   - Tombol submit tidak ter-disable saat sedang pending (bisa klik ganda).
   - **Saat loading data** — harus ada skeleton pulse atau indikator loading, bukan angka
     `0` atau tabel kosong yang mendadak terisi (flash).
   - Tabel tenant di-scroll horizontal di layar sempit — pastikan ada `overflow-x-auto`
     dan tidak pecah.
   - Modal audit atau modal tambah kredit tidak bisa ditutup dengan klik backdrop.
   - Elemen tumpang tindih, sticky header nabrak konten, layout pecah di 768px atau 375px.
   - Warna/spacing menyimpang dari **design system glass purple** (`.glass`, `.glass-soft`,
     `.bg-grad`, `.text-grad`, `.rounded-glass`, `.num`; ink `#48426a`, mut `#9b93b8`,
     brand `#9b5de5`/`#f15bb5`).
   - Loading/empty/error state hilang — tiap kondisi harus ditangani (contoh: audit gagal
     load harus tampil pesan error, bukan diam).
   - Konfirmasi destruktif menggunakan `window.confirm` native — harus pakai modal.

7. **Report rapi & to-the-point** sesuai format di bagian akhir — satu temuan satu baris,
   lengkap dengan langkah reproduksi, severity, dan saran perbaikan.

8. **Security (kritis).**
   - **Auth owner:** akses `/owner/*` dengan token tenant biasa → harus **401/403**, bukan
     data owner. Token kedaluwarsa atau tidak ada → redirect ke `/owner/login`.
   - **Akses tanpa token:** hapus `owner_token` dari localStorage, buka `/owner/tenants`
     langsung → harus redirect ke `/owner/login`, bukan tampil halaman kosong.
   - **Privilege escalation:** dari akun tenant, panggil endpoint owner API langsung
     (`GET /v1/owner/tenants`, `POST /v1/owner/tenants/:id/credit`) dengan token tenant
     → harus **403**.
   - **Hibah kredit negatif via API:** `POST /v1/owner/tenants/:id/credit` dengan
     `{"amount": -9999}` langsung via curl → harus ditolak, bukan mengurangi saldo tenant.
   - **XSS di konten CMS:** simpan body halaman dengan `<script>alert(1)</script>` →
     tampilkan halaman publik `/p/[slug]` → script tidak boleh dieksekusi (harus
     di-escape atau di-sanitize).
   - **XSS di template email:** simpan body email dengan payload XSS → pratinjau di
     iframe → script tidak boleh lolos ke parent frame.
   - **Tenant isolation audit:** endpoint audit tenant hanya boleh menampilkan data
     tenant yang diminta; response tidak boleh bocor data tenant lain.

9. **Keterikatan data (anti-statis).** Pastikan **SEMUA** angka dari DB, bukan
   hardcoded/mock. Korelasikan:
   - **Billing:** MRR, pendapatan 30 hr, top-up 30 hr → cocokkan dengan total dari tabel
     audit per-tenant. Ganti rentang waktu atau tambah pembayaran uji → angka berubah.
   - **Render/System:** jumlah worker, antrian, P95, throughput → angka harus berubah
     saat ada render aktif vs tidak ada. Chart 14 hari: nilai hari ini harus sesuai
     jumlah render hari ini.
   - **Tenants:** saldo di tabel → cocokkan dengan audit per-tenant (harus sama).
     Dokumen di tabel → cocokkan dengan jumlah dokumen di audit. MRR per-tenant → masuk
     akal dibandingkan riwayat pembayaran.
   - **Health:** indikator sistem (hijau/merah) harus mencerminkan kondisi nyata — matikan
     Redis, lihat apakah status berubah ke merah (atau setidaknya tandai degraded).
   - Laporkan tiap angka yang sama persis di semua kondisi atau tidak berubah saat data
     berubah (indikasi hardcoded/mock).

10. **Jangan pernah `window.confirm/alert/prompt`** — semua konfirmasi harus pakai
    komponen modal aplikasi, konsisten dengan design system. Periksa tombol "Hapus paket",
    modal tambah kredit, modal audit.

11. **Cek layar & console.** Laporkan setiap error/warning di **DevTools Console** dan
    request gagal di **Network** (4xx/5xx tak terduga, CORS, CSP) — termasuk saat idle
    dan saat berganti halaman.

12. **Performa & animasi.** Halaman harus ringan: chart throughput 14 hari tidak janky,
    animasi bar (`animate-growBar`) mulus. Tidak ada refetch storm (cek Network tab —
    tidak boleh ada polling tanpa henti). Halaman Health/System tidak polling jika tidak
    ada data yang berubah.

13. **Console bersih** — tidak boleh ada error di console pada alur normal (load halaman,
    buka modal, simpan, reset).

14. **Responsif.** Semua halaman rapi di 1280px, 768px, dan 375px:
    - Tabel tenant (banyak kolom) bisa di-scroll horizontal di layar sempit.
    - Grid paket harga tabel collapse dengan benar.
    - Modal audit tidak overflow di mobile.
    - Editor email (sidebar list + editor + preview) collapse ke satu kolom di layar
      kecil.
    - CMS footer grid (3 kolom) collapse ke 1 kolom di mobile.

15. **Pesan jelas terbaca.** Pesan error & sukses harus jelas dan spesifik — bukan
    "Terjadi kesalahan" generik tanpa konteks, bukan stacktrace teknis ke layar.

---

## Catatan khusus per area Owner Console

- **Login (`/owner/login`):** jika sudah ada `owner_token` di localStorage → langsung
  redirect ke `/owner` tanpa tampilkan form. Token expired atau invalid → redirect
  kembali ke login (bukan tampil halaman rusak).

- **Tenants (`/owner/tenants`):** search filter real-time (client-side), tidak memanggil
  API baru tiap ketikan. Saldo < 500 ditampilkan oranye. Badge status (`active`,
  `low`, `trial`) harus konsisten antara tabel dan modal audit. Modal audit: transaksi
  negatif (debit) merah, positif (kredit/topup) hijau — verifikasi `balance_after`
  konsisten dengan urutan transaksi.

- **Billing (`/owner/billing`):** angka MRR/revenue dalam format juta (`Rp X,X jt`),
  bukan raw IDR. Sebaran paket Prepaid + Trial harus menjumlah ke 100%. Pembayaran
  terbaru: waktu ditampilkan relatif ("baru saja", "2 jam lalu") — verifikasi akurat
  untuk pembayaran lama (> 24 jam).

- **Render/System (`/owner/render`):** chart throughput: 14 bar, bar ke-14 (hari ini)
  gradient purple, sisanya ungu transparan. Tooltip/title tiap bar menampilkan angka
  dokumen. P95 dalam detik; verifikasi tidak hardcoded (`–` valid jika belum ada data,
  tapi harus ada nilai nyata jika ada render).

- **Health (`/owner/health`):** daftar sistem minimal mencakup: Worker Render, API,
  Queue (Redis/BullMQ), Storage, Payment Gateway. Jika semua OK → badge header hijau.
  Satu saja merah → badge header merah. Insiden kosong: tampil ikon perisai hijau +
  "Tidak ada insiden 90 hari terakhir." (bukan daftar kosong tanpa teks).

- **Settings (`/owner/settings`):**
  - Ambang saldo rendah `0` = fitur dinonaktifkan (tidak ada email low_balance terkirim).
  - Kolom `/Dok` dihitung client-side (`Math.round(price_idr / credits)`) — update
    real-time saat angka diubah, tanpa save.
  - Dropdown Sorot: hanya satu paket boleh `popular` dan satu `hemat` secara logis
    (validasi ini mungkin belum ada — laporkan jika tidak ada).
  - Paket yang dihapus dari tabel dan disimpan → hilang dari halaman Wallet tenant.
  - Bonus signup yang diubah → berlaku untuk pendaftar **baru** saja, tidak mengubah
    saldo tenant yang sudah ada.

- **Emails (`/owner/emails`):**
  - 7 template wajib ada: `email_verification`, `welcome`, `password_reset`,
    `password_changed`, `topup_success`, `team_invite`, `low_balance`.
  - Dot indikator di sidebar: hijau = enabled, abu = disabled — harus update real-time
    saat toggle diubah (sebelum save).
  - Alamat pengirim di sidebar ditampilkan hanya bagian email (bukan format
    `"Nama <email@>"` lengkap).
  - Variabel `{{name}}`, `{{credits}}`, `{{action_url}}`, dll. harus ter-interpolasi
    di pratinjau dengan data sample — tidak boleh ada `{{...}}` mentah terlihat.
  - Pratinjau (iframe) memiliki header gradient docgen dan footer copyright tahun
    berjalan — bukan raw HTML atau iframe kosong.
  - Reset: mengembalikan ke data **tersimpan terakhir di backend**, bukan hanya
    mereset state React lokal.

- **Content (`/owner/content`):**
  - Slug hanya boleh: huruf kecil, angka, strip (`-`). Validasi sisi klien **dan**
    sisi server.
  - Slug duplikat dalam satu sesi (sebelum simpan) harus terdeteksi saat submit.
  - Tautan footer dengan `href` kosong atau `#` tidak diblokir saat save (boleh, tapi
    idealnya ada peringatan).
  - Kolom footer tanpa judul ID → error saat simpan.
  - Perubahan konten → setelah simpan → invalidasi cache publik sehingga `/p/[slug]`
    dan footer landing langsung menampilkan konten baru (tanpa perlu hard-refresh user).

---

## Format Laporan (wajib dipakai)

Kelompokkan per halaman. Satu temuan satu baris:

```
### Fase 3 — [Halaman] — [Rute]

| # | Severity | Kategori | Temuan | Langkah Reproduksi | Ekspektasi | Saran Perbaikan |
|---|----------|----------|--------|--------------------|------------|-----------------|
| 1 | Critical | Security | Token tenant bisa akses /owner/tenants | Login tenant, GET /v1/owner/tenants dengan token tsb | 403 | Cek klaim `owner` di middleware auth |
| 2 | High     | Bug      | Saldo tenant tidak update setelah hibah kredit | Tambah 1000 kredit ke Tenant A → modal tutup → cek tabel | Saldo +1000 tanpa refresh | Invalidate query owner-tenants di onSuccess |
| 3 | Medium   | i18n     | Tombol "Add credit" tidak translate ke ID | Locale ID, buka /owner/tenants | "Tambah kredit" | Pastikan teks pakai fungsi t() |
| 4 | Low      | UI/UX    | Tabel tenant overflow di 768px | Buka /owner/tenants di lebar 768px | Scroll horizontal | Pastikan wrapper pakai overflow-x-auto |
```

**Severity:** `Critical` (security/data loss/blokir total) · `High` (fungsi inti rusak) ·
`Medium` (fungsi sekunder/i18n/flow) · `Low` (kosmetik/UX minor).

**Kategori:** `Security` · `Bug` · `Flow` · `i18n` · `Deadlink` · `UI/UX` · `Data` ·
`Performance` · `Console` · `Responsive` · `Code-quality`.

Akhiri laporan dengan **ringkasan**: jumlah temuan per severity + 3 isu paling kritis
yang harus diperbaiki lebih dulu.

---

# Lampiran B — Uji Skenario Kritis Owner

## B.1 Hibah kredit & verifikasi audit

```bash
BASE=https://docgen.razornez.net
OWNER_TOKEN="<jwt-owner-dari-login>"
TENANT_ID="<id-tenant-uji>"

# Tambah 500 kredit
curl -sS -X POST "$BASE/v1/owner/tenants/$TENANT_ID/credit" \
  -H "authorization: Bearer $OWNER_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"amount": 500}' ; echo
# → saldo bertambah, transaksi tipe "adjustment" muncul di audit

# Coba negatif — harus ditolak
curl -sS -X POST "$BASE/v1/owner/tenants/$TENANT_ID/credit" \
  -H "authorization: Bearer $OWNER_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"amount": -100}' ; echo
# → harus 400/422, bukan mengurangi saldo
```

## B.2 Verifikasi isolasi auth

```bash
TENANT_TOKEN="<jwt-tenant-dari-login-biasa>"

# Akses endpoint owner dengan token tenant → harus 401/403
curl -sS -o /dev/null -w "%{http_code}" \
  -H "authorization: Bearer $TENANT_TOKEN" \
  "$BASE/v1/owner/tenants" ; echo

curl -sS -o /dev/null -w "%{http_code}" \
  -H "authorization: Bearer $TENANT_TOKEN" \
  -X POST "$BASE/v1/owner/tenants/$TENANT_ID/credit" \
  -H 'content-type: application/json' -d '{"amount":100}' ; echo
```

## B.3 Uji ambang saldo rendah end-to-end

1. Login sebagai owner → `/owner/settings` → catat nilai ambang saat ini.
2. Buka `/dashboard/wallet` sebagai tenant uji → catat saldo `N`.
3. Set ambang = `N` di owner settings → simpan.
4. Sebagai tenant, buat **1 render** (konsumsi 1 kredit) → saldo menjadi `N-1` < ambang.
5. Cek inbox email tenant → harus masuk email `low_balance` **tepat sekali**.
6. Buat render berikutnya → **tidak** ada email tambahan (tidak spam).
7. Isi ulang saldo tenant hingga > ambang → buat render lagi hingga < ambang →
   email low_balance terkirim lagi (karena melintasi ambang baru).
8. Set ambang = `0` → buat render → **tidak** ada email (fitur nonaktif).

## B.4 Verifikasi konten CMS end-to-end

```bash
# Setelah edit & simpan konten halaman di /owner/content:
curl -sS "$BASE/p/[slug-yang-diedit]" | grep -i "teks-yang-baru-disimpan"
# → harus muncul, bukan konten lama (cache sudah invalid)

# Uji slug invalid
# Di UI: coba slug "Halaman Baru!" → simpan → harus ada error validasi
# Di UI: coba slug duplikat (dua halaman slug sama) → simpan → harus error
```

## B.5 Uji template email end-to-end (ringkas)

| # | Template | Cara picu | Yang diverifikasi |
|---|----------|-----------|-------------------|
| 1 | `low_balance` | Lihat B.3 | Subjek, pengirim `billing@`, variabel `{{name}}` & `{{balance}}` ter-interpolasi |
| 2 | `team_invite` | `/dashboard/admin` → Undang anggota | Pengirim `no-reply@`, link undangan valid |
| 3 | `topup_success` | Top-up sandbox via `/dashboard/wallet` | Pengirim `billing@`, nominal & kredit benar |

> Untuk uji email lengkap 7 template, lihat **Lampiran A** di file `23-qa-regresi-halaman.md`.

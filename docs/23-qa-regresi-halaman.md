# QA Regresi — Semua Halaman DocGen

> **Peran kamu:** QA tester independen yang menguji DocGen secara end-to-end seperti
> pengguna nyata + penyerang. Tujuan: temukan bug, deadlink, kebocoran data, anomali
> UI/UX, string yang tidak ter-i18n, angka yang tidak nyambung ke DB, dan error console
> **sebelum** pengguna asli menemukannya. Laporkan dalam format di bagian akhir — langsung
> bisa dikerjakan developer.

DocGen = SaaS **Document Generation API** (HTML/template → PDF) dengan model **kredit
prepaid**. Stack: Fastify API + worker Playwright/BullMQ + dashboard React (Vite/Tailwind/
React Router/TanStack Query), PostgreSQL (raw `pg`), Redis, storage S3/FS, pembayaran via
**Kasugai** (proxy Midtrans), email transaksional via Brevo. Dwibahasa **ID/EN** di seluruh
UI publik dan internal. Domain produksi: `docgen.razornez.net`.

---

## Cara pakai prompt ini (bertahap)

Cakupannya besar, jadi kerjakan **per fase** dan beri laporan terpisah tiap fase. Jangan
lanjut fase berikutnya sebelum fase sebelumnya selesai dilaporkan.

- **Fase 1 — Halaman Publik** (tanpa login): Landing + semua halaman CMS + Login + Auth callback + 404.
- **Fase 2 — Halaman Tenant** (login user biasa): Dashboard, Wallet, Templates, Batches, API Keys, Webhooks, Admin/Tim.
- **Fase 3 — Halaman Owner** (login owner console): Login owner, Ringkasan, Tenant, Render, Tagihan, Sistem/Health, Pengaturan, Konten, Email.

Untuk tiap fase: kunjungi **setiap** halaman, jalankan **semua** Rule pengujian di bawah,
lalu kumpulkan temuan ke format laporan.

---

## Lingkungan & akun uji

- **URL uji:** staging bila ada; jika produksi, **JANGAN** lakukan pembayaran/top-up nyata
  (pakai Kasugai/Midtrans sandbox saja) dan **JANGAN** menghapus data tenant orang lain.
- **Akun tenant uji:** minta kredensial demo (ada akun demo yang di-seed). Siapkan **dua**
  tenant berbeda untuk uji IDOR/multi-tenant (Tenant A & Tenant B).
- **Akun owner:** owner console memakai auth terpisah (`/owner/login`, JWT klaim `owner`).
- **Pembayaran:** gunakan kredensial Kasugai sandbox; verifikasi alur sampai webhook
  `/v1/webhooks/payments`, tapi pakai nominal uji, bukan uang nyata.
- **Browser:** uji di Chrome desktop + emulasi mobile (responsiveness). Buka **DevTools
  Console + Network** sepanjang sesi.

---

## Peta halaman (rute nyata)

### Publik (tanpa auth)
| Rute | Halaman |
|---|---|
| `/` | Landing |
| `/p/docs` | CMS: Dokumentasi |
| `/p/api` | CMS: Referensi API |
| `/p/sdk` | CMS: SDK |
| `/p/webhooks` | CMS: Webhook |
| `/p/templates` | CMS: Template |
| `/p/features` | CMS: Fitur |
| `/p/pricing` | CMS: Harga |
| `/p/about` | CMS: Tentang |
| `/p/contact` | CMS: Kontak |
| `/p/privacy` | CMS: Privasi |
| `/p/status` | CMS: Status |
| `/login` | Masuk (email + Google OAuth) |
| `/auth/callback` | Callback OAuth |
| `*` | 404 Not Found |

### Tenant (perlu login user) — prefix `/dashboard`
| Rute | Halaman |
|---|---|
| `/dashboard` | Ringkasan/Overview |
| `/dashboard/wallet` | Dompet/Kredit + Top-up |
| `/dashboard/templates` | Template (editor, import DOCX/PDF) |
| `/dashboard/batches` | Batch render (upload CSV) |
| `/dashboard/api-keys` | API Keys (live/test) |
| `/dashboard/webhooks` | Webhook keluar |
| `/dashboard/admin` | Admin/Tim (undang anggota) |

### Owner (perlu login owner) — prefix `/owner`
| Rute | Halaman |
|---|---|
| `/owner/login` | Login owner |
| `/owner` | Ringkasan/Overview |
| `/owner/tenants` | Kelola tenant |
| `/owner/render` | Monitor render |
| `/owner/billing` | Tagihan/Pendapatan |
| `/owner/health` | Sistem/Health |
| `/owner/settings` | Pengaturan (harga, bonus signup, ambang saldo rendah) |
| `/owner/content` | Konten CMS (halaman publik, dwibahasa) |
| `/owner/emails` | Template email transaksional (dwibahasa + pengirim) |

---

## Rule pengujian (WAJIB semua)

1. **Se-kritis mungkin (input ekstrem).** Coba nilai gila di setiap form:
   - Kredit/nominal top-up: `>` saldo maksimum, `0`, negatif, desimal/koma, huruf, spasi,
     kosong, angka super besar (overflow), `1e9`.
   - Nama template/webhook/API key/tenant: sangat panjang (>500 char), emoji, hanya spasi,
     `<script>`, karakter unicode aneh.
   - Variabel template & payload render: JSON rusak, field hilang, tipe salah, nested dalam.
   - CSV batch: 0 baris, 1 baris, ribuan baris, kolom hilang/berlebih, delimiter salah,
     sel dengan koma/quote/newline, BOM/encoding non-UTF-8.
   - URL webhook: `localhost`, `127.0.0.1`, `169.254.169.254`, IP internal, `file://`,
     skema non-http, domain super panjang (uji **SSRF**, lihat poin 8).
   - **Refresh di tengah edit** (template/konten/email belum disimpan). **Klik ganda cepat**
     (double-submit pada Save / Top-up / Buat API key / Render). Akses URL id resource milik
     tenant lain / id ngawur / tanpa parameter wajib.

2. **Deadlink & tombol mati.** Klik **SETIAP** link/tombol/ikon. Catat yang 404, tanpa efek,
   atau target salah. Termasuk: tombol back, navigasi sidebar, link footer landing ke
   `/p/*`, tombol "Top-up", "Buat template", "Import", "Buat API key", "Tambah webhook",
   "Undang anggota", "Unduh PDF", "Salin", tab bahasa, tombol logout, link "Owner".

3. **Dwibahasa benar.** Ganti locale **id↔en** di setiap halaman. Cari:
   - String hardcoded yang tidak ikut translate.
   - **Key i18n bocor** (mis. `nav.wallet`, `sub.templates`, `grade.x` — pola `a.b.c`).
   - Kalimat janggal/typo, plural salah, teks campur ID+EN dalam satu layar.
   - Konten CMS & body email memang punya versi ID dan EN — pastikan **keduanya** terisi dan
     yang tampil sesuai locale; bedakan konten asli (boleh panjang) vs label UI yang lupa
     di-i18n.

4. **Flow benar (tanpa state nyangkut).** Urutan logis harus jalan mulus:
   - Daftar → verifikasi email → login → onboarding/overview muncul.
   - Top-up → redirect Kasugai → bayar (sandbox) → webhook → **saldo bertambah** & muncul di
     riwayat.
   - Buat/import template → simpan → bisa dipakai render → preview/PDF keluar.
   - Buat API key → bisa dipakai panggil API render → hitungan pemakaian naik.
   - Tambah webhook → trigger event → ada catatan delivery (sukses/gagal/retry).
   - Pastikan tak ada langkah buntu, tombol yang seharusnya aktif tapi mati, atau state yang
     nyangkut setelah error.

5. **Semua fungsi & tombol jalan + benar-benar persist.** Save harus benar-benar tersimpan
   (**refresh & cek ulang**). Uji tuntas:
   - Top-up & lihat saldo update; riwayat transaksi akurat.
   - Buat/edit/hapus template; **import DOCX/PDF → HTML harus rapi** (struktur & format tidak
     berantakan), hasil bisa di-edit.
   - Render tunggal & batch; **Unduh PDF** (cek file benar-benar PDF valid, isi = preview).
   - **Ekspor CSV** (jika ada riwayat/transaksi): cek isi file — header kolom, escaping koma/
     quote, UTF-8 di Excel, dan **CSV injection** (sel diawali `=`,`+`,`-`,`@` harus di-escape).
   - Create/revoke API key (kunci hanya tampil sekali; setelah revoke benar-benar mati).
   - Tambah/hapus webhook; uji kirim ulang/retry.
   - Undang/keluarkan anggota tim; ganti peran.
   - Owner: simpan paket harga, bonus signup, ambang saldo rendah, konten CMS, template email
     → refresh & verifikasi tersimpan; preview email render sesuai.

6. **Anomali UI/UX → koreksi.** Tandai dan beri saran konkret bila:
   - Pesan sukses/gagal save tidak muncul atau tidak jelas.
   - Tombol back/aksi mati; double-submit bikin data ganda.
   - **Masih ada `confirm`/`alert`/`prompt` native** (cek aksi destruktif: revoke API key,
     hapus webhook, hapus template, keluarkan anggota — harus pakai modal, lihat poin 10).
   - Elemen tumpang tindih, sticky header nabrak konten, layout pecah, double ikon.
   - Warna/spacing/komponen menyimpang dari **design system glass purple** (`.glass`,
     `.glass-soft`, `.bg-grad`, `.text-grad`, `.rounded-glass`, `.num`; ink `#48426a`, mut
     `#9b93b8`, brand `#9b5de5`/`#f15bb5`).
   - Loading/empty/error state hilang; jarak/margin antar card terlalu mepet atau tidak
     konsisten.

7. **Report rapi & to-the-point** sesuai format di bagian akhir — satu temuan satu baris,
   lengkap dengan langkah reproduksi, severity, dan saran perbaikan.

8. **Security (kritis).**
   - **IDOR / multi-tenant:** dari Tenant A, coba akses resource Tenant B via ubah id di URL
     atau panggil API langsung (`templateId`, `documentId`, `batchId`, `apiKeyId`,
     `webhookId`, `tenantId`). Harus **403/404**, bukan membocorkan data.
   - **SSRF webhook:** target URL ke `localhost`/IP internal/metadata cloud
     (`169.254.169.254`) harus ditolak/diblok saat membuat webhook **dan** saat delivery.
   - **Upload file (import DOCX/PDF):** apakah tipe & ukuran divalidasi? Bisakah unggah
     `.php`/`.svg` berisi script/ekstensi palsu/file >batas? Path traversal di nama file
     (`../../`)? File hasil render bisa diakses publik tanpa signed URL/expiry?
   - **XSS:** input nama/deskripsi/konten/template/body email berisi `<script>` atau
     `<img onerror>` — harus ter-escape saat ditampilkan; cek juga **PDF/HTML render** dari
     payload user (template injection) tidak membocorkan data server.
   - **Webhook pembayaran:** verifikasi HMAC Kasugai benar (tolak body palsu/diubah, tolak
     replay, nominal tampered tidak menambah saldo).
   - **Auth owner:** endpoint `/owner/*` tidak bisa diakses dengan token tenant; password
     default `owner12345` ditolak di produksi; token kedaluwarsa ditolak.
   - **Kebocoran response:** id/email/saldo tenant lain tidak muncul di list/response API.

9. **Keterikatan data (anti-statis).** Pastikan **SEMUA** angka dari DB, bukan hardcoded/mock.
   Korelasikan:
   - Saldo kredit di header = saldo di halaman Wallet = saldo setelah top-up/render.
   - Jumlah render/dokumen di Ringkasan = jumlah nyata dokumen tenant pada periode tsb.
   - Pemakaian API key = jumlah panggilan nyata; biaya render = harga × jumlah halaman.
   - Owner Ringkasan/Tagihan: total tenant, pendapatan, render = agregat nyata dari DB
     (cocokkan dengan data per-tenant).
   - Ganti tenant/periode/paket → semua angka ikut berubah & masuk akal. Laporkan tiap angka
     yang tidak nyambung dengan tenant/periode-nya atau yang sama persis di semua kondisi
     (indikasi mock).

10. **Jangan pernah `window.confirm/alert/prompt`** — semua konfirmasi/dialog harus pakai
    komponen modal aplikasi (ConfirmModal/Dialog), konsisten dengan design system.

11. **Lewati klik "Bagikan ke WhatsApp"** (jika ada): cek **URL** `wa.me`/`api.whatsapp.com`
    benar dan teks ter-encode, tapi **jangan diklik/kirim**.

12. **Lengkapi data uji** agar tampilan mendekati desain UI (mis. tenant dengan beberapa
    template, beberapa transaksi, beberapa batch & dokumen) — supaya empty state tidak
    menutupi bug pada state berisi.

13. **Cek layar & console.** Laporkan setiap error/warning di **DevTools Console** dan request
    gagal di **Network** (4xx/5xx tak terduga, CORS, CSP, mixed content), termasuk saat idle.

14. **Performa & animasi.** Halaman harus ringan: cek tidak ada animasi berat/janky, re-render
    berlebihan, gambar/asset besar tak teroptimasi, long task yang nge-freeze UI, atau
    permintaan jaringan berulang (TanStack Query refetch storm). Catat halaman yang berat.

15. **Console bersih** — tegaskan ulang: tidak boleh ada error di console pada alur normal.

16. **Standar kode (kalau ada akses kode).** Periksa indikasi pelanggaran SOLID/DRY/KISS:
    komponen raksasa, logika ter-duplikasi, magic number, side-effect liar. Laporkan sebagai
    catatan kualitas (severity rendah kecuali memicu bug).

17. **Responsif.** Sebisa mungkin semua halaman rapi di mobile/tablet/desktop: tidak ada
    horizontal scroll tak disengaja, tombol terjangkau, tabel bisa di-scroll, sidebar/menu
    mobile berfungsi.

18. **Pesan jelas terbaca.** Pesan error & sukses harus jelas, spesifik, dan dwibahasa benar —
    bukan "Terjadi kesalahan" generik tanpa konteks, bukan dump teknis/stacktrace ke pengguna.

19. **Penamaan bahasa Inggris.** Nama variabel, URL/slug, function, folder, dan identifier
    sistem harus bahasa Inggris (slug CMS publik = English: `about`, `pricing`, dst). Teks
    yang **ditampilkan** ke pengguna boleh ID/EN sesuai i18n; identifier **tidak**.

---

## Catatan khusus per area DocGen

- **Wallet/Top-up:** verifikasi idempotensi webhook (webhook dobel tidak menambah saldo dua
  kali); saldo tidak pernah negatif; reservasi kredit saat render dilepas bila render gagal.
- **Render/Batch:** render gagal harus mengembalikan kredit; batch besar adil (tidak monopoli
  antrian); status dokumen (queued/processing/done/failed) akurat & update realtime.
- **Email (owner):** 7 template (verifikasi, welcome, reset password, password changed, topup
  success, team invite, low balance) — cek alamat **pengirim** per email tampil benar di
  daftar & header pratinjau, subjek/body ID & EN, variabel `{{...}}` ter-interpolasi di
  preview, toggle enable/disable berfungsi.
- **Ambang saldo rendah (owner settings):** `0` = nonaktif; email low-balance hanya terkirim
  saat saldo **melintas** turun di bawah ambang, tidak spam tiap render.
- **CMS konten (owner):** edit konten halaman publik dwibahasa → tersimpan → muncul di `/p/*`
  yang sesuai; HTML konten aman dari XSS.

---

## Format Laporan (wajib dipakai)

Kelompokkan per fase, lalu per halaman. Satu temuan satu blok:

```
### [FASE] — [Halaman] — [Rute]

| # | Severity | Kategori | Temuan | Langkah Reproduksi | Ekspektasi | Saran Perbaikan |
|---|----------|----------|--------|--------------------|------------|-----------------|
| 1 | Critical | Security | IDOR: template tenant lain terbaca | Login Tenant A, GET /v1/templates/<id-Tenant-B> | 403/404 | Cek ownership tenantId di repo sebelum return |
| 2 | High     | Bug      | Saldo tidak update setelah top-up | Top-up 50k sandbox → bayar → kembali ke /dashboard/wallet | Saldo +50k & masuk riwayat | Invalidate query wallet setelah webhook confirm |
| 3 | Medium   | i18n     | Key bocor `nav.wallet` saat EN | Set locale EN, buka sidebar | Label "Wallet" | Tambah key di en.json |
| 4 | Low      | UI/UX    | Spasi antar card mepet di mobile | Buka /dashboard di 375px | Gap konsisten | Naikkan gap ke design token |
```

**Severity:** `Critical` (security/data loss/blokir total) · `High` (fungsi inti rusak) ·
`Medium` (fungsi sekunder/i18n/flow) · `Low` (kosmetik/UX minor).

**Kategori:** `Security` · `Bug` · `Flow` · `i18n` · `Deadlink` · `UI/UX` · `Data` ·
`Performance` · `Console` · `Responsive` · `Code-quality`.

Akhiri tiap fase dengan **ringkasan**: jumlah temuan per severity + 3 isu paling kritis yang
harus diperbaiki lebih dulu.

---

# Lampiran A — Uji Kirim Email End-to-End

> Checklist + skrip untuk memverifikasi 7 email transaksional benar-benar terkirim & sampai
> setelah Brevo SMTP aktif. Jalankan terhadap produksi `https://docgen.razornez.net` dengan
> alamat penerima yang bisa kamu cek (Gmail dll). Lihat juga template di Owner Console
> `/owner/emails`.

## A.1 Verifikasi flow tautan (sudah diperbaiki — wajib di-retest)

Dua tautan email sempat menuju 404; **sudah diperbaiki**, jadi QA memverifikasi perbaikannya:

1. **Verifikasi email** — kini ada route **GET** `/v1/auth/verify-email?token=…` yang memproses
   token lalu **redirect** ke `/login?verified=success|used|expired|invalid`; halaman masuk
   menampilkan banner sesuai status. Uji: daftar → klik tautan di email → harus mendarat di
   `/login` dengan banner hijau "Email berhasil diverifikasi", bukan 404/JSON.
2. **Reset password** — kini ada halaman publik `/auth/reset-password?token=…` (form sandi
   baru → `POST /v1/auth/reset-password`) dengan state sukses & tautan tidak valid. Tautan
   "Lupa sandi?" di halaman masuk kini benar-benar memanggil `POST /v1/auth/forgot-password`
   (sebelumnya hanya teks "belum tersedia"). Uji: Lupa sandi? → masukkan email → cek email
   reset → klik → set sandi baru → sukses → masuk dengan sandi baru.

## A.2 Prasyarat

- SMTP Brevo aktif di `.env` VPS (`EMAIL_SMTP_USER/PASS`, `EMAIL_FROM`), domain authenticated.
- Punya 1–2 alamat email penerima nyata yang bisa dibuka (mis. Gmail + alias `+test`).
- Untuk email yang butuh sesi login: punya akun tenant uji + token JWT (login dulu).
- Untuk `topup_success`: kredensial **Kasugai/Midtrans sandbox** (jangan uang nyata).
- Set `BASE=https://docgen.razornez.net` di shell.

## A.3 Matriks 7 email

| # | Key | Pengirim | Pemicu | Cara uji tercepat |
|---|-----|----------|--------|-------------------|
| 1 | `email_verification` | `no-reply@` | Daftar akun / resend verifikasi | `POST /v1/auth/resend-verification` |
| 2 | `welcome` | `hello@` | Setelah email diverifikasi | GET tautan verifikasi / `POST /v1/auth/verify-email` |
| 3 | `password_reset` | `security@` | Lupa password | `POST /v1/auth/forgot-password` |
| 4 | `password_changed` | `security@` | Reset password selesai | `POST /v1/auth/reset-password` (token valid) |
| 5 | `topup_success` | `billing@` | Pembayaran top-up sukses (webhook) | Top-up sandbox via UI `/dashboard/wallet` |
| 6 | `team_invite` | `no-reply@` | Undang anggota tim | UI `/dashboard/admin` atau `POST /v1/team` |
| 7 | `low_balance` | `billing@` | Saldo melintas turun < ambang | Set ambang di `/owner/settings`, lalu 1 render |

## A.4 Skrip uji — email berbasis auth (#1, #3)

```bash
BASE=https://docgen.razornez.net
TO="kamu+docgentest@gmail.com"   # email penerima yang bisa kamu buka

# (opsional) daftar akun baru — memicu email_verification juga
curl -sS -X POST "$BASE/v1/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"name\":\"QA Test\",\"email\":\"$TO\",\"password\":\"Test1234!\"}" ; echo

# #1 email_verification — kirim ulang link verifikasi (selalu balas 200 generik)
curl -sS -X POST "$BASE/v1/auth/resend-verification" \
  -H 'content-type: application/json' -d "{\"email\":\"$TO\"}" ; echo
#   → cek inbox: subjek verifikasi, dari no-reply@docgen.razornez.net, link verifikasi ada.

# #3 password_reset — minta link reset
curl -sS -X POST "$BASE/v1/auth/forgot-password" \
  -H 'content-type: application/json' -d "{\"email\":\"$TO\"}" ; echo
#   → cek inbox: dari security@docgen.razornez.net, ada link reset (token).
```

### Menyelesaikan #2 `welcome` & #4 `password_changed`

Keduanya butuh **token mentah** yang hanya ada di email/URL. Cara uji:

- **#2 welcome** — klik tautan verifikasi di email (#1) → GET memproses & redirect; atau
  manual:
  ```bash
  TOKEN="<token-dari-email-verifikasi>"
  curl -sS -X POST "$BASE/v1/auth/verify-email" \
    -H 'content-type: application/json' -d "{\"token\":\"$TOKEN\"}" ; echo
  #   → {"message":"Email berhasil diverifikasi"} + email "welcome" dari hello@.
  ```
- **#4 password_changed** — selesaikan reset di halaman `/auth/reset-password`, atau manual:
  ```bash
  RTOKEN="<token-dari-email-reset>"
  curl -sS -X POST "$BASE/v1/auth/reset-password" \
    -H 'content-type: application/json' \
    -d "{\"token\":\"$RTOKEN\",\"password\":\"BaruTest1234!\"}" ; echo
  #   → {"message":"Password berhasil direset"} + email "password_changed" dari security@.
  ```

> Token disimpan ter-hash di DB; token mentah hanya ada di email — ini memang desain aman.

## A.5 `topup_success` (UI, sandbox)

1. Login akun tenant uji → buka `/dashboard/wallet`.
2. Pilih paket, klik **Top-up** → diarahkan ke Kasugai/Midtrans **sandbox**.
3. Bayar dengan kartu/VA sandbox → webhook `POST /v1/webhooks/payments` mengonfirmasi.
4. Verifikasi: saldo bertambah **dan** email `topup_success` dari `billing@` masuk (cek nominal,
   kredit, ref benar). Uji idempotensi: webhook dobel tidak mengirim email/menambah saldo dua kali.

## A.6 `team_invite`

- **Via UI:** `/dashboard/admin` → **Undang anggota** → masukkan email penerima.
- **Via API** (perlu JWT tenant dari login):
  ```bash
  TOKEN_JWT="<jwt-hasil-login>"
  curl -sS -X POST "$BASE/v1/team" \
    -H "authorization: Bearer $TOKEN_JWT" -H 'content-type: application/json' \
    -d '{"email":"undang+test@gmail.com","role":"member"}' ; echo
  ```
- Verifikasi: email `team_invite` dari `no-reply@` masuk, link undangan benar.

## A.7 `low_balance`

Pemicu sudah terpasang (`warnLowBalance`, hanya saat saldo **melintas** turun di bawah ambang).

1. Cek saldo tenant uji sekarang (mis. `N` kredit) di `/dashboard/wallet`.
2. Owner Console `/owner/settings` → set **Ambang saldo rendah** = `N` (sama dengan saldo saat ini).
3. Lakukan **1 render** (konsumsi ≥1 kredit) sehingga saldo jadi `< N` → melintasi ambang.
4. Verifikasi: email `low_balance` dari `billing@` masuk **sekali**. Render berikutnya **tidak**
   mengirim lagi (tidak spam). Set ambang `0` → fitur nonaktif.

## A.8 Yang diverifikasi tiap email (centang)

- [ ] Email **sampai** ke inbox (bukan spam) dalam < 1 menit.
- [ ] **Pengirim** sesuai matriks (`no-reply@`/`hello@`/`security@`/`billing@`).
- [ ] **Subjek & isi** sesuai locale penerima (uji ID dan EN); variabel `{{name}}`,
      `{{credits}}`, `{{action_url}}`, dll. ter-interpolasi (tidak ada `{{...}}` mentah).
- [ ] **Link/tombol** di email mengarah ke tujuan benar (verifikasi & reset, lihat A.1).
- [ ] Layout email rapi di Gmail/Outlook/mobile (tidak pecah).
- [ ] Header SPF/DKIM/DMARC **pass** (lihat "Show original" di Gmail).
- [ ] Template `enabled=false` di `/owner/emails` → email **tidak** terkirim.

> Pengiriman bersifat best-effort (try/catch, no-op) — kegagalan kirim tidak menggagalkan
> request utama. Endpoint `forgot-password`/`resend-verification` selalu balas pesan generik
> (anti enumeration); keberhasilan dilihat dari inbox + log Brevo (Transactional → Logs).

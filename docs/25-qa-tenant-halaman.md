# QA Regresi — Halaman Tenant DocGen

> **Peran kamu:** QA tester independen yang menguji semua halaman **tenant** DocGen secara
> end-to-end seperti pengguna nyata + penyerang. Tujuan: temukan bug, deadlink, kebocoran data,
> anomali UI/UX, string yang tidak ter-i18n, angka yang tidak nyambung ke DB, dan error console
> **sebelum** pengguna asli menemukannya.
>
> Dokumen ini fokus pada **Fase 2 — Halaman Tenant** (login user biasa, prefix `/dashboard`).
> Lihat [23-qa-regresi-halaman.md](23-qa-regresi-halaman.md) untuk Fase 1 (publik) & Fase 3 (owner).

---

## Lingkungan & akun uji

- **URL lokal:** `http://localhost:5173` (Vite) + API `http://localhost:3001`
- **URL produksi:** `https://docgen.razornez.net` (jangan top-up nyata, pakai Kasugai sandbox)
- **Akun demo:** `demo@docgen.razornez.net` / `demo1234`
- **Dua tenant berbeda** wajib disiapkan untuk uji IDOR — sebut **Tenant A** & **Tenant B**.
- **Browser:** Chrome desktop + emulasi mobile (375 px). Buka **DevTools → Console + Network**
  sepanjang sesi.
- **Prasyarat data:** Seed minimal sebelum mulai —
  - ≥ 2 template (salah satu hasil import default)
  - ≥ 1 batch sudah selesai (ada dokumen yang bisa diunduh)
  - ≥ 1 API key live + 1 API key test
  - ≥ 1 webhook endpoint
  - ≥ 2 anggota tim (owner + 1 member)
  - ≥ 3 transaksi (agar filter wallet bisa diuji)

---

## Peta fitur per halaman

| Rute | Halaman | Fitur utama |
|------|---------|-------------|
| `/dashboard` | Ringkasan | Stats, chart 7-hari, batch terbaru, transaksi terbaru, tips |
| `/dashboard/wallet` | Dompet | Saldo, top-up (paket + metode + Snap), riwayat + filter |
| `/dashboard/templates` | Template | Daftar, cari/filter, grid/list, buat/edit/pratinjau, import default, panduan API |
| `/dashboard/batches` | Batch | Buat batch (template + JSON + webhook), daftar + expand dokumen, unduh PDF |
| `/dashboard/api-keys` | API Keys | Buat (live/test), tampilkan sekali, salin referensi, cabut |
| `/dashboard/webhooks` | Webhooks | Tambah endpoint (URL + events), aktif/nonaktif, signing secret, hapus |
| `/dashboard/admin` | Admin/Tim | Stats org, daftar anggota, undang, ganti peran, keluarkan, mode kelola |

---

## Rule pengujian global (jalankan di SETIAP halaman)

### G1 — Input ekstrem
Coba nilai gila di setiap field form sebelum submit:
- **Teks:** sangat panjang (>500 karakter), hanya spasi, `<script>alert(1)</script>`,
  `<img src=x onerror=alert(1)>`, emoji, unicode aneh (`‮`, null-byte `\0`).
- **Angka:** `0`, negatif, desimal, `1e9`, `Infinity`, huruf, kosong.
- **URL (webhook):** `http://` (bukan HTTPS), `localhost`, `127.0.0.1`, `169.254.169.254`,
  `file://`, `javascript:`, domain sangat panjang — semua harus ditolak.
- **JSON (batch):** JSON rusak, string kosong, array kosong, objek tunggal (bukan array),
  item tanpa key `ref`, item tanpa key `data`, `null`, angka, `>500` item.
- **Double-submit:** klik tombol kirim dua kali cepat — pastikan request tidak dobel.
- **Refresh di tengah form:** isi form → refresh → apakah state terkikis dengan benar (tidak ada
  data parsial yang tersimpan atau state rusak)?

### G2 — Deadlink & tombol mati
Klik **setiap** link, tombol, ikon, dan label yang kelihatan interaktif. Catat yang:
- Tidak ada efek sama sekali.
- Mengarah ke 404 / route salah.
- Disabled tapi seharusnya aktif (atau sebaliknya).

Checklist wajib per halaman:
- Tombol navigasi sidebar.
- Tombol aksi utama (buat, simpan, hapus, cabut).
- Link dalam teks ("Buka editor", "Semua batch", "Wallet").
- Tombol bahasa (ID/EN toggle).
- Tombol logout.

### G3 — Dwibahasa (ID/EN)
Toggle locale **id↔en** di setiap halaman dan catat:
- String yang **tidak berubah** (hardcoded, bukan i18n).
- **Key i18n bocor** — pola `x.y.z` muncul di UI (mis. `nav.wallet`, `sub.templates`).
- Kalimat janggal, typo, campur-aduk ID+EN dalam satu kalimat/layar.
- Plural salah (mis. "1 templates", "0 kunci aktif").

### G4 — Keterikatan data (anti-statis)
Semua angka harus dari DB, bukan hardcoded/mock:
- Saldo di header `Layout` = saldo di `/dashboard/wallet` = saldo setelah top-up/render.
- Jumlah dokumen di Dashboard = jumlah batch/dokumen nyata bulan ini.
- Jumlah anggota tim di Admin = panjang list nyata.
- Ganti periode atau lakukan aksi → angka ikut berubah & masuk akal.
Laporkan tiap angka yang **sama persis** di semua kondisi (indikasi hardcode/mock).

### G5 — Console & Network
Buka **DevTools → Console + Network** sepanjang sesi:
- Tidak boleh ada **error** atau **warning** di console pada alur normal.
- Tidak boleh ada request **4xx/5xx** tak terduga.
- Tidak ada **CORS**, **CSP**, atau **mixed-content** error.
- Tidak ada **refetch storm** — query TanStack tidak boleh polling tak henti-henti pada
  halaman statis.

### G6 — Responsif
Uji di viewport **375 px** (mobile) dan **1280 px** (desktop):
- Tidak ada horizontal scroll yang tidak disengaja.
- Tabel bisa di-scroll horizontal bila diperlukan.
- Tombol tidak terpotong atau tertumpuk.
- Sidebar/menu mobile dapat dibuka dan ditutup.

### G7 — Modal & konfirmasi
Semua aksi destruktif (cabut API key, hapus webhook, keluarkan anggota) **harus** menggunakan
komponen modal aplikasi (`ConfirmModal`). Tidak boleh ada `window.confirm`, `window.alert`,
atau `window.prompt` native.

### G8 — Persist & refresh
Setiap perubahan yang di-save harus tahan refresh:
- Buat template → simpan → refresh → masih ada.
- Cabut API key → refresh → benar-benar hilang/nonaktif.
- Tambah webhook → refresh → endpoint masih ada.
- Undang anggota → refresh → anggota muncul di daftar.

---

## Checklist per halaman

---

### H1 — Dashboard (`/dashboard`)

**Tujuan:** Halaman ringkasan pasca-login. Semua kartu harus memuat data nyata dari DB.

#### H1.1 Tampilan & navigasi
- [ ] Header menampilkan nama **tenant** (bukan user), saldo kredit saat ini, dan link ke wallet.
- [ ] Sidebar aktif di item "Dashboard".
- [ ] Tombol **Top-up** → mengarah ke `/dashboard/wallet`. ✓ deadlink
- [ ] Tombol **Generate** → mengarah ke `/dashboard/templates`. ✓ deadlink
- [ ] Link **"Semua batch"** → `/dashboard/batches`. ✓ deadlink
- [ ] Link **"Wallet"** di kartu transaksi → `/dashboard/wallet`. ✓ deadlink
- [ ] Link **"Buka editor"** di tips → `/dashboard/templates`. ✓ deadlink

#### H1.2 Kartu stats (strip 4 kolom)
- [ ] **Saldo kredit** = nilai di `/dashboard/wallet` (refresh kedua halaman, bandingkan).
- [ ] **Dokumen bulan ini** = jumlah dokumen tenant pada bulan berjalan (hitung manual dari
  batch terbaru, cocokkan).
- [ ] **Success rate** = persentase batch/dokumen selesai tanpa gagal (cek formula vs data nyata).
- [ ] **Render p95** — angka tidak hardcoded (harus berubah kalau ada data baru).
- [ ] Semua angka berformat ribuan pakai separator lokal (mis. `1.250`, bukan `1250`).

#### H1.3 Chart 7-hari aktivitas
- [ ] Chart render dan tidak blank/crash.
- [ ] Label hari (Sen, Sel, …, Min / Mon, Tue, …, Sun) sesuai locale.
- [ ] Bar height proporsional (hari dengan 0 dokumen = bar paling kecil/kosong).
- [ ] Angka "Aktivitas minggu ini" cocok dengan sum 7 bar chart.
- [ ] Animasi bar tidak janky / tidak freeze UI (cek Performance tab).

#### H1.4 Batch terbaru (maks 5)
- [ ] Menampilkan ≤ 5 batch terbaru dengan status, ratio selesai, dan timestamp relatif.
- [ ] Progress bar proporsional terhadap `completed/total`.
- [ ] Status badge berwarna benar: hijau=completed, kuning=queued/processing,
  merah=failed, jingga=partially_failed.
- [ ] **Empty state:** bila belum ada batch, tampilkan pesan kosong yang jelas (bukan crash/blank).

#### H1.5 Transaksi terbaru (maks 5)
- [ ] Menampilkan ≤ 5 transaksi terbaru dengan label, tipe, nominal, dan timestamp.
- [ ] Nominal kredit (top-up/refund/bonus) berwarna **hijau**; debit (pemakaian) **merah**.
- [ ] **Empty state:** bila belum ada transaksi, tampilkan pesan kosong.

#### H1.6 Status sistem
- [ ] 4 item status menampilkan indikator warna (dot) yang mencerminkan kondisi sebenarnya
  (bukan selalu hijau hardcoded).
- [ ] Metrik render p95, uptime API, dan antrian batch tidak semua `0` atau hardcode.

#### H1.7 Tips template HTML
- [ ] 4 tips tampil lengkap (variabel dinamis, page break, gambar Base64, ukuran kertas).
- [ ] Kode snippet di dalam tip tidak ter-escape atau rusak tampilannya.
- [ ] Uji **G3** pada semua label/teks tips (dwibahasa).

---

### H2 — Wallet (`/dashboard/wallet`)

**Tujuan:** Manajemen kredit. Semua alur (saldo, top-up, riwayat) harus end-to-end akurat.

#### H2.1 Kartu saldo
- [ ] **Saldo kredit** = nilai di API `/v1/wallet` (cek via DevTools Network).
- [ ] **"Pemakaian bln ini"** cocok dengan total debit di riwayat bulan berjalan.
- [ ] Nama tenant tampil benar (bukan "undefined"/"null").
- [ ] Saldo 0 ditampilkan dengan benar (tidak blank/crash/negatif).
- [ ] Saldo setelah top-up berhasil **langsung** update tanpa perlu refresh manual.

#### H2.2 Pemilihan paket
- [ ] Semua paket tampil (data dari API `/v1/packages`, bukan hardcoded).
- [ ] Badge **"POPULER"** ada di paket index 1; **"HEMAT"** di paket terakhir (sesuai logika kode).
- [ ] Memilih paket → border purple aktif tampil; memilih ulang → state berganti benar.
- [ ] **Empty state:** bila tidak ada paket, tampilkan pesan (bukan crash).

#### H2.3 Pemilihan metode pembayaran
- [ ] Tiga metode tersedia: QRIS, Virtual Account, E-Wallet.
- [ ] Toggle metode → button aktif berganti (gradient).
- [ ] Uji **G3** pada label metode.

#### H2.4 Alur top-up (Kasugai/Midtrans Sandbox)
> Gunakan **Kasugai sandbox** — jangan uang nyata.

- [ ] Pilih paket + metode → klik **Top-up** → spinner "Membuka…" muncul (loading state).
- [ ] `createTopup` dipanggil sekali (cek Network — bukan dobel).
- [ ] Midtrans Snap modal terbuka, atau fallback ke `payment_url` di tab baru.
- [ ] Bayar via sandbox → webhook tiba → **saldo bertambah** sesuai paket.
- [ ] **Idempotensi:** kirim ulang webhook dua kali → saldo tidak dobel, email tidak dobel.
- [ ] Transaksi top-up muncul di riwayat dengan nominal dan timestamp benar.
- [ ] **Klik ganda** tombol Top-up → request tidak dobel (G1 double-submit).
- [ ] Tutup Snap modal sebelum bayar → `confirmMsg` tidak muncul / tidak error.
- [ ] Top-up tanpa memilih paket → tombol disabled atau validasi muncul.
- [ ] Top-up tanpa memilih metode → validasi muncul.

#### H2.5 Riwayat transaksi
- [ ] Semua transaksi tampil (cek vs `/v1/transactions`).
- [ ] Filter **Semua / Top-up / Pemakaian / Refund** berfungsi — masing-masing filter tampilkan
  subset yang benar.
- [ ] Filter "Pemakaian" → hanya tampil transaksi debit (pemakaian render).
- [ ] Jumlah per transaksi berwarna benar (positif hijau, negatif merah).
- [ ] Timestamp relatif akurat dan sesuai locale.
- [ ] **Empty state** per filter: bila tidak ada transaksi jenis itu, tampilkan pesan kosong.
- [ ] Uji **G3** pada semua label dan kategori transaksi.

---

### H3 — Templates (`/dashboard/templates`)

**Tujuan:** Kelola template HTML. Alur buat/edit/pratinjau/delete harus end-to-end.

#### H3.1 Toolbar
- [ ] **Kolom pencarian** — ketik sebagian nama template → list mengecil; hapus → kembali penuh.
- [ ] Tombol **"X"** clear search muncul saat ada teks, hilang saat kosong.
- [ ] **Filter kategori** — pilih satu kategori → hanya template kategori itu tampil.
- [ ] Filter kategori + pencarian bisa dikombinasikan (keduanya aktif sekaligus).
- [ ] Toggle **Grid/List** berfungsi dan menyimpan pilihan selama sesi.
- [ ] Tombol **"Import default"** (hanya muncul saat sudah ada template) → import berjalan,
  spinner muncul, template baru masuk daftar.
- [ ] Tombol **"+ Template baru"** → modal `TemplateCreator` terbuka.

#### H3.2 State loading & empty
- [ ] **State loading:** spinner tampil saat pertama kali memuat.
- [ ] **Auto-import:** jika daftar kosong pada muat pertama, import default berjalan otomatis
  (cek Network — satu request `POST /v1/templates/import-defaults`).
- [ ] Tidak ada double-import (flag `autoImported` mencegah request dobel).
- [ ] **Empty state** (setelah import juga kosong): pesan "Belum ada template" tampil dengan jelas.
- [ ] **No-results state** (pencarian tidak cocok): ikon, pesan, dan tombol "Reset filter"
  tampil dan berfungsi.

#### H3.3 Grid view — kartu template
- [ ] Setiap kartu menampilkan nama, kategori, versi, dan tanggal update.
- [ ] **Hover overlay** muncul dengan 3 tombol: Pratinjau, Ubah, Panduan API (ikon info).
- [ ] Badge kategori berwarna sesuai warna kategori yang sudah dikonfigurasi.
- [ ] Kartu terakhir adalah **"Blank template"** → klik membuka `TemplateCreator`.

#### H3.4 List view — baris template
- [ ] Setiap baris menampilkan nama, kategori/versi, tanggal (tersembunyi di mobile), 3 tombol aksi.
- [ ] Semua 3 tombol berfungsi sama seperti hover grid.

#### H3.5 Buat template baru (TemplateCreator modal)
- [ ] Modal terbuka dengan form yang jelas (nama, kategori, body HTML).
- [ ] Simpan → template baru muncul di daftar **tanpa** refresh halaman (query diinvalidasi).
- [ ] Nama kosong → validasi mencegah submit.
- [ ] Nama `<script>alert(1)</script>` → nama ter-escape saat ditampilkan di daftar (G1 XSS).
- [ ] Cancel / klik backdrop → modal tutup, tidak ada data yang tersimpan.

#### H3.6 Edit template (TemplateEditor modal)
- [ ] Modal terbuka dengan konten template yang sudah ada (nama + body HTML).
- [ ] Editor HTML bisa diketik/diedit.
- [ ] **Live preview** kanan menampilkan preview sesuai body (cek ada delay/debounce wajar).
- [ ] Simpan → versi template bertambah (v1 → v2); perubahan muncul di daftar.
- [ ] Simpan → saldo kredit tidak berkurang (preview tidak mengkonsumsi kredit).
- [ ] Refresh setelah simpan → perubahan masih ada (G8 persist).
- [ ] Batal → template kembali ke versi sebelumnya (tanpa berubah).

#### H3.7 Pratinjau template
- [ ] Buka pratinjau → modal terbuka dalam mode read-only (tidak bisa mengedit).
- [ ] Pratinjau menampilkan preview HTML template dengan placeholder variabel.

#### H3.8 Panduan API (ApiGuide modal)
- [ ] Klik ikon info → modal terbuka, menampilkan daftar variabel yang diekstrak dari body
  template (format `{{namaVariabel}}`).
- [ ] Template tanpa variabel → modal tampil dengan daftar kosong (tidak crash).
- [ ] Contoh curl/payload ditampilkan dengan benar dan variabel ter-interpolasi.

#### H3.9 Uji keamanan
- [ ] Body template berisi `<script>alert(1)</script>` → apakah preview di editor menjalankan
  script? (harus tidak — pastikan preview di-sandbox/sandboxed iframe atau HTML tidak di-eval).
- [ ] Akses template milik **Tenant B** dari sesi **Tenant A** via URL/API langsung → **403/404**
  (uji IDOR — G8 security).

---

### H4 — Batches (`/dashboard/batches`)

**Tujuan:** Render massal. Alur buat → proses → unduh PDF harus end-to-end.

#### H4.1 Header & stats
- [ ] **"Batch bulan ini"** cocok dengan jumlah batch yang dibuat bulan berjalan (hitung manual).
- [ ] **"Dokumen tercetak"** = total dokumen seluruh batch (sum `total` semua batch).
- [ ] **"Tingkat sukses"** = persentase dokumen completed dari total (bukan hardcoded).

#### H4.2 Buat batch — validasi form
- [ ] Klik **"+ Buat batch"** → form inline muncul.
- [ ] **Tanpa memilih template** → submit → validasi mencegah (bukan crash).
- [ ] **Data items kosong** → submit → validasi.
- [ ] **JSON rusak** (mis. `{,}`) → submit → pesan error JSON parse yang informatif.
- [ ] **Bukan array** (mis. `{}`) → submit → pesan error format yang jelas.
- [ ] **Item tanpa key `ref`** → submit → pesan error.
- [ ] **Item tanpa key `data`** → submit → pesan error.
- [ ] **>500 item** → submit → apakah server atau client membatasi?
- [ ] **Webhook URL bukan HTTPS** → submit → validasi ditolak client dan/atau server.
- [ ] **Webhook URL internal** (`localhost`, `127.0.0.1`) → ditolak (SSRF prevention).

#### H4.3 Buat batch — alur sukses (perlu Redis + worker)
> Lewati bagian ini jika Redis dan worker tidak aktif; tandai sebagai "SKIP — Redis off".

- [ ] Pilih template + isi data valid + (opsional) webhook URL → submit.
- [ ] `createBatch` dipanggil sekali (cek Network — double-submit G1).
- [ ] Batch baru muncul di daftar dengan status **"Queued"** / **"Processing"**.
- [ ] Daftar auto-refetch setiap 5 detik selama ada batch yang belum selesai.
- [ ] Progress bar bergerak naik seiring dokumen selesai.
- [ ] Setelah semua selesai, status berubah ke **"Completed"** atau **"Partly failed"**.
- [ ] **Saldo kredit berkurang** sesuai jumlah dokumen × harga per halaman.
- [ ] Saldo dikembalikan untuk dokumen yang **gagal** (kredit tidak hangus).

#### H4.4 Daftar batch
- [ ] Setiap batch menampilkan: ID (terpotong), ratio `selesai/total`, timestamp relatif, badge status.
- [ ] Warna badge status konsisten dengan Dashboard (G4).
- [ ] Tombol **expand** hanya muncul pada batch dengan status `completed` atau `partially_failed`.
- [ ] Klik expand → panel dokumen terbuka di bawah baris batch.
- [ ] Klik expand lagi → panel tertutup (toggle).

#### H4.5 Panel dokumen (per batch)
- [ ] Panel menampilkan tabel: Ref, Status, Jumlah halaman, Unduh PDF.
- [ ] Spinner selama dokumen sedang di-load (isLoading state).
- [ ] Dokumen `completed` → tombol **"PDF"** muncul dan membuka `output_url` di tab baru.
- [ ] File yang diunduh adalah **PDF valid** (buka di viewer — bukan 404, bukan HTML error).
- [ ] Isi PDF cocok dengan preview template + data yang dikirim.
- [ ] Dokumen `failed` → status badge merah, tombol PDF tidak muncul.
- [ ] Panel auto-refetch setiap 3 detik selama ada dokumen yang masih processing/queued.
- [ ] Setelah semua selesai, auto-refetch berhenti (tidak ada polling terus-menerus — G5).

#### H4.6 Uji keamanan batch
- [ ] Akses dokumen/batch milik **Tenant B** dari sesi **Tenant A** via ubah ID di URL/API → **403/404**.
- [ ] `output_url` PDF tidak dapat diakses tanpa auth jika menggunakan signed URL (verifikasi bahwa
  URL tidak publik/permanen tanpa expiry).

---

### H5 — API Keys (`/dashboard/api-keys`)

**Tujuan:** Kelola kunci integrasi server. Kunci hanya tampil sekali; revoke permanen.

#### H5.1 Buat API key
- [ ] Klik **"+ Buat API key"** → form mode (Live/Test) muncul.
- [ ] Klik lagi → form tutup (toggle).
- [ ] Pilih **Live** → buat → kotak **amber** muncul dengan kunci penuh.
- [ ] Pilih **Test** → buat → kotak **amber** muncul dengan kunci penuh.
- [ ] **Kunci penuh hanya tampil sekali** — tutup form atau reload → kunci tidak tampil lagi.
- [ ] **Kunci baru langsung muncul di daftar** tanpa refresh manual.
- [ ] Buat tanpa memilih mode → validasi atau default ke satu mode.

#### H5.2 Tampilan daftar kunci
- [ ] Setiap kunci menampilkan: prefix (bagian depan kunci), ****·last4, badge LIVE/TEST,
  tanggal dibuat, waktu terakhir dipakai (atau "belum dipakai").
- [ ] Kunci Live → ikon **hijau**; Test → ikon **biru**.
- [ ] Kunci yang sudah dicabut → opacity lebih rendah, tombol "Cabut" tidak muncul.

#### H5.3 Salin referensi
- [ ] Klik ikon **salin** → ikon berubah ke centang selama ~1,2 detik lalu kembali ke salin.
- [ ] Yang disalin adalah **referensi** (prefix····last4), bukan kunci penuh.
- [ ] Verifikasi di clipboard (paste ke editor teks).

#### H5.4 Cabut API key
- [ ] Klik **"Cabut"** → modal konfirmasi `ConfirmModal` muncul (bukan `window.confirm` — G7).
- [ ] Modal menjelaskan konsekuensi (kunci tidak bisa diaktifkan kembali).
- [ ] Konfirmasi → `revokeApiKey` dipanggil → kunci hilang dari daftar atau ditandai nonaktif.
- [ ] Kunci yang sudah dicabut benar-benar ditolak saat dipakai di API call (test dengan curl):
  ```bash
  curl -sS -H "Authorization: Bearer <revoked-key>" \
    https://docgen.razornez.net/v1/templates
  # Harus 401 Unauthorized
  ```
- [ ] Batalkan modal → kunci tetap aktif.

#### H5.5 Uji keamanan
- [ ] Kunci **Live** dari Tenant A tidak bisa mengakses resource Tenant B.
- [ ] Kunci **Test** diterima di endpoint yang membolehkan test, ditolak di endpoint produksi
  (jika ada perbedaan), atau bedanya jelas di dokumentasi.
- [ ] Tidak ada kunci penuh yang bocor di **Network response** (hanya tampil sekali di UI,
  setelah itu hanya `prefix****last4`).

---

### H6 — Webhooks (`/dashboard/webhooks`)

**Tujuan:** Kelola endpoint notifikasi keluar. URL harus HTTPS; secret hanya tampil sekali.

#### H6.1 Tambah endpoint — validasi form
- [ ] Klik **"+ Tambah endpoint"** → form muncul.
- [ ] **URL bukan HTTPS** (`http://`) → submit → pesan error yang jelas.
- [ ] **URL `localhost`/IP internal** → submit → ditolak (SSRF prevention — wajib uji G1 URL).
- [ ] **URL `169.254.169.254`** (AWS metadata) → ditolak.
- [ ] **URL kosong** → submit → validasi.
- [ ] **Tidak ada event dipilih** → tombol submit disabled atau validasi muncul.
- [ ] **Semua event dipilih** → submit → berhasil (batas atas event tidak boleh error).

#### H6.2 Alur buat endpoint sukses
- [ ] Pilih URL HTTPS valid + ≥1 event → submit.
- [ ] `createWebhook` dipanggil sekali (G1 double-submit).
- [ ] Kotak **amber** muncul dengan **signing secret** penuh (`whsec_...`).
- [ ] Secret hanya tampil sekali — refresh atau buat baru → secret tidak terulang.
- [ ] Endpoint baru muncul di daftar dengan status **Aktif**.
- [ ] Badge event tampil pada baris endpoint.

#### H6.3 Tampilan daftar endpoint
- [ ] Setiap endpoint menampilkan: URL, badge event, secret tersembunyi (`whsec_****last4`),
  toggle aktif/nonaktif.
- [ ] Endpoint aktif → ikon **ungu**; nonaktif → ikon **abu-abu**.
- [ ] Toggle **Aktif/Nonaktif** berfungsi dan tersimpan setelah refresh (G8).

#### H6.4 Hapus endpoint
- [ ] Tombol hapus muncul saat hover baris (opacity 0 → 100).
- [ ] Klik → modal konfirmasi `ConfirmModal` muncul (bukan `window.confirm` — G7).
- [ ] Konfirmasi → endpoint dihapus dari daftar.
- [ ] Batalkan → endpoint tetap ada.
- [ ] Endpoint yang dihapus tidak lagi menerima delivery (verifikasi: trigger event → tidak ada
  HTTP call ke URL tersebut di log server).

#### H6.5 Verifikasi signature (info card)
- [ ] Card info "Verify signature" tampil di bawah daftar.
- [ ] Menjelaskan header `X-Docgen-Signature-256` dan metode HMAC-SHA256.
- [ ] Uji dwibahasa (G3).

#### H6.6 Uji delivery webhook (membutuhkan URL endpoint nyata)
Gunakan `https://webhook.site` atau sejenisnya sebagai URL endpoint uji:
- [ ] Buat batch → selesai → endpoint menerima event `batch.completed` dengan payload benar.
- [ ] Payload berisi `batch_id`, `tenant_id`, `status` yang cocok dengan data nyata.
- [ ] Header `X-Docgen-Signature-256` ada dan dapat diverifikasi dengan secret.
- [ ] Endpoint nonaktif → event **tidak** terkirim ke URL tersebut.
- [ ] **Retry:** jika endpoint mengembalikan non-2xx, apakah ada retry? (catat hasilnya).

#### H6.7 Uji keamanan
- [ ] Endpoint SSRF: URL `http://169.254.169.254/latest/meta-data` → harus ditolak saat **buat**
  dan saat **delivery**.
- [ ] Endpoint Tenant A tidak bisa diakses/diubah dari sesi Tenant B (IDOR).

---

### H7 — Admin/Tim (`/dashboard/admin`)

**Tujuan:** Kelola anggota tim dan lihat statistik organisasi.

#### H7.1 Kartu organisasi
- [ ] Avatar berisi inisial nama organisasi (bukan "??" atau blank).
- [ ] Nama organisasi, model (Prepaid), negara, tanggal bergabung tampil benar.
- [ ] Stats strip (4 kolom) menampilkan nilai dari DB (G4):
  - Dokumen bulan ini = sum dokumen batch bulan ini (cocokkan dengan Batches).
  - Kredit tersisa = saldo wallet (cocokkan dengan Wallet).
  - Anggota tim = panjang list tim.
  - Template aktif = jumlah template (cocokkan dengan Templates).

#### H7.2 Daftar anggota
- [ ] Semua anggota tampil dengan avatar inisial, nama, email, dan badge peran.
- [ ] Pemilik (owner) ditandai dengan badge khusus dan **tidak ada** kontrol edit/hapus.
- [ ] Anggota dengan peran Admin dan Member tampil sesuai perannya.

#### H7.3 Mode kelola
- [ ] Tombol **"Kelola"** → masuk mode kelola; tombol berubah jadi **"Selesai"**.
- [ ] Dalam mode kelola: dropdown peran dan tombol **"Keluarkan"** muncul di setiap baris
  (kecuali pemilik).
- [ ] Tombol **"Selesai"** → keluar mode kelola; kontrol edit menghilang.

#### H7.4 Undang anggota
- [ ] Klik **"+ Undang anggota"** → modal `OverlayInvite` muncul.
- [ ] **Email kosong** → submit → validasi.
- [ ] **Email format salah** → submit → validasi.
- [ ] **Email sudah terdaftar di tim** → submit → pesan error spesifik (bukan crash).
- [ ] **Nama opsional** — submit tanpa nama harus berhasil.
- [ ] Peran dropdown: hanya **Member** dan **Admin** (bukan Owner).
- [ ] Submit valid → undangan terkirim → `team_invite` email masuk ke penerima (lihat
  Lampiran A di [23-qa-regresi-halaman.md](23-qa-regresi-halaman.md#A.6)).
- [ ] Modal tutup setelah berhasil; daftar tim di-refresh.
- [ ] Klik backdrop atau **"Batal"** → modal tutup tanpa kirim.
- [ ] **Klik ganda tombol "Kirim"** → undangan tidak dobel (G1 double-submit).

#### H7.5 Ganti peran anggota (mode kelola)
- [ ] Pilih peran baru dari dropdown anggota → `updateMemberRole` dipanggil langsung
  (auto-save on change, bukan perlu tombol simpan terpisah).
- [ ] Peran baru tampil setelah berhasil.
- [ ] Refresh → peran tersimpan (G8).
- [ ] Peran pemilik (Owner) tidak bisa diubah.

#### H7.6 Keluarkan anggota (mode kelola)
- [ ] Klik **"Keluarkan"** pada anggota → modal `ConfirmModal` muncul dengan nama anggota (G7).
- [ ] Konfirmasi → anggota dihapus dari daftar.
- [ ] Akun anggota yang dikeluarkan tidak bisa login ke workspace ini (verifikasi: login sebagai
  anggota tersebut → harus 401/403 atau akses workspace hilang).
- [ ] Batalkan → anggota tetap di daftar.
- [ ] Tidak bisa mengeluarkan diri sendiri (owner tidak punya tombol keluarkan pada dirinya).

#### H7.7 Uji keamanan
- [ ] Dari Tenant B, coba panggil API `POST /v1/team` dengan token Tenant A → **403**.
- [ ] Tidak bisa melihat daftar anggota tim Tenant lain via API langsung.
- [ ] Pemilik tidak bisa dikeluarkan atau perannya tidak bisa diturunkan oleh Admin.

---

## Uji lintas halaman (end-to-end flows)

### E1 — Top-up → saldo naik → tercermin di semua halaman
1. Catat saldo di **Dashboard** (kartu stats) dan **Wallet**.
2. Lakukan top-up Sandbox (H2.4).
3. Setelah konfirmasi: cek **Wallet** saldo bertambah, **Dashboard** saldo ikut naik,
   **riwayat transaksi** ada entri baru.

### E2 — Buat template → render batch → unduh PDF
1. Buat template baru dengan variabel `{{nama}}` dan `{{nomor}}` (H3.5).
2. Pergi ke Batches → buat batch dengan template tersebut, data:
   ```json
   [{"ref":"doc-001","data":{"nama":"Andi","nomor":"001"}}]
   ```
3. Tunggu selesai → expand → unduh PDF.
4. PDF harus memuat "Andi" dan "001" (variabel ter-interpolasi, bukan literal `{{nama}}`).
5. Kredit berkurang sesuai jumlah halaman.

### E3 — Buat API key → pakai render via curl → kredit berkurang
1. Buat API key Live (H5.1), salin kunci penuh dari kotak amber.
2. Jalankan render via curl:
   ```bash
   curl -sS -X POST https://docgen.razornez.net/v1/render \
     -H "Authorization: Bearer <api-key>" \
     -H "Content-Type: application/json" \
     -d '{"template_id":"<id>","data":{"nama":"QA"}}'
   ```
3. Verifikasi: 200 + `document_id` di response.
4. Kredit di **Wallet** berkurang.
5. Gunakan API key yang sudah dicabut → harus 401.

### E4 — Tambah webhook → trigger batch → notifikasi tiba
1. Tambah webhook endpoint `https://webhook.site/<id-kamu>` dengan event `batch.completed` (H6.2).
2. Buat batch kecil (1 dokumen) dan tunggu selesai.
3. Cek `webhook.site` → harus ada POST dengan payload `batch_id` dan `status: "completed"`.
4. Verifikasi signature (H6.6).

### E5 — Undang anggota → login sebagai anggota → akses workspace
1. Undang email baru dengan peran **Member** (H7.4).
2. Cek email undangan masuk (dari `no-reply@`).
3. Daftar akun dengan email yang diundang → verifikasi email → login.
4. Tenant yang muncul harus workspace yang mengundang (bukan workspace kosong baru).
5. Anggota dengan peran Member tidak bisa mengakses fitur admin (mis. `/owner/*` → redirect).

---

## Uji keamanan lintas halaman (wajib)

### S1 — IDOR (Broken Object Level Authorization)
Dari sesi **Tenant A**, coba akses resource **Tenant B** dengan cara:
- GET `/v1/templates/<template-id-tenant-B>` → harus **403** atau **404**
- GET `/v1/batches/<batch-id-tenant-B>` → harus **403** atau **404**
- GET `/v1/batch-documents/<batch-id-tenant-B>` → harus **403** atau **404**
- GET `/v1/documents/<doc-id-tenant-B>` (termasuk output_url jika signed) → **403** atau **404**
- GET `/v1/api-keys/<key-id-tenant-B>` → **403** atau **404**
- GET `/v1/webhooks/<webhook-id-tenant-B>` → **403** atau **404**
- GET `/v1/team` (header JWT Tenant A) → hanya anggota Tenant A, tidak bocor Tenant B

Laporkan setiap resource yang **bocor** sebagai **Critical**.

### S2 — SSRF via webhook URL
Saat **membuat** endpoint webhook:
- URL `http://localhost/admin` → ditolak
- URL `http://127.0.0.1:3001/v1/admin` → ditolak
- URL `http://169.254.169.254/latest/meta-data/` → ditolak
- URL `file:///etc/passwd` → ditolak
- URL `javascript:alert(1)` → ditolak

### S3 — XSS via input nama / template body
- Nama template `<script>alert(1)</script>` → tampil di daftar, dashboard, admin → harus **ter-escape** (tidak dieksekusi).
- Body template berisi `<img src=x onerror=alert(1)>` → pratinjau editor tidak mengeksekusi.
- Nama anggota tim `<b>Bold</b>` → tampil sebagai teks (HTML-escaped), bukan render tebal.

### S4 — Auth & akses lintas area
- Akses `/dashboard` tanpa token → redirect ke `/login`.
- Akses `/dashboard/wallet` dengan token **owner** (bukan tenant) → redirect ke `/login`
  (token owner tidak valid untuk area tenant).
- Akses `/owner` dengan token **tenant** → redirect ke `/owner/login`.

---

## Format Laporan (wajib dipakai)

Kelompokkan per halaman, satu temuan satu baris:

```
### FASE 2 — [Halaman] — [Rute]

| # | Severity | Kategori | Temuan | Langkah Reproduksi | Ekspektasi | Saran Perbaikan |
|---|----------|----------|--------|--------------------|------------|-----------------|
| 1 | Critical | Security | IDOR: batch Tenant B terbaca | Login Tenant A, GET /v1/batches/<id-B> | 403/404 | Cek tenantId di middleware sebelum query |
| 2 | High     | Bug      | Saldo tidak update setelah top-up | Top-up sandbox → bayar → cek /dashboard/wallet | Saldo +N & masuk riwayat | Invalidate query wallet setelah webhook confirm |
| 3 | Medium   | i18n     | Label "Success rate" tidak ikut translate | Set locale EN, buka /dashboard | Label "Tingkat sukses" → "Success rate" | Tambah key di en.json |
| 4 | Low      | UI/UX    | Tombol expand batch tidak ada tooltip | Hover tombol expand di /dashboard/batches | Tooltip "Lihat dokumen" | Tambah title attribute |
```

**Severity:** `Critical` (security/data loss/blokir total) · `High` (fungsi inti rusak) ·
`Medium` (fungsi sekunder/i18n/flow) · `Low` (kosmetik/UX minor).

**Kategori:** `Security` · `Bug` · `Flow` · `i18n` · `Deadlink` · `UI/UX` · `Data` ·
`Performance` · `Console` · `Responsive` · `Code-quality`.

Akhiri laporan dengan **ringkasan**: jumlah temuan per severity + 3 isu paling kritis yang
harus diperbaiki lebih dulu.

---

## Catatan khusus area tenant

- **Wallet/Top-up:** idempotensi webhook penting — kirim ulang webhook tidak boleh menambah
  saldo atau mengirim email dua kali.
- **Batch & kredit:** render gagal harus mengembalikan kredit; batch besar tidak boleh memblokir
  antrian render tenant lain (fairness queue).
- **API key hanya tampil sekali:** pastikan kunci penuh tidak muncul di response API berikutnya
  (mis. `GET /v1/api-keys`) — hanya `prefix****last4` yang boleh keluar.
- **Webhook secret hanya tampil sekali:** sama seperti API key — tidak ada endpoint yang
  mengembalikan secret penuh lagi setelah dibuat.
- **Redis off (lokal):** batch tidak akan diproses; tandai semua tes batch yang membutuhkan
  Redis sebagai "SKIP — Redis off" dan uji di produksi staging atau nyalakan Redis lokal.
- **Auto-refetch:** pastikan halaman Batches dan panel dokumen berhenti polling setelah semua
  dokumen selesai (tidak ada `setInterval` yang terus jalan — cek Network tab).

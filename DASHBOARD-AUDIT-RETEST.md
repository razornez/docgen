# Laporan Perbaikan Audit Dashboard — untuk Retest

**Tanggal:** 15 Juni 2026
**Branch:** `fix/issue-13-app-version`
**Lingkup:** Tindak lanjut "LAPORAN AUDIT DOCGEN" (31 temuan).
**Status build:** `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm build` ✅
(warning ukuran chunk Templates sudah ada sebelumnya — bundel editor TipTap, bukan dari perubahan ini).

> Cara menjalankan untuk retest: `pnpm --filter @docgen/dashboard dev`
> (Vite di `http://localhost:5173`, basename `/app`). Backend API memakai stack
> yang sama seperti QA backend. Build produksi: `pnpm --filter @docgen/dashboard build`.

File yang diubah: `apps/dashboard/src/` → `App.tsx`, `components/Layout.tsx`,
`pages/{Dashboard,Templates,ApiKeys,Batches,Webhooks,Wallet,Login}.tsx`,
serta file baru `lib/format.ts`.

---

## RINGKASAN STATUS

| Status         | Jumlah | Arti                                                                         |
| -------------- | ------ | ---------------------------------------------------------------------------- |
| ✅ Diperbaiki  | 16     | Sudah dikerjakan di branch ini — **wajib diretest**.                         |
| 🟦 Sudah beres | 6      | Sudah benar di build saat ini (audit menguji deploy lama). Verifikasi cepat. |
| ⏸️ Ditunda     | 9      | Butuh backend / keputusan produk / PR tersendiri.                            |

---

## A. ✅ DIPERBAIKI — wajib diretest

| #   | Temuan (ID audit)                        | Perbaikan                                                                                                                                                 | Cara retest                                                                     | Hasil diharapkan                                                                                                                    |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 🔴 Bug `--1` dobel minus (Overview)      | `Math.abs(tx.amount)` di kartu Transaksi terbaru                                                                                                          | Overview → kartu "Transaksi terbaru", lihat baris "Dokumen dibuat" (debit)      | Tampil `-1` (satu minus), sama dengan halaman Wallet                                                                                |
| A2  | 🔴 Aplikasi tidak responsif              | Sidebar jadi **drawer** + tombol **hamburger** di `< lg`; backdrop; auto-tutup saat pindah halaman; padding konten & header mengecil di mobile            | Kecilkan lebar browser < 1024px (atau device toolbar). Klik hamburger kiri-atas | Sidebar tersembunyi di mobile; hamburger membuka drawer + backdrop; klik menu/ backdrop menutupnya. Di ≥1024px sidebar tetap statis |
| A3  | 🟡 Area profil tidak interaktif          | Kartu profil (kiri-bawah) kini **tombol dropdown** (chevron) berisi menu **Keluar**; klik luar menutup                                                    | Klik kartu profil di sidebar                                                    | Muncul menu "Keluar"; klik Keluar → logout; klik di luar menutup menu                                                               |
| A4  | 🔴 Tidak ada "Lupa kata sandi?"          | Link **"Lupa kata sandi?"** di tab Masuk → menampilkan hint (akun demo / kontak support). _Reset mandiri sungguhan = ditunda (butuh backend)._            | Login → klik "Lupa kata sandi?"                                                 | Muncul hint dengan tautan `mailto:support@…`                                                                                        |
| A5  | 🟢 Tidak ada toggle lihat password       | Ikon **mata** show/hide di field kata sandi (tab Masuk & Daftar)                                                                                          | Login/Daftar → klik ikon mata di field sandi                                    | Teks sandi tampil/tersembunyi bergantian                                                                                            |
| A6  | 🟡 Format tanggal beda-beda              | Util terpusat `lib/format.ts` (`formatDate` "9 Jun 2026", `formatDateTime` "9 Jun 2026, 20.16") dipakai di Templates, API Keys, Batches, Webhooks, Wallet | Bandingkan tanggal di API Keys, Batches, Webhooks, Templates                    | Semua format "9 Jun 2026" (bukan "9/6/2026"); Wallet "…​, 20.16"                                                                    |
| A7  | 🟡/🟢 Label dwibahasa (Edit/Preview)     | "Edit"→**Ubah**, "Preview"→**Pratinjau**                                                                                                                  | Templates → aksi baris                                                          | Tertulis "Ubah" & "Pratinjau"                                                                                                       |
| A8  | 🟡 Label dwibahasa (Revoke)              | Tombol "Revoke"→**Cabut**; modal konfirmasi & teksnya disesuaikan                                                                                         | API Keys → tombol di baris key aktif; klik                                      | Tombol "Cabut"; modal "Cabut API key?" / "Ya, cabut"                                                                                |
| A9  | 🟡 Label dwibahasa (Sign out)            | `title`/`aria-label` "Sign out"→**Keluar** (juga via menu profil)                                                                                         | Hover/menu profil sidebar                                                       | "Keluar"                                                                                                                            |
| A10 | 🟡 Status badge campur bahasa            | Badge status dokumen (Batches expand) dilokalkan: `completed`→**Selesai**, `failed`→Gagal, `processing`→Proses, `queued`→Antrian                          | Batches → "▼ Dokumen" pada satu batch                                           | Status anak "Selesai" (seragam dengan induk)                                                                                        |
| A11 | 🟢 Kapitalisasi "API keys"               | Judul kartu → **"API Keys"**                                                                                                                              | API Keys → judul kartu tabel                                                    | "API Keys"                                                                                                                          |
| A12 | 🟢 Badge mode tidak seragam              | Badge `live`/`test` → uppercase konsisten                                                                                                                 | API Keys → kolom Mode                                                           | "LIVE" / "TEST"                                                                                                                     |
| A13 | 🟡 Validasi URL webhook (HTTPS)          | Submit menolak non-`https://` dengan pesan jelas                                                                                                          | Webhooks → "Tambah endpoint" → isi `http://x` atau `bukan-url` → submit         | Pesan "URL harus diawali https:// …", request tidak dikirim                                                                         |
| A14 | 🟡 Tidak ada onboarding user baru        | Kartu **"Mulai dari sini"** (3 langkah: Template → Batch → API key) di Overview saat **belum ada batch**                                                  | Overview pada akun tanpa batch                                                  | Kartu 3 langkah dengan tautan ke tiap halaman; hilang setelah ada batch                                                             |
| A15 | 🟡 404 mentah di dalam app               | Route catch-all `*` → halaman **404 ber-UI** + tombol kembali                                                                                             | Buka path acak mis. `/app/ngawur`                                               | Halaman 404 bergaya app, tombol "Kembali ke dashboard/masuk"                                                                        |
| A16 | 🟢 Konsistensi label (login error, dll.) | Bahasa label UI terstandar Indonesia (lihat A7–A10)                                                                                                       | —                                                                               | —                                                                                                                                   |

---

## B. 🟦 SUDAH BERES di build saat ini (audit menguji deploy lama)

Tidak diubah karena sudah benar di kode sekarang — cukup verifikasi cepat.

| #   | Temuan                                       | Kondisi saat ini                                                                                                                            |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Highlight oranye liar pada wordmark "DocGen" | Tidak ter-reproduksi. Wordmark sidebar/login = `<span>` polos; CSS `mark` kuning ter-scope hanya ke konten editor (`.tiptap-content mark`). |
| B2  | Ikon `</>` tanpa label (Templates)           | Sudah ada `title="Panduan integrasi API"`.                                                                                                  |
| B3  | Aksi berbiaya tanpa konfirmasi (Revoke key)  | Sudah ada `ConfirmModal` sebelum cabut key & hapus webhook.                                                                                 |
| B4  | Field URL webhook bukan `type="url"`         | Sudah `type="url"` + `required` (kini + validasi https, lihat A13).                                                                         |
| B5  | Field webhook di Batch tanpa validasi        | Sudah `type="url"`.                                                                                                                         |
| B6  | Peringatan "secret hanya tampil sekali"      | Sudah ada di kartu pembuatan API key & signing secret webhook.                                                                              |

---

## C. ⏸️ DITUNDA — butuh backend / keputusan produk / PR tersendiri

| #   | Temuan                                                  | Alasan ditunda                                                                                                                                               |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | 🔴 Root `/` & `/app` menampilkan JSON mentah            | Level **server/nginx** (root domain mengenai API, bukan SPA `/app`). Perlu konfigurasi reverse-proxy/redirect saat deploy. 404 in-app sudah ditangani (A15). |
| C2  | Halaman **pengaturan akun** penuh                       | Fitur baru. Saat ini profil sudah interaktif (A3); halaman setelan/ganti tema belum dibuat.                                                                  |
| C3  | Alur **reset password** sungguhan                       | Butuh endpoint backend (kirim email + token). Saat ini hanya link + hint (A4).                                                                               |
| C4  | Helper aturan password di tab Masuk                     | Minor; aturan ditampilkan di tab Daftar ("Minimal 8 karakter").                                                                                              |
| C5  | Panduan Live/Test di halaman API Keys                   | Konten panduan tambahan; belum ditulis.                                                                                                                      |
| C6  | Tooltip "?" pada ikon kartu statistik                   | Minor/kosmetik.                                                                                                                                              |
| C7  | Konfirmasi sebelum "Download PDF −1 kredit" / PDF batch | Belum ditambah dialog konfirmasi; perlu keputusan UX (mengganggu vs aman).                                                                                   |
| C8  | CTA "Buat batch dari template ini" (Templates↔Batches)  | Peningkatan navigasi; PR tersendiri.                                                                                                                         |
| C9  | Toolbar editor: ganti teks "+col/+row/del" jadi ikon    | Kosmetik. Sudah ada tooltip `title`; penggantian ikon ditunda.                                                                                               |

---

## Catatan untuk QA

- Responsivitas (A2) sebaiknya diverifikasi di **perangkat/emulator nyata**
  (DevTools device toolbar), bukan sekadar resize window — sesuai catatan
  metodologi audit asli.
- Belum di-commit: perubahan masih di working tree pada branch
  `fix/issue-13-app-version`.

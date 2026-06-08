# Laporan QA — DocGen API (Tahap 1–3)

**Tanggal:** 2026-06-05
**Penguji:** Claude Code
**Acuan runbook:** [QA.md](QA.md)
**Lingkup:** Infra/health, Tenant & API key, Template & Preview (Tahap 1–3).
Di luar lingkup (tidak diuji sebagai bug): render PDF/worker, dokumen, batch,
wallet/top-up, usage, webhooks, dashboard/login, rate-limit 429.

---

## 1. Lingkungan & cara stack dinyalakan

Docker **tidak terpasang** di mesin ini, sehingga jalur kanonik
`docker compose up -d` (Postgres :5433, Redis :6379, MinIO :9000) tidak dapat
dijalankan. Workaround tanpa Docker yang dipakai:

- **API boot tanpa Redis/MinIO** untuk Tahap 1–3. Klien Redis bersifat _lazy_
  (`apps/api/src/infra/redis.ts`) sehingga `/health` cukup melaporkan
  `degraded`; loader config (`packages/config`) hanya memvalidasi `STORAGE_*`
  sebagai string dan tidak melakukan koneksi saat start.
- **Postgres terisolasi di :5433** distand-up memakai binari scoop
  (`C:\Users\iwan kurniawan\scoop\apps\postgresql\current\bin`, PG 18.4) dengan
  data-dir sementara di `%TEMP%\docgen_qa_pg5433`, role/db `docgen`. Postgres
  asing di :5432 **tidak disentuh**.

Langkah yang dijalankan:

```text
initdb -D %TEMP%\docgen_qa_pg5433 -U docgen -A trust --encoding=UTF8
pg_ctl -D ... -o "-p 5433 -c listen_addresses=127.0.0.1" start
createdb -h 127.0.0.1 -p 5433 -U docgen docgen
pnpm db:migrate          # 0001_init + 0002_i18n -> OK
API_PORT=3001 pnpm dev:api    # Server listening at http://0.0.0.0:3001
BASE=http://localhost:3001 pnpm qa:smoke
```

`/health` saat uji: `503 degraded`, `postgres.ok=true (latency ~1ms)`,
`redis.ok=false` + error (Redis memang absen).

---

## 2. Hasil runner otomatis — `pnpm qa:smoke`

**Skor akhir: 75 PASS / 0 FAIL — SEMUA LULUS.**

Perjalanan: 72/3 (run awal) → perbaikan false-positive D2 → 73/2 → **Redis
dinyalakan (langkah B)** → **75/0**. Dua FAIL sebelumnya hanyalah `A1 health`
yang gagal karena Redis absen; setelah Redis hidup, `/health` = `200 ok` dan
keduanya PASS.

| ID                          | Status    | Keterangan                                                                                                                                                                                                                                         |
| --------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 `health up` (200)        | ✅ PASS   | Dengan Redis hidup (langkah B): `/health` = `200`. (Tanpa Redis: `503 degraded`, sesuai desain.)                                                                                                                                                   |
| A1 `status ok`              | ✅ PASS   | `status:"ok"`, `postgres.ok=true`, `redis.ok=true`.                                                                                                                                                                                                |
| B1–B8 Registrasi tenant     | ✅ PASS   | locale ID→id / US→en / tanpa-country→en; `sk_live_`/`sk_test_`; duplikat→409 `conflict`; body kosong→400; country non-2-huruf→400; saldo awal **0**.                                                                                               |
| C1–C6 Autentikasi           | ✅ PASS   | Tanpa header→401; skema bukan Bearer→401; non-`sk_`→401; key tak terdaftar→401; key dicabut→401.                                                                                                                                                   |
| D1–D5 Kelola API key        | ✅ PASS\* | Buat key sekali tampil; list tersamar tanpa `key_hash`; `last_used_at` ter-update; revoke→200; revoke ulang/ngawur→404. (\*lihat D2 di bawah)                                                                                                      |
| D2 `list tanpa key penuh`   | ✅ PASS   | **Diperbaiki** — assertion kini cocokkan pola key penuh (`sk_(live\|test)_[A-Za-z0-9]{16,}`), bukan substring `prefix`. Tak ada kebocoran.                                                                                                         |
| E1–E10 Template & versi     | ✅ PASS   | current_version & immutability versi; preview versi-1; nama duplikat→409; name kosong/`engine:pdf`→400; paginasi `limit`/`starting_after`/`has_more`; cursor invalid→400.                                                                          |
| F1–F9 Preview / mesin polos | ✅ PASS   | `text/html`; angka **tak** diformat (`77700000`, bukan `Rp …`); var hilang→kosong; `{{#each}}`; `{{ }}` ter-escape (anti-XSS) vs `{{{ }}}` mentah; helper kustom→`422 template_render_error`; sintaks rusak→422; preview **tidak** menambah saldo. |
| G1–G5 Isolasi tenant        | ✅ PASS   | A cabut key B→404 (key B tetap aktif); A get/versi/preview template B→404; list A tak memuat template B.                                                                                                                                           |
| H1–H5 Model error           | ✅ PASS   | route tak dikenal→404 `not_found`; endpoint luar-lingkup→404; JSON rusak→400; header `x-request-id` ada.                                                                                                                                           |

### Analisis (riwayat FAIL — semua sudah teratasi)

1. **A1 ×2 (health) — TERATASI.** FAIL hanya terjadi saat Redis absen
   (`/health` benar mengembalikan `503 degraded`). Setelah Redis dinyalakan,
   `/health` = `200 ok` dan kedua assertion **PASS**. Jalur `degraded` (Redis
   mati) maupun `ok` (Redis hidup) kini sama-sama terbukti.
2. **D2 — SUDAH DIPERBAIKI.** Sebelumnya false positive di `scripts/qa-smoke.ts`
   (assertion mencari substring `sk_test_`, yang berbenturan dengan nilai field
   `prefix` yang sah/tersamar). Kini assertion mencocokkan pola **key penuh**.
   Key penuh tidak pernah bocor — diverifikasi di DB (Suite I2): hanya
   `key_hash` + `prefix` + `last4` yang disimpan. Re-run live: **D2 PASS**.

---

## 3. Hasil Suite manual

| ID                                          | Status           | Bukti / catatan                                                                                                                                                                          |
| ------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2 — Redis mati → degraded, lalu nyala → ok | ✅ PASS          | Saat Redis absen: `/health`=`503 degraded`, `redis.ok:false`. Setelah Redis dinyalakan (scoop `redis` 8.8.0, `:6379`), ioredis auto-reconnect → `/health`=`200 ok`. Kedua arah terbukti. |
| A3 — `docker compose ps` + MinIO bucket     | ⚠️ N/A           | Tidak ada Docker/MinIO — tidak terverifikasi (storage diuji di Tahap 4).                                                                                                                 |
| A4 — env wajib hilang → fail-fast           | ✅ PASS          | `DATABASE_URL` invalid → `"Konfigurasi environment tidak valid. Perbaiki .env Anda: - DATABASE_URL: Invalid url"`, proses **tidak pernah** listen (exit non-zero saat start).            |
| A5 — persistensi setelah restart            | ~ Parsial        | Data tersimpan di data-dir Postgres on-disk (durable). Skenario restart-via-Docker tidak berlaku di sini.                                                                                |
| I1 — tak ada key/PII di log                 | ✅ PASS          | 0 kemunculan `sk_live_`/`sk_test_` penuh maupun nilai secret (`change-me-dev…`) di log API.                                                                                              |
| I2 — DB simpan hash, bukan plaintext        | ✅ PASS          | Tabel `api_keys` kolom: `key_hash`, `prefix`, `last4` (+meta). **Tidak ada** kolom `key` plaintext (`plaintext_key_columns = 0`). API tidak mengembalikan hash.                          |
| I3 — SQL injection pada `name`/`data`       | ✅ PASS          | Payload `'); DROP TABLE tenants;--` & `tpl'); DROP TABLE templates;--` tersimpan **literal**; tabel tetap utuh (parameterized query).                                                    |
| I4 — port DB/Redis hanya 127.0.0.1          | ✅ (instans uji) | Postgres uji di-bind `listen_addresses=127.0.0.1`. (Compose juga mengintensikan 127.0.0.1 — lihat catatan `.env`.)                                                                       |

---

## 4. Suite J — Regresi otomatis

Dijalankan dari root repo (2026-06-05):

| Perintah                 | Hasil                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`         | ✅ **0 error** — 7 proyek (shared, config, renderer, db, i18n, worker, api) semua `Done`.                                                                     |
| `pnpm lint` (`eslint .`) | ✅ **0 error**.                                                                                                                                               |
| `pnpm test`              | ✅ **37/37 lulus** — renderer 9 + api 28 (api-key-hasher 5, api-key-service 8, registration 2, template-service 8, error-handler 5). Sesuai ekspektasi QA.md. |

---

## 5. Severity temuan

- **Blocker:** _tidak ada._ (Tidak ada kebocoran antar-tenant, key/PII tidak
  bocor ke log, auth tidak bisa dilewati, saldo tidak berubah saat preview.)
- **Major:** _tidak ada cacat produk._
- **Minor:** ~~Assertion D2 di `scripts/qa-smoke.ts` false positive~~ →
  **SELESAI** (runner diperbaiki, D2 PASS di re-run live).

---

## 6. Exit Criteria (Definition of Done QA)

- ✅ **Suite G (isolasi)** & **Suite I (keamanan/log)** lolos tanpa Blocker.
- ✅ Semua kode HTTP & `error.type` sesuai tabel.
- ✅ Preview membuktikan **mesin polos** (F1–F8).
- ✅ **Regresi otomatis (Suite J) hijau** — typecheck/lint 0 error, test 37/37.
- ✅ Tidak ada secret/PII di log.
- ✅ **A1-`ok` & A2 (recovery) terbukti** — Redis dinyalakan, `/health`=`200 ok`,
  `qa:smoke` **75/0**.
- ⚠️ A3 & A5 (MinIO bucket / restart-via-Docker) belum diverifikasi end-to-end —
  butuh MinIO; storage akan diuji di Tahap 4.

**Kesimpulan:** Exit Criteria **terpenuhi penuh** untuk Tahap 1–3. **75 PASS /
0 FAIL**, tidak ada Blocker/Major. Hanya MinIO (A3/A5) yang menyusul di Tahap 4.

---

## 7. Tindak lanjut yang disarankan

1. ✅ **Selesai** — assertion D2 di `scripts/qa-smoke.ts` diperbaiki (pola
   key-penuh, bukan substring `prefix`); re-run live: **73 PASS / 2 FAIL**.
2. Verifikasi ulang A1-`ok`, A2 (recovery), A3, A5 saat Docker tersedia
   (Postgres :5433 + Redis :6379 + MinIO :9000).

> **Pembaruan 2026-06-05 (sesi lanjutan):**
>
> - **(A)** Runner D2 diperbaiki (pola key-penuh) & di-run ulang live → **73/2**.
> - **(B)** Redis dipasang via scoop (`redis` 8.8.0) dan dijalankan di
>   `127.0.0.1:6379`. ioredis auto-reconnect → `/health`=`200 ok`. Re-run
>   `qa:smoke` → **75 PASS / 0 FAIL (SEMUA LULUS)**.
>
> Catatan operasional: Redis uji dijalankan `redis-server --port 6379 --bind
127.0.0.1 --save '' --appendonly no` (tanpa persistensi). MinIO masih belum ada
> (A3/A5) — akan diperlukan & diuji pada Tahap 4 (storage PDF).

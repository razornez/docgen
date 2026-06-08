# QA — Rencana Uji DocGen API (Tahap 1–3)

Runbook pengujian fungsional, keamanan, dan penanganan error untuk fondasi
(health/infra), **Tenant & API key**, dan **Template & Preview**. Acuan:
[docs/00](docs/00-prinsip-rendering-dan-tanggung-jawab.md) (mesin polos),
[docs/02](docs/02-desain-api.md) (amplop error), [docs/13](docs/13-keamanan-dan-data.md)
(isolasi/PII), [docs/14](docs/14-pengujian.md) (strategi uji).

---

## Instruksi untuk Claude Code (cara menjalankan)

1. **Cek otomatis dulu** (harus hijau sebelum uji manual):
   ```bash
   pnpm install
   pnpm typecheck && pnpm lint && pnpm test
   ```
2. **Nyalakan stack & API**:
   ```bash
   docker compose up -d            # Postgres :5433, Redis :6379, MinIO :9000
   pnpm db:migrate                 # terapkan 0001_init + 0002_i18n
   pnpm dev:api                    # API di http://localhost:3001 (atau API_PORT)
   ```
   Catat `BASE` = `http://localhost:3001` (sesuaikan bila `API_PORT` beda).
3. **Siapkan token** (registrasi → ambil key sekali tampil). Contoh dengan `jq`:
   ```bash
   BASE=http://localhost:3001
   # Tenant A
   A=$(curl -s -X POST $BASE/v1/tenants -H 'Content-Type: application/json' \
        -d '{"name":"Acme A","email":"a@acme.test","country":"ID"}')
   KEY_A=$(echo "$A" | jq -r '.api_key.key')
   # Tenant B (untuk uji isolasi)
   B=$(curl -s -X POST $BASE/v1/tenants -H 'Content-Type: application/json' \
        -d '{"name":"Globex B","email":"b@globex.test","country":"US"}')
   KEY_B=$(echo "$B" | jq -r '.api_key.key')
   ```
   Helper: `auth() { echo "-H"; echo "Authorization: Bearer $1"; }` atau cukup
   sisipkan `-H "Authorization: Bearer $KEY_A"` di tiap request terproteksi.
4. **Runner otomatis** (cara cepat — mencakup Suite A–H yang bisa diuji via HTTP):
   ```bash
   pnpm qa:smoke                          # default BASE=http://localhost:3001
   BASE=http://localhost:3001 pnpm qa:smoke
   ```
   Skrip `scripts/qa-smoke.ts` (Node, tanpa jq) mencetak PASS/FAIL per ID dan
   exit non-zero bila ada gagal. **Suite manual** (A2 matikan Redis, A4 env
   fail-fast, A5 persistensi, I1 inspeksi log) tetap dikerjakan tangan.
5. **Atau uji manual** tiap Suite (A–J) di bawah, bandingkan respons vs ekspektasi.
6. **Laporkan** memakai format di bagian "Pelaporan", lalu nilai "Exit Criteria".
   Tampilkan ringkasan PASS/FAIL per ID dalam tabel.

> Catatan eksekusi: tiap respons error WAJIB berbentuk
> `{"error":{"type","message","param?","request_id"}}` dan membawa header
> `x-request-id`. `type` & `param` stabil dalam Inggris.

---

## DI LUAR LINGKUP (jangan dilaporkan sebagai bug — belum dibangun)

Render PDF & worker; endpoint `POST /v1/documents`, `/v1/batches`, `/v1/wallet*`,
`/v1/usage`, `/v1/webhooks/*` (harus balas **404 not_found**); pemotongan/penambahan
kredit & ledger; pembayaran/top-up; dashboard/login/Google/verifikasi email;
switcher bahasa UI; **penegakan rate limit 429** (baru dipetakan, belum aktif —
jangan uji throttling); pencairan bonus 100 kredit (saldo memang **0**).

---

## Suite A — Infra & Health (Tahap 1)

| ID  | Langkah                                                        | Ekspektasi                                                                             |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A1  | `GET /health` saat semua hidup                                 | `200`, `{status:"ok", checks:{postgres:{ok:true}, redis:{ok:true}}}`                   |
| A2  | `docker compose stop redis`, `GET /health`, lalu nyalakan lagi | `503`, `status:"degraded"`, `checks.redis.ok=false` + `error`                          |
| A3  | `docker compose ps` + MinIO console `:9001`                    | postgres/redis/minio **healthy**; bucket `docgen-files` ada                            |
| A4  | Hapus 1 env wajib (mis. `DATABASE_URL`) lalu start API         | **Gagal cepat** saat start dgn pesan jelas (bukan error di tengah request). Kembalikan |
| A5  | `docker compose restart`, lalu cek data lama masih ada         | Tenant/template sebelumnya tetap ada (volume persist)                                  |

## Suite B — Registrasi tenant (publik, `POST /v1/tenants`)

| ID  | Langkah                                 | Ekspektasi                                                                       |
| --- | --------------------------------------- | -------------------------------------------------------------------------------- |
| B1  | `{name,email,country:"ID"}`             | `201`; `tenant.default_locale="id"`; `api_key.key` `sk_live_…` **tampil sekali** |
| B2  | `{…,country:"US"}`                      | `default_locale="en"`                                                            |
| B3  | tanpa `country`                         | `default_locale="en"`                                                            |
| B4  | `{…,mode:"test"}`                       | `api_key.key` berawalan `sk_test_`                                               |
| B5  | email sama 2×                           | request kedua → **`409` `conflict`**, `param:"email"`                            |
| B6  | body `{}` / email invalid / name kosong | **`400` `invalid_request`** dgn `param` menunjuk field                           |
| B7  | `country:"Indonesia"` (bukan 2 huruf)   | `400` `invalid_request`                                                          |
| B8  | `GET /v1/me` (key dari B1)              | `wallet.balance = 0` (BUKAN 100)                                                 |

## Suite C — Autentikasi API key (rute terproteksi)

| ID  | Langkah                                          | Ekspektasi                                              |
| --- | ------------------------------------------------ | ------------------------------------------------------- |
| C1  | `GET /v1/me` tanpa header Authorization          | `401` `unauthorized`                                    |
| C2  | `Authorization: Token abc` (skema salah)         | `401`                                                   |
| C3  | `Bearer abc` (bukan `sk_`)                       | `401`                                                   |
| C4  | `Bearer sk_live_ngawurpanjang` (tak terdaftar)   | `401` (pesan generik; tak bedakan "tak ada" vs "salah") |
| C5  | `Bearer <key valid>` 2×, lalu `GET /v1/api-keys` | `200`; `last_used_at` ter-update                        |
| C6  | Cabut key (D3) lalu pakai lagi                   | `401`                                                   |
| C7  | Key dengan spasi/newline di ujung                | `401` (tidak crash)                                     |

## Suite D — Kelola API key (terproteksi)

| ID  | Langkah                             | Ekspektasi                                                                           |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| D1  | `POST /v1/api-keys` `{mode:"test"}` | `201`, `api_key.key` (`sk_test_…`) **tampil sekali**                                 |
| D2  | `GET /v1/api-keys`                  | daftar **tersamar**: `prefix,last4,status,mode,last_used_at`; TANPA `key`/`key_hash` |
| D3  | `POST /v1/api-keys/{id}/revoke`     | `200`, `status:"revoked"`, `revoked_at` terisi                                       |
| D4  | revoke ID sama lagi                 | `404` (sudah tidak aktif)                                                            |
| D5  | revoke `key_tidakada`               | `404` `not_found`                                                                    |

## Suite E — Template & versi (Tahap 3, terproteksi)

| ID  | Langkah                                                            | Ekspektasi                                                         |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| E1  | `POST /v1/templates` `{name,body:"<h1>{{number}}</h1>",schema:{}}` | `201`, `current_version=1`, `version.version=1`, id `tpl_`/`tver_` |
| E2  | `GET /v1/templates/{id}`                                           | template + versi terkini (berisi `body`,`schema`)                  |
| E3  | `POST /v1/templates/{id}/versions` `{body:"v2"}`                   | `201`, `version=2`; GET template → `current_version=2`, body "v2"  |
| E4  | `POST …/preview {data:{}, version:1}`                              | mengembalikan **body versi 1** (immutable)                         |
| E5  | `POST /v1/templates` nama sama (tenant sama)                       | `409` `conflict`, `param:"name"`                                   |
| E6  | `GET /v1/templates?limit=2` saat ada ≥3                            | `data` 2 item, `has_more:true`                                     |
| E7  | `GET /v1/templates?limit=2&starting_after=<id terakhir page1>`     | halaman berikut, tanpa tumpang tindih, `has_more` benar            |
| E8  | `starting_after=tpl_tidakada`                                      | `400` `invalid_request`, `param:"starting_after"`                  |
| E9  | body kosong / name >200 char                                       | `400` `invalid_request`                                            |
| E10 | `engine:"pdf"`                                                     | `400` (hanya `html`)                                               |

## Suite F — Preview / mesin polos (paling penting, `POST /v1/templates/{id}/preview`)

| ID  | body template → data                               | Ekspektasi                                                                           |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| F1  | `<p>{{name}}</p>` → `{name:"Sam"}`                 | `Content-Type: text/html`, isi `<p>Sam</p>`                                          |
| F2  | `{{total}}` → `{total:77700000}`                   | `77700000` (TIDAK jadi `Rp 77.700.000`)                                              |
| F3  | `[{{missing}}]` → `{}`                             | `[]` (variabel hilang → kosong, bukan error)                                         |
| F4  | `{{#each items}}<li>{{description}}</li>{{/each}}` | mengulang sesuai jumlah item                                                         |
| F5  | `{{#if npwp}}…{{/if}}` dgn & tanpa `npwp`          | seksi muncul/hilang sesuai                                                           |
| F6  | `{{x}}` vs `{{{x}}}` → `{x:"<b>&</b>"}`            | `{{x}}` ter-escape (`&lt;b&gt;`), `{{{x}}}` mentah. **XSS tak tembus** lewat `{{ }}` |
| F7  | `{{rupiah total}}` atau `{{inc x}}`                | **`422` `template_render_error`** (helper format/hitung tak disediakan)              |
| F8  | sintaks rusak `{{#if x}}tak ditutup`               | `422` `template_render_error`                                                        |
| F9  | jalankan preview, lalu `GET /v1/me`                | saldo tetap 0; tak ada dokumen/efek samping (preview TIDAK ditagih)                  |
| F10 | data nested dalam + unicode/emoji                  | tampil apa adanya, tak crash                                                         |

## Suite G — Isolasi tenant (KEAMANAN — wajib lolos; pakai KEY_A & KEY_B)

| ID  | Langkah                                                     | Ekspektasi                                       |
| --- | ----------------------------------------------------------- | ------------------------------------------------ |
| G1  | A mencabut key milik B (`/api-keys/{idB}/revoke` dgn KEY_A) | `404` (bukan 200/403). Key B tetap aktif         |
| G2  | A `GET /v1/api-keys`                                        | hanya key milik A                                |
| G3  | B buat template, A `GET /v1/templates/{idB}`                | `404`                                            |
| G4  | A `POST /v1/templates/{idB}/versions` & `…/preview`         | `404` (tak bisa baca/ubah/preview milik B)       |
| G5  | A `GET /v1/templates`                                       | tidak memuat template milik B sama sekali        |
| G6  | `/v1/me` dgn KEY_A vs KEY_B                                 | mengembalikan tenant masing-masing, tak tertukar |

## Suite H — Model error & lintas-cutting

| ID  | Langkah                                | Ekspektasi                                                                                                 |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| H1  | Semua respons (sukses & error)         | header **`x-request-id`** ada; pada error, `error.request_id` cocok                                        |
| H2  | Body JSON rusak (mis. `{"name":`)      | `400` (amplop error, bukan stack trace)                                                                    |
| H3  | `GET /v1/anu` (tak dikenal)            | `404` `not_found`                                                                                          |
| H4  | `DELETE /v1/templates` (method salah)  | error rapi (404/405), tetap amplop JSON                                                                    |
| H5  | `POST /v1/documents`, `GET /v1/wallet` | `404 not_found` (di luar lingkup)                                                                          |
| H6  | berbagai gagal                         | `type` konsisten Inggris (`invalid_request`,`unauthorized`,`not_found`,`conflict`,`template_render_error`) |

## Suite I — Keamanan data & log (docs/13)

| ID  | Langkah                                                     | Ekspektasi                                                              |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| I1  | Telusuri **log API** (stdout) setelah buat key & registrasi | TIDAK ada plaintext API key / password / isi data di log                |
| I2  | `GET /v1/api-keys` & inspeksi tabel `api_keys`              | DB simpan **hash** (`key_hash`), bukan plaintext; API tak balikkan hash |
| I3  | SQL-injection pada `name`/`data` (mis. `'; DROP TABLE …`)   | tersimpan/tampil sebagai teks biasa; tanpa efek (parameterized)         |
| I4  | Port DB/Redis                                               | hanya `127.0.0.1` (cek compose)                                         |

## Suite J — Regresi otomatis

- `pnpm test` → hijau (saat ini **37 tes**: renderer 9 + api 28).
- `pnpm typecheck`, `pnpm lint` → 0 error.
- Ulangi setelah `docker compose restart` untuk cek persistensi.

---

## Pelaporan

Untuk tiap temuan: **ID skenario**, request (method+URL+header+body),
**response aktual** (status + body + `request_id`), **response diharapkan**, severity:

- **Blocker** — kebocoran antar-tenant; key plaintext/PII bocor ke log; auth bisa
  dilewati; saldo berubah saat preview.
- **Major** — kode HTTP salah; amplop error tak sesuai; immutability versi rusak.
- **Minor** — pesan kurang jelas; inkonsistensi field.

Sertakan tabel ringkas PASS/FAIL per ID di akhir.

## Exit Criteria (Definition of Done QA)

- ✅ Seluruh **Suite G (isolasi)** & **Suite I (keamanan/log)** lolos tanpa Blocker.
- ✅ Semua kode HTTP & `error.type` sesuai tabel.
- ✅ Preview membuktikan **mesin polos** (F1–F8).
- ✅ Regresi otomatis hijau (Suite J).
- ✅ Tidak ada secret/PII di log.

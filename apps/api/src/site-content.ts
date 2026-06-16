import type { Pool } from 'pg';

/** Teks dwibahasa. */
export interface Loc {
  id: string;
  en: string;
}
export interface FooterLink {
  label: Loc;
  href: string;
}
export interface FooterColumn {
  head: Loc;
  items: FooterLink[];
}
export interface CmsPage {
  slug: string;
  title: Loc;
  body: Loc;
}
export interface SiteContent {
  footer_tagline: Loc;
  footer_columns: FooterColumn[];
  pages: CmsPage[];
}

const L = (id: string, en: string): Loc => ({ id, en });

/** Konten default (dwibahasa) bila app_settings belum berisi. */
export const DEFAULT_CONTENT: SiteContent = {
  footer_tagline: L(
    'Mesin generate dokumen via API.',
    'Document generation engine via API.',
  ),
  footer_columns: [
    {
      head: L('Produk', 'Product'),
      items: [
        { label: L('Fitur', 'Features'), href: '/p/features' },
        { label: L('Harga', 'Pricing'), href: '/p/pricing' },
        { label: L('Templates', 'Templates'), href: '/p/templates' },
        { label: L('Status', 'Status'), href: '/p/status' },
      ],
    },
    {
      head: L('Developer', 'Developer'),
      items: [
        { label: L('Dokumentasi', 'Documentation'), href: '/p/docs' },
        { label: L('API', 'API'), href: '/p/api' },
        { label: L('Webhooks', 'Webhooks'), href: '/p/webhooks' },
        { label: L('SDK', 'SDK'), href: '/p/sdk' },
      ],
    },
    {
      head: L('Perusahaan', 'Company'),
      items: [
        { label: L('Tentang', 'About'), href: '/p/about' },
        { label: L('Kontak', 'Contact'), href: '/p/contact' },
        { label: L('Privasi', 'Privacy'), href: '/p/privacy' },
      ],
    },
  ],
  pages: [
    {
      slug: 'features',
      title: { id: 'Fitur', en: 'Features' },
      body: {
        id: `## Dari HTML + JSON jadi PDF rapi, lewat satu panggilan API

DocGen mengubah template HTML dan data JSON Anda menjadi PDF yang bersih, presisi, dan konsisten, hanya dengan satu panggilan API. Cocok untuk invoice, kuitansi, sertifikat, slip gaji, kontrak, surat jalan, dan dokumen apa pun yang perlu Anda terbitkan dalam jumlah banyak, tanpa pusing soal layout.

Anda menulis HTML/CSS seperti biasa, kami yang mengurus rendering yang stabil. Tidak ada lagi pustaka PDF yang rewel, font yang bergeser, atau hasil cetak yang berbeda di tiap server.

[Daftar gratis](/login) dan dapatkan kredit awal untuk mencoba sekarang.

## Template HTML + variabel

Rancang dokumen dengan HTML dan CSS standar, lalu tandai data dinamis dengan **{{variabel}}**. Saat generate, DocGen menyisipkan nilai dari JSON Anda ke tempat yang tepat.

- Dukungan penuh tabel, daftar, dan layout multi-kolom
- Atur ukuran kertas (A4, Letter, dsb.) lewat CSS **@page**
- Kontrol pemenggalan halaman dengan **page-break** untuk dokumen panjang
- Sisipkan logo dan gambar sebagai **base64** langsung di template
- Edit di dashboard dengan **live preview A4** sehingga yang Anda lihat persis seperti hasil cetak

Contoh potongan template:

~~~
<h1>Invoice {{nomor_invoice}}</h1>
<p>Kepada: {{nama_pelanggan}}</p>
<table>
  <tr><th>Item</th><th>Jumlah</th></tr>
  <tr><td>{{item}}</td><td>{{total}}</td></tr>
</table>
~~~

Pelajari lebih lanjut di [Templates](/p/templates).

## Render Chromium terisolasi

Setiap dokumen di-render oleh worker Chromium yang terisolasi dan **tanpa akses jaringan**. Karena tidak ada koneksi keluar, seluruh aset harus disematkan sebagai base64, dan ini membuat rendering Anda aman dari serangan SSRF.

- Aman secara default: tidak ada permintaan jaringan tak terduga
- Cepat dan konsisten: **p95 sekitar 1,8 detik** per dokumen
- Hasil yang sama di setiap render, tanpa kejutan layout

## Generate massal / batch

Perlu menerbitkan ribuan dokumen sekaligus? Kirim ribuan baris data dalam satu batch.

- Pantau progres batch secara real-time
- Unduh hasil per dokumen sesuai kebutuhan
- Ideal untuk penagihan bulanan, sertifikat acara, atau slip gaji seluruh karyawan

## API & Webhooks

DocGen dibangun untuk developer. Integrasikan dalam hitungan menit.

- **API** yang lugas untuk generate dokumen tunggal maupun batch
- **Webhooks** untuk notifikasi saat dokumen atau batch selesai
- **SDK Node dan Python** resmi agar tidak perlu menulis wrapper sendiri

Lihat detail di [API](/p/api) dan [Dokumentasi](/p/docs).

## Impor DOCX/PDF

Sudah punya dokumen jadi? Impor file **DOCX** atau **PDF** Anda, dan DocGen mengonversinya otomatis menjadi template HTML yang siap Anda sunting dan beri **{{variabel}}**. Tidak perlu membangun template dari nol.

## Keamanan & penyimpanan

- Hasil disimpan di **Cloudflare R2** dengan **tautan bertanda (signed) berumur pendek**
- File disimpan **30 hari**, lalu dihapus otomatis
- Rendering tanpa jaringan menutup celah SSRF sejak awal
- Dibangun untuk Indonesia: penagihan Rupiah, pembayaran lokal, dan dukungan Bahasa Indonesia

## Siap mencoba?

Buat dokumen pertama Anda hari ini, gratis. [Daftar gratis](/login) atau lihat [Harga](/p/pricing).`,
        en: `## From HTML + JSON to a clean PDF, in one API call

DocGen turns your HTML template and JSON data into a clean, pixel-precise, consistent PDF with a single API call. Perfect for invoices, receipts, certificates, payslips, contracts, delivery notes, and any document you need to produce at scale, without fighting layout.

You write ordinary HTML/CSS; we handle rock-solid rendering. No more finicky PDF libraries, shifting fonts, or output that looks different on every server.

[Sign up free](/login) and get starter credits to try it now.

## HTML templates + variables

Design your document with standard HTML and CSS, then mark dynamic data with **{{variable}}**. At generation time, DocGen injects values from your JSON into exactly the right places.

- Full support for tables, lists, and multi-column layouts
- Set paper size (A4, Letter, etc.) via CSS **@page**
- Control pagination with **page-break** for long documents
- Embed logos and images as **base64** directly in the template
- Edit in the dashboard with a **live A4 preview**, so what you see is exactly what prints

Example template snippet:

~~~
<h1>Invoice {{invoice_number}}</h1>
<p>Bill to: {{customer_name}}</p>
<table>
  <tr><th>Item</th><th>Amount</th></tr>
  <tr><td>{{item}}</td><td>{{total}}</td></tr>
</table>
~~~

Learn more on [Templates](/p/templates).

## Isolated Chromium rendering

Every document is rendered by an isolated Chromium worker with **no network access**. Because there is no outbound connection, all assets must be embedded as base64, and this makes your rendering safe from SSRF attacks.

- Secure by default: no unexpected network requests
- Fast and consistent: **p95 around 1.8 seconds** per document
- Identical results on every render, with no layout surprises

## Bulk / batch generation

Need to produce thousands of documents at once? Send thousands of rows in a single batch.

- Track batch progress in real time
- Download each document as you need it
- Ideal for monthly billing, event certificates, or payslips for your whole team

## API & Webhooks

DocGen is built for developers. Integrate in minutes.

- A clean **API** for single and batch document generation
- **Webhooks** to notify you when a document or batch is done
- Official **Node and Python SDKs** so you never write your own wrapper

See the details on [API](/p/api) and [Docs](/p/docs).

## Import DOCX/PDF

Already have finished documents? Import your **DOCX** or **PDF** files and DocGen auto-converts them into editable HTML templates, ready for you to tweak and add **{{variables}}**. No need to build templates from scratch.

## Security & storage

- Output is stored on **Cloudflare R2** with **short-lived signed links**
- Files are kept for **30 days**, then auto-deleted
- Network-free rendering closes the SSRF door from the start
- Built for Indonesia: Rupiah billing, local payments, and Bahasa Indonesia support

## Ready to try?

Create your first document today, for free. [Sign up free](/login) or see [Pricing](/p/pricing).`,
      },
    },
    {
      slug: 'pricing',
      title: { id: 'Harga', en: 'Pricing' },
      body: {
        id: `## Bayar sesuai pakai, tanpa langganan

DocGen memakai model **kredit prabayar**. Tidak ada langganan bulanan, tidak ada biaya tersembunyi. Anda isi saldo di muka, lalu pakai kapan pun Anda butuh. Sederhana dan transparan.

[Daftar gratis](/login) dan dapatkan kredit gratis untuk mencoba.

## Apa itu 1 kredit?

**1 kredit = 1 dokumen** (hingga 5 halaman). Dokumen lebih dari 5 halaman akan menghitung kredit tambahan. Tidak ada biaya bulanan, tidak ada minimum, Anda hanya membayar dokumen yang benar-benar Anda buat.

## Paket kredit

Harga berikut bersifat indikatif dan dapat diperbarui dari dashboard. Semakin besar paket, semakin murah per dokumen.

- **1.000 kredit** — Rp149.000 (sekitar Rp149 per dokumen)
- **5.000 kredit + 250 bonus** — Rp649.000 (sekitar Rp130 per dokumen) — **Populer**
- **20.000 kredit + 1.500 bonus** — Rp2.290.000 (sekitar Rp115 per dokumen)
- **50.000 kredit + 5.000 bonus** — Rp4.990.000 (sekitar Rp100 per dokumen) — **Paling hemat**

## Metode pembayaran

Top up dengan Rupiah lewat metode lokal yang sudah Anda kenal:

- **QRIS**
- **Virtual Account (VA)**
- **E-wallet**

Saldo langsung bertambah setelah pembayaran terkonfirmasi.

## Coba gratis dulu

Setiap akun baru mendapat **kredit gratis** saat mendaftar. Cukup untuk menguji template, render, dan integrasi API Anda sebelum mengisi saldo. [Daftar gratis](/login) sekarang.

## Pertanyaan yang sering muncul

### Apakah saldo bisa hangus?
Tidak. **Saldo Anda tidak pernah hangus.** Pakai kapan saja, sesuai ritme bisnis Anda.

### Apakah ada langganan atau biaya bulanan?
Tidak ada. **Tanpa langganan, tanpa biaya tersembunyi.** Anda hanya membayar kredit yang Anda beli.

### Bagaimana jika dokumen saya lebih dari 5 halaman?
Setiap kelipatan 5 halaman menghitung 1 kredit. Jadi biaya tetap mudah diprediksi.

### Apakah penagihan dalam Rupiah?
Ya. **Penagihan Rupiah**, pembayaran lokal, dan dukungan Bahasa Indonesia, dibangun untuk Indonesia.

## Mulai sekarang

Isi saldo hanya saat Anda perlu, dan saldo tetap aman karena tidak pernah kedaluwarsa. [Daftar gratis](/login) atau pelajari [Fitur](/p/features).`,
        en: `## Pay as you go, no subscription

DocGen runs on a **prepaid credit** model. No monthly subscription, no hidden fees. You top up in advance, then use credits whenever you need them. Simple and transparent.

[Sign up free](/login) and get free credits to try it out.

## What is 1 credit?

**1 credit = 1 document** (up to 5 pages). Documents longer than 5 pages count additional credits. No monthly fee, no minimums, you only pay for the documents you actually create.

## Credit packages

The prices below are indicative and may be updated from the dashboard. The bigger the package, the cheaper your per-document cost.

- **1,000 credits** — Rp149,000 (about Rp149 per document)
- **5,000 credits + 250 bonus** — Rp649,000 (about Rp130 per document) — **Popular**
- **20,000 credits + 1,500 bonus** — Rp2,290,000 (about Rp115 per document)
- **50,000 credits + 5,000 bonus** — Rp4,990,000 (about Rp100 per document) — **Best value**

## Payment methods

Top up in Rupiah with the local methods you already use:

- **QRIS**
- **Virtual Account (VA)**
- **E-wallet**

Your balance is credited as soon as payment is confirmed.

## Try it free first

Every new account gets **free credits** on sign-up. Enough to test your templates, rendering, and API integration before you top up. [Sign up free](/login) now.

## Frequently asked questions

### Does my balance expire?
No. **Your balance never expires.** Use it whenever it suits your business.

### Is there a subscription or monthly fee?
None. **No subscription, no hidden fees.** You only pay for the credits you buy.

### What if my document is more than 5 pages?
Each block of 5 pages counts as 1 credit, so your costs stay easy to predict.

### Is billing in Rupiah?
Yes. **Rupiah billing**, local payments, and Bahasa Indonesia support, built for Indonesia.

## Get started

Top up only when you need to, and your balance stays safe because it never expires. [Sign up free](/login) or explore [Features](/p/features).`,
      },
    },
    {
      slug: 'templates',
      title: { id: 'Templates', en: 'Templates' },
      body: {
        id: `## Template: tulis HTML, dapatkan PDF

Template adalah jantung DocGen. Anda menulis HTML/CSS biasa, menandai data dinamis dengan **{{variabel}}**, dan DocGen mengubahnya menjadi PDF yang rapi setiap kali Anda generate. Tidak perlu engine khusus, cukup keahlian web yang sudah Anda miliki.

[Daftar gratis](/login) dan buat template pertama Anda hari ini.

## Editor dengan preview A4 langsung

Sunting template di dashboard dengan editor yang menampilkan **live preview A4**. Apa yang Anda lihat persis seperti hasil cetak akhir.

- **{{variabel}}** — tandai bagian dinamis, isi otomatis dari data JSON
- **Preview A4** — lihat hasil real-time saat mengetik
- **page-break** — kontrol pemenggalan halaman untuk dokumen panjang
- **base64** — sematkan logo dan gambar langsung di template (wajib, karena rendering tanpa jaringan)
- **@page** — atur ukuran dan margin kertas lewat CSS

## Impor dari DOCX/PDF

Punya dokumen yang sudah jadi? Unggah file **DOCX** atau **PDF**, dan DocGen mengonversinya otomatis menjadi template HTML. Tinggal rapikan dan tambahkan **{{variabel}}** di tempat yang Anda mau, jauh lebih cepat daripada membangun dari nol.

## Jenis dokumen yang umum

- Invoice dan kuitansi
- Sertifikat dan piagam
- Slip gaji
- Kontrak dan perjanjian
- Surat jalan dan delivery note
- Laporan dan ringkasan

## Contoh template

Berikut contoh template invoice sederhana dengan ukuran A4, logo base64, dan variabel:

~~~
<style>
  @page { size: A4; margin: 20mm; }
  .total { font-weight: bold; }
</style>

<img src="data:image/png;base64,iVBORw0KGgo..." alt="Logo" />
<h1>Invoice {{nomor_invoice}}</h1>
<p>Kepada: {{nama_pelanggan}}</p>

<table>
  <tr><th>Deskripsi</th><th>Jumlah</th></tr>
  <tr><td>{{deskripsi}}</td><td>{{jumlah}}</td></tr>
</table>

<p class="total">Total: {{total}}</p>
~~~

Kirim data JSON seperti **nomor_invoice**, **nama_pelanggan**, dan **total**, lalu DocGen menyisipkannya dan menghasilkan PDF.

## Mulai membangun

Buat, impor, atau sunting template, lalu generate lewat [API](/p/api). [Daftar gratis](/login) atau lihat [Fitur](/p/features) dan [Harga](/p/pricing).`,
        en: `## Templates: write HTML, get a PDF

Templates are the heart of DocGen. You write plain HTML/CSS, mark dynamic data with **{{variable}}**, and DocGen turns it into a clean PDF every time you generate. No special engine required, just the web skills you already have.

[Sign up free](/login) and build your first template today.

## Editor with live A4 preview

Edit templates in the dashboard with an editor that shows a **live A4 preview**. What you see is exactly what prints.

- **{{variable}}** — mark the dynamic parts, filled automatically from your JSON data
- **A4 preview** — see results in real time as you type
- **page-break** — control pagination for long documents
- **base64** — embed logos and images directly in the template (required, since rendering has no network access)
- **@page** — set paper size and margins via CSS

## Import from DOCX/PDF

Already have finished documents? Upload a **DOCX** or **PDF** file and DocGen auto-converts it into an HTML template. Just clean it up and add **{{variables}}** where you want them, far faster than building from scratch.

## Common document types

- Invoices and receipts
- Certificates and awards
- Payslips
- Contracts and agreements
- Delivery notes
- Reports and summaries

## Example template

Here is a simple invoice template with A4 size, a base64 logo, and variables:

~~~
<style>
  @page { size: A4; margin: 20mm; }
  .total { font-weight: bold; }
</style>

<img src="data:image/png;base64,iVBORw0KGgo..." alt="Logo" />
<h1>Invoice {{invoice_number}}</h1>
<p>Bill to: {{customer_name}}</p>

<table>
  <tr><th>Description</th><th>Amount</th></tr>
  <tr><td>{{description}}</td><td>{{amount}}</td></tr>
</table>

<p class="total">Total: {{total}}</p>
~~~

Send JSON data such as **invoice_number**, **customer_name**, and **total**, and DocGen injects it and produces the PDF.

## Start building

Create, import, or edit a template, then generate it via the [API](/p/api). [Sign up free](/login) or see [Features](/p/features) and [Pricing](/p/pricing).`,
      },
    },
    {
      slug: 'status',
      title: { id: 'Status', en: 'Status' },
      body: {
        id: `## Status Sistem DocGen

Halaman ini menampilkan kondisi layanan DocGen secara real time. Kami memantau setiap komponen inti yang menjalankan proses dari template HTML + data JSON menjadi PDF, sehingga Anda selalu tahu apakah sistem berjalan normal.

### Komponen yang kami pantau

- **Render engine** — worker Chromium terisolasi yang mengubah HTML + JSON menjadi PDF. **Operational** berarti job render diproses dan p95 waktu render berada di sekitar 1,8 detik.
- **API gateway** — pintu masuk seluruh permintaan API. **Operational** berarti endpoint menerima request, autentikasi berjalan, dan respons dikembalikan dalam batas latensi normal.
- **Queue (BullMQ)** — antrian yang mengatur urutan job render. **Operational** berarti job masuk dan keluar antrian tanpa penumpukan yang tidak wajar.
- **Storage (Cloudflare R2)** — tempat PDF tersimpan beserta link unduh bertanda tangan. **Operational** berarti file dapat ditulis, dibaca, dan link tetap dapat diakses sebelum kedaluwarsa.
- **Payment gateway** — pemrosesan top-up saldo (QRIS/VA/e-wallet). **Operational** berarti pembayaran dan webhook konfirmasi diproses normal.

### Komitmen ketersediaan

Target uptime kami adalah **99,9% atau lebih** untuk layanan inti. Kami merancang sistem dengan worker terisolasi dan antrian agar lonjakan trafik tidak menjatuhkan layanan, dan agar kegagalan satu komponen tidak menyebar ke komponen lain.

### Penanganan insiden

Jika terjadi gangguan, status komponen terkait akan berubah dari **Operational** menjadi **Degraded** (kinerja menurun) atau **Down** (tidak tersedia). Saat insiden berlangsung kami:

1. Menandai komponen yang terdampak beserta tingkat keparahannya.
2. Menyelidiki akar masalah dan menerapkan perbaikan.
3. Memberi pembaruan berkala hingga layanan pulih.
4. Menyusun ringkasan singkat setelah insiden selesai bila dampaknya signifikan.

### Cara mendapat notifikasi

Status langsung ditampilkan di area sistem akun Anda. Anda dapat **berlangganan pembaruan** agar menerima pemberitahuan saat ada perubahan status atau insiden, sehingga tidak perlu memantau halaman ini secara manual.

Punya pertanyaan atau ingin melaporkan masalah yang belum tampak di sini? Hubungi kami melalui [Kontak](/p/contact) atau email [support@docgen.id](mailto:support@docgen.id).`,
        en: `## DocGen System Status

This page shows the live health of DocGen. We monitor every core component that turns an HTML template + JSON data into a PDF, so you always know whether the system is running normally.

### What we monitor

- **Render engine** — the isolated Chromium workers that turn HTML + JSON into PDFs. **Operational** means render jobs are processing and p95 render time sits around 1.8 seconds.
- **API gateway** — the entry point for every API request. **Operational** means endpoints accept requests, authentication works, and responses return within normal latency.
- **Queue (BullMQ)** — the queue that orders render jobs. **Operational** means jobs enter and leave the queue without abnormal backlog.
- **Storage (Cloudflare R2)** — where PDFs live, along with signed download links. **Operational** means files can be written, read, and links remain reachable until they expire.
- **Payment gateway** — top-up processing (QRIS/VA/e-wallet). **Operational** means payments and confirmation webhooks process normally.

### Availability commitment

Our uptime target is **99.9% or higher** for core services. We design the system with isolated workers and a queue so that traffic spikes do not take the service down, and so a failure in one component does not cascade into others.

### Incident handling

When something goes wrong, the affected component changes from **Operational** to **Degraded** (reduced performance) or **Down** (unavailable). During an incident we:

1. Mark the affected component and its severity.
2. Investigate the root cause and roll out a fix.
3. Post regular updates until service recovers.
4. Publish a short summary after the incident when the impact was significant.

### How to get notified

Live status is shown in the system area of your account. You can **subscribe to updates** to be notified whenever a status changes or an incident occurs, so you never have to watch this page manually.

Have a question, or want to report something not shown here yet? Reach us via [Contact](/p/contact) or email [support@docgen.id](mailto:support@docgen.id).`,
      },
    },
    {
      slug: 'docs',
      title: { id: 'Dokumentasi', en: 'Documentation' },
      body: {
        id: `## Selamat datang di DocGen

DocGen mengubah **template HTML + data JSON** menjadi **PDF rapi** lewat satu panggilan API. Kamu mendesain dokumen sekali sebagai template HTML dengan placeholder, lalu mengirim data setiap kali ingin menghasilkan PDF, misalnya invoice, surat, sertifikat, atau laporan.

Tidak ada langganan. Kamu membayar **prabayar (prepaid credit)**: **1 kredit = 1 dokumen** (hingga 5 halaman). Top-up dalam Rupiah lewat QRIS, Virtual Account, atau e-wallet.

Panduan ini membawamu dari nol sampai PDF pertama, lalu ke batch dan webhook untuk skala produksi.

## 1. Autentikasi

Semua permintaan ke API memakai base URL berikut:

~~~
https://api.docgen.id/v1
~~~

Buat API key di dashboard pada menu **API Keys**, lalu kirimkan di setiap permintaan melalui header **Authorization** dengan skema Bearer:

~~~
Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx
~~~

Beberapa hal penting:

- Simpan key di environment variable, jangan pernah commit ke repository atau taruh di kode frontend.
- Key berawalan **dg_live_** dipakai untuk produksi. Perlakukan seperti password.
- Kalau key bocor, cabut (revoke) dan buat yang baru dari dashboard kapan saja.

## 2. Membuat template

Sebuah template adalah dokumen HTML biasa dengan placeholder bergaya **{{variabel}}**. Saat render, setiap placeholder diganti nilai dari data JSON yang kamu kirim.

Contoh template invoice sederhana:

~~~
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: sans-serif; color: #111; }
      .total { font-weight: 700; font-size: 20px; }
    </style>
  </head>
  <body>
    <h1>Invoice {{nomor_invoice}}</h1>
    <p>Kepada: {{nama_pelanggan}}</p>
    <p>Tanggal: {{tanggal}}</p>
    <p class="total">Total: Rp {{total}}</p>
  </body>
</html>
~~~

Simpan template lewat dashboard atau API, dan kamu akan menerima sebuah **template id** (misalnya **tmpl_invoice01**) yang dipakai saat render.

Tips desain template:

- Dokumen dirender oleh **Chromium worker terisolasi tanpa akses jaringan**. Karena itu, **sematkan gambar sebagai base64** (data URI), bukan URL eksternal. Font web juga sebaiknya di-embed atau pakai font sistem.
- Gunakan CSS biasa untuk layout. Aturan cetak seperti **@page** dan **page-break** didukung penuh.
- Ingat batas 1 kredit = 5 halaman per dokumen. Lebih dari itu akan memakai kredit tambahan.

## 3. Render PDF pertamamu

Untuk menghasilkan PDF, kirim **POST** ke **/v1/render** dengan **template id** dan objek **data**.

Contoh dengan cURL:

~~~
curl -X POST https://api.docgen.id/v1/render \\
  -H "Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tmpl_invoice01",
    "data": {
      "nomor_invoice": "INV-2026-0001",
      "nama_pelanggan": "PT Maju Jaya",
      "tanggal": "15 Juni 2026",
      "total": "1.500.000"
    }
  }'
~~~

Contoh dengan SDK Node:

~~~
import DocGen from "@docgen/node";

const client = new DocGen({ apiKey: process.env.DOCGEN_API_KEY });

const doc = await client.render({
  templateId: "tmpl_invoice01",
  data: {
    nomor_invoice: "INV-2026-0001",
    nama_pelanggan: "PT Maju Jaya",
    tanggal: "15 Juni 2026",
    total: "1.500.000",
  },
});

console.log(doc.pdf_url);
~~~

Contoh respons:

~~~
{
  "id": "doc_8f2a1c",
  "status": "completed",
  "pages": 1,
  "credits_used": 1,
  "pdf_url": "https://files.docgen.id/r2/doc_8f2a1c.pdf?sig=...",
  "expires_at": "2026-07-15T08:30:00Z"
}
~~~

Buka **pdf_url** untuk mengunduh PDF. Render khas selesai cepat: **p95 sekitar 1,8 detik**.

### Tentang URL PDF

- PDF disimpan di **Cloudflare R2** dan diakses lewat **signed URL berumur pendek**.
- File disimpan **30 hari**, lalu dihapus otomatis. Unduh dan arsipkan sendiri bila perlu menyimpan lebih lama.

## 4. Render banyak dokumen (Batch)

Kalau perlu membuat ratusan atau ribuan dokumen sekaligus, gunakan **batch**: kirim banyak baris data dalam satu permintaan, pantau statusnya, lalu unduh per dokumen.

~~~
curl -X POST https://api.docgen.id/v1/batches \\
  -H "Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tmpl_invoice01",
    "rows": [
      { "nomor_invoice": "INV-0001", "nama_pelanggan": "Pelanggan A", "tanggal": "15 Juni 2026", "total": "100.000" },
      { "nomor_invoice": "INV-0002", "nama_pelanggan": "Pelanggan B", "tanggal": "15 Juni 2026", "total": "250.000" }
    ]
  }'
~~~

Respons memberi **batch id**. Pantau (poll) statusnya hingga **completed**, lalu ambil daftar dokumen beserta URL masing-masing. Detail lengkap endpoint batch ada di [Halaman API](/p/api).

## 5. Webhook

Daripada terus melakukan poll, kamu bisa berlangganan **webhook**. DocGen akan memanggil URL-mu saat sebuah dokumen atau batch **selesai**.

- Setiap payload **ditandatangani HMAC**, jadi kamu bisa memverifikasi keasliannya.
- Selalu verifikasi tanda tangan sebelum memproses payload.
- Balas cepat dengan **HTTP 200**; lakukan pekerjaan berat secara asinkron.

Cara mengatur webhook dan format payload dijelaskan di [Halaman API](/p/api).

## 6. Penanganan error

Semua error berformat **JSON** dengan field **type** dan **message** yang konsisten:

~~~
{
  "type": "validation_error",
  "message": "Field 'template_id' wajib diisi."
}
~~~

Periksa **type** untuk logika program, dan tampilkan **message** untuk konteks. Daftar lengkap tipe error ada di [Halaman API](/p/api).

## Langkah selanjutnya

- Pelajari referensi lengkap di [Halaman API](/p/api).
- Pasang [SDK](/p/sdk) untuk Node atau Python agar integrasi lebih cepat.
- Top-up kredit dari dashboard dan mulai render di produksi.

Butuh bantuan? Tim kami siap membantu lewat dukungan di dashboard.`,
        en: `## Welcome to DocGen

DocGen turns an **HTML template + JSON data** into a **clean PDF** with a single API call. You design a document once as an HTML template with placeholders, then send data whenever you want a PDF, for example invoices, letters, certificates, or reports.

There is no subscription. You pay **prepaid**: **1 credit = 1 document** (up to 5 pages). Top up in Rupiah via QRIS, Virtual Account, or e-wallet.

This guide takes you from zero to your first PDF, then on to batch rendering and webhooks for production scale.

## 1. Authentication

Every request uses this base URL:

~~~
https://api.docgen.id/v1
~~~

Create an API key in the dashboard under **API Keys**, then send it with every request via the **Authorization** header using the Bearer scheme:

~~~
Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx
~~~

A few essentials:

- Store the key in an environment variable. Never commit it to a repository or expose it in frontend code.
- Keys prefixed with **dg_live_** are for production. Treat them like a password.
- If a key leaks, revoke it and create a new one from the dashboard at any time.

## 2. Create a template

A template is plain HTML with **{{variable}}** style placeholders. At render time, each placeholder is replaced with a value from the JSON data you send.

A simple invoice template:

~~~
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: sans-serif; color: #111; }
      .total { font-weight: 700; font-size: 20px; }
    </style>
  </head>
  <body>
    <h1>Invoice {{invoice_number}}</h1>
    <p>To: {{customer_name}}</p>
    <p>Date: {{date}}</p>
    <p class="total">Total: Rp {{total}}</p>
  </body>
</html>
~~~

Save the template via the dashboard or API and you will receive a **template id** (for example **tmpl_invoice01**) to use when rendering.

Template design tips:

- Documents are rendered by **isolated Chromium workers with no network access**. Therefore, **embed images as base64** (data URIs) instead of external URLs. Web fonts should likewise be embedded, or use system fonts.
- Use normal CSS for layout. Print rules like **@page** and **page-break** are fully supported.
- Remember the limit of 1 credit = 5 pages per document. Beyond that consumes additional credits.

## 3. Render your first PDF

To produce a PDF, send a **POST** to **/v1/render** with a **template id** and a **data** object.

With cURL:

~~~
curl -X POST https://api.docgen.id/v1/render \\
  -H "Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tmpl_invoice01",
    "data": {
      "invoice_number": "INV-2026-0001",
      "customer_name": "PT Maju Jaya",
      "date": "15 June 2026",
      "total": "1.500.000"
    }
  }'
~~~

With the Node SDK:

~~~
import DocGen from "@docgen/node";

const client = new DocGen({ apiKey: process.env.DOCGEN_API_KEY });

const doc = await client.render({
  templateId: "tmpl_invoice01",
  data: {
    invoice_number: "INV-2026-0001",
    customer_name: "PT Maju Jaya",
    date: "15 June 2026",
    total: "1.500.000",
  },
});

console.log(doc.pdf_url);
~~~

Example response:

~~~
{
  "id": "doc_8f2a1c",
  "status": "completed",
  "pages": 1,
  "credits_used": 1,
  "pdf_url": "https://files.docgen.id/r2/doc_8f2a1c.pdf?sig=...",
  "expires_at": "2026-07-15T08:30:00Z"
}
~~~

Open **pdf_url** to download the PDF. A typical render is fast: **p95 around 1.8 seconds**.

### About the PDF URL

- PDFs are stored on **Cloudflare R2** and served via **short-lived signed URLs**.
- Files are kept for **30 days**, then deleted automatically. Download and archive them yourself if you need longer retention.

## 4. Render many documents (Batch)

When you need hundreds or thousands of documents at once, use a **batch**: send many data rows in one request, poll its status, then download each document.

~~~
curl -X POST https://api.docgen.id/v1/batches \\
  -H "Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tmpl_invoice01",
    "rows": [
      { "invoice_number": "INV-0001", "customer_name": "Customer A", "date": "15 June 2026", "total": "100.000" },
      { "invoice_number": "INV-0002", "customer_name": "Customer B", "date": "15 June 2026", "total": "250.000" }
    ]
  }'
~~~

The response returns a **batch id**. Poll its status until **completed**, then fetch the list of documents with each PDF URL. Full batch endpoint details are on the [API page](/p/api).

## 5. Webhooks

Instead of polling, you can subscribe to **webhooks**. DocGen calls your URL when a document or batch **finishes**.

- Every payload is **HMAC-signed**, so you can verify its authenticity.
- Always verify the signature before processing a payload.
- Respond quickly with **HTTP 200**; do heavy work asynchronously.

How to configure webhooks and the payload format are described on the [API page](/p/api).

## 6. Error handling

All errors are returned as **JSON** with consistent **type** and **message** fields:

~~~
{
  "type": "validation_error",
  "message": "Field 'template_id' is required."
}
~~~

Branch on **type** in your code, and surface **message** for context. The full list of error types is on the [API page](/p/api).

## Next steps

- Read the complete reference on the [API page](/p/api).
- Install the [SDK](/p/sdk) for Node or Python to integrate faster.
- Top up credits from the dashboard and start rendering in production.

Need a hand? Our team is happy to help through dashboard support.`,
      },
    },
    {
      slug: 'api',
      title: { id: 'API', en: 'API' },
      body: {
        id: `## Referensi API DocGen

Referensi ini menjelaskan endpoint HTTP DocGen secara lengkap. API berbasis REST, menerima dan mengembalikan **JSON**, dan memakai kode status HTTP standar.

Base URL:

~~~
https://api.docgen.id/v1
~~~

Lihat juga [Dokumentasi](/p/docs) untuk panduan langkah demi langkah dan [SDK](/p/sdk) untuk klien resmi.

## Autentikasi

Setiap permintaan harus menyertakan API key sebagai Bearer token di header **Authorization**:

~~~
Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx
~~~

- Buat dan cabut key dari dashboard pada menu **API Keys**.
- Permintaan tanpa key valid akan ditolak dengan **HTTP 401** dan error bertipe **authentication_error**.
- Kirim semua permintaan lewat HTTPS. Permintaan non-HTTPS ditolak.

## POST /v1/render

Merender satu dokumen dari sebuah template dan data, secara sinkron.

Parameter body (JSON):

- **template_id** (string, wajib) — id template yang akan dirender.
- **data** (object, wajib) — pasangan key-value untuk mengisi placeholder **{{variabel}}**.
- **filename** (string, opsional) — nama file yang disarankan untuk PDF.

Contoh permintaan:

~~~
curl -X POST https://api.docgen.id/v1/render \\
  -H "Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tmpl_invoice01",
    "data": { "nomor_invoice": "INV-0001", "total": "100.000" },
    "filename": "invoice-0001.pdf"
  }'
~~~

Contoh permintaan (Python):

~~~
import os, requests

resp = requests.post(
    "https://api.docgen.id/v1/render",
    headers={"Authorization": "Bearer " + os.environ["DOCGEN_API_KEY"]},
    json={
        "template_id": "tmpl_invoice01",
        "data": {"nomor_invoice": "INV-0001", "total": "100.000"},
    },
)
print(resp.json()["pdf_url"])
~~~

Contoh respons (HTTP 200):

~~~
{
  "id": "doc_8f2a1c",
  "status": "completed",
  "pages": 1,
  "credits_used": 1,
  "pdf_url": "https://files.docgen.id/r2/doc_8f2a1c.pdf?sig=...",
  "expires_at": "2026-07-15T08:30:00Z"
}
~~~

Catatan:

- **pdf_url** adalah signed URL Cloudflare R2 yang berumur pendek. File disimpan 30 hari lalu dihapus otomatis.
- 1 dokumen (hingga 5 halaman) memakai **1 kredit**. Dokumen lebih panjang memakai kredit tambahan, dilaporkan di **credits_used**.

## Endpoint batch

Untuk volume besar, kirim banyak baris data dalam satu permintaan lalu pantau statusnya.

### POST /v1/batches

Membuat batch baru.

- **template_id** (string, wajib).
- **rows** (array of object, wajib) — setiap elemen adalah objek **data** untuk satu dokumen.

Contoh respons (HTTP 202):

~~~
{
  "id": "batch_3kd9a1",
  "status": "processing",
  "total": 2,
  "completed": 0
}
~~~

### GET /v1/batches/{id}

Mengambil status batch. Lakukan poll hingga **status** bernilai **completed**.

~~~
{
  "id": "batch_3kd9a1",
  "status": "completed",
  "total": 2,
  "completed": 2,
  "documents": [
    { "id": "doc_a1", "status": "completed", "pdf_url": "https://files.docgen.id/r2/doc_a1.pdf?sig=..." },
    { "id": "doc_a2", "status": "completed", "pdf_url": "https://files.docgen.id/r2/doc_a2.pdf?sig=..." }
  ]
}
~~~

Unduh setiap PDF dari **pdf_url** masing-masing. Untuk menghindari poll, gunakan webhook (di bawah).

## Templates

### GET /v1/templates

Mengembalikan daftar template milikmu.

~~~
{
  "data": [
    { "id": "tmpl_invoice01", "name": "Invoice", "updated_at": "2026-06-10T03:12:00Z" },
    { "id": "tmpl_sertifikat", "name": "Sertifikat", "updated_at": "2026-05-22T09:40:00Z" }
  ]
}
~~~

Gunakan **id** dari daftar ini sebagai **template_id** saat render atau batch.

## Webhook

Daftarkan endpoint webhook dari dashboard. DocGen mengirim **POST** ke URL-mu saat dokumen atau batch selesai.

Contoh payload:

~~~
{
  "event": "document.completed",
  "id": "doc_8f2a1c",
  "status": "completed",
  "pdf_url": "https://files.docgen.id/r2/doc_8f2a1c.pdf?sig=...",
  "created_at": "2026-06-15T08:30:01Z"
}
~~~

Setiap permintaan menyertakan header tanda tangan **HMAC**, misalnya **X-DocGen-Signature**. Verifikasi seperti ini (Python):

~~~
import hmac, hashlib

def verify(secret, raw_body, signature):
    expected = hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
~~~

Balas dengan **HTTP 200** secepatnya. DocGen akan mencoba ulang pengiriman jika endpoint-mu gagal merespons.

## Format error

Error dikembalikan sebagai JSON dengan **type** dan **message**:

~~~
{
  "type": "validation_error",
  "message": "Field 'template_id' wajib diisi."
}
~~~

Tipe error yang umum:

- **authentication_error** (HTTP 401) — API key hilang atau tidak valid.
- **permission_error** (HTTP 403) — key tidak punya akses ke resource.
- **not_found** (HTTP 404) — template, dokumen, atau batch tidak ditemukan.
- **validation_error** (HTTP 422) — body tidak valid atau ada field wajib yang kosong.
- **insufficient_credits** (HTTP 402) — kredit tidak cukup; lakukan top-up dari dashboard.
- **rate_limit_error** (HTTP 429) — terlalu banyak permintaan; coba lagi setelah jeda.
- **render_error** (HTTP 422) — template gagal dirender, misalnya gambar memakai URL eksternal.
- **server_error** (HTTP 500) — kesalahan tak terduga di sisi kami; aman untuk dicoba ulang.

## Rate limit

- Batas default berlaku per akun dan diukur per menit.
- Saat melebihi batas, kamu menerima **HTTP 429** dengan tipe **rate_limit_error**.
- Respons menyertakan header **Retry-After** (detik). Hormati nilai ini dengan exponential backoff.
- Untuk volume besar, gunakan endpoint batch alih-alih banyak panggilan **/v1/render**.

## Idempotency

Agar percobaan ulang aman dan tidak membuat dokumen ganda, kirim header **Idempotency-Key** berisi nilai unik (misalnya UUID) pada permintaan **POST**:

~~~
Idempotency-Key: 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed
~~~

- Jika permintaan dengan key yang sama diterima lagi, DocGen mengembalikan hasil asli tanpa memakai kredit lagi.
- Key disimpan selama 24 jam.
- Gunakan key baru untuk setiap operasi yang memang berbeda.

## Versi

API diversikan lewat path (**/v1**). Perubahan yang bersifat breaking akan dirilis pada versi baru, dan kami umumkan sebelumnya. Lihat [Dokumentasi](/p/docs) untuk panduan awal.`,
        en: `## DocGen API reference

This reference documents the DocGen HTTP API in full. The API is REST-based, accepts and returns **JSON**, and uses standard HTTP status codes.

Base URL:

~~~
https://api.docgen.id/v1
~~~

See also the [Documentation](/p/docs) for a step-by-step guide and the [SDK](/p/sdk) for official clients.

## Authentication

Every request must include your API key as a Bearer token in the **Authorization** header:

~~~
Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx
~~~

- Create and revoke keys from the dashboard under **API Keys**.
- Requests without a valid key are rejected with **HTTP 401** and an error of type **authentication_error**.
- Send all requests over HTTPS. Non-HTTPS requests are rejected.

## POST /v1/render

Renders a single document from a template and data, synchronously.

Body parameters (JSON):

- **template_id** (string, required) — the id of the template to render.
- **data** (object, required) — key-value pairs that fill the **{{variable}}** placeholders.
- **filename** (string, optional) — a suggested file name for the PDF.

Example request:

~~~
curl -X POST https://api.docgen.id/v1/render \\
  -H "Authorization: Bearer dg_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tmpl_invoice01",
    "data": { "invoice_number": "INV-0001", "total": "100.000" },
    "filename": "invoice-0001.pdf"
  }'
~~~

Example request (Python):

~~~
import os, requests

resp = requests.post(
    "https://api.docgen.id/v1/render",
    headers={"Authorization": "Bearer " + os.environ["DOCGEN_API_KEY"]},
    json={
        "template_id": "tmpl_invoice01",
        "data": {"invoice_number": "INV-0001", "total": "100.000"},
    },
)
print(resp.json()["pdf_url"])
~~~

Example response (HTTP 200):

~~~
{
  "id": "doc_8f2a1c",
  "status": "completed",
  "pages": 1,
  "credits_used": 1,
  "pdf_url": "https://files.docgen.id/r2/doc_8f2a1c.pdf?sig=...",
  "expires_at": "2026-07-15T08:30:00Z"
}
~~~

Notes:

- **pdf_url** is a short-lived Cloudflare R2 signed URL. Files are kept for 30 days, then deleted automatically.
- One document (up to 5 pages) costs **1 credit**. Longer documents use additional credits, reported in **credits_used**.

## Batch endpoints

For high volume, send many data rows in one request and then poll the status.

### POST /v1/batches

Creates a new batch.

- **template_id** (string, required).
- **rows** (array of object, required) — each element is a **data** object for one document.

Example response (HTTP 202):

~~~
{
  "id": "batch_3kd9a1",
  "status": "processing",
  "total": 2,
  "completed": 0
}
~~~

### GET /v1/batches/{id}

Retrieves batch status. Poll until **status** is **completed**.

~~~
{
  "id": "batch_3kd9a1",
  "status": "completed",
  "total": 2,
  "completed": 2,
  "documents": [
    { "id": "doc_a1", "status": "completed", "pdf_url": "https://files.docgen.id/r2/doc_a1.pdf?sig=..." },
    { "id": "doc_a2", "status": "completed", "pdf_url": "https://files.docgen.id/r2/doc_a2.pdf?sig=..." }
  ]
}
~~~

Download each PDF from its **pdf_url**. To avoid polling, use webhooks (below).

## Templates

### GET /v1/templates

Returns a list of your templates.

~~~
{
  "data": [
    { "id": "tmpl_invoice01", "name": "Invoice", "updated_at": "2026-06-10T03:12:00Z" },
    { "id": "tmpl_certificate", "name": "Certificate", "updated_at": "2026-05-22T09:40:00Z" }
  ]
}
~~~

Use an **id** from this list as the **template_id** when rendering or batching.

## Webhooks

Register a webhook endpoint from the dashboard. DocGen sends a **POST** to your URL when a document or batch finishes.

Example payload:

~~~
{
  "event": "document.completed",
  "id": "doc_8f2a1c",
  "status": "completed",
  "pdf_url": "https://files.docgen.id/r2/doc_8f2a1c.pdf?sig=...",
  "created_at": "2026-06-15T08:30:01Z"
}
~~~

Each request includes an **HMAC** signature header, for example **X-DocGen-Signature**. Verify it like this (Python):

~~~
import hmac, hashlib

def verify(secret, raw_body, signature):
    expected = hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
~~~

Respond with **HTTP 200** as quickly as possible. DocGen retries delivery if your endpoint fails to respond.

## Error format

Errors are returned as JSON with a **type** and a **message**:

~~~
{
  "type": "validation_error",
  "message": "Field 'template_id' is required."
}
~~~

Common error types:

- **authentication_error** (HTTP 401) — missing or invalid API key.
- **permission_error** (HTTP 403) — the key cannot access this resource.
- **not_found** (HTTP 404) — template, document, or batch not found.
- **validation_error** (HTTP 422) — invalid body or a missing required field.
- **insufficient_credits** (HTTP 402) — not enough credits; top up from the dashboard.
- **rate_limit_error** (HTTP 429) — too many requests; retry after a delay.
- **render_error** (HTTP 422) — the template failed to render, for example an image using an external URL.
- **server_error** (HTTP 500) — an unexpected error on our side; safe to retry.

## Rate limits

- Default limits apply per account and are measured per minute.
- When you exceed a limit, you receive **HTTP 429** with type **rate_limit_error**.
- The response includes a **Retry-After** header (seconds). Honor it with exponential backoff.
- For high volume, prefer the batch endpoint over many **/v1/render** calls.

## Idempotency

To make retries safe and avoid duplicate documents, send an **Idempotency-Key** header with a unique value (for example a UUID) on **POST** requests:

~~~
Idempotency-Key: 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed
~~~

- If a request with the same key is received again, DocGen returns the original result without charging credits again.
- Keys are retained for 24 hours.
- Use a fresh key for each genuinely distinct operation.

## Versioning

The API is versioned via the path (**/v1**). Breaking changes ship under a new version and are announced in advance. See the [Documentation](/p/docs) to get started.`,
      },
    },
    {
      slug: 'webhooks',
      title: { id: 'Webhooks', en: 'Webhooks' },
      body: {
        id: `## Webhooks

Webhooks adalah cara tercepat untuk mengetahui kapan dokumen Anda selesai dibuat tanpa harus melakukan polling ke API. Daripada memanggil DocGen berulang kali untuk menanyakan "apakah sudah jadi?", Anda cukup mendaftarkan satu URL endpoint, lalu DocGen yang akan mengirim notifikasi ke server Anda begitu pekerjaan rampung.

Pendekatan ini ideal untuk render yang berjalan asinkron, batch berukuran besar, atau alur kerja di mana PDF perlu langsung diteruskan ke pengguna, disimpan ke storage, atau memicu proses lanjutan.

## Cara Kerja

1. Buka halaman **Webhooks** di dashboard dan daftarkan URL endpoint milik Anda (harus HTTPS dan dapat diakses publik).
2. DocGen membuatkan sebuah **webhook secret** untuk endpoint tersebut. Simpan baik-baik, nilai ini dipakai untuk memverifikasi keaslian setiap request.
3. Setiap kali sebuah dokumen atau batch selesai, DocGen mengirim **HTTP POST** berisi payload JSON ke URL Anda.
4. Server Anda memverifikasi tanda tangan, memproses event, lalu membalas dengan status **2xx** secepat mungkin.
5. Jika server Anda membalas dengan status non-2xx atau timeout, DocGen akan mencoba ulang dengan jeda yang bertambah (backoff).

## Jenis Event

DocGen mengirim event berikut:

- **document.completed** — sebuah dokumen tunggal berhasil di-render dan PDF siap diunduh.
- **document.failed** — render dokumen gagal (template tidak valid, data bermasalah, atau error internal). Periksa field status untuk detail.
- **batch.completed** — seluruh dokumen dalam satu permintaan batch telah selesai diproses.

Setiap event dikirim sebagai satu request POST terpisah. Selalu periksa field **type** pada body untuk menentukan jenis event sebelum memprosesnya.

## Contoh Payload

Berikut contoh body yang dikirim untuk event **document.completed**:

~~~
{
  "type": "document.completed",
  "data": {
    "id": "doc_8Ktf0Qm3xZ",
    "status": "completed",
    "output_url": "https://files.docgen.id/doc_8Ktf0Qm3xZ.pdf",
    "credits_charged": 1,
    "created_at": "2026-06-15T09:24:11Z"
  }
}
~~~

Untuk **batch.completed**, field **data** akan berisi ringkasan batch beserta daftar dokumen yang dihasilkan. Untuk **document.failed**, field **output_url** akan bernilai null dan **status** berisi alasan kegagalan.

## Verifikasi Tanda Tangan

Setiap request menyertakan header **X-DocGen-Signature**, yaitu HMAC-SHA256 dari **raw body** (body mentah, persis seperti yang dikirim) menggunakan webhook secret Anda. Selalu verifikasi tanda tangan ini sebelum mempercayai isi payload. Tanpa verifikasi, siapa pun yang mengetahui URL Anda bisa mengirim event palsu.

Hal penting: hitung HMAC dari **body mentah**, bukan hasil JSON yang sudah di-parse lalu di-serialize ulang, karena urutan dan spasi bisa berubah.

Contoh dengan Node.js (Express):

~~~
const express = require("express");
const crypto = require("crypto");

const app = express();
const WEBHOOK_SECRET = process.env.DOCGEN_WEBHOOK_SECRET;

app.post(
  "/webhooks/docgen",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.header("X-DocGen-Signature");
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );

    if (!valid) {
      return res.status(401).send("invalid signature");
    }

    const event = JSON.parse(req.body.toString("utf8"));
    res.status(200).send("ok");

    handleEvent(event);
  }
);
~~~

Contoh dengan Python (Flask):

~~~
import hmac
import hashlib
import os
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = os.environ["DOCGEN_WEBHOOK_SECRET"].encode()

@app.post("/webhooks/docgen")
def docgen_webhook():
    signature = request.headers.get("X-DocGen-Signature", "")
    raw_body = request.get_data()

    expected = hmac.new(WEBHOOK_SECRET, raw_body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature, expected):
        abort(401)

    event = request.get_json()
    return ("", 200)
~~~

Gunakan perbandingan yang aman terhadap timing (**timingSafeEqual** di Node, **hmac.compare_digest** di Python) agar tidak rentan terhadap timing attack.

## Percobaan Ulang dan Praktik Terbaik

- **Balas cepat.** Kembalikan status 2xx dalam hitungan detik. Pekerjaan berat seperti mengunduh PDF, mengirim email, atau menulis ke database sebaiknya dijalankan secara asinkron setelah Anda membalas.
- **Backoff otomatis.** Jika endpoint Anda membalas non-2xx atau timeout, DocGen mencoba ulang dengan jeda yang makin panjang, hingga sekitar 5 kali percobaan. Setelah itu event dianggap gagal terkirim.
- **Idempoten.** Karena percobaan ulang bisa terjadi, event yang sama mungkin diterima lebih dari sekali. Gunakan field **id** sebagai kunci agar setiap event diproses tepat satu kali.
- **Selalu verifikasi tanda tangan** sebelum memproses payload apa pun.
- **Gunakan HTTPS.** Endpoint webhook wajib memakai HTTPS yang valid.
- **Catat (log) event mentah** sehingga Anda bisa memutar ulang dan melakukan debug bila diperlukan.

## Tips Pengujian

- Gunakan tunnel lokal seperti ngrok atau Cloudflare Tunnel untuk mengekspos server di laptop Anda ke internet saat pengembangan.
- Daftarkan URL tunnel tersebut sementara di halaman **Webhooks** dashboard, lalu jalankan satu render uji.
- Periksa header **X-DocGen-Signature** dan pastikan kode verifikasi Anda menghasilkan nilai yang cocok.
- Uji jalur kegagalan: balas dengan status 500 secara sengaja dan amati perilaku percobaan ulang.

Lihat juga [Dokumentasi](/p/docs), referensi [API](/p/api), dan halaman [SDK](/p/sdk) untuk helper verifikasi tanda tangan bawaan.`,
        en: `## Webhooks

Webhooks are the fastest way to know when your documents are ready without polling the API. Instead of repeatedly asking DocGen "is it done yet?", you register a single endpoint URL and let DocGen notify your server the moment a job finishes.

This approach is ideal for asynchronous renders, large batches, or any workflow where the finished PDF needs to be handed to a user, saved to storage, or used to trigger a downstream process.

## How It Works

1. Open the **Webhooks** page in your dashboard and register your endpoint URL (it must be HTTPS and publicly reachable).
2. DocGen generates a **webhook secret** for that endpoint. Store it safely, you will use it to verify the authenticity of every request.
3. Whenever a document or batch finishes, DocGen sends an **HTTP POST** with a JSON payload to your URL.
4. Your server verifies the signature, processes the event, and responds with a **2xx** status as quickly as possible.
5. If your server responds with a non-2xx status or times out, DocGen retries with increasing delays (backoff).

## Event Types

DocGen sends the following events:

- **document.completed** — a single document rendered successfully and the PDF is ready to download.
- **document.failed** — a document render failed (invalid template, bad data, or an internal error). Check the status field for details.
- **batch.completed** — every document in a batch request has finished processing.

Each event is delivered as its own POST request. Always inspect the **type** field in the body to determine the event before acting on it.

## Example Payload

Here is an example body sent for a **document.completed** event:

~~~
{
  "type": "document.completed",
  "data": {
    "id": "doc_8Ktf0Qm3xZ",
    "status": "completed",
    "output_url": "https://files.docgen.id/doc_8Ktf0Qm3xZ.pdf",
    "credits_charged": 1,
    "created_at": "2026-06-15T09:24:11Z"
  }
}
~~~

For **batch.completed**, the **data** field carries a batch summary plus the list of generated documents. For **document.failed**, **output_url** is null and **status** describes the failure reason.

## Verifying the Signature

Every request includes an **X-DocGen-Signature** header, which is the HMAC-SHA256 of the **raw body** (exactly as sent) computed with your webhook secret. Always verify this signature before trusting the payload. Without verification, anyone who learns your URL could send forged events.

Important: compute the HMAC over the **raw body**, not over JSON that has been parsed and re-serialized, since key order and whitespace can change.

Node.js example (Express):

~~~
const express = require("express");
const crypto = require("crypto");

const app = express();
const WEBHOOK_SECRET = process.env.DOCGEN_WEBHOOK_SECRET;

app.post(
  "/webhooks/docgen",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.header("X-DocGen-Signature");
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );

    if (!valid) {
      return res.status(401).send("invalid signature");
    }

    const event = JSON.parse(req.body.toString("utf8"));
    res.status(200).send("ok");

    handleEvent(event);
  }
);
~~~

Python example (Flask):

~~~
import hmac
import hashlib
import os
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = os.environ["DOCGEN_WEBHOOK_SECRET"].encode()

@app.post("/webhooks/docgen")
def docgen_webhook():
    signature = request.headers.get("X-DocGen-Signature", "")
    raw_body = request.get_data()

    expected = hmac.new(WEBHOOK_SECRET, raw_body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature, expected):
        abort(401)

    event = request.get_json()
    return ("", 200)
~~~

Use a timing-safe comparison (**timingSafeEqual** in Node, **hmac.compare_digest** in Python) so you are not vulnerable to timing attacks.

## Retries and Best Practices

- **Respond fast.** Return a 2xx status within seconds. Heavy work like downloading the PDF, sending email, or writing to a database should run asynchronously after you reply.
- **Automatic backoff.** If your endpoint returns a non-2xx status or times out, DocGen retries with growing delays, up to around 5 attempts. After that the event is considered undelivered.
- **Be idempotent.** Because retries happen, the same event may arrive more than once. Use the **id** field as a key so each event is processed exactly once.
- **Always verify the signature** before processing any payload.
- **Use HTTPS.** Webhook endpoints must use valid HTTPS.
- **Log the raw event** so you can replay and debug it when needed.

## Testing Tips

- Use a local tunnel such as ngrok or Cloudflare Tunnel to expose your laptop server to the internet during development.
- Temporarily register the tunnel URL on the **Webhooks** page of your dashboard, then run a single test render.
- Inspect the **X-DocGen-Signature** header and confirm your verification code produces a matching value.
- Test the failure path: deliberately respond with a 500 status and observe the retry behavior.

See also the [Documentation](/p/docs), the [API](/p/api) reference, and the [SDK](/p/sdk) page for a built-in signature verification helper.`,
      },
    },
    {
      slug: 'sdk',
      title: { id: 'SDK', en: 'SDK' },
      body: {
        id: `## SDK

SDK resmi DocGen membungkus REST API kami sehingga Anda bisa membuat PDF dari kode dalam hitungan menit, tanpa menulis pemanggilan HTTP secara manual. Tersedia pustaka untuk **Node.js** dan **Python**, lengkap dengan render dokumen, batch, dan helper untuk memverifikasi tanda tangan webhook.

Di balik layar, SDK memanggil endpoint yang sama di **https://api.docgen.id/v1**, menangani autentikasi, dan mengembalikan objek yang sudah rapi.

## Instalasi

Node.js:

~~~
npm i @docgen/sdk
~~~

Python:

~~~
pip install docgen
~~~

## Autentikasi

Buat API key di dashboard, lalu inisialisasi klien dengan key tersebut. Key untuk produksi berawalan **dg_live_**. Jangan pernah menaruh key langsung di kode atau repository, gunakan environment variable.

Node.js:

~~~
const { DocGen } = require("@docgen/sdk");

const docgen = new DocGen({
  apiKey: process.env.DOCGEN_API_KEY,
});
~~~

Python:

~~~
import os
from docgen import DocGen

docgen = DocGen(api_key=os.environ["DOCGEN_API_KEY"])
~~~

## Render Dokumen

Kirim sebuah template HTML beserta data JSON, dan DocGen mengembalikan dokumen dengan **output_url** menuju PDF. Satu dokumen (hingga 5 halaman) menghabiskan 1 kredit.

Node.js:

~~~
async function main() {
  const doc = await docgen.render({
    template: "<h1>Invoice {{ number }}</h1><p>Total: {{ total }}</p>",
    data: { number: "INV-1042", total: "Rp 250.000" },
  });

  console.log(doc.id);
  console.log(doc.status);
  console.log(doc.output_url);
}

main();
~~~

Python:

~~~
doc = docgen.render(
    template="<h1>Invoice {{ number }}</h1><p>Total: {{ total }}</p>",
    data={"number": "INV-1042", "total": "Rp 250.000"},
)

print(doc.id)
print(doc.status)
print(doc.output_url)
~~~

## Mengunduh dan Menyimpan PDF

Field **output_url** menunjuk ke PDF yang sudah jadi. Anda bisa langsung menyerahkannya ke pengguna, atau mengunduh dan menyimpannya sendiri.

Node.js:

~~~
const fs = require("fs");

async function save() {
  const doc = await docgen.render({
    template: "<h1>Hello</h1>",
    data: {},
  });

  const res = await fetch(doc.output_url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("invoice.pdf", buffer);
}

save();
~~~

Python:

~~~
import requests

doc = docgen.render(template="<h1>Hello</h1>", data={})

pdf = requests.get(doc.output_url)
with open("invoice.pdf", "wb") as f:
    f.write(pdf.content)
~~~

## Batch

Untuk membuat banyak dokumen sekaligus, gunakan render batch. Setiap item memakan 1 kredit. Pasangkan dengan webhook **batch.completed** agar Anda tahu kapan seluruh batch selesai.

Node.js:

~~~
const batch = await docgen.batch([
  { template: tpl, data: { number: "INV-1" } },
  { template: tpl, data: { number: "INV-2" } },
  { template: tpl, data: { number: "INV-3" } },
]);

console.log(batch.id);
for (const doc of batch.documents) {
  console.log(doc.id, doc.output_url);
}
~~~

Python:

~~~
batch = docgen.batch([
    {"template": tpl, "data": {"number": "INV-1"}},
    {"template": tpl, "data": {"number": "INV-2"}},
    {"template": tpl, "data": {"number": "INV-3"}},
])

print(batch.id)
for doc in batch.documents:
    print(doc.id, doc.output_url)
~~~

## Verifikasi Webhook dengan SDK

SDK menyediakan helper untuk memverifikasi tanda tangan webhook tanpa harus menulis HMAC sendiri. Berikan raw body dan header **X-DocGen-Signature**, lalu helper mengembalikan event yang sudah terverifikasi (atau melempar error bila tidak valid).

Node.js:

~~~
app.post(
  "/webhooks/docgen",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const event = docgen.webhooks.verify(
        req.body,
        req.header("X-DocGen-Signature"),
        process.env.DOCGEN_WEBHOOK_SECRET
      );
      res.status(200).send("ok");
      handleEvent(event);
    } catch (err) {
      res.status(401).send("invalid signature");
    }
  }
);
~~~

Python:

~~~
event = docgen.webhooks.verify(
    payload=request.get_data(),
    signature=request.headers["X-DocGen-Signature"],
    secret=os.environ["DOCGEN_WEBHOOK_SECRET"],
)
~~~

## Penanganan Error

SDK melempar error yang khas ketika API mengembalikan masalah, misalnya key tidak valid, kredit habis, atau template bermasalah. Tangkap dan tangani sesuai kebutuhan.

Node.js:

~~~
const { DocGenError } = require("@docgen/sdk");

try {
  const doc = await docgen.render({ template: tpl, data: {} });
} catch (err) {
  if (err instanceof DocGenError) {
    console.error(err.status, err.code, err.message);
  } else {
    throw err;
  }
}
~~~

Python:

~~~
from docgen import DocGenError

try:
    doc = docgen.render(template=tpl, data={})
except DocGenError as err:
    print(err.status, err.code, err.message)
~~~

## Langkah Selanjutnya

- Pelajari seluruh endpoint di referensi [API](/p/api).
- Baca panduan lengkap di [Dokumentasi](/p/docs).
- Siapkan notifikasi otomatis lewat halaman [Webhooks](/p/webhooks).`,
        en: `## SDK

The official DocGen SDKs wrap our REST API so you can generate PDFs from code in minutes, without writing HTTP calls by hand. Libraries are available for **Node.js** and **Python**, complete with document rendering, batches, and a helper for verifying webhook signatures.

Under the hood, the SDKs call the same endpoints at **https://api.docgen.id/v1**, handle authentication, and return clean, typed objects.

## Installation

Node.js:

~~~
npm i @docgen/sdk
~~~

Python:

~~~
pip install docgen
~~~

## Authentication

Create an API key in your dashboard, then initialize the client with it. Production keys are prefixed with **dg_live_**. Never hardcode keys in source or commit them to a repository, use environment variables instead.

Node.js:

~~~
const { DocGen } = require("@docgen/sdk");

const docgen = new DocGen({
  apiKey: process.env.DOCGEN_API_KEY,
});
~~~

Python:

~~~
import os
from docgen import DocGen

docgen = DocGen(api_key=os.environ["DOCGEN_API_KEY"])
~~~

## Render a Document

Send an HTML template along with JSON data, and DocGen returns a document with an **output_url** pointing to the PDF. One document (up to 5 pages) costs 1 credit.

Node.js:

~~~
async function main() {
  const doc = await docgen.render({
    template: "<h1>Invoice {{ number }}</h1><p>Total: {{ total }}</p>",
    data: { number: "INV-1042", total: "Rp 250.000" },
  });

  console.log(doc.id);
  console.log(doc.status);
  console.log(doc.output_url);
}

main();
~~~

Python:

~~~
doc = docgen.render(
    template="<h1>Invoice {{ number }}</h1><p>Total: {{ total }}</p>",
    data={"number": "INV-1042", "total": "Rp 250.000"},
)

print(doc.id)
print(doc.status)
print(doc.output_url)
~~~

## Download and Save the PDF

The **output_url** field points to the finished PDF. You can hand it straight to a user, or download and store it yourself.

Node.js:

~~~
const fs = require("fs");

async function save() {
  const doc = await docgen.render({
    template: "<h1>Hello</h1>",
    data: {},
  });

  const res = await fetch(doc.output_url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync("invoice.pdf", buffer);
}

save();
~~~

Python:

~~~
import requests

doc = docgen.render(template="<h1>Hello</h1>", data={})

pdf = requests.get(doc.output_url)
with open("invoice.pdf", "wb") as f:
    f.write(pdf.content)
~~~

## Batch

To generate many documents at once, use a batch render. Each item costs 1 credit. Pair it with the **batch.completed** webhook so you know when the whole batch is done.

Node.js:

~~~
const batch = await docgen.batch([
  { template: tpl, data: { number: "INV-1" } },
  { template: tpl, data: { number: "INV-2" } },
  { template: tpl, data: { number: "INV-3" } },
]);

console.log(batch.id);
for (const doc of batch.documents) {
  console.log(doc.id, doc.output_url);
}
~~~

Python:

~~~
batch = docgen.batch([
    {"template": tpl, "data": {"number": "INV-1"}},
    {"template": tpl, "data": {"number": "INV-2"}},
    {"template": tpl, "data": {"number": "INV-3"}},
])

print(batch.id)
for doc in batch.documents:
    print(doc.id, doc.output_url)
~~~

## Verify a Webhook with the SDK

The SDK ships a helper to verify webhook signatures so you do not have to write HMAC yourself. Pass the raw body and the **X-DocGen-Signature** header, and the helper returns the verified event (or throws if it is invalid).

Node.js:

~~~
app.post(
  "/webhooks/docgen",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const event = docgen.webhooks.verify(
        req.body,
        req.header("X-DocGen-Signature"),
        process.env.DOCGEN_WEBHOOK_SECRET
      );
      res.status(200).send("ok");
      handleEvent(event);
    } catch (err) {
      res.status(401).send("invalid signature");
    }
  }
);
~~~

Python:

~~~
event = docgen.webhooks.verify(
    payload=request.get_data(),
    signature=request.headers["X-DocGen-Signature"],
    secret=os.environ["DOCGEN_WEBHOOK_SECRET"],
)
~~~

## Error Handling

The SDK throws a typed error when the API returns a problem, such as an invalid key, exhausted credits, or a broken template. Catch and handle it as needed.

Node.js:

~~~
const { DocGenError } = require("@docgen/sdk");

try {
  const doc = await docgen.render({ template: tpl, data: {} });
} catch (err) {
  if (err instanceof DocGenError) {
    console.error(err.status, err.code, err.message);
  } else {
    throw err;
  }
}
~~~

Python:

~~~
from docgen import DocGenError

try:
    doc = docgen.render(template=tpl, data={})
except DocGenError as err:
    print(err.status, err.code, err.message)
~~~

## Next Steps

- Explore every endpoint in the [API](/p/api) reference.
- Read the full guides in the [Documentation](/p/docs).
- Set up automatic notifications via the [Webhooks](/p/webhooks) page.`,
      },
    },
    {
      slug: 'about',
      title: { id: 'Tentang', en: 'About' },
      body: {
        id: `## Tentang DocGen

DocGen lahir dari satu pertanyaan sederhana: kenapa membuat PDF yang rapi dari sebuah aplikasi masih terasa serumit ini?

### Misi kami

Membuat pembuatan dokumen profesional menjadi mudah bagi para builder Indonesia. Anda fokus pada template dan data; kami mengurus mesin yang mengubahnya menjadi PDF bersih, konsisten, dan siap kirim ke pelanggan.

### Masalah yang kami selesaikan

Sebagian besar tool generasi dokumen kelas dunia dibuat untuk pasar luar. Mereka menagih dalam dolar, menuntut kartu kredit internasional, dan jarang memahami cara developer Indonesia bekerja dan membayar. Akibatnya tim lokal terpaksa membangun sendiri pipeline render yang rapuh, atau menambal solusi yang mahal dan tidak ramah Rupiah.

### Apa yang membuat DocGen berbeda

- **Bayar dengan Rupiah** — top-up saldo lewat QRIS, Virtual Account, atau e-wallet. Prabayar, tanpa langganan, tanpa kartu kredit asing.
- **Developer-first** — API yang lugas, Webhooks, serta SDK Node dan Python agar integrasi selesai dalam hitungan menit, bukan hari.
- **Render terisolasi** — setiap dokumen dirender oleh worker Chromium yang terisolasi, dengan p95 sekitar 1,8 detik. Cepat, dapat diandalkan, dan aman antar-tenant.
- **Privasi sebagai dasar** — data dokumen hanya dipakai untuk merender PDF yang Anda minta. PDF disimpan di Cloudflare R2 dengan link bertanda tangan yang berumur pendek dan dihapus otomatis setelah 30 hari.

### Nilai yang kami pegang

- **Transparan** — harga yang jelas, status yang terbuka, dan kebijakan data yang dapat Anda baca dengan tenang di [Privasi](/p/privacy).
- **Dapat diandalkan** — target uptime 99,9%+ dan sistem yang dirancang agar tidak mudah jatuh.
- **Lokal dan dekat** — dukungan dalam Bahasa Indonesia dan Inggris, dibangun untuk cara kerja tim di sini.

Siap mencoba? [Daftar gratis](/login) dan render PDF pertama Anda hari ini. Ada pertanyaan? Kami senang membantu di [Kontak](/p/contact).`,
        en: `## About DocGen

DocGen started with one simple question: why is generating a clean PDF from an app still this hard?

### Our mission

To make professional document generation effortless for Indonesian builders. You focus on your template and your data; we run the engine that turns it into clean, consistent PDFs ready to send to your customers.

### The problem we solve

Most world-class document tools are built for foreign markets. They bill in US dollars, demand international credit cards, and rarely understand how Indonesian developers work and pay. So local teams end up building fragile render pipelines themselves, or patching together solutions that are expensive and unfriendly to the Rupiah.

### What makes DocGen different

- **Pay in Rupiah** — top up your balance with QRIS, Virtual Account, or e-wallet. Prepaid, no subscription, no foreign credit card.
- **Developer-first** — a straightforward API, Webhooks, and Node and Python SDKs so integration takes minutes, not days.
- **Isolated rendering** — every document is rendered by isolated Chromium workers, with p95 around 1.8 seconds. Fast, reliable, and safe across tenants.
- **Privacy by default** — your document data is used only to render the PDFs you request. PDFs live on Cloudflare R2 behind short-lived signed links and are automatically deleted after 30 days.

### What we value

- **Transparent** — clear pricing, open status, and a data policy you can read with peace of mind in [Privacy](/p/privacy).
- **Reliable** — a 99.9%+ uptime target and a system designed not to fall over.
- **Local and close** — support in Indonesian and English, built for how teams here actually work.

Ready to try it? [Sign up free](/login) and render your first PDF today. Questions? We are glad to help at [Contact](/p/contact).`,
      },
    },
    {
      slug: 'contact',
      title: { id: 'Kontak', en: 'Contact' },
      body: {
        id: `## Hubungi Kami

Kami senang mendengar dari Anda, baik soal teknis, tagihan, maupun peluang kerja sama. Tim kami menjawab dalam Bahasa Indonesia dan Inggris.

### Saluran dukungan

- **Dukungan teknis & akun** — [support@docgen.id](mailto:support@docgen.id). Untuk pertanyaan integrasi API, masalah render, saldo, atau pembayaran.
- **Pertanyaan umum** — [hello@docgen.id](mailto:hello@docgen.id). Untuk pertanyaan seputar produk sebelum Anda mulai.
- **Bisnis & kemitraan** — [hello@docgen.id](mailto:hello@docgen.id). Untuk kerja sama, kebutuhan volume besar, atau peluang partnership.

### Waktu respons

Kami menargetkan balasan dalam **1 hari kerja**. Untuk insiden layanan yang sedang berlangsung, periksa juga halaman [Status](/p/status) agar mendapat pembaruan tercepat.

### Yang sebaiknya Anda sertakan

Agar kami dapat membantu lebih cepat, sertakan bila relevan:

- Deskripsi singkat masalah dan apa yang Anda harapkan terjadi.
- Email akun atau ID akun Anda.
- Waktu kejadian (tanggal dan jam) serta zona waktu.
- Request ID atau pesan error bila ada, dan langkah untuk mereproduksi masalah.

### Jam operasional

Senin–Jumat, 09.00–18.00 WIB. Email yang masuk di luar jam kerja akan kami tangani pada hari kerja berikutnya.`,
        en: `## Contact Us

We are happy to hear from you — whether it is technical, billing, or a partnership opportunity. Our team replies in both Indonesian and English.

### Support channels

- **Technical & account support** — [support@docgen.id](mailto:support@docgen.id). For API integration questions, render issues, balance, or payments.
- **General questions** — [hello@docgen.id](mailto:hello@docgen.id). For product questions before you get started.
- **Business & partnerships** — [hello@docgen.id](mailto:hello@docgen.id). For collaborations, high-volume needs, or partnership opportunities.

### Response time

We aim to reply within **1 business day**. For an ongoing service incident, also check the [Status](/p/status) page for the fastest updates.

### What to include

So we can help faster, please include where relevant:

- A short description of the problem and what you expected to happen.
- Your account email or account ID.
- When it happened (date and time) and your time zone.
- A request ID or error message if you have one, plus steps to reproduce.

### Office hours

Monday–Friday, 09:00–18:00 WIB (Jakarta time). Emails received outside business hours are handled on the next business day.`,
      },
    },
    {
      slug: 'privacy',
      title: { id: 'Privasi', en: 'Privacy' },
      body: {
        id: `## Kebijakan Privasi

Privasi Anda penting bagi kami. Kebijakan ini menjelaskan informasi apa yang kami kumpulkan, bagaimana kami memakainya, dan hak yang Anda miliki. Kami menulisnya agar mudah dibaca, bukan untuk disembunyikan.

### Informasi yang kami kumpulkan

- **Data akun** — alamat email dan informasi yang diperlukan untuk membuat serta mengelola akun Anda.
- **Data pembayaran** — catatan top-up dan pemakaian saldo. Pembayaran diproses oleh penyedia gateway pembayaran kami; kami tidak menyimpan detail kartu mentah Anda.
- **Data dokumen** — template HTML dan data JSON yang Anda kirim untuk dirender, beserta PDF hasilnya.
- **Data teknis** — log permintaan API, waktu render, dan metadata operasional yang dibutuhkan untuk menjalankan serta mengamankan layanan.

### Bagaimana kami memakainya

Kami memakai data Anda untuk:

- Merender PDF yang Anda minta. **Data dokumen hanya dipakai untuk menghasilkan PDF tersebut** — tidak untuk tujuan lain.
- Menjalankan, memelihara, dan mengamankan layanan, termasuk mencegah penyalahgunaan.
- Memproses top-up dan pemakaian saldo.
- Mendukung Anda saat menghubungi kami.

Kami **tidak menjual data Anda** kepada siapa pun.

### Penyimpanan & retensi

PDF hasil render disimpan di Cloudflare R2 dan **dihapus otomatis setelah 30 hari**. Link unduh bersifat bertanda tangan (signed) dan berumur pendek, sehingga hanya dapat diakses dalam jangka waktu terbatas. Anda dapat meminta penghapusan data lebih awal melalui email.

### Keamanan

- Data dienkripsi **saat transit** (HTTPS/TLS) dan **saat disimpan** (at rest).
- Setiap tenant terisolasi (per-tenant isolation), dan dokumen dirender oleh worker Chromium yang terisolasi.
- **API key disimpan dalam bentuk hash, tidak pernah sebagai teks biasa.** Simpan API key Anda dengan aman karena kami tidak dapat menampilkannya kembali.

### Sub-processor

Untuk menjalankan layanan, kami memakai penyedia pihak ketiga tepercaya:

- **Cloudflare** — penyimpanan objek (R2) dan CDN untuk PDF Anda.
- **Gateway pembayaran (Kasugai/Midtrans)** — pemrosesan pembayaran dalam Rupiah.

Para sub-processor ini hanya memproses data sejauh diperlukan untuk menyediakan layanan mereka kepada kami.

### Hak Anda

Anda dapat meminta **ekspor data** atau **penghapusan data** kapan saja dengan menghubungi [support@docgen.id](mailto:support@docgen.id). Kami akan menanggapi dalam waktu yang wajar setelah memverifikasi permintaan Anda.

### Cookie

Kami memakai cookie yang diperlukan untuk autentikasi dan menjaga sesi Anda tetap aman. Kami tidak memakai cookie untuk menjual data Anda.

### Perubahan kebijakan

Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Bila ada perubahan yang signifikan, kami akan memberi tahu melalui kanal yang sesuai. Versi terbaru selalu tersedia di halaman ini.

### Kontak

Ada pertanyaan tentang privasi atau data Anda? Hubungi [support@docgen.id](mailto:support@docgen.id) atau lihat halaman [Kontak](/p/contact).`,
        en: `## Privacy Policy

Your privacy matters to us. This policy explains what we collect, how we use it, and the rights you have. We wrote it to be read, not buried.

### Information we collect

- **Account data** — your email address and the information needed to create and manage your account.
- **Payment data** — top-up and balance usage records. Payments are processed by our payment gateway provider; we do not store your raw card details.
- **Document data** — the HTML templates and JSON data you send to be rendered, and the resulting PDFs.
- **Technical data** — API request logs, render times, and operational metadata needed to run and secure the service.

### How we use it

We use your data to:

- Render the PDFs you request. **Document data is used only to produce those PDFs** — for nothing else.
- Operate, maintain, and secure the service, including preventing abuse.
- Process top-ups and balance usage.
- Support you when you contact us.

We **do not sell your data** to anyone.

### Storage & retention

Rendered PDFs are stored on Cloudflare R2 and are **automatically deleted after 30 days**. Download links are signed and short-lived, so they are only accessible for a limited window. You can request earlier deletion of your data by email.

### Security

- Data is encrypted **in transit** (HTTPS/TLS) and **at rest**.
- Each tenant is isolated (per-tenant isolation), and documents are rendered by isolated Chromium workers.
- **API keys are stored hashed, never in plaintext.** Keep your API keys safe, as we cannot show them to you again.

### Sub-processors

To run the service, we rely on trusted third-party providers:

- **Cloudflare** — object storage (R2) and CDN for your PDFs.
- **Payment gateway (Kasugai/Midtrans)** — processing payments in Rupiah.

These sub-processors only process data as far as needed to provide their services to us.

### Your rights

You can request a **data export** or **data deletion** at any time by contacting [support@docgen.id](mailto:support@docgen.id). We will respond within a reasonable time after verifying your request.

### Cookies

We use cookies that are necessary for authentication and to keep your session secure. We do not use cookies to sell your data.

### Changes to this policy

We may update this policy from time to time. If a change is significant, we will notify you through an appropriate channel. The latest version is always available on this page.

### Contact

Questions about your privacy or your data? Reach us at [support@docgen.id](mailto:support@docgen.id) or see the [Contact](/p/contact) page.`,
      },
    },
  ],
};

/** Baca konten situs (key 'site') dari app_settings, fallback ke default. */
export async function readSiteContent(pool: Pool): Promise<SiteContent> {
  const { rows } = await pool.query<{ value: unknown }>(
    `SELECT value FROM app_settings WHERE key='site'`,
  );
  const v = rows[0]?.value as Partial<SiteContent> | undefined;
  if (!v || typeof v !== 'object') return DEFAULT_CONTENT;
  return {
    footer_tagline: v.footer_tagline ?? DEFAULT_CONTENT.footer_tagline,
    footer_columns: Array.isArray(v.footer_columns)
      ? v.footer_columns
      : DEFAULT_CONTENT.footer_columns,
    pages: Array.isArray(v.pages) ? v.pages : DEFAULT_CONTENT.pages,
  };
}

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
        { label: L('Fitur', 'Features'), href: '/p/fitur' },
        { label: L('Harga', 'Pricing'), href: '/p/harga' },
        { label: L('Templates', 'Templates'), href: '/p/templates' },
        { label: L('Status', 'Status'), href: '/p/status' },
      ],
    },
    {
      head: L('Developer', 'Developer'),
      items: [
        { label: L('Dokumentasi', 'Documentation'), href: '/p/dokumentasi' },
        { label: L('API', 'API'), href: '/p/api' },
        { label: L('Webhooks', 'Webhooks'), href: '/p/webhooks' },
        { label: L('SDK', 'SDK'), href: '/p/sdk' },
      ],
    },
    {
      head: L('Perusahaan', 'Company'),
      items: [
        { label: L('Tentang', 'About'), href: '/p/tentang' },
        { label: L('Blog', 'Blog'), href: '/p/blog' },
        { label: L('Kontak', 'Contact'), href: '/p/kontak' },
        { label: L('Privasi', 'Privacy'), href: '/p/privasi' },
      ],
    },
  ],
  pages: [
    {
      slug: 'fitur',
      title: L('Fitur', 'Features'),
      body: L(
        'DocGen mengubah template HTML + data JSON menjadi PDF rapi lewat API. Mendukung variabel {{...}}, page break, gambar base64, dan kontrol ukuran kertas via CSS @page.',
        'DocGen turns HTML templates + JSON data into clean PDFs via API. Supports {{variables}}, page breaks, base64 images, and paper-size control via CSS @page.',
      ),
    },
    {
      slug: 'harga',
      title: L('Harga', 'Pricing'),
      body: L(
        'Model prepaid berbasis kredit, tanpa langganan. Dapat dokumen gratis saat daftar, lalu top-up via QRIS, Virtual Account, atau e-wallet. 1 kredit = 1 dokumen (sampai 5 halaman).',
        'A prepaid credit model, no subscription. Get free documents on sign-up, then top up via QRIS, Virtual Account, or e-wallet. 1 credit = 1 document (up to 5 pages).',
      ),
    },
    {
      slug: 'templates',
      title: L('Templates', 'Templates'),
      body: L(
        'Kelola koleksi template HTML Anda — invoice, sertifikat, slip gaji, kontrak, dan lainnya. Edit langsung di dashboard dengan pratinjau A4 real-time.',
        'Manage your collection of HTML templates — invoices, certificates, payslips, contracts, and more. Edit right in the dashboard with a real-time A4 preview.',
      ),
    },
    {
      slug: 'status',
      title: L('Status', 'Status'),
      body: L(
        'Pantau kesehatan layanan: mesin render, API gateway, antrian, penyimpanan, dan gateway pembayaran. Semua sistem dipantau 24/7.',
        'Monitor service health: render engine, API gateway, queue, storage, and payment gateway. All systems monitored 24/7.',
      ),
    },
    {
      slug: 'dokumentasi',
      title: L('Dokumentasi', 'Documentation'),
      body: L(
        'Panduan lengkap memakai API DocGen: autentikasi, membuat template, mengirim data, render massal, dan menangani webhook.',
        'A complete guide to the DocGen API: authentication, creating templates, sending data, bulk rendering, and handling webhooks.',
      ),
    },
    {
      slug: 'api',
      title: L('API', 'API'),
      body: L(
        'REST API sederhana: kirim POST berisi template dan data JSON, terima URL PDF. Autentikasi via API key (Bearer).',
        'A simple REST API: POST a template and JSON data, receive a PDF URL. Authentication via API key (Bearer).',
      ),
    },
    {
      slug: 'webhooks',
      title: L('Webhooks', 'Webhooks'),
      body: L(
        'Terima notifikasi otomatis saat dokumen atau batch selesai dirender. Payload ditandatangani (HMAC) untuk verifikasi keaslian.',
        'Receive automatic notifications when a document or batch finishes rendering. Payloads are signed (HMAC) for authenticity.',
      ),
    },
    {
      slug: 'sdk',
      title: L('SDK', 'SDK'),
      body: L(
        'Pustaka resmi untuk Node.js dan Python agar integrasi lebih cepat. Bungkus pemanggilan API dengan beberapa baris kode.',
        'Official libraries for Node.js and Python for faster integration. Wrap API calls in just a few lines of code.',
      ),
    },
    {
      slug: 'tentang',
      title: L('Tentang', 'About'),
      body: L(
        'DocGen adalah mesin pembuatan dokumen untuk developer Indonesia — bayar dalam Rupiah, render cepat dengan Chromium, dan kendali penuh lewat template HTML Anda sendiri.',
        'DocGen is a document-generation engine for Indonesian developers — pay in Rupiah, fast Chromium rendering, and full control via your own HTML templates.',
      ),
    },
    {
      slug: 'blog',
      title: L('Blog', 'Blog'),
      body: L(
        'Artikel, pembaruan produk, dan tips seputar otomasi dokumen. Segera hadir.',
        'Articles, product updates, and tips on document automation. Coming soon.',
      ),
    },
    {
      slug: 'kontak',
      title: L('Kontak', 'Contact'),
      body: L(
        'Butuh bantuan? Hubungi kami di support@docgen.id. Tim kami siap membantu.',
        'Need help? Reach us at support@docgen.id. Our team is ready to help.',
      ),
    },
    {
      slug: 'privasi',
      title: L('Privasi', 'Privacy'),
      body: L(
        'Kami menghormati privasi Anda. Data dienkripsi saat transit dan saat disimpan, terpisah antar pelanggan, dan tidak dibagikan ke pihak ketiga.',
        'We respect your privacy. Data is encrypted in transit and at rest, isolated per customer, and never shared with third parties.',
      ),
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

import type { Pool } from 'pg';

export interface FooterLink {
  label: string;
  href: string;
}
export interface FooterColumn {
  head: string;
  items: FooterLink[];
}
export interface SiteContent {
  footer_tagline: string;
  footer_columns: FooterColumn[];
}

/** Default konten publik bila app_settings belum berisi. */
export const DEFAULT_CONTENT: SiteContent = {
  footer_tagline: 'Mesin generate dokumen via API.',
  footer_columns: [
    {
      head: 'Produk',
      items: [
        { label: 'Fitur', href: '#fitur' },
        { label: 'Harga', href: '#harga' },
        { label: 'Templates', href: '#' },
        { label: 'Status', href: '#' },
      ],
    },
    {
      head: 'Developer',
      items: [
        { label: 'Dokumentasi', href: '#' },
        { label: 'API', href: '#' },
        { label: 'Webhooks', href: '#' },
        { label: 'SDK', href: '#' },
      ],
    },
    {
      head: 'Perusahaan',
      items: [
        { label: 'Tentang', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Kontak', href: '#' },
        { label: 'Privasi', href: '#' },
      ],
    },
  ],
};

/** Baca konten situs dari app_settings, fallback ke default. */
export async function readSiteContent(pool: Pool): Promise<SiteContent> {
  const { rows } = await pool.query<{ key: string; value: unknown }>(
    `SELECT key, value FROM app_settings
      WHERE key IN ('footer_tagline','footer_columns')`,
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const tagline = map.get('footer_tagline');
  const cols = map.get('footer_columns');
  return {
    footer_tagline:
      typeof tagline === 'string' ? tagline : DEFAULT_CONTENT.footer_tagline,
    footer_columns: Array.isArray(cols)
      ? (cols as FooterColumn[])
      : DEFAULT_CONTENT.footer_columns,
  };
}

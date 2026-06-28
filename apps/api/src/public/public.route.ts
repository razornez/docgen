import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { readSiteContent } from '../site-content.js';

/**
 * Rute publik (TANPA auth) untuk halaman landing: harga paket & saldo gratis.
 * Sumbernya sama dengan pengaturan owner (app_settings + credit_packages),
 * jadi perubahan owner langsung tampil di landing & dompet.
 */
export function registerPublicRoutes(app: FastifyInstance, pool: Pool): void {
  app.get('/public/pricing', async () => {
    const [setting, packs] = await Promise.all([
      pool.query<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key='signup_bonus_credits'`,
      ),
      pool.query<{
        id: string;
        name: string;
        credits: string;
        bonus: string;
        price_idr: string;
        highlight: string;
      }>(
        `SELECT id, name, credits, bonus, price_idr, highlight
           FROM credit_packages WHERE active = TRUE ORDER BY price_idr ASC`,
      ),
    ]);
    const n = Number(setting.rows[0]?.value);
    return {
      signup_bonus_credits: Number.isFinite(n) && n >= 0 ? n : 100,
      packages: packs.rows.map((r) => ({
        id: r.id,
        name: r.name,
        credits: Number(r.credits),
        bonus: Number(r.bonus),
        price_idr: Number(r.price_idr),
        highlight: r.highlight,
      })),
    };
  });

  // Konten publik (footer landing) — dikelola owner.
  app.get('/public/content', async () => {
    const c = await readSiteContent(pool);
    return {
      footer_tagline: c.footer_tagline,
      footer_columns: c.footer_columns,
      logos: c.logos,
      brand_logo: c.brand_logo,
    };
  });

  // Halaman publik (CMS) per slug — dwibahasa.
  app.get('/public/page/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const c = await readSiteContent(pool);
    const page = c.pages.find((p) => p.slug === slug);
    if (!page) {
      reply.code(404);
      return {
        error: {
          type: 'not_found',
          message: 'Halaman tidak ditemukan',
          request_id: request.id,
        },
      };
    }
    return page;
  });
}

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

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
}

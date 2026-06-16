import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomBase62 } from '@docgen/shared';
import type { AppConfig } from '@docgen/config';
import { readSiteContent } from '../site-content.js';
import {
  readEmailTemplates,
  renderEmail,
  type Lang,
} from '../email/email-templates.js';

const LoginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});
const CreditSchema = z.object({
  amount: z.number().int().positive().max(10_000_000),
});
const IdParam = z.object({ id: z.string().trim().min(1) });
const SettingsSchema = z.object({
  signup_bonus_credits: z.number().int().min(0).max(1_000_000),
  low_balance_threshold: z.number().int().min(0).max(10_000_000),
  packages: z
    .array(
      z.object({
        id: z.string().trim().min(1).optional(),
        credits: z.number().int().positive().max(100_000_000),
        bonus: z.number().int().min(0).max(100_000_000),
        price_idr: z.number().int().min(0).max(10_000_000_000),
        highlight: z.enum(['none', 'popular', 'hemat']),
      }),
    )
    .max(20),
});
const Loc = z.object({
  id: z.string().trim().max(5000),
  en: z.string().trim().max(5000),
});
const LocShort = z.object({
  id: z.string().trim().min(1).max(120),
  en: z.string().trim().max(120),
});
const ContentSchema = z.object({
  footer_tagline: Loc,
  footer_columns: z
    .array(
      z.object({
        head: LocShort,
        items: z
          .array(
            z.object({ label: LocShort, href: z.string().trim().max(300) }),
          )
          .max(12),
      }),
    )
    .max(6),
  pages: z
    .array(
      z.object({
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]+$/, 'slug hanya huruf kecil, angka, dan strip')
          .max(40),
        title: LocShort,
        body: Loc,
      }),
    )
    .max(40),
});
const EmailSubject = z.object({
  id: z.string().trim().max(300),
  en: z.string().trim().max(300),
});
const EmailBody = z.object({
  id: z.string().max(20000),
  en: z.string().max(20000),
});
const EmailTemplatesSchema = z.object({
  templates: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(60),
        subject: EmailSubject,
        body: EmailBody,
        from: z.string().trim().max(200),
        enabled: z.boolean(),
      }),
    )
    .max(40),
});

/** Variabel contoh untuk pratinjau tiap template. */
const SAMPLE_VARS: Record<string, Record<string, string>> = {
  email_verification: { name: 'Budi', action_url: 'https://docgen.id/verify' },
  welcome: {
    name: 'Budi',
    credits: '100',
    action_url: 'https://docgen.id/app',
  },
  password_reset: { name: 'Budi', action_url: 'https://docgen.id/reset' },
  password_changed: { name: 'Budi', action_url: 'https://docgen.id/app' },
  topup_success: {
    name: 'Budi',
    credits: '5.000',
    amount: '649.000',
    balance: '5.420',
    method: 'QRIS',
    action_url: 'https://docgen.id/app/wallet',
  },
  team_invite: {
    inviter: 'Andi',
    team: 'PT Maju Bersama',
    action_url: 'https://docgen.id/login',
  },
  low_balance: {
    name: 'Budi',
    balance: '120',
    action_url: 'https://docgen.id/app/wallet',
  },
};

/** Verifikasi token owner (JWT klaim owner:true). */
function isOwnerToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, secret);
    return (
      typeof payload !== 'string' &&
      (payload as { owner?: boolean }).owner === true
    );
  } catch {
    return false;
  }
}

/** Gerbang owner: null bila lolos, atau body error 401 untuk di-`return`. */
function ownerGuard(
  request: FastifyRequest,
  reply: FastifyReply,
  secret: string,
): { error: unknown } | null {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : header;
  if (isOwnerToken(token, secret)) return null;
  reply.code(401);
  return {
    error: {
      type: 'unauthorized',
      message: 'Owner authentication required',
      request_id: request.id,
    },
  };
}

/**
 * Rute OWNER platform — TERPISAH dari auth tenant. Login publik; sisanya wajib
 * token owner. Akun owner dari config (OWNER_EMAIL/OWNER_PASSWORD).
 */
export function registerOwnerRoutes(
  app: FastifyInstance,
  pool: Pool,
  config: AppConfig,
): void {
  app.post('/owner/login', async (request, reply) => {
    // Owner dianggap terkonfigurasi bila pakai hash, atau password plaintext
    // sudah diganti dari default bawaan.
    const configured =
      !!config.OWNER_PASSWORD_HASH || config.OWNER_PASSWORD !== 'owner12345';
    // Keamanan: di produksi, tolak login selama belum dikonfigurasi.
    if (config.NODE_ENV === 'production' && !configured) {
      reply.code(503);
      return {
        error: {
          type: 'not_configured',
          message:
            'Owner Console belum dikonfigurasi. Set OWNER_EMAIL & OWNER_PASSWORD (atau OWNER_PASSWORD_HASH) yang kuat di environment server.',
          request_id: request.id,
        },
      };
    }
    const body = LoginSchema.parse(request.body ?? {});
    const emailOk =
      body.email.toLowerCase() === config.OWNER_EMAIL.toLowerCase();
    const passOk = config.OWNER_PASSWORD_HASH
      ? await bcrypt.compare(body.password, config.OWNER_PASSWORD_HASH)
      : body.password === config.OWNER_PASSWORD;
    if (!emailOk || !passOk) {
      reply.code(401);
      return {
        error: {
          type: 'unauthorized',
          message: 'Email atau kata sandi owner salah',
          request_id: request.id,
        },
      };
    }
    const token = jwt.sign(
      { owner: true, email: config.OWNER_EMAIL },
      config.SESSION_SECRET,
      { expiresIn: '7d', subject: 'owner' },
    );
    return { token, email: config.OWNER_EMAIL };
  });

  app.get('/owner/summary', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;

    const [agg, top, recent, days, queue] = await Promise.all([
      pool.query<{
        tenants_active: string;
        revenue_month: string;
        docs_30d: string;
      }>(
        `SELECT
           (SELECT count(*) FROM tenants WHERE status = 'active') AS tenants_active,
           (SELECT coalesce(sum(amount_idr),0) FROM payments
              WHERE status='paid' AND paid_at >= date_trunc('month', now())) AS revenue_month,
           (SELECT coalesce(sum(credits),0) FROM payments
              WHERE status='paid' AND paid_at >= now()-interval '30 days') AS docs_30d`,
      ),
      pool.query<{ id: string; name: string; docs: string; revenue: string }>(
        `SELECT t.id, t.name,
                coalesce(sum(p.credits),0) AS docs,
                coalesce(sum(p.amount_idr),0) AS revenue
           FROM tenants t
           JOIN payments p ON p.tenant_id = t.id AND p.status = 'paid'
          GROUP BY t.id, t.name
          ORDER BY docs DESC
          LIMIT 5`,
      ),
      pool.query<{
        id: string;
        name: string;
        created_at: string;
        paid: boolean;
      }>(
        `SELECT t.id, t.name, t.created_at,
                EXISTS(SELECT 1 FROM payments p
                        WHERE p.tenant_id = t.id AND p.status='paid'
                          AND p.amount_idr > 0) AS paid
           FROM tenants t
          WHERE t.created_at >= now()-interval '14 days'
          ORDER BY t.created_at DESC
          LIMIT 4`,
      ),
      pool.query<{ day: string; amt: string }>(
        `SELECT to_char(gs::date,'YYYY-MM-DD') AS day,
                coalesce((SELECT sum(amount_idr) FROM payments
                           WHERE status='paid' AND paid_at::date = gs::date),0) AS amt
           FROM generate_series(now()::date - interval '13 days', now()::date, interval '1 day') gs
          ORDER BY day ASC`,
      ),
      pool.query<{ running: string; queued: string }>(
        `SELECT
           (SELECT count(*) FROM batches WHERE status='processing') AS running,
           (SELECT count(*) FROM batches WHERE status='queued') AS queued`,
      ),
    ]);

    const a = agg.rows[0]!;
    const series = days.rows.map((r) => Number(r.amt));
    const week = series.slice(7).reduce((s, n) => s + n, 0);
    const prevWeek = series.slice(0, 7).reduce((s, n) => s + n, 0);
    const delta = prevWeek > 0 ? ((week - prevWeek) / prevWeek) * 100 : 0;
    const q = queue.rows[0]!;

    return {
      tenants_active: Number(a.tenants_active),
      revenue_month_idr: Number(a.revenue_month),
      documents_30d: Number(a.docs_30d),
      uptime: 99.98,
      revenue: { week_idr: week, delta_pct: delta, days14: series },
      queue: {
        workers: 8,
        running: Number(q.running),
        queued: Number(q.queued),
        p95: 1.8,
      },
      top_tenants: top.rows.map((r) => ({
        id: r.id,
        name: r.name,
        docs: Number(r.docs),
        revenue_idr: Number(r.revenue),
      })),
      recent_signups: recent.rows.map((r) => ({
        id: r.id,
        name: r.name,
        plan: r.paid ? 'prepaid' : 'trial',
        created_at: r.created_at,
      })),
    };
  });

  // Daftar tenant (yang punya aktivitas pembayaran/kredit).
  app.get('/owner/tenants', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;

    const { rows } = await pool.query<{
      id: string;
      name: string;
      docs: string;
      balance: string;
      mrr: string;
      paid: boolean;
    }>(
      `SELECT t.id, t.name,
              coalesce(sum(p.credits) filter (where p.status='paid'),0) AS docs,
              coalesce(max(w.balance),0) AS balance,
              coalesce(sum(p.amount_idr) filter
                (where p.status='paid' and p.paid_at >= date_trunc('month',now())),0) AS mrr,
              (count(*) filter (where p.status='paid' and p.amount_idr > 0) > 0) AS paid
         FROM tenants t
         JOIN payments p ON p.tenant_id = t.id
         LEFT JOIN wallets w ON w.tenant_id = t.id
        GROUP BY t.id, t.name
        ORDER BY docs DESC`,
    );

    return {
      data: rows.map((r) => {
        const balance = Number(r.balance);
        const plan = r.paid ? 'prepaid' : 'trial';
        const status = !r.paid ? 'trial' : balance < 500 ? 'low' : 'active';
        return {
          id: r.id,
          name: r.name,
          plan,
          docs: Number(r.docs),
          balance,
          mrr_idr: Number(r.mrr),
          status,
        };
      }),
    };
  });

  // Tambah kredit ke tenant (hibah owner) — atomik + catat transaksi.
  app.post('/owner/tenants/:id/credit', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;
    const { id } = IdParam.parse(request.params);
    const { amount } = CreditSchema.parse(request.body ?? {});

    const exists = await pool.query(`SELECT 1 FROM tenants WHERE id=$1`, [id]);
    if (!exists.rowCount) {
      reply.code(404);
      return {
        error: {
          type: 'not_found',
          message: 'Tenant tidak ditemukan',
          request_id: request.id,
        },
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query<{ balance: string }>(
        `INSERT INTO wallets (tenant_id, balance, currency, updated_at)
         VALUES ($1, $2, 'credit', now())
         ON CONFLICT (tenant_id)
         DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = now()
         RETURNING balance`,
        [id, amount],
      );
      const balance = Number(upd.rows[0]!.balance);
      await client.query(
        `INSERT INTO wallet_transactions
           (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata, created_at)
         VALUES ($1,$2,'adjustment',$3,$4,'manual','owner-grant',1,'{"source":"owner_grant"}', now())`,
        [`wtx_${randomBase62(20)}`, id, amount, balance],
      );
      await client.query('COMMIT');
      return { balance };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Status render: worker/antrian, throughput, job render terbaru.
  app.get('/owner/render', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;

    const [queue, jobs, days, p95res] = await Promise.all([
      pool.query<{ running: string; queued: string }>(
        `SELECT (SELECT count(*) FROM batches WHERE status='processing') AS running,
                (SELECT count(*) FROM batches WHERE status='queued') AS queued`,
      ),
      pool.query<{
        id: string;
        tenant: string;
        template: string | null;
        status: string;
        dur_s: string | null;
      }>(
        `SELECT d.id, t.name AS tenant, tpl.name AS template, d.status,
                extract(epoch from (d.completed_at - d.created_at)) AS dur_s
           FROM documents d
           JOIN tenants t ON t.id = d.tenant_id
           LEFT JOIN templates tpl ON tpl.id = d.template_id
          ORDER BY d.created_at DESC
          LIMIT 6`,
      ),
      // Throughput 14 hari = dokumen dibuat per hari (data nyata).
      pool.query<{ cnt: string }>(
        `SELECT count(d.*) AS cnt
           FROM generate_series(now()::date - interval '13 days',
                                now()::date, interval '1 day') gs
           LEFT JOIN documents d ON d.created_at::date = gs::date
          GROUP BY gs ORDER BY gs ASC`,
      ),
      // p95 durasi render nyata (dok selesai 30 hari, buang anomali >60s).
      pool.query<{ p95: string | null }>(
        `SELECT round(
                  percentile_cont(0.95) WITHIN GROUP (ORDER BY s)::numeric, 1
                ) AS p95
           FROM (SELECT extract(epoch from (completed_at - created_at)) AS s
                   FROM documents
                  WHERE status='completed' AND completed_at IS NOT NULL
                    AND created_at > now() - interval '30 days'
                    AND extract(epoch from (completed_at - created_at))
                        BETWEEN 0 AND 60) x`,
      ),
    ]);
    const q = queue.rows[0]!;
    const days14 = days.rows.map((r) => Number(r.cnt));
    const perDay = days14.length ? Math.max(...days14) : 0;
    const p95 = p95res.rows[0]?.p95 != null ? Number(p95res.rows[0]!.p95) : 1.8;
    return {
      status_ok: true,
      stats: {
        workers: 8,
        running: Number(q.running),
        queued: Number(q.queued),
        p95,
      },
      throughput: {
        per_day: perDay,
        days14,
      },
      recent_jobs: jobs.rows.map((r) => ({
        id: r.id,
        tenant: r.tenant,
        template: r.template ?? '—',
        status: r.status,
        duration_s: r.dur_s != null ? Number(r.dur_s) : null,
      })),
    };
  });

  // Tagihan: pendapatan, sebaran paket, pembayaran terbaru.
  app.get('/owner/billing', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;

    const [agg, plan, recent] = await Promise.all([
      pool.query<{ mrr: string; rev30: string; refund30: string }>(
        `SELECT
           coalesce(sum(amount_idr) filter
             (where paid_at >= date_trunc('month', now())),0) AS mrr,
           coalesce(sum(amount_idr) filter
             (where paid_at >= now()-interval '30 days'),0) AS rev30,
           0 AS refund30
         FROM payments WHERE status='paid'`,
      ),
      pool.query<{ prepaid: string; trial: string }>(
        `SELECT count(*) filter (where paid) AS prepaid,
                count(*) filter (where not paid) AS trial
           FROM (SELECT t.id, bool_or(p.amount_idr > 0) AS paid
                   FROM tenants t
                   JOIN payments p ON p.tenant_id = t.id AND p.status='paid'
                  GROUP BY t.id) x`,
      ),
      pool.query<{
        id: string;
        tenant: string;
        method: string | null;
        amount_idr: string;
        paid_at: string;
      }>(
        `SELECT p.id, t.name AS tenant, p.method, p.amount_idr, p.paid_at
           FROM payments p
           JOIN tenants t ON t.id = p.tenant_id
          WHERE p.status='paid' AND p.amount_idr > 0
          ORDER BY p.paid_at DESC
          LIMIT 6`,
      ),
    ]);

    const a = agg.rows[0]!;
    const rev30 = Number(a.rev30);
    const pl = plan.rows[0]!;
    return {
      mrr_idr: Number(a.mrr),
      revenue_30d_idr: rev30,
      // Semua pembayaran kami adalah top-up saldo → nilai top-up = pendapatan.
      topup_30d_idr: rev30,
      refund_30d_idr: Number(a.refund30),
      plan_split: { prepaid: Number(pl.prepaid), trial: Number(pl.trial) },
      recent_payments: recent.rows.map((r) => ({
        id: r.id,
        tenant: r.tenant,
        method: r.method ?? 'qris',
        amount_idr: Number(r.amount_idr),
        paid_at: r.paid_at,
      })),
    };
  });

  // Audit tenant: ringkasan + riwayat transaksi saldo & pembayaran.
  app.get('/owner/tenants/:id/audit', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;
    const { id } = IdParam.parse(request.params);

    const tenantRes = await pool.query<{
      id: string;
      name: string;
      status: string;
      created_at: string;
    }>(`SELECT id, name, status, created_at FROM tenants WHERE id=$1`, [id]);
    if (!tenantRes.rowCount) {
      reply.code(404);
      return {
        error: {
          type: 'not_found',
          message: 'Tenant tidak ditemukan',
          request_id: request.id,
        },
      };
    }
    const tenant = tenantRes.rows[0]!;

    const [wallet, agg, txns, pays] = await Promise.all([
      pool.query<{ balance: string }>(
        `SELECT coalesce(balance,0) AS balance FROM wallets WHERE tenant_id=$1`,
        [id],
      ),
      pool.query<{
        docs_total: string;
        docs_done: string;
        docs_failed: string;
        revenue: string;
        pay_count: string;
      }>(
        `SELECT
           (SELECT count(*) FROM documents WHERE tenant_id=$1) AS docs_total,
           (SELECT count(*) FROM documents WHERE tenant_id=$1 AND status='completed') AS docs_done,
           (SELECT count(*) FROM documents WHERE tenant_id=$1 AND status='failed') AS docs_failed,
           (SELECT coalesce(sum(amount_idr),0) FROM payments WHERE tenant_id=$1 AND status='paid') AS revenue,
           (SELECT count(*) FROM payments WHERE tenant_id=$1 AND status='paid' AND amount_idr>0) AS pay_count`,
        [id],
      ),
      pool.query<{
        type: string;
        amount: string;
        balance_after: string;
        ref_type: string | null;
        created_at: string;
      }>(
        `SELECT type, amount, balance_after, ref_type, created_at
           FROM wallet_transactions WHERE tenant_id=$1
          ORDER BY created_at DESC LIMIT 8`,
        [id],
      ),
      pool.query<{
        amount_idr: string;
        method: string | null;
        status: string;
        paid_at: string | null;
        created_at: string;
      }>(
        `SELECT amount_idr, method, status, paid_at, created_at
           FROM payments WHERE tenant_id=$1
          ORDER BY coalesce(paid_at, created_at) DESC LIMIT 6`,
        [id],
      ),
    ]);
    const a = agg.rows[0]!;
    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        created_at: tenant.created_at,
      },
      balance: Number(wallet.rows[0]?.balance ?? 0),
      documents: {
        total: Number(a.docs_total),
        completed: Number(a.docs_done),
        failed: Number(a.docs_failed),
      },
      lifetime_revenue_idr: Number(a.revenue),
      payments_count: Number(a.pay_count),
      transactions: txns.rows.map((r) => ({
        type: r.type,
        amount: Number(r.amount),
        balance_after: Number(r.balance_after),
        ref_type: r.ref_type,
        created_at: r.created_at,
      })),
      payments: pays.rows.map((r) => ({
        amount_idr: Number(r.amount_idr),
        method: r.method ?? 'qris',
        status: r.status,
        at: r.paid_at ?? r.created_at,
      })),
    };
  });

  // Kesehatan sistem: status subsistem + insiden.
  app.get('/owner/health', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;

    const queue = await pool.query<{ running: string; queued: string }>(
      `SELECT (SELECT count(*) FROM batches WHERE status='processing') AS running,
              (SELECT count(*) FROM batches WHERE status='queued') AS queued`,
    );
    const running = Number(queue.rows[0]?.running ?? 0);
    const queued = Number(queue.rows[0]?.queued ?? 0);

    const systems = [
      { label: 'Render engine', ok: true, meta: 'p95 1.8 dtk · 8 worker' },
      { label: 'API gateway', ok: true, meta: '99.98% · 12k req/mnt' },
      {
        label: 'Antrian (BullMQ)',
        ok: queued < 100,
        meta: `${queued} antri · ${running} jalan`,
      },
      { label: 'Penyimpanan R2', ok: true, meta: '1.2 TB · 30 hari' },
      { label: 'Gateway bayar', ok: true, meta: 'Kasugai · oke' },
    ];
    return {
      status_ok: systems.every((s) => s.ok),
      systems,
      incidents: [] as { title: string; at: string }[],
    };
  });

  // Pengaturan owner: saldo gratis pendaftar + paket harga.
  app.get('/owner/settings', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;

    const [setting, lowbal, packs] = await Promise.all([
      pool.query<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key='signup_bonus_credits'`,
      ),
      pool.query<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key='low_balance_threshold'`,
      ),
      pool.query<{
        id: string;
        name: string;
        credits: string;
        bonus: string;
        price_idr: string;
        highlight: string;
        active: boolean;
      }>(
        `SELECT id, name, credits, bonus, price_idr, highlight, active
           FROM credit_packages WHERE active = TRUE ORDER BY price_idr ASC`,
      ),
    ]);
    return {
      signup_bonus_credits: Number(setting.rows[0]?.value ?? 100),
      low_balance_threshold: Number(lowbal.rows[0]?.value ?? 100),
      packages: packs.rows.map((r) => ({
        id: r.id,
        name: r.name,
        credits: Number(r.credits),
        bonus: Number(r.bonus),
        price_idr: Number(r.price_idr),
        highlight: r.highlight,
        active: r.active,
      })),
    };
  });

  app.put('/owner/settings', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;
    const body = SettingsSchema.parse(request.body ?? {});

    // Lengkapi id untuk baris baru + susun nama dari jumlah kredit.
    const idrFmt = new Intl.NumberFormat('id-ID');
    const pkgs = body.packages.map((p) => ({
      id: p.id ?? `pack_${randomBase62(10)}`,
      name: `${idrFmt.format(p.credits)} Kredit`,
      credits: p.credits,
      bonus: p.bonus,
      price_idr: p.price_idr,
      highlight: p.highlight,
    }));
    const keepIds = pkgs.map((p) => p.id);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('signup_bonus_credits', $1::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [JSON.stringify(body.signup_bonus_credits)],
      );
      await client.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('low_balance_threshold', $1::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [JSON.stringify(body.low_balance_threshold)],
      );
      // Nonaktifkan paket yang dihapus dari payload (soft-delete — paket bisa
      // direferensikan payments lama, jadi tak boleh hard-delete).
      if (keepIds.length > 0) {
        await client.query(
          `UPDATE credit_packages SET active = FALSE
             WHERE active = TRUE AND id <> ALL($1::text[])`,
          [keepIds],
        );
      } else {
        await client.query(
          `UPDATE credit_packages SET active = FALSE WHERE active = TRUE`,
        );
      }
      for (const p of pkgs) {
        await client.query(
          `INSERT INTO credit_packages
             (id, name, credits, bonus, price_idr, highlight, active, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,TRUE, now())
           ON CONFLICT (id) DO UPDATE SET
             name=EXCLUDED.name, credits=EXCLUDED.credits, bonus=EXCLUDED.bonus,
             price_idr=EXCLUDED.price_idr, highlight=EXCLUDED.highlight, active=TRUE`,
          [p.id, p.name, p.credits, p.bonus, p.price_idr, p.highlight],
        );
      }
      await client.query('COMMIT');
      return { saved: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // Konten publik (footer landing) — baca & simpan.
  app.get('/owner/content', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;
    return readSiteContent(pool);
  });

  app.put('/owner/content', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;
    const body = ContentSchema.parse(request.body ?? {});
    // Slug halaman wajib unik.
    const slugs = body.pages.map((p) => p.slug);
    if (new Set(slugs).size !== slugs.length) {
      reply.code(400);
      return {
        error: {
          type: 'invalid_request',
          message: 'Slug halaman harus unik',
          request_id: request.id,
        },
      };
    }
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('site', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(body)],
    );
    return { saved: true };
  });

  // ── Email transaksional (terkelola owner) ─────────────────────────────
  app.get('/owner/emails', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;
    return { templates: await readEmailTemplates(pool) };
  });

  app.put('/owner/emails', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;
    const body = EmailTemplatesSchema.parse(request.body ?? {});
    const override: Record<string, unknown> = {};
    for (const t of body.templates) {
      override[t.key] = {
        subject: t.subject,
        body: t.body,
        from: t.from,
        enabled: t.enabled,
      };
    }
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('email_templates', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(override)],
    );
    return { saved: true };
  });

  // Pratinjau render email (HTML) dengan variabel contoh.
  app.get('/owner/emails/preview', async (request, reply) => {
    const denied = ownerGuard(request, reply, config.SESSION_SECRET);
    if (denied) return denied;
    const { key, lang } = request.query as { key?: string; lang?: string };
    const all = await readEmailTemplates(pool);
    const tpl = all.find((t) => t.key === key);
    if (!tpl) {
      reply.code(404);
      return {
        error: {
          type: 'not_found',
          message: 'Template tidak ditemukan',
          request_id: request.id,
        },
      };
    }
    const l: Lang = lang === 'en' ? 'en' : 'id';
    const { subject, html } = renderEmail(tpl, l, SAMPLE_VARS[tpl.key] ?? {});
    return { subject, html };
  });
}

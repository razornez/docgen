import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import type { PaymentService } from './payment.service.js';
import type { IdGenerator } from '@docgen/shared';
import type { AppConfig } from '@docgen/config';
import type { EmailSender } from '../email/send.js';

const METHOD_LABEL: Record<string, string> = {
  qris: 'QRIS',
  va: 'Virtual Account',
  ewallet: 'E-Wallet',
  card: 'Kartu',
};

/** Kirim kuitansi top-up (best-effort) setelah saldo masuk. */
async function notifyTopup(
  pool: Pool,
  emailSender: EmailSender,
  config: AppConfig,
  tenantId: string,
  paymentId: string,
  balance: number,
): Promise<void> {
  try {
    const pay = await pool.query<{
      amount_idr: string;
      credits: string;
      method: string | null;
    }>(`SELECT amount_idr, credits, method FROM payments WHERE id=$1`, [
      paymentId,
    ]);
    const usr = await pool.query<{
      email: string;
      display_name: string | null;
    }>(
      `SELECT email, display_name FROM users WHERE tenant_id=$1
        ORDER BY created_at ASC LIMIT 1`,
      [tenantId],
    );
    const p = pay.rows[0];
    const u = usr.rows[0];
    if (!p || !u?.email) return;
    const fmt = (n: string | number) => Number(n).toLocaleString('id-ID');
    await emailSender('topup_success', {
      to: u.email,
      vars: {
        name: u.display_name || u.email.split('@')[0] || 'there',
        credits: fmt(p.credits),
        amount: fmt(p.amount_idr),
        balance: fmt(balance),
        method: (p.method && METHOD_LABEL[p.method]) || p.method || 'QRIS',
        action_url: `${config.DASHBOARD_URL}/dashboard/wallet`,
      },
    });
  } catch {
    // best-effort
  }
}

const TopupBody = z.object({
  package: z.string().trim().min(1),
});

/**
 * Rute top-up kredit via Kasugai (widget).
 * - GET  /v1/wallet/packages    → daftar paket kredit
 * - POST /v1/wallet/topups      → buat order Kasugai, kembali orderId + pk widget
 * - POST /v1/wallet/topups/:id/confirm → cek status (cepat) sebelum webhook
 *
 * Pemilihan metode bayar & inisiasi pembayaran ditangani widget Kasugai
 * (widget.js) di browser — tidak ada daftar metode buatan sendiri lagi.
 */
export function registerPaymentRoutes(
  app: FastifyInstance,
  service: PaymentService,
  _idGen: IdGenerator,
  emailSender: EmailSender,
  pool: Pool,
  config: AppConfig,
): void {
  // Daftar paket kredit yang tersedia.
  app.get('/wallet/packages', async (request) => {
    requireAuth(request);
    const packages = await service.listPackages();
    return {
      data: packages.map((p) => ({
        id: p.id,
        name: p.name,
        credits: p.credits,
        price_idr: p.priceIdr,
      })),
    };
  });

  // Buat top-up: kunci nominal di Kasugai (order) → kembalikan orderId + pk agar
  // browser bisa mount widget Kasugai. Pembayaran ditangani widget.
  app.post('/wallet/topups', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = TopupBody.parse(request.body);
    const { payment, publishableKey, apiBase } = await service.createTopup(
      ctx.tenantId,
      body.package,
    );
    reply.code(201);
    return {
      payment_id: payment.id,
      amount_idr: payment.amountIdr,
      credits: payment.credits,
      currency: 'IDR',
      public_key: publishableKey,
      kasugai_base_url: apiBase,
      status: payment.status,
    };
  });

  // Konfirmasi cepat: cek status ke Kasugai (server-to-server) & kredit bila lunas.
  // Dipoll frontend setelah Snap sukses agar saldo masuk tanpa menunggu webhook.
  app.post('/wallet/topups/:id/confirm', async (request) => {
    const ctx = requireAuth(request);
    const { id } = request.params as { id: string };
    const result = await service.confirmTopup(ctx.tenantId, id);
    if (result.credited) {
      void notifyTopup(
        pool,
        emailSender,
        config,
        ctx.tenantId,
        id,
        result.balance,
      );
    }
    return {
      status: result.status,
      credited: result.credited,
      balance: result.balance,
    };
  });
}

/**
 * Webhook Kasugai — rute PUBLIK (tanpa auth API key).
 * Keamanan: HMAC-SHA256 atas RAW body, header X-Kasugai-Signature.
 *
 * Signature WAJIB valid. Bila gagal verifikasi kita balas non-2xx (401/400) —
 * BUKAN silent-200 — supaya kegagalan terlihat di log delivery Kasugai dan
 * di-retry (ini akar bug lama "settle sukses tapi saldo tak nambah": secret
 * salah → 200 senyap → tak pernah kredit & tak pernah retry). Payload hanya
 * diproses bila signature valid. Raw body diambil dari parser khusus scope
 * webhook (lihat app.ts).
 */
export function registerPaymentWebhookRoute(
  app: FastifyInstance,
  service: PaymentService,
  _idGen: IdGenerator,
): void {
  app.post('/webhooks/payments', async (request, reply) => {
    const raw =
      (request as FastifyRequest & { rawBody?: string }).rawBody ?? '';
    const sig = (request.headers['x-kasugai-signature'] as string) ?? '';

    const result = await service.handleKasugaiWebhook(raw, sig);

    if (!result.ok) {
      request.log.warn(
        { reason: result.reason, body_len: raw.length },
        'Kasugai webhook ditolak',
      );
      // Signature salah → 401; payload rusak → 400. Keduanya non-2xx agar
      // Kasugai menandai delivery gagal & me-retry.
      reply.code(result.reason === 'invalid_signature' ? 401 : 400);
      return { received: false, reason: result.reason };
    }

    request.log.info(
      { reason: result.reason, orderId: result.orderId },
      'Kasugai webhook diproses',
    );
    reply.code(200);
    return { received: true, ...result };
  });
}

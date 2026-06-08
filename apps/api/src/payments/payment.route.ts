import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import type { PaymentService } from './payment.service.js';
import type { IdGenerator } from '@docgen/shared';

const TopupBody = z.object({
  package: z.string().trim().min(1),
});

/**
 * Rute top-up kredit via Midtrans (docs/03 — Alur 3).
 * - GET  /v1/wallet/packages      → daftar paket kredit
 * - POST /v1/wallet/topups        → buat transaksi Midtrans, kembali payment_url
 * - POST /v1/webhooks/payments    → Midtrans webhook callback (publik, verifikasi signature)
 */
export function registerPaymentRoutes(
  app: FastifyInstance,
  service: PaymentService,
  _idGen: IdGenerator,
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

  // Buat top-up: kembalikan payment_url Midtrans.
  app.post('/wallet/topups', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = TopupBody.parse(request.body);
    // Ambil email dari DB (untuk data customer Midtrans) — opsional.
    const { payment, paymentUrl } = await service.createTopup(
      ctx.tenantId,
      body.package,
    );
    reply.code(201);
    return {
      payment_id: payment.id,
      amount_idr: payment.amountIdr,
      credits: payment.credits,
      currency: 'IDR',
      payment_url: paymentUrl,
      status: payment.status,
    };
  });
}

/**
 * Webhook Midtrans — rute PUBLIK (tanpa auth API key).
 * Keamanan: diverifikasi via signature Midtrans (docs/03).
 */
export function registerPaymentWebhookRoute(
  app: FastifyInstance,
  service: PaymentService,
  idGen: IdGenerator,
): void {
  app.post('/webhooks/payments', async (request, reply) => {
    await service.handleMidtransWebhook(request.body, idGen);
    reply.code(200);
    return { received: true };
  });
}

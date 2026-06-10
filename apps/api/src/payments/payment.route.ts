import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import type { PaymentService } from './payment.service.js';
import type { IdGenerator } from '@docgen/shared';

const TopupBody = z.object({
  package: z.string().trim().min(1),
  method: z.string().trim().min(1),
});

/**
 * Rute top-up kredit via Kasugai (docs/03 — Alur 3).
 * - GET  /v1/wallet/packages         → daftar paket kredit
 * - GET  /v1/wallet/payment-methods  → metode bayar aktif (QRIS, VA, dst)
 * - POST /v1/wallet/topups           → buat transaksi Kasugai, kembali payment_url
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

  // Daftar metode bayar aktif dari Kasugai.
  app.get('/wallet/payment-methods', async (request) => {
    requireAuth(request);
    const methods = await service.listMethods();
    return { data: methods.map((m) => ({ code: m.code, name: m.name })) };
  });

  // Buat top-up: kembalikan payment_url Kasugai (redirect ke Snap).
  app.post('/wallet/topups', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = TopupBody.parse(request.body);
    const { payment, paymentUrl, snapToken, clientKey } =
      await service.createTopup(ctx.tenantId, body.package, body.method);
    reply.code(201);
    return {
      payment_id: payment.id,
      amount_idr: payment.amountIdr,
      credits: payment.credits,
      currency: 'IDR',
      payment_url: paymentUrl,
      snap_token: snapToken,
      client_key: clientKey,
      status: payment.status,
    };
  });
}

/**
 * Webhook Kasugai — rute PUBLIK (tanpa auth API key).
 * Keamanan: HMAC-SHA256 atas RAW body, header X-Kasugai-Signature.
 *
 * SELALU balas 200 — termasuk saat signature invalid — agar Kasugai tidak
 * retry tanpa henti (lihat brief integrasi). Payload hanya diproses bila
 * signature valid. Raw body diambil dari content-type parser khusus
 * (lihat app.ts: scope webhook punya parser yang menyimpan rawBody).
 */
export function registerPaymentWebhookRoute(
  app: FastifyInstance,
  service: PaymentService,
  idGen: IdGenerator,
): void {
  app.post('/webhooks/payments', async (request, reply) => {
    const raw =
      (request as FastifyRequest & { rawBody?: string }).rawBody ?? '';
    const sig = (request.headers['x-kasugai-signature'] as string) ?? '';

    const result = await service.handleKasugaiWebhook(raw, sig, idGen);

    if (!result.ok) {
      request.log.warn(
        { reason: result.reason, body_len: raw.length },
        'Kasugai webhook ditolak',
      );
    } else {
      request.log.info(
        { reason: result.reason, orderId: result.orderId },
        'Kasugai webhook diproses',
      );
    }

    reply.code(200);
    return { received: true, ...result };
  });
}

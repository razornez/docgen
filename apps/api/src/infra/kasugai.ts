import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreateTxInput,
  PaymentGatewayPort,
  PaymentMethod,
  WebhookVerification,
} from '@docgen/shared';

/**
 * Adapter Kasugai (docs/21 — Ports & Adapters). Kasugai adalah payment gateway
 * internal (NestJS) yang mem-proxy Midtrans. Client tidak menyentuh Midtrans.
 *
 * Alur bayar: POST /orders (kunci nominal) → POST /pay (dapat redirectUrl) →
 * user dibawa ke Snap → bayar → Midtrans → Kasugai → webhook ke server kita.
 *
 * Auth: Bearer sk_... (WAJIB secret key, BUKAN publishable pk_).
 * Webhook: HMAC-SHA256 atas RAW body, header X-Kasugai-Signature = 'sha256=<hex>'.
 */
export class KasugaiGateway implements PaymentGatewayPort {
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly publishableKey: string;

  constructor(
    baseUrl: string,
    secretKey: string,
    webhookSecret: string,
    publishableKey = '',
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
    this.publishableKey = publishableKey;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      Accept: 'application/json',
    };
  }

  async listMethods(): Promise<PaymentMethod[]> {
    const res = await fetch(`${this.baseUrl}/v1/payment/methods`, {
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kasugai listMethods gagal: ${res.status} ${text}`);
    }
    const data = (await res.json()) as
      | { methods?: unknown }
      | { data?: unknown }
      | unknown[];
    // Toleran terhadap beberapa bentuk respons: array langsung, {methods}, {data}.
    const raw: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { methods?: unknown }).methods)
        ? ((data as { methods: unknown[] }).methods ?? [])
        : Array.isArray((data as { data?: unknown }).data)
          ? ((data as { data: unknown[] }).data ?? [])
          : [];
    return raw.map((m) => {
      const o = m as Record<string, unknown>;
      const code = String(o['code'] ?? o['method'] ?? o['id'] ?? '');
      const name = String(o['name'] ?? o['label'] ?? code);
      return { code, name };
    });
  }

  async createTransaction(input: CreateTxInput): Promise<{
    orderId: string;
    paymentUrl: string;
    token: string | null;
    clientKey: string | null;
  }> {
    // Step 1: kunci nominal. Panduan resmi menunjukkan /orders bisa langsung
    // mengembalikan snapToken — kita tangkap bila ada.
    const orderRes = await fetch(`${this.baseUrl}/v1/payment/orders`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: input.orderId,
        amount: input.amountIdr,
        currency: 'IDR',
        customerName: input.customerName,
      }),
    });
    if (!orderRes.ok) {
      const text = await orderRes.text();
      throw new Error(`Kasugai order gagal: ${orderRes.status} ${text}`);
    }
    const orderData = (await orderRes.json().catch(() => ({}))) as {
      snapToken?: string;
      token?: string;
      redirectUrl?: string;
      clientKey?: string;
    };

    // Step 2: inisiasi bayar (mengembalikan redirectUrl + token untuk Snap).
    const payRes = await fetch(`${this.baseUrl}/v1/payment/pay`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: input.orderId,
        method: input.method,
      }),
    });
    if (!payRes.ok) {
      const text = await payRes.text();
      throw new Error(`Kasugai pay gagal: ${payRes.status} ${text}`);
    }
    const payData = (await payRes.json().catch(() => ({}))) as {
      redirectUrl?: string;
      token?: string; // ⚠️ field-nya 'token'/'snapToken', BUKAN 'snapToken' lama
      snapToken?: string;
      clientKey?: string;
    };

    // Toleran terhadap dua bentuk respons (orders vs pay).
    const token =
      payData.token ??
      payData.snapToken ??
      orderData.snapToken ??
      orderData.token ??
      null;
    const paymentUrl = payData.redirectUrl ?? orderData.redirectUrl ?? '';
    const clientKey =
      payData.clientKey ?? orderData.clientKey ?? (this.publishableKey || null);

    if (!paymentUrl && !token) {
      throw new Error('Kasugai: tidak ada redirectUrl maupun snapToken');
    }
    return { orderId: input.orderId, paymentUrl, token, clientKey };
  }

  verifyWebhook(rawBody: string, signature: string): WebhookVerification {
    if (!this.webhookSecret) return { ok: false, reason: 'invalid_signature' };
    // HMAC WAJIB atas RAW body — json_encode ulang akan mengubah hasil.
    const expected =
      'sha256=' +
      createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'invalid_signature' };
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return { ok: false, reason: 'bad_payload' };
    }

    const event = String(body['event'] ?? '');
    // Payload Kasugai menaruh orderId di TOP-LEVEL. Tetap dukung bentuk nested
    // (body.data.orderId) sebagai cadangan demi ketahanan.
    const dataObj = (body['data'] ?? {}) as Record<string, unknown>;
    const orderId = String(
      body['orderId'] ??
        body['order_id'] ??
        dataObj['orderId'] ??
        dataObj['order_id'] ??
        '',
    );
    if (!orderId) return { ok: false, reason: 'bad_payload' };

    return { ok: true, orderId, event, paid: event === 'payment.paid' };
  }
}

import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreateTxInput,
  PaymentGatewayPort,
  PaymentMethod,
  VerifiedWebhook,
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

  constructor(baseUrl: string, secretKey: string, webhookSecret: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
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

  async createTransaction(
    input: CreateTxInput,
  ): Promise<{ orderId: string; paymentUrl: string }> {
    // Step 1: kunci nominal.
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

    // Step 2: inisiasi bayar.
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

    const data = (await payRes.json()) as {
      redirectUrl?: string;
      token?: string; // ⚠️ field-nya 'token', BUKAN 'snapToken'
    };
    if (!data.redirectUrl) {
      throw new Error('Kasugai pay: redirectUrl kosong');
    }
    return { orderId: input.orderId, paymentUrl: data.redirectUrl };
  }

  verifyWebhook(rawBody: string, signature: string): VerifiedWebhook | null {
    if (!this.webhookSecret) return null;
    // HMAC WAJIB atas RAW body — json_encode ulang akan mengubah hasil.
    const expected =
      'sha256=' +
      createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return null;
    }
    const event = String(body['event'] ?? '');
    const dataObj = (body['data'] ?? {}) as Record<string, unknown>;
    const orderId = String(dataObj['orderId'] ?? dataObj['order_id'] ?? '');
    if (!orderId) return null;

    return { orderId, event, paid: event === 'payment.paid' };
  }
}

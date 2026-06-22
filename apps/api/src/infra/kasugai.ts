import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreateOrderInput,
  OrderStatusValue,
  PaymentGatewayPort,
  PaymentMethod,
  WebhookVerification,
} from '@docgen/shared';

/**
 * Adapter Kasugai (docs/21 — Ports & Adapters). Kasugai adalah payment gateway
 * internal yang mem-proxy Midtrans. Client tidak menyentuh Midtrans.
 *
 * Alur bayar (widget): server POST /orders (kunci nominal) → kirim orderId ke
 * browser → widget Kasugai (widget.js) yang menangani pemilihan metode + /pay +
 * Snap → bayar → Kasugai → webhook ke server kita (sumber kebenaran saldo).
 *
 * Auth /orders: Bearer sk_... (WAJIB secret key, BUKAN publishable pk_).
 * Widget di browser memakai pk_ (publishable).
 * Webhook: HMAC-SHA256 atas RAW body, header X-Kasugai-Signature = 'sha256=<hex>'.
 */
export class KasugaiGateway implements PaymentGatewayPort {
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  readonly publishableKey: string;

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

  /** Base URL Kasugai (untuk apiBase widget di browser). */
  get apiBase(): string {
    return this.baseUrl;
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

  /**
   * Kunci nominal di Kasugai (POST /orders). Hanya membuat order — pemilihan
   * metode & /pay ditangani widget di browser. Body customer.{nama,email}
   * mengikuti kontrak widget (disamakan dengan integrasi meter-air).
   */
  async createOrder(input: CreateOrderInput): Promise<{ orderId: string }> {
    const orderRes = await fetch(`${this.baseUrl}/v1/payment/orders`, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: input.orderId,
        amount: input.amountIdr,
        currency: 'IDR',
        customer: {
          nama: input.customerName,
          ...(input.customerEmail ? { email: input.customerEmail } : {}),
        },
      }),
    });
    // Kasugai mengembalikan 201 saat order dibuat; 200 juga diterima.
    if (!orderRes.ok) {
      const text = await orderRes.text();
      throw new Error(`Kasugai order gagal: ${orderRes.status} ${text}`);
    }
    return { orderId: input.orderId };
  }

  async getStatus(orderId: string): Promise<{ status: OrderStatusValue }> {
    const res = await fetch(
      `${this.baseUrl}/v1/payment/orders/${encodeURIComponent(orderId)}`,
      { headers: this.authHeaders() },
    );
    if (!res.ok) {
      // Order belum ada / tidak ketemu → anggap masih pending (jangan kredit).
      return { status: 'pending' };
    }
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    const raw = (data.status ?? '').toLowerCase();
    // Kasugai: 'paid' = lunas; 'pending'/'open' = belum; sisanya = gagal/kedaluwarsa.
    const status: OrderStatusValue =
      raw === 'paid'
        ? 'paid'
        : raw === 'pending' || raw === 'open' || raw === ''
          ? 'pending'
          : 'failed';
    return { status };
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

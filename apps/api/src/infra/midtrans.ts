import { createHash } from 'node:crypto';
import type {
  CreateTxInput,
  PaymentGatewayPort,
  PaymentStatus,
} from '@docgen/shared';

/**
 * Adapter Midtrans Snap (docs/21 — Ports & Adapters). Implementasi
 * PaymentGatewayPort menggunakan Midtrans Snap API. Hanya aktif bila
 * MIDTRANS_SERVER_KEY diset.
 *
 * Dokumentasi Midtrans Snap: https://snap-docs.midtrans.com/
 */
export class MidtransGateway implements PaymentGatewayPort {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly serverKey: string;

  constructor(serverKey: string, isProduction: boolean) {
    this.serverKey = serverKey;
    this.baseUrl = isProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';
    this.authHeader =
      'Basic ' + Buffer.from(`${serverKey}:`).toString('base64');
  }

  async createTransaction(
    input: CreateTxInput,
  ): Promise<{ orderId: string; paymentUrl: string }> {
    const res = await fetch(`${this.baseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.orderId,
          gross_amount: input.amountIdr,
        },
        customer_details: input.customerEmail
          ? { email: input.customerEmail }
          : undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Midtrans createTransaction gagal: ${res.status} ${text}`,
      );
    }

    const data = (await res.json()) as { token: string; redirect_url: string };
    return { orderId: input.orderId, paymentUrl: data.redirect_url };
  }

  verifyNotificationSignature(payload: unknown): boolean {
    const p = payload as Record<string, string>;
    if (!p['order_id'] || !p['status_code'] || !p['gross_amount']) return false;
    // Midtrans signature: SHA-512(order_id + status_code + gross_amount + server_key)
    const expected = createHash('sha512')
      .update(
        `${p['order_id']}${p['status_code']}${p['gross_amount']}${this.serverKey}`,
      )
      .digest('hex');
    return expected === p['signature_key'];
  }

  async getStatus(orderId: string): Promise<PaymentStatus> {
    const res = await fetch(`${this.baseUrl}/v2/${orderId}/status`, {
      headers: { Authorization: this.authHeader },
    });
    if (!res.ok) throw new Error(`Midtrans getStatus gagal: ${res.status}`);
    const data = (await res.json()) as { transaction_status: string };
    const statusMap: Record<string, PaymentStatus['status']> = {
      capture: 'paid',
      settlement: 'paid',
      pending: 'pending',
      deny: 'failed',
      cancel: 'failed',
      expire: 'expired',
      failure: 'failed',
    };
    return {
      orderId,
      status: statusMap[data.transaction_status] ?? 'pending',
    };
  }
}

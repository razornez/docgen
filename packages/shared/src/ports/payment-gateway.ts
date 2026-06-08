/**
 * Port payment gateway (docs/21, docs/07 — Midtrans). Siap ditambah Xendit.
 * Kredit hanya ditambahkan dari notifikasi terverifikasi (docs/21 — Aturan Emas Uang).
 */
export interface CreateTxInput {
  readonly orderId: string;
  readonly amountIdr: number;
  readonly customerEmail?: string;
}

export type PaymentStatusValue = 'pending' | 'paid' | 'failed' | 'expired';

export interface PaymentStatus {
  readonly orderId: string;
  readonly status: PaymentStatusValue;
}

export interface PaymentGatewayPort {
  createTransaction(
    input: CreateTxInput,
  ): Promise<{ orderId: string; paymentUrl: string }>;
  /** Verifikasi signature notifikasi (mis. signature_key Midtrans). */
  verifyNotificationSignature(payload: unknown): boolean;
  /** Konfirmasi balik status ke gateway — jangan percaya notifikasi mentah. */
  getStatus(orderId: string): Promise<PaymentStatus>;
}

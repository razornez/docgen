/**
 * Port payment gateway (docs/21, docs/07). Implementasi aktif: Kasugai —
 * gateway internal yang mem-proxy Midtrans. Client tidak menyentuh Midtrans.
 * Kredit hanya ditambahkan dari webhook terverifikasi (docs/21 — Aturan Emas Uang).
 */
export interface CreateTxInput {
  readonly orderId: string;
  readonly amountIdr: number;
  /** Kode metode bayar Kasugai, mis. 'midtrans_qris', 'midtrans_va_bni'. */
  readonly method: string;
  readonly customerName: string;
  readonly customerEmail?: string;
}

/** Metode bayar aktif (dari GET /v1/payment/methods milik tenant Kasugai). */
export interface PaymentMethod {
  readonly code: string; // mis. 'midtrans_qris'
  readonly name: string; // mis. 'QRIS'
}

/** Hasil verifikasi webhook Kasugai (HMAC atas raw body sudah lolos). */
export interface VerifiedWebhook {
  readonly orderId: string;
  readonly event: string; // mis. 'payment.paid'
  readonly paid: boolean;
}

export interface PaymentGatewayPort {
  /** Daftar metode bayar yang aktif untuk tenant. */
  listMethods(): Promise<PaymentMethod[]>;

  /**
   * Kunci nominal (POST /orders) lalu inisiasi bayar (POST /pay).
   * Mengembalikan URL redirect ke halaman Snap, plus token + clientKey
   * untuk menampilkan widget Snap embedded (snap.js) di dashboard.
   */
  createTransaction(input: CreateTxInput): Promise<{
    orderId: string;
    paymentUrl: string;
    token: string | null;
    clientKey: string | null;
  }>;

  /**
   * Verifikasi HMAC-SHA256 atas RAW body webhook. Mengembalikan payload
   * terverifikasi, atau null bila signature tidak cocok. WAJIB raw body —
   * JSON yang di-encode ulang akan mengubah signature.
   */
  verifyWebhook(rawBody: string, signature: string): VerifiedWebhook | null;
}

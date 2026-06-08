import { withTransaction } from '@docgen/db';
import { Errors, ID_PREFIXES } from '@docgen/shared';
import type { IdGenerator, PaymentGatewayPort, TenantId } from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceIdr: number;
  active: boolean;
}

interface CreditPackageRow {
  id: string;
  name: string;
  credits: string;
  price_idr: string;
  active: boolean;
}

export interface PaymentRecord {
  id: string;
  tenantId: TenantId;
  packageId: string | null;
  amountIdr: number;
  credits: number;
  status: string;
  paymentUrl: string | null;
  gatewayRef: string | null;
  createdAt: Date;
}

interface PaymentRow {
  id: string;
  tenant_id: string;
  package_id: string | null;
  amount_idr: string;
  credits: string;
  status: string;
  gateway_ref: string | null;
  created_at: Date;
}

/**
 * Layanan top-up kredit via Midtrans (docs/03 — Alur 3). Kredit hanya
 * ditambahkan setelah webhook server-to-server dari gateway diterima dan
 * diverifikasi (aturan keras docs/03 — Keamanan Top-up).
 */
export class PaymentService {
  constructor(
    private readonly db: Queryable,
    private readonly gateway: PaymentGatewayPort,
    private readonly idGen: IdGenerator,
  ) {}

  async listPackages(): Promise<CreditPackage[]> {
    const { rows } = await this.db.query<CreditPackageRow>(
      `SELECT id, name, credits, price_idr, active FROM credit_packages
       WHERE active = TRUE ORDER BY price_idr ASC`,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      credits: Number(r.credits),
      priceIdr: Number(r.price_idr),
      active: r.active,
    }));
  }

  async createTopup(
    tenantId: TenantId,
    packageId: string,
    customerEmail?: string,
  ): Promise<{ payment: PaymentRecord; paymentUrl: string }> {
    const { rows: pkgRows } = await this.db.query<CreditPackageRow>(
      `SELECT id, name, credits, price_idr, active FROM credit_packages WHERE id = $1 AND active = TRUE`,
      [packageId],
    );
    const pkg = pkgRows[0];
    if (!pkg) throw Errors.notFound('Credit package not found', 'package');

    const paymentId = this.idGen.generate(ID_PREFIXES.payment);
    const credits = Number(pkg.credits);
    const amountIdr = Number(pkg.price_idr);

    // Buat transaksi di Midtrans.
    const { paymentUrl } = await this.gateway.createTransaction({
      orderId: paymentId,
      amountIdr,
      ...(customerEmail !== undefined ? { customerEmail } : {}),
    });

    // Simpan record payment dengan status 'pending'.
    const { rows } = await this.db.query<PaymentRow>(
      `INSERT INTO payments
         (id, tenant_id, package_id, amount_idr, credits, currency, gateway, gateway_ref, status)
       VALUES ($1, $2, $3, $4, $5, 'IDR', 'midtrans', $1, 'pending')
       RETURNING id, tenant_id, package_id, amount_idr, credits, status, gateway_ref, created_at`,
      [paymentId, tenantId, packageId, amountIdr, credits],
    );
    const row = rows[0]!;
    return {
      payment: {
        id: row.id,
        tenantId: row.tenant_id as TenantId,
        packageId: row.package_id,
        amountIdr: Number(row.amount_idr),
        credits: Number(row.credits),
        status: row.status,
        paymentUrl,
        gatewayRef: row.gateway_ref,
        createdAt: row.created_at,
      },
      paymentUrl,
    };
  }

  /**
   * Handler webhook Midtrans. Verifikasi signature → konfirmasi ke Midtrans →
   * kredit saldo dalam satu transaksi atomik. Idempoten via UNIQUE(topup,paymentId).
   */
  async handleMidtransWebhook(
    payload: unknown,
    idGen: IdGenerator,
  ): Promise<void> {
    if (!this.gateway.verifyNotificationSignature(payload)) {
      throw Errors.unauthorized('Invalid webhook signature');
    }

    const p = payload as Record<string, string>;
    const orderId = p['order_id'];
    if (!orderId) throw Errors.invalidRequest('Missing order_id');

    // Konfirmasi ke Midtrans (jangan percaya notifikasi mentah).
    const confirmed = await this.gateway.getStatus(orderId);
    if (confirmed.status !== 'paid') return; // bukan paid, abaikan

    await withTransaction(async (tx) => {
      // Ambil payment record.
      const { rows } = await tx.query<PaymentRow>(
        `SELECT id, tenant_id, credits FROM payments
          WHERE gateway_ref = $1 AND gateway = 'midtrans' AND status = 'pending'`,
        [orderId],
      );
      const payment = rows[0];
      if (!payment) return; // sudah diproses atau tidak ditemukan

      const credits = Number(payment.credits);
      const tenantId = payment.tenant_id as TenantId;

      // Update payment status ke 'paid'.
      await tx.query(
        `UPDATE payments SET status = 'paid', paid_at = now() WHERE id = $1`,
        [payment.id],
      );

      // Tambah kredit ke wallet.
      const walletUpd = await tx.query<{ balance: string }>(
        `UPDATE wallets SET balance = balance + $1 WHERE tenant_id = $2 RETURNING balance`,
        [credits, tenantId],
      );
      const balanceAfter = Number(walletUpd.rows[0]!.balance);
      const txnId = idGen.generate(ID_PREFIXES.transaction);

      // Catat transaksi topup (idempoten).
      await tx.query(
        `INSERT INTO wallet_transactions
           (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata)
         VALUES ($1, $2, 'topup', $3, $4, 'payment', $5, 1, '{}')
         ON CONFLICT (type, ref_id) DO NOTHING`,
        [txnId, tenantId, credits, balanceAfter, payment.id],
      );
    });
  }
}

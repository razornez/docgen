import { withTransaction } from '@docgen/db';
import { Errors, ID_PREFIXES } from '@docgen/shared';
import type {
  IdGenerator,
  PaymentGatewayPort,
  PaymentMethod,
  TenantId,
} from '@docgen/shared';
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
 * Layanan top-up kredit via Kasugai (docs/03 — Alur 3). Kredit hanya
 * ditambahkan setelah webhook server-to-server dari gateway diterima dan
 * diverifikasi HMAC (aturan keras docs/03 — Keamanan Top-up).
 */
export class PaymentService {
  constructor(
    private readonly db: Queryable,
    private readonly gateway: PaymentGatewayPort,
    private readonly idGen: IdGenerator,
  ) {}

  /** Daftar metode bayar aktif dari Kasugai (mis. QRIS, VA BCA). */
  async listMethods(): Promise<PaymentMethod[]> {
    return this.gateway.listMethods();
  }

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
    method: string,
    customerEmail?: string,
  ): Promise<{
    payment: PaymentRecord;
    paymentUrl: string;
    snapToken: string | null;
    clientKey: string | null;
  }> {
    const { rows: pkgRows } = await this.db.query<CreditPackageRow>(
      `SELECT id, name, credits, price_idr, active FROM credit_packages WHERE id = $1 AND active = TRUE`,
      [packageId],
    );
    const pkg = pkgRows[0];
    if (!pkg) throw Errors.notFound('Credit package not found', 'package');

    // Nama customer untuk Kasugai (wajib) — ambil dari tenant.
    const { rows: tenantRows } = await this.db.query<{ name: string }>(
      `SELECT name FROM tenants WHERE id = $1`,
      [tenantId],
    );
    const customerName = tenantRows[0]?.name ?? 'DocGen User';

    const paymentId = this.idGen.generate(ID_PREFIXES.payment);
    const credits = Number(pkg.credits);
    const amountIdr = Number(pkg.price_idr);

    // Buat transaksi di Kasugai (orders + pay).
    const { paymentUrl, token, clientKey } =
      await this.gateway.createTransaction({
        orderId: paymentId,
        amountIdr,
        method,
        customerName,
        ...(customerEmail !== undefined ? { customerEmail } : {}),
      });

    // Simpan record payment dengan status 'pending'.
    const { rows } = await this.db.query<PaymentRow>(
      `INSERT INTO payments
         (id, tenant_id, package_id, amount_idr, credits, currency, gateway, gateway_ref, status)
       VALUES ($1, $2, $3, $4, $5, 'IDR', 'kasugai', $1, 'pending')
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
      snapToken: token,
      clientKey,
    };
  }

  /**
   * Handler webhook Kasugai. Verifikasi HMAC atas RAW body → bila event
   * 'payment.paid' kredit saldo dalam satu transaksi atomik. Idempoten via
   * UNIQUE(topup, paymentId).
   *
   * Mengembalikan ringkasan untuk logging route. TIDAK melempar pada signature
   * invalid — route tetap balas 200 agar Kasugai tidak retry tanpa henti
   * (lihat brief — return 4xx menyebabkan spam retry).
   */
  async handleKasugaiWebhook(
    rawBody: string,
    signature: string,
    idGen: IdGenerator,
  ): Promise<{ ok: boolean; reason: string; orderId?: string }> {
    const verified = this.gateway.verifyWebhook(rawBody, signature);
    if (!verified) {
      return { ok: false, reason: 'invalid_signature' };
    }
    if (!verified.paid) {
      return { ok: true, reason: `skipped:${verified.event}` };
    }

    const orderId = verified.orderId;

    await withTransaction(async (tx) => {
      // Ambil payment record (idempoten — hanya yang masih pending).
      const { rows } = await tx.query<PaymentRow>(
        `SELECT id, tenant_id, credits FROM payments
          WHERE gateway_ref = $1 AND gateway = 'kasugai' AND status = 'pending'`,
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

    return { ok: true, reason: 'paid', orderId };
  }
}

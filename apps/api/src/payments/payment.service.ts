import { withTransaction, applyWalletCredit } from '@docgen/db';
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
    /** Publishable key Kasugai (pk_) — dipakai widget di browser. */
    private readonly publishableKey: string = '',
    /** Base URL Kasugai — dipakai widget sebagai apiBase. */
    private readonly gatewayApiBase: string = 'https://kasugai.razornez.net',
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
  ): Promise<{
    payment: PaymentRecord;
    publishableKey: string;
    apiBase: string;
  }> {
    const { rows: pkgRows } = await this.db.query<
      CreditPackageRow & { bonus: string }
    >(
      `SELECT id, name, credits, bonus, price_idr, active FROM credit_packages WHERE id = $1 AND active = TRUE`,
      [packageId],
    );
    const pkg = pkgRows[0];
    if (!pkg) throw Errors.notFound('Credit package not found', 'package');

    // Customer untuk Kasugai: nama dari user utama (fallback nama tenant), email
    // dari user utama bila ada.
    const { rows: tenantRows } = await this.db.query<{ name: string }>(
      `SELECT name FROM tenants WHERE id = $1`,
      [tenantId],
    );
    const { rows: userRows } = await this.db.query<{
      email: string | null;
      display_name: string | null;
    }>(
      `SELECT email, display_name FROM users WHERE tenant_id = $1
        ORDER BY created_at ASC LIMIT 1`,
      [tenantId],
    );
    const customerName =
      userRows[0]?.display_name ?? tenantRows[0]?.name ?? 'DocGen User';
    const customerEmail = userRows[0]?.email ?? undefined;

    const paymentId = this.idGen.generate(ID_PREFIXES.payment);
    // Kredit diterima = kredit paket + bonus paket (jika ada).
    const credits = Number(pkg.credits) + Number(pkg.bonus ?? 0);
    const amountIdr = Number(pkg.price_idr);

    // Kunci nominal di Kasugai (POST /orders). Pemilihan metode & bayar
    // ditangani widget di browser memakai orderId ini.
    await this.gateway.createOrder({
      orderId: paymentId,
      amountIdr,
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
        paymentUrl: null,
        gatewayRef: row.gateway_ref,
        createdAt: row.created_at,
      },
      publishableKey: this.publishableKey,
      apiBase: this.gatewayApiBase,
    };
  }

  /**
   * Handler webhook Kasugai. Verifikasi HMAC atas RAW body → bila event
   * 'payment.paid' kredit saldo dalam satu transaksi atomik. Idempoten via
   * UNIQUE(topup, paymentId).
   *
   * Mengembalikan hasil terdiskriminasi (ok/reason). Route memetakan kegagalan
   * verifikasi ke non-2xx (signature → 401, payload → 400) agar terlihat &
   * di-retry Kasugai; sukses → 200.
   */
  async handleKasugaiWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{ ok: boolean; reason: string; orderId?: string }> {
    const verified = this.gateway.verifyWebhook(rawBody, signature);
    if (!verified.ok) {
      return { ok: false, reason: verified.reason };
    }
    if (!verified.paid) {
      return { ok: true, reason: `skipped:${verified.event}` };
    }

    const orderId = verified.orderId;
    const credited = await this.creditPaidOrder(orderId);

    // Bedakan: benar-benar mengkredit vs order tak ditemukan/sudah diproses.
    return {
      ok: true,
      reason: credited ? 'credited' : 'order_not_found_or_done',
      orderId,
    };
  }

  /**
   * Kredit saldo untuk order yang sudah lunas (idempoten via UNIQUE(topup,ref)).
   * Dipakai oleh webhook DAN konfirmasi status. Mengembalikan true bila baris
   * payment pending ditemukan & diproses; false bila sudah diproses/tidak ada.
   */
  private async creditPaidOrder(orderId: string): Promise<boolean> {
    let credited = false;
    await withTransaction(async (tx) => {
      const { rows } = await tx.query<PaymentRow>(
        `SELECT id, tenant_id, credits FROM payments
          WHERE gateway_ref = $1 AND gateway = 'kasugai' AND status = 'pending'`,
        [orderId],
      );
      const payment = rows[0];
      if (!payment) return; // sudah diproses atau tidak ditemukan
      credited = true;

      const credits = Number(payment.credits);
      const tenantId = payment.tenant_id as TenantId;

      await tx.query(
        `UPDATE payments SET status = 'paid', paid_at = now() WHERE id = $1`,
        [payment.id],
      );

      await applyWalletCredit(tx, {
        id: this.idGen.generate(ID_PREFIXES.transaction),
        tenantId,
        type: 'topup',
        amount: credits,
        refType: 'payment',
        refId: payment.id,
      });
    });
    return credited;
  }

  /**
   * Konfirmasi cepat (server-to-server) status sebuah top-up milik tenant.
   * Menanyakan status otoritatif ke Kasugai; bila 'paid', langsung kredit
   * (idempoten — webhook yang datang kemudian tidak menggandakan). Ini
   * memangkas waktu tunggu dibanding menunggu webhook delivery Kasugai.
   */
  async confirmTopup(
    tenantId: TenantId,
    paymentId: string,
  ): Promise<{ status: string; credited: boolean; balance: number }> {
    // Pastikan payment milik tenant ini (cegah cek lintas-tenant).
    const { rows } = await this.db.query<{ status: string }>(
      `SELECT status FROM payments
        WHERE id = $1 AND tenant_id = $2 AND gateway = 'kasugai'`,
      [paymentId, tenantId],
    );
    const payment = rows[0];
    if (!payment) throw Errors.notFound('Payment not found', 'payment');

    let credited = false;
    if (payment.status === 'pending') {
      const { status } = await this.gateway.getStatus(paymentId);
      if (status === 'paid') {
        credited = await this.creditPaidOrder(paymentId);
      }
    }

    const { rows: wr } = await this.db.query<{ balance: string }>(
      `SELECT balance FROM wallets WHERE tenant_id = $1`,
      [tenantId],
    );
    const balance = Number(wr[0]?.balance ?? 0);

    // Status terkini setelah kemungkinan kredit.
    const { rows: pr } = await this.db.query<{ status: string }>(
      `SELECT status FROM payments WHERE id = $1`,
      [paymentId],
    );
    return { status: pr[0]?.status ?? payment.status, credited, balance };
  }
}

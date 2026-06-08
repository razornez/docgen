import type { Locale, Tenant, TenantId } from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface CreateTenantInput {
  readonly id: TenantId;
  readonly name: string;
  readonly country: string | null;
  readonly defaultLocale: Locale;
}

/** Kontrak akses data tenant (docs/21 — repository satu-satunya penyentuh tabel). */
export interface TenantRepository {
  create(input: CreateTenantInput): Promise<Tenant>;
  findById(id: TenantId): Promise<Tenant | null>;
}

interface TenantRow {
  id: string;
  name: string;
  status: string;
  kyc_status: string;
  country: string | null;
  default_locale: string;
  created_at: Date;
  updated_at: Date;
}

function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id as TenantId,
    name: row.name,
    status: row.status as Tenant['status'],
    kycStatus: row.kyc_status as Tenant['kycStatus'],
    country: row.country,
    defaultLocale: row.default_locale as Locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  'id, name, status, kyc_status, country, default_locale, created_at, updated_at';

export class PgTenantRepository implements TenantRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateTenantInput): Promise<Tenant> {
    const { rows } = await this.db.query<TenantRow>(
      `INSERT INTO tenants (id, name, country, default_locale)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [input.id, input.name, input.country, input.defaultLocale],
    );
    // INSERT ... RETURNING selalu mengembalikan tepat satu baris.
    return toTenant(rows[0]!);
  }

  async findById(id: TenantId): Promise<Tenant | null> {
    const { rows } = await this.db.query<TenantRow>(
      `SELECT ${COLUMNS} FROM tenants WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? toTenant(row) : null;
  }
}

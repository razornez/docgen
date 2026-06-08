import type { Template, TemplateId, TenantId } from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface CreateTemplateInput {
  readonly id: TemplateId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly category: string;
}

/** Kursor keyset untuk pagination (docs/02): urut created_at DESC, id DESC. */
export interface TemplateCursor {
  readonly createdAt: Date;
  readonly id: TemplateId;
}

export interface ListTemplatesParams {
  readonly limit: number;
  readonly after?: TemplateCursor;
}

export interface TemplateRepository {
  create(input: CreateTemplateInput): Promise<Template>;
  /** Tenant-scoped: hanya menemukan template milik tenant tsb (isolasi, docs/13). */
  findById(tenantId: TenantId, id: TemplateId): Promise<Template | null>;
  /** SELECT ... FOR UPDATE (di dalam transaksi) untuk menomori versi secara aman. */
  lockById(tenantId: TenantId, id: TemplateId): Promise<Template | null>;
  setCurrentVersion(id: TemplateId, version: number): Promise<void>;
  list(tenantId: TenantId, params: ListTemplatesParams): Promise<Template[]>;
  /** Daftar kategori unik milik tenant (derive dari templates yang ada). */
  listCategories(tenantId: TenantId): Promise<string[]>;
  /** Salin default_templates ke tenant. Lewati jika nama sudah ada. */
  importDefaults(
    tenantId: TenantId,
    genId: () => string,
    genVersionId: () => string,
  ): Promise<number>;
}

interface TemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  current_version: number | null;
  created_at: Date;
  updated_at: Date;
}

function toTemplate(row: TemplateRow): Template {
  return {
    id: row.id as TemplateId,
    tenantId: row.tenant_id as TenantId,
    name: row.name,
    category: row.category,
    currentVersion: row.current_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  'id, tenant_id, name, category, current_version, created_at, updated_at';

export class PgTemplateRepository implements TemplateRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateTemplateInput): Promise<Template> {
    const { rows } = await this.db.query<TemplateRow>(
      `INSERT INTO templates (id, tenant_id, name, category)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [input.id, input.tenantId, input.name, input.category],
    );
    return toTemplate(rows[0]!);
  }

  async findById(tenantId: TenantId, id: TemplateId): Promise<Template | null> {
    const { rows } = await this.db.query<TemplateRow>(
      `SELECT ${COLUMNS} FROM templates WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    const row = rows[0];
    return row ? toTemplate(row) : null;
  }

  async lockById(tenantId: TenantId, id: TemplateId): Promise<Template | null> {
    const { rows } = await this.db.query<TemplateRow>(
      `SELECT ${COLUMNS} FROM templates
       WHERE id = $1 AND tenant_id = $2
       FOR UPDATE`,
      [id, tenantId],
    );
    const row = rows[0];
    return row ? toTemplate(row) : null;
  }

  async setCurrentVersion(id: TemplateId, version: number): Promise<void> {
    await this.db.query(
      `UPDATE templates SET current_version = $2 WHERE id = $1`,
      [id, version],
    );
  }

  async list(
    tenantId: TenantId,
    params: ListTemplatesParams,
  ): Promise<Template[]> {
    const after = params.after;
    const { rows } = await this.db.query<TemplateRow>(
      `SELECT ${COLUMNS} FROM templates
       WHERE tenant_id = $1
         AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::text))
       ORDER BY created_at DESC, id DESC
       LIMIT $4`,
      [tenantId, after?.createdAt ?? null, after?.id ?? null, params.limit],
    );
    return rows.map(toTemplate);
  }

  async listCategories(tenantId: TenantId): Promise<string[]> {
    const BASE = [
      'HR',
      'Legal',
      'Keuangan',
      'Operasional',
      'Marketing',
      'Umum',
    ];
    const { rows } = await this.db.query<{ category: string }>(
      `SELECT DISTINCT category FROM templates WHERE tenant_id = $1 ORDER BY category`,
      [tenantId],
    );
    const fromDb = rows.map((r) => r.category);
    // Merge: base order first, then any custom categories tenant has
    const all = [...BASE];
    for (const c of fromDb) {
      if (!all.includes(c)) all.push(c);
    }
    return all;
  }

  async importDefaults(
    tenantId: TenantId,
    genId: () => string,
    genVersionId: () => string,
  ): Promise<number> {
    const { rows: defaults } = await this.db.query<{
      name: string;
      category: string;
      body: string;
    }>(
      `SELECT name, category, body FROM default_templates ORDER BY sort_order`,
    );
    if (defaults.length === 0) return 0;

    const { rows: existing } = await this.db.query<{ name: string }>(
      `SELECT name FROM templates WHERE tenant_id = $1`,
      [tenantId],
    );
    const existingNames = new Set(existing.map((r) => r.name));

    let imported = 0;
    for (const dt of defaults) {
      if (existingNames.has(dt.name)) continue;
      const tplId = genId();
      const verId = genVersionId();
      await this.db.query(
        `INSERT INTO templates (id, tenant_id, name, category) VALUES ($1, $2, $3, $4)`,
        [tplId, tenantId, dt.name, dt.category],
      );
      await this.db.query(
        `INSERT INTO template_versions (id, template_id, version, body, variable_schema)
         VALUES ($1, $2, 1, $3, '{}')`,
        [verId, tplId, dt.body],
      );
      await this.db.query(
        `UPDATE templates SET current_version = 1 WHERE id = $1`,
        [tplId],
      );
      imported++;
    }
    return imported;
  }
}

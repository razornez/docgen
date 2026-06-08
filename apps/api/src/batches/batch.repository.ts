import type {
  Batch,
  BatchId,
  BatchStatus,
  TemplateId,
  TenantId,
} from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface CreateBatchInput {
  readonly id: BatchId;
  readonly tenantId: TenantId;
  readonly templateId: TemplateId;
  readonly templateVersion: number;
  readonly total: number;
  readonly creditsReserved: number;
  readonly webhookUrl: string | null;
}

export interface BatchRepository {
  create(input: CreateBatchInput): Promise<Batch>;
  findById(tenantId: TenantId, id: BatchId): Promise<Batch | null>;
  list(tenantId: TenantId, cursor?: string, limit?: number): Promise<Batch[]>;
}

interface BatchRow {
  id: string;
  tenant_id: string;
  template_id: string;
  template_version: number;
  status: string;
  total: number;
  completed: number;
  failed: number;
  credits_reserved: string;
  webhook_url: string | null;
  created_at: Date;
  completed_at: Date | null;
}

function toBatch(row: BatchRow): Batch {
  return {
    id: row.id as BatchId,
    tenantId: row.tenant_id as TenantId,
    templateId: row.template_id as TemplateId,
    templateVersion: row.template_version,
    status: row.status as BatchStatus,
    total: row.total,
    completed: row.completed,
    failed: row.failed,
    creditsReserved: Number(row.credits_reserved),
    webhookUrl: row.webhook_url,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

const COLS =
  'id, tenant_id, template_id, template_version, status, total, completed, failed, credits_reserved, webhook_url, created_at, completed_at';

export class PgBatchRepository implements BatchRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateBatchInput): Promise<Batch> {
    const { rows } = await this.db.query<BatchRow>(
      `INSERT INTO batches
         (id, tenant_id, template_id, template_version, total, credits_reserved, webhook_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${COLS}`,
      [
        input.id,
        input.tenantId,
        input.templateId,
        input.templateVersion,
        input.total,
        input.creditsReserved,
        input.webhookUrl,
      ],
    );
    return toBatch(rows[0]!);
  }

  async findById(tenantId: TenantId, id: BatchId): Promise<Batch | null> {
    const { rows } = await this.db.query<BatchRow>(
      `SELECT ${COLS} FROM batches WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    return rows[0] ? toBatch(rows[0]) : null;
  }

  async list(
    tenantId: TenantId,
    cursor?: string,
    limit = 20,
  ): Promise<Batch[]> {
    const params: unknown[] = [tenantId, limit + 1];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor);
      cursorClause = `AND created_at < (SELECT created_at FROM batches WHERE id = $${params.length})`;
    }
    const { rows } = await this.db.query<BatchRow>(
      `SELECT ${COLS} FROM batches WHERE tenant_id = $1 ${cursorClause}
       ORDER BY created_at DESC LIMIT $2`,
      params,
    );
    return rows.map(toBatch);
  }
}

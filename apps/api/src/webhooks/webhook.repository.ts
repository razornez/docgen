import type { TenantId } from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export type WebhookEvent =
  | 'batch.completed'
  | 'batch.partially_failed'
  | 'batch.failed'
  | 'balance.low'
  | 'document.failed';

export interface WebhookEndpoint {
  id: string;
  tenantId: TenantId;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: Date;
}

export interface CreateWebhookInput {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly url: string;
  readonly secret: string;
  readonly events: WebhookEvent[];
}

export interface WebhookRepository {
  create(input: CreateWebhookInput): Promise<WebhookEndpoint>;
  findById(tenantId: TenantId, id: string): Promise<WebhookEndpoint | null>;
  listByTenant(tenantId: TenantId): Promise<WebhookEndpoint[]>;
  listActiveByTenantAndEvent(
    tenantId: TenantId,
    event: WebhookEvent,
  ): Promise<WebhookEndpoint[]>;
  deactivate(tenantId: TenantId, id: string): Promise<WebhookEndpoint | null>;
}

interface WebhookRow {
  id: string;
  tenant_id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  created_at: Date;
}

function toEndpoint(row: WebhookRow): WebhookEndpoint {
  return {
    id: row.id,
    tenantId: row.tenant_id as TenantId,
    url: row.url,
    secret: row.secret,
    events: row.events as WebhookEvent[],
    active: row.active,
    createdAt: row.created_at,
  };
}

const COLS = 'id, tenant_id, url, secret, events, active, created_at';

export class PgWebhookRepository implements WebhookRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateWebhookInput): Promise<WebhookEndpoint> {
    const { rows } = await this.db.query<WebhookRow>(
      `INSERT INTO webhook_endpoints (id, tenant_id, url, secret, events)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLS}`,
      [input.id, input.tenantId, input.url, input.secret, input.events],
    );
    return toEndpoint(rows[0]!);
  }

  async findById(
    tenantId: TenantId,
    id: string,
  ): Promise<WebhookEndpoint | null> {
    const { rows } = await this.db.query<WebhookRow>(
      `SELECT ${COLS} FROM webhook_endpoints WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    return rows[0] ? toEndpoint(rows[0]) : null;
  }

  async listByTenant(tenantId: TenantId): Promise<WebhookEndpoint[]> {
    const { rows } = await this.db.query<WebhookRow>(
      `SELECT ${COLS} FROM webhook_endpoints WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(toEndpoint);
  }

  async listActiveByTenantAndEvent(
    tenantId: TenantId,
    event: WebhookEvent,
  ): Promise<WebhookEndpoint[]> {
    const { rows } = await this.db.query<WebhookRow>(
      `SELECT ${COLS} FROM webhook_endpoints
       WHERE tenant_id = $1 AND active = TRUE AND $2 = ANY(events)`,
      [tenantId, event],
    );
    return rows.map(toEndpoint);
  }

  async deactivate(
    tenantId: TenantId,
    id: string,
  ): Promise<WebhookEndpoint | null> {
    const { rows } = await this.db.query<WebhookRow>(
      `UPDATE webhook_endpoints SET active = FALSE WHERE id = $1 AND tenant_id = $2
       RETURNING ${COLS}`,
      [id, tenantId],
    );
    return rows[0] ? toEndpoint(rows[0]) : null;
  }
}

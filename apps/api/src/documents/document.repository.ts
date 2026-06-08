import type {
  BatchId,
  Document,
  DocumentId,
  TemplateId,
  TenantId,
} from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface CreateDocumentInput {
  readonly id: DocumentId;
  readonly tenantId: TenantId;
  readonly templateId: TemplateId;
  readonly templateVersion: number;
  readonly inputHash: string;
  readonly batchId?: BatchId | undefined;
  readonly itemRef?: string | undefined;
}

export interface DocumentRepository {
  create(input: CreateDocumentInput): Promise<Document>;
  findById(tenantId: TenantId, id: DocumentId): Promise<Document | null>;
  listByBatch(
    tenantId: TenantId,
    batchId: BatchId,
    cursor?: string,
    limit?: number,
  ): Promise<Document[]>;
}

interface DocumentRow {
  id: string;
  tenant_id: string;
  batch_id: string | null;
  item_ref: string | null;
  template_id: string;
  template_version: number;
  status: string;
  input_hash: string | null;
  storage_key: string | null;
  page_count: number | null;
  charged: boolean;
  error: string | null;
  created_at: Date;
  completed_at: Date | null;
}

function toDocument(row: DocumentRow): Document {
  return {
    id: row.id as DocumentId,
    tenantId: row.tenant_id as TenantId,
    batchId: (row.batch_id as BatchId) ?? null,
    itemRef: row.item_ref,
    templateId: row.template_id as TemplateId,
    templateVersion: row.template_version,
    status: row.status as Document['status'],
    inputHash: row.input_hash,
    storageKey: row.storage_key,
    pageCount: row.page_count,
    charged: row.charged,
    error: row.error,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

const COLUMNS =
  'id, tenant_id, batch_id, item_ref, template_id, template_version, status, input_hash, storage_key, page_count, charged, error, created_at, completed_at';

export class PgDocumentRepository implements DocumentRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateDocumentInput): Promise<Document> {
    const { rows } = await this.db.query<DocumentRow>(
      `INSERT INTO documents
         (id, tenant_id, template_id, template_version, input_hash, status, batch_id, item_ref)
       VALUES ($1, $2, $3, $4, $5, 'processing', $6, $7)
       RETURNING ${COLUMNS}`,
      [
        input.id,
        input.tenantId,
        input.templateId,
        input.templateVersion,
        input.inputHash,
        input.batchId ?? null,
        input.itemRef ?? null,
      ],
    );
    return toDocument(rows[0]!);
  }

  async findById(tenantId: TenantId, id: DocumentId): Promise<Document | null> {
    const { rows } = await this.db.query<DocumentRow>(
      `SELECT ${COLUMNS} FROM documents WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    return rows[0] ? toDocument(rows[0]) : null;
  }

  async listByBatch(
    tenantId: TenantId,
    batchId: BatchId,
    cursor?: string,
    limit = 50,
  ): Promise<Document[]> {
    const params: unknown[] = [tenantId, batchId, limit + 1];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor);
      cursorClause = `AND d.created_at < (SELECT created_at FROM documents WHERE id = $${params.length})`;
    }
    const { rows } = await this.db.query<DocumentRow>(
      `SELECT ${COLUMNS.split(', ')
        .map((c) => `d.${c}`)
        .join(', ')}
         FROM documents d
        WHERE d.tenant_id = $1 AND d.batch_id = $2 ${cursorClause}
        ORDER BY d.created_at ASC
        LIMIT $3`,
      params,
    );
    return rows.map(toDocument);
  }
}

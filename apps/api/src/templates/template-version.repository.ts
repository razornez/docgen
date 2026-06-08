import type {
  TemplateId,
  TemplateVersion,
  TemplateVersionId,
} from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface CreateTemplateVersionInput {
  readonly id: TemplateVersionId;
  readonly templateId: TemplateId;
  readonly version: number;
  readonly body: string;
  readonly variableSchema: unknown;
}

export interface TemplateVersionRepository {
  /** Membuat versi baru. Versi IMMUTABLE — tidak ada update/delete (docs/21). */
  create(input: CreateTemplateVersionInput): Promise<TemplateVersion>;
  findByTemplateAndVersion(
    templateId: TemplateId,
    version: number,
  ): Promise<TemplateVersion | null>;
}

interface TemplateVersionRow {
  id: string;
  template_id: string;
  version: number;
  engine: string;
  body: string;
  variable_schema: unknown;
  created_at: Date;
}

function toVersion(row: TemplateVersionRow): TemplateVersion {
  return {
    id: row.id as TemplateVersionId,
    templateId: row.template_id as TemplateId,
    version: row.version,
    engine: row.engine as TemplateVersion['engine'],
    body: row.body,
    variableSchema: row.variable_schema,
    createdAt: row.created_at,
  };
}

const COLUMNS =
  'id, template_id, version, engine, body, variable_schema, created_at';

export class PgTemplateVersionRepository implements TemplateVersionRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateTemplateVersionInput): Promise<TemplateVersion> {
    const { rows } = await this.db.query<TemplateVersionRow>(
      `INSERT INTO template_versions (id, template_id, version, body, variable_schema)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNS}`,
      [
        input.id,
        input.templateId,
        input.version,
        input.body,
        JSON.stringify(input.variableSchema),
      ],
    );
    return toVersion(rows[0]!);
  }

  async findByTemplateAndVersion(
    templateId: TemplateId,
    version: number,
  ): Promise<TemplateVersion | null> {
    const { rows } = await this.db.query<TemplateVersionRow>(
      `SELECT ${COLUMNS} FROM template_versions
       WHERE template_id = $1 AND version = $2`,
      [templateId, version],
    );
    const row = rows[0];
    return row ? toVersion(row) : null;
  }
}

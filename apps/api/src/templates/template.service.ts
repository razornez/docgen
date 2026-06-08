import { renderHtml, TemplateRenderError } from '@docgen/renderer';
import { AppError, Errors, ID_PREFIXES } from '@docgen/shared';
import type {
  IdGenerator,
  Template,
  TemplateId,
  TemplateVersion,
  TemplateVersionId,
  TenantId,
} from '@docgen/shared';
import { isUniqueViolation } from '../persistence/pg-errors.js';
import type { TemplateUnitOfWork } from '../persistence/template-unit-of-work.js';
import type { TemplateRepository } from './template.repository.js';
import type { TemplateVersionRepository } from './template-version.repository.js';

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

export interface CreateTemplateInput {
  readonly name: string;
  readonly category: string;
  readonly body: string;
  readonly schema: unknown;
}

export interface CreateVersionInput {
  readonly body: string;
  readonly schema: unknown;
}

export interface TemplateWithVersion {
  readonly template: Template;
  readonly version: TemplateVersion;
}

export interface ListTemplatesQuery {
  readonly limit?: number;
  readonly startingAfter?: string;
}

export interface TemplateListPage {
  readonly templates: Template[];
  readonly hasMore: boolean;
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(MAX_LIST_LIMIT, limit));
}

/**
 * Logika bisnis template (docs/07 Tahap 3, docs/02). Semua operasi disaring per
 * tenant dari context request (isolasi, docs/13). Versi bersifat IMMUTABLE:
 * perubahan = membuat versi baru, bukan mengedit yang lama (docs/21).
 */
export class TemplateService {
  constructor(
    private readonly uow: TemplateUnitOfWork,
    private readonly templateRepo: TemplateRepository,
    private readonly versionRepo: TemplateVersionRepository,
    private readonly idGen: IdGenerator,
  ) {}

  /** Membuat template + versi 1 dalam satu transaksi (atomik). */
  async createTemplate(
    tenantId: TenantId,
    input: CreateTemplateInput,
  ): Promise<TemplateWithVersion> {
    const templateId = this.idGen.generate(ID_PREFIXES.template) as TemplateId;
    const versionId = this.idGen.generate(
      ID_PREFIXES.templateVersion,
    ) as TemplateVersionId;

    try {
      return await this.uow.transaction(async (repos) => {
        const template = await repos.templates.create({
          id: templateId,
          tenantId,
          name: input.name,
          category: input.category,
        });
        const version = await repos.versions.create({
          id: versionId,
          templateId: template.id,
          version: 1,
          body: input.body,
          variableSchema: input.schema,
        });
        await repos.templates.setCurrentVersion(template.id, 1);
        return { template: { ...template, currentVersion: 1 }, version };
      });
    } catch (err) {
      if (isUniqueViolation(err, 'uq_templates_tenant_name')) {
        throw Errors.conflict('Template name already exists', 'name');
      }
      throw err;
    }
  }

  /**
   * Membuat versi baru (immutable) untuk template milik tenant. Penomoran versi
   * di-serialisasi lewat lock baris (FOR UPDATE) agar tidak bertabrakan.
   */
  async createVersion(
    tenantId: TenantId,
    templateId: TemplateId,
    input: CreateVersionInput,
  ): Promise<TemplateVersion> {
    const versionId = this.idGen.generate(
      ID_PREFIXES.templateVersion,
    ) as TemplateVersionId;

    return this.uow.transaction(async (repos) => {
      const template = await repos.templates.lockById(tenantId, templateId);
      if (!template) throw Errors.notFound('Template not found', 'id');

      const nextVersion = (template.currentVersion ?? 0) + 1;
      const version = await repos.versions.create({
        id: versionId,
        templateId: template.id,
        version: nextVersion,
        body: input.body,
        variableSchema: input.schema,
      });
      await repos.templates.setCurrentVersion(template.id, nextVersion);
      return version;
    });
  }

  /** Ambil template + versi terkini (tenant-scoped). */
  async getTemplate(
    tenantId: TenantId,
    templateId: TemplateId,
  ): Promise<TemplateWithVersion> {
    const template = await this.templateRepo.findById(tenantId, templateId);
    if (!template) throw Errors.notFound('Template not found', 'id');
    const version = await this.resolveVersion(template);
    return { template, version };
  }

  /** List template dengan cursor pagination (docs/02). */
  async listTemplates(
    tenantId: TenantId,
    query: ListTemplatesQuery,
  ): Promise<TemplateListPage> {
    const limit = clampLimit(query.limit);

    let after;
    if (query.startingAfter !== undefined) {
      const cursor = await this.templateRepo.findById(
        tenantId,
        query.startingAfter as TemplateId,
      );
      if (!cursor) {
        throw Errors.invalidRequest('Invalid cursor', 'starting_after');
      }
      after = { createdAt: cursor.createdAt, id: cursor.id };
    }

    // Ambil limit+1 untuk menentukan has_more tanpa COUNT.
    const rows = await this.templateRepo.list(tenantId, {
      limit: limit + 1,
      ...(after ? { after } : {}),
    });
    const hasMore = rows.length > limit;
    return { templates: hasMore ? rows.slice(0, limit) : rows, hasMore };
  }

  /**
   * Preview: isi `data` ke body template (mesin polos) lalu kembalikan HTML.
   * TIDAK ditagih (docs/02). Default ke versi terkini; bisa pilih versi tertentu.
   */
  async preview(
    tenantId: TenantId,
    templateId: TemplateId,
    data: unknown,
    version?: number,
  ): Promise<string> {
    const template = await this.templateRepo.findById(tenantId, templateId);
    if (!template) throw Errors.notFound('Template not found', 'id');
    const ver = await this.resolveVersion(template, version);

    try {
      return renderHtml(ver.body, data);
    } catch (err) {
      if (err instanceof TemplateRenderError) {
        // Template milik klien yang rusak → 422 (bukan 5xx sistem).
        throw new AppError('template_render_error', err.message, {
          httpStatus: 422,
        });
      }
      throw err;
    }
  }

  /** Daftar kategori unik tenant (base + custom). */
  async listCategories(tenantId: TenantId): Promise<string[]> {
    return this.templateRepo.listCategories(tenantId);
  }

  /**
   * Salin default_templates ke tenant baru. Idempoten: skip nama yang sudah ada.
   * Dipanggil fire-and-forget dari registration route (tidak perlu await di caller).
   */
  async importDefaults(tenantId: TenantId): Promise<number> {
    return this.templateRepo.importDefaults(
      tenantId,
      () => this.idGen.generate(ID_PREFIXES.template),
      () => this.idGen.generate(ID_PREFIXES.templateVersion),
    );
  }

  private async resolveVersion(
    template: Template,
    version?: number,
  ): Promise<TemplateVersion> {
    const versionNumber = version ?? template.currentVersion;
    if (versionNumber == null) {
      throw Errors.notFound('Template has no versions', 'version');
    }
    const ver = await this.versionRepo.findByTemplateAndVersion(
      template.id,
      versionNumber,
    );
    if (!ver) throw Errors.notFound('Template version not found', 'version');
    return ver;
  }
}

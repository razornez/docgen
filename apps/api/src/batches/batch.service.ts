import { createHash } from 'node:crypto';
import { Errors, ID_PREFIXES, buildStorageKey } from '@docgen/shared';
import type {
  ApiKeyMode,
  Batch,
  BatchId,
  Clock,
  Document,
  DocumentId,
  IdGenerator,
  RenderOptions,
  TemplateId,
  TenantId,
} from '@docgen/shared';
import type { RenderEnqueuer } from '../documents/render.service.js';
import type { TemplateRepository } from '../templates/template.repository.js';
import type { TemplateVersionRepository } from '../templates/template-version.repository.js';
import type { DocumentRepository } from '../documents/document.repository.js';
import type { WalletService } from '../wallets/wallet.service.js';
import type { BatchRepository } from './batch.repository.js';

const MAX_BATCH_SIZE = 500;

export interface BatchItem {
  readonly ref: string;
  readonly data: unknown;
}

export interface CreateBatchInput {
  readonly templateId: TemplateId;
  readonly version?: number;
  readonly items: BatchItem[];
  readonly options: RenderOptions;
  readonly webhookUrl: string | null;
}

export interface BatchService {
  create(
    tenantId: TenantId,
    input: CreateBatchInput,
    mode: ApiKeyMode,
  ): Promise<Batch>;
  get(tenantId: TenantId, id: BatchId): Promise<Batch>;
  list(
    tenantId: TenantId,
    cursor?: string,
    limit?: number,
  ): Promise<{ batches: Batch[]; hasMore: boolean }>;
  listDocuments(
    tenantId: TenantId,
    batchId: BatchId,
    cursor?: string,
    limit?: number,
  ): Promise<{ documents: Document[]; hasMore: boolean }>;
}

/**
 * Orkestrasi generate massal (docs/06). Alur:
 * 1. Validasi template + hitung kredit yang dibutuhkan.
 * 2. Reserve seluruh kredit sekaligus (fail-fast bila saldo kurang).
 * 3. Buat baris batch, lalu baris dokumen, lalu enqueue semua job.
 * Mode test gratis (tidak memotong kredit).
 */
export class DefaultBatchService implements BatchService {
  constructor(
    private readonly batches: BatchRepository,
    private readonly templates: TemplateRepository,
    private readonly versions: TemplateVersionRepository,
    private readonly documents: DocumentRepository,
    private readonly queue: RenderEnqueuer,
    private readonly wallet: WalletService,
    private readonly idGen: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async create(
    tenantId: TenantId,
    input: CreateBatchInput,
    mode: ApiKeyMode = 'live',
  ): Promise<Batch> {
    if (input.items.length === 0) {
      throw Errors.invalidRequest(
        'Batch harus memiliki setidaknya 1 item',
        'items',
      );
    }
    if (input.items.length > MAX_BATCH_SIZE) {
      throw Errors.invalidRequest(
        `Batch tidak boleh melebihi ${MAX_BATCH_SIZE} item`,
        'items',
      );
    }

    const template = await this.templates.findById(tenantId, input.templateId);
    if (!template) throw Errors.notFound('Template not found', 'template');

    const version = input.version ?? template.currentVersion;
    if (version == null)
      throw Errors.notFound('Template has no versions', 'version');
    const ver = await this.versions.findByTemplateAndVersion(
      template.id,
      version,
    );
    if (!ver) throw Errors.notFound('Template version not found', 'version');

    const total = input.items.length;
    const batchId = this.idGen.generate(ID_PREFIXES.batch) as BatchId;

    // Reserve credits upfront — fail fast if insufficient (docs/06).
    if (mode === 'live') {
      await this.wallet.reserveBatch(tenantId, batchId, total);
    }

    const batch = await this.batches.create({
      id: batchId,
      tenantId,
      templateId: template.id,
      templateVersion: version,
      total,
      creditsReserved: mode === 'live' ? total : 0,
      webhookUrl: input.webhookUrl,
    });

    // Create document rows + enqueue jobs for all items.
    const now = this.clock.now();
    for (const item of input.items) {
      const documentId = this.idGen.generate(
        ID_PREFIXES.document,
      ) as DocumentId;
      const inputHash = createHash('sha256')
        .update(JSON.stringify({ t: template.id, v: version, d: item.data }))
        .digest('hex');
      const storageKey = buildStorageKey(tenantId, documentId, now);

      await this.documents.create({
        id: documentId,
        tenantId,
        templateId: template.id,
        templateVersion: version,
        inputHash,
        batchId,
        itemRef: item.ref,
      });

      // Fire-and-forget enqueue: batch items are processed async by worker.
      await this.queue.enqueue({
        documentId,
        tenantId,
        templateId: template.id,
        version,
        data: item.data,
        options: input.options,
        storageKey,
        batchId,
      });
    }

    return batch;
  }

  async get(tenantId: TenantId, id: BatchId): Promise<Batch> {
    const batch = await this.batches.findById(tenantId, id);
    if (!batch) throw Errors.notFound('Batch not found', 'id');
    return batch;
  }

  async list(
    tenantId: TenantId,
    cursor?: string,
    limit = 20,
  ): Promise<{ batches: Batch[]; hasMore: boolean }> {
    const rows = await this.batches.list(tenantId, cursor, limit);
    const hasMore = rows.length > limit;
    return { batches: rows.slice(0, limit), hasMore };
  }

  async listDocuments(
    tenantId: TenantId,
    batchId: BatchId,
    cursor?: string,
    limit = 50,
  ): Promise<{ documents: Document[]; hasMore: boolean }> {
    const batch = await this.batches.findById(tenantId, batchId);
    if (!batch) throw Errors.notFound('Batch not found', 'id');
    const rows = await this.documents.listByBatch(
      tenantId,
      batchId,
      cursor,
      limit,
    );
    const hasMore = rows.length > limit;
    return { documents: rows.slice(0, limit), hasMore };
  }
}

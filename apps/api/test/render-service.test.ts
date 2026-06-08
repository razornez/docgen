import { PrefixedIdGenerator, SystemClock } from '@docgen/shared';
import type {
  Document,
  DocumentId,
  RenderJobData,
  RenderJobResult,
  StoragePort,
  Template,
  TemplateId,
  TemplateVersion,
  TenantId,
} from '@docgen/shared';
import { describe, expect, it } from 'vitest';
import type {
  CreateDocumentInput,
  DocumentRepository,
} from '../src/documents/document.repository.js';
import {
  RenderService,
  type RenderEnqueuer,
} from '../src/documents/render.service.js';
import type { TemplateRepository } from '../src/templates/template.repository.js';
import type { TemplateVersionRepository } from '../src/templates/template-version.repository.js';
import type { CreditGate } from '../src/wallets/wallet.service.js';

const TENANT_A = 'ten_a' as TenantId;
const TENANT_B = 'ten_b' as TenantId;
const EPOCH = new Date('2026-01-01T00:00:00.000Z');

function makeTemplate(id: string, tenantId: TenantId): Template {
  return {
    id: id as TemplateId,
    tenantId,
    name: 'invoice',
    currentVersion: 1,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  };
}

class FakeTemplateRepo implements TemplateRepository {
  constructor(private readonly templates: Template[]) {}
  async findById(tenantId: TenantId, id: TemplateId): Promise<Template | null> {
    return (
      this.templates.find((t) => t.id === id && t.tenantId === tenantId) ?? null
    );
  }
  create(): Promise<Template> {
    throw new Error('unused');
  }
  lockById(): Promise<Template | null> {
    throw new Error('unused');
  }
  setCurrentVersion(): Promise<void> {
    throw new Error('unused');
  }
  list(): Promise<Template[]> {
    throw new Error('unused');
  }
}

class FakeVersionRepo implements TemplateVersionRepository {
  constructor(private readonly hasVersion: boolean) {}
  async findByTemplateAndVersion(
    templateId: TemplateId,
    version: number,
  ): Promise<TemplateVersion | null> {
    if (!this.hasVersion) return null;
    return {
      id: 'tver_1' as TemplateVersion['id'],
      templateId,
      version,
      engine: 'html',
      body: '<h1>{{x}}</h1>',
      variableSchema: {},
      createdAt: EPOCH,
    };
  }
  create(): Promise<TemplateVersion> {
    throw new Error('unused');
  }
}

class FakeDocumentRepo implements DocumentRepository {
  readonly docs = new Map<string, Document>();
  async create(input: CreateDocumentInput): Promise<Document> {
    const doc: Document = {
      id: input.id,
      tenantId: input.tenantId,
      batchId: null,
      templateId: input.templateId,
      templateVersion: input.templateVersion,
      status: 'processing',
      inputHash: input.inputHash,
      storageKey: null,
      pageCount: null,
      charged: false,
      error: null,
      createdAt: EPOCH,
      completedAt: null,
    };
    this.docs.set(input.id, doc);
    return doc;
  }
  async findById(tenantId: TenantId, id: DocumentId): Promise<Document | null> {
    const doc = this.docs.get(id);
    return doc && doc.tenantId === tenantId ? doc : null;
  }
  async listByBatch(): Promise<Document[]> {
    return [];
  }
  complete(id: DocumentId, storageKey: string, pageCount: number): void {
    const doc = this.docs.get(id);
    if (doc) {
      this.docs.set(id, {
        ...doc,
        status: 'completed',
        storageKey,
        pageCount,
        completedAt: EPOCH,
      });
    }
  }
}

const fakeStorage: StoragePort = {
  put: () => Promise.resolve(),
  signedUrl: (key) => Promise.resolve(`https://signed.example/${key}`),
  delete: () => Promise.resolve(),
};

/** CreditGate palsu: tidak memotong saldo, tidak melempar error. */
class FakeCreditGate implements CreditGate {
  reserved: DocumentId[] = [];
  refunded: DocumentId[] = [];
  charged: DocumentId[] = [];
  shouldFail = false;

  async reserve(_tenantId: TenantId, documentId: DocumentId): Promise<number> {
    if (this.shouldFail)
      throw Object.assign(new Error('Saldo tidak cukup'), {
        httpStatus: 402,
        type: 'insufficient_credit',
      });
    this.reserved.push(documentId);
    return 99; // saldo tersisa setelah reserve
  }
  async refund(_tenantId: TenantId, documentId: DocumentId): Promise<void> {
    this.refunded.push(documentId);
  }
  async markCharged(
    _tenantId: TenantId,
    documentId: DocumentId,
  ): Promise<void> {
    this.charged.push(documentId);
  }
}

class SuccessEnqueuer implements RenderEnqueuer {
  lastJob: RenderJobData | undefined;
  constructor(private readonly docs: FakeDocumentRepo) {}
  enqueueAndWait(data: RenderJobData): Promise<RenderJobResult> {
    this.lastJob = data;
    this.docs.complete(data.documentId, data.storageKey, 3);
    return Promise.resolve({ storageKey: data.storageKey, pageCount: 3 });
  }
  enqueue(_data: RenderJobData): Promise<void> {
    return Promise.resolve();
  }
}

class FailingEnqueuer implements RenderEnqueuer {
  constructor(private readonly message: string) {}
  enqueueAndWait(): Promise<RenderJobResult> {
    return Promise.reject(new Error(this.message));
  }
  enqueue(): Promise<void> {
    return Promise.resolve();
  }
}

function makeService(opts: {
  templates?: Template[];
  hasVersion?: boolean;
  enqueuer?: RenderEnqueuer;
  docs?: FakeDocumentRepo;
  credits?: FakeCreditGate;
}) {
  const docs = opts.docs ?? new FakeDocumentRepo();
  const enqueuer = opts.enqueuer ?? new SuccessEnqueuer(docs);
  const credits = opts.credits ?? new FakeCreditGate();
  const service = new RenderService(
    new FakeTemplateRepo(opts.templates ?? [makeTemplate('tpl_1', TENANT_A)]),
    new FakeVersionRepo(opts.hasVersion ?? true),
    docs,
    enqueuer,
    fakeStorage,
    credits,
    new PrefixedIdGenerator(),
    new SystemClock(),
    { timeoutMs: 5000, signedUrlTtlSeconds: 900 },
  );
  return { service, docs, enqueuer, credits };
}

describe('RenderService.render (mode live)', () => {
  it('sukses: dokumen completed + signed URL + kredit dicadangkan & ditagih', async () => {
    const docs = new FakeDocumentRepo();
    const enqueuer = new SuccessEnqueuer(docs);
    const credits = new FakeCreditGate();
    const { service } = makeService({ docs, enqueuer, credits });

    const result = await service.render(
      TENANT_A,
      {
        templateId: 'tpl_1' as TemplateId,
        data: { x: 'hi' },
        options: { format: 'A4' },
      },
      'live',
    );

    expect(result.document.status).toBe('completed');
    expect(result.document.pageCount).toBe(3);
    expect(result.outputUrl).toContain('https://signed.example/');
    expect(result.creditsRemaining).toBe(99);
    expect(enqueuer.lastJob?.tenantId).toBe(TENANT_A);
    expect(credits.reserved).toHaveLength(1);
    expect(credits.charged).toHaveLength(1);
    expect(credits.refunded).toHaveLength(0);
  });

  it('mode test: tidak memotong kredit', async () => {
    const credits = new FakeCreditGate();
    const { service } = makeService({ credits });

    const result = await service.render(
      TENANT_A,
      { templateId: 'tpl_1' as TemplateId, data: {}, options: {} },
      'test',
    );

    expect(result.document.status).toBe('completed');
    expect(result.creditsRemaining).toBeNull();
    expect(credits.reserved).toHaveLength(0);
    expect(credits.charged).toHaveLength(0);
  });

  it('render gagal (mode live): refund kredit', async () => {
    const credits = new FakeCreditGate();
    const { service } = makeService({
      enqueuer: new FailingEnqueuer('boom'),
      credits,
    });

    await expect(
      service.render(
        TENANT_A,
        { templateId: 'tpl_1' as TemplateId, data: {}, options: {} },
        'live',
      ),
    ).rejects.toMatchObject({ type: 'render_failed', httpStatus: 500 });

    expect(credits.reserved).toHaveLength(1);
    expect(credits.refunded).toHaveLength(1);
    expect(credits.charged).toHaveLength(0);
  });

  it('template milik tenant lain → 404 (isolasi)', async () => {
    const { service } = makeService({
      templates: [makeTemplate('tpl_1', TENANT_B)],
    });
    await expect(
      service.render(TENANT_A, {
        templateId: 'tpl_1' as TemplateId,
        data: {},
        options: {},
      }),
    ).rejects.toMatchObject({ type: 'not_found', httpStatus: 404 });
  });

  it('versi tidak ada → 404', async () => {
    const { service } = makeService({ hasVersion: false });
    await expect(
      service.render(TENANT_A, {
        templateId: 'tpl_1' as TemplateId,
        data: {},
        options: {},
      }),
    ).rejects.toMatchObject({ type: 'not_found', httpStatus: 404 });
  });

  it('template rusak di worker → 422 template_render_error', async () => {
    const { service } = makeService({
      enqueuer: new FailingEnqueuer(
        'template_render_error: helper tak dikenal',
      ),
    });
    await expect(
      service.render(TENANT_A, {
        templateId: 'tpl_1' as TemplateId,
        data: {},
        options: {},
      }),
    ).rejects.toMatchObject({ type: 'template_render_error', httpStatus: 422 });
  });

  it('timeout job → 504', async () => {
    const { service } = makeService({
      enqueuer: new FailingEnqueuer('Job render timed out before finishing'),
    });
    await expect(
      service.render(TENANT_A, {
        templateId: 'tpl_1' as TemplateId,
        data: {},
        options: {},
      }),
    ).rejects.toMatchObject({ type: 'render_timeout', httpStatus: 504 });
  });

  it('kegagalan lain → 500 render_failed', async () => {
    const { service } = makeService({ enqueuer: new FailingEnqueuer('boom') });
    await expect(
      service.render(TENANT_A, {
        templateId: 'tpl_1' as TemplateId,
        data: {},
        options: {},
      }),
    ).rejects.toMatchObject({ type: 'render_failed', httpStatus: 500 });
  });
});

describe('RenderService.getDocument', () => {
  it('dokumen completed → terbitkan signed URL', async () => {
    const docs = new FakeDocumentRepo();
    const { service } = makeService({
      docs,
      enqueuer: new SuccessEnqueuer(docs),
    });
    const created = await service.render(TENANT_A, {
      templateId: 'tpl_1' as TemplateId,
      data: {},
      options: {},
    });
    const fetched = await service.getDocument(
      TENANT_A,
      created.document.id as DocumentId,
    );
    expect(fetched.outputUrl).toContain('https://signed.example/');
  });

  it('dokumen tenant lain → 404', async () => {
    const { service } = makeService({});
    await expect(
      service.getDocument(TENANT_B, 'doc_tidakada' as DocumentId),
    ).rejects.toMatchObject({ type: 'not_found', httpStatus: 404 });
  });
});

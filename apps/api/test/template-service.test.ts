import { PrefixedIdGenerator } from '@docgen/shared';
import type {
  Template,
  TemplateId,
  TemplateVersion,
  TenantId,
} from '@docgen/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  TemplateRepositories,
  TemplateUnitOfWork,
} from '../src/persistence/template-unit-of-work.js';
import type {
  CreateTemplateVersionInput,
  TemplateVersionRepository,
} from '../src/templates/template-version.repository.js';
import type {
  CreateTemplateInput,
  ListTemplatesParams,
  TemplateRepository,
} from '../src/templates/template.repository.js';
import { TemplateService } from '../src/templates/template.service.js';

const TENANT_A = 'ten_aaa' as TenantId;
const TENANT_B = 'ten_bbb' as TenantId;

// Toko in-memory bersama antara repo "pool" dan repo "transaksi".
class Store {
  readonly templates = new Map<string, Template>();
  readonly versions = new Map<string, TemplateVersion>();
  seq = 0;
}

class FakeTemplateRepo implements TemplateRepository {
  constructor(private readonly store: Store) {}

  async create(input: CreateTemplateInput): Promise<Template> {
    const template: Template = {
      id: input.id,
      tenantId: input.tenantId,
      name: input.name,
      currentVersion: null,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, this.store.seq++)),
      updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
    };
    this.store.templates.set(template.id, template);
    return template;
  }

  async findById(tenantId: TenantId, id: TemplateId): Promise<Template | null> {
    const t = this.store.templates.get(id);
    return t && t.tenantId === tenantId ? t : null;
  }

  lockById(tenantId: TenantId, id: TemplateId): Promise<Template | null> {
    return this.findById(tenantId, id);
  }

  async setCurrentVersion(id: TemplateId, version: number): Promise<void> {
    const t = this.store.templates.get(id);
    if (t) t.currentVersion = version;
  }

  async list(
    tenantId: TenantId,
    params: ListTemplatesParams,
  ): Promise<Template[]> {
    const all = [...this.store.templates.values()]
      .filter((t) => t.tenantId === tenantId)
      .sort((a, b) => {
        const d = b.createdAt.getTime() - a.createdAt.getTime();
        if (d !== 0) return d;
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });
    let start = 0;
    if (params.after) {
      const idx = all.findIndex((t) => t.id === params.after!.id);
      start = idx >= 0 ? idx + 1 : all.length;
    }
    return all.slice(start, start + params.limit);
  }
}

class FakeVersionRepo implements TemplateVersionRepository {
  constructor(private readonly store: Store) {}

  async create(input: CreateTemplateVersionInput): Promise<TemplateVersion> {
    const version: TemplateVersion = {
      id: input.id,
      templateId: input.templateId,
      version: input.version,
      engine: 'html',
      body: input.body,
      variableSchema: input.variableSchema,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
    };
    this.store.versions.set(`${input.templateId}:${input.version}`, version);
    return version;
  }

  async findByTemplateAndVersion(
    templateId: TemplateId,
    version: number,
  ): Promise<TemplateVersion | null> {
    return this.store.versions.get(`${templateId}:${version}`) ?? null;
  }
}

function makeService() {
  const store = new Store();
  const templateRepo = new FakeTemplateRepo(store);
  const versionRepo = new FakeVersionRepo(store);
  const uow: TemplateUnitOfWork = {
    transaction<T>(
      fn: (repos: TemplateRepositories) => Promise<T>,
    ): Promise<T> {
      return fn({ templates: templateRepo, versions: versionRepo });
    },
  };
  const service = new TemplateService(
    uow,
    templateRepo,
    versionRepo,
    new PrefixedIdGenerator(),
  );
  return { service, store };
}

describe('TemplateService — create & versioning', () => {
  it('membuat template + versi 1; getTemplate mengembalikannya', async () => {
    const { service } = makeService();
    const created = await service.createTemplate(TENANT_A, {
      name: 'invoice',
      body: '<p>{{name}}</p>',
      schema: { type: 'object' },
    });
    expect(created.template.id.startsWith('tpl_')).toBe(true);
    expect(created.template.currentVersion).toBe(1);
    expect(created.version.version).toBe(1);
    expect(created.version.id.startsWith('tver_')).toBe(true);

    const got = await service.getTemplate(TENANT_A, created.template.id);
    expect(got.version.body).toBe('<p>{{name}}</p>');
  });

  it('versi baru naik nomor & jadi current; versi lama tetap utuh (immutable)', async () => {
    const { service } = makeService();
    const created = await service.createTemplate(TENANT_A, {
      name: 'invoice',
      body: 'v1',
      schema: {},
    });
    const v2 = await service.createVersion(TENANT_A, created.template.id, {
      body: 'v2',
      schema: {},
    });
    expect(v2.version).toBe(2);

    const got = await service.getTemplate(TENANT_A, created.template.id);
    expect(got.template.currentVersion).toBe(2);
    expect(got.version.body).toBe('v2');

    // Preview versi 1 tetap mengembalikan body lama (immutable).
    expect(await service.preview(TENANT_A, created.template.id, {}, 1)).toBe(
      'v1',
    );
  });

  it('nama template duplikat dipetakan ke 409 conflict', async () => {
    // Fake repo tidak menegakkan unique; simulasikan pelanggaran lewat error pg
    // pada lapisan transaksi (sama seperti yang dilempar Postgres: SQLSTATE 23505).
    const store = new Store();
    const uow: TemplateUnitOfWork = {
      transaction(): Promise<never> {
        return Promise.reject({
          code: '23505',
          constraint: 'uq_templates_tenant_name',
        });
      },
    };
    const svc = new TemplateService(
      uow,
      new FakeTemplateRepo(store),
      new FakeVersionRepo(store),
      new PrefixedIdGenerator(),
    );
    await expect(
      svc.createTemplate(TENANT_A, { name: 'dup', body: 'x', schema: {} }),
    ).rejects.toMatchObject({ type: 'conflict', httpStatus: 409 });
  });
});

describe('TemplateService — isolasi tenant (docs/13)', () => {
  let svc: TemplateService;
  let templateIdB: TemplateId;

  beforeEach(async () => {
    const made = makeService();
    svc = made.service;
    const created = await svc.createTemplate(TENANT_B, {
      name: 'secret',
      body: 'rahasia {{x}}',
      schema: {},
    });
    templateIdB = created.template.id;
  });

  it('tenant lain tidak bisa get/preview/buat-versi template milik B → 404', async () => {
    await expect(svc.getTemplate(TENANT_A, templateIdB)).rejects.toMatchObject({
      type: 'not_found',
    });
    await expect(svc.preview(TENANT_A, templateIdB, {})).rejects.toMatchObject({
      type: 'not_found',
    });
    await expect(
      svc.createVersion(TENANT_A, templateIdB, { body: 'x', schema: {} }),
    ).rejects.toMatchObject({ type: 'not_found' });
  });
});

describe('TemplateService — preview (mesin polos)', () => {
  it('mengisi data ke HTML apa adanya; var hilang → kosong', async () => {
    const { service } = makeService();
    const t = await service.createTemplate(TENANT_A, {
      name: 'greet',
      body: '<p>Hi {{name}}</p>[{{missing}}]',
      schema: {},
    });
    expect(
      await service.preview(TENANT_A, t.template.id, { name: 'Sam' }),
    ).toBe('<p>Hi Sam</p>[]');
  });

  it('template rusak (helper tak dikenal) → 422 template_render_error', async () => {
    const { service } = makeService();
    const t = await service.createTemplate(TENANT_A, {
      name: 'broken',
      body: '{{rupiah total}}',
      schema: {},
    });
    await expect(
      service.preview(TENANT_A, t.template.id, { total: 1000 }),
    ).rejects.toMatchObject({ type: 'template_render_error', httpStatus: 422 });
  });
});

describe('TemplateService — list cursor pagination', () => {
  it('menghormati limit, has_more, dan starting_after', async () => {
    const { service } = makeService();
    const created: TemplateId[] = [];
    for (const name of ['t1', 't2', 't3']) {
      const c = await service.createTemplate(TENANT_A, {
        name,
        body: 'x',
        schema: {},
      });
      created.push(c.template.id);
    }

    const page1 = await service.listTemplates(TENANT_A, { limit: 2 });
    expect(page1.templates).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const lastId = page1.templates[page1.templates.length - 1]!.id;
    const page2 = await service.listTemplates(TENANT_A, {
      limit: 2,
      startingAfter: lastId,
    });
    expect(page2.templates).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    // Tidak ada tumpang tindih antar halaman.
    const ids1 = page1.templates.map((t) => t.id);
    expect(ids1).not.toContain(page2.templates[0]!.id);
  });

  it('cursor tak dikenal → 400 invalid_request', async () => {
    const { service } = makeService();
    await expect(
      service.listTemplates(TENANT_A, { startingAfter: 'tpl_nope' }),
    ).rejects.toMatchObject({ type: 'invalid_request', httpStatus: 400 });
  });
});

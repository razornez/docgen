import type { TemplateId } from '@docgen/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import { presentTemplate, presentTemplateVersion } from '../http/presenters.js';
import type { TemplateService } from './template.service.js';

const CreateTemplateBody = z.object({
  name: z.string().trim().min(1).max(200),
  body: z.string().min(1),
  category: z.string().trim().min(1).max(60).optional().default('Umum'),
  // Engine hanya 'html' (CHECK di DDL). Opsional, default 'html'.
  engine: z.literal('html').optional(),
  // Kontrak bentuk data — disimpan sebagai DOKUMENTASI, tidak divalidasi (docs/00).
  schema: z.unknown().optional(),
});

const CreateVersionBody = z.object({
  body: z.string().min(1),
  schema: z.unknown().optional(),
});

const PreviewBody = z.object({
  // Data contoh untuk diisi ke template (mesin polos). Objek JSON sembarang.
  data: z.record(z.string(), z.unknown()).default({}),
  version: z.coerce.number().int().positive().optional(),
});

const IdParams = z.object({ id: z.string().trim().min(1) });

const ListQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  starting_after: z.string().trim().min(1).optional(),
});

/**
 * Rute template terproteksi (docs/02, docs/07 Tahap 3). Semua disaring ke tenant
 * dari context request (isolasi, docs/13). Route tipis: parse → service → response.
 */
export function registerTemplateRoutes(
  app: FastifyInstance,
  service: TemplateService,
): void {
  // Buat template + versi 1.
  app.post('/templates', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = CreateTemplateBody.parse(request.body);
    const result = await service.createTemplate(ctx.tenantId, {
      name: body.name,
      category: body.category,
      body: body.body,
      schema: body.schema ?? {},
    });
    reply.code(201);
    return {
      template: presentTemplate(result.template),
      version: presentTemplateVersion(result.version),
    };
  });

  // List template (cursor pagination).
  app.get('/templates', async (request) => {
    const ctx = requireAuth(request);
    const query = ListQuery.parse(request.query);
    const page = await service.listTemplates(ctx.tenantId, {
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
      ...(query.starting_after !== undefined
        ? { startingAfter: query.starting_after }
        : {}),
    });
    return {
      data: page.templates.map(presentTemplate),
      has_more: page.hasMore,
    };
  });

  // Ambil satu template + versi terkini.
  app.get('/templates/:id', async (request) => {
    const ctx = requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const result = await service.getTemplate(ctx.tenantId, id as TemplateId);
    return {
      template: presentTemplate(result.template),
      version: presentTemplateVersion(result.version),
    };
  });

  // Buat versi baru (immutable).
  app.post('/templates/:id/versions', async (request, reply) => {
    const ctx = requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const body = CreateVersionBody.parse(request.body);
    const version = await service.createVersion(
      ctx.tenantId,
      id as TemplateId,
      {
        body: body.body,
        schema: body.schema ?? {},
      },
    );
    reply.code(201);
    return { version: presentTemplateVersion(version) };
  });

  // Daftar kategori unik milik tenant (derive dari templates + base set).
  app.get('/template-categories', async (request) => {
    const ctx = requireAuth(request);
    const categories = await service.listCategories(ctx.tenantId);
    return { categories };
  });

  // Impor template default ke tenant (idempoten, skip nama yang sudah ada).
  app.post('/templates/import-defaults', async (request) => {
    const ctx = requireAuth(request);
    const count = await service.importDefaults(ctx.tenantId);
    return { imported: count };
  });

  // Preview: render data contoh ke HTML. Tidak ditagih (docs/02).
  app.post('/templates/:id/preview', async (request, reply) => {
    const ctx = requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const body = PreviewBody.parse(request.body ?? {});
    const html = await service.preview(
      ctx.tenantId,
      id as TemplateId,
      body.data,
      body.version,
    );
    reply.type('text/html; charset=utf-8');
    return html;
  });
}

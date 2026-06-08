import type { BatchId, StoragePort, TemplateId } from '@docgen/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import { presentDocument } from '../http/presenters.js';
import type { BatchService } from './batch.service.js';

const MarginSchema = z.object({
  top: z.string().optional(),
  right: z.string().optional(),
  bottom: z.string().optional(),
  left: z.string().optional(),
});

const OptionsSchema = z.object({
  format: z.enum(['A4', 'A5', 'Letter', 'Legal']).optional(),
  landscape: z.boolean().optional(),
  printBackground: z.boolean().optional(),
  margin: MarginSchema.optional(),
});

const BatchBody = z.object({
  template: z.string().trim().min(1),
  version: z.coerce.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        ref: z.string().trim().min(1).max(128),
        data: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .min(1)
    .max(500),
  options: OptionsSchema.optional(),
  webhook_url: z.string().url().optional(),
});

const IdParams = z.object({ id: z.string().trim().min(1) });
const CursorQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function presentBatch(b: Awaited<ReturnType<BatchService['get']>>) {
  return {
    id: b.id,
    status: b.status,
    total: b.total,
    completed: b.completed,
    failed: b.failed,
    credits_reserved: b.creditsReserved,
    webhook_url: b.webhookUrl,
    created_at: b.createdAt.toISOString(),
    completed_at: b.completedAt ? b.completedAt.toISOString() : null,
  };
}

/**
 * Rute batch terproteksi (docs/06). POST = submit massal async; GET = polling
 * status; GET /documents = manifest item. Kredit dicadangkan penuh saat submit.
 */
export function registerBatchRoutes(
  app: FastifyInstance,
  service: BatchService,
  storage: StoragePort,
): void {
  // Submit batch baru.
  app.post('/batches', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = BatchBody.parse(request.body);
    const batch = await service.create(
      ctx.tenantId,
      {
        templateId: body.template as TemplateId,
        ...(body.version !== undefined ? { version: body.version } : {}),
        items: body.items,
        options: body.options ?? {},
        webhookUrl: body.webhook_url ?? null,
      },
      ctx.mode,
    );
    reply.code(202);
    return presentBatch(batch);
  });

  // Daftar batch milik tenant (cursor pagination).
  app.get('/batches', async (request) => {
    const ctx = requireAuth(request);
    const { cursor, limit } = CursorQuery.parse(request.query);
    const result = await service.list(ctx.tenantId, cursor, limit);
    return {
      data: result.batches.map(presentBatch),
      has_more: result.hasMore,
    };
  });

  // Status batch (polling).
  app.get('/batches/:id', async (request) => {
    const ctx = requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const batch = await service.get(ctx.tenantId, id as BatchId);
    return presentBatch(batch);
  });

  // Manifest dokumen dalam batch (cursor pagination).
  app.get('/batches/:id/documents', async (request) => {
    const ctx = requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const { cursor, limit } = CursorQuery.parse(request.query);
    const result = await service.listDocuments(
      ctx.tenantId,
      id as BatchId,
      cursor,
      limit,
    );
    // Dokumen batch: generate signed URL untuk yang sudah completed.
    const items = await Promise.all(
      result.documents.map(async (doc) => {
        let outputUrl: string | null = null;
        if (doc.status === 'completed' && doc.storageKey) {
          outputUrl = await storage
            .signedUrl(doc.storageKey, 900)
            .catch(() => null);
        }
        return presentDocument(doc, outputUrl, null);
      }),
    );
    return { data: items, has_more: result.hasMore };
  });
}

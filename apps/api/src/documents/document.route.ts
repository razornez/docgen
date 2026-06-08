import type { DocumentId, TemplateId } from '@docgen/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import { presentDocument } from '../http/presenters.js';
import type { RenderService } from './render.service.js';

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

const RenderBody = z.object({
  template: z.string().trim().min(1),
  version: z.coerce.number().int().positive().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  options: OptionsSchema.optional(),
});

const IdParams = z.object({ id: z.string().trim().min(1) });

/**
 * Rute dokumen terproteksi (docs/02). Render 1 dokumen sinkron (JSON→PDF) dan
 * pengambilan ulang dengan signed URL baru. Kredit dipotong untuk mode live
 * (docs/03 — Alur 2); mode test gratis. Header X-Credits-Remaining memberi tahu
 * saldo sesudah render agar klien bisa top-up sebelum terkena 402.
 */
export function registerDocumentRoutes(
  app: FastifyInstance,
  service: RenderService,
): void {
  app.post('/documents', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = RenderBody.parse(request.body);
    const rendered = await service.render(
      ctx.tenantId,
      {
        templateId: body.template as TemplateId,
        data: body.data,
        options: body.options ?? {},
        ...(body.version !== undefined ? { version: body.version } : {}),
      },
      ctx.mode,
    );

    if (rendered.creditsRemaining !== null) {
      void reply.header(
        'x-credits-remaining',
        String(rendered.creditsRemaining),
      );
    }
    reply.code(201);
    return presentDocument(
      rendered.document,
      rendered.outputUrl,
      rendered.expiresAt,
    );
  });

  app.get('/documents/:id', async (request) => {
    const ctx = requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const rendered = await service.getDocument(ctx.tenantId, id as DocumentId);
    return presentDocument(
      rendered.document,
      rendered.outputUrl,
      rendered.expiresAt,
    );
  });
}

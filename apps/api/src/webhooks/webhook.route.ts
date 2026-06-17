import { Errors, randomBase62 } from '@docgen/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import { assertNotSsrf } from '../lib/ssrf.js';
import type { WebhookRepository } from './webhook.repository.js';

const VALID_EVENTS = [
  'batch.completed',
  'batch.partially_failed',
  'batch.failed',
  'balance.low',
  'document.failed',
] as const;

const CreateBody = z.object({
  url: z.string().url().startsWith('https://'),
  events: z.array(z.enum(VALID_EVENTS)).min(1).max(VALID_EVENTS.length),
});

const IdParams = z.object({ id: z.string().trim().min(1) });

function present(ep: Awaited<ReturnType<WebhookRepository['findById']>>) {
  if (!ep) return null;
  return {
    id: ep.id,
    url: ep.url,
    events: ep.events,
    active: ep.active,
    created_at: ep.createdAt.toISOString(),
    // secret tidak pernah dikembalikan setelah pembuatan
  };
}

/**
 * Rute webhook terproteksi (docs/11).
 * - POST /v1/webhooks/endpoints     → daftar endpoint baru
 * - GET  /v1/webhooks/endpoints     → list endpoint tenant
 * - DELETE /v1/webhooks/endpoints/:id → nonaktifkan endpoint
 */
export function registerWebhookRoutes(
  app: FastifyInstance,
  repo: WebhookRepository,
): void {
  app.post('/webhooks/endpoints', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = CreateBody.parse(request.body);
    try {
      assertNotSsrf(body.url);
    } catch (e) {
      throw Errors.invalidRequest(
        e instanceof Error ? e.message : 'URL tidak diizinkan',
        'url',
      );
    }
    const secret = randomBase62(32); // secret HMAC dihasilkan server
    const id = `whe_${randomBase62(20)}`;
    const endpoint = await repo.create({
      id,
      tenantId: ctx.tenantId,
      url: body.url,
      secret,
      events: [...body.events],
    });
    reply.code(201);
    return {
      ...present(endpoint),
      secret, // ditampilkan SEKALI saat pembuatan — simpan baik-baik
    };
  });

  app.get('/webhooks/endpoints', async (request) => {
    const ctx = requireAuth(request);
    const endpoints = await repo.listByTenant(ctx.tenantId);
    return { data: endpoints.map(present) };
  });

  app.delete('/webhooks/endpoints/:id', async (request, reply) => {
    const ctx = requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const result = await repo.deactivate(ctx.tenantId, id);
    if (!result) {
      reply.code(404);
      return { error: 'not_found' };
    }
    reply.code(204);
  });
}

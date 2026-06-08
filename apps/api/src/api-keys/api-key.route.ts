import type { ApiKeyId } from '@docgen/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth-context.js';
import { presentApiKey, presentNewApiKey } from '../http/presenters.js';
import type { ApiKeyService } from './api-key.service.js';

const CreateBodySchema = z.object({
  mode: z.enum(['live', 'test']).optional(),
});

const RevokeParamsSchema = z.object({
  id: z.string().trim().min(1),
});

/**
 * Rute API key terproteksi (docs/09). Semua disaring ke tenant dari context
 * request (isolasi, docs/13). Route tipis: parse → service → response.
 */
export function registerApiKeyRoutes(
  app: FastifyInstance,
  service: ApiKeyService,
): void {
  // Buat key baru — plaintext hanya tampil di response ini (sekali).
  app.post('/api-keys', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = CreateBodySchema.parse(request.body ?? {});
    const issued = await service.create(ctx.tenantId, body.mode ?? 'live');
    reply.code(201);
    return { api_key: presentNewApiKey(issued.apiKey, issued.plaintext) };
  });

  // Daftar key milik tenant (tersamar, tanpa rahasia).
  app.get('/api-keys', async (request) => {
    const ctx = requireAuth(request);
    const keys = await service.list(ctx.tenantId);
    return { data: keys.map(presentApiKey) };
  });

  // Cabut key milik tenant. 404 bila bukan miliknya / sudah dicabut.
  app.post('/api-keys/:id/revoke', async (request) => {
    const ctx = requireAuth(request);
    const { id } = RevokeParamsSchema.parse(request.params);
    const revoked = await service.revoke(ctx.tenantId, id as ApiKeyId);
    return { api_key: presentApiKey(revoked) };
  });
}

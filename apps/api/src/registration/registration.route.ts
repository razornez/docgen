import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { presentNewApiKey, presentTenant } from '../http/presenters.js';
import type { RegistrationService } from './registration.service.js';
import type { TemplateService } from '../templates/template.service.js';

const BodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  // Kode negara ISO alpha-2 (mis. 'ID', 'US'); menentukan default_locale (docs/22).
  country: z.string().trim().length(2).optional(),
  // Mode key awal; default 'live' (sk_live_). 'test' untuk uji coba (docs/09).
  mode: z.enum(['live', 'test']).optional(),
});

/**
 * Rute publik registrasi tenant (POST /v1/tenants) — TANPA auth (docs/07 Tahap 2).
 * Route tipis: parse → service → bentuk response (docs/21).
 */
export function registerRegistrationRoutes(
  app: FastifyInstance,
  service: RegistrationService,
  templateService: TemplateService,
): void {
  app.post('/tenants', async (request, reply) => {
    const body = BodySchema.parse(request.body);
    const result = await service.register({
      name: body.name,
      email: body.email,
      country: body.country ?? null,
      keyMode: body.mode ?? 'live',
    });

    // Fire-and-forget: seed default templates for new tenant
    void templateService.importDefaults(result.tenant.id);

    reply.code(201);
    return {
      tenant: presentTenant(result.tenant),
      user: { id: result.user.id, email: result.user.email },
      api_key: presentNewApiKey(result.apiKey, result.plaintextKey),
    };
  });
}

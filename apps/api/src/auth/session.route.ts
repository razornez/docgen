import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isUniqueViolation } from '../persistence/pg-errors.js';
import { Errors } from '@docgen/shared';
import type { AuthSessionService } from './session.service.js';

const RegisterBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const LoginBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

/**
 * Rute autentikasi berbasis sesi (dashboard) — PUBLIK, tanpa API key.
 * - POST /v1/auth/register   → daftar email+password
 * - POST /v1/auth/login      → masuk email+password → JWT
 * - GET  /v1/auth/google     → redirect ke Google OAuth
 * - GET  /v1/auth/google/callback → tukar code → redirect ke dashboard dengan JWT
 */
export function registerSessionRoutes(
  app: FastifyInstance,
  service: AuthSessionService,
): void {
  app.post('/auth/register', async (request, reply) => {
    const body = RegisterBody.parse(request.body);
    let result: { token: string; tenantId: string; userId: string };
    try {
      result = await service.register(body.name, body.email, body.password);
    } catch (err) {
      if (isUniqueViolation(err, 'uq_users_email')) {
        throw Errors.conflict('Email sudah terdaftar', 'email');
      }
      throw err;
    }
    reply.code(201);
    return { token: result.token };
  });

  app.post('/auth/login', async (request) => {
    const body = LoginBody.parse(request.body);
    const result = await service.login(body.email, body.password);
    return { token: result.token };
  });

  app.get('/auth/google', async (_request, reply) => {
    const state = Math.random().toString(36).slice(2);
    const url = service.getGoogleAuthUrl(state);
    return reply.redirect(302, url);
  });

  app.get('/auth/google/callback', async (request, reply) => {
    const { code } = request.query as { code?: string };
    if (!code) throw Errors.invalidRequest('Missing OAuth code');
    const { redirectUrl } = await service.handleGoogleCallback(code);
    return reply.redirect(302, redirectUrl);
  });
}

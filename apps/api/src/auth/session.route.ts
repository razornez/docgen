import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isUniqueViolation } from '../persistence/pg-errors.js';
import { Errors, randomBase62 } from '@docgen/shared';
import type { AuthSessionService } from './session.service.js';
import { checkIpRateLimit } from '../infra/rate-limiter.js';
import { getRedis } from '../infra/redis.js';

const RegisterBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const LoginBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const ExchangeBody = z.object({
  code: z.string().min(1).max(64),
});

/** Parse satu cookie dari header Cookie. */
function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/**
 * Rute autentikasi berbasis sesi (dashboard) — PUBLIK, tanpa API key.
 * - POST /v1/auth/register             → daftar email+password
 * - POST /v1/auth/login                → masuk email+password → JWT
 * - GET  /v1/auth/google               → redirect ke Google OAuth (set state cookie)
 * - GET  /v1/auth/google/callback      → validasi state, tukar code → redirect dashboard
 * - POST /v1/auth/google/exchange      → tukar kode opaque → JWT (sekali pakai, 60 detik)
 */
export function registerSessionRoutes(
  app: FastifyInstance,
  service: AuthSessionService,
): void {
  app.post('/auth/register', async (request, reply) => {
    await checkIpRateLimit(getRedis(), request.ip, 'register').catch(() => {});
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
    await checkIpRateLimit(getRedis(), request.ip, 'login').catch(() => {});
    const body = LoginBody.parse(request.body);
    const result = await service.login(body.email, body.password);
    return { token: result.token };
  });

  app.get('/auth/google', async (request, reply) => {
    await checkIpRateLimit(getRedis(), request.ip, 'oauth').catch(() => {});
    const state = randomBase62(24);
    const url = service.getGoogleAuthUrl(state);
    // Simpan state di cookie httpOnly SameSite=Lax — divalidasi saat callback.
    reply.header(
      'Set-Cookie',
      `oauth_state=${state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/v1/auth/google/callback`,
    );
    return reply.redirect(302, url);
  });

  app.get('/auth/google/callback', async (request, reply) => {
    const { code, state } = request.query as {
      code?: string;
      state?: string;
    };
    if (!code) throw Errors.invalidRequest('Missing OAuth code');

    // Validasi CSRF state
    const storedState = parseCookie(request.headers.cookie, 'oauth_state');
    if (!storedState || !state || storedState !== state) {
      throw Errors.unauthorized('OAuth state tidak valid');
    }
    // Hapus state cookie
    reply.header(
      'Set-Cookie',
      'oauth_state=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/v1/auth/google/callback',
    );

    const { redirectUrl } = await service.handleGoogleCallback(code);
    return reply.redirect(302, redirectUrl);
  });

  // Tukar kode opaque (dari URL callback) dengan JWT asli.
  // Kode hanya berlaku 60 detik dan sekali pakai.
  app.post('/auth/google/exchange', async (request) => {
    const { code } = ExchangeBody.parse(request.body);
    const token = await service.redeemExchangeCode(code);
    return { token };
  });
}

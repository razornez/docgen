import type { FastifyRequest } from 'fastify';
import type { ApiKeyService } from '../api-keys/api-key.service.js';
import type { AuthSessionService } from './session.service.js';

/**
 * preHandler hook untuk rute terproteksi (docs/09).
 *
 * Mendukung dua mekanisme otentikasi:
 *  1. API key (sk_live_… / sk_test_…) — untuk penggunaan programatik.
 *  2. JWT sesi (dari login email+password atau Google) — untuk dashboard.
 *
 * Token yang tidak dimulai dengan "sk_" dianggap JWT dan diverifikasi oleh
 * AuthSessionService. Kegagalan keduanya menghasilkan 401.
 */
export function makeAuthHook(
  apiKeyService: ApiKeyService,
  sessionService: AuthSessionService,
) {
  return async function authHook(request: FastifyRequest): Promise<void> {
    const header = request.headers.authorization;
    if (!header) {
      const { Errors } = await import('@docgen/shared');
      throw Errors.unauthorized('Missing Authorization header');
    }
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;

    if (token.startsWith('sk_')) {
      request.authContext = await apiKeyService.authenticate(header);
    } else {
      request.authContext = sessionService.verifyToken(token);
    }
  };
}

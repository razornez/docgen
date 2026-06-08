import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/auth-context.js';
import { presentTenant, presentWallet } from '../http/presenters.js';
import type { AccountService } from '../tenants/account.service.js';

/**
 * GET /v1/me — endpoint terproteksi sederhana untuk membuktikan auth jalan.
 * Mengembalikan info tenant + saldo dompet dari context request (isolasi, docs/13).
 */
export function registerMeRoutes(
  app: FastifyInstance,
  service: AccountService,
): void {
  app.get('/me', async (request) => {
    const ctx = requireAuth(request);
    const account = await service.getAccount(ctx.tenantId);
    return {
      tenant: presentTenant(account.tenant),
      wallet: presentWallet(account.wallet),
    };
  });
}

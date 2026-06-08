import type { FastifyInstance } from 'fastify';
import type { HealthService } from './health.service.js';

/**
 * Route tipis (docs/21): hanya memanggil service & membentuk response HTTP.
 * Tidak ada logika bisnis dan tidak ada query DB di sini.
 *
 * GET /health → 200 + {status:'ok'} bila semua sehat; 503 + {status:'degraded'}
 * bila ada dependensi gagal (agar load balancer/uptime monitor bereaksi benar).
 */
export function registerHealthRoutes(
  app: FastifyInstance,
  service: HealthService,
): void {
  app.get('/health', async (_request, reply) => {
    const report = await service.getHealth();
    reply.code(report.status === 'ok' ? 200 : 503);
    return report;
  });
}

import { describe, expect, it } from 'vitest';
import { HealthService } from '../src/health/health.service.js';
import type { HealthRepository } from '../src/health/health.repository.js';

const healthy = { ok: true, latencyMs: 1 };
const missing = { ok: false, latencyMs: 1, error: 'Worker render tidak aktif' };

describe('health service', () => {
  it('degrades when PostgreSQL and Redis work but renderer does not', async () => {
    const repo = {
      checkPostgres: async () => healthy,
      checkRedis: async () => healthy,
      checkWorker: async () => missing,
    } as HealthRepository;
    const report = await new HealthService(repo).getHealth();
    expect(report.status).toBe('degraded');
    expect(report.checks.worker.ok).toBe(false);
  });

  it('reports ok only when all checks pass', async () => {
    const repo = {
      checkPostgres: async () => healthy,
      checkRedis: async () => healthy,
      checkWorker: async () => healthy,
    } as HealthRepository;
    expect((await new HealthService(repo).getHealth()).status).toBe('ok');
  });
});

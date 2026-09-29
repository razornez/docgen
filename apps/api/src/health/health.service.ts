import type { HealthRepository } from './health.repository.js';
import type { HealthReport } from './health.types.js';

/**
 * Logika bisnis health check (docs/21 — service tidak tahu detail HTTP).
 * Menjalankan probe paralel dan menyimpulkan status agregat:
 * `ok` hanya bila SEMUA dependensi sehat, selain itu `degraded`.
 */
export class HealthService {
  constructor(private readonly repo: HealthRepository) {}

  async getHealth(): Promise<HealthReport> {
    const [postgres, redis, worker] = await Promise.all([
      this.repo.checkPostgres(),
      this.repo.checkRedis(),
      this.repo.checkWorker(),
    ]);

    const status = postgres.ok && redis.ok && worker.ok ? 'ok' : 'degraded';
    return { status, checks: { postgres, redis, worker } };
  }
}

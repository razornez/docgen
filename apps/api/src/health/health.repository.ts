import { pingDatabase } from '@docgen/db';
import { pingRedis } from '../infra/redis.js';
import { getRedis } from '../infra/redis.js';
import { RENDER_WORKER_HEARTBEAT_KEY } from '@docgen/shared';
import type { Clock } from '@docgen/shared';
import type { DependencyCheck } from './health.types.js';

/**
 * Lapisan akses infra untuk health check. Satu-satunya yang menyentuh
 * Postgres & Redis langsung (docs/21 — arsitektur berlapis). Tidak ada
 * logika keputusan di sini; hanya menjalankan probe dan mengukur latensi.
 */
export class HealthRepository {
  constructor(private readonly clock: Clock) {}

  async checkPostgres(): Promise<DependencyCheck> {
    return this.timed(() => pingDatabase());
  }

  async checkRedis(): Promise<DependencyCheck> {
    return this.timed(() => pingRedis());
  }

  async checkWorker(): Promise<DependencyCheck> {
    return this.timed(async () => {
      const heartbeat = await getRedis().get(RENDER_WORKER_HEARTBEAT_KEY);
      if (!heartbeat)
        throw new Error('Worker render tidak aktif atau Chromium belum siap');
    });
  }

  private async timed(probe: () => Promise<void>): Promise<DependencyCheck> {
    const start = this.clock.nowMs();
    try {
      await probe();
      return { ok: true, latencyMs: this.clock.nowMs() - start };
    } catch (err) {
      return {
        ok: false,
        latencyMs: this.clock.nowMs() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

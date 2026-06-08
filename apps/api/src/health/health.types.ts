/** Hasil satu pemeriksaan dependensi (Postgres / Redis). */
export interface DependencyCheck {
  readonly ok: boolean;
  readonly latencyMs: number;
  /** Pesan error ringkas bila gagal (tanpa detail sensitif, docs/21). */
  readonly error?: string;
}

export type HealthStatus = 'ok' | 'degraded';

/** Laporan kesehatan agregat yang dikembalikan endpoint /health. */
export interface HealthReport {
  readonly status: HealthStatus;
  readonly checks: {
    readonly postgres: DependencyCheck;
    readonly redis: DependencyCheck;
  };
}

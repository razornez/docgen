/**
 * Titik masuk layanan API (docs/07). Memuat & memvalidasi konfigurasi SEKALI
 * (gagal cepat bila salah, docs/21), membangun app, lalu listen.
 */
import { loadConfig } from '@docgen/config';
import { closePool } from '@docgen/db';
import { buildApp } from './app.js';
import { closeRedis } from './infra/redis.js';

async function main(): Promise<void> {
  const config = loadConfig(); // melempar bila environment tidak valid
  const app = buildApp(config);

  // Shutdown bersih: tutup koneksi infra agar tidak ada handle menggantung.
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'mematikan layanan API...');
    await app.close();
    await Promise.allSettled([closePool(), closeRedis()]);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.API_HOST, port: config.API_PORT });
}

main().catch((err: unknown) => {
  console.error('Gagal menjalankan layanan API:', err);
  process.exit(1);
});

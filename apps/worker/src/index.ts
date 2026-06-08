/**
 * Worker render (docs/07, docs/08). Mengonsumsi antrian BullMQ, menjalankan
 * Chromium (Playwright) untuk mencetak PDF, menyimpan ke storage, dan menandai
 * dokumen. API tidak pernah mencetak — semua render terjadi di sini.
 *
 * Isolasi (docs/08): mesin render tidak mengambil resource eksternal (aset
 * base64). Di produksi worker dijalankan tanpa akses internet keluar.
 */
import { loadConfig } from '@docgen/config';
import { closePool, getPool } from '@docgen/db';
import { PdfRenderer } from '@docgen/renderer';
import { RENDER_QUEUE } from '@docgen/shared';
import type { RenderJobData, RenderJobResult } from '@docgen/shared';
import { FilesystemStorage, S3Storage } from '@docgen/storage';
import type { StoragePort } from '@docgen/shared';
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { createRenderProcessor } from './render-processor.js';

function main(): void {
  const config = loadConfig(); // gagal cepat bila environment tidak valid

  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  const pool = getPool();
  const renderer = new PdfRenderer();

  let storage: StoragePort;
  if (config.STORAGE_DRIVER === 's3') {
    storage = new S3Storage({
      endpoint: config.STORAGE_ENDPOINT,
      region: config.STORAGE_REGION,
      accessKeyId: config.STORAGE_ACCESS_KEY,
      secretAccessKey: config.STORAGE_SECRET_KEY,
      bucket: config.STORAGE_BUCKET,
      forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
    });
  } else {
    storage = new FilesystemStorage({
      baseDir: config.STORAGE_DIR,
      publicBaseUrl: config.PUBLIC_BASE_URL,
      secret: config.SESSION_SECRET,
    });
  }

  const handle = createRenderProcessor({ db: pool, renderer, storage });

  const worker = new Worker<RenderJobData, RenderJobResult>(
    RENDER_QUEUE,
    (job: Job<RenderJobData, RenderJobResult>) => handle(job.data),
    { connection, concurrency: config.RENDER_CONCURRENCY },
  );

  worker.on('ready', () => {
    console.log(
      `[worker] siap (env=${config.NODE_ENV}); antrian '${RENDER_QUEUE}', konkurensi ${config.RENDER_CONCURRENCY}`,
    );
  });
  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id ?? '?'} gagal: ${err.message}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`[worker] ${signal} diterima, mematikan...`);
    void (async () => {
      await worker.close();
      await renderer.close();
      await Promise.allSettled([closePool(), connection.quit()]);
      process.exit(0);
    })();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();

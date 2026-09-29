/**
 * Worker render (docs/07, docs/08). Mengonsumsi antrian BullMQ, menjalankan
 * Chromium (Playwright) untuk mencetak PDF, menyimpan ke storage, dan menandai
 * dokumen. API tidak pernah mencetak — semua render terjadi di sini.
 *
 * Isolasi (docs/08): mesin render tidak mengambil resource eksternal (aset
 * base64). Di produksi worker dijalankan tanpa akses internet keluar.
 */
import { loadConfig } from '@docgen/config';
import { closePool, getPool, withTransaction } from '@docgen/db';
import { PdfRenderer } from '@docgen/renderer';
import { RENDER_QUEUE, RENDER_WORKER_HEARTBEAT_KEY } from '@docgen/shared';
import type { RenderJobData, RenderJobResult } from '@docgen/shared';
import { FilesystemStorage, S3Storage } from '@docgen/storage';
import type { StoragePort } from '@docgen/shared';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { createRenderProcessor } from './render-processor.js';
import { reconcileAbandonedBatches } from './reconcile-batches.js';

async function main(): Promise<void> {
  const config = loadConfig(); // gagal cepat bila environment tidak valid

  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  const pool = getPool();
  const renderer = new PdfRenderer();
  // Fail before accepting jobs if the browser binary is missing after a deploy.
  const preflight = await renderer.render(
    '<!doctype html><html><body>DocGen worker ready</body></html>',
  );
  if (preflight.pdf.subarray(0, 5).toString() !== '%PDF-') {
    throw new Error('Chromium preflight did not produce a PDF');
  }

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

  const handle = createRenderProcessor({
    db: pool,
    transaction: withTransaction,
    renderer,
    storage,
  });

  const worker = new Worker<RenderJobData, RenderJobResult>(
    RENDER_QUEUE,
    (job: Job<RenderJobData, RenderJobResult>) =>
      handle(job.data, job.attemptsMade + 1 >= (job.opts.attempts ?? 1)),
    { connection, concurrency: config.RENDER_CONCURRENCY },
  );
  const queue = new Queue(RENDER_QUEUE, { connection });
  const reconcile = () =>
    reconcileAbandonedBatches({
      db: pool,
      transaction: withTransaction,
      hasJob: async (documentId) => Boolean(await queue.getJob(documentId)),
    });
  const reconcileTimer = setInterval(
    () =>
      void reconcile().catch((err: unknown) => {
        console.error(
          '[worker] rekonsiliasi batch gagal:',
          err instanceof Error ? err.message : String(err),
        );
      }),
    60_000,
  );
  reconcileTimer.unref();
  void reconcile().catch((err: unknown) => {
    console.error(
      '[worker] rekonsiliasi awal gagal:',
      err instanceof Error ? err.message : String(err),
    );
  });

  const heartbeat = async () => {
    if (worker.isRunning()) {
      try {
        const probe = await renderer.render(
          '<!doctype html><html><body>ready</body></html>',
        );
        if (probe.pdf.subarray(0, 5).toString() !== '%PDF-')
          throw new Error('PDF probe invalid');
        await connection.set(
          RENDER_WORKER_HEARTBEAT_KEY,
          new Date().toISOString(),
          'EX',
          45,
        );
      } catch (error) {
        await connection.del(RENDER_WORKER_HEARTBEAT_KEY);
        throw error;
      }
    }
  };
  await heartbeat();
  const heartbeatTimer = setInterval(
    () =>
      void heartbeat().catch((err: unknown) => {
        console.error(
          '[worker] heartbeat gagal:',
          err instanceof Error ? err.message : String(err),
        );
      }),
    20_000,
  );
  heartbeatTimer.unref();

  worker.on('ready', () => {
    console.log(
      `[worker] siap (env=${config.NODE_ENV}); antrian '${RENDER_QUEUE}', konkurensi ${config.RENDER_CONCURRENCY}`,
    );
  });
  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id ?? '?'} gagal: ${err.message}`);
  });

  const shutdown = (signal: string): void => {
    clearInterval(heartbeatTimer);
    clearInterval(reconcileTimer);
    console.log(`[worker] ${signal} diterima, mematikan...`);
    void (async () => {
      await worker.close();
      await queue.close();
      await renderer.close();
      await Promise.allSettled([closePool(), connection.quit()]);
      process.exit(0);
    })();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void main().catch((err: unknown) => {
  console.error(
    '[worker] startup gagal:',
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});

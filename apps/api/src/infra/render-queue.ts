import { RENDER_QUEUE } from '@docgen/shared';
import type { RenderJobData, RenderJobResult } from '@docgen/shared';
import { Queue, QueueEvents, type Job } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Produsen antrian render (docs/01, docs/07): API meng-enqueue job lalu MENUNGGU
 * hasilnya (sync single doc) dengan timeout. Worker yang menjalankan Chromium —
 * API tidak pernah mencetak. `jobId = documentId` membuat enqueue idempoten
 * (retry tidak menggandakan render).
 */
export class RenderQueue {
  private readonly connection: IORedis;
  private readonly eventsConnection: IORedis;
  private readonly queue: Queue<RenderJobData, RenderJobResult>;
  private readonly events: QueueEvents;

  constructor(redisUrl: string) {
    // BullMQ mewajibkan maxRetriesPerRequest=null pada koneksinya.
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.eventsConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue<RenderJobData, RenderJobResult>(RENDER_QUEUE, {
      connection: this.connection,
    });
    this.events = new QueueEvents(RENDER_QUEUE, {
      connection: this.eventsConnection,
    });
  }

  /**
   * Enqueue job render prioritas tinggi lalu tunggu sampai selesai. Melempar bila
   * worker gagal (pesan error diteruskan) atau melewati `timeoutMs`.
   */
  async enqueueAndWait(
    data: RenderJobData,
    timeoutMs: number,
  ): Promise<RenderJobResult> {
    const job: Job<RenderJobData, RenderJobResult> = await this.queue.add(
      'render',
      data,
      {
        jobId: data.documentId,
        priority: 1,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: 500,
      },
    );
    return job.waitUntilFinished(this.events, timeoutMs);
  }

  /** Enqueue job batch (fire-and-forget, tidak menunggu hasil). */
  async enqueue(data: RenderJobData): Promise<void> {
    await this.queue.add('render', data, {
      jobId: data.documentId,
      priority: 2, // lebih rendah dari render tunggal (priority 1)
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 500,
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.events.close();
    await this.connection.quit();
    await this.eventsConnection.quit();
  }
}

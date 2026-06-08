/**
 * Port antrian job (docs/21 — adapter: BullMQ). API meng-enqueue, worker konsumsi.
 * Handler harus idempoten karena antrian menjamin "minimal sekali sampai".
 */
export interface EnqueueOptions {
  /** Kunci dedup/idempotency opsional (mis. document_id). */
  readonly jobId?: string;
  readonly priority?: number;
}

export interface QueuePort<TPayload = unknown> {
  enqueue(
    queue: string,
    payload: TPayload,
    options?: EnqueueOptions,
  ): Promise<{ jobId: string }>;
}

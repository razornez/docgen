import { createHmac, randomBytes } from 'node:crypto';
import type { Queryable } from '@docgen/db';

export type WebhookEvent =
  | 'batch.completed'
  | 'batch.partially_failed'
  | 'batch.failed'
  | 'document.failed';

interface WebhookEndpointRow {
  id: string;
  url: string;
  secret: string;
}

/**
 * Kirim webhook ke semua endpoint aktif milik tenant yang mendaftarkan event.
 * Catat setiap percobaan ke `webhook_deliveries`. Gagal ringan (tidak melempar)
 * agar kegagalan pengiriman tidak membatalkan update batch.
 */
export async function deliverWebhook(
  db: Queryable,
  tenantId: string,
  event: WebhookEvent,
  payload: unknown,
): Promise<void> {
  const { rows } = await db.query<WebhookEndpointRow>(
    `SELECT id, url, secret FROM webhook_endpoints
      WHERE tenant_id = $1 AND active = TRUE AND $2 = ANY(events)`,
    [tenantId, event],
  );
  if (rows.length === 0) return;

  const body = JSON.stringify({
    event,
    data: payload,
    delivered_at: new Date().toISOString(),
  });
  const deliveryId = `whd_${randomBytes(10).toString('hex')}`;

  for (const ep of rows) {
    const sig = createHmac('sha256', ep.secret).update(body).digest('hex');
    let status: 'delivered' | 'failed' = 'failed';

    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DocGen-Event': event,
          'X-DocGen-Signature-256': `sha256=${sig}`,
        },
        body,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });
      if (res.status >= 200 && res.status < 300) status = 'delivered';
    } catch {
      // Catat sebagai failed — retry bisa ditambahkan nanti via scheduled job.
    }

    await db
      .query(
        `INSERT INTO webhook_deliveries (id, endpoint_id, event_type, payload, status, attempts, last_attempt_at)
         VALUES ($1, $2, $3, $4, $5, 1, now())`,
        [deliveryId, ep.id, event, JSON.parse(body) as unknown, status],
      )
      .catch(() => undefined); // jangan biarkan INSERT gagal menggagalkan render
  }
}

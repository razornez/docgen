import { loadConfig } from '@docgen/config';
import Redis from 'ioredis';

let client: Redis | undefined;

/**
 * Klien Redis bersama (lazy singleton). Dipakai untuk health check sekarang;
 * nanti untuk rate limit, gerbang saldo hot-path, dan BullMQ (docs/01).
 */
export function getRedis(): Redis {
  if (!client) {
    const config = loadConfig();
    client = new Redis(config.REDIS_URL, {
      // Jangan menahan request selamanya bila Redis mati — gagal cepat.
      // commandTimeout membatasi PING agar health check tidak menggantung.
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 2000,
      lazyConnect: false,
    });
    // docs/21: jangan menelan error. Cukup catat; health check yang melaporkan status.
    client.on('error', (err) => {
      console.error('[redis] connection error:', err.message);
    });
  }
  return client;
}

/** Ping untuk health check: mengembalikan true bila Redis membalas PONG. */
export async function pingRedis(): Promise<void> {
  const pong = await getRedis().ping();
  if (pong !== 'PONG') {
    throw new Error(`Balasan PING tak terduga: ${pong}`);
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = undefined;
  }
}

import type Redis from 'ioredis';
import { Errors } from '@docgen/shared';

/**
 * Token bucket berbasis Redis (docs/01 — "rate limit per key (token bucket di
 * Redis)"). Atomik via Lua script — tidak ada TOCTOU walau banyak API instance.
 *
 * Algoritma: bucket diisi ulang secara proporsional berdasarkan waktu yang
 * berlalu sejak terakhir kali diakses. Satu call = satu token dikonsumsi.
 * Bila token habis → 429.
 */

/** Script Lua: consume 1 token, return {tokens_left, allowed(1|0)} */
const BUCKET_SCRIPT = `
local key      = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_s = tonumber(ARGV[2])
local now      = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts     = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  ts = now
end

-- Refill: satu token per (refill_s / capacity) detik
local elapsed = now - ts
local refill  = math.floor(elapsed * capacity / refill_s)
tokens = math.min(capacity, tokens + refill)
ts = now

if tokens < 1 then
  redis.call('HMSET', key, 'tokens', tokens, 'ts', ts)
  redis.call('EXPIRE', key, refill_s * 2)
  return {tostring(tokens), '0'}
end

tokens = tokens - 1
redis.call('HMSET', key, 'tokens', tokens, 'ts', ts)
redis.call('EXPIRE', key, refill_s * 2)
return {tostring(tokens), '1'}
`;

export interface RateLimitConfig {
  /** Kapasitas bucket (juga burst maksimum). */
  readonly capacity: number;
  /** Waktu pengisian ulang penuh (detik). */
  readonly refillSeconds: number;
}

const LIVE_LIMIT: RateLimitConfig = { capacity: 60, refillSeconds: 60 };
const TEST_LIMIT: RateLimitConfig = { capacity: 30, refillSeconds: 60 };

export async function checkRateLimit(
  redis: Redis,
  apiKeyId: string,
  mode: 'live' | 'test',
): Promise<void> {
  const cfg = mode === 'live' ? LIVE_LIMIT : TEST_LIMIT;
  const key = `rl:${apiKeyId}`;
  const now = Math.floor(Date.now() / 1000);

  const [, allowed] = (await redis.eval(
    BUCKET_SCRIPT,
    1,
    key,
    String(cfg.capacity),
    String(cfg.refillSeconds),
    String(now),
  )) as [string, string];

  if (allowed !== '1') {
    throw Errors.rateLimited();
  }
}

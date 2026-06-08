/**
 * reset-demo.ts
 *
 * Creates the demo tenant on first run; on subsequent runs wipes
 * documents, batches, and usage_events then restores the wallet
 * to DEMO_CREDITS so the account always feels fresh.
 *
 * Usage (on VPS or locally):
 *   pnpm demo:reset
 *   pnpm exec tsx scripts/reset-demo.ts
 *
 * Needs: DATABASE_URL, APIKEY_HASH_PEPPER in environment (or .env).
 */

import { readFileSync, existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// ── load .env manually (dotenv may not be installed at root) ──────────────────
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ── constants ─────────────────────────────────────────────────────────────────
const DEMO_EMAIL = 'demo@docgen.razornez.net';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'DocGen Demo';
const DEMO_CREDITS = 100;

function base62(bytes = 32): string {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const buf = randomBytes(bytes);
  return Array.from(buf, (b) => chars[b % 62]).join('');
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const pepper = process.env.APIKEY_HASH_PEPPER;

  if (!dbUrl) {
    console.error('[reset-demo] DATABASE_URL is required');
    process.exit(1);
  }
  if (!pepper) {
    console.error('[reset-demo] APIKEY_HASH_PEPPER is required');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  try {
    // ── find existing demo user ───────────────────────────────────────────────
    const { rows } = await client.query<{ id: string; tenant_id: string }>(
      `SELECT id, tenant_id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [DEMO_EMAIL],
    );
    const existing = rows[0];

    if (existing) {
      const tenantId = existing.tenant_id;
      console.log(
        `[reset-demo] Found demo tenant ${tenantId} — resetting data...`,
      );

      // delete usage_events cascades via FK, documents cascade to usage_events
      const { rowCount: docCount } = await client.query(
        `DELETE FROM documents WHERE tenant_id = $1`,
        [tenantId],
      );
      console.log(`[reset-demo]   documents deleted: ${docCount ?? 0}`);

      const { rowCount: batchCount } = await client.query(
        `DELETE FROM batches WHERE tenant_id = $1`,
        [tenantId],
      );
      console.log(`[reset-demo]   batches deleted: ${batchCount ?? 0}`);

      await client.query(
        `UPDATE wallets SET balance = $1 WHERE tenant_id = $2`,
        [DEMO_CREDITS, tenantId],
      );
      console.log(`[reset-demo]   wallet restored to ${DEMO_CREDITS} credits`);

      // reset password in case visitor changed it
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
      await client.query(
        `UPDATE users SET password_hash = $1 WHERE lower(email) = lower($2)`,
        [passwordHash, DEMO_EMAIL],
      );
      console.log('[reset-demo]   password reset');
    } else {
      // ── create demo account from scratch ─────────────────────────────────────
      console.log('[reset-demo] Demo account not found — creating...');

      const now = Date.now();
      const tenantId = `ten_demo${now}`;
      const userId = `usr_demo${now}`;
      const keyId = `key_demo${now}`;
      const bonusTxnId = `txn_demo${now}`;

      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

      // API key: plaintext sk_live_<32-char base62>, stored as SHA-256+pepper
      const secret = base62(32);
      const plaintext = `sk_live_${secret}`;
      const keyHash = createHash('sha256')
        .update(plaintext + pepper)
        .digest('hex');
      const last4 = plaintext.slice(-4);

      await client.query('BEGIN');
      try {
        await client.query(
          `INSERT INTO tenants (id, name, status) VALUES ($1, $2, 'active')`,
          [tenantId, DEMO_NAME],
        );

        await client.query(
          `INSERT INTO users (id, tenant_id, email, password_hash) VALUES ($1, $2, $3, $4)`,
          [userId, tenantId, DEMO_EMAIL, passwordHash],
        );

        await client.query(
          `INSERT INTO wallets (tenant_id, balance) VALUES ($1, 0)`,
          [tenantId],
        );

        // signup_bonus: UNIQUE(type, ref_id) uses tenantId as ref_id
        await client.query(
          `INSERT INTO wallet_transactions
             (id, tenant_id, type, amount, balance_after, ref_type, ref_id, metadata)
           VALUES ($1, $2, 'signup_bonus', $3, $3, 'signup', $4, '{}')`,
          [bonusTxnId, tenantId, DEMO_CREDITS, tenantId],
        );

        await client.query(
          `UPDATE wallets SET balance = $1 WHERE tenant_id = $2`,
          [DEMO_CREDITS, tenantId],
        );

        await client.query(
          `INSERT INTO api_keys (id, tenant_id, mode, key_hash, prefix, last4, status)
           VALUES ($1, $2, 'live', $3, 'sk_live_', $4, 'active')`,
          [keyId, tenantId, keyHash, last4],
        );

        await client.query('COMMIT');
        console.log(`[reset-demo] Demo account created:`);
        console.log(`[reset-demo]   email:    ${DEMO_EMAIL}`);
        console.log(`[reset-demo]   password: ${DEMO_PASSWORD}`);
        console.log(`[reset-demo]   tenant:   ${tenantId}`);
        console.log(`[reset-demo]   credits:  ${DEMO_CREDITS}`);
        console.log(
          `[reset-demo] NOTE: default templates must be imported separately`,
        );
        console.log(
          `[reset-demo] (they are seeded the first time the user logs in via session.service)`,
        );
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('[reset-demo] Done.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[reset-demo] FATAL:', err);
  process.exit(1);
});

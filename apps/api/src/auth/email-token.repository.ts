import crypto from 'node:crypto';
import type { Pool } from 'pg';
import { PrefixedIdGenerator } from '@docgen/shared';

const idGen = new PrefixedIdGenerator();

function hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// ---- Email verification tokens ----

export async function createVerificationToken(
    pool: Pool,
    userId: string,
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const id = idGen.generate('evt');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam
  await pool.query(
        `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        [id, userId, tokenHash, expiresAt],
      );
    return rawToken;
}

export async function findVerificationToken(
    pool: Pool,
    rawToken: string,
  ): Promise<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null } | null> {
    const tokenHash = hashToken(rawToken);
    const result = await pool.query(
          `SELECT id, user_id, expires_at, used_at FROM email_verification_tokens WHERE token_hash = $1`,
          [tokenHash],
        );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { id: row.id, userId: row.user_id, expiresAt: row.expires_at, usedAt: row.used_at };
}

export async function markTokenUsed(pool: Pool, tokenId: string): Promise<void> {
    await pool.query(`UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1`, [tokenId]);
}

// ---- Password reset tokens ----

export async function createResetToken(
    pool: Pool,
    userId: string,
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const id = idGen.generate('prt');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam
  await pool.query(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        [id, userId, tokenHash, expiresAt],
      );
    return rawToken;
}

export async function findResetToken(
    pool: Pool,
    rawToken: string,
  ): Promise<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null } | null> {
    const tokenHash = hashToken(rawToken);
    const result = await pool.query(
          `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
          [tokenHash],
        );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { id: row.id, userId: row.user_id, expiresAt: row.expires_at, usedAt: row.used_at };
}

export async function markResetTokenUsed(pool: Pool, tokenId: string): Promise<void> {
    await pool.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [tokenId]);
}

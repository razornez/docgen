import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getPool } from '@docgen/db';
import { Errors } from '@docgen/shared';
import type { MailerPort } from '@docgen/shared';
import type { AppConfig } from '@docgen/config';
import type { EmailSender } from '../email/send.js';
import type { PgUserRepository } from '../users/user.repository.js';
import { checkIpRateLimit } from '../infra/rate-limiter.js';
import { getRedis } from '../infra/redis.js';
import {
  createVerificationToken,
  findVerificationToken,
  markTokenUsed,
  createResetToken,
  findResetToken,
  markResetTokenUsed,
} from './email-token.repository.js';

const { hash: bcryptHash } = bcrypt;
const BCRYPT_ROUNDS = 12;

const VerifyEmailBody = z.object({ token: z.string().min(1) });
const ResendVerificationBody = z.object({ email: z.string().email() });
const ForgotPasswordBody = z.object({ email: z.string().email() });
const ResetPasswordBody = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export function registerEmailAuthRoutes(
  app: FastifyInstance,
  _pool: unknown,
  userRepo: PgUserRepository,
  mailer: MailerPort | null,
  config: AppConfig,
  emailSender: EmailSender,
): void {
  void mailer;
  app.post('/auth/verify-email', async (request) => {
    const pool = getPool();
    const { token } = VerifyEmailBody.parse(request.body);
    const record = await findVerificationToken(pool, token);
    if (!record) throw Errors.invalidRequest('Token tidak valid');
    if (record.usedAt) throw Errors.invalidRequest('Token sudah dipakai');
    if (record.expiresAt < new Date())
      throw Errors.invalidRequest('Token sudah kedaluwarsa');
    await userRepo.markEmailVerified(record.userId);
    await markTokenUsed(pool, record.id);
    // Email selamat datang setelah verifikasi.
    const vu = await pool.query<{ email: string; display_name: string | null }>(
      `SELECT email, display_name FROM users WHERE id=$1`,
      [record.userId],
    );
    const vb = await pool.query<{ value: unknown }>(
      `SELECT value FROM app_settings WHERE key='signup_bonus_credits'`,
    );
    const vem = vu.rows[0]?.email;
    if (vem) {
      void emailSender('welcome', {
        to: vem,
        vars: {
          name: vu.rows[0]?.display_name || vem.split('@')[0] || 'there',
          credits: String(Number(vb.rows[0]?.value) || 100),
          action_url: config.DASHBOARD_URL,
        },
      });
    }
    return { message: 'Email berhasil diverifikasi' };
  });

  app.post('/auth/resend-verification', async (request) => {
    const pool = getPool();
    await checkIpRateLimit(getRedis(), request.ip, 'register').catch(() => {});
    const { email } = ResendVerificationBody.parse(request.body);
    const user = await userRepo.findForAuth(email);
    if (!user)
      return { message: 'Jika email terdaftar, link verifikasi akan dikirim' };
    const rawToken = await createVerificationToken(pool, user.id);
    const verifyUrl = `${config.PUBLIC_BASE_URL}/v1/auth/verify-email?token=${rawToken}`;
    void emailSender('email_verification', {
      to: email,
      vars: { name: email.split('@')[0] || 'there', action_url: verifyUrl },
    });
    return { message: 'Jika email terdaftar, link verifikasi akan dikirim' };
  });

  app.post('/auth/forgot-password', async (request) => {
    const pool = getPool();
    await checkIpRateLimit(getRedis(), request.ip, 'register').catch(() => {});
    const { email } = ForgotPasswordBody.parse(request.body);
    const user = await userRepo.findForAuth(email);
    if (user) {
      const rawToken = await createResetToken(pool, user.id);
      const resetUrl = `${config.DASHBOARD_URL}/auth/reset-password?token=${rawToken}`;
      void emailSender('password_reset', {
        to: email,
        vars: { name: email.split('@')[0] || 'there', action_url: resetUrl },
      });
    }
    return {
      message: 'Jika email terdaftar, link reset password akan dikirim',
    };
  });

  app.post('/auth/reset-password', async (request) => {
    const pool = getPool();
    await checkIpRateLimit(getRedis(), request.ip, 'register').catch(() => {});
    const { token, password } = ResetPasswordBody.parse(request.body);
    const record = await findResetToken(pool, token);
    if (!record) throw Errors.invalidRequest('Token tidak valid');
    if (record.usedAt) throw Errors.invalidRequest('Token sudah dipakai');
    if (record.expiresAt < new Date())
      throw Errors.invalidRequest('Token sudah kedaluwarsa');
    const passwordHash = await bcryptHash(password, BCRYPT_ROUNDS);
    await userRepo.updatePassword(record.userId, passwordHash);
    await markResetTokenUsed(pool, record.id);
    const ru = await pool.query<{ email: string; display_name: string | null }>(
      `SELECT email, display_name FROM users WHERE id=$1`,
      [record.userId],
    );
    const rem = ru.rows[0]?.email;
    if (rem) {
      void emailSender('password_changed', {
        to: rem,
        vars: {
          name: ru.rows[0]?.display_name || rem.split('@')[0] || 'there',
          action_url: config.DASHBOARD_URL,
        },
      });
    }
    return { message: 'Password berhasil direset' };
  });
}

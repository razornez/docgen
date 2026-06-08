import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getPool } from '@docgen/db';
import { Errors } from '@docgen/shared';
import type { MailerPort } from '@docgen/shared';
import type { AppConfig } from '@docgen/config';
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
): void {
  app.post('/auth/verify-email', async (request) => {
    const pool = getPool();
    const { token } = VerifyEmailBody.parse(request.body);
    const record = await findVerificationToken(pool, token);
    if (!record) throw Errors.invalidRequest('Token tidak valid');
    if (record.usedAt) throw Errors.invalidRequest('Token sudah dipakai');
    if (record.expiresAt < new Date()) throw Errors.invalidRequest('Token sudah kedaluwarsa');
    await userRepo.markEmailVerified(record.userId);
    await markTokenUsed(pool, record.id);
    return { message: 'Email berhasil diverifikasi' };
  });

  app.post('/auth/resend-verification', async (request) => {
    const pool = getPool();
    await checkIpRateLimit(getRedis(), request.ip, 'register').catch(() => {});
    const { email } = ResendVerificationBody.parse(request.body);
    const user = await userRepo.findForAuth(email);
    if (!user || !mailer) return { message: 'Jika email terdaftar, link verifikasi akan dikirim' };
    const rawToken = await createVerificationToken(pool, user.id);
    const verifyUrl = `${config.PUBLIC_BASE_URL}/v1/auth/verify-email?token=${rawToken}`;
    void mailer.send({
      from: config.EMAIL_FROM, to: email,
      subject: 'Verifikasi email DocGen',
      html: `<p>Klik <a href="${verifyUrl}">di sini</a> untuk memverifikasi. Berlaku 24 jam.</p>`,
      locale: 'id',
    }).catch(() => {});
    return { message: 'Jika email terdaftar, link verifikasi akan dikirim' };
  });

  app.post('/auth/forgot-password', async (request) => {
    const pool = getPool();
    await checkIpRateLimit(getRedis(), request.ip, 'register').catch(() => {});
    const { email } = ForgotPasswordBody.parse(request.body);
    const user = await userRepo.findForAuth(email);
    if (user && mailer) {
      const rawToken = await createResetToken(pool, user.id);
      const resetUrl = `${config.DASHBOARD_URL}/auth/reset-password?token=${rawToken}`;
      void mailer.send({
        from: config.EMAIL_FROM, to: email,
        subject: 'Reset password DocGen',
        html: `<p>Klik <a href="${resetUrl}">di sini</a> untuk mereset password. Berlaku 1 jam.</p>`,
        locale: 'id',
      }).catch(() => {});
    }
    return { message: 'Jika email terdaftar, link reset password akan dikirim' };
  });

  app.post('/auth/reset-password', async (request) => {
    const pool = getPool();
    await checkIpRateLimit(getRedis(), request.ip, 'register').catch(() => {});
    const { token, password } = ResetPasswordBody.parse(request.body);
    const record = await findResetToken(pool, token);
    if (!record) throw Errors.invalidRequest('Token tidak valid');
    if (record.usedAt) throw Errors.invalidRequest('Token sudah dipakai');
    if (record.expiresAt < new Date()) throw Errors.invalidRequest('Token sudah kedaluwarsa');
    const passwordHash = await bcryptHash(password, BCRYPT_ROUNDS);
    await userRepo.updatePassword(record.userId, passwordHash);
    await markResetTokenUsed(pool, record.id);
    return { message: 'Password berhasil direset' };
  });
}

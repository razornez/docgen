import type { Pool } from 'pg';
import type { MailerPort } from '@docgen/shared';
import type { AppConfig } from '@docgen/config';
import { getEmailTemplate, renderEmail, type Lang } from './email-templates.js';

export interface EmailSendOpts {
  to: string;
  lang?: Lang;
  vars?: Record<string, string>;
}

/** Kirim email transaksional berdasarkan key template (best-effort). */
export type EmailSender = (key: string, opts: EmailSendOpts) => Promise<void>;

/**
 * Buat pengirim email yang membaca template terkelola owner, merender, lalu
 * mengirim via mailer. Bila SMTP belum dikonfigurasi (mailer null), fungsi
 * menjadi no-op — alur fitur tetap berjalan dan tinggal aktif saat SMTP diisi.
 */
export function makeEmailSender(
  pool: Pool,
  mailer: MailerPort | null,
  config: AppConfig,
): EmailSender {
  return async (key, { to, lang = 'id', vars = {} }) => {
    try {
      if (!mailer || !to) return;
      const tpl = await getEmailTemplate(pool, key);
      if (!tpl || !tpl.enabled) return;
      const from = tpl.from || config.EMAIL_FROM;
      if (!from) return;
      const { subject, html } = renderEmail(tpl, lang, vars);
      await mailer.send({ from, to, subject, html, locale: lang });
    } catch {
      // Email transaksional best-effort; jangan ganggu alur utama.
    }
  };
}

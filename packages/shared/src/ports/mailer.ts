import type { Locale } from '../locale.js';

/**
 * Port pengirim email (docs/21 — adapter: SMTP/Resend/Mailgun).
 * Email transaksional dikirim dalam locale penerima (docs/22).
 */
export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly locale: Locale;
}

export interface MailerPort {
  send(message: EmailMessage): Promise<void>;
}

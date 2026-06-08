import nodemailer from 'nodemailer';
import type { MailerPort, EmailMessage } from '@docgen/shared';

/**
 * Adapter Brevo SMTP menggunakan nodemailer.
  * Implements MailerPort — bisa diganti adapter lain tanpa ubah service.
   */
   export function createBrevoMailer(config: {
     host: string;
       port: number;
         user: string;
           pass: string;
           }): MailerPort {
             const transport = nodemailer.createTransport({
                 host: config.host,
                     port: config.port,
                         secure: false,
                             auth: { user: config.user, pass: config.pass },
                               });

                                 return {
                                     async send(msg: EmailMessage) {
                                           await transport.sendMail({
                                                   from: msg.from,
                                                           to: msg.to,
                                                                   subject: msg.subject,
                                                                           html: msg.html,
                                                                                 });
                                                                                     },
                                                                                       };
                                                                                       }

import type { Pool } from 'pg';

export type Lang = 'id' | 'en';
export interface Loc {
  id: string;
  en: string;
}

/** Metadata + isi sebuah email transaksional yang dikelola owner. */
export interface EmailTemplate {
  key: string;
  /** Label untuk UI owner. */
  name: Loc;
  /** Kapan email ini dikirim. */
  description: Loc;
  /** Variabel {{...}} yang tersedia untuk template ini. */
  variables: string[];
  subject: Loc;
  /** Isi HTML bagian dalam (dibungkus layout merek DocGen). */
  body: Loc;
  enabled: boolean;
}

const L = (id: string, en: string): Loc => ({ id, en });

// Tombol CTA bergaya inline (kompatibel klien email).
const btn = (label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:9999px;background:linear-gradient(135deg,#9b5de5,#f15bb5)"><a href="{{action_url}}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9999px">${label}</a></td></tr></table>`;

/** Daftar template default (dwibahasa). Owner bisa menimpa via app_settings. */
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    key: 'email_verification',
    name: L('Verifikasi email', 'Email verification'),
    description: L(
      'Dikirim saat pengguna mendaftar atau meminta kirim ulang verifikasi.',
      'Sent when a user signs up or requests a new verification link.',
    ),
    variables: ['name', 'action_url'],
    subject: L('Verifikasi email DocGen Anda', 'Verify your DocGen email'),
    body: {
      id: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Halo {{name}}, satu langkah lagi 👋</h1>
<p>Terima kasih telah mendaftar di <strong>DocGen</strong>. Klik tombol di bawah untuk memverifikasi alamat email Anda dan mengaktifkan akun.</p>
${btn('Verifikasi email')}
<p style="color:#6b647e;font-size:13px">Tautan ini berlaku selama 24 jam. Jika Anda tidak membuat akun ini, abaikan email ini dengan aman.</p>`,
      en: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Hi {{name}}, one more step 👋</h1>
<p>Thanks for signing up for <strong>DocGen</strong>. Click the button below to verify your email address and activate your account.</p>
${btn('Verify email')}
<p style="color:#6b647e;font-size:13px">This link is valid for 24 hours. If you did not create this account, you can safely ignore this email.</p>`,
    },
    enabled: true,
  },
  {
    key: 'welcome',
    name: L('Selamat datang', 'Welcome'),
    description: L(
      'Dikirim setelah akun aktif, berisi sambutan dan langkah awal.',
      'Sent after the account is active, with a welcome and first steps.',
    ),
    variables: ['name', 'credits', 'action_url'],
    subject: L('Selamat datang di DocGen 🎉', 'Welcome to DocGen 🎉'),
    body: {
      id: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Selamat datang, {{name}}!</h1>
<p>Akun DocGen Anda sudah aktif. Anda mendapat <strong>{{credits}} kredit gratis</strong> untuk mulai membuat PDF dari template HTML + data JSON — cukup satu panggilan API.</p>
<p>Langkah cepat untuk memulai:</p>
<ul style="padding-left:18px;color:#3a3357">
  <li>Buat template pertama Anda di dashboard</li>
  <li>Ambil API key di menu API Keys</li>
  <li>Kirim data dan terima PDF rapi dalam hitungan detik</li>
</ul>
${btn('Buka dashboard')}
<p style="color:#6b647e;font-size:13px">Butuh bantuan? Balas email ini atau hubungi support@docgen.id.</p>`,
      en: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Welcome, {{name}}!</h1>
<p>Your DocGen account is active. You have <strong>{{credits}} free credits</strong> to start generating PDFs from HTML templates + JSON data — in a single API call.</p>
<p>Quick steps to get started:</p>
<ul style="padding-left:18px;color:#3a3357">
  <li>Create your first template in the dashboard</li>
  <li>Grab an API key under API Keys</li>
  <li>Send data and receive a clean PDF in seconds</li>
</ul>
${btn('Open dashboard')}
<p style="color:#6b647e;font-size:13px">Need a hand? Reply to this email or reach support@docgen.id.</p>`,
    },
    enabled: true,
  },
  {
    key: 'password_reset',
    name: L('Reset kata sandi', 'Password reset'),
    description: L(
      'Dikirim saat pengguna meminta reset kata sandi (Lupa sandi).',
      'Sent when a user requests a password reset (Forgot password).',
    ),
    variables: ['name', 'action_url'],
    subject: L('Reset kata sandi DocGen', 'Reset your DocGen password'),
    body: {
      id: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Reset kata sandi</h1>
<p>Halo {{name}}, kami menerima permintaan untuk mereset kata sandi akun DocGen Anda. Klik tombol di bawah untuk membuat kata sandi baru.</p>
${btn('Reset kata sandi')}
<p style="color:#6b647e;font-size:13px">Tautan ini berlaku selama 1 jam. Jika Anda tidak meminta ini, abaikan email ini — kata sandi Anda tidak berubah.</p>`,
      en: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Reset your password</h1>
<p>Hi {{name}}, we received a request to reset the password for your DocGen account. Click the button below to set a new password.</p>
${btn('Reset password')}
<p style="color:#6b647e;font-size:13px">This link is valid for 1 hour. If you did not request this, ignore this email — your password stays unchanged.</p>`,
    },
    enabled: true,
  },
  {
    key: 'password_changed',
    name: L('Kata sandi diubah', 'Password changed'),
    description: L(
      'Konfirmasi keamanan setelah kata sandi berhasil diubah.',
      'A security confirmation after the password is successfully changed.',
    ),
    variables: ['name', 'action_url'],
    subject: L(
      'Kata sandi DocGen Anda telah diubah',
      'Your DocGen password was changed',
    ),
    body: {
      id: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Kata sandi berhasil diubah</h1>
<p>Halo {{name}}, kata sandi akun DocGen Anda baru saja diubah. Jika ini Anda, tidak perlu melakukan apa pun.</p>
<p style="color:#b4123f"><strong>Bukan Anda?</strong> Segera amankan akun Anda dan hubungi support@docgen.id.</p>
${btn('Masuk ke dashboard')}`,
      en: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Your password was changed</h1>
<p>Hi {{name}}, the password for your DocGen account was just changed. If this was you, no action is needed.</p>
<p style="color:#b4123f"><strong>Not you?</strong> Secure your account immediately and contact support@docgen.id.</p>
${btn('Sign in to dashboard')}`,
    },
    enabled: true,
  },
  {
    key: 'topup_success',
    name: L('Top-up berhasil', 'Top-up successful'),
    description: L(
      'Kuitansi dikirim setelah pembayaran top-up dikonfirmasi.',
      'A receipt sent after a top-up payment is confirmed.',
    ),
    variables: ['name', 'credits', 'amount', 'balance', 'method', 'action_url'],
    subject: L(
      'Top-up berhasil — {{credits}} kredit ditambahkan',
      'Top-up successful — {{credits}} credits added',
    ),
    body: {
      id: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Pembayaran berhasil ✅</h1>
<p>Halo {{name}}, top-up Anda telah dikonfirmasi dan saldo sudah masuk. Terima kasih!</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #ece4fb;border-radius:12px;overflow:hidden">
  <tr><td style="padding:10px 16px;color:#6b647e">Kredit ditambahkan</td><td style="padding:10px 16px;text-align:right;font-weight:700;color:#2a1c4a">{{credits}}</td></tr>
  <tr><td style="padding:10px 16px;color:#6b647e;border-top:1px solid #f3eefb">Jumlah dibayar</td><td style="padding:10px 16px;text-align:right;font-weight:700;color:#2a1c4a;border-top:1px solid #f3eefb">Rp {{amount}}</td></tr>
  <tr><td style="padding:10px 16px;color:#6b647e;border-top:1px solid #f3eefb">Metode</td><td style="padding:10px 16px;text-align:right;color:#2a1c4a;border-top:1px solid #f3eefb">{{method}}</td></tr>
  <tr><td style="padding:10px 16px;color:#6b647e;border-top:1px solid #f3eefb">Saldo sekarang</td><td style="padding:10px 16px;text-align:right;font-weight:700;color:#16a34a;border-top:1px solid #f3eefb">{{balance}} kredit</td></tr>
</table>
${btn('Lihat dompet')}
<p style="color:#6b647e;font-size:13px">Saldo tidak pernah hangus. Simpan email ini sebagai bukti pembayaran.</p>`,
      en: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Payment successful ✅</h1>
<p>Hi {{name}}, your top-up has been confirmed and your balance is updated. Thank you!</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid #ece4fb;border-radius:12px;overflow:hidden">
  <tr><td style="padding:10px 16px;color:#6b647e">Credits added</td><td style="padding:10px 16px;text-align:right;font-weight:700;color:#2a1c4a">{{credits}}</td></tr>
  <tr><td style="padding:10px 16px;color:#6b647e;border-top:1px solid #f3eefb">Amount paid</td><td style="padding:10px 16px;text-align:right;font-weight:700;color:#2a1c4a;border-top:1px solid #f3eefb">Rp {{amount}}</td></tr>
  <tr><td style="padding:10px 16px;color:#6b647e;border-top:1px solid #f3eefb">Method</td><td style="padding:10px 16px;text-align:right;color:#2a1c4a;border-top:1px solid #f3eefb">{{method}}</td></tr>
  <tr><td style="padding:10px 16px;color:#6b647e;border-top:1px solid #f3eefb">Current balance</td><td style="padding:10px 16px;text-align:right;font-weight:700;color:#16a34a;border-top:1px solid #f3eefb">{{balance}} credits</td></tr>
</table>
${btn('View wallet')}
<p style="color:#6b647e;font-size:13px">Your balance never expires. Keep this email as your payment receipt.</p>`,
    },
    enabled: true,
  },
  {
    key: 'team_invite',
    name: L('Undangan anggota tim', 'Team invitation'),
    description: L(
      'Dikirim saat admin mengundang anggota baru ke workspace.',
      'Sent when an admin invites a new member to the workspace.',
    ),
    variables: ['inviter', 'team', 'action_url'],
    subject: L(
      '{{inviter}} mengundang Anda ke DocGen',
      '{{inviter}} invited you to DocGen',
    ),
    body: {
      id: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Anda diundang bergabung</h1>
<p><strong>{{inviter}}</strong> mengundang Anda untuk bergabung dengan workspace <strong>{{team}}</strong> di DocGen — platform pembuatan dokumen PDF lewat API.</p>
${btn('Terima undangan')}
<p style="color:#6b647e;font-size:13px">Jika Anda merasa tidak mengenal undangan ini, Anda dapat mengabaikannya.</p>`,
      en: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">You have been invited</h1>
<p><strong>{{inviter}}</strong> has invited you to join the <strong>{{team}}</strong> workspace on DocGen — the document generation platform powered by an API.</p>
${btn('Accept invitation')}
<p style="color:#6b647e;font-size:13px">If you do not recognize this invitation, you can safely ignore it.</p>`,
    },
    enabled: true,
  },
  {
    key: 'low_balance',
    name: L('Saldo rendah', 'Low balance'),
    description: L(
      'Peringatan saat saldo kredit menipis di bawah ambang.',
      'A warning when the credit balance drops below a threshold.',
    ),
    variables: ['name', 'balance', 'action_url'],
    subject: L(
      'Saldo DocGen Anda menipis',
      'Your DocGen balance is running low',
    ),
    body: {
      id: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Saldo Anda menipis ⚠️</h1>
<p>Halo {{name}}, sisa saldo Anda tinggal <strong>{{balance}} kredit</strong>. Agar pembuatan dokumen tidak terhenti, isi ulang saldo sekarang.</p>
${btn('Top-up sekarang')}
<p style="color:#6b647e;font-size:13px">Top-up via QRIS, Virtual Account, atau e-wallet. Saldo tidak pernah hangus.</p>`,
      en: `<h1 style="margin:0 0 12px;font-size:20px;color:#2a1c4a">Your balance is low ⚠️</h1>
<p>Hi {{name}}, you have only <strong>{{balance}} credits</strong> left. Top up now so your document generation never stops.</p>
${btn('Top up now')}
<p style="color:#6b647e;font-size:13px">Top up via QRIS, Virtual Account, or e-wallet. Your balance never expires.</p>`,
    },
    enabled: true,
  },
];

/** Bungkus isi email dengan layout bermerk DocGen (inline style). */
function layout(content: string, lang: Lang): string {
  const year = new Date().getFullYear();
  const footer =
    lang === 'en'
      ? `You are receiving this email because you have a DocGen account.`
      : `Anda menerima email ini karena memiliki akun DocGen.`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4eefb">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4eefb;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(99,60,160,.10)">
<tr><td style="background:linear-gradient(135deg,#9b5de5,#f15bb5);padding:22px 28px">
<span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.3px">docgen</span>
</td></tr>
<tr><td style="padding:28px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14.5px;line-height:1.65;color:#3a3357">
${content}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #f0eafa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#9b93b8">
${footer}<br/>© ${year} DocGen · <a href="mailto:support@docgen.id" style="color:#9b5de5;text-decoration:none">support@docgen.id</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) =>
    k in vars ? vars[k]! : '',
  );
}

/** Render template menjadi { subject, html } siap kirim. */
export function renderEmail(
  tpl: EmailTemplate,
  lang: Lang,
  vars: Record<string, string>,
): { subject: string; html: string } {
  const subject = interpolate(tpl.subject[lang] || tpl.subject.id, vars);
  const inner = interpolate(tpl.body[lang] || tpl.body.id, vars);
  return { subject, html: layout(inner, lang) };
}

/** Baca template (default + override owner di app_settings key 'email_templates'). */
export async function readEmailTemplates(pool: Pool): Promise<EmailTemplate[]> {
  const { rows } = await pool.query<{ value: unknown }>(
    `SELECT value FROM app_settings WHERE key='email_templates'`,
  );
  const override = (rows[0]?.value ?? {}) as Record<
    string,
    Partial<Pick<EmailTemplate, 'subject' | 'body' | 'enabled'>>
  >;
  return DEFAULT_EMAIL_TEMPLATES.map((d) => {
    const o = override[d.key];
    if (!o) return d;
    return {
      ...d,
      subject: o.subject ?? d.subject,
      body: o.body ?? d.body,
      enabled: typeof o.enabled === 'boolean' ? o.enabled : d.enabled,
    };
  });
}

export async function getEmailTemplate(
  pool: Pool,
  key: string,
): Promise<EmailTemplate | undefined> {
  const all = await readEmailTemplates(pool);
  return all.find((t) => t.key === key);
}

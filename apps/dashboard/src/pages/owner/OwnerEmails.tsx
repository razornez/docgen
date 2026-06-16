import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOwnerEmails,
  saveOwnerEmails,
  type OwnerEmailTemplate,
} from '../../api/client.js';
import { useLang } from '../../i18n/index.js';

type Lang = 'id' | 'en';

// Variabel contoh untuk pratinjau (cocok dengan backend).
const SAMPLE: Record<string, Record<string, string>> = {
  email_verification: { name: 'Budi', action_url: '#' },
  welcome: { name: 'Budi', credits: '100', action_url: '#' },
  password_reset: { name: 'Budi', action_url: '#' },
  password_changed: { name: 'Budi', action_url: '#' },
  topup_success: {
    name: 'Budi',
    credits: '5.000',
    amount: '649.000',
    balance: '5.420',
    method: 'QRIS',
    action_url: '#',
  },
  team_invite: { inviter: 'Andi', team: 'PT Maju Bersama', action_url: '#' },
  low_balance: { name: 'Budi', balance: '120', action_url: '#' },
};

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? '');
}

/** Bungkus konten email dengan layout bermerk (replika sisi server). */
function wrapEmail(content: string, lang: Lang): string {
  const year = new Date().getFullYear();
  const footer =
    lang === 'en'
      ? 'You are receiving this email because you have a DocGen account.'
      : 'Anda menerima email ini karena memiliki akun DocGen.';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4eefb">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4eefb;padding:24px 10px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(99,60,160,.10)">
<tr><td style="background:linear-gradient(135deg,#9b5de5,#f15bb5);padding:22px 28px">
<span style="font-size:20px;font-weight:800;color:#fff">docgen</span></td></tr>
<tr><td style="padding:28px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14.5px;line-height:1.65;color:#3a3357">
${content}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #f0eafa;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:#9b93b8">
${footer}<br/>© ${year} DocGen · <a href="mailto:support@docgen.id" style="color:#9b5de5;text-decoration:none">support@docgen.id</a></td></tr>
</table></td></tr></table></body></html>`;
}

export default function OwnerEmails() {
  const qc = useQueryClient();
  const { lang: uiLang } = useLang();
  const t = (id: string, en: string) => (uiLang === 'en' ? en : id);
  const q = useQuery({ queryKey: ['owner-emails'], queryFn: getOwnerEmails });

  const [list, setList] = useState<OwnerEmailTemplate[]>([]);
  const [selKey, setSelKey] = useState('');
  const [lang, setLang] = useState<Lang>('id');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const seed = (tpls: OwnerEmailTemplate[]) => {
    setList(tpls.map((x) => ({ ...x })));
    setSelKey((k) => k || tpls[0]?.key || '');
    setError('');
  };
  useEffect(() => {
    if (q.data) seed(q.data.templates);
  }, [q.data]);

  const sel = list.find((x) => x.key === selKey);

  const save = useMutation({
    mutationFn: () =>
      saveOwnerEmails(
        list.map((x) => ({
          key: x.key,
          subject: x.subject,
          body: x.body,
          from: x.from,
          enabled: x.enabled,
        })),
      ),
    onSuccess: () => {
      setSaved(true);
      setError('');
      void qc.invalidateQueries({ queryKey: ['owner-emails'] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : 'Gagal menyimpan'),
  });

  const patch = (key: string, p: Partial<OwnerEmailTemplate>) =>
    setList((cs) => cs.map((c) => (c.key === key ? { ...c, ...p } : c)));
  const patchLoc = (
    key: string,
    field: 'subject' | 'body',
    l: Lang,
    val: string,
  ) =>
    setList((cs) =>
      cs.map((c) =>
        c.key === key ? { ...c, [field]: { ...c[field], [l]: val } } : c,
      ),
    );

  const previewHtml = useMemo(() => {
    if (!sel) return '';
    const vars = SAMPLE[sel.key] ?? {};
    return wrapEmail(interpolate(sel.body[lang], vars), lang);
  }, [sel, lang]);

  const previewSubject = sel
    ? interpolate(sel.subject[lang], SAMPLE[sel.key] ?? {})
    : '';

  const taCls =
    'w-full bg-white/70 border border-white/60 rounded-lg px-3 py-2.5 text-[12.5px] text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand-purple/30 resize-y';

  return (
    <div className="space-y-5">
      <div className="glass rounded-glass px-6 py-5">
        <h1 className="text-[16px] font-bold text-ink">
          {t('Email transaksional', 'Transactional emails')}
        </h1>
        <p className="text-[12.5px] text-mut mt-0.5">
          {t(
            'Kelola isi email yang dikirim otomatis. Dwibahasa (ID/EN), terpasang ke tiap fitur.',
            'Manage the content of automatic emails. Bilingual (ID/EN), wired into each feature.',
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        {/* List */}
        <div className="glass rounded-glass p-2.5 h-fit">
          {list.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setSelKey(tpl.key)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                selKey === tpl.key ? 'bg-[#ece4fb]' : 'hover:bg-white/45'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tpl.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                />
                <span className="text-[13px] font-semibold text-ink truncate">
                  {tpl.name[uiLang]}
                </span>
              </div>
              <p className="text-[11px] text-mut mt-0.5 line-clamp-2 pl-3.5">
                {tpl.description[uiLang]}
              </p>
            </button>
          ))}
        </div>

        {/* Editor + preview */}
        {sel && (
          <div className="space-y-4">
            <div className="glass rounded-glass p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-bold text-ink">
                    {sel.name[uiLang]}
                  </h2>
                  <p className="text-[12px] text-mut mt-0.5">
                    {sel.description[uiLang]}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-[12px] text-mut cursor-pointer select-none flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={sel.enabled}
                    onChange={(e) =>
                      patch(sel.key, { enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-[#9b5de5]"
                  />
                  {t('Aktif', 'Enabled')}
                </label>
              </div>

              {/* Variables */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-mut">
                  {t('Variabel', 'Variables')}:
                </span>
                {sel.variables.map((v) => (
                  <code
                    key={v}
                    className="num text-[11px] bg-white/60 border border-white/50 rounded px-1.5 py-0.5 text-brand-purple"
                  >{`{{${v}}}`}</code>
                ))}
              </div>

              {/* Pengirim */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut mb-1.5">
                  {t('Pengirim (From)', 'Sender (From)')}
                </label>
                <input
                  value={sel.from}
                  onChange={(e) => patch(sel.key, { from: e.target.value })}
                  placeholder="DocGen <no-reply@docgen.razornez.net>"
                  className="num w-full bg-white/70 border border-white/60 rounded-lg px-3 py-2 text-[12.5px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                />
              </div>

              {/* Lang tabs */}
              <div className="flex glass-soft rounded-full p-1 gap-1 w-fit">
                {(['id', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`px-4 py-1.5 text-[12px] font-bold uppercase rounded-full transition-all ${
                      lang === l
                        ? 'bg-grad text-white'
                        : 'text-mut hover:text-ink'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut mb-1.5">
                  {t('Subjek', 'Subject')} ({lang.toUpperCase()})
                </label>
                <input
                  value={sel.subject[lang]}
                  onChange={(e) =>
                    patchLoc(sel.key, 'subject', lang, e.target.value)
                  }
                  className="w-full bg-white/70 border border-white/60 rounded-lg px-3 py-2 text-[13.5px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut mb-1.5">
                  {t('Isi (HTML)', 'Body (HTML)')} ({lang.toUpperCase()})
                </label>
                <textarea
                  value={sel.body[lang]}
                  onChange={(e) =>
                    patchLoc(sel.key, 'body', lang, e.target.value)
                  }
                  rows={12}
                  className={taCls}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Live preview */}
            <div className="glass rounded-glass p-5">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[13px] font-bold text-ink">
                  {t('Pratinjau', 'Preview')}
                </h3>
                <span className="num text-[11px] text-mut truncate max-w-[60%]">
                  {previewSubject}
                </span>
              </div>
              <iframe
                title="email-preview"
                srcDoc={previewHtml}
                className="w-full h-[480px] rounded-xl border border-white/50 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer aksi */}
      {error && (
        <p className="text-[12.5px] text-rose-600 text-right">{error}</p>
      )}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-[12.5px] font-semibold text-emerald-600">
            {t('Tersimpan', 'Saved')} ✓
          </span>
        )}
        <button
          type="button"
          onClick={() => q.data && seed(q.data.templates)}
          className="px-4 py-2.5 text-[13px] font-semibold rounded-full glass-soft text-ink hover:bg-white/60 transition-colors"
        >
          {t('Reset', 'Reset')}
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-5 py-2.5 text-[13px] font-bold rounded-full text-white bg-grad shadow-[0_4px_14px_rgba(155,93,229,0.4)] disabled:opacity-50 hover:opacity-90 transition-all"
        >
          {save.isPending
            ? t('Menyimpan…', 'Saving…')
            : t('Simpan email', 'Save emails')}
        </button>
      </div>
    </div>
  );
}

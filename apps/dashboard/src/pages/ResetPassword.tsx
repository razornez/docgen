import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/client.js';
import { useLang } from '../i18n/index.js';
import { Flower, LangToggle } from '../components/PublicChrome.js';

const inputCls =
  'w-full bg-white/70 border border-white/60 rounded-xl px-3.5 py-2.5 text-[14px] text-ink placeholder:text-mut/70 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 transition-all';

export default function ResetPasswordPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const t = (id: string, en: string) => (lang === 'en' ? en : id);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(
        t(
          'Sandi minimal 8 karakter.',
          'Password must be at least 8 characters.',
        ),
      );
      return;
    }
    if (password !== confirm) {
      setError(
        t(
          'Konfirmasi sandi tidak cocok.',
          'Password confirmation does not match.',
        ),
      );
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('Gagal mereset sandi.', 'Failed to reset password.'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col app-canvas text-ink">
      <div className="flex items-center justify-between px-6 py-5">
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-[13px] font-medium text-mut hover:text-ink transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('Kembali ke masuk', 'Back to sign in')}
        </Link>
        <LangToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-10">
        <div className="glass rounded-[22px] p-7 w-full max-w-[420px]">
          <div className="flex items-center gap-2.5 mb-5">
            <Flower className="w-8 h-8" />
            <span className="text-[18px] font-extrabold tracking-tight text-ink lowercase">
              docgen
            </span>
          </div>

          {!token ? (
            <>
              <h2 className="text-[20px] font-extrabold text-ink">
                {t('Tautan tidak valid', 'Invalid link')}
              </h2>
              <p className="text-[13px] text-mut mt-1.5 leading-relaxed">
                {t(
                  'Tautan reset tidak lengkap atau sudah usang. Minta tautan baru dari halaman masuk.',
                  'The reset link is incomplete or outdated. Request a new one from the sign-in page.',
                )}
              </p>
              <Link
                to="/login"
                className="mt-5 inline-flex w-full items-center justify-center py-3 text-[14px] font-bold rounded-full text-white bg-grad shadow-[0_6px_18px_rgba(155,93,229,0.4)] hover:opacity-90 transition-all"
              >
                {t('Ke halaman masuk', 'Go to sign in')}
              </Link>
            </>
          ) : done ? (
            <>
              <h2 className="text-[20px] font-extrabold text-ink">
                {t('Sandi berhasil diubah', 'Password updated')}
              </h2>
              <p className="text-[13px] text-mut mt-1.5 leading-relaxed">
                {t(
                  'Silakan masuk dengan sandi barumu.',
                  'You can now sign in with your new password.',
                )}
              </p>
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="mt-5 w-full py-3 text-[14px] font-bold rounded-full text-white bg-grad shadow-[0_6px_18px_rgba(155,93,229,0.4)] hover:opacity-90 transition-all"
              >
                {t('Masuk sekarang', 'Sign in now')}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-[22px] font-extrabold text-ink">
                {t('Atur sandi baru', 'Set a new password')}
              </h2>
              <p className="text-[13px] text-mut mt-1 leading-relaxed">
                {t(
                  'Buat sandi baru untuk akunmu.',
                  'Create a new password for your account.',
                )}
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2 text-[12.5px] text-rose-700 bg-rose-50/80 border border-rose-200 rounded-xl px-3 py-2.5">
                  <svg
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <form
                onSubmit={(e) => void handleSubmit(e)}
                className="mt-4 space-y-3.5"
              >
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut mb-1.5">
                    {t('Sandi baru', 'New password')}
                  </label>
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-mut mb-1.5">
                    {t('Ulangi sandi', 'Confirm password')}
                  </label>
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
                <label className="flex items-center gap-2 text-[12.5px] text-mut cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={show}
                    onChange={(e) => setShow(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#9b5de5]"
                  />
                  {t('Tampilkan sandi', 'Show password')}
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-[14px] font-bold rounded-full text-white bg-grad shadow-[0_6px_18px_rgba(155,93,229,0.4)] disabled:opacity-60 hover:opacity-90 transition-all"
                >
                  {loading
                    ? t('Menyimpan…', 'Saving…')
                    : t('Simpan sandi baru', 'Save new password')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ownerLogin, setOwnerToken, getOwnerToken } from '../../api/client.js';

function Flower({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="own-flower" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f15bb5" />
          <stop offset="0.5" stopColor="#9b5de5" />
          <stop offset="1" stopColor="#fca15b" />
        </linearGradient>
      </defs>
      <g fill="url(#own-flower)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse
            key={a}
            cx="16"
            cy="8.5"
            rx="4"
            ry="6.6"
            transform={`rotate(${a} 16 16)`}
          />
        ))}
      </g>
      <circle cx="16" cy="16" r="3.1" fill="#fff" opacity="0.92" />
    </svg>
  );
}

export default function OwnerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getOwnerToken()) navigate('/owner', { replace: true });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await ownerLogin(email.trim(), password);
      setOwnerToken(res.token);
      navigate('/owner', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login owner gagal. Coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center app-canvas px-4">
      <div className="glass rounded-[22px] p-8 w-full max-w-[400px]">
        <div className="flex items-center gap-2.5">
          <Flower />
          <span className="text-[18px] font-extrabold tracking-tight text-ink lowercase">
            docgen
          </span>
        </div>
        <p className="num text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-purple mt-4">
          Owner Console
        </p>
        <h1 className="text-[20px] font-bold text-ink mt-1.5">
          Masuk sebagai owner
        </h1>
        <p className="text-[12.5px] text-mut mt-1 mb-5">
          Panel platform lintas-tenant. Khusus pemilik platform.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-[12.5px] text-rose-700 bg-rose-100/60 rounded-xl px-3 py-2.5">
            <svg
              className="w-4 h-4 flex-shrink-0"
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

        <form onSubmit={(e) => void submit(e)} className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">
              Email owner
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="owner@docgen.local"
              className="w-full glass-soft rounded-xl px-3.5 py-2.5 text-[13px] text-ink placeholder:text-mut focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1.5">
              Kata sandi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full glass-soft rounded-xl px-3.5 py-2.5 text-[13px] text-ink placeholder:text-mut focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-grad text-white text-[13.5px] font-bold shadow-[0_4px_14px_rgba(155,93,229,0.4)] disabled:opacity-60 hover:opacity-90 transition-all"
          >
            {loading ? 'Masuk…' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { exchangeOAuthCode } from '../api/client.js';

export default function AuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    if (!code) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    // Tukar kode sekali-pakai (opaque, 60 detik) dengan JWT asli.
    exchangeOAuthCode(code)
      .then(({ token }) => {
        login(token);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        navigate('/login?error=oauth_failed', { replace: true });
      });
  }, [login, navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Menyelesaikan login…</p>
    </div>
  );
}

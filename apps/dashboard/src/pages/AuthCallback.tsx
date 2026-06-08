import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function AuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get('token');
    if (token) {
      login(token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login?error=oauth_failed', { replace: true });
    }
  }, [login, navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Menyelesaikan login…</p>
    </div>
  );
}

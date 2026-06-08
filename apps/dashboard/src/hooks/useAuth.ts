import { useContext } from 'react';
import { AuthContext, type AuthCtx } from './authStore.js';

export type { AuthCtx };

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

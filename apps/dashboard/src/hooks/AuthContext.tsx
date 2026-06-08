import { useState, useCallback, type ReactNode } from 'react';
import { AuthContext } from './authStore.js';
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from '../api/client.js';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);

  const login = useCallback((t: string) => {
    setStoredToken(t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

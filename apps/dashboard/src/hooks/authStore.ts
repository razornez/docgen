import { createContext } from 'react';

export interface AuthCtx {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthCtx | null>(null);

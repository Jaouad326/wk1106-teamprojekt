import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth muss innerhalb von AuthGate verwendet werden.');
  return auth;
}

/**
 * AuthContext — global authentication state.
 *
 * Provides:
 *  - user: BackendUser | null
 *  - accessToken: string | null
 *  - isLoading: boolean  (true while restoring session on mount)
 *  - login / signUp / loginWithGoogle / logout helpers
 *    that update state and redirect on success
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loginWithEmailPassword,
  signUpWithEmail,
  loginWithGoogle as googleLogin,
  logout as auth0Logout,
  restoreSession,
} from '../services/authService';
import type { BackendUser } from '../services/authService';


// ── Context shape ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: BackendUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, fullName: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<BackendUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore an existing Auth0 session
  useEffect(() => {
    (async () => {
      const session = await restoreSession();
      if (session) {
        setUser(session.user);
        setAccessToken(session.accessToken);
        localStorage.setItem('examreal_access_token', session.accessToken);
      }
      setIsLoading(false);
    })();
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const { user: backendUser, accessToken: token } = await loginWithEmailPassword(email, password);
    setUser(backendUser);
    setAccessToken(token);
    localStorage.setItem('examreal_access_token', token);
    navigate('/');
  }, [navigate]);

  const signUp = useCallback(async (email: string, fullName: string, password: string) => {
    const { user: backendUser, accessToken: token } = await signUpWithEmail(email, fullName, password);
    setUser(backendUser);
    setAccessToken(token);
    localStorage.setItem('examreal_access_token', token);
    navigate('/');
  }, [navigate]);

  const loginWithGoogle = useCallback(async () => {
    const { user: backendUser, accessToken: token } = await googleLogin();
    setUser(backendUser);
    setAccessToken(token);
    localStorage.setItem('examreal_access_token', token);
    navigate('/');
  }, [navigate]);

  const logout = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    await auth0Logout();
  }, []);

  // ── Value ────────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, signUp, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

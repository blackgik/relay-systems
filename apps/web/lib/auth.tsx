'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { AuthSession, User } from './types';

const ACCESS_KEY = 'relay_access';
const REFRESH_KEY = 'relay_refresh';

export interface RegisterResult {
  verificationRequired: true;
  email: string;
  resendInSeconds: number;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** Throws ApiError; status 403 with body.code === 'EMAIL_NOT_VERIFIED' means "go verify". */
  login: (email: string, password: string) => Promise<User>;
  /** Creates the account and emails an OTP. Does not sign in. */
  register: (data: { email: string; phone: string; fullName: string; password: string }) => Promise<RegisterResult>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  resetPassword: (email: string, code: string, password: string) => Promise<User>;
  /** Signs in with tokens obtained elsewhere (Google OAuth exchange). */
  startSession: (session: AuthSession) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return {
    access: localStorage.getItem(ACCESS_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

/** Where a freshly signed-in user should land. */
export function homeFor(user: User) {
  const unfinished = ['NOT_STARTED', 'IN_PROGRESS', 'REJECTED'].includes(user.onboarding?.status);
  return user.kycTier === 'T0' && unfinished ? '/onboarding' : '/dashboard';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const startSession = useCallback((session: AuthSession) => {
    localStorage.setItem(ACCESS_KEY, session.accessToken);
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
    setUser(session.user);
    setToken(session.accessToken);
  }, []);

  const load = useCallback(async () => {
    const { access, refresh } = readTokens();
    if (!access) {
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>('/me', { token: access });
      setUser(me);
      setToken(access);
    } catch {
      if (!refresh) {
        localStorage.removeItem(ACCESS_KEY);
        setLoading(false);
        return;
      }
      try {
        startSession(await api<AuthSession>('/auth/refresh', { method: 'POST', body: { refreshToken: refresh } }));
      } catch {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    }
    setLoading(false);
  }, [startSession]);

  useEffect(() => {
    void load();
  }, [load]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await api<AuthSession>('/auth/login', { method: 'POST', body: { email, password } });
      startSession(session);
      return session.user;
    },
    [startSession]
  );

  const register = useCallback(
    (data: { email: string; phone: string; fullName: string; password: string }) =>
      api<RegisterResult>('/auth/register', { method: 'POST', body: data }),
    []
  );

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      const session = await api<AuthSession>('/auth/verify-email', { method: 'POST', body: { email, code } });
      startSession(session);
      return session.user;
    },
    [startSession]
  );

  const resetPassword = useCallback(
    async (email: string, code: string, password: string) => {
      const session = await api<AuthSession>('/auth/reset-password', {
        method: 'POST',
        body: { email, code, password },
      });
      startSession(session);
      return session.user;
    },
    [startSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { access } = readTokens();
    if (!access) return;
    const me = await api<User>('/me', { token: access });
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, verifyEmail, resetPassword, startSession, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// For pages that need a signed-in user. Redirects from an effect, not during
// render; callers still render nothing while `!loading && !user`.
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.loading && !auth.user) router.replace('/auth/signin');
  }, [auth.loading, auth.user, router]);
  return auth;
}

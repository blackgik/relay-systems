'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { User } from './types';

const ACCESS_KEY = 'relay_access';
const REFRESH_KEY = 'relay_refresh';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    phone: string;
    fullName: string;
    password: string;
  }) => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const rotated = await api<{ user: User; accessToken: string; refreshToken: string }>(
          '/auth/refresh',
          { method: 'POST', body: { refreshToken: refresh } }
        );
        localStorage.setItem(ACCESS_KEY, rotated.accessToken);
        localStorage.setItem(REFRESH_KEY, rotated.refreshToken);
        setUser(rotated.user);
        setToken(rotated.accessToken);
      } catch {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { method: 'POST', body: { email, password } }
    );
    localStorage.setItem(ACCESS_KEY, result.accessToken);
    localStorage.setItem(REFRESH_KEY, result.refreshToken);
    setUser(result.user);
    setToken(result.accessToken);
  }, []);

  const register = useCallback(
    async (data: { email: string; phone: string; fullName: string; password: string }) => {
      const result = await api<{ user: User; accessToken: string; refreshToken: string }>(
        '/auth/register',
        { method: 'POST', body: data }
      );
      localStorage.setItem(ACCESS_KEY, result.accessToken);
      localStorage.setItem(REFRESH_KEY, result.refreshToken);
      setUser(result.user);
      setToken(result.accessToken);
    },
    []
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
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
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

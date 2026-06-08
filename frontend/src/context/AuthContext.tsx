import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevent double-fetch in React 18 StrictMode
  const didFetch = useRef(false);

  useEffect(() => {
    // Listen for session-expired events fired by the axios interceptor.
    // Using a custom event avoids window.location.replace() which would cause
    // a full page reload and restart the loop.
    function handleSessionExpired() {
      setUser(null);
      setLoading(false);
    }
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    // Guard against double-invocation in React 18 StrictMode
    if (didFetch.current) return;
    didFetch.current = true;

    authApi.getProfile()
      .then(res => setUser(res.data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password });
    setUser(res.data.data.user);
  }

  async function logout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    setUser(null);
  }

  async function refreshUser() {
    const res = await authApi.getProfile();
    setUser(res.data.data);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

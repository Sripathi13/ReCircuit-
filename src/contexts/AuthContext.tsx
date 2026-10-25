import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  apiFetch: <T = any>(url: string, options?: RequestInit) => Promise<T>;
  loginWithEmail: (email: string, password?: string, isDemoQuickLogin?: boolean) => Promise<AuthUser>;
  loginWithGoogle: () => Promise<AuthUser>;
  registerUser: (data: Record<string, any>) => Promise<AuthUser>;
  registerShop: (data: Record<string, any>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let inMemoryToken: string | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const updateToken = useCallback((newToken: string | null) => {
    inMemoryToken = newToken;
    setToken(newToken);
  }, []);

  const apiFetch = useCallback(async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (inMemoryToken) {
      headers['Authorization'] = `Bearer ${inMemoryToken}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data as T;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    }
  }, [apiFetch]);

  useEffect(() => {
    let mounted = true;

    // First check session cookie or Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const idToken = await fbUser.getIdToken();
          updateToken(idToken);
        }
        const res = await fetch('/api/auth/me', {
          headers: inMemoryToken ? { Authorization: `Bearer ${inMemoryToken}` } : {},
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted) setUser(data.user);
        } else if (mounted && !inMemoryToken) {
          setUser(null);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [updateToken]);

  const loginWithEmail = async (email: string, password?: string, isDemoQuickLogin?: boolean) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, isDemoQuickLogin }),
    });
    updateToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    updateToken(idToken);
    const res = await apiFetch<{ user: AuthUser }>('/api/auth/me');
    setUser(res.user);
    return res.user;
  };

  const registerUser = async (payload: Record<string, any>) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    updateToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const registerShop = async (payload: Record<string, any>) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>('/api/shops/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    updateToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch {
      // ignore
    }
    updateToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        apiFetch,
        loginWithEmail,
        loginWithGoogle,
        registerUser,
        registerShop,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

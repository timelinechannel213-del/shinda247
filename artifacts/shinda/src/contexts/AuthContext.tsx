import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface AuthState {
  token: string | null;
  userId: number | null;
  username: string | null;
  balanceCents: number;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, userId: number, username: string) => void;
  logout: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  updateBalance: (cents: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'shinda_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token:           null,
    userId:          null,
    username:        null,
    balanceCents:    0,
    isAuthenticated: false,
    isLoading:       true,
  });

  const fetchMe = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        setState(s => ({ ...s, token: null, userId: null, username: null, isAuthenticated: false, isLoading: false }));
        return;
      }
      const data = await res.json();
      setState({
        token,
        userId:          data.userId,
        username:        data.username,
        balanceCents:    data.balanceCents,
        isAuthenticated: true,
        isLoading:       false,
      });
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      fetchMe(stored);
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [fetchMe]);

  const login = useCallback((token: string, userId: number, username: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    fetchMe(token);
  }, [fetchMe]);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setState({
      token:           null,
      userId:          null,
      username:        null,
      balanceCents:    0,
      isAuthenticated: false,
      isLoading:       false,
    });
  }, []);

  const refreshBalance = useCallback(async () => {
    const token = state.token ?? localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setState(s => ({ ...s, balanceCents: data.balanceCents }));
      }
    } catch {}
  }, [state.token]);

  const updateBalance = useCallback((cents: number) => {
    setState(s => ({ ...s, balanceCents: cents }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshBalance, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

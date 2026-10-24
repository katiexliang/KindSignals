// Real session auth backed by the KindSignals API.
//
// A signed token (never the password) is stored in localStorage by the api
// client. On load we restore the session by validating the token via
// /api/auth/me. Login and signup return a token + the user.
//
// Scope note: this is hackathon-grade auth over localhost (bcrypt-hashed
// passwords + a signed session token). It is not production-hardened
// (no HTTPS enforcement, email verification, refresh tokens, or rate limiting).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { UserOut } from "./types";

interface AuthContextValue {
  user: UserOut | null;
  email: string | null;
  isAuthenticated: boolean;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Restore an existing session on load.
  useEffect(() => {
    let active = true;
    if (!api.getToken()) {
      setInitializing(false);
      return;
    }
    api
      .me()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        // Invalid/expired token: clear it.
        api.logout();
        if (active) setUser(null);
      })
      .finally(() => active && setInitializing(false));
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser(res.user);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await api.signup({ email, password, name: name ?? null });
      setUser(res.user);
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const u = await api.me();
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      email: user?.email ?? null,
      isAuthenticated: user !== null,
      initializing,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [user, initializing, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

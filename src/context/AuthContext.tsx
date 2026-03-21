import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "ls_dashboard_token";
const USER_KEY = "ls_dashboard_user";

async function signInDev(email: string, password: string): Promise<{ error: string | null; token?: string; user?: AuthUser }> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return {
    error: null,
    token: data.session?.access_token,
    user: {
      id: data.user?.id ?? "",
      email: data.user?.email ?? "",
      role: (data.user?.user_metadata?.role as "admin" | "user") ?? "user",
    },
  };
}

async function signUpDev(email: string, password: string): Promise<{ error: string | null; token?: string; user?: AuthUser }> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
  );
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  return {
    error: null,
    token: data.session?.access_token,
    user: {
      id: data.user?.id ?? "",
      email: data.user?.email ?? "",
      role: (data.user?.user_metadata?.role as "admin" | "user") ?? "user",
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    if (import.meta.env.DEV) {
      const result = await signInDev(email, password);
      if (result.error) return { error: result.error };
      if (result.token && result.user) {
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
      }
      return { error: null };
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Erro ao fazer login" };
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch {
      return { error: "Erro de conexão. Verifique sua internet." };
    }
  }

  async function signUp(email: string, password: string): Promise<{ error: string | null }> {
    if (import.meta.env.DEV) {
      const result = await signUpDev(email, password);
      if (result.error) return { error: result.error };
      if (result.token && result.user) {
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
      }
      return { error: null };
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Erro ao criar conta" };
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch {
      return { error: "Erro de conexão. Verifique sua internet." };
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          role: (session.user.user_metadata?.role as "admin" | "user") ?? "user",
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setToken(session.access_token);
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          role: (session.user.user_metadata?.role as "admin" | "user") ?? "user",
        });
      } else {
        setToken(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signUp(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  function signOut() {
    supabase.auth.signOut();
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

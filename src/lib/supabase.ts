import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

(window as any).supabase = supabase;

export async function getValidToken(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) {
    const expiresAt = sessionData.session.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt - now > 60) {
      return sessionData.session.access_token;
    }
  }
  const { data, error } = await supabase.auth.refreshSession();
  if (!error && data.session?.access_token) {
    return data.session.access_token;
  }
  return sessionData.session?.access_token ?? null;
}

export async function invokeWithAuth<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  const token = await getValidToken();

  if (!token) {
    return { data: null, error: new Error("Usuário não autenticado") };
  }

  return supabase.functions.invoke<T>(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

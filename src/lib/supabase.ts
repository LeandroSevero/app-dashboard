import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

(window as any).supabase = supabase;

export async function getValidToken(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session) return null;

  const expiresAt = session.expires_at ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpiringSoon = expiresAt - nowSeconds < 60;

  if (!isExpiringSoon) {
    return session.access_token;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed.session?.access_token) {
    return refreshed.session.access_token;
  }

  return session.access_token;
}

export async function invokeWithAuth<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  let token = await getValidToken();

  if (!token) {
    return { data: null, error: new Error("Usuário não autenticado") };
  }

  const result = await supabase.functions.invoke<T>(functionName, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  const responseData = result.data as Record<string, unknown> | null;
  const isJwtError =
    result.error?.message?.includes("Invalid JWT") ||
    result.error?.message?.includes("JWT") ||
    responseData?.code === 401 ||
    (typeof responseData?.message === "string" && responseData.message.includes("Invalid JWT"));

  if (isJwtError) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token ?? null;

    if (!token) {
      return { data: null, error: new Error("Sessão expirada. Faça login novamente.") };
    }

    return supabase.functions.invoke<T>(functionName, {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return result;
}

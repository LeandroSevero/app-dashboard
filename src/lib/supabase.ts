import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

(window as any).supabase = supabase;

export async function invokeWithAuth<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

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

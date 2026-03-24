import { supabase } from "../lib/supabase";
import type { ApiResponse } from "../types/api";
import type { Notification } from "../types/database";

export async function fetchNotifications(): Promise<ApiResponse<Notification[]>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: "Sessão não encontrada." };

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as Notification[] };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function markNotificationRead(id: string): Promise<ApiResponse> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function markAllNotificationsRead(): Promise<ApiResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: "Sessão não encontrada." };

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", session.user.id)
      .eq("read", false);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function triggerExpireApplications(): Promise<void> {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    await fetch(`${SUPABASE_URL}/functions/v1/expire-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Apikey: SUPABASE_ANON_KEY,
      },
    });
  } catch {
    // best-effort
  }
}

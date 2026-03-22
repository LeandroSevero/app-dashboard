import { supabase } from "../lib/supabase";
import type { ApiResponse } from "../types/api";
import type { AdminUser } from "../types/database";
import { logEvent } from "./logService";

export async function fetchAllUsers(): Promise<ApiResponse<AdminUser[]>> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-users");
    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };
    return { success: true, data: data.users || [] };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function updateUser(
  userId: string,
  updates: { newPassword?: string; newEmail?: string; full_name?: string; phone?: string; bio?: string; avatar_url?: string }
): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: { userId, ...updates },
    });
    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };
    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function deleteUser(userId: string): Promise<ApiResponse> {
  try {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function updateApplication(appId: string, newName: string): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-update-application", {
      body: { appId, newName },
    });
    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };

    logEvent("update", appId, { newName });
    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function deleteApplication(appId: string): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("delete-application", {
      body: { id: appId },
    });
    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };

    logEvent("delete", appId, { admin: true });
    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function rotatePassword(
  appId: string
): Promise<ApiResponse<{ new_password: string; new_url: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke("rotate-password", {
      body: { appId },
    });
    if (error) return { success: false, error: error.message };
    if (data?.error) return { success: false, error: data.error };

    logEvent("rotate_password", appId, {});
    return { success: true, data: { new_password: data.new_password, new_url: data.new_url } };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

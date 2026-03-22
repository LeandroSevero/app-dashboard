import { invokeWithAuth } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import type { ApiResponse } from "../types/api";
import type { AdminUser } from "../types/database";
import { logEvent } from "./logService";

export async function fetchAllUsers(): Promise<ApiResponse<AdminUser[]>> {
  try {
    const { data, error } = await invokeWithAuth("admin-users");
    if (error) return { success: false, error: error.message };
    if ((data as Record<string, unknown>)?.error) return { success: false, error: (data as Record<string, unknown>).error as string };
    return { success: true, data: (data as Record<string, unknown>)?.users as AdminUser[] || [] };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function updateUser(
  userId: string,
  updates: { newPassword?: string; newEmail?: string; full_name?: string; phone?: string; bio?: string; avatar_url?: string }
): Promise<ApiResponse> {
  try {
    const { data, error } = await invokeWithAuth("admin-update-user", { userId, ...updates });
    if (error) return { success: false, error: error.message };
    if ((data as Record<string, unknown>)?.error) return { success: false, error: (data as Record<string, unknown>).error as string };
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
    const { data, error } = await invokeWithAuth("admin-update-application", { appId, newName });
    if (error) return { success: false, error: error.message };
    if ((data as Record<string, unknown>)?.error) return { success: false, error: (data as Record<string, unknown>).error as string };

    logEvent("update", appId, { newName });
    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function deleteApplication(appId: string): Promise<ApiResponse> {
  try {
    const { data, error } = await invokeWithAuth("delete-application", { id: appId });
    if (error) return { success: false, error: error.message };
    if ((data as Record<string, unknown>)?.error) return { success: false, error: (data as Record<string, unknown>).error as string };

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
    const { data, error } = await invokeWithAuth("rotate-password", { appId });
    if (error) return { success: false, error: error.message };
    if ((data as Record<string, unknown>)?.error) return { success: false, error: (data as Record<string, unknown>).error as string };

    const d = data as Record<string, unknown>;
    logEvent("rotate_password", appId, {});
    return { success: true, data: { new_password: d.new_password as string, new_url: d.new_url as string } };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

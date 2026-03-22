import { supabase } from "../lib/supabase";
import type { ApiResponse } from "../types/api";
import type { UserProfile } from "../types/database";

export async function fetchProfile(): Promise<ApiResponse<UserProfile>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Não autenticado" };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email || "",
        full_name: data?.name || "",
        phone: data?.phone || "",
        bio: data?.bio || "",
        avatar_url: data?.avatar_url || "",
      },
    };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function saveProfile(
  updates: Partial<UserProfile> & { newPassword?: string; newEmail?: string }
): Promise<ApiResponse<UserProfile>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Não autenticado" };

    const profileUpdates: Record<string, string> = {};
    if (updates.full_name !== undefined) profileUpdates.name = updates.full_name;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.bio !== undefined) profileUpdates.bio = updates.bio;
    if (updates.avatar_url !== undefined) profileUpdates.avatar_url = updates.avatar_url;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...profileUpdates }, { onConflict: "id" });

      if (profileError) return { success: false, error: profileError.message };
    }

    if (updates.newEmail || updates.newPassword) {
      const authUpdates: { email?: string; password?: string } = {};
      if (updates.newEmail) authUpdates.email = updates.newEmail;
      if (updates.newPassword) authUpdates.password = updates.newPassword;

      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) return { success: false, error: authError.message };
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: updates.newEmail || user.email || "",
        full_name: updates.full_name || "",
        phone: updates.phone || "",
        bio: updates.bio || "",
        avatar_url: updates.avatar_url || "",
      },
    };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

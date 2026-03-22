import { supabase } from "./supabase";
import type { Application, AdminUser, UserProfile } from "../types/database";

// =====================
// APPLICATIONS
// =====================

export async function listApplications(): Promise<{ applications: Application[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return { applications: [], error: error.message };

    const applications: Application[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      amqp_url: row.amqp_url,
      username: row.amqp_user,
      password: row.amqp_password,
      cloudamqp_id: row.cloudamqp_id,
      panel_url: row.panel_url,
      created_at: row.created_at,
      mqtt_hostname: row.mqtt_host || undefined,
      mqtt_username: row.mqtt_user || undefined,
      mqtt_password: row.mqtt_password || undefined,
      mqtt_port: row.mqtt_port || undefined,
      mqtt_port_tls: row.mqtt_tls_port || undefined,
    }));

    return { applications };
  } catch {
    return { applications: [], error: "Erro de conexão" };
  }
}

export async function createApplication(
  name: string,
  type: string
): Promise<{ application?: Application; error?: string; next_allowed_at?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("create-application", {
      body: { name, type },
    });

    if (error) return { error: error.message };
    if (data?.error) return { error: data.message || data.error, next_allowed_at: data.next_allowed_at };

    return { application: data.application };
  } catch {
    return { error: "Erro de conexão. Tente novamente." };
  }
}

export async function deleteApplication(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("delete-application", {
      body: { id },
    });

    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };

    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

// =====================
// PROFILE
// =====================

export async function getProfile(): Promise<{ profile?: UserProfile; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return { error: error.message };

    const profile: UserProfile = {
      id: user.id,
      email: user.email || "",
      full_name: data?.name || "",
      phone: data?.phone || "",
      bio: data?.bio || "",
      avatar_url: data?.avatar_url || "",
    };

    return { profile };
  } catch {
    return { error: "Erro de conexão" };
  }
}

export async function updateProfile(
  updates: Partial<UserProfile> & { newPassword?: string; newEmail?: string }
): Promise<{ success?: boolean; profile?: UserProfile; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const profileUpdates: Record<string, string> = {};
    if (updates.full_name !== undefined) profileUpdates.name = updates.full_name;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.bio !== undefined) profileUpdates.bio = updates.bio;
    if (updates.avatar_url !== undefined) profileUpdates.avatar_url = updates.avatar_url;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...profileUpdates }, { onConflict: "id" });

      if (profileError) return { error: profileError.message };
    }

    if (updates.newEmail || updates.newPassword) {
      const authUpdates: { email?: string; password?: string } = {};
      if (updates.newEmail) authUpdates.email = updates.newEmail;
      if (updates.newPassword) authUpdates.password = updates.newPassword;

      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) return { error: authError.message };
    }

    const profile: UserProfile = {
      id: user.id,
      email: updates.newEmail || user.email || "",
      full_name: updates.full_name || "",
      phone: updates.phone || "",
      bio: updates.bio || "",
      avatar_url: updates.avatar_url || "",
    };

    return { success: true, profile };
  } catch {
    return { error: "Erro de conexão" };
  }
}

// =====================
// ADMIN
// =====================

export async function adminListUsers(): Promise<{ users: AdminUser[]; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-users");
    if (error) return { users: [], error: error.message };
    if (data?.error) return { users: [], error: data.error };
    return { users: data.users || [] };
  } catch {
    return { users: [], error: "Erro de conexão" };
  }
}

export async function adminUpdateUser(
  userId: string,
  updates: { newPassword?: string; newEmail?: string }
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: { userId, ...updates },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

export async function adminDeleteUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

export async function adminUpdateApplication(
  appId: string,
  newName: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-update-application", {
      body: { appId, newName },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

export async function adminDeleteApplication(appId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("delete-application", {
      body: { id: appId },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

export async function adminRotatePassword(
  appId: string
): Promise<{ success?: boolean; new_password?: string; new_url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("rotate-password", {
      body: { appId },
    });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error };
    return { success: true, new_password: data.new_password, new_url: data.new_url };
  } catch {
    return { error: "Erro de conexão" };
  }
}

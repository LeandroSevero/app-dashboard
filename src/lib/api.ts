import type { Application, AdminUser } from "../types/database";

function getToken(): string | null {
  return localStorage.getItem("ls_dashboard_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function listApplications(): Promise<{ applications: Application[]; error?: string }> {
  try {
    const res = await fetch("/api/applications/list", {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) return { applications: [], error: data.error };
    return { applications: data.applications };
  } catch {
    return { applications: [], error: "Erro de conexão" };
  }
}

export async function createApplication(
  name: string,
  type: string
): Promise<{ application?: Application; error?: string; next_allowed_at?: string }> {
  try {
    const res = await fetch("/api/applications/create", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name, type }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.message || data.error, next_allowed_at: data.next_allowed_at };
    }
    return { application: data.application };
  } catch {
    return { error: "Erro de conexão. Tente novamente." };
  }
}

export async function deleteApplication(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/applications/delete", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

export async function adminListUsers(): Promise<{ users: AdminUser[]; error?: string }> {
  try {
    const res = await fetch("/api/admin/users", { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return { users: [], error: data.error };
    return { users: data.users };
  } catch {
    return { users: [], error: "Erro de conexão" };
  }
}

export async function adminUpdateUser(
  userId: string,
  updates: { newPassword?: string; newEmail?: string }
): Promise<{ success?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ userId, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

export async function adminDeleteUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
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
    const res = await fetch("/api/admin/update-application", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ appId, newName }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

export async function adminDeleteApplication(appId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/delete-application", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ appId }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    return { success: true };
  } catch {
    return { error: "Erro de conexão" };
  }
}

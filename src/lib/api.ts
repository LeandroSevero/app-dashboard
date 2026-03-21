import type { Application } from "../types/database";

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

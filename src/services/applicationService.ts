import { supabase, invokeWithAuth, getValidToken } from "../lib/supabase";
import type { ApiResponse } from "../types/api";
import type { Application } from "../types/database";
import { logEvent } from "./logService";

function mapRow(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as string,
    amqp_url: (row.amqp_url as string) || "",
    username: (row.amqp_user as string) || (row.mongo_user as string) || "",
    password: (row.amqp_password as string) || (row.mongo_password as string) || "",
    cloudamqp_id: (row.cloudamqp_id as string) || "",
    panel_url: (row.panel_url as string) || "",
    created_at: row.created_at as string,
    user_id: (row.user_id as string) || undefined,
    mqtt_hostname: (row.mqtt_host as string) || undefined,
    mqtt_username: (row.mqtt_user as string) || undefined,
    mqtt_password: (row.mqtt_password as string) || undefined,
    mqtt_port: (row.mqtt_port as number) || undefined,
    mqtt_port_tls: (row.mqtt_tls_port as number) || undefined,
    mongo_db: (row.mongo_db as string) || undefined,
    mongo_user: (row.mongo_user as string) || undefined,
    mongo_password: (row.mongo_password as string) || undefined,
    connection_url: (row.connection_url as string) || undefined,
    expires_at: (row.expires_at as string | null) ?? null,
  };
}

export async function fetchApplications(): Promise<ApiResponse<Application[]>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: "Sessão não encontrada. Faça login novamente." };

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    return { success: true, data: (data || []).map(mapRow) };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

export async function createApplication(
  name: string,
  type: string,
  ttlHours: number | null = null
): Promise<ApiResponse<Application> & { next_allowed_at?: string }> {
  try {
    const token = await getValidToken();

    if (!token) return { success: false, error: "Usuário não autenticado" };

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-application`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ name: name.trim(), type, ttl_hours: ttlHours }),
    });

    let json: Record<string, unknown> = {};
    try {
      json = await res.json();
    } catch {
      return { success: false, error: `Erro HTTP ${res.status}` };
    }

    if (!res.ok) {
      const msg = (json?.error as string) || (json?.message as string) || `Erro HTTP ${res.status}`;
      return { success: false, error: msg, next_allowed_at: json?.next_allowed_at as string | undefined };
    }

    const app = json.application as Application;
    logEvent("create", app.id, { name: app.name, type: app.type });

    return { success: true, data: app };
  } catch {
    return { success: false, error: "Erro de conexão. Tente novamente." };
  }
}

export async function removeApplication(id: string): Promise<ApiResponse> {
  try {
    const { data, error } = await invokeWithAuth("delete-application", { id });

    if (error) return { success: false, error: error.message };
    if ((data as Record<string, unknown>)?.error) return { success: false, error: (data as Record<string, unknown>).error as string };

    logEvent("delete", id, {});
    return { success: true };
  } catch {
    return { success: false, error: "Erro de conexão" };
  }
}

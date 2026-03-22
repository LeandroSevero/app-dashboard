import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authUsersData, error: authUsersError } = await supabase
      .rpc("get_all_auth_users");

    if (authUsersError) {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: apps } = await supabase
        .from("applications")
        .select("*")
        .is("deleted_at", null);

      const appsByUser = new Map<string, unknown[]>();
      for (const app of apps || []) {
        const list = appsByUser.get(app.user_id) || [];
        list.push(mapApp(app));
        appsByUser.set(app.user_id, list);
      }

      const users = (profiles || []).map((p) => ({
        id: p.id,
        email: "",
        role: p.role || "user",
        created_at: p.created_at,
        full_name: p.name || "",
        phone: p.phone || "",
        bio: p.bio || "",
        avatar_url: p.avatar_url || "",
        applications: appsByUser.get(p.id) || [],
      }));

      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: apps } = await supabase
      .from("applications")
      .select("*")
      .is("deleted_at", null);

    const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
    const appsByUser = new Map<string, unknown[]>();
    for (const app of apps || []) {
      const list = appsByUser.get(app.user_id) || [];
      list.push(mapApp(app));
      appsByUser.set(app.user_id, list);
    }

    const users = (authUsersData || []).map((u: { id: string; email: string; created_at: string }) => {
      const profile = profilesMap.get(u.id);
      return {
        id: u.id,
        email: u.email || "",
        role: profile?.role || "user",
        created_at: u.created_at,
        full_name: profile?.name || "",
        phone: profile?.phone || "",
        bio: profile?.bio || "",
        avatar_url: profile?.avatar_url || "",
        applications: appsByUser.get(u.id) || [],
      };
    });

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapApp(app: Record<string, unknown>) {
  return {
    id: app.id,
    name: app.name,
    type: app.type,
    amqp_url: app.amqp_url || "",
    username: app.amqp_user || app.mongo_user || "",
    password: app.amqp_password || app.mongo_password || "",
    cloudamqp_id: app.cloudamqp_id || "",
    panel_url: app.panel_url || "",
    created_at: app.created_at,
    mqtt_hostname: app.mqtt_host,
    mqtt_username: app.mqtt_user,
    mqtt_password: app.mqtt_password,
    mqtt_port: app.mqtt_port,
    mqtt_port_tls: app.mqtt_tls_port,
    mongo_db: app.mongo_db,
    mongo_user: app.mongo_user,
    mongo_password: app.mongo_password,
    connection_url: app.connection_url,
  };
}

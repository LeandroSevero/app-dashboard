import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchRabbitMgmt(hostname: string, username: string, password: string, path: string) {
  const credentials = btoa(`${username}:${password}`);
  const res = await fetch(`https://${hostname}/api${path}`, {
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Management API ${path} ${res.status}`);
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Não autorizado" }, 401);

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
    if (authError || !user) return jsonResponse({ error: "Não autorizado" }, 401);

    const body = await req.json();
    const { appId } = body as { appId: string };
    if (!appId) return jsonResponse({ error: "appId é obrigatório" }, 400);

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === "admin";

    const query = supabase
      .from("applications")
      .select("*")
      .eq("id", appId)
      .is("deleted_at", null);

    if (!isAdmin) query.eq("user_id", user.id);

    const { data: app, error: appError } = await query.maybeSingle();
    if (appError || !app) return jsonResponse({ error: "Aplicação não encontrada" }, 404);

    const hostname = app.mqtt_host;
    const username = app.amqp_user || app.username;
    const password = app.amqp_password || app.password;

    if (!hostname || !username || !password) {
      return jsonResponse({ stats: null, error: "Credenciais de gestão não disponíveis" });
    }

    try {
      const [overview, queues] = await Promise.all([
        fetchRabbitMgmt(hostname, username, password, "/overview"),
        fetchRabbitMgmt(hostname, username, password, "/queues"),
      ]);

      const connections = overview?.object_totals?.connections ?? 0;
      const consumers = overview?.object_totals?.consumers ?? 0;
      const queueCount = overview?.object_totals?.queues ?? 0;

      let totalMessages = 0;
      let maxQueueLength = 0;
      const queueList: Array<{ name: string; messages: number; consumers: number; state: string }> = [];

      for (const q of (queues || [])) {
        const msgs = q.messages ?? 0;
        totalMessages += msgs;
        if (msgs > maxQueueLength) maxQueueLength = msgs;
        queueList.push({
          name: q.name,
          messages: msgs,
          consumers: q.consumers ?? 0,
          state: q.state ?? "running",
        });
      }

      return jsonResponse({
        stats: {
          connections,
          consumers,
          queue_count: queueCount,
          total_messages: totalMessages,
          max_queue_length: maxQueueLength,
          queues: queueList,
        },
      });
    } catch {
      return jsonResponse({ stats: null, error: "Não foi possível conectar à API de gestão" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return jsonResponse({ error: message }, 500);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

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
    if (authError || !user) return json({ error: "Não autorizado" }, 401);

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (callerProfile?.role !== "admin") return json({ error: "Acesso negado" }, 403);

    let body: { limit?: number; event_type?: string } = {};
    try { body = await req.json(); } catch { /* no body */ }

    const limit = Math.min(body.limit ?? 100, 500);
    const eventType = body.event_type;

    let query = supabase
      .from("app_events")
      .select("id, user_id, application_id, event_type, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventType) query = query.eq("event_type", eventType);

    const { data: events, error: eventsError } = await query;
    if (eventsError) return json({ error: eventsError.message }, 500);

    const userIds = [...new Set((events || []).map((e: { user_id: string }) => e.user_id).filter(Boolean))];
    let emailMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const { data: authUsers } = await supabase.rpc("get_all_auth_users").then(
        (res) => res
      );

      const authEmailMap: Record<string, string> = {};
      for (const u of authUsers || []) {
        authEmailMap[u.id] = u.email || "";
      }

      for (const p of profiles || []) {
        emailMap[p.id] = authEmailMap[p.id] || p.name || p.id;
      }
    }

    const enriched = (events || []).map((e: Record<string, unknown>) => ({
      ...e,
      user_email: emailMap[e.user_id as string] || (e.user_id as string),
    }));

    return json({ logs: enriched, total: enriched.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return json({ error: message }, 500);
  }
});

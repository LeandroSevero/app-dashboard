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

    const [profilesRes, allAppsRes, activeAppsRes, limitsRes, eventsRes, authUsersRes] = await Promise.all([
      supabase.from("profiles").select("id, role, created_at"),
      supabase.from("applications").select("id, type, created_at, user_id"),
      supabase.from("applications").select("id, type, created_at, user_id").is("deleted_at", null),
      supabase.from("user_limits").select("user_id, app_type, last_created_at, max_apps"),
      supabase.from("app_events").select("event_type, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.rpc("get_all_auth_users"),
    ]);

    const profiles = profilesRes.data || [];
    const allApps = allAppsRes.data || [];
    const activeApps = activeAppsRes.data || [];
    const limits = limitsRes.data || [];
    const events = eventsRes.data || [];
    const authUsers = authUsersRes.data || [];

    const capacityByType = limits.reduce((acc: Record<string, number>, l: { app_type: string; max_apps: number }) => {
      acc[l.app_type] = (acc[l.app_type] || 0) + (l.max_apps || 0);
      return acc;
    }, {});

    const totalUsers = profiles.length;
    const totalAdmins = profiles.filter((p: { role: string }) => p.role === "admin").length;
    const totalApps = activeApps.length;

    const byType = activeApps.reduce((acc: Record<string, number>, a: { type: string }) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});

    const errorEvents = events.filter((e: { event_type: string }) => e.event_type === "error");
    const recentErrors = errorEvents.slice(0, 5);

    const appsLast7Days = (() => {
      const days: Record<string, number> = {};
      const now = Date.now();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        days[d.toISOString().slice(0, 10)] = 0;
      }
      for (const a of allApps) {
        const day = (a.created_at as string).slice(0, 10);
        if (day in days) days[day]++;
      }
      return Object.entries(days).map(([date, count]) => ({ date, count }));
    })();

    const usersLast7Days = (() => {
      const days: Record<string, number> = {};
      const now = Date.now();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        days[d.toISOString().slice(0, 10)] = 0;
      }
      const usersSource = authUsers.length > 0 ? authUsers : profiles;
      for (const u of usersSource) {
        const day = (u.created_at as string).slice(0, 10);
        if (day in days) days[day]++;
      }
      return Object.entries(days).map(([date, count]) => ({ date, count }));
    })();

    return json({
      stats: {
        total_users: totalUsers,
        total_admins: totalAdmins,
        total_apps: totalApps,
        by_type: {
          rabbitmq: byType["rabbitmq"] || 0,
          lavinmq: byType["lavinmq"] || 0,
          mongodb: byType["mongodb"] || 0,
        },
        capacity_by_type: {
          rabbitmq: capacityByType["rabbitmq"] || 0,
          lavinmq: capacityByType["lavinmq"] || 0,
          mongodb: capacityByType["mongodb"] || 0,
        },
        apps_last_7_days: appsLast7Days,
        users_last_7_days: usersLast7Days,
        recent_errors: recentErrors,
        total_errors: errorEvents.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return json({ error: message }, 500);
  }
});

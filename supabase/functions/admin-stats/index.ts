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
      supabase.from("profiles").select("id, role, created_at, name"),
      supabase.from("applications").select("id, type, created_at, user_id"),
      supabase.from("applications").select("id, type, created_at, user_id").is("deleted_at", null),
      supabase.from("user_limits").select("user_id, app_type, max_apps"),
      supabase.from("app_events").select("event_type, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.rpc("get_all_auth_users"),
    ]);

    const profiles = profilesRes.data || [];
    const allApps = allAppsRes.data || [];
    const activeApps = activeAppsRes.data || [];
    const limits = limitsRes.data || [];
    const events = eventsRes.data || [];
    const authUsers = authUsersRes.data || [];

    const profilesMap = new Map(profiles.map((p: { id: string; name: string }) => [p.id, p]));

    const totalUserCount = profiles.length;
    const capacityByType: Record<string, number> = {
      rabbitmq: totalUserCount,
      lavinmq: totalUserCount,
      mongodb: totalUserCount,
    };

    const usedByType = activeApps.reduce((acc: Record<string, number>, a: { type: string }) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});

    const totalUsers = profiles.length;
    const totalAdmins = profiles.filter((p: { role: string }) => p.role === "admin").length;
    const totalApps = activeApps.length;

    const byType = usedByType;

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

    const activeAppsCountByUserAndType: Record<string, Record<string, number>> = {};
    for (const a of activeApps) {
      if (!activeAppsCountByUserAndType[a.user_id]) activeAppsCountByUserAndType[a.user_id] = {};
      activeAppsCountByUserAndType[a.user_id][a.type] = (activeAppsCountByUserAndType[a.user_id][a.type] || 0) + 1;
    }

    const userLimitsGrouped: Record<string, Record<string, number>> = {};
    for (const l of limits as { user_id: string; app_type: string; max_apps: number }[]) {
      if (!userLimitsGrouped[l.user_id]) userLimitsGrouped[l.user_id] = {};
      userLimitsGrouped[l.user_id][l.app_type] = l.max_apps;
    }

    const userUsageByType: Array<{
      user_id: string;
      user_name: string;
      by_type: { rabbitmq: { used: number; max: number }; lavinmq: { used: number; max: number }; mongodb: { used: number; max: number } };
    }> = [];

    const allUserIds = new Set([
      ...Object.keys(userLimitsGrouped),
      ...Object.keys(activeAppsCountByUserAndType),
    ]);

    for (const uid of allUserIds) {
      const profile = profilesMap.get(uid) as { name?: string } | undefined;
      const authUser = (authUsers as { id: string; email: string }[]).find((u) => u.id === uid);
      const userName = profile?.name || authUser?.email || uid.slice(0, 8);
      const usedForUser = activeAppsCountByUserAndType[uid] || {};
      const limitsForUser = userLimitsGrouped[uid] || {};
      userUsageByType.push({
        user_id: uid,
        user_name: userName,
        by_type: {
          rabbitmq: { used: usedForUser["rabbitmq"] || 0, max: limitsForUser["rabbitmq"] || 0 },
          lavinmq: { used: usedForUser["lavinmq"] || 0, max: limitsForUser["lavinmq"] || 0 },
          mongodb: { used: usedForUser["mongodb"] || 0, max: limitsForUser["mongodb"] || 0 },
        },
      });
    }

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
        user_usage_by_type: userUsageByType,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return json({ error: message }, 500);
  }
});

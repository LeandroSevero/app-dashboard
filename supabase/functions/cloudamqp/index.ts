import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLOUDAMQP_API_KEY = Deno.env.get("CLOUDAMQP_API_KEY") ?? "";
const CLOUDAMQP_API_URL = "https://customer.cloudamqp.com/api";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function cloudamqpRequest(path: string, method: string, body?: object) {
  const credentials = btoa(`${CLOUDAMQP_API_KEY}:`);
  const res = await fetch(`${CLOUDAMQP_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CloudAMQP error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/cloudamqp", "");

    if (req.method === "POST" && path === "/create") {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentApps, error: recentError } = await supabase
        .from("applications")
        .select("id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", twentyFourHoursAgo)
        .limit(1);

      if (recentError) throw recentError;

      if (recentApps && recentApps.length > 0) {
        const lastCreated = new Date(recentApps[0].created_at);
        const nextAllowed = new Date(lastCreated.getTime() + 24 * 60 * 60 * 1000);
        return new Response(
          JSON.stringify({
            error: "Limite de criação atingido",
            message: "Você só pode criar 1 aplicação a cada 24 horas.",
            next_allowed_at: nextAllowed.toISOString(),
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { name, type } = await req.json();
      if (!name || !type) {
        return new Response(JSON.stringify({ error: "Nome e tipo são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const planName = type === "lavinmq" ? "lemur-1" : "lemur";

      let cloudamqpData: {
        id: string | number;
        url: string;
        login: string;
        password: string;
        apikey: string;
      } | null = null;

      if (CLOUDAMQP_API_KEY) {
        cloudamqpData = await cloudamqpRequest("/instances", "POST", {
          name,
          plan: planName,
          region: "amazon-web-services::us-east-1",
        });
      } else {
        const mockId = crypto.randomUUID();
        cloudamqpData = {
          id: mockId,
          url: `amqps://mock_user:mock_pass@bunny.cloudamqp.com/${mockId}`,
          login: "mock_user",
          password: "mock_pass_" + mockId.substring(0, 8),
          apikey: mockId,
        };
      }

      if (!cloudamqpData) throw new Error("Falha ao criar instância no CloudAMQP");

      const panelUrl = CLOUDAMQP_API_KEY
        ? `https://customer.cloudamqp.com/instance/${cloudamqpData.id}`
        : `https://customer.cloudamqp.com/instance/${cloudamqpData.id}`;

      const { data: app, error: insertError } = await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          name,
          type,
          amqp_url: cloudamqpData.url,
          username: cloudamqpData.login,
          password: cloudamqpData.password,
          cloudamqp_id: String(cloudamqpData.id),
          panel_url: panelUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, application: app }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE" && path.startsWith("/delete/")) {
      const appId = path.replace("/delete/", "");

      const { data: app, error: fetchError } = await supabase
        .from("applications")
        .select("*")
        .eq("id", appId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!app) {
        return new Response(JSON.stringify({ error: "Aplicação não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (CLOUDAMQP_API_KEY && app.cloudamqp_id) {
        await cloudamqpRequest(`/instances/${app.cloudamqp_id}`, "DELETE");
      }

      const { error: deleteError } = await supabase
        .from("applications")
        .delete()
        .eq("id", appId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

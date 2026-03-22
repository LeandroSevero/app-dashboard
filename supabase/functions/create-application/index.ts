import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLOUDAMQP_API_KEY = Deno.env.get("CLOUDAMQP_API_KEY") || "";
const CLOUDAMQP_API_URL = "https://customer.cloudamqp.com/api";

const PLAN_MAP: Record<string, string> = {
  rabbitmq: "lemur",
  lavinmq: "lemming",
};

async function cloudamqpRequest(path: string, method: string, body?: unknown) {
  const credentials = btoa(`${CLOUDAMQP_API_KEY}:`);
  const res = await fetch(`${CLOUDAMQP_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await res.text();
  console.log(`[cloudamqp] ${method} ${path} -> status=${res.status} body=${responseText}`);

  if (!res.ok) {
    throw new Error(`CloudAMQP ${res.status}: ${responseText}`);
  }

  if (res.status === 204 || !responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

async function createCloudamqpInstance(name: string, type: string) {
  const normalizedType = type.toLowerCase();

  console.log(`[create-application] Creating instance: name=${name} type=${normalizedType}`);

  if (!CLOUDAMQP_API_KEY) {
    console.log("[create-application] No API key, returning mock instance");
    const mockId = Math.random().toString(36).substring(2, 10);
    return {
      id: mockId,
      url: `amqps://mock_${mockId}:mock_pass_${mockId}@bunny.cloudamqp.com/${mockId}`,
      login: `mock_${mockId}`,
      password: `mock_pass_${mockId}`,
      management_url: `https://customer.cloudamqp.com/instance/${mockId}`,
    };
  }

  const plan = PLAN_MAP[normalizedType];
  if (!plan) {
    throw new Error(`Tipo de instância inválido: "${type}". Tipos suportados: rabbitmq, lavinmq`);
  }

  const payload = {
    name,
    plan,
    region: "amazon-web-services::us-east-1",
  };

  console.log(`[create-application] CloudAMQP payload: ${JSON.stringify(payload)}`);

  return cloudamqpRequest("/instances", "POST", payload);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("[create-application] Authorization header present:", !!authHeader);

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado", debug: "missing_auth_header" }), {
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
    console.log("[create-application] getUser result:", { userId: user?.id, error: authError?.message });

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado", debug: authError?.message || "no_user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { name, type } = body;

    console.log(`[create-application] Received: name=${name} type=${type}`);

    if (!name || !type) {
      return new Response(JSON.stringify({ error: "Nome e tipo são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedType = type.toLowerCase();
    if (!["rabbitmq", "lavinmq"].includes(normalizedType)) {
      return new Response(
        JSON.stringify({ error: `Tipo inválido: "${type}". Use "rabbitmq" ou "lavinmq"` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: limitData } = await supabase
      .from("user_limits")
      .select("last_created_at, max_apps")
      .eq("user_id", user.id)
      .maybeSingle();

    if (limitData?.last_created_at && limitData.last_created_at > twentyFourHoursAgo) {
      const nextAllowed = new Date(new Date(limitData.last_created_at).getTime() + 24 * 60 * 60 * 1000);
      return new Response(
        JSON.stringify({
          error: "Limite de criação atingido",
          message: "Você só pode criar 1 aplicação a cada 24 horas.",
          next_allowed_at: nextAllowed.toISOString(),
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instance = await createCloudamqpInstance(name, normalizedType);
    const managementUrl = instance.management_url || `https://customer.cloudamqp.com/instance/${instance.id}`;
    const now = new Date().toISOString();

    console.log(`[create-application] Instance created: id=${instance.id}`);

    const { data: app, error: insertError } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        name,
        type: normalizedType,
        cloudamqp_id: String(instance.id),
        amqp_url: instance.url,
        amqp_user: instance.login,
        amqp_password: instance.password,
        panel_url: managementUrl,
        created_at: now,
      })
      .select()
      .single();

    if (insertError) {
      console.log("[create-application] Insert error:", insertError.message);
      throw insertError;
    }

    await supabase
      .from("user_limits")
      .upsert({ user_id: user.id, last_created_at: now }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({
        success: true,
        application: {
          id: app.id,
          name: app.name,
          type: app.type,
          amqp_url: app.amqp_url,
          username: app.amqp_user,
          password: app.amqp_password,
          cloudamqp_id: app.cloudamqp_id,
          panel_url: app.panel_url,
          created_at: app.created_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor";
    console.log("[create-application] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

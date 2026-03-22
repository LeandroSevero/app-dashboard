import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLOUDAMQP_API_KEY = Deno.env.get("CLOUDAMQP_API_KEY") || "";
const CLOUDAMQP_BASE_URL = "https://customer.cloudamqp.com/api";

const PLAN_MAP: Record<string, string> = {
  rabbitmq: "lemur",
  lavinmq: "lemming",
};

function parseAmqpUrl(url: string): { username: string; password: string; hostname: string; vhost: string } {
  try {
    const parsed = new URL(url);
    return {
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      hostname: parsed.hostname,
      vhost: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    };
  } catch {
    return { username: "", password: "", hostname: "", vhost: "" };
  }
}

async function cloudamqpGet(path: string) {
  const credentials = btoa(`:${CLOUDAMQP_API_KEY}`);
  const res = await fetch(`${CLOUDAMQP_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  console.log(`[cloudamqp] GET ${path} -> status=${res.status} body=${text}`);
  if (!res.ok) throw new Error(`CloudAMQP GET ${path} ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function cloudamqpPost(path: string, body: unknown) {
  const credentials = btoa(`:${CLOUDAMQP_API_KEY}`);
  const bodyJson = JSON.stringify(body);
  console.log(`[cloudamqp] POST ${path} payload=${bodyJson}`);
  const res = await fetch(`${CLOUDAMQP_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: bodyJson,
  });
  const text = await res.text();
  console.log(`[cloudamqp] POST ${path} -> status=${res.status} body=${text}`);
  if (!res.ok) throw new Error(`CloudAMQP POST ${path} ${res.status}: ${text}`);
  if (!text) return null;
  return JSON.parse(text);
}

interface InstanceDetails {
  amqpUrl: string;
  username: string;
  password: string;
  hostname: string;
  vhost: string;
  managementUrl: string;
  mqttHostname: string;
  mqttPort: number;
  mqttTlsPort: number;
  cloudamqpId: string;
  apikey: string;
}

async function createAndFetchInstance(name: string, type: string): Promise<InstanceDetails> {
  const normalizedType = type.toLowerCase();
  const plan = PLAN_MAP[normalizedType];
  if (!plan) throw new Error(`Tipo inválido: "${type}". Use rabbitmq ou lavinmq`);

  if (!CLOUDAMQP_API_KEY) {
    const mockId = Math.random().toString(36).substring(2, 10);
    const mockPass = Math.random().toString(36).substring(2, 18);
    const mockHost = `${mockId}.cloudamqp.com`;
    return {
      amqpUrl: `amqps://${mockId}:${mockPass}@${mockHost}/${mockId}`,
      username: mockId,
      password: mockPass,
      hostname: mockHost,
      vhost: mockId,
      managementUrl: `https://customer.cloudamqp.com/instance/mock_${mockId}`,
      mqttHostname: mockHost,
      mqttPort: 1883,
      mqttTlsPort: 8883,
      cloudamqpId: `mock_${mockId}`,
      apikey: `mock_apikey_${mockId}`,
    };
  }

  const created = await cloudamqpPost("/instances", {
    name,
    plan,
    region: "amazon-web-services::us-east-1",
  });

  const instanceId = String(created.id);
  const amqpUrl: string = created.url || "";

  const { username, password, hostname, vhost } = parseAmqpUrl(amqpUrl);

  let mqttHostname = hostname;
  let managementUrl = `https://customer.cloudamqp.com/instance/${instanceId}`;

  try {
    const details = await cloudamqpGet(`/instances/${instanceId}`);
    if (details?.urls?.hostname_external) {
      mqttHostname = details.urls.hostname_external;
    }
    if (details?.management_url) {
      managementUrl = details.management_url;
    }
  } catch (e) {
    console.log(`[cloudamqp] Could not fetch instance details: ${e}`);
  }

  return {
    amqpUrl,
    username,
    password,
    hostname,
    vhost,
    managementUrl,
    mqttHostname,
    mqttPort: 1883,
    mqttTlsPort: 8883,
    cloudamqpId: instanceId,
    apikey: created.apikey || "",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("[create-application] Authorization present:", !!authHeader);

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
    console.log("[create-application] user:", user?.id, "authError:", authError?.message);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado", detail: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { name?: string; type?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, type } = body;
    console.log(`[create-application] Received: name=${name} type=${type}`);

    if (!name || !type) {
      return new Response(JSON.stringify({ error: "name e type são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedType = type.toLowerCase();
    if (!["rabbitmq", "lavinmq"].includes(normalizedType)) {
      return new Response(
        JSON.stringify({ error: `Tipo inválido: "${type}". Use rabbitmq ou lavinmq` }),
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

    const instance = await createAndFetchInstance(name, normalizedType);
    console.log(`[create-application] Instance ready: id=${instance.cloudamqpId} host=${instance.hostname}`);

    const now = new Date().toISOString();

    const { data: app, error: insertError } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        name,
        type: normalizedType,
        cloudamqp_id: instance.cloudamqpId,
        amqp_url: instance.amqpUrl,
        amqp_user: instance.username,
        amqp_password: instance.password,
        panel_url: instance.managementUrl,
        mqtt_host: instance.mqttHostname,
        mqtt_port: instance.mqttPort,
        mqtt_tls_port: instance.mqttTlsPort,
        mqtt_user: instance.username,
        mqtt_password: instance.password,
        created_at: now,
      })
      .select()
      .single();

    if (insertError) {
      console.log("[create-application] DB insert error:", insertError.message);
      throw new Error(`Erro ao salvar aplicação: ${insertError.message}`);
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
          mqtt_hostname: app.mqtt_host,
          mqtt_port: app.mqtt_port,
          mqtt_port_tls: app.mqtt_tls_port,
          mqtt_username: app.mqtt_user,
          mqtt_password: app.mqtt_password,
          created_at: app.created_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor";
    console.log("[create-application] Unhandled error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

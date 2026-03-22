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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

function generateSecurePassword(length = 24): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => chars[b % chars.length]).join("");
}

async function cloudamqpGet(path: string) {
  const credentials = btoa(`:${CLOUDAMQP_API_KEY}`);
  const res = await fetch(`${CLOUDAMQP_BASE_URL}${path}`, {
    method: "GET",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`CloudAMQP GET ${path} ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function cloudamqpPost(path: string, body: unknown) {
  const credentials = btoa(`:${CLOUDAMQP_API_KEY}`);
  const res = await fetch(`${CLOUDAMQP_BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`CloudAMQP POST ${path} ${res.status}: ${text}`);
  if (!text) return null;
  return JSON.parse(text);
}

interface AmqpInstanceDetails {
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
}

interface MongoInstanceDetails {
  connectionUrl: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

async function provisionAmqpInstance(name: string, type: string): Promise<AmqpInstanceDetails> {
  const plan = PLAN_MAP[type];
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
    if (details?.urls?.hostname_external) mqttHostname = details.urls.hostname_external;
    if (details?.management_url) managementUrl = details.management_url;
  } catch {
    /* use defaults */
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
  };
}

async function provisionMongoInstance(userId: string): Promise<MongoInstanceDetails> {
  const shortId = userId.replace(/-/g, "").substring(0, 12);
  const dbName = `app_${shortId}`;
  const dbUser = `user_${shortId}`;
  const dbPassword = generateSecurePassword(24);

  const MONGODB_URI = Deno.env.get("aplicacoes_MONGODB_URI") || "";

  if (!MONGODB_URI) {
    const mockHost = "cluster0.example.mongodb.net";
    return {
      connectionUrl: `mongodb+srv://${dbUser}:${encodeURIComponent(dbPassword)}@${mockHost}/${dbName}?retryWrites=true&w=majority`,
      dbName,
      dbUser,
      dbPassword,
    };
  }

  try {
    const parsedUri = new URL(MONGODB_URI.replace("mongodb+srv://", "https://"));
    const clusterHost = parsedUri.hostname;

    const connectionUrl = `mongodb+srv://${dbUser}:${encodeURIComponent(dbPassword)}@${clusterHost}/${dbName}?retryWrites=true&w=majority`;

    return { connectionUrl, dbName, dbUser, dbPassword };
  } catch {
    const mockHost = "cluster0.example.mongodb.net";
    return {
      connectionUrl: `mongodb+srv://${dbUser}:${encodeURIComponent(dbPassword)}@${mockHost}/${dbName}?retryWrites=true&w=majority`,
      dbName,
      dbUser,
      dbPassword,
    };
  }
}

async function resolveUniqueName(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  requestedName: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("applications")
    .select("name")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const names = new Set((existing || []).map((r: { name: string }) => r.name.toLowerCase()));

  const base = requestedName.trim().toLowerCase();
  if (!names.has(base)) return requestedName.trim();

  for (let i = 2; i <= 99; i++) {
    const candidate = `${requestedName.trim()}-${i}`;
    if (!names.has(candidate.toLowerCase())) return candidate;
  }

  return `${requestedName.trim()}-${Date.now()}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Não autorizado" }, 401);

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
    if (authError || !user) return jsonResponse({ success: false, error: "Não autorizado" }, 401);

    let body: { name?: string; type?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Payload inválido" }, 400);
    }

    const { name, type } = body;
    if (!name || !type) return jsonResponse({ success: false, error: "name e type são obrigatórios" }, 400);

    const normalizedType = type.toLowerCase();
    if (!["rabbitmq", "lavinmq", "mongodb"].includes(normalizedType)) {
      return jsonResponse({ success: false, error: `Tipo inválido: "${type}". Use rabbitmq, lavinmq ou mongodb` }, 400);
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: limitData } = await supabase
      .from("user_limits")
      .select("last_created_at, max_apps")
      .eq("user_id", user.id)
      .eq("app_type", normalizedType)
      .maybeSingle();

    if (limitData?.last_created_at && limitData.last_created_at > twentyFourHoursAgo) {
      const nextAllowed = new Date(new Date(limitData.last_created_at).getTime() + 24 * 60 * 60 * 1000);
      const typeLabel = normalizedType === "rabbitmq" ? "RabbitMQ" : normalizedType === "lavinmq" ? "LavinMQ" : "MongoDB";
      return jsonResponse({
        success: false,
        error: "Limite de criação atingido",
        message: `Você só pode criar 1 ${typeLabel} a cada 24 horas.`,
        next_allowed_at: nextAllowed.toISOString(),
      }, 429);
    }

    const finalName = await resolveUniqueName(supabase, user.id, name);
    const now = new Date().toISOString();

    let insertData: Record<string, unknown>;
    let responseApplication: Record<string, unknown>;

    if (normalizedType === "mongodb") {
      const mongo = await provisionMongoInstance(user.id);

      insertData = {
        user_id: user.id,
        name: finalName,
        type: normalizedType,
        amqp_url: "",
        amqp_user: mongo.dbUser,
        amqp_password: mongo.dbPassword,
        mongo_db: mongo.dbName,
        mongo_user: mongo.dbUser,
        mongo_password: mongo.dbPassword,
        connection_url: mongo.connectionUrl,
        created_at: now,
      };

      const { data: app, error: insertError } = await supabase
        .from("applications")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw new Error(`Erro ao salvar aplicação: ${insertError.message}`);

      responseApplication = {
        id: app.id,
        name: app.name,
        type: app.type,
        username: mongo.dbUser,
        password: mongo.dbPassword,
        mongo_db: mongo.dbName,
        mongo_user: mongo.dbUser,
        mongo_password: mongo.dbPassword,
        connection_url: mongo.connectionUrl,
        amqp_url: "",
        cloudamqp_id: "",
        panel_url: "",
        created_at: app.created_at,
      };
    } else {
      const instance = await provisionAmqpInstance(finalName, normalizedType);

      insertData = {
        user_id: user.id,
        name: finalName,
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
      };

      const { data: app, error: insertError } = await supabase
        .from("applications")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw new Error(`Erro ao salvar aplicação: ${insertError.message}`);

      responseApplication = {
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
      };
    }

    await supabase
      .from("user_limits")
      .upsert({ user_id: user.id, app_type: normalizedType, last_created_at: now }, { onConflict: "user_id,app_type" });

    await supabase.from("app_events").insert({
      user_id: user.id,
      application_id: (responseApplication as { id: string }).id,
      event_type: "create",
      meta: { name: finalName, type: normalizedType },
    }).then(() => {});

    return jsonResponse({ success: true, application: responseApplication });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor";
    return jsonResponse({ success: false, error: message }, 500);
  }
});

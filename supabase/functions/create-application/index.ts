import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { default as md5sync } from "npm:md5@2.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLOUDAMQP_API_KEY = Deno.env.get("CLOUDAMQP_API_KEY") || "";
const CLOUDAMQP_BASE_URL = "https://customer.cloudamqp.com/api";

const ATLAS_PUBLIC_KEY = (Deno.env.get("Public_Key") || "").trim();
const ATLAS_PRIVATE_KEY = (Deno.env.get("Private_Key") || "").trim();
const ATLAS_PROJECT_ID = (Deno.env.get("Project_ID") || "").trim();
const ATLAS_BASE_URL = "https://cloud.mongodb.com/api/atlas/v2";
const ATLAS_CLUSTER_NAME = (Deno.env.get("ATLAS_CLUSTER_NAME") || "aplicacoes-mongodb").trim();

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

async function digestAuth(method: string, url: string, body?: unknown): Promise<Response> {
  const firstRes = await fetch(url, {
    method,
    headers: { "Accept": "application/vnd.atlas.2023-01-01+json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (firstRes.status !== 401) return firstRes;

  const wwwAuth = firstRes.headers.get("WWW-Authenticate") || "";
  const realmMatch = wwwAuth.match(/realm="([^"]+)"/);
  const nonceMatch = wwwAuth.match(/nonce="([^"]+)"/);
  const qopMatch = wwwAuth.match(/qop="?([^",]+)"?/);

  if (!realmMatch || !nonceMatch) throw new Error("Digest auth: missing realm or nonce");

  const realm = realmMatch[1];
  const nonce = nonceMatch[1];
  const qop = qopMatch ? qopMatch[1].trim() : "";
  const nc = "00000001";
  const cnonce = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, "0")).join("");
  const uri = new URL(url).pathname + new URL(url).search;

  const ha1 = await md5(`${ATLAS_PUBLIC_KEY}:${realm}:${ATLAS_PRIVATE_KEY}`);
  const ha2 = await md5(`${method}:${uri}`);

  let response: string;
  let authHeader: string;

  if (qop === "auth") {
    response = await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    authHeader = `Digest username="${ATLAS_PUBLIC_KEY}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  } else {
    response = await md5(`${ha1}:${nonce}:${ha2}`);
    authHeader = `Digest username="${ATLAS_PUBLIC_KEY}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  }

  return fetch(url, {
    method,
    headers: {
      "Authorization": authHeader,
      "Accept": "application/vnd.atlas.2023-01-01+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function md5(message: string): Promise<string> {
  return md5sync(message);
}

async function atlasGet(path: string): Promise<unknown> {
  const url = `${ATLAS_BASE_URL}${path}`;
  const res = await digestAuth("GET", url);
  const text = await res.text();
  if (!res.ok) throw new Error(`Atlas GET ${path} ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function atlasPost(path: string, body: unknown): Promise<unknown> {
  const url = `${ATLAS_BASE_URL}${path}`;
  const res = await digestAuth("POST", url, body);
  const text = await res.text();
  if (!res.ok) throw new Error(`Atlas POST ${path} ${res.status}: ${text}`);
  return JSON.parse(text);
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

async function getClusterHostname(): Promise<string> {
  try {
    const data = await atlasGet(`/groups/${ATLAS_PROJECT_ID}/clusters/${ATLAS_CLUSTER_NAME}`) as { connectionStrings?: { standardSrv?: string } };
    const srv = data?.connectionStrings?.standardSrv || "";
    if (srv) {
      const match = srv.match(/mongodb\+srv:\/\/(.+)/);
      if (match) return match[1];
    }
  } catch {
    /* fallback */
  }
  return "aplicacoes-mongodb.eo9pc4t.mongodb.net";
}

interface MongoInstanceDetails {
  connectionUrl: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  collectionName: string;
}

async function provisionMongoInstance(userId: string): Promise<MongoInstanceDetails> {
  const shortId = userId.replace(/-/g, "").substring(0, 12);
  const dbName = `app_${shortId}`;
  const dbUser = `user_${shortId}`;
  const dbPassword = generateSecurePassword(24);
  const collectionName = "main";

  await atlasPost(`/groups/${ATLAS_PROJECT_ID}/databaseUsers`, {
    databaseName: "admin",
    username: dbUser,
    password: dbPassword,
    roles: [
      { roleName: "readWrite", databaseName: dbName },
    ],
    scopes: [
      { name: ATLAS_CLUSTER_NAME, type: "CLUSTER" },
    ],
  });

  const clusterHost = await getClusterHostname();
  const connectionUrl = `mongodb+srv://${dbUser}:${encodeURIComponent(dbPassword)}@${clusterHost}/${dbName}?retryWrites=true&w=majority`;

  return { connectionUrl, dbName, dbUser, dbPassword, collectionName };
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

    let body: { name?: string; type?: string; ttl_hours?: number };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Payload inválido" }, 400);
    }

    const { name, type, ttl_hours } = body;
    if (!name || !type) return jsonResponse({ success: false, error: "name e type são obrigatórios" }, 400);

    const ttlHours = typeof ttl_hours === "number" && [6, 12, 18, 24].includes(ttl_hours) ? ttl_hours : null;
    const expiresAt = ttlHours ? new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString() : null;

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
        mongo_collection: mongo.collectionName,
        connection_url: mongo.connectionUrl,
        expires_at: expiresAt,
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
        mongo_collection: mongo.collectionName,
        connection_url: mongo.connectionUrl,
        amqp_url: "",
        cloudamqp_id: "",
        panel_url: "",
        created_at: app.created_at,
        expires_at: expiresAt,
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
        expires_at: expiresAt,
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
        expires_at: expiresAt,
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

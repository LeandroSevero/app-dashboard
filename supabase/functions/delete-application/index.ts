import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { default as md5sync } from "npm:md5@2.3.0";
import { MongoClient } from "npm:mongodb@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLOUDAMQP_API_KEY = Deno.env.get("CLOUDAMQP_API_KEY") || "";
const CLOUDAMQP_API_URL = "https://customer.cloudamqp.com/api";

const ATLAS_PUBLIC_KEY = (Deno.env.get("Public_Key") || "").trim();
const ATLAS_PRIVATE_KEY = (Deno.env.get("Private_Key") || "").trim();
const ATLAS_PROJECT_ID = (Deno.env.get("Project_ID") || "").trim();
const ATLAS_BASE_URL = "https://cloud.mongodb.com/api/atlas/v2";
const MONGODB_ADMIN_URI = (Deno.env.get("aplicacoes_MONGODB_URI") || "").trim();

function md5(message: string): string {
  return md5sync(message);
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

  const ha1 = md5(`${ATLAS_PUBLIC_KEY}:${realm}:${ATLAS_PRIVATE_KEY}`);
  const ha2 = md5(`${method}:${uri}`);

  let response: string;
  let authHeader: string;

  if (qop === "auth") {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    authHeader = `Digest username="${ATLAS_PUBLIC_KEY}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`);
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

async function deleteAtlasDatabaseUser(username: string): Promise<void> {
  if (!ATLAS_PUBLIC_KEY || !ATLAS_PRIVATE_KEY || !ATLAS_PROJECT_ID) return;
  const url = `${ATLAS_BASE_URL}/groups/${ATLAS_PROJECT_ID}/databaseUsers/admin/${encodeURIComponent(username)}`;
  const res = await digestAuth("DELETE", url);
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Atlas DELETE user ${res.status}: ${text}`);
  }
}

async function dropMongoDatabase(dbName: string): Promise<void> {
  if (!MONGODB_ADMIN_URI || !dbName) return;
  const client = new MongoClient(MONGODB_ADMIN_URI);
  try {
    await client.connect();
    await client.db(dbName).dropDatabase();
  } finally {
    await client.close();
  }
}

async function deleteCloudamqpInstance(cloudamqpId: string) {
  if (!CLOUDAMQP_API_KEY) return null;
  const credentials = btoa(`${CLOUDAMQP_API_KEY}:`);
  const res = await fetch(`${CLOUDAMQP_API_URL}/instances/${cloudamqpId}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`CloudAMQP ${res.status}: ${text}`);
  }
  return null;
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

    const { id: appId } = await req.json();
    if (!appId) {
      return new Response(JSON.stringify({ error: "ID da aplicação é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabase
      .from("applications")
      .select("id, name, type, cloudamqp_id, mongo_user, mongo_db, user_id")
      .eq("id", appId)
      .is("deleted_at", null);
    if (!isAdmin) query = query.eq("user_id", user.id);

    const { data: app, error: fetchError } = await query.maybeSingle();
    if (fetchError || !app) {
      return new Response(JSON.stringify({ error: "Aplicação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("applications")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", appId);

    await supabase.from("app_events").insert({
      user_id: app.user_id,
      application_id: appId,
      event_type: "delete",
      meta: { name: app.name, type: app.type },
    });

    const cleanup = async () => {
      if (app.type === "mongodb") {
        if (app.mongo_user) await deleteAtlasDatabaseUser(app.mongo_user);
        if (app.mongo_db) await dropMongoDatabase(app.mongo_db);
      } else if (app.cloudamqp_id) {
        await deleteCloudamqpInstance(app.cloudamqp_id);
      }
    };

    EdgeRuntime.waitUntil(cleanup());

    return new Response(JSON.stringify({ success: true }), {
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

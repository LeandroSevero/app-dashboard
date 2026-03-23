import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLOUDAMQP_API_KEY = Deno.env.get("CLOUDAMQP_API_KEY") || "";
const CLOUDAMQP_API_URL = "https://customer.cloudamqp.com/api";

const ATLAS_PUBLIC_KEY = Deno.env.get("Public_Key") || "";
const ATLAS_PRIVATE_KEY = Deno.env.get("Private_Key") || "";
const ATLAS_PROJECT_ID = Deno.env.get("Project_ID") || "";
const ATLAS_BASE_URL = "https://cloud.mongodb.com/api/atlas/v2";

async function md5(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
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

async function deleteAtlasDatabaseUser(username: string): Promise<void> {
  if (!ATLAS_PUBLIC_KEY || !ATLAS_PRIVATE_KEY || !ATLAS_PROJECT_ID) return;
  const url = `${ATLAS_BASE_URL}/groups/${ATLAS_PROJECT_ID}/databaseUsers/admin/${encodeURIComponent(username)}`;
  const res = await digestAuth("DELETE", url);
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Atlas DELETE user ${res.status}: ${text}`);
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

    const query = supabase
      .from("applications")
      .select("id, type, cloudamqp_id, mongo_user, user_id")
      .eq("id", appId);
    if (!isAdmin) query.eq("user_id", user.id);

    const { data: app, error: fetchError } = await query.maybeSingle();
    if (fetchError || !app) {
      return new Response(JSON.stringify({ error: "Aplicação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (app.type === "mongodb" && app.mongo_user) {
      await deleteAtlasDatabaseUser(app.mongo_user);
    } else if (app.cloudamqp_id) {
      await deleteCloudamqpInstance(app.cloudamqp_id);
    }

    await supabase
      .from("applications")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", appId);

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

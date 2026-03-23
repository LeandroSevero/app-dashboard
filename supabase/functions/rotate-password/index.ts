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

function generateSecurePassword(length = 24): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => chars[b % chars.length]).join("");
}

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

async function rotateAtlasPassword(username: string, newPassword: string): Promise<void> {
  const url = `${ATLAS_BASE_URL}/groups/${ATLAS_PROJECT_ID}/databaseUsers/admin/${encodeURIComponent(username)}`;
  const res = await digestAuth("PATCH", url, { password: newPassword });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Atlas PATCH user ${res.status}: ${text}`);
  }
}

async function rotateCloudamqpPassword(cloudamqpId: string): Promise<{ password: string }> {
  if (!CLOUDAMQP_API_KEY) {
    return { password: "mock_rotated_" + Math.random().toString(36).substring(2, 12) };
  }
  const credentials = btoa(`${CLOUDAMQP_API_KEY}:`);
  const res = await fetch(`${CLOUDAMQP_API_URL}/instances/${cloudamqpId}/rotate-password`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CloudAMQP ${res.status}: ${text}`);
  }
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

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appId } = await req.json();
    if (!appId) {
      return new Response(JSON.stringify({ error: "ID da aplicação é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app, error: fetchError } = await supabase
      .from("applications")
      .select("id, type, cloudamqp_id, amqp_url, amqp_user, mongo_user, mongo_db, connection_url")
      .eq("id", appId)
      .maybeSingle();

    if (fetchError || !app) {
      return new Response(JSON.stringify({ error: "Aplicação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (app.type === "mongodb") {
      const newPassword = generateSecurePassword(24);
      await rotateAtlasPassword(app.mongo_user, newPassword);

      const newUrl = app.connection_url
        ? app.connection_url.replace(/\/\/([^:]+):([^@]+)@/, `//${app.mongo_user}:${encodeURIComponent(newPassword)}@`)
        : "";

      await supabase
        .from("applications")
        .update({ mongo_password: newPassword, amqp_password: newPassword, connection_url: newUrl })
        .eq("id", appId);

      return new Response(
        JSON.stringify({ success: true, new_password: newPassword, new_url: newUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const result = await rotateCloudamqpPassword(app.cloudamqp_id);
      const newPassword = result.password;

      const amqpUrlMatch = app.amqp_url.match(/^(amqps?:\/\/)([^:]+):([^@]+)@(.+)$/);
      let newUrl = app.amqp_url;
      if (amqpUrlMatch) {
        newUrl = `${amqpUrlMatch[1]}${amqpUrlMatch[2]}:${newPassword}@${amqpUrlMatch[4]}`;
      }

      await supabase
        .from("applications")
        .update({ amqp_password: newPassword, mqtt_password: newPassword, amqp_url: newUrl })
        .eq("id", appId);

      return new Response(
        JSON.stringify({ success: true, new_password: newPassword, new_url: newUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

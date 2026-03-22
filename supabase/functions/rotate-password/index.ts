import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLOUDAMQP_API_KEY = Deno.env.get("CLOUDAMQP_API_KEY") || "";
const CLOUDAMQP_API_URL = "https://customer.cloudamqp.com/api";

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
      .select("id, cloudamqp_id, amqp_url, amqp_user")
      .eq("id", appId)
      .maybeSingle();

    if (fetchError || !app) {
      return new Response(JSON.stringify({ error: "Aplicação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

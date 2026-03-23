import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { appId, collection: targetCollection } = await req.json() as { appId: string; collection?: string };

    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, type, connection_url, mongo_db, mongo_collection, user_id")
      .eq("id", appId)
      .eq("type", "mongodb")
      .is("deleted_at", null)
      .maybeSingle();

    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Aplicação não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (app.user_id !== user.id) {
      const adminSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: profile } = await adminSupabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (!app.connection_url) {
      return new Response(JSON.stringify({ error: "Connection URL não configurada" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { MongoClient } = await import("npm:mongodb@6");
    const client = new MongoClient(app.connection_url, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });

    try {
      await client.connect();
      const db = client.db(app.mongo_db as string);

      if (targetCollection) {
        const col = db.collection(targetCollection);
        const docs = await col.find({}).limit(20).toArray();
        const count = await col.countDocuments();
        const indexes = await col.indexes();

        return new Response(JSON.stringify({
          collection: targetCollection,
          count,
          indexes: indexes.map((i: Record<string, unknown>) => ({ name: i.name, key: i.key })),
          documents: docs.map((d) => {
            const { _id, ...rest } = d as Record<string, unknown>;
            return { _id: String(_id), ...rest };
          }),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const collections = await db.listCollections().toArray();
      const result = await Promise.all(
        collections.map(async (col: { name: string }) => {
          try {
            const count = await db.collection(col.name).countDocuments();
            const sample = await db.collection(col.name).findOne({});
            const fields = sample ? Object.keys(sample).filter((k) => k !== "_id") : [];
            return { name: col.name, count, fields };
          } catch {
            return { name: col.name, count: 0, fields: [] };
          }
        })
      );

      return new Response(JSON.stringify({ collections: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      await client.close();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: callerProfile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === "admin";

    const body = await req.json() as { appId: string; collection?: string };
    const { appId, collection: targetCollection } = body;

    if (!appId) {
      return jsonResponse({ error: "appId é obrigatório" }, 400);
    }

    const query = serviceClient
      .from("applications")
      .select("id, type, connection_url, mongo_db, mongo_collection, user_id")
      .eq("id", appId)
      .eq("type", "mongodb")
      .is("deleted_at", null);

    const { data: app, error: appError } = await query.maybeSingle();

    if (appError || !app) {
      return jsonResponse({ error: "Aplicação não encontrada" }, 404);
    }

    if (app.user_id !== user.id && !isAdmin) {
      return jsonResponse({ error: "Acesso negado" }, 403);
    }

    if (!app.connection_url) {
      return jsonResponse({ error: "Connection URL não configurada para esta aplicação" }, 400);
    }

    if (!app.mongo_db) {
      return jsonResponse({ error: "Database não configurado para esta aplicação" }, 400);
    }

    const { MongoClient } = await import("npm:mongodb@6");
    const client = new MongoClient(app.connection_url as string, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    try {
      await client.connect();
      const db = client.db(app.mongo_db as string);

      if (targetCollection) {
        const col = db.collection(targetCollection);
        const [docs, count, indexes] = await Promise.all([
          col.find({}).limit(50).toArray(),
          col.countDocuments(),
          col.indexes(),
        ]);

        return jsonResponse({
          collection: targetCollection,
          count,
          indexes: (indexes as Array<Record<string, unknown>>).map((i) => ({ name: i.name, key: i.key })),
          documents: docs.map((d) => {
            const { _id, ...rest } = d as Record<string, unknown>;
            return { _id: String(_id), ...rest };
          }),
        });
      }

      const rawCollections = await db.listCollections().toArray();

      const collections = await Promise.all(
        rawCollections.map(async (col: { name: string }) => {
          try {
            const [count, sample] = await Promise.all([
              db.collection(col.name).countDocuments(),
              db.collection(col.name).findOne({}),
            ]);
            const fields = sample ? Object.keys(sample as Record<string, unknown>).filter((k) => k !== "_id") : [];
            return { name: col.name, count, fields };
          } catch {
            return { name: col.name, count: 0, fields: [] };
          }
        })
      );

      return jsonResponse({ collections, database: app.mongo_db });
    } finally {
      await client.close();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return jsonResponse({ error: msg }, 500);
  }
});

import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders } from "../_lib/auth.js";

export default async function handler(req, res) {
  corsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const db = await getDb();
    const apps = await db
      .collection("applications")
      .find({ userId: user.userId, deletedAt: null })
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = apps.map((app) => ({
      id: app._id.toString(),
      name: app.name,
      type: app.type,
      amqp_url: app.connection?.url || "",
      username: app.connection?.username || "",
      password: app.connection?.password || "",
      cloudamqp_id: app.cloudamqpId || "",
      panel_url: app.connection?.managementUrl || "",
      created_at: app.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return res.status(200).json({ applications: formatted });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

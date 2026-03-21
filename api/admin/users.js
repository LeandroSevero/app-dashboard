import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders } from "../_lib/auth.js";

export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Não autorizado" });
  if (user.role !== "admin") return res.status(403).json({ error: "Acesso negado" });

  try {
    const db = await getDb();
    const users = await db.collection("users").find({}).sort({ createdAt: -1 }).toArray();
    const userIds = users.map((u) => u._id.toString());

    const allApps = await db
      .collection("applications")
      .find({ userId: { $in: userIds }, deletedAt: null })
      .sort({ createdAt: -1 })
      .toArray();

    const appsByUser = {};
    for (const app of allApps) {
      if (!appsByUser[app.userId]) appsByUser[app.userId] = [];
      const hostname = app.connection?.url
        ? (() => { try { return new URL(app.connection.url.replace("amqps://", "https://")).hostname; } catch { return ""; } })()
        : "";
      appsByUser[app.userId].push({
        id: app._id.toString(),
        name: app.name,
        type: app.type,
        amqp_url: app.connection?.url || "",
        username: app.connection?.username || "",
        password: app.connection?.password || "",
        cloudamqp_id: app.cloudamqpId || "",
        panel_url: app.connection?.managementUrl || "",
        created_at: app.createdAt?.toISOString() || new Date().toISOString(),
        mqtt_hostname: app.connection?.mqttHostname || hostname,
        mqtt_username: app.connection?.mqttUsername || `${app.connection?.username}:${app.connection?.username}`,
        mqtt_password: app.connection?.mqttPassword || app.connection?.password || "",
        mqtt_port: 1883,
        mqtt_port_tls: 8883,
      });
    }

    const result = users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      role: u.role || "user",
      created_at: u.createdAt?.toISOString() || new Date().toISOString(),
      full_name: u.full_name || "",
      phone: u.phone || "",
      bio: u.bio || "",
      avatar_url: u.avatar_url || "",
      applications: appsByUser[u._id.toString()] || [],
    }));

    return res.status(200).json({ users: result });
  } catch {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

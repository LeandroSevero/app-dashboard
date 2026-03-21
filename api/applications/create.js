import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders } from "../_lib/auth.js";
import { createInstance } from "../_lib/cloudamqp.js";

export default async function handler(req, res) {
  corsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const { name, type } = req.body || {};

  if (!name || !type) {
    return res.status(400).json({ error: "Nome e tipo são obrigatórios" });
  }

  try {
    const db = await getDb();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const limit = await db.collection("user_limits").findOne({ userId: user.userId });

    if (limit && limit.lastCreatedAt && new Date(limit.lastCreatedAt) > twentyFourHoursAgo) {
      const nextAllowed = new Date(new Date(limit.lastCreatedAt).getTime() + 24 * 60 * 60 * 1000);
      return res.status(429).json({
        error: "Limite de criação atingido",
        message: "Você só pode criar 1 aplicação a cada 24 horas.",
        next_allowed_at: nextAllowed.toISOString(),
      });
    }

    const instance = await createInstance(name, type);

    const now = new Date();
    const result = await db.collection("applications").insertOne({
      userId: user.userId,
      name,
      type,
      cloudamqpId: String(instance.id),
      connection: {
        url: instance.url,
        username: instance.login,
        password: instance.password,
        managementUrl: `https://customer.cloudamqp.com/instance/${instance.id}`,
      },
      createdAt: now,
      deletedAt: null,
    });

    await db.collection("user_limits").updateOne(
      { userId: user.userId },
      { $set: { userId: user.userId, lastCreatedAt: now } },
      { upsert: true }
    );

    const app = {
      id: result.insertedId.toString(),
      name,
      type,
      amqp_url: instance.url,
      username: instance.login,
      password: instance.password,
      cloudamqp_id: String(instance.id),
      panel_url: `https://customer.cloudamqp.com/instance/${instance.id}`,
      created_at: now.toISOString(),
    };

    return res.status(201).json({ success: true, application: app });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro interno do servidor" });
  }
}

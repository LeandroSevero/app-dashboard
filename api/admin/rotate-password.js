import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders } from "../_lib/auth.js";
import { rotateInstancePassword } from "../_lib/cloudamqp.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const requestUser = getUserFromRequest(req);
  if (!requestUser) return res.status(401).json({ error: "Não autorizado" });
  if (requestUser.role !== "admin") return res.status(403).json({ error: "Acesso negado" });

  const { appId } = req.body || {};
  if (!appId) return res.status(400).json({ error: "appId obrigatório" });

  try {
    const db = await getDb();

    let objectId;
    try { objectId = new ObjectId(appId); } catch { return res.status(400).json({ error: "appId inválido" }); }

    const app = await db.collection("applications").findOne({ _id: objectId, deletedAt: null });
    if (!app) return res.status(404).json({ error: "Aplicação não encontrada" });

    const result = await rotateInstancePassword(app.cloudamqpId);
    const newPassword = result?.password;
    if (!newPassword) return res.status(500).json({ error: "Falha ao rotacionar senha no CloudAMQP" });

    const hostname = app.connection?.url
      ? new URL(app.connection.url.replace("amqps://", "https://")).hostname
      : "";

    const newUrl = app.connection?.url
      ? app.connection.url.replace(/:([^@]+)@/, `:${newPassword}@`)
      : "";

    await db.collection("applications").updateOne(
      { _id: objectId },
      {
        $set: {
          "connection.password": newPassword,
          "connection.url": newUrl,
          "connection.mqttHostname": hostname,
          "connection.mqttUsername": `${app.connection?.username}:${app.connection?.username}`,
          "connection.mqttPassword": newPassword,
        },
      }
    );

    return res.status(200).json({
      success: true,
      new_password: newPassword,
      new_url: newUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro interno do servidor" });
  }
}

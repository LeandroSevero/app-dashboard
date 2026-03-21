import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders } from "../_lib/auth.js";
import { deleteInstance } from "../_lib/cloudamqp.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  corsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const body = req.body || {};
  const id = body.id || req.query.id;

  if (!id) {
    return res.status(400).json({ error: "ID obrigatório" });
  }

  try {
    const db = await getDb();

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: "ID inválido" });
    }

    const app = await db.collection("applications").findOne({
      _id: objectId,
      userId: user.userId,
      deletedAt: null,
    });

    if (!app) {
      return res.status(404).json({ error: "Aplicação não encontrada" });
    }

    if (app.cloudamqpId) {
      try {
        await deleteInstance(app.cloudamqpId);
      } catch {
        /* prosseguir mesmo que falhe no CloudAMQP */
      }
    }

    await db.collection("applications").updateOne(
      { _id: objectId },
      { $set: { deletedAt: new Date() } }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

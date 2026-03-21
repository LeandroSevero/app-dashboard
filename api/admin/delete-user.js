import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders } from "../_lib/auth.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  corsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const requestUser = getUserFromRequest(req);
  if (!requestUser) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  if (requestUser.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }

  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: "userId obrigatório" });
  }

  if (userId === requestUser.userId) {
    return res.status(400).json({ error: "Não é possível excluir sua própria conta" });
  }

  try {
    const db = await getDb();

    let objectId;
    try {
      objectId = new ObjectId(userId);
    } catch {
      return res.status(400).json({ error: "userId inválido" });
    }

    await db.collection("applications").updateMany(
      { userId, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );

    const result = await db.collection("users").deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

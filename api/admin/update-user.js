import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders } from "../_lib/auth.js";
import { ObjectId } from "mongodb";
import { createHash } from "crypto";

function hashPassword(password) {
  return createHash("sha256").update(password + (process.env.JWT_SECRET || "dev_secret")).digest("hex");
}

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

  const { userId, newPassword, newEmail } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: "userId obrigatório" });
  }

  if (!newPassword && !newEmail) {
    return res.status(400).json({ error: "Nenhuma alteração fornecida" });
  }

  try {
    const db = await getDb();

    let objectId;
    try {
      objectId = new ObjectId(userId);
    } catch {
      return res.status(400).json({ error: "userId inválido" });
    }

    const updates = {};

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      }
      updates.password = hashPassword(newPassword);
    }

    if (newEmail) {
      const existing = await db.collection("users").findOne({ email: newEmail.toLowerCase() });
      if (existing && existing._id.toString() !== userId) {
        return res.status(409).json({ error: "E-mail já em uso por outro usuário" });
      }
      updates.email = newEmail.toLowerCase();
    }

    const result = await db.collection("users").updateOne({ _id: objectId }, { $set: updates });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders } from "../_lib/auth.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Não autorizado" });

  try {
    const db = await getDb();
    const dbUser = await db.collection("users").findOne({ _id: new ObjectId(user.userId) });
    if (!dbUser) return res.status(404).json({ error: "Usuário não encontrado" });

    return res.status(200).json({
      profile: {
        id: dbUser._id.toString(),
        email: dbUser.email,
        full_name: dbUser.full_name || "",
        phone: dbUser.phone || "",
        bio: dbUser.bio || "",
        avatar_url: dbUser.avatar_url || "",
      },
    });
  } catch {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

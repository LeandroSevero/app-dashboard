import { getDb } from "../_lib/db.js";
import { getUserFromRequest, corsHeaders, signToken } from "../_lib/auth.js";
import { createHash } from "crypto";
import { ObjectId } from "mongodb";

function hashPassword(password) {
  return createHash("sha256").update(password + (process.env.JWT_SECRET || "dev_secret")).digest("hex");
}

export default async function handler(req, res) {
  corsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Não autorizado" });

  const { full_name, phone, bio, avatar_url, newPassword, newEmail } = req.body || {};

  try {
    const db = await getDb();
    const updates = {};

    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (avatar_url !== undefined) updates.avatar_url = avatar_url.trim();

    if (newPassword) {
      if (newPassword.length < 6) return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres" });
      updates.password = hashPassword(newPassword);
    }

    if (newEmail) {
      const existing = await db.collection("users").findOne({ email: newEmail.toLowerCase() });
      if (existing && existing._id.toString() !== user.userId) {
        return res.status(409).json({ error: "E-mail já em uso" });
      }
      updates.email = newEmail.toLowerCase();
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nenhum dado para atualizar" });

    await db.collection("users").updateOne({ _id: new ObjectId(user.userId) }, { $set: updates });

    const updatedUser = await db.collection("users").findOne({ _id: new ObjectId(user.userId) });

    const newToken = signToken({
      userId: user.userId,
      email: updatedUser.email,
      role: updatedUser.role || "user",
    });

    return res.status(200).json({
      success: true,
      token: newToken,
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        role: updatedUser.role || "user",
      },
      profile: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        full_name: updatedUser.full_name || "",
        phone: updatedUser.phone || "",
        bio: updatedUser.bio || "",
        avatar_url: updatedUser.avatar_url || "",
      },
    });
  } catch {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

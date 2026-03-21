import { getDb } from "../_lib/db.js";
import { signToken, corsHeaders } from "../_lib/auth.js";
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

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
  }

  try {
    const db = await getDb();
    const users = db.collection("users");

    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "E-mail já cadastrado. Faça login." });
    }

    const hashed = hashPassword(password);
    const result = await users.insertOne({
      email: email.toLowerCase(),
      password: hashed,
      role: "user",
      createdAt: new Date(),
    });

    const token = signToken({
      userId: result.insertedId.toString(),
      email: email.toLowerCase(),
      role: "user",
    });

    return res.status(201).json({
      token,
      user: {
        id: result.insertedId.toString(),
        email: email.toLowerCase(),
        role: "user",
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

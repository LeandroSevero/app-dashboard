import { getDb } from "../_lib/db.js";
import { corsHeaders } from "../_lib/auth.js";
import { createHash } from "crypto";

const SEED_SECRET = process.env.SEED_SECRET || "";

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

  const { secret } = req.body || {};

  if (!SEED_SECRET || secret !== SEED_SECRET) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  try {
    const db = await getDb();
    const users = db.collection("users");

    const existing = await users.findOne({ email: "admin@leandrosevero.com.br" });
    if (existing) {
      return res.status(200).json({ message: "Admin já existe", id: existing._id.toString() });
    }

    const hashed = hashPassword("Admin@123456");
    const result = await users.insertOne({
      email: "admin@leandrosevero.com.br",
      password: hashed,
      role: "admin",
      createdAt: new Date(),
    });

    return res.status(201).json({
      message: "Usuário admin criado com sucesso",
      id: result.insertedId.toString(),
      email: "admin@leandrosevero.com.br",
      password_temp: "Admin@123456",
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

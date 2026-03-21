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

  try {
    const db = await getDb();
    const users = db.collection("users");

    let user = await users.findOne({ email: email.toLowerCase() });

    if (!user) {
      const hashed = hashPassword(password);
      const result = await users.insertOne({
        email: email.toLowerCase(),
        password: hashed,
        createdAt: new Date(),
      });
      user = { _id: result.insertedId, email: email.toLowerCase() };
    } else {
      const hashed = hashPassword(password);
      if (user.password !== hashed) {
        return res.status(401).json({ error: "E-mail ou senha inválidos" });
      }
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
    });

    return res.status(200).json({
      token,
      user: { id: user._id.toString(), email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

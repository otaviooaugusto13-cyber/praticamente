import express from "express";
import cors from "cors";
import pkg from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 CONFIGURAÇÕES
const JWT_SECRET = "troque_essa_chave_depois";

// 🗄️ CONEXÃO COM POSTGRES (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 🧪 TESTE DE CONEXÃO
pool
  .query("SELECT NOW()")
  .then(() => console.log("✅ Banco conectado com sucesso"))
  .catch((err) => console.error("❌ Erro ao conectar no banco:", err));

// 📌 CRIAR TABELA (se não existir)
const createTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};
createTable();

// 🔐 GERAR TOKEN
const gerarToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
};

// 📥 REGISTRO / LOGIN AUTOMÁTICO (Hotmart)
app.post("/auth", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email obrigatório" });
  }

  try {
    let user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    // 👤 Se não existir, cria usuário
    if (user.rows.length === 0) {
      const senhaPadrao = email.split("@")[0];
      const hash = await bcrypt.hash(senhaPadrao, 10);

      user = await pool.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
        [email, hash]
      );
    }

    const token = gerarToken(user.rows[0]);

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// 🔑 LOGIN COM EMAIL + SENHA
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const valido = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!valido) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    const token = gerarToken(user.rows[0]);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// 🛡️ ROTA PROTEGIDA
app.get("/me", async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ error: "Token ausente" });
  }

  try {
    const decoded = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    res.json(decoded);
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
});

// 🚀 INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Backend rodando na porta ${PORT}`)
);

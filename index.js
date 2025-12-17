require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// Configurações iniciais
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve os arquivos da pasta (index.html, etc)

// Conexão com o Banco de Dados do Render
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('✅ Conectado ao PostgreSQL no Render!');
    initDb(); // Cria as tabelas assim que conecta
  })
  .catch(err => console.error('❌ Erro de conexão:', err));

// Função para criar a tabela e dados iniciais automaticamente
async function initDb() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cursos (
        id SERIAL PRIMARY KEY,
        categoria VARCHAR(100),
        title VARCHAR(255),
        descricao TEXT,
        img TEXT,
        video TEXT,
        is_book BOOLEAN DEFAULT FALSE
      );
    `);

    const res = await client.query('SELECT count(*) FROM cursos');
    if (res.rows[0].count === '0') {
      console.log('Populando banco de dados inicial...');
      await client.query(`
        INSERT INTO cursos (categoria, title, descricao, img, video, is_book) VALUES
        ('Mais Vistos', 'Oratória Master', 'Domine o medo de falar em público.', 'https://images.unsplash.com/photo-1475721027767-pqs.jpg?w=500', 'https://www.youtube.com/embed/qz0aGYrrlhU', false),
        ('Mais Vistos', 'Excel Business', 'Planilhas inteligentes.', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500', 'https://www.youtube.com/embed/Ke90Tje7VS0', false),
        ('Auto Liderança', 'Inteligência Emocional', 'O controle das emoções.', 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=500', 'https://www.youtube.com/embed/Ke90Tje7VS0', false),
        ('Livros Recomendados', 'Hábitos Atômicos', 'Pequenas mudanças, grandes resultados.', 'https://m.media-amazon.com/images/I/91bYsX41DVL._SY466_.jpg', 'https://www.youtube.com/embed/Ke90Tje7VS0', true);
      `);
    }
  } catch (err) {
    console.error('Erro ao inicializar banco:', err);
  }
}

// ROTA API: O Frontend vai chamar isso aqui
app.get('/api/cursos', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM cursos ORDER BY id ASC');
    const cursos = result.rows;

    // Organiza os dados para o carrossel do Frontend
    const estruturaHome = [
      { titulo: "Mais Vistos", id: "vistos", items: cursos.filter(c => c.categoria === 'Mais Vistos') },
      { titulo: "Auto Liderança", id: "lideranca", items: cursos.filter(c => c.categoria === 'Auto Liderança') },
      { titulo: "Livros Recomendados", id: "livros", type: "book", items: cursos.filter(c => c.is_book) }
    ];

    res.json(estruturaHome);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar cursos" });
  }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor bombando na porta ${PORT}`);
});

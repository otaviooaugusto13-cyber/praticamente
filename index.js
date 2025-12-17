const express = require('express');
const path = require('path');
const app = express();

// Faz o Express enxergar o seu HTML, CSS e Imagens
app.use(express.static(path.join(__dirname)));

// Quando alguém acessar o site, ele entrega o seu HTML original
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Porta automática para o Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Site rodando na porta ${PORT}`);
});


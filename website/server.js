import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Rotas específicas
app.get('/painel', (req, res) => {
  res.sendFile(join(__dirname, 'painel.html'));
});

app.get('/dashboard', (req, res) => {
  res.redirect('/painel');
});

// SPA - outras rotas vão para index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Iniciar servidor
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
});


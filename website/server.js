import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Headers para permitir popups do Firebase Auth (resolver problema COOP)
app.use((req, res, next) => {
  // Permitir popups do Firebase Auth
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Servir arquivos estáticos
app.use(express.static(__dirname));

// SPA - todas as rotas vão para index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Iniciar servidor
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
});


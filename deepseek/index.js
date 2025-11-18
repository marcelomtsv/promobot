import express from 'express';
import { validateApiKey, processText } from './deepseek.js';

const app = express();
const PORT = process.env.PORT || 3002;

// CORS - Necessário porque navegador considera portas diferentes como origens diferentes
// Exemplo: localhost:3000 (website) → localhost:3002 (API) = cross-origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Permitir apenas localhost e 127.0.0.1 (desenvolvimento local)
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'DeepSeek API está rodando',
        endpoints: {
            'POST /check': 'Verifica se a API key é válida',
            'POST /chat': 'Processa mensagens com DeepSeek'
        }
    });
});

app.post('/check', async (req, res) => {
    try {
        const { api_key } = req.body;
        if (!api_key) {
            return res.status(400).json({ success: false, error: 'api_key é obrigatório' });
        }
        
        const isValid = await validateApiKey(api_key);
        res.json({ success: isValid, valid: isValid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const { api_key, messages, temperature } = req.body;
        
        if (!api_key) {
            return res.status(400).json({ success: false, error: 'api_key é obrigatório' });
        }
        
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, error: 'messages deve ser um array não vazio' });
        }
        
        if (!messages.every(msg => msg.role && msg.content)) {
            return res.status(400).json({ success: false, error: 'Cada mensagem deve ter "role" e "content"' });
        }
        
        const result = await processText(messages, api_key, temperature || 0.3);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, () => {
    console.log(`🚀 DeepSeek API rodando em http://${HOST}:${PORT}`);
});

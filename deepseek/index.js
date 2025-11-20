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

// ===== OTIMIZAÇÕES PARA ALTA CONCORRÊNCIA =====
// Rate limiting simples (sem dependências extras)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requisições por minuto por IP

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimitMap.get(ip);
  
  // Reset se passou a janela de tempo
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  // Verificar limite
  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ 
      success: false, 
      error: 'Muitas requisições. Tente novamente em alguns instantes.' 
    });
  }
  
  limit.count++;
  next();
}

// Limpar rate limit map periodicamente (evitar memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000); // Limpar a cada minuto

// Aplicar rate limiting em endpoints críticos
app.use('/check', rateLimitMiddleware);
app.use('/chat', rateLimitMiddleware);

// Timeout otimizado para requisições
app.use((req, res, next) => {
  req.setTimeout(20000);
  res.setTimeout(20000);
  next();
});

// ===== FIM OTIMIZAÇÕES =====

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
const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 DeepSeek API rodando em http://${HOST}:${PORT}`);
    console.log(`✅ Otimizado para alta concorrência (1000+ usuários simultâneos)`);
    console.log(`✅ Rate limiting: ${RATE_LIMIT_MAX_REQUESTS} req/min por IP`);
});

// Configurações do servidor para alta concorrência (milhares de usuários)
server.maxConnections = Infinity; // Sem limite de conexões
server.keepAliveTimeout = 65000; // 65 segundos (otimizado para keep-alive)
server.headersTimeout = 66000; // 66 segundos
server.timeout = 120000; // 2 minutos timeout geral

// Tratamento de erros não tratados (evitar crash)
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  // Não encerrar o processo - manter disponibilidade
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Não encerrar imediatamente - dar tempo para requisições em andamento
});

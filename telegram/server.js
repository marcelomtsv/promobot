import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram/tl/index.js';
import fs from 'fs';

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS - Necessário porque navegador considera portas diferentes como origens diferentes
// Exemplo: localhost:3000 (website) → localhost:3003 (API) = cross-origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Permitir localhost e 127.0.0.1 em qualquer porta (desenvolvimento local)
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin || origin === 'null') {
    // Permitir requisições sem origin ou com origin null (ex: curl, Postman, fetch direto)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));

// Armazenamento
const sessions = new Map();
let API_ID = parseInt(process.env.API_ID || '0');
let API_HASH = process.env.API_HASH || '';

// Salvar credenciais
function saveCredentials(apiId, apiHash) {
  API_ID = parseInt(apiId);
  API_HASH = apiHash;
  fs.writeFileSync('.env', `API_ID=${API_ID}\nAPI_HASH=${API_HASH}\nPORT=3003\n`, 'utf8');
  dotenv.config();
}


// ========== API ENDPOINTS ==========

app.post('/api/config', (req, res) => {
  try {
    const { apiId, apiHash } = req.body;
    if (!apiId || !apiHash) return res.status(400).json({ error: 'API_ID e API_HASH obrigatórios' });
    saveCredentials(apiId, apiHash);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config', (req, res) => {
  res.json({ configured: !!(API_ID && API_HASH) });
});

// Listar sessões (otimizado)
app.get('/api/sessions', (req, res) => {
  const list = [];
  for (const [id, s] of sessions.entries()) {
    list.push({
      id,
      name: s.name || s.phone,
      phone: s.phone,
      status: s.status,
      createdAt: s.createdAt,
    });
  }
  res.json({ sessions: list });
});

// Função auxiliar para validar formato de telefone
function validatePhoneNumber(phone) {
  // Remove espaços e caracteres especiais
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Deve começar com + e ter pelo menos 10 dígitos
  if (!cleaned.startsWith('+')) {
    return { valid: false, error: 'Telefone deve começar com + (ex: +5511999999999)' };
  }
  // Deve ter entre 10 e 15 dígitos após o +
  const digits = cleaned.substring(1);
  if (digits.length < 10 || digits.length > 15 || !/^\d+$/.test(digits)) {
    return { valid: false, error: 'Telefone inválido. Use o formato: +5511999999999' };
  }
  return { valid: true };
}

// Função auxiliar para validar credenciais
function validateCredentials(apiId, apiHash) {
  // Validar API_ID
  const apiIdNum = parseInt(apiId);
  if (isNaN(apiIdNum) || apiIdNum <= 0) {
    return { valid: false, error: 'API_ID deve ser um número válido maior que zero' };
  }
  
  // Validar API_HASH (deve ter pelo menos 20 caracteres)
  if (!apiHash || typeof apiHash !== 'string' || apiHash.length < 20) {
    return { valid: false, error: 'API_HASH inválido. Deve ter pelo menos 20 caracteres' };
  }
  
  return { valid: true };
}

// Criar sessão (apenas 1 conta permitida)
app.post('/api/sessions', async (req, res) => {
  try {
    const { name, phone, apiId, apiHash } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' });
    if (!apiId || !apiHash) return res.status(400).json({ error: 'API_ID e API_HASH obrigatórios' });

    // Validar formato do telefone ANTES de qualquer operação
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }

    // Validar credenciais ANTES de qualquer operação
    const credentialsValidation = validateCredentials(apiId, apiHash);
    if (!credentialsValidation.valid) {
      return res.status(400).json({ error: credentialsValidation.error });
    }

    // Verificar se já existe uma conta ativa
    const existingSessions = Array.from(sessions.values());
    const activeSession = existingSessions.find(s => s.status === 'active' || s.status === 'connected');
    
    if (activeSession) {
      return res.status(400).json({ 
        error: 'Já existe uma conta do Telegram configurada. Remova a conta existente antes de adicionar uma nova.' 
      });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, { 
      connectionRetries: 5,
      useWSS: true,
    });

    await client.connect();
    const result = await client.sendCode({ apiId: parseInt(apiId), apiHash }, phone);
    
    sessions.set(sessionId, {
      client,
      name,
      phone,
      apiId: parseInt(apiId),
      apiHash,
      status: 'pending',
      phoneCodeHash: result.phoneCodeHash,
      stringSession,
      createdAt: Date.now(),
    });

    res.json({ success: true, sessionId, phoneCodeHash: result.phoneCodeHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar código
app.post('/api/sessions/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código obrigatório' });

    const session = sessions.get(id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const { client, stringSession, phoneCodeHash, phone } = session;

    await client.invoke(new Api.auth.SignIn({
      phoneNumber: phone,
      phoneCodeHash,
      phoneCode: code.toString(),
    }));

    const sessionString = stringSession.save();
    session.status = 'active';
    session.sessionString = sessionString;
    session.phoneCodeHash = undefined;

    res.json({ success: true, sessionString });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Conectar com sessão existente
app.post('/api/sessions/connect', async (req, res) => {
  try {
    const { name, sessionString, phone, apiId, apiHash } = req.body;
    if (!name || !sessionString) return res.status(400).json({ error: 'Nome e SessionString obrigatórios' });
    if (!apiId || !apiHash) return res.status(400).json({ error: 'API_ID e API_HASH obrigatórios' });

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, { 
      connectionRetries: 5,
      useWSS: true,
    });

    await client.connect();
    if (!(await client.checkAuthorization())) {
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    // Verificar se já existe uma conta ativa
    const existingSessions = Array.from(sessions.values());
    const activeSession = existingSessions.find(s => s.status === 'active' || s.status === 'connected');
    
    if (activeSession) {
      return res.status(400).json({ 
        error: 'Já existe uma conta do Telegram configurada. Remova a conta existente antes de adicionar uma nova.' 
      });
    }

    sessions.set(sessionId, {
      client,
      name,
      phone: phone || 'user',
      apiId: parseInt(apiId),
      apiHash,
      status: 'active',
      sessionString,
      createdAt: Date.now(),
    });

    res.json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pausar sessão
app.post('/api/sessions/:id/pause', (req, res) => {
  try {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.status === 'active') {
      session.status = 'paused';
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retomar sessão
app.post('/api/sessions/:id/resume', (req, res) => {
  try {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.status === 'paused') {
      session.status = 'active';
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excluir sessão
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const session = sessions.get(req.params.id);
    if (session) {
      try {
        await session.client.disconnect();
      } catch (e) {}
      sessions.delete(req.params.id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar todas as sessões
app.delete('/api/sessions', async (req, res) => {
  try {
    const disconnectPromises = [];
    for (const [id, session] of sessions.entries()) {
      disconnectPromises.push(session.client.disconnect().catch(() => {}));
    }
    await Promise.all(disconnectPromises);
    sessions.clear();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    sessions: sessions.size
  });
});

// Endpoint raiz
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Telegram API está rodando',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/config': 'Verificar configuração',
      'POST /api/config': 'Configurar API_ID e API_HASH',
      'GET /api/sessions': 'Listar sessões',
      'POST /api/sessions': 'Criar nova sessão',
      'POST /api/sessions/:id/verify': 'Verificar código',
      'POST /api/sessions/connect': 'Conectar com sessão existente',
      'POST /check': 'Verificar se API está configurada'
    }
  });
});

// Endpoint /check para verificar configuração (padrão igual deepseek)
app.post('/check', async (req, res) => {
  try {
    const { api_id, api_hash } = req.body;
    
    // Se não forneceu credenciais, verificar se já está configurado
    if (!api_id || !api_hash) {
      const isConfigured = !!(API_ID && API_HASH);
      return res.json({ 
        success: isConfigured, 
        valid: isConfigured,
        configured: isConfigured
      });
    }
    
    // Validar formato básico
    if (!parseInt(api_id) || !api_hash || api_hash.length < 20) {
      return res.json({ 
        success: false, 
        valid: false,
        error: 'API_ID ou API_HASH inválidos'
      });
    }
    
    res.json({ 
      success: true, 
      valid: true,
      configured: true
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      valid: false,
      error: error.message 
    });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3003;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║        TELEGRAM API - GramJS MTProto                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
  console.log('');
  if (!API_ID || !API_HASH) {
    console.log('⚠️  Configure API_ID e API_HASH via variáveis de ambiente');
    console.log('   Ou use o endpoint POST /api/config');
    console.log('');
  } else {
    console.log('✓ Credenciais configuradas');
    console.log('');
  }
  console.log('📖 Documentação completa no README.md');
  console.log('');
});

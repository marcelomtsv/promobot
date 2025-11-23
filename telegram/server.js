import express from 'express';
import http from 'http';
import compression from 'compression';
import dotenv from 'dotenv';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram/tl/index.js';
import fs from 'fs';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Compressão de respostas (reduz tráfego em até 70%)
app.use(compression({
  level: 6,
  threshold: 1024, // Comprimir apenas respostas > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

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

// Timeout otimizado para requisições (variável por endpoint)
app.use((req, res, next) => {
  // Timeouts diferentes por tipo de operação
  // Operações de sessão podem demorar mais
  const timeout = req.path.includes('/sessions') && req.method === 'POST' ? 60000 : 30000;
  req.setTimeout(timeout);
  res.setTimeout(timeout);
  
  // Headers de performance
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  next();
});

// ===== OTIMIZAÇÕES PARA ALTA CONCORRÊNCIA (MILHARES DE REQUISIÇÕES) =====
// Rate limiting otimizado com sliding window e memory-efficient
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 1000; // 1000 requisições por minuto por IP (aumentado para alta concorrência)

// Limpar rate limit map periodicamente (evitar memory leak) - OTIMIZADO
setInterval(() => {
  const now = Date.now();
  const toDelete = [];
  for (const [ip, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      toDelete.push(ip);
    }
  }
  // Deletar em batch para melhor performance
  toDelete.forEach(ip => rateLimitMap.delete(ip));
}, 30000); // Limpar a cada 30 segundos (mais frequente para melhor performance)

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
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
      error: 'Muitas requisições. Tente novamente em alguns instantes.',
      retryAfter: Math.ceil((limit.resetTime - now) / 1000)
    });
  }
  
  limit.count++;
  next();
}

// Aplicar rate limiting em endpoints críticos
app.use('/api/sessions', rateLimitMiddleware);
app.use('/api/sessions/:id/verify', rateLimitMiddleware);

// ===== FIM OTIMIZAÇÕES =====

// Armazenamento otimizado com limpeza automática de sessões inativas
const sessions = new Map();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas

// Limpar sessões inativas periodicamente (evitar memory leak)
setInterval(() => {
  const now = Date.now();
  const toDelete = [];
  
  for (const [id, session] of sessions.entries()) {
    // Limpar sessões pendentes antigas (> 1 hora)
    if (session.status === 'pending' && (now - session.createdAt) > 3600000) {
      toDelete.push(id);
    }
    // Limpar sessões inativas antigas (> 24 horas)
    else if ((now - session.createdAt) > SESSION_TIMEOUT) {
      toDelete.push(id);
    }
  }
  
  // Desconectar e remover em batch
  toDelete.forEach(async (id) => {
    const session = sessions.get(id);
    if (session && session.client) {
      try {
        await session.client.disconnect().catch(() => {});
      } catch (e) {}
    }
    sessions.delete(id);
  });
}, 3600000); // Verificar a cada hora
let API_ID = parseInt(process.env.API_ID || '0');
let API_HASH = process.env.API_HASH || '';

// Salvar credenciais (OTIMIZADO - assíncrono para não bloquear)
async function saveCredentials(apiId, apiHash) {
  API_ID = parseInt(apiId);
  API_HASH = apiHash;
  // Usar writeFile assíncrono para não bloquear outras requisições
  try {
    await fs.promises.writeFile('.env', `API_ID=${API_ID}\nAPI_HASH=${API_HASH}\nPORT=3003\n`, 'utf8');
    dotenv.config();
  } catch (error) {
    console.error('Erro ao salvar credenciais:', error);
    // Continuar mesmo se falhar (credenciais já estão em memória)
  }
}


// ========== API ENDPOINTS ==========

app.post('/api/config', async (req, res) => {
  try {
    const { apiId, apiHash } = req.body;
    if (!apiId || !apiHash) return res.status(400).json({ error: 'API_ID e API_HASH obrigatórios' });
    await saveCredentials(apiId, apiHash);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao configurar:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config', (req, res) => {
  res.json({ configured: !!(API_ID && API_HASH) });
});

// Listar sessões (otimizado - pode filtrar por cliente)
app.get('/api/sessions', (req, res) => {
  const { userId, email, clientId } = req.query;
  
  const list = [];
  for (const [id, s] of sessions.entries()) {
    // Se forneceu filtro, mostrar apenas sessões desse cliente
    if (userId || email || clientId) {
      const targetClientId = userId || email || clientId;
      if (s.clientId !== targetClientId && s.userId !== userId && s.email !== email) {
        continue; // Pular sessões de outros clientes
      }
    }
    
    list.push({
      id,
      name: s.name || s.phone,
      phone: s.phone,
      status: s.status,
      createdAt: s.createdAt,
      clientId: s.clientId,
      userId: s.userId,
      email: s.email
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

// Criar sessão (apenas 1 conta permitida POR CLIENTE - usando email/userId como ID único)
app.post('/api/sessions', async (req, res) => {
  try {
    const { name, phone, apiId, apiHash, userId, email } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' });
    if (!apiId || !apiHash) return res.status(400).json({ error: 'API_ID e API_HASH obrigatórios' });
    
    // userId ou email é obrigatório para identificar o cliente
    const clientId = userId || email || name; // Usar email como fallback se não tiver userId
    if (!clientId) return res.status(400).json({ error: 'userId ou email é obrigatório para identificar o cliente' });

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

    // Verificar se já existe uma conta ativa PARA ESTE CLIENTE ESPECÍFICO
    const existingSessions = Array.from(sessions.values());
    const activeSession = existingSessions.find(s => 
      (s.status === 'active' || s.status === 'connected') && 
      (s.clientId === clientId || s.userId === userId || s.email === email)
    );
    
    if (activeSession) {
      // Remover sessão anterior deste cliente antes de criar nova
      try {
        await activeSession.client.disconnect().catch(() => {});
        sessions.delete(activeSession.sessionId || Object.keys(sessions).find(key => sessions.get(key) === activeSession));
      } catch (e) {
        // Ignorar erros ao desconectar
      }
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
      clientId: clientId,  // ID único do cliente (email ou userId)
      userId: userId,
      email: email,
      sessionId: sessionId  // Armazenar sessionId na sessão para facilitar busca
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
    const { name, sessionString, phone, apiId, apiHash, userId, email } = req.body;
    if (!name || !sessionString) return res.status(400).json({ error: 'Nome e SessionString obrigatórios' });
    if (!apiId || !apiHash) return res.status(400).json({ error: 'API_ID e API_HASH obrigatórios' });
    
    // userId ou email é obrigatório para identificar o cliente
    const clientId = userId || email || name;
    if (!clientId) return res.status(400).json({ error: 'userId ou email é obrigatório para identificar o cliente' });

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

    // Verificar se já existe uma conta ativa PARA ESTE CLIENTE ESPECÍFICO
    const existingSessions = Array.from(sessions.values());
    const activeSession = existingSessions.find(s => 
      (s.status === 'active' || s.status === 'connected') && 
      (s.clientId === clientId || s.userId === userId || s.email === email)
    );
    
    if (activeSession) {
      // Remover sessão anterior deste cliente antes de criar nova
      try {
        await activeSession.client.disconnect().catch(() => {});
        const oldSessionId = activeSession.sessionId || Object.keys(sessions).find(key => sessions.get(key) === activeSession);
        if (oldSessionId) sessions.delete(oldSessionId);
      } catch (e) {
        // Ignorar erros ao desconectar
      }
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
      clientId: clientId,  // ID único do cliente
      userId: userId,
      email: email,
      sessionId: sessionId
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

// Limpar sessões (de um cliente específico ou todas)
app.delete('/api/sessions', async (req, res) => {
  try {
    const { userId, email, clientId } = req.body;
    
    // Se forneceu userId/email/clientId, deletar apenas desse cliente
    if (userId || email || clientId) {
      const targetClientId = userId || email || clientId;
      const disconnectPromises = [];
      const sessionsToDelete = [];
      
      for (const [id, session] of sessions.entries()) {
        if (session.clientId === targetClientId || session.userId === userId || session.email === email) {
          disconnectPromises.push(session.client.disconnect().catch(() => {}));
          sessionsToDelete.push(id);
        }
      }
      
      await Promise.all(disconnectPromises);
      sessionsToDelete.forEach(id => sessions.delete(id));
      
      res.json({ success: true, deleted: sessionsToDelete.length });
    } else {
      // Se não forneceu identificador, deletar TODAS as sessões (compatibilidade)
      const disconnectPromises = [];
      for (const [id, session] of sessions.entries()) {
        disconnectPromises.push(session.client.disconnect().catch(() => {}));
      }
      await Promise.all(disconnectPromises);
      sessions.clear();
      res.json({ success: true, deleted: 'all' });
    }
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

// Configurações do servidor para ALTA CONCORRÊNCIA (milhares de requisições simultâneas)
server.maxConnections = Infinity; // Sem limite de conexões
server.keepAliveTimeout = 65000; // 65 segundos (otimizado para keep-alive)
server.headersTimeout = 66000; // 66 segundos
server.timeout = 120000; // 2 minutos timeout geral

// Otimizações adicionais para Node.js
if (typeof process.setMaxListeners === 'function') {
  process.setMaxListeners(0); // Sem limite de event listeners
}

// Node.js gerencia automaticamente file descriptors e conexões
// As configurações do servidor acima já otimizam para alta concorrência

// Tratamento de erros não tratados (evitar crash)
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  // Não encerrar o processo - manter disponibilidade
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Não encerrar imediatamente - dar tempo para requisições em andamento
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║        TELEGRAM API - GramJS MTProto                 ║');
  console.log('║     Otimizado para alta concorrência (1000+ users)   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`✅ Otimizado para ALTA CONCORRÊNCIA (milhares de requisições simultâneas)`);
  console.log(`✅ Rate limiting: ${RATE_LIMIT_MAX_REQUESTS} req/min por IP`);
  console.log(`✅ Compressão de respostas: Ativada`);
  console.log(`✅ Limpeza automática de sessões: Ativada`);
  console.log(`✅ Max connections: Infinito`);
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

const express = require("express");
const { sendMessage, deleteMessage, verifyToken, verifyChat } = require("./telegram");

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de proxy trust (importante para proxy reverso do Easypanel)
app.set('trust proxy', true);

// CORS - Necessário porque navegador considera portas diferentes como origens diferentes
// Exemplo: localhost:3000 (website) → localhost:3001 (API) = cross-origin
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

// Configurações para alta concorrência
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Timeout otimizado para requisições (20s para operações rápidas)
app.use((req, res, next) => {
  req.setTimeout(20000);
  res.setTimeout(20000);
  next();
});

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
app.use('/api/botfather', rateLimitMiddleware);

// ===== FIM OTIMIZAÇÕES =====

// Middleware de validação
const validateRequired = (fields) => (req, res, next) => {
  const missing = fields.filter(field => !req.body[field]);
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Campos obrigatórios: ${missing.join(", ")}`
    });
  }
  next();
};

// Helper para respostas de erro
const sendError = (res, status, message) => {
  res.status(status).json({ success: false, error: message });
};

// Helper para respostas de sucesso
const sendSuccess = (res, data, status = 200) => {
  res.status(status).json({ success: true, ...data });
};

// Health check
app.get("/api/botfather/health", (req, res) => {
  res.json({ status: "ok" });
});

// Health check simples (sem /api/botfather)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint /check para verificar configuração completa
app.post("/check", async (req, res) => {
  try {
    const { bot_token, channel, group } = req.body;
    
    if (!bot_token) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: "Bot token é obrigatório"
      });
    }
    
    // 1. Verificar TOKEN
    const tokenResult = await verifyToken(bot_token);
    if (!tokenResult.valid) {
      return res.json({
        success: true,
        valid: false,
        message: "Token inválido ou não existe"
      });
    }
    
    const result = {
      success: true,
      valid: true,
      message: "Configuração válida",
      details: {
        token: {
          valid: true,
          bot: tokenResult.bot
        }
      }
    };
    
    // 2. Testar CHANNEL (se fornecido) - Validação completa
    if (channel) {
      const channelResult = await verifyChat(bot_token, channel);
      if (!channelResult.hasAccess) {
        // Mensagens mais específicas
        let errorMessage = "Canal: ";
        if (channelResult.error === "não encontrado" || channelResult.error?.includes("not found")) {
          errorMessage += "Canal não encontrado. Verifique se o ID/nome está correto.";
        } else if (channelResult.error === "sem permissão" || channelResult.error?.includes("not a member")) {
          errorMessage += "Bot não está no canal ou não tem permissões. Adicione o bot ao canal como administrador.";
        } else if (channelResult.error?.includes("sem acesso") || channelResult.error?.includes("Forbidden")) {
          errorMessage += "Bot não tem acesso ao canal. Adicione o bot ao canal primeiro.";
        } else {
          errorMessage += channelResult.error || "Erro ao verificar canal";
        }
        
        return res.json({
          success: true,
          valid: false,
          message: errorMessage,
          details: {
            token: { valid: true, bot: tokenResult.bot },
            channel: {
              exists: channelResult.error !== "não encontrado" && !channelResult.error?.includes("not found"),
              botInChannel: channelResult.error !== "sem permissão" && !channelResult.error?.includes("not a member"),
              hasPermissions: false
            }
          }
        });
      }
      
      // Canal válido - adicionar informações
      result.details.channel = {
        exists: true,
        botHasAccess: true,
        permissions: channelResult.permissions || {}
      };
    }
    
    // 3. Testar GROUP (se fornecido) - Validação completa
    if (group) {
      const groupResult = await verifyChat(bot_token, group);
      if (!groupResult.hasAccess) {
        // Mensagens mais específicas
        let errorMessage = "Grupo: ";
        if (groupResult.error === "não encontrado" || groupResult.error?.includes("not found")) {
          errorMessage += "Grupo não encontrado. Verifique se o ID/nome está correto.";
        } else if (groupResult.error === "sem permissão" || groupResult.error?.includes("not a member")) {
          errorMessage += "Bot não está no grupo ou não tem permissões. Adicione o bot ao grupo e dê permissões de administrador.";
        } else if (groupResult.error?.includes("sem acesso") || groupResult.error?.includes("Forbidden")) {
          errorMessage += "Bot não tem acesso ao grupo. Adicione o bot ao grupo primeiro.";
        } else {
          errorMessage += groupResult.error || "Erro ao verificar grupo";
        }
        
        return res.json({
          success: true,
          valid: false,
          message: errorMessage,
          details: {
            token: { valid: true, bot: tokenResult.bot },
            channel: channel ? result.details.channel : null,
            group: {
              exists: groupResult.error !== "não encontrado" && !groupResult.error?.includes("not found"),
              botInGroup: groupResult.error !== "sem permissão" && !groupResult.error?.includes("not a member"),
              hasPermissions: false
            }
          }
        });
      }
      
      // Grupo válido - adicionar informações
      result.details.group = {
        exists: true,
        botInGroup: true,
        hasPermissions: true,
        permissions: groupResult.permissions || {}
      };
    }
    
    // Tudo válido
    return res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      valid: false,
      error: error.message
    });
  }
});

// Endpoint /api/botfather/check (mesmo comportamento - redireciona para /check)
app.post("/api/botfather/check", async (req, res) => {
  // Reutilizar a mesma lógica do endpoint /check
  return app._router.stack.find(layer => layer.route?.path === '/check' && layer.route?.methods?.post)
    ? app._router.handle(req, res)
    : res.status(404).json({ success: false, error: "Endpoint não encontrado" });
});

app.post("/api/botfather/verify-token", validateRequired(["token"]), async (req, res) => {
  try {
    const { token } = req.body;
    const result = await verifyToken(token);
    
    if (result.valid) {
      return sendSuccess(res, {
        valid: true,
        message: "Token válido e funcionando",
        bot: result.bot
      });
    }
    
    return sendSuccess(res, {
      valid: false,
      message: "Token inválido ou não existe",
      error: result.error || "Token não reconhecido pela API do Telegram"
    });
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.post("/api/botfather/verify", validateRequired(["token", "chatId"]), async (req, res) => {
  try {
    const { token, chatId } = req.body;
    
    // Verifica acesso e permissões sem enviar mensagem
    const result = await verifyChat(token, chatId);
    
    if (result.hasAccess) {
      return sendSuccess(res, {
        verified: true,
        message: "Bot tem acesso ao grupo/canal",
        chat: result.chat,
        permissions: result.permissions || {
          canSendMessages: true,
          canDeleteMessages: false
        }
      });
    }
    
    return sendSuccess(res, {
      verified: false,
      message: result.error || "Bot não tem acesso ao grupo/canal ou chatId inválido"
    });
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.post("/api/botfather/send", validateRequired(["token", "chatId", "text"]), async (req, res) => {
  try {
    const { text, token, chatId, img } = req.body;
    const messageId = await sendMessage(token, chatId, text, img || null);
    
    if (messageId) {
      return sendSuccess(res, { messageId, chatId });
    }
    
    sendError(res, 500, "Erro ao enviar mensagem");
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.delete("/api/botfather/message/:chatId/:messageId", validateRequired(["token"]), async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { token } = req.body;
    
    if (!messageId || isNaN(parseInt(messageId))) {
      return sendError(res, 400, "messageId inválido");
    }
    
    const deleted = await deleteMessage(token, chatId, parseInt(messageId));
    
    if (deleted) {
      return sendSuccess(res, { message: "Mensagem deletada com sucesso" });
    }
    
    sendError(res, 500, "Erro ao deletar mensagem");
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado"
  });
});

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 BotFather API rodando em http://${HOST}:${PORT}`);
  console.log(`✅ Otimizado para alta concorrência (1000+ usuários simultâneos)`);
  console.log(`✅ Rate limiting: ${RATE_LIMIT_MAX_REQUESTS} req/min por IP`);
});

// Configurações do servidor para alta concorrência (milhares de usuários)
server.maxConnections = Infinity; // Sem limite de conexões
server.keepAliveTimeout = 65000; // 65 segundos (otimizado para keep-alive)
server.headersTimeout = 66000; // 66 segundos
server.timeout = 120000; // 2 minutos timeout geral

// Tratamento de erros não tratados (evitar crash)
process.on("unhandledRejection", (error) => {
  console.error('Unhandled Rejection:', error);
  // Não encerrar o processo - manter disponibilidade
});

process.on("uncaughtException", (error) => {
  console.error('Uncaught Exception:', error);
  // Não encerrar imediatamente - dar tempo para requisições em andamento
});

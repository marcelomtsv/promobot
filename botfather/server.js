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

// Timeout de 30 segundos para requisições
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

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
    
    // 1. Verificar token primeiro
    const tokenResult = await verifyToken(bot_token);
    if (!tokenResult.valid) {
      return res.json({
        success: true,
        valid: false,
        message: tokenResult.error || "Token inválido",
        errors: {
          token: tokenResult.error || "Token inválido"
        }
      });
    }
    
    const errors = {};
    const results = {
      token: { valid: true, bot: tokenResult.bot }
    };
    
    // 2. Testar CHANNEL individualmente (se fornecido)
    if (channel) {
      try {
        const channelResult = await verifyChat(bot_token, channel);
        if (channelResult.hasAccess) {
          results.channel = {
            valid: true,
            chat: channelResult.chat,
            permissions: channelResult.permissions
          };
        } else {
          errors.channel = channelResult.error || "Bot não tem acesso ao canal";
          results.channel = { valid: false, error: errors.channel };
        }
      } catch (error) {
        errors.channel = error.message || "Erro ao verificar canal";
        results.channel = { valid: false, error: errors.channel };
      }
    }
    
    // 3. Testar GROUP individualmente (se fornecido)
    if (group) {
      try {
        const groupResult = await verifyChat(bot_token, group);
        if (groupResult.hasAccess) {
          results.group = {
            valid: true,
            chat: groupResult.chat,
            permissions: groupResult.permissions
          };
        } else {
          errors.group = groupResult.error || "Bot não tem acesso ao grupo";
          results.group = { valid: false, error: errors.group };
        }
      } catch (error) {
        errors.group = error.message || "Erro ao verificar grupo";
        results.group = { valid: false, error: errors.group };
      }
    }
    
    // 4. Retornar resultado
    const hasErrors = Object.keys(errors).length > 0;
    
    if (hasErrors) {
      // Construir mensagem de erro específica
      let errorMessages = [];
      if (errors.channel) {
        errorMessages.push(`Canal: ${errors.channel}`);
      }
      if (errors.group) {
        errorMessages.push(`Grupo: ${errors.group}`);
      }
      
      return res.json({
        success: true,
        valid: false,
        message: errorMessages.join(" | "),
        errors: errors,
        results: results
      });
    }
    
    // Tudo válido
    return res.json({
      success: true,
      valid: true,
      message: "Configuração válida",
      bot: tokenResult.bot,
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      valid: false,
      error: error.message
    });
  }
});

// Endpoint /api/botfather/check (mesmo comportamento)
app.post("/api/botfather/check", async (req, res) => {
  try {
    const { bot_token, channel, group } = req.body;
    
    if (!bot_token) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: "Bot token é obrigatório"
      });
    }
    
    // 1. Verificar token primeiro
    const tokenResult = await verifyToken(bot_token);
    if (!tokenResult.valid) {
      return res.json({
        success: true,
        valid: false,
        message: tokenResult.error || "Token inválido",
        errors: {
          token: tokenResult.error || "Token inválido"
        }
      });
    }
    
    const errors = {};
    const results = {
      token: { valid: true, bot: tokenResult.bot }
    };
    
    // 2. Testar CHANNEL individualmente (se fornecido)
    if (channel) {
      try {
        const channelResult = await verifyChat(bot_token, channel);
        if (channelResult.hasAccess) {
          results.channel = {
            valid: true,
            chat: channelResult.chat,
            permissions: channelResult.permissions
          };
        } else {
          errors.channel = channelResult.error || "Bot não tem acesso ao canal";
          results.channel = { valid: false, error: errors.channel };
        }
      } catch (error) {
        errors.channel = error.message || "Erro ao verificar canal";
        results.channel = { valid: false, error: errors.channel };
      }
    }
    
    // 3. Testar GROUP individualmente (se fornecido)
    if (group) {
      try {
        const groupResult = await verifyChat(bot_token, group);
        if (groupResult.hasAccess) {
          results.group = {
            valid: true,
            chat: groupResult.chat,
            permissions: groupResult.permissions
          };
        } else {
          errors.group = groupResult.error || "Bot não tem acesso ao grupo";
          results.group = { valid: false, error: errors.group };
        }
      } catch (error) {
        errors.group = error.message || "Erro ao verificar grupo";
        results.group = { valid: false, error: errors.group };
      }
    }
    
    // 4. Retornar resultado
    const hasErrors = Object.keys(errors).length > 0;
    
    if (hasErrors) {
      // Construir mensagem de erro específica
      let errorMessages = [];
      if (errors.channel) {
        errorMessages.push(`Canal: ${errors.channel}`);
      }
      if (errors.group) {
        errorMessages.push(`Grupo: ${errors.group}`);
      }
      
      return res.json({
        success: true,
        valid: false,
        message: errorMessages.join(" | "),
        errors: errors,
        results: results
      });
    }
    
    // Tudo válido
    return res.json({
      success: true,
      valid: true,
      message: "Configuração válida",
      bot: tokenResult.bot,
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      valid: false,
      error: error.message
    });
  }
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
  console.log(`✅ Pronto para receber múltiplas requisições simultâneas`);
});

// Configurações do servidor para alta concorrência
server.maxConnections = Infinity; // Sem limite de conexões
server.keepAliveTimeout = 65000; // 65 segundos
server.headersTimeout = 66000; // 66 segundos

process.on("unhandledRejection", (error) => {
  // Erro silencioso - não encerra o processo
});

process.on("uncaughtException", (error) => {
  // Erro silencioso - não encerra o processo imediatamente para manter disponibilidade
});

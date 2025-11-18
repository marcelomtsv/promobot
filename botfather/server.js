const express = require("express");
const { sendMessage, deleteMessage, verifyToken, verifyChat } = require("./telegram");

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de proxy trust (importante para proxy reverso do Easypanel)
app.set('trust proxy', true);

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

app.get("/api/botfather/health", (req, res) => {
  res.json({ status: "ok" });
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
  console.error("Erro na requisição:", err.message);
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

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 BotFather API rodando na porta ${PORT}`);
  console.log(`✅ Pronto para receber múltiplas requisições simultâneas`);
  console.log(`🌐 Domínio: https://portalafiliado.com/api/botfather/`);
  console.log(`📡 Escutando em: 0.0.0.0:${PORT}`);
});

// Configurações do servidor para alta concorrência
server.maxConnections = Infinity; // Sem limite de conexões
server.keepAliveTimeout = 65000; // 65 segundos
server.headersTimeout = 66000; // 66 segundos

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  // Não encerra o processo, apenas loga o erro
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Não encerra o processo imediatamente para manter disponibilidade
});

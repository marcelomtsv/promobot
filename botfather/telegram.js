const axios = require("axios");

const API_URL = "https://api.telegram.org/bot";
const DEFAULT_TIMEOUT = 30000; // Aumentado para 30 segundos

// Instância do axios com configuração padrão
const apiClient = axios.create({
  timeout: DEFAULT_TIMEOUT,
  validateStatus: (status) => status < 500
});

// Função auxiliar para escapar texto Markdown
function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/_/g, "\\_").replace(/\*/g, "\\*").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

// Função auxiliar para validar URL de imagem
function isValidImageUrl(url) {
  return url && (url.startsWith("http://") || url.startsWith("https://"));
}

async function sendMessage(token, chatId, text, img = null) {
  try {
    if (!token || !chatId || !text) {
      return null;
    }

    const isPhoto = isValidImageUrl(img);
    const endpoint = isPhoto ? "sendPhoto" : "sendMessage";
    const url = `${API_URL}${token}/${endpoint}`;
    const escapedText = escapeMarkdown(text);
    
    const payload = {
      chat_id: chatId,
      parse_mode: "Markdown"
    };
    
    if (isPhoto) {
      payload.caption = escapedText;
      payload.photo = img;
    } else {
      payload.text = escapedText;
      payload.disable_web_page_preview = true;
    }
    
    const response = await apiClient.post(url, payload);
    
    if (response.data?.ok && response.data.result) {
      return response.data.result.message_id;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function deleteMessage(token, chatId, messageId) {
  try {
    if (!token || !chatId || !messageId) {
      return false;
    }

    const url = `${API_URL}${token}/deleteMessage`;
    const response = await apiClient.post(url, {
      chat_id: chatId,
      message_id: parseInt(messageId)
    });
    
    return response.data?.ok === true;
  } catch (error) {
    return false;
  }
}

async function verifyToken(token) {
  try {
    if (!token) {
      return { valid: false, bot: null, error: "Token não fornecido" };
    }

    const url = `${API_URL}${token}/getMe`;
    const response = await apiClient.get(url, { timeout: 30000 });
    
    if (response.data?.ok && response.data.result) {
      const bot = response.data.result;
      return {
        valid: true,
        bot: {
          id: bot.id,
          username: bot.username,
          firstName: bot.first_name,
          isBot: bot.is_bot
        }
      };
    }
    
    return { valid: false, bot: null, error: "Token inválido" };
  } catch (error) {
    return { valid: false, bot: null, error: error.message };
  }
}

// Função auxiliar para traduzir erros da API do Telegram
function getErrorMessage(errorCode, description) {
  const errorMessages = {
    400: {
      "Bad Request: chat not found": "Grupo/canal não encontrado. Verifique se o chatId está correto.",
      "Bad Request: chat_id is empty": "chatId não fornecido ou inválido.",
      "Bad Request: user not found": "Bot não encontrado. Verifique se o token está correto.",
      "Unauthorized": "Token inválido ou expirado.",
      "Forbidden: bot is not a member of the group chat": "Bot não é membro do grupo. Adicione o bot ao grupo primeiro.",
      "Forbidden: bot is not a member of the supergroup chat": "Bot não é membro do supergrupo. Adicione o bot ao grupo primeiro.",
      "Forbidden: bot is not a member of the channel chat": "Bot não é membro do canal. Adicione o bot ao canal primeiro.",
      "Forbidden: bot was blocked by the user": "Bot foi bloqueado pelo usuário.",
      "Forbidden: user is deactivated": "Usuário/bot foi desativado.",
      "Bad Request: group chat was upgraded to a supergroup chat": "O grupo foi atualizado para supergrupo. Use o novo chatId."
    }
  };

  // Tenta encontrar mensagem específica
  if (description) {
    for (const [key, message] of Object.entries(errorMessages[400] || {})) {
      if (description.includes(key) || description.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }
  }

  // Mensagens genéricas baseadas no código de erro
  if (errorCode === 400) {
    if (description?.includes("not found")) {
      return "Grupo/canal não encontrado. Verifique se o chatId está correto e se o bot tem acesso.";
    }
    if (description?.includes("Forbidden")) {
      return "Bot não tem acesso ao grupo/canal. Adicione o bot ao grupo/canal primeiro.";
    }
    return description || "Erro na requisição. Verifique o token e chatId.";
  }

  if (errorCode === 401) {
    return "Token inválido ou expirado. Verifique o token do bot.";
  }

  if (errorCode === 403) {
    return "Bot não tem permissão para acessar este grupo/canal. Adicione o bot ao grupo/canal primeiro.";
  }

  return description || "Erro ao verificar acesso ao grupo/canal.";
}

async function verifyChat(token, chatId) {
  try {
    if (!token || !chatId) {
      return { 
        hasAccess: false, 
        error: "Token ou chatId não fornecido" 
      };
    }

    // Primeiro, verifica se o bot tem acesso ao chat
    const chatUrl = `${API_URL}${token}/getChat`;
    const chatResponse = await apiClient.post(chatUrl, { chat_id: chatId }, { timeout: 30000 });
    
    if (!chatResponse.data?.ok || !chatResponse.data.result) {
      const errorCode = chatResponse.status || 400;
      const description = chatResponse.data?.description || "Erro desconhecido";
      const errorMessage = getErrorMessage(errorCode, description);
      
      return { 
        hasAccess: false, 
        error: errorMessage
      };
    }

    const chat = chatResponse.data.result;
    
    // Para grupos e supergrupos, verifica as permissões do bot
    let canSendMessages = true;
    let canDeleteMessages = false;
    
    if (chat.type === "group" || chat.type === "supergroup") {
      try {
        // Obtém informações do bot no chat
        const botInfo = await verifyToken(token);
        if (botInfo.valid && botInfo.bot) {
          const memberUrl = `${API_URL}${token}/getChatMember`;
          const memberResponse = await apiClient.post(memberUrl, {
            chat_id: chatId,
            user_id: botInfo.bot.id
          }, { timeout: 30000 });
          
          if (memberResponse.data?.ok && memberResponse.data.result) {
            const member = memberResponse.data.result;
            const status = member.status;
            
            // Se o bot é administrador, verifica permissões específicas
            if (status === "administrator" && member.can_post_messages !== undefined) {
              canSendMessages = member.can_post_messages !== false;
              canDeleteMessages = member.can_delete_messages === true;
            } else if (status === "administrator") {
              // Para administradores sem restrições, assume que pode tudo
              canSendMessages = true;
              canDeleteMessages = true;
            } else if (status === "member") {
              // Membros podem enviar, mas não deletar mensagens de outros
              canSendMessages = true;
              canDeleteMessages = false;
            } else if (status === "left" || status === "kicked") {
              // Bot foi removido ou saiu do grupo
              return {
                hasAccess: false,
                error: "Bot não é membro do grupo. Adicione o bot ao grupo primeiro."
              };
            } else {
              // Status desconhecido ou sem acesso
              return {
                hasAccess: false,
                error: `Bot não tem acesso ao grupo. Status: ${status}`
              };
            }
          } else {
            // Não conseguiu obter informações do membro
            return {
              hasAccess: false,
              error: "Não foi possível verificar se o bot é membro do grupo."
            };
          }
        } else {
          return {
            hasAccess: false,
            error: "Token do bot inválido."
          };
        }
      } catch (error) {
        // Se não conseguir verificar permissões, retorna erro específico
        const errorCode = error.response?.status || 400;
        const description = error.response?.data?.description || error.message;
        const errorMessage = getErrorMessage(errorCode, description);
        
        return {
          hasAccess: false,
          error: errorMessage
        };
      }
    } else if (chat.type === "channel") {
      // Para canais, verifica se o bot é administrador
      try {
        const botInfo = await verifyToken(token);
        if (botInfo.valid && botInfo.bot) {
          const memberUrl = `${API_URL}${token}/getChatMember`;
          const memberResponse = await apiClient.post(memberUrl, {
            chat_id: chatId,
            user_id: botInfo.bot.id
          }, { timeout: 30000 });
          
          if (memberResponse.data?.ok && memberResponse.data.result) {
            const member = memberResponse.data.result;
            const status = member.status;
            
            if (status === "administrator") {
              canSendMessages = member.can_post_messages !== false;
              canDeleteMessages = member.can_delete_messages === true;
            } else if (status === "left" || status === "kicked") {
              return {
                hasAccess: false,
                error: "Bot não é administrador do canal. Adicione o bot como administrador do canal primeiro."
              };
            } else {
              return {
                hasAccess: false,
                error: `Bot não tem acesso ao canal. Status: ${status}`
              };
            }
          } else {
            return {
              hasAccess: false,
              error: "Não foi possível verificar se o bot é administrador do canal."
            };
          }
        } else {
          return {
            hasAccess: false,
            error: "Token do bot inválido."
          };
        }
      } catch (error) {
        const errorCode = error.response?.status || 400;
        const description = error.response?.data?.description || error.message;
        const errorMessage = getErrorMessage(errorCode, description);
        
        return {
          hasAccess: false,
          error: errorMessage
        };
      }
    }
    
    return {
      hasAccess: true,
      chat: {
        id: chat.id,
        type: chat.type,
        title: chat.title || chat.username || chat.first_name,
        username: chat.username || null
      },
      permissions: {
        canSendMessages,
        canDeleteMessages
      }
    };
  } catch (error) {
    const errorCode = error.response?.status || 500;
    const description = error.response?.data?.description || error.message;
    const errorMessage = getErrorMessage(errorCode, description);
    
    return { 
      hasAccess: false, 
      error: errorMessage
    };
  }
}

module.exports = {
  sendMessage,
  deleteMessage,
  verifyToken,
  verifyChat
};

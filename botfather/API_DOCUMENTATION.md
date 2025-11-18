# BotFather API - Documentação Completa

## 📋 Visão Geral

A BotFather API é uma API REST intermediária que facilita a integração com a API do Telegram. Ela permite enviar mensagens, deletar mensagens, verificar tokens de bots e validar acesso a grupos/canais do Telegram.

**Base URL:** `https://portalafiliado.com/api/botfather`

**Formato de Resposta:** JSON

**Timeout:** 30 segundos por requisição

---

## 🚀 Endpoints Disponíveis

### 1. Health Check

Verifica se a API está funcionando.

**Endpoint:** `GET /api/botfather/health`

**Parâmetros:** Nenhum

**Resposta de Sucesso:**
```json
{
  "status": "ok"
}
```

**Exemplo de Requisição:**
```bash
curl https://portalafiliado.com/api/botfather/health
```

---

### 2. Verificar Token do Bot

Valida se um token de bot do Telegram é válido e retorna informações do bot.

**Endpoint:** `POST /api/botfather/verify-token`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
}
```

**Parâmetros:**
- `token` (obrigatório): Token do bot do Telegram obtido via @BotFather

**Resposta de Sucesso (Token Válido):**
```json
{
  "success": true,
  "valid": true,
  "message": "Token válido e funcionando",
  "bot": {
    "id": 123456789,
    "username": "meu_bot",
    "firstName": "Meu Bot",
    "isBot": true
  }
}
```

**Resposta de Sucesso (Token Inválido):**
```json
{
  "success": true,
  "valid": false,
  "message": "Token inválido ou não existe",
  "error": "Token não reconhecido pela API do Telegram"
}
```

**Resposta de Erro:**
```json
{
  "success": false,
  "error": "Campos obrigatórios: token"
}
```

**Exemplo de Requisição:**
```bash
curl -X POST https://portalafiliado.com/api/botfather/verify-token \
  -H "Content-Type: application/json" \
  -d '{"token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"}'
```

**Exemplo em JavaScript:**
```javascript
const response = await fetch('https://portalafiliado.com/api/botfather/verify-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
  })
});

const data = await response.json();
console.log(data);
```

---

### 3. Verificar Acesso ao Chat

Verifica se o bot tem acesso a um grupo, supergrupo ou canal e retorna informações sobre permissões.

**Endpoint:** `POST /api/botfather/verify`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  "chatId": "-1001234567890"
}
```

**Parâmetros:**
- `token` (obrigatório): Token do bot do Telegram
- `chatId` (obrigatório): ID do chat, grupo ou canal (pode ser negativo para grupos/canais)

**Resposta de Sucesso (Com Acesso):**
```json
{
  "success": true,
  "verified": true,
  "message": "Bot tem acesso ao grupo/canal",
  "chat": {
    "id": -1001234567890,
    "type": "supergroup",
    "title": "Meu Grupo",
    "username": "meu_grupo"
  },
  "permissions": {
    "canSendMessages": true,
    "canDeleteMessages": true
  }
}
```

**Resposta de Sucesso (Sem Acesso):**
```json
{
  "success": true,
  "verified": false,
  "message": "Bot não tem acesso ao grupo/canal ou chatId inválido"
}
```

**Resposta de Erro:**
```json
{
  "success": false,
  "error": "Campos obrigatórios: token, chatId"
}
```

**Exemplo de Requisição:**
```bash
curl -X POST https://portalafiliado.com/api/botfather/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chatId": "-1001234567890"
  }'
```

**Exemplo em JavaScript:**
```javascript
const response = await fetch('https://portalafiliado.com/api/botfather/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
    chatId: '-1001234567890'
  })
});

const data = await response.json();
if (data.verified) {
  console.log('Bot tem acesso!', data.permissions);
} else {
  console.log('Erro:', data.message);
}
```

---

### 4. Enviar Mensagem

Envia uma mensagem de texto ou uma imagem com legenda para um chat do Telegram.

**Endpoint:** `POST /api/botfather/send`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON) - Mensagem de Texto:**
```json
{
  "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  "chatId": "-1001234567890",
  "text": "Olá! Esta é uma mensagem de teste."
}
```

**Body (JSON) - Mensagem com Imagem:**
```json
{
  "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  "chatId": "-1001234567890",
  "text": "Legenda da imagem",
  "img": "https://exemplo.com/imagem.jpg"
}
```

**Parâmetros:**
- `token` (obrigatório): Token do bot do Telegram
- `chatId` (obrigatório): ID do chat, grupo ou canal
- `text` (obrigatório): Texto da mensagem ou legenda da imagem
- `img` (opcional): URL da imagem (deve começar com `http://` ou `https://`). Se fornecido, a mensagem será enviada como foto com legenda.

**Nota:** O texto é automaticamente escapado para Markdown. Caracteres especiais como `_`, `*`, `[`, `]` são escapados.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "messageId": 123,
  "chatId": "-1001234567890"
}
```

**Resposta de Erro:**
```json
{
  "success": false,
  "error": "Erro ao enviar mensagem"
}
```

**Exemplo de Requisição (Texto):**
```bash
curl -X POST https://portalafiliado.com/api/botfather/send \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chatId": "-1001234567890",
    "text": "Olá! Esta é uma mensagem de teste."
  }'
```

**Exemplo de Requisição (Com Imagem):**
```bash
curl -X POST https://portalafiliado.com/api/botfather/send \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chatId": "-1001234567890",
    "text": "Veja esta imagem incrível!",
    "img": "https://exemplo.com/imagem.jpg"
  }'
```

**Exemplo em JavaScript:**
```javascript
// Enviar mensagem de texto
const sendText = async () => {
  const response = await fetch('https://portalafiliado.com/api/botfather/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      chatId: '-1001234567890',
      text: 'Olá! Esta é uma mensagem de teste.'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log('Mensagem enviada! ID:', data.messageId);
  }
};

// Enviar mensagem com imagem
const sendImage = async () => {
  const response = await fetch('https://portalafiliado.com/api/botfather/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      chatId: '-1001234567890',
      text: 'Veja esta imagem incrível!',
      img: 'https://exemplo.com/imagem.jpg'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log('Imagem enviada! ID:', data.messageId);
  }
};
```

---

### 5. Deletar Mensagem

Deleta uma mensagem específica de um chat.

**Endpoint:** `DELETE /api/botfather/message/:chatId/:messageId`

**Headers:**
```
Content-Type: application/json
```

**Parâmetros de URL:**
- `chatId`: ID do chat, grupo ou canal
- `messageId`: ID da mensagem a ser deletada (número)

**Body (JSON):**
```json
{
  "token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
}
```

**Parâmetros:**
- `token` (obrigatório): Token do bot do Telegram

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Mensagem deletada com sucesso"
}
```

**Resposta de Erro:**
```json
{
  "success": false,
  "error": "Erro ao deletar mensagem"
}
```

**Exemplo de Requisição:**
```bash
curl -X DELETE https://portalafiliado.com/api/botfather/message/-1001234567890/123 \
  -H "Content-Type: application/json" \
  -d '{"token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"}'
```

**Exemplo em JavaScript:**
```javascript
const deleteMessage = async (chatId, messageId) => {
  const response = await fetch(
    `https://portalafiliado.com/api/botfather/message/${chatId}/${messageId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
      })
    }
  );
  
  const data = await response.json();
  if (data.success) {
    console.log('Mensagem deletada!');
  } else {
    console.error('Erro:', data.error);
  }
};

// Uso
deleteMessage('-1001234567890', 123);
```

---

## 📊 Códigos de Status HTTP

- `200 OK`: Requisição bem-sucedida
- `400 Bad Request`: Campos obrigatórios faltando ou parâmetros inválidos
- `404 Not Found`: Endpoint não encontrado
- `500 Internal Server Error`: Erro interno do servidor

---

## ⚠️ Tratamento de Erros

Todas as respostas seguem o formato padrão:

**Sucesso:**
```json
{
  "success": true,
  ...
}
```

**Erro:**
```json
{
  "success": false,
  "error": "Mensagem de erro descritiva"
}
```

### Erros Comuns

1. **Token inválido:**
   - Verifique se o token está correto
   - Certifique-se de que o bot ainda existe no Telegram

2. **Chat não encontrado:**
   - Verifique se o `chatId` está correto
   - Para grupos/canais, o ID geralmente é negativo (ex: `-1001234567890`)
   - Certifique-se de que o bot foi adicionado ao grupo/canal

3. **Bot sem permissões:**
   - Adicione o bot ao grupo/canal primeiro
   - Para canais, o bot precisa ser administrador
   - Para grupos, verifique as permissões do bot

4. **Mensagem não pode ser deletada:**
   - O bot precisa ter permissão para deletar mensagens
   - A mensagem deve ter menos de 48 horas
   - O bot deve ser administrador do grupo/canal

---

## 🔧 Configuração e Instalação

### Pré-requisitos
- Node.js (versão 14 ou superior)
- npm ou yarn

### Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure a porta (opcional):
```bash
export PORT=3001  # Linux/Mac
set PORT=3001     # Windows
```

3. Inicie o servidor:
```bash
npm start
```

O servidor estará rodando na porta 3001 (ou na porta configurada).

---

## 📝 Notas Importantes

1. **Limite de Tamanho:** O limite de payload é 10MB por requisição
2. **Timeout:** Requisições têm timeout de 30 segundos
3. **Concorrência:** A API suporta múltiplas requisições simultâneas
4. **Markdown:** O texto é automaticamente escapado para Markdown. Caracteres especiais são tratados automaticamente
5. **Imagens:** Apenas URLs de imagens são suportadas (não upload direto de arquivos)
6. **chatId:** 
   - Para grupos/canais: geralmente números negativos (ex: `-1001234567890`)
   - Para chats privados: números positivos (ex: `123456789`)
   - Para canais públicos: pode usar o username (ex: `@meu_canal`)

---

## 🎯 Fluxo de Uso Recomendado

1. **Verificar Token:**
   ```bash
   POST https://portalafiliado.com/api/botfather/verify-token
   ```

2. **Verificar Acesso ao Chat:**
   ```bash
   POST https://portalafiliado.com/api/botfather/verify
   ```

3. **Enviar Mensagem:**
   ```bash
   POST https://portalafiliado.com/api/botfather/send
   ```

4. **Deletar Mensagem (se necessário):**
   ```bash
   DELETE https://portalafiliado.com/api/botfather/message/:chatId/:messageId
   ```

---

## 📚 Exemplos Completos

### Exemplo em Python

```python
import requests

BASE_URL = "https://portalafiliado.com/api/botfather"
TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
CHAT_ID = "-1001234567890"

# Verificar token
response = requests.post(
    f"{BASE_URL}/verify-token",
    json={"token": TOKEN}
)
print("Token válido:", response.json()["valid"])

# Verificar acesso
response = requests.post(
    f"{BASE_URL}/verify",
    json={"token": TOKEN, "chatId": CHAT_ID}
)
print("Acesso verificado:", response.json()["verified"])

# Enviar mensagem
response = requests.post(
    f"{BASE_URL}/send",
    json={
        "token": TOKEN,
        "chatId": CHAT_ID,
        "text": "Olá do Python!"
    }
)
result = response.json()
if result["success"]:
    message_id = result["messageId"]
    print(f"Mensagem enviada! ID: {message_id}")
    
    # Deletar mensagem após 5 segundos
    import time
    time.sleep(5)
    response = requests.delete(
        f"{BASE_URL}/message/{CHAT_ID}/{message_id}",
        json={"token": TOKEN}
    )
    print("Mensagem deletada:", response.json()["success"])
```

### Exemplo em Node.js

```javascript
const axios = require('axios');

const BASE_URL = 'https://portalafiliado.com/api/botfather';
const TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
const CHAT_ID = '-1001234567890';

async function exemploCompleto() {
  try {
    // 1. Verificar token
    const tokenCheck = await axios.post(`${BASE_URL}/verify-token`, {
      token: TOKEN
    });
    console.log('Token válido:', tokenCheck.data.valid);
    
    // 2. Verificar acesso
    const accessCheck = await axios.post(`${BASE_URL}/verify`, {
      token: TOKEN,
      chatId: CHAT_ID
    });
    console.log('Acesso verificado:', accessCheck.data.verified);
    
    // 3. Enviar mensagem
    const sendResponse = await axios.post(`${BASE_URL}/send`, {
      token: TOKEN,
      chatId: CHAT_ID,
      text: 'Olá do Node.js!'
    });
    
    if (sendResponse.data.success) {
      const messageId = sendResponse.data.messageId;
      console.log('Mensagem enviada! ID:', messageId);
      
      // 4. Deletar mensagem após 5 segundos
      setTimeout(async () => {
        const deleteResponse = await axios.delete(
          `${BASE_URL}/message/${CHAT_ID}/${messageId}`,
          { data: { token: TOKEN } }
        );
        console.log('Mensagem deletada:', deleteResponse.data.success);
      }, 5000);
    }
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

exemploCompleto();
```

---

## 🔐 Segurança

- **Nunca exponha tokens publicamente**
- Use variáveis de ambiente para armazenar tokens
- Considere implementar autenticação adicional se a API for exposta publicamente
- Use HTTPS em produção (já configurado)

---

## 📞 Suporte

Para mais informações sobre a API do Telegram, consulte a [documentação oficial](https://core.telegram.org/bots/api).

---

## 🌐 Informações do Servidor

- **Domínio:** `https://portalafiliado.com`
- **Base Path:** `/api/botfather`
- **Porta:** `3001`
- **Protocolo:** HTTPS



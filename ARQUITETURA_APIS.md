# 🏗️ Arquitetura das APIs - PromoBOT

## 📋 Visão Geral

O sistema PromoBOT utiliza uma **arquitetura de microserviços**, onde cada API é um serviço independente rodando em portas diferentes. O website (frontend) faz apenas **requisições HTTP** para essas APIs, **sem ter o código diretamente**.

## 🔌 Estrutura das APIs

### 1. **Telegram API** (`telegram/server.js`)
- **Porta**: `3003`
- **URL**: `http://localhost:3003`
- **Função**: Gerencia sessões do Telegram (autenticação, envio de SMS, verificação de código)
- **Tecnologia**: Node.js + Express + Telegram Client Library
- **Endpoints principais**:
  - `POST /api/sessions` - Criar sessão (enviar SMS)
  - `POST /api/sessions/:id/verify` - Verificar código SMS
  - `DELETE /api/sessions` - Remover sessões
  - `GET /api/sessions` - Listar sessões
  - `GET /health` - Health check

### 2. **BotFather API** (`botfather/server.js`)
- **Porta**: `3001`
- **URL**: `http://localhost:3001`
- **Função**: Gerencia bots do Telegram (envio de mensagens, verificação de grupos/canais)
- **Tecnologia**: Node.js + Express + Axios
- **Endpoints principais**:
  - `POST /check` - Verificar configuração completa (token, grupo, canal)
  - `POST /api/botfather/verify-token` - Verificar se token é válido
  - `POST /api/botfather/verify` - Verificar acesso a grupo/canal
  - `POST /api/botfather/send` - Enviar mensagem
  - `DELETE /api/botfather/message/:chatId/:messageId` - Deletar mensagem
  - `GET /health` - Health check

### 3. **DeepSeek API** (`deepseek/index.js`)
- **Porta**: `3002`
- **URL**: `http://localhost:3002`
- **Função**: Integração com DeepSeek AI (processamento de texto, chat)
- **Tecnologia**: Node.js + Express
- **Endpoints principais**:
  - `POST /check` - Verificar se API Key é válida
  - `POST /chat` - Processar mensagens com DeepSeek
  - `GET /` - Informações da API

### 4. **Website** (`website/`)
- **Porta**: `3000`
- **URL**: `http://localhost:3000`
- **Função**: Frontend (dashboard, interface do usuário)
- **Tecnologia**: HTML + CSS + JavaScript (Vanilla)
- **Comunicação**: Apenas requisições HTTP (fetch) para as APIs

## 🔄 Fluxo de Comunicação

```
┌─────────────┐
│   Website   │  (localhost:3000)
│  (Frontend) │
└──────┬──────┘
       │
       │ HTTP Requests (fetch)
       │
       ├─────────────────┬─────────────────┬─────────────────┐
       │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Telegram   │  │  BotFather  │  │  DeepSeek   │  │  Firebase   │
│    API      │  │     API     │  │     API     │  │  Firestore  │
│  :3003      │  │   :3001     │  │   :3002     │  │  (Cloud)    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

## ✅ Confirmação: Código Separado

**SIM, está exatamente como você queria:**

1. ✅ **Código das APIs está separado** em pastas diferentes:
   - `telegram/` - Código da API do Telegram
   - `botfather/` - Código da API do BotFather
   - `deepseek/` - Código da API do DeepSeek
   - `website/` - Código do frontend

2. ✅ **Website faz apenas requisições HTTP**:
   - Usa `fetch()` para chamar as APIs
   - Não tem código das APIs diretamente no frontend
   - Apenas URLs e endpoints configurados

3. ✅ **Cada API é independente**:
   - Pode rodar em servidores diferentes
   - Pode ser escalada independentemente
   - Pode ser atualizada sem afetar outras

## 📝 Exemplo de Requisição

### No Website (`dashboard.js`):
```javascript
// Verificar BotFather
const response = await fetch(`${BOTFATHER_API_URL}/check`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bot_token, channel, group })
});
```

### Na API (`botfather/server.js`):
```javascript
app.post("/check", async (req, res) => {
  // Processa a requisição
  // Retorna resposta JSON
});
```

## 🔒 Segurança

- **CORS configurado**: Cada API permite apenas requisições do website
- **Validação de dados**: Todas as APIs validam os dados recebidos
- **Timeouts**: Requisições têm timeout para evitar travamentos
- **Error handling**: Erros são tratados adequadamente

## 🚀 Vantagens desta Arquitetura

1. **Separação de responsabilidades**: Cada API tem uma função específica
2. **Escalabilidade**: Pode escalar cada API independentemente
3. **Manutenibilidade**: Código organizado e fácil de manter
4. **Segurança**: Código sensível (tokens, chaves) não fica no frontend
5. **Reutilização**: APIs podem ser usadas por outros projetos

## 📦 Dependências

- **Website**: Apenas JavaScript vanilla (sem frameworks)
- **Telegram API**: `telegram`, `express`, `dotenv`
- **BotFather API**: `express`, `axios`
- **DeepSeek API**: `express`, `node-fetch` (ou similar)

## 🔧 Como Iniciar

```bash
# Iniciar todas as APIs e website
npm run dev

# Ou iniciar individualmente:
npm run dev:website    # Porta 3000
npm run dev:botfather  # Porta 3001
npm run dev:deepseek   # Porta 3002
npm run dev:telegram   # Porta 3003
```


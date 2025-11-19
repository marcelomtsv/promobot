# Telegram API - GramJS MTProto

API para cadastro e verificação de contas do Telegram usando GramJS MTProto.

## 🎯 Objetivo

Esta API foi desenvolvida para **cadastrar e verificar contas do Telegram** dos clientes. Ela permite:

- ✅ **Cadastrar conta do Telegram** (criar sessão)
- ✅ **Verificar se a conta está correta** (validar código de autenticação)
- ✅ **Armazenar dados da conta** para uso futuro

> **Nota:** Funcionalidades futuras como envio/recebimento de mensagens serão adicionadas posteriormente. Por enquanto, a API foca apenas em cadastro e verificação.

## 🚀 Como Iniciar

### 1. Instalar dependências

```bash
cd telegram
npm install
```

### 2. Configurar credenciais do Telegram

Crie um arquivo `.env` na pasta `telegram/`:

```env
PORT=3003
API_ID=seu_api_id_aqui
API_HASH=seu_api_hash_aqui
```

**Como obter API_ID e API_HASH:**
1. Acesse: https://my.telegram.org/apps
2. Faça login com seu número de telefone
3. Crie uma nova aplicação
4. Copie o `api_id` e `api_hash`

### 3. Iniciar o servidor

```bash
npm start
```

Ou em modo desenvolvimento (com hot reload):

```bash
npm run dev
```

O servidor iniciará em `http://localhost:3003`

Você verá a mensagem:
```
🚀 Servidor rodando em http://localhost:3003
```

## 📡 Endpoints Disponíveis

### Verificação e Status

#### `GET /health`
Verifica se a API está rodando.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "sessions": 0
}
```

#### `GET /`
Lista todos os endpoints disponíveis.

#### `POST /check`
Verifica se a API está configurada com credenciais válidas.

**Body (opcional):**
```json
{
  "api_id": "12345678",
  "api_hash": "abcdef1234567890abcdef1234567890"
}
```

**Resposta:**
```json
{
  "success": true,
  "valid": true,
  "configured": true
}
```

### Configuração

#### `GET /api/config`
Verifica se a API está configurada.

**Resposta:**
```json
{
  "configured": true
}
```

#### `POST /api/config`
Configura API_ID e API_HASH (salva no arquivo `.env`).

**Body:**
```json
{
  "apiId": "12345678",
  "apiHash": "abcdef1234567890abcdef1234567890"
}
```

**Resposta:**
```json
{
  "success": true
}
```

### Gerenciamento de Sessões (Contas)

#### `GET /api/sessions`
Lista todas as contas cadastradas.

**Resposta:**
```json
{
  "sessions": [
    {
      "id": "session_1234567890_abc123",
      "name": "João Silva",
      "phone": "+5511999999999",
      "status": "active",
      "createdAt": 1234567890000
    }
  ]
}
```

**Status possíveis:**
- `pending` - Aguardando verificação do código
- `active` - Conta verificada e ativa
- `paused` - Conta pausada

#### `POST /api/sessions`
**Cadastra uma nova conta do Telegram.**

Este é o endpoint principal para cadastrar uma conta. Ele:
1. Cria uma nova sessão
2. Envia código de verificação para o telefone
3. Retorna um `sessionId` para verificação posterior

**Body:**
```json
{
  "name": "João Silva",
  "phone": "+5511999999999",
  "apiId": "12345678",
  "apiHash": "abcdef1234567890abcdef1234567890"
}
```

**Resposta:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123",
  "phoneCodeHash": "abc123def456..."
}
```

**Importante:**
- Apenas **1 conta pode estar ativa** por vez
- Se já existir uma conta ativa, você receberá um erro
- O código de verificação será enviado via SMS/Telegram para o número informado

#### `POST /api/sessions/:id/verify`
**Verifica o código recebido e ativa a conta.**

Após receber o código no telefone, use este endpoint para verificar e ativar a conta.

**Body:**
```json
{
  "code": "12345"
}
```

**Resposta:**
```json
{
  "success": true,
  "sessionString": "1BVtsOHwBu2..."
}
```

**O que acontece:**
- Verifica se o código está correto
- Ativa a conta (status muda para `active`)
- Retorna o `sessionString` (token de sessão) para uso futuro
- A conta fica pronta para uso

#### `POST /api/sessions/connect`
Conecta com uma conta já existente usando o `sessionString`.

**Body:**
```json
{
  "name": "João Silva",
  "sessionString": "1BVtsOHwBu2...",
  "phone": "+5511999999999",
  "apiId": "12345678",
  "apiHash": "abcdef1234567890abcdef1234567890"
}
```

**Resposta:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123"
}
```

#### `POST /api/sessions/:id/pause`
Pausa uma conta (não remove, apenas pausa).

#### `POST /api/sessions/:id/resume`
Retoma uma conta pausada.

#### `DELETE /api/sessions/:id`
Remove uma conta específica.

#### `DELETE /api/sessions`
Remove todas as contas cadastradas.

## 📋 Fluxo de Cadastro de Conta

### Passo a Passo:

1. **Configurar API** (se ainda não configurou):
   ```bash
   POST /api/config
   {
     "apiId": "12345678",
     "apiHash": "abcdef..."
   }
   ```

2. **Cadastrar conta**:
   ```bash
   POST /api/sessions
   {
     "name": "João Silva",
     "phone": "+5511999999999",
     "apiId": "12345678",
     "apiHash": "abcdef..."
   }
   ```
   
   Você receberá um código via SMS/Telegram no número informado.

3. **Verificar código**:
   ```bash
   POST /api/sessions/{sessionId}/verify
   {
     "code": "12345"
   }
   ```
   
   Se o código estiver correto, a conta será ativada.

4. **Verificar status**:
   ```bash
   GET /api/sessions
   ```
   
   A conta deve aparecer com `status: "active"`.

## 🔒 Limitações

- **Apenas 1 conta ativa** por vez
- Para adicionar uma nova conta, é necessário remover a conta existente primeiro
- As sessões são armazenadas em memória (serão perdidas ao reiniciar o servidor)

## 🛠️ Desenvolvimento

### Modo Desenvolvimento

```bash
npm run dev
```

O servidor reiniciará automaticamente quando você salvar alterações.

### Estrutura do Projeto

```
telegram/
├── server.js          # Servidor principal
├── package.json       # Dependências
├── .env              # Configurações (criar manualmente)
├── env.example       # Exemplo de .env
└── README.md         # Esta documentação
```

## 🔍 Verificar se está rodando

Abra no navegador: http://localhost:3003/health

Ou use curl:
```bash
curl http://localhost:3003/health
```

## 📝 Notas Importantes

- A API **não envia nem recebe mensagens** por enquanto
- Foco atual: **cadastro e verificação de contas**
- Funcionalidades de mensagens serão adicionadas no futuro
- Os dados das contas são armazenados para uso futuro

## 🚧 Funcionalidades Futuras

- [ ] Envio de mensagens
- [ ] Recebimento de mensagens em tempo real
- [ ] Listagem de chats
- [ ] Persistência de sessões em banco de dados

---

**Desenvolvido para facilitar o cadastro e verificação de contas do Telegram**

# Telegram API - GramJS MTProto

API completa usando GramJS MTProto para Telegram.

## 🚀 Iniciar

```bash
npm install
npm start
```

O servidor iniciará em `http://localhost:3003`

## 📡 Endpoints

- `GET /` - Status da API e lista de endpoints
- `GET /health` - Health check
- `GET /api/config` - Verificar configuração
- `POST /api/config` - Configurar API_ID e API_HASH
- `GET /api/sessions` - Listar sessões
- `POST /api/sessions` - Criar nova sessão
- `POST /api/sessions/:id/verify` - Verificar código
- `POST /api/sessions/connect` - Conectar com sessão existente
- `POST /check` - Verificar se API está configurada
- `WebSocket ws://localhost:3003` - Receber mensagens em tempo real

## ⚙️ Configuração

Crie um arquivo `.env` na pasta `telegram/`:

```
PORT=3003
API_ID=seu_api_id
API_HASH=seu_api_hash
```

Ou configure via endpoint `POST /api/config`

## 🔍 Verificar se está rodando

Abra no navegador: http://localhost:3003/health

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "...",
  "sessions": 0,
  "connections": 0
}
```

# DeepSeek API

API Node.js para integração com DeepSeek Chat. Esta API permite que cada cliente use sua própria chave de API do DeepSeek.

## 🚀 Endpoints

### `GET /`
Verifica se a API está rodando.

**Resposta:**
```json
{
  "success": true,
  "message": "DeepSeek API está rodando",
  "endpoints": {
    "POST /check": "Verifica se a API key é válida",
    "POST /chat": "Processa mensagens com DeepSeek"
  }
}
```

---

### `POST /check`
Verifica se uma API key do DeepSeek é válida.

**Request Body:**
```json
{
  "api_key": "sua-chave-api-aqui"
}
```

**Resposta de Sucesso (API key válida):**
```json
{
  "success": true,
  "message": "API key válida",
  "valid": true
}
```

**Resposta de Erro (API key inválida):**
```json
{
  "success": false,
  "message": "API key inválida ou expirada",
  "valid": false
}
```

**Exemplo com cURL:**
```bash
curl -X POST https://portalafiliado.com/api/deepseek/check \
  -H "Content-Type: application/json" \
  -d '{"api_key": "sua-chave-api-aqui"}'
```

---

### `POST /chat`
Processa mensagens com o DeepSeek Chat. Cada cliente envia sua própria chave de API.

**Request Body:**
```json
{
  "api_key": "sua-chave-api-aqui",
  "messages": [
    {
      "role": "system",
      "content": "Você é um assistente útil."
    },
    {
      "role": "user",
      "content": "Olá, como você está?"
    }
  ],
  "temperature": 0.3
}
```

**Parâmetros:**
- `api_key` (obrigatório): Sua chave de API do DeepSeek
- `messages` (obrigatório): Array de mensagens. Cada mensagem deve ter:
  - `role`: `"system"`, `"user"` ou `"assistant"`
  - `content`: O texto da mensagem
- `temperature` (opcional): Valor entre 0 e 2. Padrão: `0.3`

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "resposta": "Olá! Estou bem, obrigado por perguntar. Como posso ajudá-lo hoje?"
  }
}
```

**Nota:** A API tenta fazer parse JSON da resposta. Se não for JSON válido, retorna:
```json
{
  "success": true,
  "data": {
    "raw_response": "texto da resposta aqui"
  }
}
```

**Exemplo com cURL:**
```bash
curl -X POST https://portalafiliado.com/api/deepseek/chat \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sua-chave-api-aqui",
    "messages": [
      {
        "role": "user",
        "content": "Explique o que é JavaScript em uma frase."
      }
    ],
    "temperature": 0.7
  }'
```

**Exemplo com JavaScript (fetch):**
```javascript
const response = await fetch('https://portalafiliado.com/api/deepseek/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    api_key: 'sua-chave-api-aqui',
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente especializado em programação.'
      },
      {
        role: 'user',
        content: 'Como criar uma função em Python?'
      }
    ],
    temperature: 0.5
  })
});

const data = await response.json();
console.log(data);
```

**Exemplo com Python (requests):**
```python
import requests

url = "https://portalafiliado.com/api/deepseek/chat"
payload = {
    "api_key": "sua-chave-api-aqui",
    "messages": [
        {
            "role": "user",
            "content": "Qual é a capital do Brasil?"
        }
    ],
    "temperature": 0.3
}

response = requests.post(url, json=payload)
data = response.json()
print(data)
```

---

## ⚠️ Códigos de Erro

### 400 Bad Request
Quando faltam parâmetros obrigatórios ou estão em formato incorreto.

**Exemplo:**
```json
{
  "success": false,
  "error": "api_key é obrigatório no body"
}
```

### 500 Internal Server Error
Erro interno do servidor ou erro na comunicação com a API do DeepSeek.

**Exemplo:**
```json
{
  "success": false,
  "error": "API request failed: 401 - Invalid API key"
}
```

---

## 🔑 Como Obter uma API Key do DeepSeek

1. Acesse [https://platform.deepseek.com](https://platform.deepseek.com)
2. Crie uma conta ou faça login
3. Vá para a seção de API Keys
4. Gere uma nova chave de API
5. Use essa chave no parâmetro `api_key` das requisições

---

## 📝 Notas Importantes

- Cada cliente deve usar sua própria API key do DeepSeek
- A API limpa automaticamente blocos de código markdown (```) das respostas
- Se a resposta for JSON válido, ela é parseada automaticamente
- O limite de tamanho do body é 10MB
- A temperatura padrão é 0.3 se não especificada

---

## 🛠️ Tecnologias

- Node.js >= 18.0.0
- Express.js
- node-fetch

## 🌐 URL Base

A API está disponível em: `https://portalafiliado.com/api/deepseek/`

---

## 📄 Licença

ISC


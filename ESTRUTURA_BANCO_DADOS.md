# 📊 Estrutura do Banco de Dados - Firebase Firestore

## 📁 Coleção: `users`

Cada documento na coleção `users` representa um usuário autenticado. O ID do documento é o `uid` do usuário (fornecido pelo Firebase Authentication).

### Estrutura do Documento

```javascript
{
  // ===== TELEGRAM =====
  // IMPORTANTE: Cada usuário pode ter APENAS UMA conta do Telegram
  telegramAccount: {
    phone: string,             // Telefone no formato: +5511999999999
    apiId: string,             // API ID do Telegram
    apiHash: string,           // API Hash do Telegram
    sessionId: string,         // ID da sessão na API do Telegram
    sessionString: string      // String de sessão (token) - OBRIGATÓRIO para conta ativa
  },

  // ===== INTEGRAÇÕES =====
  // IMPORTANTE: Cada usuário pode ter APENAS UMA configuração por integração
  integrationConfigs: {
    deepseek: {
      apiKey: string           // API Key do DeepSeek (único campo necessário)
    },
    whatsapp: {
      number: string           // Número do WhatsApp
    },
    botfather: {
      botToken: string,        // Token do bot
      channel: string,         // Canal do Telegram
      group: string            // Grupo do Telegram
    }
  },

  // ===== METADADOS =====
  updatedAt: string            // ISO 8601 timestamp da última atualização
}
```

## 📋 Exemplo Completo

```json
{
  "telegramAccount": {
    "phone": "+5511999999999",
    "apiId": "29836363",
    "apiHash": "abcdef1234567890abcdef1234567890",
    "sessionId": "session_1234567890_abc123",
    "sessionString": "1BVtsOHwBu2..."
  },
  "integrationConfigs": {
    "deepseek": {
      "apiKey": "sk-..."
    },
    "whatsapp": {
      "number": "+5511999999999"
    },
    "botfather": {
      "botToken": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
      "channel": "@meucanal",
      "group": "@meugrupo"
    }
  },
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

## 🔑 Campos Importantes

### Telegram Account
- **IMPORTANTE**: Cada usuário pode ter **APENAS UMA** conta do Telegram
- **`sessionString`**: Campo **OBRIGATÓRIO** para considerar a conta como "Ativa"
  - Se não existir ou estiver vazio → Status: "Não configurado" ou "Pendente"
  - Se existir → Status: "Ativo"
- **`phone`**: Deve estar no formato internacional com `+` (ex: `+5511999999999`)
- **`apiId`** e **`apiHash`**: Credenciais do Telegram (obtidas em https://my.telegram.org/apps)
- **Recadastrar**: Ao adicionar nova conta, a anterior é **automaticamente removida** (Firebase + API)

### Integration Configs
- **IMPORTANTE**: Cada usuário pode ter **APENAS UMA** configuração por integração
- **`deepseek`**: Apenas `apiKey` necessário
  - Se `apiKey` existir → Status: "Ativo"
  - Se não existir → Status: "Não configurado"
- **`whatsapp`**: Apenas `number` (número de telefone)
- **`botfather`**: `botToken`, `channel`, `group` (todos obrigatórios)

### Notification Configs
- Usado para configurações de notificações (WhatsApp, etc.)

## 🔒 Regras de Segurança (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Usuário só pode ler/escrever seus próprios dados
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📝 Notas Importantes

1. **ID do Documento**: Sempre é o `uid` do usuário autenticado
2. **Merge Strategy**: Usa `{ merge: true }` para não sobrescrever campos existentes
3. **Timestamps**: Todos os timestamps são em formato ISO 8601 (string)
4. **Cache**: O sistema usa cache em memória (`window.telegramConfigCache`, etc.) para melhor performance
5. **Validação**: 
   - Telefone deve começar com `+` e ter 10-15 dígitos
   - API_HASH deve ter pelo menos 20 caracteres
   - API_ID deve ser um número válido > 0

## 🗂️ Estrutura de Pastas no Firestore

```
firestore/
└── users/
    ├── {userId1}/
    │   ├── telegramAccount: {...}
    │   ├── integrationConfigs: {...}
    │   ├── notificationConfigs: {...}
    │   └── updatedAt: "..."
    ├── {userId2}/
    │   └── ...
    └── ...
```

## 🔄 Fluxo de Dados

1. **Salvar**: `saveUserDataToFirebase()` → Firestore → Atualiza cache
2. **Carregar**: Firestore → `loadUserDataFromFirebase()` → Atualiza cache
3. **Cache**: Usado para evitar leituras desnecessárias do Firestore (TTL: 1 minuto)

## ⚠️ Observações Importantes

- **Telegram**: 
  - Cada usuário pode ter **APENAS UMA** conta
  - Status "Ativo" só aparece se `sessionString` existir (conta verificada)
  - Ao adicionar nova conta, a anterior é **automaticamente removida**
  - A API também garante apenas 1 conta ativa por vez
- **DeepSeek**: 
  - Cada usuário pode ter **APENAS UMA** configuração
  - Status "Ativo" se `apiKey` existir
- **WhatsApp**: 
  - Cada usuário pode ter **APENAS UMA** configuração
  - Status "Ativo" se `number` existir em `integrationConfigs.whatsapp`
- **BotFather**: 
  - Cada usuário pode ter **APENAS UMA** configuração
  - Status "Ativo" se `botToken`, `channel` e `group` existirem
- Todos os dados são salvos **APENAS** no Firestore (não usa mais localStorage para dados persistentes)
- **Recadastrar**: Para trocar de conta/configuração, o sistema **automaticamente remove** a anterior antes de adicionar a nova


# 📊 Estrutura do Banco de Dados - Firebase Firestore

## 📁 Coleção: `users`

Cada documento na coleção `users` representa um usuário autenticado. O ID do documento é o `uid` do usuário (fornecido pelo Firebase Authentication).

### Estrutura do Documento

```javascript
{
  // ===== TELEGRAM =====
  telegramAccount: {
    name: string,              // Email do usuário (identificador único)
    email: string,             // Email do usuário
    phone: string,             // Telefone no formato: +5511999999999
    apiId: string,             // API ID do Telegram
    apiHash: string,           // API Hash do Telegram
    sessionId: string,         // ID da sessão na API do Telegram
    sessionString: string,     // String de sessão (token) - OBRIGATÓRIO para conta ativa
    status: string,            // 'pending' | 'active'
    createdAt: string,          // ISO 8601 timestamp
    verifiedAt: string          // ISO 8601 timestamp (quando foi verificada)
  },

  // ===== INTEGRAÇÕES =====
  integrationConfigs: {
    deepseek: {
      apiKey: string,          // API Key do DeepSeek
      model: string,           // Modelo usado (ex: 'deepseek-chat')
      enabled: boolean,        // Se está habilitado
      verified: boolean,       // Se foi verificado
      verifiedAt: string      // ISO 8601 timestamp
    },
    whatsapp: {
      number: string           // Número do WhatsApp
    },
    botfather: {
      botToken: string,        // Token do bot
      channel: string,         // Canal do Telegram
      group: string,           // Grupo do Telegram
      enabled: boolean,
      verified: boolean,
      verifiedAt: string
    }
  },

  // ===== NOTIFICAÇÕES =====
  notificationConfigs: {
    whatsapp: {
      number: string           // Número do WhatsApp para notificações
    }
    // Outros tipos de notificação podem ser adicionados aqui
  },

  // ===== METADADOS =====
  updatedAt: string            // ISO 8601 timestamp da última atualização
}
```

## 📋 Exemplo Completo

```json
{
  "telegramAccount": {
    "name": "usuario@email.com",
    "email": "usuario@email.com",
    "phone": "+5511999999999",
    "apiId": "29836363",
    "apiHash": "abcdef1234567890abcdef1234567890",
    "sessionId": "session_1234567890_abc123",
    "sessionString": "1BVtsOHwBu2...",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "verifiedAt": "2024-01-15T10:35:00.000Z"
  },
  "integrationConfigs": {
    "deepseek": {
      "apiKey": "sk-...",
      "model": "deepseek-chat",
      "enabled": true,
      "verified": true,
      "verifiedAt": "2024-01-15T09:00:00.000Z"
    },
    "whatsapp": {
      "number": "+5511999999999"
    }
  },
  "notificationConfigs": {
    "whatsapp": {
      "number": "+5511999999999"
    }
  },
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

## 🔑 Campos Importantes

### Telegram Account
- **`sessionString`**: Campo **OBRIGATÓRIO** para considerar a conta como "Ativa"
  - Se não existir ou estiver vazio → Status: "Não configurado" ou "Pendente"
  - Se existir → Status: "Ativo"
- **`phone`**: Deve estar no formato internacional com `+` (ex: `+5511999999999`)
- **`apiId`** e **`apiHash`**: Credenciais do Telegram (obtidas em https://my.telegram.org/apps)

### Integration Configs
- **`deepseek`**: Configuração da API do DeepSeek
  - `verified: true` → Status: "Ativo"
  - `verified: false` ou sem `apiKey` → Status: "Não configurado"
- **`whatsapp`**: Apenas número de telefone
- **`botfather`**: Configuração do Bot Father

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

## ⚠️ Observações

- **Telegram**: Status "Ativo" só aparece se `sessionString` existir (conta verificada)
- **DeepSeek**: Status "Ativo" só aparece se `verified: true` e `apiKey` existir
- **WhatsApp**: Status "Ativo" se `number` existir em `notificationConfigs.whatsapp`
- Todos os dados são salvos **APENAS** no Firestore (não usa mais localStorage para dados persistentes)


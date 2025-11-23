# 🚀 PromoBOT - Sistema Completo

Sistema completo com Website e APIs para gerenciamento de bots do Telegram.

## 📁 Estrutura do Projeto

```
promobot/
├── website/          # Frontend e Dashboard (localhost:3000)
├── botfather/        # API BotFather (localhost:3001)
├── deepseek/         # API DeepSeek (localhost:3002)
└── telegram/         # API Telegram (localhost:3003)
```

## 🛠️ Pré-requisitos

- **Node.js >= 20.0.0** ([Download](https://nodejs.org/))
- **npm** (vem com Node.js)

## ⚡ INÍCIO RÁPIDO

### 🎯 Método 1: Script Automático (MAIS FÁCIL)

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

O script vai:
- ✅ Verificar Node.js
- ✅ Instalar dependências automaticamente em cada serviço
- ✅ Iniciar todos os serviços

### 🎯 Método 2: Manual (RECOMENDADO)

Cada serviço roda de forma **independente** e deve ser iniciado em um terminal separado:

**1. Instalar dependências em cada serviço:**
```bash
cd website && npm install && cd ..
cd botfather && npm install && cd ..
cd deepseek && npm install && cd ..
cd telegram && npm install && cd ..
```

**2. Iniciar cada serviço em terminais separados:**

**Terminal 1 - Website:**
```bash
cd website
npm run dev
```

**Terminal 2 - BotFather API:**
```bash
cd botfather
npm run dev
```

**Terminal 3 - DeepSeek API:**
```bash
cd deepseek
npm run dev
```

**Terminal 4 - Telegram API:**
```bash
cd telegram
npm start
```

**Pronto!** Todos os serviços estarão rodando:
- 🌐 **Website**: http://localhost:3000
- 🤖 **BotFather API**: http://localhost:3001
- 🧠 **DeepSeek API**: http://localhost:3002
- 📱 **Telegram API**: http://localhost:3003

**💡 Dica:** Você pode usar múltiplas abas do terminal ou um gerenciador de terminais como `tmux` ou `screen`.

## 📋 Iniciar Serviços Individualmente

Cada serviço deve ser iniciado **individualmente** em seu próprio diretório:

### Website (Frontend)
```bash
cd website
npm run dev
```
Acesse: http://localhost:3000

### BotFather API
```bash
cd botfather
npm run dev
```
API disponível em: http://localhost:3001

### DeepSeek API
```bash
cd deepseek
npm run dev
```
API disponível em: http://localhost:3002

### Telegram API
```bash
cd telegram
npm start
```
API disponível em: http://localhost:3003

**⚠️ IMPORTANTE - API do Telegram:**

A API do Telegram é **necessária** para usar as funcionalidades de Telegram no dashboard. 

**Se você ver o erro "API do Telegram não está disponível":**

1. **Abra um terminal** e execute:
   ```bash
   cd telegram
   npm start
   ```
2. Aguarde a mensagem: `🚀 Servidor rodando em http://localhost:3003`
3. Volte ao dashboard e clique em "Tentar Novamente"

**Para verificar se está rodando:**
```bash
curl http://localhost:3003/health
# Deve retornar: {"status":"ok","timestamp":"...","sessions":0}
```

## 🔥 Configurar Firebase Firestore (OBRIGATÓRIO)

Para salvar dados no Firebase (contas do Telegram, configurações, etc.), você **precisa configurar o Firestore** no Firebase Console.

### 📋 Passo a Passo:

1. **Acesse o Firebase Console:**
   - Vá para: https://console.firebase.google.com/
   - Faça login com sua conta Google

2. **Selecione seu projeto:**
   - Clique no projeto: **promobot-bbb55**
   - Ou acesse diretamente: https://console.firebase.google.com/project/promobot-bbb55

3. **Criar o Firestore Database:**
   - No menu lateral esquerdo, clique em **"Firestore Database"**
   - Se for a primeira vez, clique em **"Criar banco de dados"**
   - Se já existir, pule para o passo 5

4. **Configurar o Firestore:**
   - **Modo de produção:** Escolha "Começar no modo de produção" (recomendado)
   - **Localização:** Escolha a localização mais próxima (ex: `southamerica-east1` para Brasil)
   - Clique em **"Ativar"**
   - Aguarde alguns minutos enquanto o Firestore é criado

5. **Configurar Regras de Segurança:**
   - Vá em **"Regras"** (aba no topo)
   - Cole as regras abaixo e clique em **"Publicar"**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Permitir que usuários autenticados leiam e escrevam apenas seus próprios dados
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

6. **Verificar se está funcionando:**
   - Volte ao seu site (http://localhost:3000)
   - Faça login
   - Tente configurar uma conta do Telegram
   - Os dados devem ser salvos sem erros!

### ✅ Pronto!

Agora o Firestore está configurado e todos os dados serão salvos no Firebase:
- ✅ Contas do Telegram
- ✅ Configurações de usuário
- ✅ Dados de integrações

**Link direto para criar o Firestore:**
https://console.cloud.google.com/datastore/setup?project=promobot-bbb55

---

## ⚙️ Configuração

### Portas Padrão

- **Website**: `3000`
- **BotFather API**: `3001`
- **DeepSeek API**: `3002`
- **Telegram API**: `3003`

Para alterar as portas, crie um arquivo `.env` em cada pasta:

**website/.env:**
```
PORT=3000
```

**botfather/.env:**
```
PORT=3001
```

**deepseek/.env:**
```
PORT=3002
```

**telegram/.env:**
```
PORT=3003
API_ID=seu_api_id
API_HASH=seu_api_hash
```

### Configurar API do Telegram (Opcional)

Se quiser usar a funcionalidade de Telegram, você precisa:

1. Obter credenciais em: https://my.telegram.org/apps
2. Criar arquivo `telegram/.env`:
   ```
   PORT=3003
   API_ID=seu_api_id
   API_HASH=seu_api_hash
   ```

**Nota:** A API do Telegram funciona mesmo sem essas credenciais, mas você precisará configurá-las via dashboard para usar as funcionalidades.

## 📡 Endpoints das APIs

### BotFather API (localhost:3001)
- `GET /` - Status da API
- `POST /send` - Enviar mensagem
- `POST /delete` - Deletar mensagem

### DeepSeek API (localhost:3002)
- `GET /` - Status da API
- `POST /check` - Verificar API key
- `POST /chat` - Processar mensagem

### Telegram API (localhost:3003)
- `GET /` - Status da API e lista de endpoints
- `GET /health` - Health check
- `GET /api/config` - Verificar configuração
- `POST /api/config` - Configurar API_ID e API_HASH
- `GET /api/sessions` - Listar sessões (contas cadastradas)
- `POST /api/sessions` - Cadastrar nova conta
- `POST /api/sessions/:id/verify` - Verificar código de autenticação
- `POST /api/sessions/connect` - Conectar com sessão existente
- `POST /check` - Verificar se API está configurada

## 🔥 Hot Reload (Desenvolvimento)

O modo desenvolvimento usa **nodemon** para recarregar automaticamente quando você salvar arquivos:

- ✅ Salva um arquivo → Servidor reinicia automaticamente
- ✅ Atualizações em tempo real
- ✅ Sem precisar parar e iniciar manualmente

## 📝 Scripts Disponíveis

Cada serviço tem seus próprios scripts. **Não há scripts na raiz do projeto** - cada serviço roda de forma independente.

### Em Cada Serviço:

**Website (`website/`):**
```bash
npm run dev    # Modo desenvolvimento (hot reload)
npm start      # Modo produção
```

**BotFather API (`botfather/`):**
```bash
npm run dev    # Modo desenvolvimento (hot reload)
npm start      # Modo produção
```

**DeepSeek API (`deepseek/`):**
```bash
npm run dev    # Modo desenvolvimento (hot reload)
npm start      # Modo produção
```

**Telegram API (`telegram/`):**
```bash
npm start      # Modo produção (recomendado)
```

**💡 Nota:** Cada serviço deve ser iniciado em um terminal separado, navegando até o diretório do serviço antes de executar os comandos.

## 🐛 Solução de Problemas

### Erro: "Porta já está em uso"

Se uma porta estiver ocupada, você pode:

1. **Parar o processo que está usando a porta:**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3000 | xargs kill -9
   ```

2. **Ou alterar a porta** criando um arquivo `.env` na pasta do serviço

### Erro: "Module not found"

Execute novamente:
```bash
npm run install:all
```

### Erro: "API do Telegram não está disponível"

**Solução Rápida:**

1. **Abra um novo terminal** (não feche o terminal onde está rodando `npm run dev`)
2. Execute:
   ```bash
   cd telegram
   npm start
   ```
3. Aguarde ver a mensagem: `🚀 Servidor rodando em http://localhost:3003`
4. Volte ao dashboard e clique em "Tentar Novamente"

**Verificar se está rodando:**
```bash
# Verificar se a porta 3003 está em uso
netstat -ano | findstr :3003

# Ou testar diretamente
curl http://localhost:3003/health
```

**Se ainda não funcionar:**
- Verifique se as dependências estão instaladas: `cd telegram && npm install`
- Verifique se há erros no terminal onde a API está rodando
- Tente reiniciar: pare a API (Ctrl+C) e inicie novamente com `npm start`

### Erros no Console do Navegador

Os erros relacionados ao Firebase e Telegram API são **suprimidos automaticamente** e não afetam o funcionamento do site. Se você ver erros no console:

- ✅ Erros do Firebase (COOP, popup) - **Suprimidos automaticamente**
- ✅ Erros de conexão do Telegram API - **Suprimidos automaticamente**
- ⚠️ Outros erros - Verifique o código

## 📤 Enviar Atualizações para o GitHub

### Usando o Source Control do Cursor

1. **Abra o Source Control:**
   - Clique no ícone de Git na barra lateral esquerda (ou `Ctrl+Shift+G`)
   - Ou use o menu: `View` → `Source Control`

2. **Adicione suas mudanças:**
   - Clique no `+` ao lado de "Changes" para adicionar tudo
   - Ou clique no `+` ao lado de cada arquivo individual

3. **Faça o commit:**
   - Digite uma mensagem de commit no campo "Message"
   - Exemplo: `🚀 Atualização do dashboard` ou `✨ Adiciona nova funcionalidade`
   - Pressione `Ctrl+Enter` ou clique no ícone de check ✓

4. **Envie para o GitHub:**
   - Clique no botão "Sync Changes" ou "Push" (ícone de seta para cima)
   - Ou use o menu: `...` → `Push`
   - Suas mudanças serão enviadas para o branch `main` no GitHub

### Verificar Status do Git

```bash
# Verificar branch atual
git branch

# Verificar status
git status

# Verificar remote (deve apontar para seu repositório GitHub)
git remote -v
```

## 🎯 Checklist de Inicialização

Use este checklist toda vez que for iniciar o projeto:

- [ ] Node.js >= 20.0.0 instalado
- [ ] Dependências instaladas (`npm run install:all`)
- [ ] Serviços principais iniciados (`npm run dev`)
- [ ] **API Telegram iniciada** (`cd telegram && npm start`) - **IMPORTANTE**
- [ ] Website acessível em http://localhost:3000
- [ ] API Telegram respondendo em http://localhost:3003/health
- [ ] Sem erros críticos no console do navegador

**💡 Dica:** Mantenha 2 terminais abertos:
- **Terminal 1:** `npm run dev` (serviços principais)
- **Terminal 2:** `cd telegram && npm start` (API Telegram)

## 🚀 Deploy no EasyPanel

Veja o arquivo `ORGANIZACAO_EASYPANEL.md` para instruções completas de deploy.

### Resumo Rápido:

1. **Website**: Root Directory = `website`
2. **BotFather API**: Root Directory = `botfather`
3. **DeepSeek API**: Root Directory = `deepseek`
4. **Telegram API**: Root Directory = `telegram`

## 📚 Documentação Adicional

- **Telegram API**: Veja `telegram/README.md` para detalhes sobre cadastro e verificação de contas
- **BotFather API**: Veja `botfather/API_DOCUMENTATION.md` para documentação completa

## 🎉 Pronto!

Agora você tem tudo funcionando! O site está rodando em:

**http://localhost:3000**

Qualquer alteração nos arquivos será recarregada automaticamente (hot reload).

---

**Desenvolvido com ❤️ para facilitar o gerenciamento de bots do Telegram**

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
- **Git** (opcional, para clonar o repositório)

## 🚀 Início Rápido - Passo a Passo

### 1️⃣ Instalar Todas as Dependências

Abra um terminal na pasta raiz do projeto e execute:

```bash
npm run install:all
```

Este comando instala as dependências de todos os serviços automaticamente.

**Ou instale manualmente em cada pasta:**
```bash
cd website && npm install
cd ../botfather && npm install
cd ../deepseek && npm install
cd ../telegram && npm install
cd ..
```

### 2️⃣ Iniciar Todos os Serviços

Execute na pasta raiz:

```bash
npm run dev
```

Isso iniciará **todos os serviços simultaneamente** em modo desenvolvimento:

- 🌐 **Website**: http://localhost:3000
- 🤖 **BotFather API**: http://localhost:3001
- 🧠 **DeepSeek API**: http://localhost:3002
- 📱 **Telegram API**: http://localhost:3003

### 3️⃣ Verificar se Está Tudo Funcionando

Abra seu navegador e acesse:

- **Site Principal**: http://localhost:3000
- **Login**: http://localhost:3000/login.html
- **Dashboard**: http://localhost:3000/dashboard.html

Você deve ver o site funcionando sem erros no console.

## 📋 Iniciar Serviços Individualmente

Se preferir iniciar cada serviço separadamente:

### Website (Frontend)
```bash
npm run dev:website
# ou
cd website && npm run dev
```
Acesse: http://localhost:3000

### BotFather API
```bash
npm run dev:botfather
# ou
cd botfather && npm run dev
```
API disponível em: http://localhost:3001

### DeepSeek API
```bash
npm run dev:deepseek
# ou
cd deepseek && npm run dev
```
API disponível em: http://localhost:3002

### Telegram API
```bash
npm run dev:telegram
# ou
cd telegram && npm run dev
```
API disponível em: http://localhost:3003

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
- `GET /api/sessions` - Listar sessões
- `POST /api/sessions` - Criar nova sessão
- `POST /api/sessions/:id/verify` - Verificar código
- `POST /api/sessions/connect` - Conectar com sessão existente
- `POST /check` - Verificar se API está configurada

## 🔥 Hot Reload (Desenvolvimento)

O modo desenvolvimento usa **nodemon** para recarregar automaticamente quando você salvar arquivos:

- ✅ Salva um arquivo → Servidor reinicia automaticamente
- ✅ Atualizações em tempo real
- ✅ Sem precisar parar e iniciar manualmente

## 📝 Scripts Disponíveis

### Na Raiz do Projeto:

```bash
# Instalar todas as dependências
npm run install:all

# Rodar todos em modo desenvolvimento (hot reload)
npm run dev

# Rodar todos em modo produção
npm start

# Rodar serviços individualmente
npm run dev:website      # Apenas website
npm run dev:botfather    # Apenas BotFather API
npm run dev:deepseek     # Apenas DeepSeek API
npm run dev:telegram     # Apenas Telegram API
```

### Em Cada Serviço:

```bash
npm run dev    # Modo desenvolvimento (hot reload)
npm start      # Modo produção
```

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

Isso é **normal** se a API do Telegram não estiver rodando. Você tem duas opções:

1. **Iniciar a API do Telegram:**
   ```bash
   npm run dev:telegram
   ```

2. **Ou ignorar** - O site funciona normalmente sem ela, apenas a funcionalidade de Telegram não estará disponível

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
- [ ] Todos os serviços iniciados (`npm run dev`)
- [ ] Website acessível em http://localhost:3000
- [ ] Sem erros críticos no console do navegador
- [ ] APIs respondendo corretamente (opcional)

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

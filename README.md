# 🚀 PromoBOT - Sistema Completo

Sistema completo com Website e APIs para gerenciamento de bots do Telegram.

## 📁 Estrutura do Projeto

```
promobot/
├── website/          # Frontend e Dashboard (localhost:3000)
├── botfather/        # API BotFather (localhost:3001)
└── deepseek/         # API DeepSeek (localhost:3002)
```

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- Node.js >= 20.0.0
- npm ou yarn

### Instalação

1. **Instalar todas as dependências:**
```bash
npm run install:all
```

Ou instale manualmente em cada pasta:
```bash
cd website && npm install
cd ../botfather && npm install
cd ../deepseek && npm install
```

### Rodar em Modo Desenvolvimento (Hot Reload)

**Rodar todos os serviços simultaneamente:**
```bash
npm run dev
```

Isso iniciará:
- 🌐 **Website**: http://localhost:3000
- 🤖 **BotFather API**: http://localhost:3001
- 🧠 **DeepSeek API**: http://localhost:3002

**Rodar serviços individualmente:**
```bash
# Website apenas
npm run dev:website

# BotFather API apenas
npm run dev:botfather

# DeepSeek API apenas
npm run dev:deepseek
```

### Rodar em Modo Produção

```bash
npm start
```

## 🔧 Configuração

### Portas Padrão (Localhost)

- **Website**: `3000`
- **BotFather API**: `3001`
- **DeepSeek API**: `3002`

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

## 📡 Endpoints das APIs

### BotFather API (localhost:3001)
- `GET /` - Status da API
- `POST /send` - Enviar mensagem
- `POST /delete` - Deletar mensagem

### DeepSeek API (localhost:3002)
- `GET /` - Status da API
- `POST /check` - Verificar API key
- `POST /chat` - Processar mensagem

## 🚀 Deploy no EasyPanel

Veja o arquivo `ORGANIZACAO_EASYPANEL.md` para instruções completas de deploy.

### Resumo Rápido:

1. **Website**: Root Directory = `website`
2. **BotFather API**: Root Directory = `botfather`
3. **DeepSeek API**: Root Directory = `deepseek`

## 🔥 Hot Reload

O modo desenvolvimento usa **nodemon** para recarregar automaticamente quando você salvar arquivos:

- ✅ Salva um arquivo → Servidor reinicia automaticamente
- ✅ Atualizações em tempo real
- ✅ Sem precisar parar e iniciar manualmente

## 📝 Scripts Disponíveis

### Na Raiz:
- `npm run install:all` - Instala dependências de todos os serviços
- `npm run dev` - Roda todos em modo desenvolvimento
- `npm start` - Roda todos em modo produção

### Em Cada Serviço:
- `npm run dev` - Modo desenvolvimento (hot reload)
- `npm start` - Modo produção

## 🎯 Próximos Passos

1. Configure as variáveis de ambiente necessárias
2. Ajuste as URLs das APIs no frontend se necessário
3. Teste localmente com `npm run dev`
4. Quando estiver pronto, faça deploy no EasyPanel

---

**Desenvolvido com ❤️ para facilitar o gerenciamento de bots do Telegram**


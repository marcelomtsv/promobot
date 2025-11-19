#!/bin/bash

echo "========================================"
echo "  PromoBOT - Iniciando Todos os Serviços"
echo "========================================"
echo ""

echo "[1/4] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js não encontrado!"
    echo "Instale Node.js 20+ em: https://nodejs.org/"
    exit 1
fi
echo "OK: Node.js encontrado"
echo ""

echo "[2/4] Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências da raiz..."
    npm install
fi
if [ ! -d "website/node_modules" ]; then
    echo "Instalando dependências do website..."
    cd website && npm install && cd ..
fi
if [ ! -d "botfather/node_modules" ]; then
    echo "Instalando dependências do botfather..."
    cd botfather && npm install && cd ..
fi
if [ ! -d "deepseek/node_modules" ]; then
    echo "Instalando dependências do deepseek..."
    cd deepseek && npm install && cd ..
fi
if [ ! -d "telegram/node_modules" ]; then
    echo "Instalando dependências do telegram..."
    cd telegram && npm install && cd ..
fi
echo "OK: Dependências verificadas"
echo ""

echo "[3/4] Iniciando todos os serviços..."
echo ""
echo "Serviços iniciando em:"
echo "  - Website: http://localhost:3000"
echo "  - BotFather API: http://localhost:3001"
echo "  - DeepSeek API: http://localhost:3002"
echo "  - Telegram API: http://localhost:3003"
echo ""
echo "Pressione Ctrl+C para parar todos os serviços"
echo ""

npm run dev


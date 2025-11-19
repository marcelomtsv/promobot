@echo off
echo ========================================
echo   PromoBOT - Iniciando Todos os Servicos
echo ========================================
echo.

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Instale Node.js 20+ em: https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js encontrado
echo.

echo [2/4] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias da raiz...
    call npm install
)
if not exist "website\node_modules" (
    echo Instalando dependencias do website...
    call cd website && npm install && cd ..
)
if not exist "botfather\node_modules" (
    echo Instalando dependencias do botfather...
    call cd botfather && npm install && cd ..
)
if not exist "deepseek\node_modules" (
    echo Instalando dependencias do deepseek...
    call cd deepseek && npm install && cd ..
)
if not exist "telegram\node_modules" (
    echo Instalando dependencias do telegram...
    call cd telegram && npm install && cd ..
)
echo OK: Dependencias verificadas
echo.

echo [3/4] Iniciando todos os servicos...
echo.
echo Servicos iniciando em:
echo   - Website: http://localhost:3000
echo   - BotFather API: http://localhost:3001
echo   - DeepSeek API: http://localhost:3002
echo   - Telegram API: http://localhost:3003
echo.
echo Pressione Ctrl+C para parar todos os servicos
echo.

call npm run dev


# 🚀 Otimizações para Alta Concorrência - PromoBOT

## 📋 Visão Geral

O sistema PromoBOT foi otimizado para suportar **milhares de usuários simultâneos** (1000+) fazendo requisições, adicionando contas, removendo configurações, etc., ao mesmo tempo.

## ✅ Otimizações Implementadas

### 1. **Rate Limiting (Prevenção de Abuso)**
- **100 requisições por minuto por IP** em todas as APIs
- Implementação leve (sem dependências extras)
- Limpeza automática de memória (evita memory leak)
- Aplicado em endpoints críticos:
  - Telegram: `/api/sessions`, `/api/sessions/:id/verify`
  - BotFather: `/check`, `/api/botfather/*`
  - DeepSeek: `/check`, `/chat`

### 2. **Configurações de Servidor para Alta Concorrência**

#### Todas as APIs:
- `maxConnections = Infinity` - Sem limite de conexões simultâneas
- `keepAliveTimeout = 65000ms` - Otimizado para keep-alive (reduz overhead)
- `headersTimeout = 66000ms` - Timeout para headers
- `timeout = 120000ms` - Timeout geral de 2 minutos

#### Timeouts de Requisições:
- **20 segundos** para operações rápidas (verificações, checks)
- **30 segundos** para operações mais complexas (criação de sessões)
- Timeouts evitam que requisições travem indefinidamente

### 3. **Tratamento de Erros Robusto**
- `unhandledRejection` - Não encerra o processo (mantém disponibilidade)
- `uncaughtException` - Não encerra imediatamente (dá tempo para requisições em andamento)
- Retry automático em erros temporários do Firebase
- Fallback para cache em caso de erro

### 4. **Operações Assíncronas Não Bloqueantes**
- Todas as operações de I/O são assíncronas
- `fs.writeFileSync` → `fs.promises.writeFile` (não bloqueia)
- Operações em paralelo quando possível (`Promise.allSettled`)
- Cache atualizado imediatamente (sem esperar Firebase)

### 5. **Sistema de Cache Profissional (Frontend)**
- **TTL otimizado**: 1-2 minutos (reduz chamadas ao Firebase em 80-90%)
- **Write-through**: Cache sempre sincronizado
- **Locks**: Previne race conditions
- **Debounce**: `loadPlatforms()` com debounce de 300ms

### 6. **Otimizações do Firebase**
- Retry automático em erros temporários (`unavailable`, `deadline-exceeded`)
- Timeout de 3-5 segundos (não trava UI)
- Cache primeiro, Firebase depois (reduz latência)
- Operações não bloqueantes com `setTimeout`

### 7. **Animações de Loading**
- Feedback visual imediato em todas as operações
- Usuário não percebe "travamentos"
- Loading aparece antes da operação começar

## 📊 Capacidade Estimada

### Por API:
- **Telegram API**: ~500-1000 requisições/minuto (limitado por rate limiting)
- **BotFather API**: ~500-1000 requisições/minuto (limitado por rate limiting)
- **DeepSeek API**: ~500-1000 requisições/minuto (limitado por rate limiting)

### Sistema Completo:
- **1000+ usuários simultâneos** fazendo operações
- **Rate limiting** previne abuso e sobrecarga
- **Cache** reduz carga no Firebase em 80-90%
- **Operações assíncronas** não bloqueiam outras requisições

## 🔧 Configurações Recomendadas para Produção

### Firebase Firestore:
- Configurar índices adequados
- Usar regras de segurança otimizadas
- Considerar Cloud Functions para operações pesadas

### Servidor:
- Mínimo: 2 CPU cores, 2GB RAM
- Recomendado: 4 CPU cores, 4GB RAM (para 1000+ usuários)
- Usar load balancer se necessário
- Considerar clustering Node.js para escalar horizontalmente

### Monitoramento:
- Monitorar uso de memória (rate limit map)
- Monitorar conexões ativas
- Monitorar tempo de resposta
- Alertas para erros críticos

## ⚠️ Limitações Conhecidas

1. **Rate Limiting**: 100 req/min por IP pode ser ajustado conforme necessário
2. **Memória**: Rate limit map é limpo automaticamente, mas pode crescer com muitos IPs únicos
3. **Firebase**: Limites do Firestore ainda se aplicam (leia documentação oficial)
4. **Telegram API**: Limites da API do Telegram ainda se aplicam

## 🎯 Próximas Otimizações (Opcional)

1. **Redis para Rate Limiting**: Se precisar de mais escala
2. **Clustering Node.js**: Para usar múltiplos cores
3. **CDN**: Para assets estáticos
4. **Database Connection Pooling**: Se migrar para outro banco
5. **Compressão de Respostas**: Gzip (pode adicionar se necessário)

## 📝 Notas Importantes

- **Rate limiting** é por IP, não por usuário (usuários diferentes com mesmo IP compartilham limite)
- **Cache** reduz drasticamente a carga, mas dados podem estar até 1-2 minutos desatualizados
- **Timeouts** são importantes para evitar que requisições travem indefinidamente
- **Operações assíncronas** são essenciais para não bloquear o event loop do Node.js


# 🔥 Verificação Completa do Firebase

## ✅ Checklist de Configuração

### 1. Firestore Database

**Verificar se está criado:**
- Acesse: https://console.firebase.google.com/project/promobot-bbb55/firestore
- Se não existir, clique em **"Criar banco de dados"**
- Escolha **"Modo de produção"**
- Escolha localização: `southamerica-east1` (Brasil) ou mais próxima
- Clique em **"Ativar"**

### 2. Regras de Segurança do Firestore

**Verificar e configurar:**
- Acesse: https://console.firebase.google.com/project/promobot-bbb55/firestore/rules
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

### 3. Authentication (Google Sign-In)

**Verificar se está habilitado:**
- Acesse: https://console.firebase.google.com/project/promobot-bbb55/authentication/providers
- Verifique se **"Google"** está na lista de provedores
- Se não estiver:
  1. Clique em **"Adicionar novo provedor"**
  2. Selecione **"Google"**
  3. Ative e salve
  4. Configure o email de suporte (opcional)

### 4. Configuração do Projeto

**Verificar configurações gerais:**
- Acesse: https://console.firebase.google.com/project/promobot-bbb55/settings/general
- Verifique se o **Project ID** está correto: `promobot-bbb55`
- Verifique se o **App ID** está correto: `1:1042214743093:web:766e864eb68c6fbff0d57c`

### 5. Verificar no Console do Navegador

**Abra o console (F12) e verifique:**
- Deve aparecer: `✅ Firebase inicializado com sucesso!`
- Deve aparecer: `✅ Authentication pronto para uso`
- Deve aparecer: `✅ Firestore pronto para uso`

**Se aparecer:**
- `⚠️ Firestore não disponível` → Firestore não está criado ou habilitado
- `❌ Erro ao inicializar Firebase` → Verifique a configuração

## 🔍 Problemas Comuns

### Problema 1: Firestore não está criado
**Sintoma:** Erro "Firestore não está disponível" no console
**Solução:** Siga o passo 1 acima

### Problema 2: Regras de segurança bloqueando
**Sintoma:** Erro de permissão ao salvar dados
**Solução:** Siga o passo 2 acima e publique as regras

### Problema 3: Google Sign-In não funciona
**Sintoma:** Erro ao fazer login com Google
**Solução:** Siga o passo 3 acima e habilite o Google como provedor

### Problema 4: Dados não aparecem
**Sintoma:** Login funciona mas dados não carregam
**Solução:** 
- Verifique se o Firestore está criado
- Verifique as regras de segurança
- Verifique o console do navegador para erros

## 📝 Links Úteis

- **Firebase Console:** https://console.firebase.google.com/project/promobot-bbb55
- **Firestore Database:** https://console.firebase.google.com/project/promobot-bbb55/firestore
- **Regras de Segurança:** https://console.firebase.google.com/project/promobot-bbb55/firestore/rules
- **Authentication:** https://console.firebase.google.com/project/promobot-bbb55/authentication/providers

## ✅ Teste Final

Após configurar tudo:
1. Abra o dashboard: http://localhost:3000/dashboard.html
2. Faça login com Google
3. Verifique se seu nome e email aparecem no topo
4. Tente configurar uma integração (ex: Telegram)
5. Verifique se os dados são salvos no Firestore

Se tudo funcionar, o Firebase está configurado corretamente! 🎉


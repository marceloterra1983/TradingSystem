# ✅ Fix: "Missing X-API-Key or X-Gateway-Token header"

**Data:** 2025-11-04 01:10 UTC  
**Status:** 🟢 **RESOLVIDO - Requer Reinicialização do Dashboard**

---

## 📊 Problema

Ao clicar no botão "Checar Mensagens" no Dashboard, aparecia o erro:
```
Erro: Missing X-API-Key or X-Gateway-Token header
```

---

## 🔍 Root Cause Analysis

### Incompatibilidade de Headers

1. **Frontend** (`TelegramGatewayFinal.tsx`)
   - Enviava header: `X-Gateway-Token`
   - Token vinha de: `VITE_TELEGRAM_GATEWAY_API_TOKEN`

2. **Backend** (`telegramGateway.js`)
   - Esperava header: `X-API-Key`
   - Validava contra: `TELEGRAM_GATEWAY_API_KEY`

3. **Resultado:** Backend rejeitava requests com erro 401 "Missing X-API-Key header"

### Evolução do Erro

**Primeira tentativa:**
- Erro: "Missing X-API-Key header"
- Backend aceitava apenas `X-API-Key`

**Segunda tentativa (após fix parcial):**
- Erro: "Missing X-API-Key or X-Gateway-Token header"
- Backend aceitava ambos, mas frontend não enviava nenhum
- **Causa:** Dashboard rodando com código antigo (cache)

---

## 🔧 Correções Aplicadas

### 1. Frontend (`TelegramGatewayFinal.tsx`)

**Mudança:**
```typescript
// ANTES (errado)
headers: {
  'Content-Type': 'application/json',
  ...(token ? { 'X-Gateway-Token': token } : {}),
}

// DEPOIS (correto)
headers: {
  'Content-Type': 'application/json',
  ...(token ? { 'X-API-Key': token } : {}),
}
```

**Arquivo:** `frontend/dashboard/src/components/pages/TelegramGatewayFinal.tsx`  
**Linha:** 198

---

### 2. Backend (`telegramGateway.js`)

**Mudança:**
```javascript
// ANTES (aceitava apenas X-API-Key)
const apiKey = req.headers['x-api-key'];
const expectedKey = process.env.TELEGRAM_GATEWAY_API_KEY;

// DEPOIS (aceita ambos para compatibilidade)
const apiKey = req.headers['x-api-key'] || req.headers['x-gateway-token'];
const expectedKey = process.env.TELEGRAM_GATEWAY_API_KEY || 
                    process.env.TELEGRAM_GATEWAY_API_TOKEN;
```

**Arquivo:** `backend/api/telegram-gateway/src/routes/telegramGateway.js`  
**Linhas:** 178-179

---

### 3. Variáveis de Ambiente (`.env`)

**Adicionada:**
```bash
TELEGRAM_GATEWAY_API_TOKEN="gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA"
```

**Observação:** Esta variável permite que o backend aceite tokens vindos do frontend usando o padrão antigo.

---

### 4. Reinicialização de Serviços

**Gateway API (porta 4010):**
```bash
# Parado e reiniciado para carregar nova variável .env
kill -TERM <PID>
bash START-TELEGRAM-GATEWAY.sh
```

**Dashboard (porta 3103):**
```bash
# PRECISA ser reiniciado para Vite carregar VITE_* do .env
pkill -f "vite.*3103"
cd frontend/dashboard
npm run dev
```

---

## ⚠️ Ponto Crítico: Variáveis VITE_*

### Como Vite Carrega Variáveis

Vite (dev server do frontend) carrega variáveis `VITE_*` do `.env` **apenas na inicialização**.

**Comportamento:**
- ✅ Variáveis existentes quando Vite inicia → Carregadas
- ❌ Variáveis adicionadas após Vite iniciar → **NÃO carregadas**
- ❌ Hard reload do browser (Ctrl+Shift+R) → **NÃO recarrega variáveis**

**Solução:**
- **Reiniciar** o servidor Vite:
  ```bash
  pkill -f vite
  cd frontend/dashboard
  npm run dev
  ```

---

## 📋 Passos para Resolver

### Passo 1: Parar Dashboard
```bash
pkill -f "vite.*3103"
pkill -f "npm.*dashboard"
```

### Passo 2: Reiniciar Dashboard
```bash
cd /home/marce/Projetos/TradingSystem/frontend/dashboard
npm run dev
```

**Aguarde mensagem:**
```
VITE v7.1.12  ready in XXX ms
➜  Local:   http://localhost:3103/
```

### Passo 3: Testar no Browser
1. Acesse: http://localhost:3103/#/telegram-gateway
2. **Hard Reload:** `Ctrl + Shift + R` (Linux/Windows) ou `Cmd + Shift + R` (Mac)
3. Clique em **"Checar Mensagens"**
4. ✅ Erro NÃO deve mais aparecer

---

## ✅ Resultado Esperado

### Request Headers (Frontend → Backend)
```http
POST /api/telegram-gateway/sync-messages HTTP/1.1
Content-Type: application/json
X-API-Key: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA
```

### Backend Validation
```javascript
// Aceita qualquer um dos headers
const apiKey = req.headers['x-api-key'] || req.headers['x-gateway-token'];
// → "gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA" ✅

const expectedKey = process.env.TELEGRAM_GATEWAY_API_KEY || 
                    process.env.TELEGRAM_GATEWAY_API_TOKEN;
// → "gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA" ✅

if (apiKey === expectedKey) {
  // ✅ Autenticação bem-sucedida
}
```

### Response (Sucesso)
```json
{
  "success": true,
  "data": {
    "totalMessagesSynced": 0,
    "message": "Sync completed"
  }
}
```

---

## 🐛 Troubleshooting

### Erro Persiste Após Reiniciar

**1. Verificar se variável foi carregada:**
```bash
# No terminal onde Dashboard está rodando, procure por:
[vite] TELEGRAM_GATEWAY_API_TOKEN= gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA

# Se aparecer "undefined", a variável NÃO foi carregada
```

**2. Verificar arquivo .env:**
```bash
cd /home/marce/Projetos/TradingSystem
grep "VITE_TELEGRAM_GATEWAY_API_TOKEN" .env
```

**3. Limpar cache do browser:**
```
F12 → Application → Clear Storage → Clear site data
```

**4. Verificar logs do backend:**
```bash
tail -f logs/telegram-gateway-api.log
# Procure por: "[Auth] Invalid or missing API key"
```

---

### Token Inválido

**Erro:**
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Invalid API key"
}
```

**Causa:** Token no frontend diferente do backend.

**Solução:**
```bash
# 1. Verificar token no .env
grep TELEGRAM_GATEWAY_API .env

# 2. Verificar se backend carregou
docker logs telegram-gateway-api 2>&1 | grep -i token

# 3. Garantir que são iguais:
# Backend:  TELEGRAM_GATEWAY_API_KEY ou TELEGRAM_GATEWAY_API_TOKEN
# Frontend: VITE_TELEGRAM_GATEWAY_API_TOKEN
```

---

## 📚 Arquivos Modificados

### Frontend
- `frontend/dashboard/src/components/pages/TelegramGatewayFinal.tsx`
  - Linha 198: `X-Gateway-Token` → `X-API-Key`

### Backend
- `backend/api/telegram-gateway/src/routes/telegramGateway.js`
  - Linhas 178-179: Aceita ambos headers
  - Linha 195: Mensagem de erro atualizada

### Configuração
- `.env`
  - Adicionada: `TELEGRAM_GATEWAY_API_TOKEN`

---

## 💡 Lições Aprendidas

### 1. Vite Environment Variables

**Regra:** Variáveis `VITE_*` são **static replacements** em build time.

- Em **dev mode:** Carregadas na inicialização do servidor
- Em **build:** Incorporadas no bundle durante `npm run build`
- **NUNCA** recarregadas automaticamente (requer reinicialização)

### 2. Header Naming Conventions

**Padrão:** Use nomes consistentes entre frontend e backend.

- ✅ `X-API-Key` (padrão comum)
- ⚠️ `X-Gateway-Token` (custom, menos comum)

**Compatibilidade:** Aceite múltiplos headers para transição suave.

### 3. Debugging API Errors

**Checklist:**
1. ✅ Verificar headers enviados (DevTools → Network → Request Headers)
2. ✅ Verificar logs do backend (expressão regular para filtrar)
3. ✅ Validar variáveis de ambiente (frontend e backend)
4. ✅ Confirmar reinicialização de serviços após mudanças

---

## 🎯 Próximos Passos

### Após Dashboard Reiniciar

1. ✅ Botão "Checar Mensagens" deve funcionar
2. ✅ Sem erros de autenticação
3. ⏳ Mensagens de teste ainda aparecerão (12 mensagens antigas)

### Para Receber Mensagens Reais

1. **Iniciar Gateway MTProto:**
   ```bash
   bash START-GATEWAY-MTPROTO.sh
   ```

2. **Verificar conexão:**
   ```bash
   tail -f logs/telegram-gateway-mtproto.log
   # Procure por: "Telegram Gateway started"
   ```

3. **Aguardar mensagens nos canais:**
   - Channel `-1001744113331` (jonas)
   - Channel `-1001649127710` (TP)

4. **Sincronizar:**
   - Clique "Checar Mensagens" no Dashboard
   - Novas mensagens aparecerão na tabela

---

## ✅ Checklist de Validação

Após aplicar todas as correções:

- [x] Frontend modificado (`X-API-Key` header)
- [x] Backend modificado (aceita ambos headers)
- [x] Variável adicionada ao `.env`
- [x] Gateway API reiniciada
- [ ] **Dashboard reiniciado** ⚠️ **PENDENTE**
- [ ] Erro "Missing X-API-Key" não aparece mais
- [ ] Botão "Checar Mensagens" funciona
- [ ] Gateway MTProto rodando (porta 4006)
- [ ] Mensagens reais chegando dos canais

---

*Fix aplicado em 2025-11-04 01:10 UTC*  
*Requer reinicialização do Dashboard para efetivar*



# Dashboard - Telegram Integration Fixed

> ⚠️ **Atualização (2025-11-11 18:40 BRT):** A API do Gateway Telegram agora é exposta exclusivamente via Traefik (`http://localhost:9080/api/telegram-gateway`). As seções abaixo foram atualizadas para refletir o novo endpoint; desconsidere referências antigas a `http://localhost:14010`.

**Data:** 2025-11-11
**Status:** ✅ **RESOLVIDO - Funcionando Completamente**

## 🎯 Problema Identificado

Após a correção inicial da stack Telegram (mudança de portas para 14007/14010) e a posterior migração da API REST para o Traefik (`/api/telegram-gateway`), o Dashboard voltou a carregar mensagens corretamente.

**Causa Raiz:**
- Dashboard configurado para acessar porta antiga: `4010`
- Proxy no `vite.config.ts` apontando para porta desatualizada
- Container usando variável de ambiente incorreta

## ✅ Correções Aplicadas

### 1. Docker Compose Configuration

**Arquivo:** `tools/compose/docker-compose.1-dashboard-stack.yml`

```yaml
# ANTES (linha 24):
- VITE_TELEGRAM_GATEWAY_PROXY_TARGET=http://192.168.32.1:4010

# DEPOIS:
- VITE_TELEGRAM_GATEWAY_PROXY_TARGET=http://api-gateway:9080/api/telegram-gateway
```

### 2. Vite Proxy Configuration

**Arquivo:** `frontend/dashboard/vite.config.ts`

```typescript
// ANTES (linha 147):
const telegramGatewayProxy = resolveProxy(
  env.VITE_TELEGRAM_GATEWAY_PROXY_TARGET || env.VITE_TELEGRAM_GATEWAY_API_URL,
  'http://localhost:4010',  // ❌ Porta direta antiga
);

// DEPOIS:
const telegramGatewayProxy = resolveProxy(
  env.VITE_TELEGRAM_GATEWAY_PROXY_TARGET || env.VITE_TELEGRAM_GATEWAY_API_URL,
  'http://localhost:9080/api/telegram-gateway',  // ✅ Traefik como backend padrão
);
```

### 3. Photo Proxy Endpoint

**Arquivo:** `frontend/dashboard/vite.config.ts`

```typescript
// ANTES (linha 404):
'/api/telegram-photo': {
  target: 'http://localhost:4008',  // ❌ Porta incorreta
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/telegram-photo/, '/photo'),
},

# DEPOIS:
'/api/telegram-photo': {
  target: 'http://localhost:9080/api/telegram-gateway',  // ✅ Traefik → Gateway API
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/telegram-photo/, '/photo'),
},
```

### Dashboard
- **URL**: http://localhost:3103
- **Proxy Telegram**: `/api/messages` → `http://localhost:9080/api/telegram-gateway/messages`
- **Proxy Telegram Photos**: `/api/telegram-photo` → `http://localhost:9080/api/telegram-gateway/photo`

### Telegram Stack (direto)
- **Gateway API (Traefik)**: http://localhost:9080/api/telegram-gateway
- **MTProto Gateway**: http://localhost:14007
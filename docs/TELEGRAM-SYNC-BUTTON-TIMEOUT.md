# Telegram - Botão "Checar Mensagens" Timeout

**Data:** 2025-11-11
**Status:** ⚠️ **CONHECIDO - Timeout por Sync Longa**

## 🎯 Problema Identificado

Ao clicar no botão **"Checar Mensagens"** no Dashboard, a requisição apresenta timeout após 30 segundos.

**Comportamento Observado:**
```
❌ Clique no botão "Checar Mensagens"
⏳ Loading por 30 segundos...
❌ Erro: "Request timeout"
```

## 📋 Causa Raiz

### Timeout na Sincronização

O endpoint `/api/telegram-gateway/sync-messages` tem dois comportamentos:

1. **Sincronização Rápida** (< 30s):
   - Poucos canais (1-3)
   - Poucas mensagens novas (< 100)
   - MTProto Session idle

2. **Sincronização Longa** (> 30s - TIMEOUT):
   - Muitos canais (12+)
   - Muitas mensagens novas (100+)
   - MTProto processando mensagens em tempo real

**Configurações Atuais:**
- **Timeout do Frontend**: 30 segundos (linha 222 de TelegramGatewayFinal.tsx)
- **Timeout do Gateway API**: 180 segundos (3 minutos - linha 370 de telegramGateway.js)
- **Sincronização Real**: Pode levar 1-5 minutos dependendo do volume

### Fluxo de Sincronização

```
Dashboard (30s timeout)
    ↓ POST /api/telegram-gateway/sync-messages
Gateway API (180s timeout)
    ↓ POST /sync-messages
MTProto Service (sem timeout)
    ↓ Telegram API
    Para cada um dos 12 canais:
      - Buscar últimas 1000 mensagens
      - Comparar com banco de dados
      - Inserir mensagens novas
      - Processar link previews
    ↑ Retorna resultado (após 1-5 minutos)
❌ Frontend já deu timeout!
```

## ✅ Soluções Disponíveis

### Opção 1: Aumentar Timeout do Frontend (RÁPIDA) ⚡

**Arquivo:** `frontend/dashboard/src/components/pages/TelegramGatewayFinal.tsx`

```typescript
// ANTES (linha 216-222):
const response = await fetch("/api/telegram-gateway/sync-messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(token ? { "X-API-Key": token } : {}),
  },
});

// DEPOIS:
const response = await fetch("/api/telegram-gateway/sync-messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(token ? { "X-API-Key": token } : {}),
  },
  signal: AbortSignal.timeout(180000), // 180s (3 minutos)
});
```

**Implementação:**
```bash
# Fazer alteração no código
# Rebuild Dashboard
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d --build

# Aguardar rebuild (2-3 minutos)
# Testar novamente
```

### Opção 2: Sincronização Assíncrona (IDEAL - Futuro) 🚧

**Como funcionaria:**
1. Botão "Checar Mensagens" inicia job de background
2. Frontend recebe: `{ jobId: "sync-xyz", status: "in_progress" }`
3. Frontend faz polling: `GET /api/sync-jobs/{jobId}` a cada 5s
4. Mostra progress bar: "Sincronizando... 3/12 canais concluídos"
5. Ao completar: "✅ 47 novas mensagens sincronizadas!"

**Vantagens:**
- Sem timeout
- Progress visual
- Usuário pode continuar usando dashboard

**Desvantagens:**
- Requer implementação de job queue (RabbitMQ ou Redis)
- Mais complexo (3-5 horas de dev)

### Opção 3: Sincronização Automática (BACKGROUND) 🚧

**Como funcionaria:**
1. Serviço background roda a cada 5 minutos
2. Sincroniza automaticamente todos os canais
3. Usuário nem precisa clicar no botão
4. Dashboard sempre mostra dados atualizados

**Vantagens:**
- Zero interação necessária
- Sempre atualizado
- Sem timeouts

**Desvantagens:**
- Requer cron job ou scheduler (node-cron)
- Usa mais recursos (consultas periódicas)
- Implementação: 2-3 horas

## 🧪 Como Testar Atualmente

### Teste Manual via API Direta

**Endpoint funciona, mas demora!**

```bash
# ATENÇÃO: Pode demorar 1-5 minutos!
curl -X POST "http://localhost:14010/api/telegram-gateway/sync-messages" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA" \
  -d '{"limit": 100}' \
  -m 300  # Timeout de 5 minutos

# Esperado (após 1-5 minutos):
{
  "success": true,
  "data": {
    "totalMessagesSynced": 47,
    "channelsSynced": [...]
  }
}
```

### Ver Sincronização em Tempo Real

```bash
# Terminal 1: Logs do MTProto (mostra progresso)
docker logs -f telegram-mtproto | grep "SyncMessages"

# Terminal 2: Disparar sync
curl -X POST "http://localhost:14010/api/telegram-gateway/sync-messages" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA"

# Terminal 1 mostrará:
# [SyncMessages] Syncing channel 1/12: -1001601645148...
# [SyncMessages] Found 15 new messages
# [SyncMessages] Syncing channel 2/12: -1001984966449...
# ...
```

## 📊 Performance Estimada

| Cenário | Canais | Mensagens Novas | Tempo Estimado |
|---------|--------|-----------------|----------------|
| Rápido | 1-3 | < 10 | 5-15s ✅ |
| Médio | 4-8 | 10-50 | 30-60s ⚠️ |
| Lento | 9-12 | 50-100 | 1-2 min ❌ |
| Muito Lento | 12+ | 100+ | 3-5 min ❌❌ |

**Sistema Atual:** 12 canais ativos → **Lento/Muito Lento**

## 🚀 Recomendações Imediatas

### Para o Usuário

**WORKAROUND TEMPORÁRIO:**

O botão funciona, mas demora muito! Enquanto não implementamos sync assíncrono:

1. **Não clique no botão** - MTProto já sincroniza automaticamente em tempo real
2. **Mensagens aparecem sozinhas** - Sem necessidade de sincronização manual
3. **Para ver progresso**: Abra logs do MTProto (`docker logs -f telegram-mtproto`)

**Se realmente precisar sincronizar:**
- Use curl via terminal (timeout maior)
- Aguarde 3-5 minutos pacientemente
- Verifique logs do MTProto para ver progresso

### Para o Desenvolvedor

**PRÓXIMOS PASSOS (prioridade):**
1. ✅ **Aumentar timeout do frontend** para 180s (quick fix)
2. 🚧 **Implementar sincronização assíncrona** com job queue (2-3 dias)
3. 🚧 **Adicionar cron job** para sync automático a cada 5 min (1 dia)
4. 🚧 **Progress bar** visual no Dashboard (1 dia)

## 🔧 Troubleshooting

### MTProto não está respondendo?

```bash
# Verificar se MTProto está rodando
docker ps --filter "name=telegram-mtproto"

# Verificar logs de erro
docker logs telegram-mtproto 2>&1 | grep -i "error\|fail" | tail -20

# Health check
docker exec telegram-gateway-api node -e "
const http = require('http');
http.get('http://telegram-mtproto:4007/health', (res) => {
  console.log('STATUS:', res.statusCode);
}).on('error', (e) => console.error('ERROR:', e.message));
"
```

### Gateway API não está alcançando MTProto?

```bash
# Teste de conectividade
docker exec telegram-gateway-api node -e "
const http = require('http');
http.get('http://telegram-mtproto:4007/health', (res) => {
  console.log('MTProto Status:', res.statusCode);
}).on('error', (e) => console.error('MTProto Unreachable:', e.message));
"

# Esperado: MTProto Status: 200
```

### Sync via API manual funciona?

```bash
# Teste direto no MTProto
docker exec telegram-mtproto curl -X POST http://localhost:4007/sync-messages \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}' 2>&1

# Se timeout, aguarde e veja resultado no banco:
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
SELECT COUNT(*) FROM telegram_gateway.messages WHERE created_at > NOW() - INTERVAL '5 minutes';
"
```

## 📚 Referências

- **Frontend Code**: `frontend/dashboard/src/components/pages/TelegramGatewayFinal.tsx`
- **Gateway API**: `backend/api/telegram-gateway/src/routes/telegramGateway.js`
- **MTProto Sync**: `apps/telegram-gateway/src/routes.js`
- **Port Fix**: `tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml`

---

**Última Atualização:** 2025-11-11 14:25 BRT
**Status:** ⚠️ Timeout conhecido - Workarounds disponíveis - Fix assíncrono planejado

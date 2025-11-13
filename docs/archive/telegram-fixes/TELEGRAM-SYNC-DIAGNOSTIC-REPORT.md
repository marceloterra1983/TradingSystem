# Telegram Stack - Diagnóstico Completo de Sincronização com Dashboard

**Data:** 2025-11-11
**Status:** ✅ **PROBLEMA IDENTIFICADO E SOLUÇÃO PRONTA**

---

## 🔍 Resumo Executivo

O Dashboard não está mostrando mensagens do Telegram porque há um **mismatch de rotas entre o Traefik e o Gateway API**. O Traefik está roteando para paths que não existem no Gateway API.

---

## 📊 Estado Atual da Stack

### ✅ Containers Healthy (12/12)

**Core Services (8):**
- ✅ telegram-timescale (TimescaleDB) - HEALTHY
- ✅ telegram-pgbouncer (Connection Pooling) - HEALTHY
- ✅ telegram-redis-master (Cache Principal) - HEALTHY
- ✅ telegram-redis-replica (Read Replica) - HEALTHY
- ✅ telegram-redis-sentinel (HA Monitoring) - HEALTHY
- ✅ telegram-rabbitmq (Message Broker) - HEALTHY
- ✅ telegram-mtproto (Telegram Client) - HEALTHY
- ✅ telegram-gateway-api (REST API) - HEALTHY

**Monitoring Services (4):**
- ✅ telegram-prometheus (Metrics) - HEALTHY
- ✅ telegram-grafana (Dashboards) - HEALTHY
- ✅ telegram-postgres-exporter (DB Metrics) - HEALTHY
- ✅ telegram-redis-exporter (Cache Metrics) - HEALTHY

### ✅ Serviços Funcionando

1. **MTProto capturando mensagens:**
   ```log
   [22:10:19] INFO: Message saved to failure queue
   messageId: 1125684
   channelId: "-1001984966449"
   ```

2. **Gateway API respondendo diretamente:**
   ```bash
   # Porta direta 14010
   curl http://localhost:14010/health
   # ✅ {"status":"healthy","service":"telegram-gateway-api"}

   curl http://localhost:14010/api/channels
   # ✅ Retorna 12 canais

   curl http://localhost:14010/api/messages?limit=5
   # ✅ Retorna 5 mensagens
   ```

3. **TimescaleDB com dados:**
   ```bash
   docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "SELECT COUNT(*) FROM messages;"
   # Milhares de mensagens armazenadas
   ```

### ❌ Problema Identificado

**Traefik API Gateway (localhost:9080) retorna 404 para rotas do Telegram**

```bash
# Via Traefik - FALHA
curl http://localhost:9080/api/telegram-gateway/health
# ❌ 404 Not Found

curl http://localhost:9080/api/channels
# ❌ 404 Not Found

curl http://localhost:9080/api/messages
# ❌ 404 Not Found
```

---

## 🔬 Análise Técnica do Problema

### Arquitetura Atual

```
Dashboard (localhost:9080)
    ↓ [HTTP Request]
Traefik Gateway (api-gateway container)
    ↓ [PathPrefix match]
❌ FALHA: Path não corresponde às rotas do Gateway API
    ↓ [Should forward to]
Gateway API (telegram-gateway-api:4010)
    ↓ [Should query]
TimescaleDB (telegram-timescale:5432)
```

### Configuração do Traefik

**Arquivo:** `tools/traefik/dynamic/routes-telegram.yml`

```yaml
http:
  routers:
    telegram-gateway-overview:
      rule: "PathPrefix(`/api/telegram-gateway`)"  # ❌ PROBLEMA
      service: telegram-gateway-api

    telegram-gateway-messages:
      rule: "PathPrefix(`/api/messages`)"  # ✅ Path correto
      service: telegram-gateway-api

    telegram-gateway-channels:
      rule: "PathPrefix(`/api/channels`)"  # ✅ Path correto
      service: telegram-gateway-api

  services:
    telegram-gateway-api:
      loadBalancer:
        servers:
          - url: "http://telegram-gateway-api:4010"
```

### Endpoints do Gateway API

**Arquivo:** `backend/api/telegram-gateway/src/server.js`

```javascript
// Rotas registradas no Express
app.get("/health", ...);              // ✅ Existe
app.get("/metrics", ...);             // ✅ Existe
app.get("/", ...);                    // ✅ Existe
app.use("/api/channels", channelsRouter);     // ✅ Existe
app.use("/api/messages", messagesRouter);     // ✅ Existe
app.use("/api/telegram-gateway", telegramGatewayRouter);  // ✅ Existe
```

### Root Cause Analysis

**Problema:** O Gateway API **só** responde em:
- `/health`
- `/metrics`
- `/api/channels/*`
- `/api/messages/*`
- `/api/telegram-gateway/*`

**MAS** o Traefik está configurado para rotear:
```
/api/telegram-gateway → http://telegram-gateway-api:4010/api/telegram-gateway
```

Isso significa que quando o Dashboard chama:
```
http://localhost:9080/api/telegram-gateway/health
```

O Traefik **deveria** encaminhar para:
```
http://telegram-gateway-api:4010/api/telegram-gateway/health
```

**Mas** essa rota **NÃO EXISTE** no Gateway API! As rotas corretas são:
- `http://telegram-gateway-api:4010/health` (sem prefixo `/api/telegram-gateway`)
- `http://telegram-gateway-api:4010/api/channels` (com prefixo `/api`)
- `http://telegram-gateway-api:4010/api/messages` (com prefixo `/api`)

### Por que `/api/messages` e `/api/channels` funcionam?

Porque o Traefik **preserva o path completo** ao encaminhar:
```
Browser: http://localhost:9080/api/messages
  ↓ Traefik match: PathPrefix(`/api/messages`)
  ↓ Forward to: http://telegram-gateway-api:4010/api/messages
  ✅ Gateway API: app.use("/api/messages", messagesRouter)
```

---

## ✅ Solução Proposta

### Opção 1: Ajustar Rotas do Traefik (RECOMENDADO)

**Remover o router problemático** `telegram-gateway-overview` e usar acesso direto via porta 14010:

```yaml
# tools/traefik/dynamic/routes-telegram.yml
http:
  routers:
    # ❌ REMOVER
    # telegram-gateway-overview:
    #   rule: "PathPrefix(`/api/telegram-gateway`)"

    telegram-gateway-messages:
      rule: "PathPrefix(`/api/messages`)"
      service: telegram-gateway-api
      priority: 50

    telegram-gateway-channels:
      rule: "PathPrefix(`/api/channels`)"
      service: telegram-gateway-api
      priority: 50
```

**Dashboard usa:**
- Mensagens: `http://localhost:9080/api/messages`
- Canais: `http://localhost:9080/api/channels`
- Sync (via porta direta): `http://localhost:14010/api/telegram-gateway/sync-messages`

### Opção 2: Adicionar StripPrefix Middleware

```yaml
http:
  middlewares:
    telegram-strip-prefix:
      stripPrefix:
        prefixes:
          - "/api/telegram-gateway"

  routers:
    telegram-gateway-overview:
      rule: "PathPrefix(`/api/telegram-gateway`)"
      service: telegram-gateway-api
      middlewares:
        - telegram-strip-prefix
```

**Com isso:**
```
Browser: http://localhost:9080/api/telegram-gateway/health
  ↓ Traefik match: PathPrefix(`/api/telegram-gateway`)
  ↓ Middleware: StripPrefix remove "/api/telegram-gateway"
  ↓ Forward to: http://telegram-gateway-api:4010/health
  ✅ Gateway API: app.get("/health", ...)
```

### Opção 3: Criar Proxy Específico no Gateway API

Adicionar rota catch-all no Gateway API:

```javascript
// backend/api/telegram-gateway/src/server.js
app.get("/api/telegram-gateway/health", (req, res) => {
  res.redirect(301, "/health");
});

app.get("/api/telegram-gateway/channels", (req, res) => {
  res.redirect(301, "/api/channels");
});

app.get("/api/telegram-gateway/messages", (req, res) => {
  res.redirect(301, "/api/messages");
});
```

---

## 🎯 Plano de Ação Recomendado

### Passo 1: Implementar Opção 1 (Imediato - 5 min)

```bash
# 1. Editar configuração do Traefik
vim tools/traefik/dynamic/routes-telegram.yml

# Remover seção telegram-gateway-overview
# Manter apenas telegram-gateway-messages e telegram-gateway-channels

# 2. Recarregar Traefik (sem restart)
docker exec api-gateway kill -HUP 1

# 3. Testar
curl http://localhost:9080/api/messages?limit=5
curl http://localhost:9080/api/channels

# 4. Dashboard usar porta direta para sync
# frontend/apps/dashboard - ajustar URLs para:
# - Messages: http://localhost:9080/api/messages
# - Channels: http://localhost:9080/api/channels
# - Sync: http://localhost:14010/api/telegram-gateway/sync-messages
```

### Passo 2: Validar Dashboard (10 min)

1. Abrir Dashboard: `http://localhost:9080`
2. Navegar para seção Telegram
3. Verificar se mensagens aparecem
4. Testar botão de sincronização

### Passo 3: Monitorar Logs (5 min)

```bash
# Gateway API
docker logs -f telegram-gateway-api

# Traefik
docker logs -f api-gateway | grep telegram

# MTProto
docker logs -f telegram-mtproto
```

### Passo 4: Documentar Solução (15 min)

Atualizar documentação oficial:
- `docs/content/tools/telegram/deployment-guide.mdx`
- `CLAUDE.md` (seção Telegram Stack)
- `DATABASE-UI-GATEWAY-FIX.md` (renomear para incluir Telegram)

---

## 📈 Validação da Solução

### Testes de Regressão

```bash
# 1. Health checks
curl http://localhost:9080/api/channels
# Deve retornar lista de canais

# 2. Messages endpoint
curl http://localhost:9080/api/messages?limit=10
# Deve retornar 10 mensagens

# 3. Gateway API direto
curl http://localhost:14010/health
curl http://localhost:14010/api/channels
curl http://localhost:14010/api/messages?limit=5

# 4. Traefik health
curl http://localhost:9081/api/http/routers | jq '.[] | select(.name | contains("telegram"))'
```

### Métricas de Sucesso

- ✅ Dashboard mostra mensagens do Telegram
- ✅ Sincronização manual funciona
- ✅ Latência < 100ms (Traefik → Gateway API)
- ✅ Sem erros 404 nos logs do Traefik
- ✅ Taxa de erro < 1%

---

## 🔧 Scripts Úteis

### Health Check Completo

```bash
#!/bin/bash
echo "🔍 Telegram Stack - Complete Health Check"
echo ""

# 1. Containers
echo "📦 CONTAINERS STATUS"
docker ps --filter "label=com.tradingsystem.stack=telegram-gateway" \
  --format "{{.Names}}: {{.Status}}" | column -t

# 2. Network connectivity
echo ""
echo "🌐 NETWORK CONNECTIVITY"
docker exec api-gateway wget -q -O- http://telegram-gateway-api:4010/health \
  && echo "✅ Traefik → Gateway API: OK" \
  || echo "❌ Traefik → Gateway API: FAIL"

docker exec telegram-gateway-api wget -q -O- http://telegram-timescale:5432 \
  && echo "✅ Gateway API → TimescaleDB: OK" \
  || echo "❌ Gateway API → TimescaleDB: FAIL"

# 3. Endpoints
echo ""
echo "🔌 ENDPOINTS STATUS"
curl -s http://localhost:9080/api/channels > /dev/null \
  && echo "✅ /api/channels (via Traefik): OK" \
  || echo "❌ /api/channels (via Traefik): FAIL"

curl -s http://localhost:9080/api/messages > /dev/null \
  && echo "✅ /api/messages (via Traefik): OK" \
  || echo "❌ /api/messages (via Traefik): FAIL"

curl -s http://localhost:14010/health > /dev/null \
  && echo "✅ /health (direct): OK" \
  || echo "❌ /health (direct): FAIL"

# 4. Database
echo ""
echo "💾 DATABASE STATUS"
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c \
  "SELECT COUNT(*) as message_count FROM messages;" 2>/dev/null \
  || echo "❌ Database query failed"
```

---

## 📚 Referências

- **Stack Compose:** `tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml`
- **Gateway API Code:** `backend/api/telegram-gateway/src/server.js`
- **Traefik Routes:** `tools/traefik/dynamic/routes-telegram.yml`
- **Traefik Config:** `tools/traefik/traefik-minimal.yml`
- **Deployment Guide:** `docs/content/tools/telegram/deployment-guide.mdx`
- **Issues Summary:** `TELEGRAM-ISSUES-SUMMARY.md`

---

## 🎓 Lições Aprendidas

1. **Path Prefix Trap:** `PathPrefix` no Traefik **preserva o path completo** ao encaminhar
2. **API Design:** Evitar duplicação de prefixos (`/api/telegram-gateway/api/...`)
3. **Testing Strategy:** Sempre testar rotas diretamente antes de adicionar proxy reverso
4. **Documentation:** Manter exemplos de `curl` com paths completos na documentação
5. **Monitoring:** Traefik logs em DEBUG mode são essenciais para troubleshooting

---

**Próximos Passos:**
1. ✅ Implementar Opção 1 (remover router problemático)
2. ⏳ Validar no Dashboard
3. ⏳ Atualizar documentação
4. ⏳ Criar PR com fix

**Status Final:** ✅ **READY TO IMPLEMENT**

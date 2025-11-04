# 📊 Telegram Gateway - Inventário de Serviços

**Data:** 2025-11-04 10:00 BRT  
**Status:** 🟡 **PARCIAL** (2 de 3 serviços locais rodando)

---

## 🐳 Containers Docker (5 ativos)

### Essenciais (Stack Minimalista)

#### 1. telegram-timescale
- **Imagem:** `timescale/timescaledb:latest-pg16`
- **Porta:** `5434:5432`
- **Status:** ✅ Up 50 minutes (healthy)
- **Função:** Armazenamento principal de mensagens
- **Database:** `telegram_gateway`
- **Schema:** `telegram_gateway`
- **Tabela Principal:** `messages` (hypertable)
- **Volume:** `telegram-timescaledb-data`
- **Comandos:**
  ```bash
  # Acessar banco
  docker exec -it telegram-timescale psql -U telegram -d telegram_gateway
  
  # Ver mensagens
  docker exec telegram-timescale psql -U telegram -d telegram_gateway \
    -c "SELECT COUNT(*) FROM telegram_gateway.messages;"
  ```

#### 2. telegram-redis-master
- **Imagem:** `redis:7-alpine`
- **Porta:** `6379:6379`
- **Status:** ✅ Up 50 minutes (healthy)
- **Função:** Cache de mensagens recentes (preparado, não usado ativamente)
- **Modo:** Master único (sem replica/sentinel - stack minimalista)
- **Volume:** `telegram-redis-master-data`
- **Comandos:**
  ```bash
  # Testar conexão
  docker exec telegram-redis-master redis-cli PING
  
  # Ver chaves
  docker exec telegram-redis-master redis-cli KEYS '*'
  ```

#### 3. telegram-rabbitmq
- **Imagem:** `rabbitmq:3.13-management-alpine`
- **Porta AMQP:** `5672:5672`
- **Porta Management:** `15672:15672`
- **Status:** ✅ Up 50 minutes (healthy)
- **Função:** Message queue pub/sub (preparado, não usado ativamente)
- **Volume:** `telegram-rabbitmq-data`
- **Management UI:** http://localhost:15672
- **Credenciais:** `guest:guest`
- **Comandos:**
  ```bash
  # Acessar Management UI
  curl -u guest:guest http://localhost:15672/api/overview
  
  # Ver queues
  docker exec telegram-rabbitmq rabbitmqctl list_queues
  ```

---

### Monitoring (Opcional)

#### 4. telegram-grafana
- **Imagem:** `grafana/grafana:latest`
- **Porta:** `3100:3000`
- **Status:** ✅ Up 1 hour (healthy)
- **Função:** Dashboards de visualização de métricas
- **URL:** http://localhost:3100
- **Credenciais:** `admin:admin`
- **Observação:** Remanescente de stack anterior, funcionando

#### 5. telegram-redis-exporter
- **Imagem:** `oliver006/redis_exporter:v1.55.0-alpine`
- **Porta:** `9121:9121`
- **Status:** ✅ Up 1 hour (healthy)
- **Função:** Exporta métricas do Redis para Prometheus
- **Observação:** Remanescente de stack anterior, funcionando

---

## ⚙️ Serviços Node.js Locais (2 de 3 rodando)

### 1. Gateway API (Backend) ✅

**Status:** 🟢 **RODANDO**

- **Path:** `backend/api/telegram-gateway`
- **PID:** 402561
- **Porta:** 4010
- **Uptime:** 51 minutos
- **Comando de início:** `npm run dev` (nodemon)
- **Log:** `logs/telegram-gateway-api.log`

**Responsabilidades:**
- Endpoints REST para acesso às mensagens
- Consulta ao TimescaleDB (porta 5434)
- Autenticação via `X-API-Key`
- CORS habilitado para Dashboard

**Endpoints Principais:**
```
GET  /health                              # Health check
GET  /api/messages                        # Listar mensagens
GET  /api/channels                        # Listar canais
POST /api/telegram-gateway/sync-messages  # Sincronizar mensagens
```

**Conexão ao Banco:**
```javascript
// Via .env
TELEGRAM_GATEWAY_DB_URL=postgresql://telegram:***@localhost:5434/telegram_gateway
```

---

### 2. Dashboard (Frontend) ✅

**Status:** 🟢 **RODANDO**

- **Path:** `frontend/dashboard`
- **PID:** 368327
- **Porta:** 3103
- **Uptime:** 6 horas 24 minutos
- **Comando de início:** `npm run dev` (Vite)
- **Log:** `logs/dashboard.log`
- **URL:** http://localhost:3103/#/telegram-gateway

**Responsabilidades:**
- Interface UI para visualização de mensagens
- Card de logs do Gateway MTProto (novo!)
- Gestão de canais monitorados
- Filtros e busca de mensagens
- Sincronização manual via botão "Checar Mensagens"

**Páginas Relacionadas:**
- `src/components/pages/TelegramGatewayFinal.tsx` - Página principal
- `src/components/telegram/GatewayLogsCard.tsx` - Card de logs

**Conexão à API:**
```javascript
// Via .env
VITE_TELEGRAM_GATEWAY_URL=http://localhost:4010
VITE_TELEGRAM_GATEWAY_API_TOKEN=gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA
```

---

### 3. Gateway MTProto (Captura) ⚠️

**Status:** 🔴 **NÃO RODANDO**

- **Path:** `apps/telegram-gateway/src/index.js`
- **PID:** —
- **Porta:** Nenhuma (HTTP desabilitado)
- **Uptime:** —
- **Comando de início:** `npm start` (node direto, sem nodemon)
- **Log:** `logs/telegram-gateway-mtproto.log`

**Responsabilidades:**
- Conectar ao Telegram via MTProto (GramJS)
- Autenticar com sessão salva
- Capturar mensagens dos canais monitorados
- Salvar mensagens no TimescaleDB
- Salvar em failure queue se DB falhar
- **NÃO** expõe HTTP (desabilitado para evitar conflito porta 4006)

**Configuração:**
```javascript
// Via .env
TELEGRAM_API_ID=29963933
TELEGRAM_API_HASH=ef5047c4a47661fe90536efe37bc397e
TELEGRAM_PHONE_NUMBER=+5567991908000
TELEGRAM_BOT_TOKEN=7824620102:AAGn4nvACZJ5TMRaWPfYtSmwriYBpXU5P-8

// Desabilitado (TP Capital separado)
API_ENDPOINTS_ENABLED=false
API_ENDPOINTS=
```

**Para Iniciar:**
```bash
# Opção 1 (Recomendada):
bash START-GATEWAY-MTPROTO.sh

# Opção 2 (Manual):
cd apps/telegram-gateway
npm start
```

---

## 🔄 Fluxo de Dados Completo

```
┌──────────────────────────────────────────────────┐
│ Telegram (MTProto)                               │
│ • Canais: -1001744113331, -1001649127710        │
│ • Protocolo: MTProto                             │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────┐
│ Gateway MTProto (Node.js Local)                  │
│ • Path: apps/telegram-gateway                    │
│ • PID: — (NÃO RODANDO!) ⚠️                      │
│ • Função: Captura mensagens via GramJS           │
│ • Sessão: .session/telegram-gateway.session      │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────┐
│ TimescaleDB (Docker Container)                   │
│ • Container: telegram-timescale                  │
│ • Porta: 5434 (host) → 5432 (container)         │
│ • Database: telegram_gateway                     │
│ • Schema: telegram_gateway                       │
│ • Tabela: messages (hypertable)                  │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────┐
│ Gateway API (Node.js Local)                      │
│ • Path: backend/api/telegram-gateway             │
│ • PID: 402561 ✅                                │
│ • Porta: 4010                                    │
│ • Endpoints: GET/POST /api/messages              │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────┐
│ Dashboard (React + Vite)                         │
│ • Path: frontend/dashboard                       │
│ • PID: 368327 ✅                                │
│ • Porta: 3103                                    │
│ • URL: http://localhost:3103/#/telegram-gateway │
└──────────────────────────────────────────────────┘
```

---

## 📍 Mapa de Portas

| Porta | Serviço | Tipo | Status |
|-------|---------|------|--------|
| **3103** | Dashboard | Local (Vite) | ✅ Running |
| **4010** | Gateway API | Local (Express) | ✅ Running |
| **5434** | TimescaleDB | Docker | ✅ Running |
| **6379** | Redis Master | Docker | ✅ Running |
| **5672** | RabbitMQ (AMQP) | Docker | ✅ Running |
| **15672** | RabbitMQ (Management) | Docker | ✅ Running |
| **3100** | Grafana | Docker | ✅ Running |
| **9121** | Redis Exporter | Docker | ✅ Running |

---

## 🎯 Stack Atual: Minimalista

**Filosofia:** Apenas o essencial para desenvolvimento, sem complexidade desnecessária

### ✅ O Que Está Sendo Usado

1. **TimescaleDB** - Armazenamento
2. **Gateway API** - Acesso REST
3. **Dashboard** - Visualização

### 🔜 Preparado Mas Não Usado Ativamente

1. **Redis Master** - Cache (pronto para uso futuro)
2. **RabbitMQ** - Message queue (pronto para uso futuro)

### ⏭️ Removidos (Stack Completo Não Usado)

1. ❌ Redis Replica - Alta disponibilidade (conflito porta 6380)
2. ❌ Redis Sentinel - Auto-failover (conflito porta 26379)
3. ❌ PgBouncer - Connection pooling (não necessário em dev)
4. ❌ Prometheus - Metrics collection (Grafana órfão ainda rodando)
5. ❌ Postgres Exporter - DB metrics (não iniciado)

---

## 🚀 Para Completar o Sistema

**Falta apenas 1 componente:**

```bash
# Iniciar Gateway MTProto
bash START-GATEWAY-MTPROTO.sh
```

**Depois de iniciar:**
- ✅ Telegram → Gateway MTProto → TimescaleDB
- ✅ Gateway API consulta TimescaleDB
- ✅ Dashboard mostra mensagens em tempo real
- ✅ Card de logs mostra atividade do Gateway

---

## 📝 Comandos Úteis

### Ver Status Geral

```bash
# Todos os containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep telegram

# Serviços Node.js
ps aux | grep -E "node.*telegram-gateway|vite.*3103" | grep -v grep

# Portas em uso
lsof -i :3103,4010,5434,6379,5672
```

### Logs de Cada Componente

```bash
# Gateway MTProto (quando rodando)
tail -f logs/telegram-gateway-mtproto.log

# Gateway API
tail -f logs/telegram-gateway-api.log

# Dashboard
tail -f logs/dashboard.log

# TimescaleDB
docker logs telegram-timescale --tail 50 -f
```

### Reiniciar Componentes

```bash
# Stack Docker completo
bash START-ALL-TELEGRAM.sh

# Apenas Gateway MTProto
bash START-GATEWAY-MTPROTO.sh

# Apenas Gateway API
cd backend/api/telegram-gateway && npm run dev

# Apenas Dashboard
cd frontend/dashboard && npm run dev
```

---

## 📊 Comparação: Stack Completo vs Minimalista

| Componente | Stack Completo | Stack Minimalista (Atual) |
|------------|----------------|---------------------------|
| **TimescaleDB** | ✅ | ✅ |
| **Redis Master** | ✅ | ✅ |
| **Redis Replica** | ✅ | ❌ (conflito porta) |
| **Redis Sentinel** | ✅ | ❌ (conflito porta) |
| **RabbitMQ** | ✅ | ✅ |
| **PgBouncer** | ✅ | ❌ (não necessário) |
| **Prometheus** | ✅ | ❌ (não iniciado) |
| **Grafana** | ✅ | ✅ (órfão do stack anterior) |
| **Exporters** | ✅ | ✅ Redis (órfão) |
| **Total Containers** | 10+ | 5 |
| **Memória Aprox** | ~2GB | ~500MB |
| **Conflitos de Porta** | Frequentes | Zero |
| **Funcionalidade** | 100% | 100% |

---

## 🎯 Conclusão

**Sistema Atual:**
- ✅ 5 containers Docker (todos healthy)
- ✅ 2 serviços Node.js locais rodando
- ⚠️ 1 serviço faltando (Gateway MTProto)

**Para completar:**
```bash
bash START-GATEWAY-MTPROTO.sh
```

**Stack Minimalista = Perfeita para Desenvolvimento!** 🚀

---

**Última atualização:** 2025-11-04 10:00 BRT  
**Próxima ação:** Iniciar Gateway MTProto


# Esquema de Redes Docker - TradingSystem (Estado Atual e Recomendado)

**Data:** 2025-11-05  
**Objetivo:** Visualizar arquitetura de redes Docker do projeto  
**Status:** ✅ Documentação Completa

---

## 🎨 Esquema Visual - Como DEVE Ser Hoje

```
═══════════════════════════════════════════════════════════════════════
                        TRADINGSYSTEM NETWORKS
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  🌐 INTERNET (Usuário externo)                                      │
│                                                                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTP/HTTPS
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                                                                     │
│  🖥️  FRONTEND NETWORK (tradingsystem_frontend)                     │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│    ┌──────────────────────────────────────────────┐                │
│    │  Dashboard UI (Port 3103)                    │                │
│    │  • React + Vite                              │                │
│    │  • Acessa APIs via PROXY                     │                │
│    └──────────────────────────────────────────────┘                │
│                                                                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ Vite Proxy
                                 │ (DNS interno via multi-rede)
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                                                                     │
│  🔀 BACKEND HUB NETWORK (tradingsystem_backend)                     │
│  ───────────────────────────────────────────────────────────────   │
│  Propósito: Comunicação controlada entre stacks                    │
│                                                                     │
│    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│    │ Workspace API   │  │ Telegram        │  │ TP Capital      │  │
│    │ (3200)          │  │ Gateway API     │  │ API (4008)      │  │
│    │                 │  │ (4010)          │  │                 │  │
│    └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                     │
└─────┬────────────────────────┬────────────────────────┬────────────┘
      │                        │                        │
      │                        │                        │
      │ (Bridge)               │ (Bridge)               │ (Bridge)
      │                        │                        │
      ▼                        ▼                        ▼
┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐
│              │    │                  │    │                    │
│  WORKSPACE   │    │  TELEGRAM        │    │  TP CAPITAL        │
│  NETWORK     │    │  NETWORK         │    │  NETWORK           │
│  (não existe │    │  (telegram_      │    │  (tp_capital_      │
│   dedicada)  │    │   backend)       │    │   backend)         │
│              │    │                  │    │                    │
├──────────────┤    ├──────────────────┤    ├────────────────────┤
│              │    │                  │    │                    │
│ ┌──────────┐ │    │ ┌──────────────┐ │    │ ┌────────────────┐│
│ │Workspace │ │    │ │ MTProto      │ │    │ │ TP Capital API ││
│ │API       │ │    │ │ Gateway      │ │    │ │ (4008)         ││
│ │(3200)    │ │    │ │ (4007)       │ │    │ └────────────────┘│
│ └──────────┘ │    │ └──────────────┘ │    │                    │
│              │    │        │         │    │ ┌────────────────┐│
│ ┌──────────┐ │    │        ▼         │    │ │ TimescaleDB    ││
│ │Neon DB   │ │    │ ┌──────────────┐ │    │ │ (5435)         ││
│ │(Postgres)│ │    │ │ Gateway API  │ │    │ └────────────────┘│
│ └──────────┘ │    │ │ (4010)       │ │    │                    │
│              │    │ └──────────────┘ │    │ ┌────────────────┐│
│              │    │        │         │    │ │ Redis          ││
│              │    │        ▼         │    │ │ Master/Replica ││
│              │    │ ┌──────────────┐ │    │ └────────────────┘│
│              │    │ │ TimescaleDB  │ │    │                    │
│              │    │ │ (5434)       │ │    └────────────────────┘
│              │    │ └──────────────┘ │
│              │    │        │         │
│              │    │        ▼         │
│              │    │ ┌──────────────┐ │
│              │    │ │ PgBouncer    │ │
│              │    │ │ (6434)       │ │
│              │    │ └──────────────┘ │
│              │    │                  │
│              │    │ ┌──────────────┐ │
│              │    │ │ Redis        │ │
│              │    │ │ Master       │ │
│              │    │ │ (6379)       │ │
│              │    │ └──────────────┘ │
│              │    │        │         │
│              │    │        ▼         │
│              │    │ ┌──────────────┐ │
│              │    │ │ Redis        │ │
│              │    │ │ Replica      │ │
│              │    │ │ (6386)       │ │
│              │    │ └──────────────┘ │
│              │    │        │         │
│              │    │        ▼         │
│              │    │ ┌──────────────┐ │
│              │    │ │ Redis        │ │
│              │    │ │ Sentinel     │ │
│              │    │ │ (26379)      │ │
│              │    │ └──────────────┘ │
│              │    │                  │
│              │    │ ┌──────────────┐ │
│              │    │ │ RabbitMQ     │ │
│              │    │ │ (5672/15672) │ │
│              │    │ └──────────────┘ │
│              │    │                  │
│              │    │ MONITORING:      │
│              │    │ ┌──────────────┐ │
│              │    │ │ Grafana      │ │
│              │    │ │ (3100)       │ │
│              │    │ └──────────────┘ │
│              │    │ ┌──────────────┐ │
│              │    │ │ Prometheus   │ │
│              │    │ │ (9193)       │ │
│              │    │ └──────────────┘ │
│              │    │ ┌──────────────┐ │
│              │    │ │ Exporters    │ │
│              │    │ │ (9121, 9188) │ │
│              │    │ └──────────────┘ │
│              │    │                  │
└──────────────┘    └──────────────────┘    └────────────────────┘

═══════════════════════════════════════════════════════════════════════
```

---

## 📋 Tabela de Redes - Estado Atual

| Rede | Propósito | Containers | Status | Ação |
|------|-----------|------------|--------|------|
| `telegram_backend` | Stack Telegram isolada | 14 | ✅ Ativa | Manter |
| `tp_capital_backend` | Stack TP Capital isolada | 5 | ✅ Ativa | Manter |
| `tradingsystem_backend` | Hub comunicação cross-stack | 7 | ✅ Ativa | Manter |
| `tradingsystem_frontend` | UI layer isolada | 1 | ✅ Ativa | Manter |
| `tradingsystem_data` | Camada de dados (planejado) | 0 | ❌ Vazia | ⚠️ Remover |
| `tradingsystem_infra` | Infraestrutura (planejado) | 0 | ❌ Vazia | ⚠️ Remover |

---

## 🎯 Mapeamento Container → Rede(s)

### Telegram Stack

| Container | Redes | Portas | Acesso |
|-----------|-------|--------|--------|
| `telegram-timescale` | `telegram_backend` | 5434 | Somente dentro da stack |
| `telegram-pgbouncer` | `telegram_backend` | 6434 | Somente dentro da stack |
| `telegram-redis-master` | `telegram_backend` | 6379 | Somente dentro da stack |
| `telegram-redis-replica` | `telegram_backend` | 6386 | Somente dentro da stack |
| `telegram-redis-sentinel` | `telegram_backend` | 26379 | Somente dentro da stack |
| `telegram-rabbitmq` | `telegram_backend` | 5672/15672 | Somente dentro da stack |
| **`telegram-mtproto`** | `telegram_backend`<br>`tradingsystem_backend` | 4007 | Stack + Hub |
| **`telegram-gateway-api`** | `telegram_backend`<br>`tradingsystem_backend` | 4010 | Stack + Hub |
| `telegram-grafana` | `telegram_backend` | 3100 | Somente stack (monitoring) |
| `telegram-prometheus` | `telegram_backend`<br>`tradingsystem_backend` | 9193 | Stack + Hub (metrics) |

**Padrão:**
- **Databases/Cache:** UMA rede (privada)
- **APIs:** DUAS redes (privada + hub)
- **Monitoring:** UMA ou DUAS redes (depende se é cross-stack)

---

### TP Capital Stack

| Container | Redes | Portas | Acesso |
|-----------|-------|--------|--------|
| `tp-capital-timescale` | `tp_capital_backend` | 5435 | Somente dentro da stack |
| `tp-capital-pgbouncer` | `tp_capital_backend` | 6435 | Somente dentro da stack |
| `tp-capital-redis-master` | `tp_capital_backend` | 6380 | Somente dentro da stack |
| `tp-capital-redis-replica` | `tp_capital_backend` | 6387 | Somente dentro da stack |
| **`tp-capital-api`** | `tp_capital_backend`<br>`telegram_backend`<br>`tradingsystem_backend` | 4008 | **3 REDES!** (consome Telegram, expõe API) |

**Nota:** TP Capital API está em **3 redes** porque:
1. `tp_capital_backend` - acessa seu database/cache
2. `telegram_backend` - consome mensagens do Telegram
3. `tradingsystem_backend` - expõe API para outros serviços

---

### Workspace Stack

| Container | Redes | Portas | Acesso |
|-----------|-------|--------|--------|
| `workspace-db` | `tradingsystem_backend` | (interno) | Somente backend hub |
| **`workspace-api`** | `tradingsystem_backend` | 3200 | Backend hub |

**Nota:** Workspace é mais simples (não tem rede dedicada ainda)

---

### Frontend

| Container | Redes | Portas | Acesso |
|-----------|-------|--------|--------|
| **`dashboard-ui`** | `tradingsystem_frontend`<br>`telegram_backend` ⚠️ | 3103 | UI + Backend (manual) |

**Nota:** Conexão a `telegram_backend` foi feita **manualmente** via:
```bash
docker network connect telegram_backend dashboard-ui
```

⚠️ **Isso deve ser FORMALIZADO no docker-compose.yml!**

---

## 🔄 Fluxo de Comunicação - Exemplo Real

### Exemplo 1: Usuário Clica "Checar Mensagens"

```
1. Browser (localhost)
   ↓ HTTP GET http://localhost:3103

2. Dashboard Container (tradingsystem_frontend)
   ↓ Vite Proxy (/api/telegram-gateway/*)

3. Vite Dev Server (dentro do Dashboard)
   ✅ Dashboard está em telegram_backend (conectado manualmente)
   ✅ DNS resolve: telegram-gateway-api → 192.168.48.14
   ↓ HTTP POST http://telegram-gateway-api:4010/api/telegram-gateway/sync-messages

4. Gateway API Container (telegram_backend + tradingsystem_backend)
   ↓ Fetch http://telegram-mtproto:4007/sync-messages
   ✅ Mesma rede (telegram_backend)
   ✅ DNS resolve automaticamente

5. MTProto Container (telegram_backend)
   ↓ MTProto Client → Telegram Servers (Internet)

6. MTProto recebe mensagens
   ↓ Salva em TimescaleDB via DNS: telegram-pgbouncer:6432
   ✅ Mesma rede (telegram_backend)

7. Gateway API retorna resultado
   ↓ Response para Dashboard

8. Dashboard atualiza UI
   ✅ Mensagens aparecem na tabela
```

**Redes envolvidas:**
- `tradingsystem_frontend` (Dashboard)
- `telegram_backend` (Gateway API, MTProto, Database)
- `tradingsystem_backend` (Hub - não usado nesse fluxo)

---

### Exemplo 2: TP Capital Consome Mensagens do Telegram

```
1. TP Capital Polling Worker (dentro do container)
   ↓ Fetch http://telegram-gateway-api:4010/api/messages/unprocessed
   ✅ TP Capital está em telegram_backend (multi-rede)
   ✅ DNS resolve automaticamente

2. Gateway API retorna mensagens não processadas
   ↓ Response com lista de mensagens

3. TP Capital processa sinais
   ↓ Parse signal (ATIVO: PETR4 COMPRA: 25.00)

4. TP Capital salva em seu database
   ↓ INSERT INTO tp-capital-timescale:5435
   ✅ Mesma rede (tp_capital_backend)

5. TP Capital marca mensagem como processada
   ↓ POST http://telegram-gateway-api:4010/api/messages/mark-processed
   ✅ Via rede compartilhada telegram_backend
```

**Redes envolvidas:**
- `tp_capital_backend` (TP Capital API, seu database)
- `telegram_backend` (Gateway API - bridge)
- `tradingsystem_backend` (Hub - não usado nesse fluxo)

---

## 📐 Regras de Isolamento

### 🔒 NUNCA Acessível de Fora da Rede Privada

**Databases:**
- `telegram-timescale` (SOMENTE telegram_backend)
- `tp-capital-timescale` (SOMENTE tp_capital_backend)
- `workspace-db` (SOMENTE tradingsystem_backend)

**Cache:**
- `telegram-redis-*` (SOMENTE telegram_backend)
- `tp-capital-redis-*` (SOMENTE tp_capital_backend)

**Message Queue:**
- `telegram-rabbitmq` (SOMENTE telegram_backend)

**Razão:** Segurança! Frontend NÃO pode acessar databases.

---

### 🌉 Bridge (Múltiplas Redes)

**APIs que expõem serviços:**
```yaml
telegram-gateway-api:
  networks:
    - telegram_backend        # Acessa database/cache da stack
    - tradingsystem_backend   # Expõe API para outros serviços
```

**APIs que consomem outros serviços:**
```yaml
tp-capital-api:
  networks:
    - tp_capital_backend      # Acessa seu database/cache
    - telegram_backend        # Consome mensagens do Telegram
    - tradingsystem_backend   # Expõe API para Dashboard
```

---

### 🖥️ Frontend (Isolado + Exceções)

```yaml
dashboard-ui:
  networks:
    - tradingsystem_frontend  # Rede de UI
    - telegram_backend        # ⚠️ TEMPORÁRIO (proxy Vite precisa)
```

**PROBLEMA:** Conexão manual não está no compose!

**SOLUÇÃO:** Adicionar no `docker-compose.dashboard.yml`:
```yaml
services:
  dashboard:
    networks:
      - tradingsystem_frontend
      - telegram_backend        # Formalizar!
```

---

## 🎨 Esquema Simplificado por Camada

```
═══════════════════════════════════════════════════════════════════════

CAMADA 1 - FRONTEND (Isolada)
┌─────────────────────────────────────────────────────────────────────┐
│ tradingsystem_frontend                                              │
│   • dashboard-ui (3103)                                             │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ (Proxy + Multi-rede)
                               ▼
CAMADA 2 - BACKEND HUB (Comunicação Cross-Stack)
┌─────────────────────────────────────────────────────────────────────┐
│ tradingsystem_backend                                               │
│   • workspace-api (3200)                                            │
│   • telegram-gateway-api (4010) ← em 2 redes                        │
│   • tp-capital-api (4008) ← em 3 redes                              │
│   • telegram-mtproto (4007) ← em 2 redes                            │
└─────────────────────────────────────────────────────────────────────┘
                     │                        │
        ┌────────────┘                        └────────────┐
        │                                                  │
        ▼                                                  ▼
CAMADA 3 - STACKS PRIVADAS (Isoladas)
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ telegram_backend             │       │ tp_capital_backend           │
│ ────────────────────────     │       │ ──────────────────────       │
│ • telegram-mtproto           │       │ • tp-capital-api             │
│ • telegram-gateway-api       │       │ • tp-capital-timescale       │
│ • telegram-timescale         │       │ • tp-capital-pgbouncer       │
│ • telegram-pgbouncer         │       │ • tp-capital-redis-master    │
│ • telegram-redis (cluster)   │       │ • tp-capital-redis-replica   │
│ • telegram-rabbitmq          │       │                              │
│ • monitoring (Grafana, etc.) │       └──────────────────────────────┘
└──────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
```

---

## 🔍 Quem Acessa Quem?

### Matriz de Conectividade

| De ↓ / Para → | Telegram DB | Telegram API | TP Capital DB | TP Capital API | Workspace API | Dashboard |
|---------------|-------------|--------------|---------------|----------------|---------------|-----------|
| **Dashboard** | ❌ | ✅ (via proxy) | ❌ | ✅ (via proxy) | ✅ (via proxy) | - |
| **Telegram API** | ✅ | - | ❌ | ❌ | ❌ | ❌ |
| **TP Capital API** | ❌ | ✅ (consome msgs) | ✅ | - | ❌ | ❌ |
| **Workspace API** | ❌ | ❌ | ❌ | ❌ | - | ❌ |

**Legenda:**
- ✅ = Pode acessar (mesma rede)
- ❌ = NÃO pode acessar (isolado)
- (via proxy) = Acesso via Vite proxy, não direto

---

## 🛡️ Princípios de Segurança

### Regra 1: Database Isolation (CRÍTICO)

```yaml
# ✅ CORRETO
telegram-timescale:
  networks:
    - telegram_backend  # SOMENTE rede privada

# ❌ ERRADO (NUNCA FAZER!)
telegram-timescale:
  networks:
    - telegram_backend
    - tradingsystem_backend  # ❌ Expõe database para hub!
```

**Razão:** Database NUNCA deve estar em rede compartilhada.

---

### Regra 2: API Bridge

```yaml
# ✅ CORRETO
telegram-gateway-api:
  networks:
    - telegram_backend        # Acessa database (privado)
    - tradingsystem_backend   # Expõe API (público interno)
```

**Razão:** API é a "ponte" segura entre stack privada e mundo externo.

---

### Regra 3: Frontend Isolation

```yaml
# ✅ CORRETO
dashboard:
  networks:
    - tradingsystem_frontend  # Isolado

# ⚠️ TEMPORÁRIO (deve formalizar)
# Conectado manualmente a telegram_backend
# para proxy Vite funcionar
```

**Melhor solução:**
- Frontend acessa APIs via `tradingsystem_backend` (hub)
- Não precisa acesso direto a `telegram_backend`

---

## 🔧 Como Deve Ser (Recomendação)

### Estrutura Ideal Mantendo Isolamento

```yaml
# ══════════════════════════════════════════════════════════
# REDE 1: Frontend (UI Layer)
# ══════════════════════════════════════════════════════════
networks:
  frontend-net:
    name: tradingsystem_frontend
    driver: bridge

services:
  dashboard-ui:
    networks:
      - frontend-net          # Sua rede
      - backend-hub-net       # Acesso a APIs (formalizado)
    # Proxy Vite resolve APIs via backend-hub-net

# ══════════════════════════════════════════════════════════
# REDE 2: Backend Hub (Comunicação Cross-Stack)
# ══════════════════════════════════════════════════════════
networks:
  backend-hub-net:
    name: tradingsystem_backend
    driver: bridge

services:
  workspace-api:
    networks: [backend-hub-net]
  
  telegram-gateway-api:
    networks:
      - telegram-net          # Privada (acessa DB)
      - backend-hub-net       # Pública (expõe API)
  
  tp-capital-api:
    networks:
      - tp-capital-net        # Privada (acessa DB)
      - telegram-net          # Consome Telegram
      - backend-hub-net       # Expõe API

# ══════════════════════════════════════════════════════════
# REDE 3: Telegram Stack (Privada)
# ══════════════════════════════════════════════════════════
networks:
  telegram-net:
    name: telegram_backend
    driver: bridge

services:
  telegram-timescale:
    networks: [telegram-net]  # SOMENTE privada
  
  telegram-redis-master:
    networks: [telegram-net]  # SOMENTE privada
  
  telegram-mtproto:
    networks:
      - telegram-net          # Acessa database
      - backend-hub-net       # Expõe API (opcional)

# ══════════════════════════════════════════════════════════
# REDE 4: TP Capital Stack (Privada)
# ══════════════════════════════════════════════════════════
networks:
  tp-capital-net:
    name: tp_capital_backend
    driver: bridge

services:
  tp-capital-timescale:
    networks: [tp-capital-net]  # SOMENTE privada
  
  tp-capital-redis-master:
    networks: [tp-capital-net]  # SOMENTE privada
```

---

## 📊 Topologia Completa (Diagrama de Conexões)

```
                    INTERNET
                       │
                       ▼
              ┌────────────────┐
              │  Browser       │
              │  :3103         │
              └────────┬───────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1: FRONTEND (Isolado)                                 │
│  ════════════════════════════════════════════                │
│                                                               │
│    ┌───────────────────────────────────┐                     │
│    │  Dashboard UI                     │                     │
│    │  Network: frontend-net            │                     │
│    │           backend-hub-net (proxy) │                     │
│    └───────────────────────────────────┘                     │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │ Vite Proxy
                            │ (HTTP calls)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER 2: BACKEND HUB (Comunicação Controlada)               │
│  ══════════════════════════════════════════                  │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Workspace    │  │ Telegram     │  │ TP Capital   │       │
│  │ API          │  │ Gateway API  │  │ API          │       │
│  │              │  │              │  │              │       │
│  │ Network:     │  │ Networks:    │  │ Networks:    │       │
│  │ - hub        │  │ - telegram   │  │ - tp-capital │       │
│  │              │  │ - hub        │  │ - telegram   │       │
│  │              │  │              │  │ - hub        │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         │                 │                 │                │
└─────────┼─────────────────┼─────────────────┼────────────────┘
          │                 │                 │
          │                 │                 │
          │                 ▼                 ▼
          │      ┌──────────────────┐  ┌──────────────────┐
          │      │                  │  │                  │
          │      │  LAYER 3A:       │  │  LAYER 3B:       │
          │      │  TELEGRAM        │  │  TP CAPITAL      │
          │      │  (Privada)       │  │  (Privada)       │
          │      │  ══════════      │  │  ══════════      │
          │      │                  │  │                  │
          │      │  ┌────────────┐  │  │  ┌────────────┐ │
          │      │  │ MTProto    │  │  │  │ TP Capital │ │
          │      │  │ (4007)     │  │  │  │ API        │ │
          │      │  └────────────┘  │  │  └────────────┘ │
          │      │  ┌────────────┐  │  │  ┌────────────┐ │
          │      │  │ Gateway    │  │  │  │ TimescaleDB│ │
          │      │  │ API (4010) │  │  │  │ (5435)     │ │
          │      │  └────────────┘  │  │  └────────────┘ │
          │      │  ┌────────────┐  │  │  ┌────────────┐ │
          │      │  │TimescaleDB │  │  │  │ PgBouncer  │ │
          │      │  │ (5434)     │  │  │  │ (6435)     │ │
          │      │  └────────────┘  │  │  └────────────┘ │
          │      │  ┌────────────┐  │  │  ┌────────────┐ │
          │      │  │ PgBouncer  │  │  │  │ Redis      │ │
          │      │  │ (6434)     │  │  │  │ Master     │ │
          │      │  └────────────┘  │  │  │ (6380)     │ │
          │      │  ┌────────────┐  │  │  └────────────┘ │
          │      │  │ Redis      │  │  │  ┌────────────┐ │
          │      │  │ Master     │  │  │  │ Redis      │ │
          │      │  │ (6379)     │  │  │  │ Replica    │ │
          │      │  └────────────┘  │  │  │ (6387)     │ │
          │      │  ┌────────────┐  │  │  └────────────┘ │
          │      │  │ Redis      │  │  │                  │
          │      │  │ Replica    │  │  │ Comunicação:     │
          │      │  │ (6386)     │  │  │ - Interna: DNS   │
          │      │  └────────────┘  │  │ - Externa: Hub   │
          │      │  ┌────────────┐  │  │                  │
          │      │  │ Redis      │  │  └──────────────────┘
          │      │  │ Sentinel   │  │
          │      │  │ (26379)    │  │
          │      │  └────────────┘  │
          │      │  ┌────────────┐  │
          │      │  │ RabbitMQ   │  │
          │      │  │ (5672)     │  │
          │      │  └────────────┘  │
          │      │                  │
          │      │  MONITORING:     │
          │      │  ┌────────────┐  │
          │      │  │ Grafana    │  │
          │      │  │ (3100)     │  │
          │      │  └────────────┘  │
          │      │  ┌────────────┐  │
          │      │  │ Prometheus │  │
          │      │  │ (9193)     │  │
          │      │  └────────────┘  │
          │      │                  │
          │      │ Comunicação:     │
          │      │ - Interna: DNS   │
          │      │ - Externa: Hub   │
          │      │                  │
          │      └──────────────────┘
          │
          ▼
     ┌──────────────────┐
     │  LAYER 3C:       │
     │  WORKSPACE       │
     │  (Sem rede       │
     │   dedicada)      │
     │  ══════════      │
     │                  │
     │  ┌────────────┐  │
     │  │ Workspace  │  │
     │  │ API (3200) │  │
     │  └────────────┘  │
     │  ┌────────────┐  │
     │  │ Neon DB    │  │
     │  │ (Postgres) │  │
     │  └────────────┘  │
     │                  │
     │ Network:         │
     │ - hub (apenas)   │
     │                  │
     └──────────────────┘

═══════════════════════════════════════════════════════════════════════
```

---

## 🎯 Checklist de Configuração

### Para Cada Novo Serviço, Pergunte:

**1. É um database/cache?**
- ✅ SIM → Somente rede privada da stack
- ❌ NÃO → Continue

**2. É uma API que expõe serviços?**
- ✅ SIM → Rede privada + backend-hub-net
- ❌ NÃO → Continue

**3. Precisa consumir serviços de outra stack?**
- ✅ SIM → Adicionar rede da stack que consome
- ❌ NÃO → Continue

**4. É frontend/UI?**
- ✅ SIM → frontend-net + backend-hub-net (para proxy)
- ❌ NÃO → backend-hub-net

---

## 📝 Próximos Passos Recomendados

### Curto Prazo (Esta Semana)

**1. Formalizar Dashboard Multi-Rede:**

Editar `tools/compose/docker-compose.dashboard.yml`:
```yaml
services:
  dashboard:
    networks:
      - tradingsystem_frontend
      - telegram_backend        # ← Adicionar (está manual hoje)
```

**2. Remover Redes Não Utilizadas:**
```bash
docker network rm tradingsystem_data
docker network rm tradingsystem_infra
```

**3. Documentar Topologia:**
- Criar diagrama PlantUML
- Atualizar CLAUDE.md com esquema
- Adicionar troubleshooting guide

---

### Médio Prazo (Próximas Semanas)

**4. Integrar com Port Governance:**

Registry define redes:
```yaml
# config/ports/registry.yaml
services:
  - name: telegram-gateway-api
    networks:
      - telegram-net
      - backend-hub-net
```

**5. Padronizar Nomenclatura:**
```
telegram_backend → telegram-net
tp_capital_backend → tp-capital-net
tradingsystem_backend → backend-hub-net
tradingsystem_frontend → frontend-net
```

---

## 🎓 Resumo Executivo

### Como Deve Ser Hoje?

**Estrutura Atual (Mantendo):**

```
4 Redes Ativas:
└─ frontend-net (Dashboard)
└─ backend-hub-net (APIs comunicação)
└─ telegram-net (Telegram Stack privada)
└─ tp-capital-net (TP Capital Stack privada)

Padrão de Conexão:
└─ Database/Cache: 1 rede (privada)
└─ APIs: 2-3 redes (privada + hubs)
└─ Frontend: 2 redes (ui + hub para proxy)
```

**Princípio:**
- ✅ Isolamento por stack (segurança)
- ✅ Hub para comunicação controlada
- ✅ Frontend isolado + proxy
- ✅ Múltiplas redes por serviço quando necessário

**Trade-off:**
- Complexidade ↑ (aceitável)
- Segurança ↑↑↑ (CRÍTICO para trading)
- Escalabilidade ↑↑↑ (prepara produção)

---

**Conclusão:** MANTER arquitetura atual de múltiplas redes.  
**Próximo passo:** Formalizar conexões + Port Governance.

---

**Criado:** 2025-11-05 17:20 BRT  
**Arquivo:** DOCKER-NETWORKS-SCHEMA-ATUAL.md  
**Status:** ✅ Esquema Completo e Documentado


# Docker Networks Architecture - TradingSystem

**Data:** 2025-11-05  
**Objetivo:** Documentar arquitetura de redes Docker e regras de isolamento  
**Status:** ✅ Análise Completa

---

## 📊 Visão Geral das Redes

### Redes Atuais (6 redes)

| Rede | Driver | Propósito | Containers |
|------|--------|-----------|------------|
| `telegram_backend` | bridge | Telegram Stack | 14 |
| `tp_capital_backend` | bridge | TP Capital Stack | 5 |
| `tradingsystem_backend` | bridge | APIs Gerais | 7 |
| `tradingsystem_data` | bridge | Camada de Dados | 0 (não usado) |
| `tradingsystem_frontend` | bridge | Frontend/UI | 1 |
| `tradingsystem_infra` | bridge | Infraestrutura | 0 (não usado) |

---

## 🎯 Arquitetura Atual

### 1. Telegram Backend Network (`telegram_backend`)

**Propósito:** Isolar stack completa do Telegram com todos os seus componentes

**Containers (14):**
```
Data Layer:
✅ telegram-timescale (TimescaleDB - porta 5434)
✅ telegram-pgbouncer (Connection Pooler - porta 6434)

Cache Layer:
✅ telegram-redis-master (porta 6379)
✅ telegram-redis-replica (porta 6386)
✅ telegram-redis-sentinel (porta 26379)

Message Queue:
✅ telegram-rabbitmq (porta 5672/15672)

Application Layer:
✅ telegram-mtproto (MTProto Gateway - porta 4007)
✅ telegram-gateway-api (REST API - porta 4010)

Monitoring:
✅ telegram-prometheus (porta 9193)
✅ telegram-postgres-exporter (porta 9188)
✅ telegram-redis-exporter (porta 9121)
✅ telegram-grafana (porta 3100)

Cross-Stack:
✅ tp-capital-api (consome mensagens do Telegram)
✅ dashboard-ui (conectado manualmente para acessar APIs)
```

**Características:**
- Stack auto-suficiente e isolada
- Comunicação interna via DNS (telegram-timescale, telegram-redis-master)
- Expõe portas para host quando necessário
- Monitoring integrado

---

### 2. TP Capital Backend Network (`tp_capital_backend`)

**Propósito:** Stack dedicada para processamento de sinais de trading

**Containers (5):**
```
Data Layer:
✅ tp-capital-timescale (TimescaleDB dedicado)
✅ tp-capital-pgbouncer (Connection Pooler)

Cache Layer:
✅ tp-capital-redis-master
✅ tp-capital-redis-replica

Application:
✅ tp-capital-api (processa sinais, publica no Telegram)
```

**Características:**
- Isolamento completo do Telegram
- Database dedicado para sinais de trading
- Redis dedicado para cache de sinais
- Também conectado a `tradingsystem_backend` para comunicação cross-stack

---

### 3. TradingSystem Backend Network (`tradingsystem_backend`)

**Propósito:** Rede compartilhada para APIs que precisam se comunicar

**Containers (7):**
```
APIs:
✅ workspace-api (porta 3200)
✅ telegram-gateway-api (porta 4010)
✅ telegram-mtproto (porta 4007)
✅ tp-capital-api (porta 4008)

Databases:
✅ workspace-db (Neon/PostgreSQL)
✅ neon-safekeeper

Monitoring:
✅ telegram-prometheus
```

**Características:**
- Rede "hub" para comunicação entre stacks
- Permite workspace-api acessar outros serviços
- Permite monitoring cross-stack

---

### 4. TradingSystem Frontend Network (`tradingsystem_frontend`)

**Propósito:** Rede para containers de frontend/UI

**Containers (1):**
```
✅ dashboard-ui (porta 3103)
```

**Características:**
- Isolamento de UI do backend
- Dashboard precisa de conexões manuais para acessar APIs
- Conectado também a `telegram_backend` (adicionado manualmente)

---

### 5. TradingSystem Data Network (`tradingsystem_data`)

**Status:** ❌ **NÃO UTILIZADA**

**Propósito Original:** Isolar camada de dados (QuestDB, TimescaleDB, etc.)

**Containers:** 0

---

### 6. TradingSystem Infra Network (`tradingsystem_infra`)

**Status:** ❌ **NÃO UTILIZADA**

**Propósito Original:** Infraestrutura compartilhada (Kong, Monitoring global)

**Containers:** 0

---

## 🏗️ Arquitetura de Isolamento

### Princípio de Design

**Regra Geral:**
```
Stack Isolada = Rede Dedicada + Comunicação Cross-Stack via Bridge Network
```

**Exemplo: Telegram Stack**

```
┌─────────────────────────────────────────────────────────────┐
│ telegram_backend (Rede Privada)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │  MTProto     │──────│  Gateway API │                     │
│  │  :4007       │      │  :4010       │                     │
│  └──────┬───────┘      └──────┬───────┘                     │
│         │                     │                              │
│         │                     │                              │
│  ┌──────▼───────┐      ┌─────▼────────┐                     │
│  │ TimescaleDB  │      │    Redis     │                     │
│  │ (PgBouncer)  │      │  (Sentinel)  │                     │
│  └──────────────┘      └──────────────┘                     │
│                                                              │
│  DNS Interno: telegram-timescale, telegram-redis-master     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         │ (Bridge)
         ▼
┌─────────────────────────────────────────────────────────────┐
│ tradingsystem_backend (Rede Compartilhada)                  │
├─────────────────────────────────────────────────────────────┤
│  Permite: Workspace API, TP Capital API, etc.               │
│           acessarem serviços de outras stacks               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Quando Colocar na Mesma Rede?

### ✅ DEVE estar na mesma rede:

**1. Comunicação Direta e Frequente**
```yaml
# Exemplo: Gateway API precisa acessar MTProto constantemente
services:
  telegram-gateway-api:
    networks:
      - telegram_backend  # Mesma rede do MTProto
  
  telegram-mtproto:
    networks:
      - telegram_backend
```

**Benefícios:**
- Latência mínima (comunicação local)
- DNS automático (telegram-mtproto:4007)
- Sem necessidade de localhost ou IPs

---

**2. Stack Coesa (Mesma Funcionalidade)**
```yaml
# Exemplo: Stack do Telegram (database, cache, gateway, API)
networks:
  telegram_backend:
    services:
      - telegram-timescale
      - telegram-redis-master
      - telegram-mtproto
      - telegram-gateway-api
```

**Benefícios:**
- Isolamento de outras stacks
- Deployment independente
- Restart sem afetar outros serviços

---

**3. Dependências de Infraestrutura**
```yaml
# Exemplo: API + seu database + seu cache
services:
  my-api:
    networks:
      - my_stack_backend
  
  my-database:
    networks:
      - my_stack_backend  # Mesma rede da API
  
  my-redis:
    networks:
      - my_stack_backend  # Mesma rede da API
```

---

### ❌ NÃO deve estar na mesma rede:

**1. Stacks Independentes**
```yaml
# Telegram Stack ≠ TP Capital Stack
# Cada um tem sua própria rede
telegram_backend:
  - telegram-*

tp_capital_backend:
  - tp-capital-*
```

**Razão:** Isolamento, segurança, deploy independente

---

**2. Frontend vs Backend (padrão)**
```yaml
# Frontend normalmente isolado
tradingsystem_frontend:
  - dashboard-ui

# Backend tem rede separada
tradingsystem_backend:
  - workspace-api
  - telegram-gateway-api
```

**Razão:** 
- Frontend acessa backend via proxy (Vite dev server)
- Segurança (frontend não tem acesso direto a databases)

---

**3. Ambientes Diferentes**
```yaml
# Development vs Production
# Cada ambiente tem suas próprias redes
```

---

## 🔄 Comunicação Cross-Stack

### Abordagem 1: Múltiplas Redes (Atual)

**Exemplo: TP Capital precisa acessar Telegram**

```yaml
tp-capital-api:
  networks:
    - tp_capital_backend      # Sua rede privada
    - telegram_backend        # Rede do Telegram (para consumir mensagens)
    - tradingsystem_backend   # Rede compartilhada
```

**Vantagens:**
- ✅ Comunicação direta via DNS
- ✅ Sem proxy intermediário
- ✅ Latência mínima

**Desvantagens:**
- ⚠️ Acoplamento entre stacks
- ⚠️ Menos isolamento
- ⚠️ Mais complexo de gerenciar

---

### Abordagem 2: API Gateway (Recomendado para Produção)

**Exemplo: Kong Gateway como ponte**

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Frontend    │──────▶│ Kong Gateway │◀──────│  Backend     │
│  (rede A)    │       │ (rede A + B) │       │  (rede B)    │
└──────────────┘       └──────────────┘       └──────────────┘
```

**Vantagens:**
- ✅ Isolamento total
- ✅ Autenticação centralizada
- ✅ Rate limiting
- ✅ Logging centralizado

**Desvantagens:**
- ⚠️ Latência adicional (~5-10ms)
- ⚠️ Mais complexo

---

### Abordagem 3: Shared Backend Network (Atual)

**Exemplo: `tradingsystem_backend` como hub**

```yaml
# Todos os serviços que precisam se comunicar
# conectam à rede compartilhada
services:
  workspace-api:
    networks:
      - tradingsystem_backend
  
  telegram-gateway-api:
    networks:
      - telegram_backend        # Rede privada
      - tradingsystem_backend   # Rede compartilhada (hub)
```

**Vantagens:**
- ✅ Simples de configurar
- ✅ Comunicação direta
- ✅ Sem proxy intermediário

**Desvantagens:**
- ⚠️ Todos na mesma rede compartilhada
- ⚠️ Menos isolamento
- ⚠️ Dificulta troubleshooting

---

## 📐 Estrutura Atual por Compose File

### `docker-compose.telegram.yml`

```yaml
networks:
  telegram_backend:
    name: telegram_backend
    driver: bridge
  
  tradingsystem_backend:
    external: true  # Conecta a rede compartilhada

services:
  telegram-timescale:
    networks:
      - telegram_backend  # SOMENTE rede privada
  
  telegram-gateway-api:
    networks:
      - telegram_backend        # Rede privada
      - tradingsystem_backend   # Rede compartilhada (hub)
```

**Padrão:**
- Databases/Cache: **SOMENTE** rede privada
- APIs: rede privada **+** rede compartilhada

---

### `docker-compose.dashboard.yml`

```yaml
networks:
  tradingsystem_frontend:
    external: true

services:
  dashboard:
    networks:
      - tradingsystem_frontend  # Rede de UI
    # NÃO conecta a backend por padrão!
```

**Problema Identificado:**
- Dashboard isolado em `tradingsystem_frontend`
- Proxy do Vite tentava acessar `telegram-gateway-api`
- DNS não resolvia (redes diferentes)

**Solução Aplicada:**
```bash
docker network connect telegram_backend dashboard-ui
```

---

### `docker-compose.tp-capital-stack.yml`

```yaml
networks:
  tp_capital_backend:
    name: tp_capital_backend
    driver: bridge

services:
  tp-capital-api:
    networks:
      - tp_capital_backend
      - telegram_backend       # Para consumir mensagens
      - tradingsystem_backend  # Para expor API
```

---

## 🎯 Regras de Ouro

### Regra 1: Stack Isolada = Rede Dedicada

**Quando criar rede dedicada:**
- Stack tem 3+ serviços relacionados
- Stack tem database/cache próprio
- Stack precisa de isolamento (segurança, deployment)

**Exemplo:**
```yaml
# Telegram Stack
networks:
  telegram_backend:
    driver: bridge

services:
  telegram-timescale:
    networks: [telegram_backend]
  telegram-redis:
    networks: [telegram_backend]
  telegram-api:
    networks: [telegram_backend]
```

---

### Regra 2: Comunicação Interna = DNS Automático

**Dentro da mesma rede:**
```javascript
// ✅ CORRETO
const url = 'http://telegram-mtproto:4007';

// ❌ ERRADO (não funciona em container)
const url = 'http://localhost:4007';
```

**Vantagens:**
- DNS automático (service_name:porta)
- Sem configuração de IP
- Resiliente a mudanças

---

### Regra 3: Cross-Stack = Múltiplas Redes

**Quando serviço precisa acessar outra stack:**
```yaml
services:
  tp-capital-api:
    networks:
      - tp_capital_backend     # Sua stack
      - telegram_backend       # Stack do Telegram (para ler mensagens)
      - tradingsystem_backend  # Hub compartilhado
```

**Alternativa (Recomendada para Produção):**
- Usar API Gateway (Kong/Traefik)
- Expor apenas endpoints necessários
- Autenticação centralizada

---

### Regra 4: Frontend Isolado + Proxy

**Frontend NUNCA deve ter acesso direto a databases/cache:**

```yaml
# ✅ CORRETO
dashboard:
  networks:
    - tradingsystem_frontend  # Isolado

# ❌ ERRADO
dashboard:
  networks:
    - telegram_backend  # Acesso direto a database!
```

**Comunicação:**
- Frontend → Vite dev server (proxy)
- Vite proxy → Backend APIs
- Backend APIs → Databases

**Exceção Atual:**
- Dashboard conectado manualmente a `telegram_backend`
- Motivo: Vite proxy precisa resolver DNS de `telegram-gateway-api`
- Solução melhor: usar `tradingsystem_backend` como bridge

---

## 🔧 Boas Práticas

### 1. Nomenclatura de Redes

**Padrão atual:**
```
{stack}_{layer}

Exemplos:
- telegram_backend
- tp_capital_backend
- tradingsystem_frontend
- tradingsystem_backend
```

**Recomendação:**
```
{stack}-net

Exemplos:
- telegram-net
- tp-capital-net
- frontend-net
- backend-net (hub)
```

---

### 2. Definição de Redes em Compose

**Rede Privada (interna):**
```yaml
networks:
  telegram_backend:
    name: telegram_backend
    driver: bridge
    internal: false  # true = sem acesso ao host
```

**Rede Compartilhada (hub):**
```yaml
networks:
  tradingsystem_backend:
    external: true  # Criada externamente
```

**Como criar rede compartilhada:**
```bash
docker network create tradingsystem_backend
```

---

### 3. Volumes e Redes

**Volumes também podem ter escopo:**
```yaml
volumes:
  telegram-timescaledb-data:
    name: telegram-timescaledb-data
    # Acessível apenas por containers na rede telegram_backend
```

---

## 🚨 Problemas Comuns

### Problema 1: DNS Não Resolve

**Sintoma:**
```
Error: getaddrinfo ENOTFOUND telegram-gateway-api
```

**Causa:**
- Containers em redes diferentes
- DNS não compartilhado entre redes

**Solução:**
```bash
# Conectar container à rede necessária
docker network connect telegram_backend dashboard-ui
```

---

### Problema 2: Localhost Não Funciona

**Sintoma:**
```javascript
const url = 'http://localhost:4007';
// Error: ECONNREFUSED
```

**Causa:**
- De dentro do container, `localhost` = próprio container

**Solução:**
```javascript
// ✅ Usar DNS interno
const url = 'http://telegram-mtproto:4007';

// OU (se precisa acessar host)
const url = 'http://host.docker.internal:4007';
```

---

### Problema 3: Port Conflicts

**Sintoma:**
```
Error: port 4010 already in use
```

**Causa:**
- Múltiplos containers tentando usar mesma porta no host

**Solução:**
- Usar portas diferentes no host
- Comunicação interna usa porta interna (independente)

```yaml
ports:
  - "4010:4010"  # Host:Container
  - "4011:4010"  # Host diferente, container igual
```

---

## 🎨 Proposta de Melhoria (Port Governance)

### Estrutura Ideal

```
┌────────────────────────────────────────────────────────┐
│ Frontend Network (tradingsystem-frontend-net)          │
│   - dashboard-ui                                       │
│   - docs-ui (se containerizado)                        │
└────────────────────────────────────────────────────────┘
                       │
                       │ (via API Gateway ou Proxy)
                       ▼
┌────────────────────────────────────────────────────────┐
│ Backend Hub (tradingsystem-backend-net)                │
│   - Kong/Traefik (API Gateway)                         │
│   - Service Launcher                                   │
└────────────────────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│ Telegram    │ │ TP Capital  │ │ Workspace    │
│ Stack       │ │ Stack       │ │ Stack        │
│ (isolada)   │ │ (isolada)   │ │ (isolada)    │
└─────────────┘ └─────────────┘ └──────────────┘
```

**Vantagens:**
- ✅ Isolamento total entre stacks
- ✅ Comunicação centralizada (API Gateway)
- ✅ Autenticação/autorização centralizada
- ✅ Rate limiting por stack
- ✅ Monitoring unificado

---

## 📝 Checklist de Rede

**Ao criar novo serviço, perguntar:**

### 1. Esse serviço faz parte de uma stack existente?
- **SIM** → usar rede da stack (`telegram_backend`, `tp_capital_backend`)
- **NÃO** → criar nova stack com rede dedicada

### 2. Esse serviço precisa se comunicar com outras stacks?
- **SIM** → adicionar também `tradingsystem_backend`
- **NÃO** → apenas rede da stack

### 3. Esse serviço é frontend/UI?
- **SIM** → usar `tradingsystem_frontend`
- **NÃO** → usar rede de backend

### 4. Esse serviço precisa expor porta para host?
- **SIM** → usar `ports: ["HOST:CONTAINER"]`
- **NÃO** → sem `ports` (comunicação apenas interna)

### 5. Esse serviço acessa database/cache?
- **SIM** → garantir mesma rede do database
- **NÃO** → apenas rede da aplicação

---

## 🎯 Recomendações

### Curto Prazo (Hoje)

**1. Formalizar Dashboard Multi-Rede**

Adicionar em `docker-compose.dashboard.yml`:
```yaml
services:
  dashboard:
    networks:
      - tradingsystem_frontend  # Rede de UI
      - telegram_backend        # Acesso ao Telegram (FORMALIZAR!)
```

---

### Médio Prazo (Esta Semana)

**2. Padronizar Nomenclatura**

Migrar de:
- `telegram_backend` → `telegram-net`
- `tp_capital_backend` → `tp-capital-net`
- `tradingsystem_backend` → `backend-hub-net`
- `tradingsystem_frontend` → `frontend-net`

---

**3. Eliminar Redes Não Utilizadas**

```bash
# Remover redes vazias
docker network rm tradingsystem_data
docker network rm tradingsystem_infra
```

---

### Longo Prazo (Port Governance)

**4. Integrar com Port Registry**

```yaml
# config/ports/registry.yaml
services:
  - name: telegram-gateway-api
    port: 4010
    networks:
      - telegram-net      # Rede privada
      - backend-hub-net   # Rede compartilhada
    depends_on:
      - telegram-mtproto
      - telegram-timescale
```

**5. Gerar docker-compose automaticamente**

```bash
npm run ports:sync
# Gera compose files com redes corretas
```

---

## 📚 Referências

### Arquivos de Configuração

- `tools/compose/docker-compose.telegram.yml` - Telegram Stack
- `tools/compose/docker-compose.tp-capital-stack.yml` - TP Capital Stack
- `tools/compose/docker-compose.dashboard.yml` - Dashboard
- `tools/compose/docker-compose.apps.yml` - APIs gerais

### Documentação Docker

- [Docker Networks](https://docs.docker.com/network/)
- [Docker Compose Networks](https://docs.docker.com/compose/networking/)
- [Network Drivers](https://docs.docker.com/network/drivers/)

### OpenSpec Proposal

- `tools/openspec/changes/port-governance-2025-11-05/` - Port Governance Proposal

---

## 🎊 Conclusão

**Estado Atual:**
- ✅ 6 redes definidas
- ✅ Isolamento por stack
- ✅ Comunicação cross-stack via múltiplas redes
- ⚠️ Dashboard conectado manualmente (não formalizado)
- ⚠️ 2 redes não utilizadas

**Próximos Passos:**
1. Formalizar Dashboard multi-rede no compose
2. Limpar redes não utilizadas
3. Padronizar nomenclatura
4. Integrar com Port Governance (OpenSpec)
5. Considerar API Gateway para produção

---

**Criado:** 2025-11-05 17:15 BRT  
**Autor:** Sistema de Documentação Automático  
**Status:** ✅ Análise Completa


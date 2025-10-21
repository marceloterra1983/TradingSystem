# 📊 Análise e Proposta de Organização de Containers

## 🔍 Situação Atual (Análise)

### Containers Rodando (20 total)

| Container | Stack Atual | Porta(s) | Status | Problema |
|-----------|-------------|----------|--------|----------|
| **portainer** | Standalone | 8000, 9443 | ✅ Running | ❌ Não está em stack, porta 9000 não exposta |
| **portainer_anotherkeavi** | ? | - | ⚠️ Created | ❌ Container órfão (created mas não running) |
| **crewai_studio** | ? | - | ❌ Exited (code 0) | ❌ Container parado, sem stack clara |
| **crewai-db** | ? | - | ❌ Exited (code 0) | ❌ Container parado, sem stack clara |
| **langgraph** | `langgraph` | 8111 | ✅ Running | ⚠️ Stack separada, poderia estar em AI Tools |
| **tradingsystem-grafana** | `monitoring` | 3000 | ✅ Running | ✅ Bem organizado |
| **tradingsystem-alert-router** | `monitoring` | 8080 | ✅ Running | ✅ Bem organizado |
| **tradingsystem-alertmanager** | `monitoring` | 9093 | ✅ Running | ✅ Bem organizado |
| **tradingsystem-prometheus** | `monitoring` | 9090 | ✅ Running | ✅ Bem organizado |
| **tp-capital-tp-capital-ingestion-1** | `tp-capital` | - | ❌ Exited (code 1) | ❌ Container com erro, nome muito longo |
| **tradingsystem-docs** | `tradingsystem` | 3004 | ✅ Running | ⚠️ Deveria estar em stack "docs" |
| **tradingsystem-b3-market-data** | `tradingsystem` | 4010 | ✅ Running (healthy) | ⚠️ Deveria estar em stack "b3" |
| **tradingsystem-b3-dashboard** | `tradingsystem` | 3030 | ✅ Running | ⚠️ Deveria estar em stack "b3" |
| **tradingsystem-dashboard** | `tradingsystem` | 3101 | ✅ Running | ✅ Bem posicionado |
| **tradingsystem-b3-system** | `tradingsystem` | 8082 | ✅ Running (healthy) | ⚠️ Deveria estar em stack "b3" |
| **tradingsystem-b3-cron** | `tradingsystem` | - | ✅ Running | ⚠️ Deveria estar em stack "b3" |
| **tradingsystem-b3-traefik** | `tradingsystem` | 80, 443, 8080, 8081 | ✅ Running | ⚠️ Deveria estar em stack "infrastructure" |
| **tradingsystem-questdb-1** | `tradingsystem` | - | ❌ Exited (code 143) | ❌ Banco de dados parado! |
| **tp-capital-tp-capital-ingestor-1** | `tp-capital` | - | ❌ Exited (code 1) | ❌ Container órfão com nome ruim |

---

## ❌ Problemas Identificados

### 1. **Naming Convention Inconsistente**

#### Atual:
```
❌ portainer (sem prefixo)
❌ langgraph (sem prefixo)
❌ tradingsystem-docs (prefixo inconsistente com função)
❌ tradingsystem-b3-market-data (muito longo)
❌ tp-capital-tp-capital-ingestion-1 (duplicação, muito longo)
```

#### Proposta:
```
✅ infra-portainer
✅ ai-langgraph
✅ docs-hub
✅ b3-market-data-api
✅ tp-capital-ingestor
```

---

### 2. **Stacks Desorganizadas**

#### Atual (Mistura de Tudo):
```
tradingsystem/
  ├─ docs (docs)
  ├─ dashboard (frontend)
  ├─ b3-system (b3)
  ├─ b3-dashboard (b3)
  ├─ b3-market-data (b3)
  ├─ b3-cron (b3)
  ├─ b3-traefik (infra)
  └─ questdb (database) ← PARADO!

monitoring/ (BEM ORGANIZADO)
  ├─ prometheus
  ├─ grafana
  ├─ alertmanager
  └─ alert-router

langgraph/ (stack própria)
portainer (sem stack)
```

---

### 3. **Containers com Problemas**

| Container | Problema | Ação Necessária |
|-----------|----------|-----------------|
| `tradingsystem-questdb-1` | ❌ Exited (code 143) | **CRÍTICO: Reiniciar!** |
| `tp-capital-tp-capital-ingestion-1` | ❌ Exited (code 1) | Debugar e corrigir |
| `tp-capital-tp-capital-ingestor-1` | ❌ Exited (code 1) | Debugar e corrigir |
| `crewai_studio` | ❌ Exited (code 0) | Remover ou reiniciar |
| `crewai-db` | ❌ Exited (code 0) | Remover ou reiniciar |
| `portainer_anotherkeavi` | ⚠️ Created (órfão) | **Remover** |

---

## ✅ Proposta de Nova Organização

### Stack Structure (7 Stacks)

```
📦 TradingSystem
├── 🏗️  infrastructure/          # Stack: Infra
│   ├── portainer
│   ├── traefik
│   └── nginx (futuro)
│
├── 💾 data/                      # Stack: Data
│   ├── questdb
│   ├── postgres (futuro)
│   └── redis (futuro)
│
├── 📊 monitoring/                # Stack: Monitoring (JÁ BEM ORGANIZADA)
│   ├── prometheus
│   ├── grafana
│   ├── alertmanager
│   └── alert-router
│
├── 🏦 b3/                        # Stack: B3
│   ├── b3-system
│   ├── b3-dashboard
│   ├── b3-market-data-api
│   └── b3-cron
│
├── 📡 tp-capital/                # Stack: TP Capital
│   ├── tp-capital-ingestor
│   └── tp-capital-api (futuro)
│
├── 🎨 frontend/                  # Stack: Frontend
│   ├── dashboard
│   └── docs
│
└── 🤖 ai-tools/                  # Stack: AI Tools
    ├── langgraph
    └── crewai (se necessário)
```

---

## 🎯 Nova Convenção de Nomenclatura

### Pattern: `{stack}-{service}-{instance}`

| Stack | Prefixo | Exemplo |
|-------|---------|---------|
| **Infrastructure** | `infra-` | `infra-portainer`, `infra-traefik` |
| **Data** | `data-` | `data-questdb`, `data-postgres` |
| **Monitoring** | `mon-` | `mon-prometheus`, `mon-grafana` |
| **B3 System** | `b3-` | `b3-system`, `b3-dashboard`, `b3-api` |
| **TP Capital** | `tp-` | `tp-ingestor`, `tp-api` |
| **Frontend** | `fe-` | `fe-dashboard`, `fe-docs` |

### Regras:

1. **Prefixo curto e claro** (3-5 caracteres)
2. **Nome do serviço descritivo** (sem duplicação)
3. **Sem `tradingsystem-` em todos** (redundante)
4. **Lowercase com hífens** (no underscores)
5. **Máximo 30 caracteres** por nome

---

## 📋 Plano de Migração

### Fase 1: Correções Imediatas (URGENTE)

```bash
# 1. Reiniciar QuestDB (CRÍTICO - Banco de dados parado!)
docker start tradingsystem-questdb-1

# 2. Remover containers órfãos
docker rm portainer_anotherkeavi
docker rm crewai_studio
docker rm crewai-db
docker rm tp-capital-tp-capital-ingestion-1
docker rm tp-capital-tp-capital-ingestor-1

# 3. Verificar Portainer (expor porta 9000)
docker stop portainer
docker rm portainer
docker run -d \
  --name infra-portainer \
  --restart unless-stopped \
  -p 9000:9000 \
  -p 9443:9443 \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

---

### Fase 2: Reorganizar em Stacks

#### 2.1. Criar Docker Compose Files Separados

```
infrastructure/
├── docker-compose.infra.yml        # Portainer, Traefik
├── docker-compose.data.yml         # QuestDB, Postgres
└── docker-compose.monitoring.yml   # Já existe!

backend/
├── docker-compose.b3.yml           # Todos os serviços B3
└── docker-compose.tp-capital.yml   # TP Capital services

frontend/
└── docker-compose.frontend.yml     # Dashboard + Docs

ai/
└── docker-compose.ai-tools.yml     # LangGraph, CrewAI
```

---

#### 2.2. Exemplo: `docker-compose.infra.yml`

```yaml
version: '3.8'

name: infrastructure

services:
  portainer:
    container_name: infra-portainer
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9443:9443"
      - "8000:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - infrastructure

  traefik:
    container_name: infra-traefik
    image: traefik:v2.10
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/traefik.yml
    networks:
      - infrastructure
      - traefik_network

networks:
  infrastructure:
    name: infrastructure
  traefik_network:
    external: true

volumes:
  portainer_data:
    name: infra-portainer-data
```

---

#### 2.3. Exemplo: `docker-compose.b3.yml`

```yaml
version: '3.8'

name: b3

services:
  system:
    container_name: b3-system
    build: ./infrastructure/b3
    restart: unless-stopped
    ports:
      - "8082:8080"
    environment:
      - QUESTDB_HOST=data-questdb
      - QUESTDB_PORT=9000
    depends_on:
      - questdb
    networks:
      - b3
      - data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  dashboard:
    container_name: b3-dashboard
    build: ./infrastructure/b3/dashboard
    restart: unless-stopped
    ports:
      - "3030:3000"
    depends_on:
      - system
    networks:
      - b3
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.b3.rule=Host(`b3.localhost`)"

  market-data-api:
    container_name: b3-api
    build: ./frontend/apps/b3-market-data
    restart: unless-stopped
    ports:
      - "4010:4010"
    environment:
      - QUESTDB_HOST=data-questdb
      - QUESTDB_HTTP_PORT=9000
    depends_on:
      - system
      - questdb
    networks:
      - b3
      - data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4010/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  cron:
    container_name: b3-cron
    build:
      context: ./infrastructure/b3
      dockerfile: Dockerfile.cron
    restart: unless-stopped
    depends_on:
      - system
    networks:
      - b3

networks:
  b3:
    name: b3-network
  data:
    external: true
    name: data-network
  traefik_network:
    external: true
```

---

#### 2.4. Exemplo: `docker-compose.data.yml`

```yaml
version: '3.8'

name: data

services:
  questdb:
    container_name: data-questdb
    image: questdb/questdb:latest
    restart: unless-stopped
    ports:
      - "9000:9000"   # HTTP/REST API
      - "9009:9009"   # Web Console
      - "8812:8812"   # Postgres wire protocol
      - "9003:9003"   # Min health check
    volumes:
      - questdb_data:/var/lib/questdb
    environment:
      - QDB_SHARED_WORKER_COUNT=2
      - QDB_HTTP_WORKER_COUNT=2
    networks:
      - data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9003/status || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  # Futuro: PostgreSQL para dados relacionais
  # postgres:
  #   container_name: data-postgres
  #   image: postgres:16-alpine
  #   ...

networks:
  data:
    name: data-network

volumes:
  questdb_data:
    name: data-questdb-volume
```

---

#### 2.5. Exemplo: `docker-compose.frontend.yml`

```yaml
version: '3.8'

name: frontend

services:
  dashboard:
    container_name: fe-dashboard
    build:
      context: ./frontend/apps/dashboard
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3101:3101"
    environment:
      - VITE_API_URL=http://localhost:4010
      - VITE_WS_URL=ws://localhost:4010
    networks:
      - frontend
      - traefik_network

  docs:
    container_name: fe-docs
    build:
      context: ./docs
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3004:3000"
    networks:
      - frontend

networks:
  frontend:
    name: frontend-network
  traefik_network:
    external: true
```

---

#### 2.6. Exemplo: `docker-compose.ai-tools.yml`

```yaml
version: '3.8'

name: ai-tools

services:
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
    environment:
      - PORT=3100
    networks:
      - ai-tools

  langgraph:
    container_name: ai-langgraph
    build:
      context: ./infrastructure/langgraph
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "8111:8111"
    environment:
      - LANGGRAPH_PORT=8111
    networks:
      - ai-tools

  # Futuro: CrewAI Studio
  # crewai:
  #   container_name: ai-crewai
  #   ...

networks:
  ai-tools:
    name: ai-tools-network

volumes:
```

---

### Fase 3: Comandos de Deploy

#### Deploy por Stack:

```bash
# Infrastructure
docker compose -f infrastructure/docker-compose.infra.yml up -d

# Data
docker compose -f infrastructure/docker-compose.data.yml up -d

# Monitoring (já existe)
docker compose -f infrastructure/monitoring/docker-compose.yml up -d

# B3 System
docker compose -f backend/docker-compose.b3.yml up -d

# TP Capital
docker compose -f backend/docker-compose.tp-capital.yml up -d

# Frontend
docker compose -f frontend/docker-compose.frontend.yml up -d

# AI Tools
docker compose -f ai/docker-compose.ai-tools.yml up -d
```

#### Deploy Tudo:

```bash
# Criar script: start-all-stacks.sh
#!/bin/bash

echo "🚀 Starting TradingSystem - All Stacks"
echo ""

# 1. Infrastructure
echo "📦 Stack 1/7: Infrastructure..."
docker compose -f infrastructure/docker-compose.infra.yml up -d

# 2. Data
echo "📦 Stack 2/7: Data..."
docker compose -f infrastructure/docker-compose.data.yml up -d

# 3. Monitoring
echo "📦 Stack 3/7: Monitoring..."
docker compose -f infrastructure/monitoring/docker-compose.yml up -d

# 4. B3
echo "📦 Stack 4/7: B3 System..."
docker compose -f backend/docker-compose.b3.yml up -d

# 5. TP Capital
echo "📦 Stack 5/7: TP Capital..."
docker compose -f backend/docker-compose.tp-capital.yml up -d

# 6. Frontend
echo "📦 Stack 6/7: Frontend..."
docker compose -f frontend/docker-compose.frontend.yml up -d

# 7. AI Tools
echo "📦 Stack 7/7: AI Tools..."
docker compose -f ai/docker-compose.ai-tools.yml up -d

echo ""
echo "✅ All stacks started!"
echo ""
echo "🌐 Access:"
echo "  - Portainer:  http://localhost:9000"
echo "  - Dashboard:  http://localhost:3101"
echo "  - Docs:       http://localhost:3004"
echo "  - B3 UI:      http://localhost:3030"
echo "  - Grafana:    http://localhost:3000"
echo "  - Prometheus: http://localhost:9090"
echo "  - LangGraph:  http://localhost:8111"
echo ""
```

---

## 📊 Comparação: Antes vs Depois

### Antes (Atual):

```
20 containers
  - 6 parados/com erro ❌
  - Nomenclatura inconsistente ❌
  - Tudo misturado em 1-2 stacks ❌
  - QuestDB parado (CRÍTICO!) ❌
  - Containers órfãos ❌
```

### Depois (Proposta):

```
14 containers ativos
  - 7 stacks bem organizadas ✅
  - Nomenclatura padronizada ✅
  - Separação clara de responsabilidades ✅
  - QuestDB funcionando ✅
  - Sem containers órfãos ✅
```

---

## 🎯 Benefícios da Nova Organização

### 1. **Clareza Visual no Portainer**

Antes:
```
❌ tradingsystem-b3-market-data
❌ tradingsystem-dashboard
❌ monitoring-prometheus
```

Depois:
```
✅ Stack: B3
   ├─ b3-system
   ├─ b3-dashboard
   └─ b3-api

✅ Stack: Frontend
   ├─ fe-dashboard
   └─ fe-docs

✅ Stack: AI Tools
```

### 2. **Deploy Granular**

```bash
# Reiniciar apenas a stack B3
docker compose -f backend/docker-compose.b3.yml restart

# Atualizar apenas frontend
docker compose -f frontend/docker-compose.frontend.yml pull
docker compose -f frontend/docker-compose.frontend.yml up -d

# Parar AI tools se não estiver usando
docker compose -f ai/docker-compose.ai-tools.yml down
```

### 3. **Manutenção Simplificada**

- Ver logs por stack
- Escalar serviços independentemente
- Networks isoladas (melhor segurança)
- Volumes organizados por stack

### 4. **Documentação Clara**

Cada stack tem seu próprio README:
```
infrastructure/
├── docker-compose.infra.yml
└── README.md  ← Como usar infra stack

backend/
├── docker-compose.b3.yml
└── README.md  ← Como usar B3 stack
```

---

## 🔧 Comandos Úteis com Nova Estrutura

### Ver status de uma stack:

```bash
docker compose -f backend/docker-compose.b3.yml ps
```

### Logs de uma stack:

```bash
docker compose -f backend/docker-compose.b3.yml logs -f
```

### Atualizar uma stack:

```bash
docker compose -f backend/docker-compose.b3.yml pull
docker compose -f backend/docker-compose.b3.yml up -d
```

### Parar uma stack:

```bash
docker compose -f ai/docker-compose.ai-tools.yml down
```

### Ver todas as stacks no Portainer:

1. Home → Stacks
2. Verá 7 stacks organizadas:
   - `infrastructure`
   - `data`
   - `monitoring`
   - `b3`
   - `tp-capital`
   - `frontend`
   - `ai-tools`

---

## 📚 Documentação Adicional

Após implementar, criar:

1. **[../../guides/portainer/STACKS-GUIDE.md](../../guides/portainer/STACKS-GUIDE.md)** - Guia de cada stack
2. **[NAMING-CONVENTION.md](NAMING-CONVENTION.md)** - Convenção de nomenclatura
3. **[MIGRATION-LOG.md](MIGRATION-LOG.md)** - Log da migração
4. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Problemas comuns por stack

---

## ✅ Checklist de Implementação

### Fase 1: Correções Urgentes
- [ ] Reiniciar QuestDB
- [ ] Remover containers órfãos
- [ ] Recriar Portainer com porta 9000

### Fase 2: Criar Compose Files
- [ ] `docker-compose.infra.yml`
- [ ] `docker-compose.data.yml`
- [ ] `docker-compose.b3.yml`
- [ ] `docker-compose.tp-capital.yml`
- [ ] `docker-compose.frontend.yml`
- [ ] `docker-compose.ai-tools.yml`

### Fase 3: Migração
- [ ] Deploy stack Infrastructure
- [ ] Deploy stack Data
- [ ] Deploy stack B3
- [ ] Deploy stack TP Capital
- [ ] Deploy stack Frontend
- [ ] Deploy stack AI Tools
- [ ] Parar compose antigo
- [ ] Remover containers antigos

### Fase 4: Documentação
- [ ] Criar README para cada stack
- [ ] Atualizar CLAUDE.md
- [ ] Criar guia de deploy
- [ ] Atualizar .env.example files

---

**🎯 Quer que eu comece a implementar? Qual fase você quer fazer primeiro?**

1. **Fase 1:** Correções Urgentes (QuestDB, containers órfãos)
2. **Fase 2:** Criar os novos compose files
3. **Fase 3:** Migrar gradualmente

---

**Última Atualização:** 2025-10-13
**Versão:** 1.0
**Status:** Proposta aguardando aprovação

---
title: Estratégia de Containerização
description: Estratégia de containerização para serviços TradingSystem
tags:
  - reference
  - architecture
  - docker
owner: ArchitectureGuild
lastReviewed: '2025-10-27'
---

# Estratégia de Containerização - TradingSystem

**Data**: 2025-10-25
**Status**: 📋 Planejamento Aprovado
**Referência**: OpenSpec Change `split-tp-capital-into-gateway-api`

---

## 📊 Status Atual (Inventário Completo)

### Containers Docker: **27 rodando** (100%)
- ✅ Databases: 7 containers
- ✅ Database Tools: 4 containers
- ✅ Monitoring: 4 containers
- ✅ AI/ML: 6 containers
- ✅ Documentation: 3 containers
- ✅ Web Scraping: 3 containers

### Serviços Locais Node.js: **3 de 6 rodando** (50%)
- ✅ **Workspace API** (Port 3200) - CRUD Idea Bank
- ✅ **TP Capital** (Port 4005) - Telegram signal ingestion
- ✅ **Status Monitor** - Service health monitoring
- ❌ **Dashboard** (Port 3103) - Frontend React (parado)
- ❌ **Docusaurus** (Port 3205) - Documentation site (parado)

**Total**: 30 serviços (27 containers + 3 locais rodando)

---

## 🎯 Recomendação de Containerização

### ✅ **RECOMENDAR CONTAINERIZAR** (5 serviços)

#### 1. **Workspace API** (Port 3200) - **ALTA PRIORIDADE**
**Justificativa**:
- ✅ Stateless API (CRUD simples)
- ✅ Dual persistence já usa QuestDB containerizado
- ✅ Não depende de hardware específico
- ✅ Facilita deploy e rollback

**Abordagem**: Containerização direta (single service)

**Complexidade**: 🟢 Baixa (2-3 horas)

---

#### 2. **TP Capital** (Port 4005) - **ALTA PRIORIDADE** ⭐

**⚠️ ABORDAGEM ESPECIAL: Split em 2 Camadas**

**Problema**: TP Capital combina Telegram integration (session files, MTProto) com business logic (API, DB), tornando containerização completa impossível sem comprometer segurança.

**Solução Proposta**: **Arquitetura de 2 Camadas**

```
┌─────────────────────────────────────────┐
│  Telegram Gateway (LOCAL - Port 4006)   │  ← systemd service
│  - Telegram auth & session files        │
│  - Message reception                    │
│  - HTTP publisher                       │
└─────────────┬───────────────────────────┘
              │ HTTP POST /ingest
              ▼
┌─────────────────────────────────────────┐
│  TP Capital API (CONTAINER - Port 4005) │  ← Docker container
│  - REST API + Business logic            │
│  - TimescaleDB persistence              │
│  - Prometheus metrics                   │
└─────────────────────────────────────────┘
```

**Benefícios**:
- ✅ Session files permanecem locais (seguro)
- ✅ API containerizada (escalável, versionada)
- ✅ Deploy independente (API restart ≠ Telegram disconnect)
- ✅ Testing isolado (testar API sem mockar Telegram)

**Proposta OpenSpec**: `tools/openspec/changes/split-tp-capital-into-gateway-api/`

**Documentação Completa**:
- [Proposal](tools/openspec/changes/split-tp-capital-into-gateway-api/proposal.md) - Why, What, Impact
- [Design Document](tools/openspec/changes/split-tp-capital-into-gateway-api/design.md) - Decisões técnicas
- [Implementation Tasks](tools/openspec/changes/split-tp-capital-into-gateway-api/tasks.md) - Checklist (150+ tasks)
- [Gateway Spec](tools/openspec/changes/split-tp-capital-into-gateway-api/specs/tp-capital-telegram-gateway/spec.md) - Requirements
- [API Spec](tools/openspec/changes/split-tp-capital-into-gateway-api/specs/tp-capital-api/spec.md) - Requirements modificados

**Complexidade**: 🟡 Média-Alta (12-16 horas total)

**Prioridade**: **ALTA** - Maior impacto arquitetural, habilita escalabilidade futura

#### 4. **Status Monitor** - **MÉDIA PRIORIDADE**
**Justificativa**:
- ✅ Serviço de infraestrutura/observabilidade
- ✅ Lightweight
- ✅ Deve estar sempre disponível
- ✅ Integração com Prometheus/Grafana

**Abordagem**: Adicionar ao `docker-compose.monitoring.yml`

**Complexidade**: 🟢 Baixa (1-2 horas)

---

#### 5. **Docusaurus** (Port 3205) - **MÉDIA PRIORIDADE**
**Justificativa**:
- ✅ Site estático após build
- ✅ Pode usar nginx otimizado
- ✅ Deploy previsível

**Abordagem**: Multi-stage build (Node.js build → nginx runtime)

**Observação**: Em **desenvolvimento local**, manter como processo local para hot-reload

**Complexidade**: 🟡 Média (3-4 horas)

---

### ❌ **NÃO CONTAINERIZAR** (1 serviço)

#### Dashboard (Port 3103) - **Containerizar APENAS em PRODUÇÃO**

**Desenvolvimento (LOCAL)**:
- ❌ HMR (Hot Module Replacement) precisa de acesso direto ao filesystem
- ❌ Vite Fast Refresh funciona melhor localmente
- ❌ Source maps mais fáceis sem camada de container
- ❌ Watch mode (Chokidar) tem melhor performance local

**Produção (CONTAINER)**:
- ✅ Build otimizado (Vite production build)
- ✅ Nginx para servir assets estáticos
- ✅ Cache headers otimizados
- ✅ Gzip/Brotli compression

**Solução**: Dual-mode
```dockerfile
# Development: npm run dev (local)
# Production: Multi-stage (Vite build → nginx)
```

**Complexidade**: 🟡 Média (2-3 horas para produção)

---

## 🔄 Comparação: Antes vs Depois

### ANTES (Estado Atual)
```
Containers: 27
Serviços Locais: 6 (3 rodando, 3 parados)
Gerenciamento: Manual (npm run dev em múltiplos terminais)
Deploy: Inconsistente
```

### DEPOIS (Após Containerização Proposta)
```
Containers: 32 (+5)
  - Workspace API (novo)
  - TP Capital API (novo - separado do Gateway)
  - Status Monitor (novo)
  - Docusaurus (novo - prod only)

Serviços Locais: 2
  - TP Capital Gateway (systemd service)
  - Dashboard (dev only - produção vai para container)

Gerenciamento: docker compose up -d (unificado)
Deploy: Consistente e versionado
```

---

## 📋 Plano de Implementação Recomendado

### Fase 1: APIs Stateless (Semana 1-2) - **PRIORIDADE ALTA**

**Ordem de Execução**:

1. **TP Capital Split** (12-16h) - **COMEÇAR AQUI**
   - ⭐ Maior impacto arquitetural
   - ⭐ Habilita escalabilidade futura
   - ⭐ Proposta OpenSpec completa já aprovada
   - **Ação**: Seguir `tools/openspec/changes/split-tp-capital-into-gateway-api/tasks.md`
   - **Output**:
     - `apps/tp-capital/telegram-gateway/` (systemd service)
     - `apps/tp-capital/api/` (Docker container)
     - `tools/compose/docker-compose.tp-capital.yml`

2. **Workspace API** (2-3h)
   - Criar `backend/api/workspace/Dockerfile`
   - Criar `tools/compose/docker-compose.apis.yml`
   - Configurar health checks
   - Testar integração com QuestDB

3. **Status Monitor** (1-2h)
   - Criar `apps/status/Dockerfile`
   - Adicionar ao `docker-compose.monitoring.yml`

**Total Fase 1**: ~18-24 horas

---

### Fase 2: Frontend Builds (Semana 3) - **PRIORIDADE MÉDIA**

5. **Docusaurus (Produção)** (3-4h)
   - Multi-stage build (Node.js + Nginx)
   - Adicionar ao `docker-compose.docs.yml`

6. **Dashboard (Produção)** (2-3h)
   - Multi-stage build (Vite + Nginx)
   - Configurar proxy reverso para APIs

**Total Fase 2**: ~5-7 horas

---

### Fase 3: Validação & Documentação (Semana 4) - **CRÍTICO**

7. **Testing End-to-End**
   - Testar startup completo: `start` command
   - Verificar health checks: `health` command
   - Testar integração Dashboard ↔ APIs

8. **Documentação**
   - Atualizar `CLAUDE.md`
   - Atualizar `INVENTARIO-SERVICOS.md`
   - Criar runbooks para cada serviço

9. **Monitoring**
   - Configurar Prometheus targets
   - Criar Grafana dashboards
   - Configurar alertas

**Total Fase 3**: ~8-10 horas

---

**TOTAL ESTIMADO**: **33-43 horas** (4-5 semanas trabalhando part-time)

---

## 🎯 Critérios de Sucesso

### Implementação
- [ ] Todos os serviços iniciam via `docker compose up -d`
- [ ] Universal `start` command gerencia containers + serviços locais
- [ ] Health checks passando (Docker + Prometheus)
- [ ] Zero regressões em funcionalidades existentes

### Performance
- [ ] Containers usam < 200MB RAM cada (dev mode)
- [ ] Response time < 100ms (p95) para APIs
- [ ] Container restart count < 1/dia
- [ ] Dashboard hot-reload < 2s (dev mode)

### Operacional
- [ ] Rollback trivial (docker tag anterior)
- [ ] Logs centralizados (`docker logs -f`)
- [ ] Deploy consistente dev/staging/prod
- [ ] Documentação completa e testada

---

## 📁 Estrutura de Arquivos Proposta

```
TradingSystem/
├── backend/api/workspace/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── docker-compose.dev.yml
├── apps/b3-market-data/
│   ├── Dockerfile
│   └── .dockerignore
├── apps/status/
│   ├── Dockerfile
│   └── .dockerignore
├── apps/tp-capital/
│   ├── telegram-gateway/              # NOVO - Local systemd service
│   │   ├── src/
│   │   ├── .session/
│   │   ├── tp-capital-gateway.service
│   │   └── README.md
│   └── api/                           # NOVO - Docker container
│       ├── src/
│       ├── Dockerfile
│       └── README.md
├── frontend/dashboard/
│   ├── Dockerfile.prod                # Para produção
│   ├── nginx.conf
│   └── .dockerignore
├── docs/docusaurus/
│   ├── Dockerfile.prod
│   ├── nginx.conf
│   └── .dockerignore
└── tools/compose/
    ├── docker-compose.apis.yml        # NOVO - Workspace
    ├── docker-compose.tp-capital.yml  # NOVO - TP Capital API
    └── docker-compose.frontend.yml    # NOVO - Dashboard, Docusaurus (prod)
```

---

## ⚠️ Considerações Importantes

### 1. **TP Capital - Abordagem Única**

**NÃO** tentar containerizar TP Capital como serviço único. A proposta OpenSpec já documentou por que isso não funciona:
- Session files Telegram não podem estar em volumes Docker (security risk)
- Reautenticação manual (phone + 2FA) a cada deploy é inaceitável
- MTProto connections devem ser single-instance (não podem escalar)

**Solução CORRETA**: Split em Gateway (local) + API (container) conforme proposta OpenSpec.

### 2. **Dashboard - Dev vs Prod**

**Desenvolvimento**: SEMPRE rodar localmente (`npm run dev`)
- Hot-reload essencial para produtividade
- Source maps funcionam melhor
- Debugging mais fácil

**Produção**: Containerizar com nginx
- Build otimizado
- Cache agressivo
- Compression

### 3. **Workspace API - LowDB Removal**

Existe proposta OpenSpec **alternativa** (`containerize-tp-capital-workspace`) que:
- Remove suporte a LowDB (dual-strategy)
- Usa apenas TimescaleDB
- Requer migração de dados se LowDB tiver dados

**Status**: Proposta separada, não necessária para containerização básica.

---

## 🔗 Referências

### Propostas OpenSpec
- **[split-tp-capital-into-gateway-api](tools/openspec/changes/split-tp-capital-into-gateway-api/README.md)** - **RECOMENDADA** (TP Capital split)
- **[containerize-tp-capital-workspace](tools/openspec/changes/containerize-tp-capital-workspace/proposal.md)** - Alternativa (full containerization)

### Documentação
- [INVENTARIO-SERVICOS.md](INVENTARIO-SERVICOS.md) - Status atual completo
- [CLAUDE.md](CLAUDE.md) - Arquitetura geral do projeto
- [API-INTEGRATION-STATUS.md](API-INTEGRATION-STATUS.md) - Status das APIs

### Docker Compose Files Existentes
- `tools/compose/docker-compose.timescale.yml` - Databases
- `tools/compose/docker-compose.monitoring.yml` - Prometheus/Grafana
- `tools/compose/docker-compose.firecrawl.yml` - Web scraping
- `tools/compose/docker-compose.infrastructure.yml` - AI/ML
- `tools/compose/docker-compose.docs.yml` - Documentation

---

## 📊 Matriz de Decisão

| Serviço | Containerizar? | Prioridade | Complexidade | Horas | Motivo |
|---------|---------------|-----------|--------------|-------|--------|
| **TP Capital** | ⚠️ Split (Gateway local + API container) | 🔴 ALTA | 🟡 Média-Alta | 12-16h | Session security + scalability |
| **Workspace API** | ✅ Sim | 🔴 ALTA | 🟢 Baixa | 2-3h | Stateless, QuestDB já container |
| **Status Monitor** | ✅ Sim | 🟡 MÉDIA | 🟢 Baixa | 1-2h | Infrastructure service |
| **Docusaurus** | ✅ Sim (prod only) | 🟡 MÉDIA | 🟡 Média | 3-4h | Static site, nginx optimized |
| **Dashboard** | ⚠️ Prod only | 🟢 BAIXA | 🟡 Média | 2-3h | Dev needs hot-reload |

**Legenda Prioridade**:
- 🔴 ALTA - Começar imediatamente
- 🟡 MÉDIA - Após ALTA completa
- 🟢 BAIXA - Nice to have

**Legenda Complexidade**:
- 🟢 Baixa - Containerização direta
- 🟡 Média - Requer multi-stage build ou configs especiais
- 🔴 Alta - Mudança arquitetural significativa

---

## 🚀 Quick Start (Após Implementação)

### Desenvolvimento Local
```bash
# Iniciar TUDO (containers + serviços locais)
start

# Containers iniciam automaticamente via docker compose
# Serviços locais detectados e iniciados conforme necessário

# Dashboard (dev mode - local hot-reload)
cd frontend/dashboard && npm run dev

# TP Capital Gateway (systemd ou local)
sudo systemctl start tp-capital-gateway
# ou
cd apps/tp-capital/telegram-gateway && node src/index.js
```

### Produção
```bash
# Iniciar todos os containers (incluindo Dashboard e Docusaurus produção)
docker compose \
  -f tools/compose/docker-compose.infra.yml \
  -f tools/compose/docker-compose.monitoring.yml \
  -f tools/compose/docker-compose.apis.yml \
  -f tools/compose/docker-compose.tp-capital.yml \
  -f tools/compose/docker-compose.frontend.yml \
  up -d

# TP Capital Gateway (systemd)
sudo systemctl start tp-capital-gateway
```

---

**Última Atualização**: 2025-10-25
**Status**: 📋 Planejamento Aprovado
**Próxima Ação**: Implementar TP Capital Split (seguir tasks.md OpenSpec)

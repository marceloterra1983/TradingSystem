---
title: TradingSystem - Directory Structure Guide
sidebar_position: 3
tags: [structure, organization, directories, navigation, reference]
domain: shared
type: reference
summary: Complete guide to all project folders with detailed descriptions and navigation
status: active
last_review: 2025-10-18
---

# 📁 TradingSystem - Estrutura de Diretórios

> **Guia completo** de todas as pastas do projeto TradingSystem com descrições detalhadas de uso
>
> **Última atualização:** 2025-10-18  
> **Versão:** 2.1.2

---

## 📋 Índice Rápido

-   [Estrutura de Primeiro Nível](#estrutura-de-primeiro-nível)
-   [Backend](#-backend)
-   [Frontend](#-frontend)
-   [Documentation (docs/)](#-documentation-docs)
-   [Infrastructure](#️-infrastructure)
-   [AI & ML Tools](#-ai--ml-tools)
-   [Configuration & Tools](#️-configuration--tools)
-   [Runtime](#-runtime)
-   [Hidden Directories](#-hidden-directories)

---

## 📂 Estrutura de Primeiro Nível

```
TradingSystem/
├── .agent/              # Agent automation system files
├── .claude/             # (removido em 2025-10-18) antigo diretório do Claude Code
├── .cursor/             # Cursor IDE settings
├── .git/                # Git version control
├── .github/             # GitHub Actions workflows
├── .husky/              # Git hooks (pre-commit, pre-push)
├── .tmp/                # Temporary files
├── .venv/               # Python virtual environment (global)
├── .vscode/             # VS Code workspace settings
├── archive/             # Archived/deprecated code
├── backend/             # Backend services & APIs
├── docs/                # Documentation hub (Docusaurus)
├── frontend/            # Frontend applications
├── infrastructure/      # DevOps & infrastructure
├── node_modules/        # Node.js dependencies (root)
└── scripts/             # Automation scripts
```

---

## 🎯 Backend

### `/backend/` - Backend Services Root

**Descrição:** Todos os serviços backend, APIs REST e microsserviços

```
backend/
├── api/                 # REST APIs (Node.js/Express)
├── compose/             # Docker compose files para backend
├── data/                # Data layer (schemas, migrations, backups, runtime)
│   ├── backups/         # Database backups
│   ├── runtime/         # Runtime data (context7, exa, langgraph)
│   └── schemas/         # Data schemas & migrations
├── docs/                # Backend-specific documentation
└── services/            # Core microservices
```

### `/backend/api/` - REST APIs

**Descrição:** APIs Node.js/Express para diferentes domínios

**Portas de Serviços (fonte de verdade - backend/manifest.json):**

-   Library API: 3200
-   TP Capital Signals: 3200
-   B3 Market Data: 3302
-   Documentation API: 3400
-   Service Launcher: 3500
-   Firecrawl Proxy: 3600

**Note**: Library API and TP Capital both share port 3200 in manifest.json but are documented separately.

#### `/backend/api/workspace/` - Library API (Port 3200)

-   **Função:** Gerenciamento de biblioteca de documentação e ideias de trading
-   **Stack:** Express + LowDB (fallback) + QuestDB (production)
-   **Principais arquivos:**
    -   `src/server.js` - Entry point
    -   `src/repositories/` - Data access layer (strategy pattern)
    -   `src/middleware/` - Express middlewares
    -   `src/config.js` - Configurações e variáveis de ambiente
    -   `src/logger.js` - Logger estruturado (pino)
    -   `src/metrics.js` - Métricas Prometheus
    -   `db/ideas.json` - LowDB database (fallback)
    -   `scripts/` - Backup, restore, migration scripts
    -   `uploads/` - Uploaded files storage

#### `/frontend/apps/tp-capital/` - TP Capital Signals API (Port 3200)

-   **Função:** Ingestão de sinais do Telegram e persistência em QuestDB
-   **Stack:** Express + Telegraf (Telegram Bot) + QuestDB
-   **Status:** ✅ **Active** (canonical implementation per `backend/manifest.json`)
-   **Principais arquivos:**
    -   `src/server.js` - Main server
    -   `src/routes/` - API endpoints
    -   `src/telegram/` - Telegram bot handlers
    -   `samples/` - Sample data for testing
    -   `scripts/` - Database seeding scripts

**Nota:** Uma implementação alternativa existe em `/backend/api/tp-capital/` mas não é a versão ativa e está mantida apenas como referência histórica. A implementação canônica para deployment e manutenção é `frontend/apps/tp-capital/` conforme definido no manifest do sistema.

#### `/frontend/apps/b3-market-data/` - B3 Market Data API (Port 3302)

-   **Função:** Serviço de dados de mercado B3
-   **Stack:** Express + Market data integrations
-   **Principais arquivos:**
    -   `src/` - Source code
    -   `routes/` - API endpoints

#### `/backend/api/documentation-api/` - Documentation API (Port 3400)

-   **Função:** API de gerenciamento de documentação técnica
-   **Stack:** Express + FlexSearch + Schema validators + LowDB
-   **Principais pastas:**
    -   `src/services/` - Business logic
    -   `src/routes/` - API endpoints
    -   `src/utils/` - Helper functions
    -   `src/__tests__/` - E2E tests
    -   `db/` - LowDB database files
    -   `uploads/` - Uploaded documentation files

#### `/frontend/apps/service-launcher/` - Service Launcher API (Port 3500)

-   **Função:** Orquestração e health check de serviços
-   **Stack:** Express (minimal)
-   **Principais arquivos:**
    -   `server.js` - Launcher API
-   **Endpoints principais:**
    -   `GET /api/status` - Aggregated health status
    -   `POST /launch` - Launch service
    -   `GET /health` - Health check

#### `/backend/api/firecrawl-proxy/` - Firecrawl Proxy API (Port 3600)

-   **Função:** Proxy service for Firecrawl web scraping integration
-   **Stack:** Express + Firecrawl client
-   **Principais arquivos:**
    -   `src/server.js` - Main server
    -   `src/routes/` - API endpoints
    -   `src/config.js` - Firecrawl configuration

### `/backend/services/` - Core Microservices

**Descrição:** Microsserviços especializados (Python/C#)

#### `/backend/services/timescaledb-sync/` - TimescaleDB Sync Service

-   **Função:** Sincronização de dados com TimescaleDB
-   **Stack:** Python
-   **Principais arquivos:**
    -   Python sync scripts

**Nota:** LlamaIndex foi movido para `infrastructure/llamaindex/` (veja seção AI & ML Tools)

### `/backend/data/` - Data Layer

**Descrição:** Schemas, migrations, backups e dados de runtime

```
backend/data/
├── backups/             # Database backups
│   └── library/         # Library DB backups (timestamped)
├── runtime/             # Runtime data (unificado)
│   ├── exa/             # Exa search cache
│   └── langgraph/       # LangGraph execution data
└── schemas/             # Data schemas & migrations
    └── documentation/   # Documentation schema definitions
```

**Nota:** Pasta `/data/` da raiz foi unificada aqui para melhor organização
**Nota:** `context7/` será criado pelo serviço Context7 quando habilitado

**LowDB Locations (arquivos JSON locais):**

-   Library API: `backend/api/workspace/db/ideas.json`
-   Documentation API: `backend/api/documentation-api/db/db.json`

**Mais informações:** Veja `backend/data/README.md` para detalhes sobre schemas, migrações e estratégia de dados

---

## 🎨 Frontend

### `/frontend/` - Frontend Applications Root

**Descrição:** Todos os aplicativos frontend e assets compartilhados

```
frontend/
├── apps/                # Frontend applications
├── compose/             # Docker compose files para frontend
└── shared/              # Shared assets & styles
```

### `/frontend/apps/dashboard/` - Main Dashboard (Port 3103)

**Descrição:** Dashboard principal do TradingSystem (React + Vite + TypeScript)

**Nota de Porta:** Vite usa 5173 por padrão, mas o projeto está configurado para **3103** (via `backend/manifest.json`) para evitar conflitos com outros serviços.

#### Estrutura Principal

```
frontend/apps/dashboard/
├── src/                 # Source code
├── public/              # Static assets
├── cypress/             # E2E tests
├── coverage/            # Test coverage reports
├── scripts/             # Build & dev scripts
└── docs/                # Dashboard documentation
```

#### `/frontend/apps/dashboard/src/` - Source Code

```
src/
├── components/          # React components
│   ├── layout/          # Layout components (Header, Sidebar, etc.)
│   ├── pages/           # Page components (abundância de páginas específicas)
│   ├── trading/         # Trading-specific components
│   ├── ui/              # Reusable UI components (buttons, cards, etc.)
│   ├── KillSwitch/      # Emergency stop component
│   ├── MetricsView/     # Performance metrics display
│   ├── PositionView/    # Position tracking view
│   └── SignalView/      # Trading signals view
├── hooks/               # Custom React hooks
├── store/               # Zustand state management
├── services/            # API clients & integrations (HTTP, WebSocket)
├── contexts/            # React contexts (shared state)
├── providers/           # React providers (context wrappers)
├── views/               # Complex views (page compositions)
├── utils/               # Helper functions
├── lib/                 # Third-party library configs
├── data/                # Static data & constants
├── examples/            # Example components
└── __tests__/           # Unit tests (Vitest/Jest)
```

#### `/frontend/apps/dashboard/cypress/` - E2E Testing

```
cypress/
├── e2e/                 # E2E test specs
├── fixtures/            # Test data fixtures
├── screenshots/         # Test screenshots (CI)
├── videos/              # Test recordings
└── support/             # Cypress support files
```

#### `/frontend/apps/dashboard/public/` - Static Assets

```
public/
├── assets/              # Images, icons, fonts
│   └── branding/        # Brand assets (logos, colors)
└── docs/                # Embedded documentation (mirror)
    └── context/         # Context-driven docs (copied from /docs)
```

**Nota:** O conteúdo em `public/docs/` é gerado automaticamente pelo build process (`copy-docs.js`) a partir de `docs/context/`. Desenvolvedores devem editar APENAS arquivos em `docs/context/`, nunca em `public/docs/`.

### `/frontend/shared/` - Shared Frontend Assets

**Descrição:** Assets compartilhados entre aplicações frontend

```
frontend/shared/
└── assets/
    └── branding/        # Shared brand assets
```

---

## 📚 Documentation (docs/)

### `/docs/` - Documentation Hub Root

**Descrição:** Hub central de documentação usando Docusaurus

```
docs/
├── context/             # Context-driven documentation (main content)
├── docusaurus/          # Docusaurus instance
├── reports/             # Auditorias e análises técnicas
├── ingest/              # Documentation ingestion tools
├── spec/                # API specifications & OpenAPI schemas
├── README.md            # Main documentation hub (START HERE)
├── DIRECTORY-STRUCTURE.md  # This file
├── DOCUMENTATION-STANDARD.md
└── INSTALLED-COMPONENTS.md
```

**Nota:** Conteúdo de `architecture/`, `features/`, `frontend/` está organizado em `docs/context/*` (backend, frontend, shared, ops).
**Nota:** Static assets para Docusaurus estão em `docs/docusaurus/static/`.

### `/docs/context/` - Context-Driven Documentation

**Descrição:** Documentação organizada por contexto/domínio (Architecture v2.1)

#### Estrutura de Contextos

```
docs/context/
├── backend/             # Backend context
│   ├── api/             # API documentation per service
│   ├── architecture/    # Backend architecture
│   │   └── decisions/   # Architecture Decision Records (ADRs)
│   ├── data/            # Data layer documentation
│   │   ├── migrations/  # Migration guides
│   │   ├── operations/  # Database operations
│   │   ├── schemas/     # Schema documentation
│   │   │   ├── analytics/
│   │   │   ├── logging/
│   │   │   └── trading-core/
│   │   └── warehouse/   # Data warehouse docs
│   ├── guides/          # Backend implementation guides
│   ├── integrations/    # Integration documentation
│   └── references/      # API references
│
├── frontend/            # Frontend context
│   ├── api/             # Frontend API documentation
│   ├── architecture/    # Frontend architecture
│   │   ├── decisions/   # Frontend ADRs
│   │   └── diagrams/    # Architecture diagrams
│   ├── features/        # Feature specifications
│   ├── guides/          # Frontend implementation guides
│   └── references/      # Component references
│
├── ops/                 # Operations context
│   ├── automation/      # Automation scripts & workflows
│   ├── checklists/      # Operational checklists
│   ├── deployment/      # Deployment procedures
│   ├── incidents/       # Incident postmortems
│   ├── infrastructure/  # Infrastructure documentation
│   ├── migrations/      # System migration guides
│   ├── monitoring/      # Monitoring setup & dashboards
│   ├── repository/      # Repository management
│   └── troubleshooting/ # Troubleshooting guides
│
└── shared/              # Shared/cross-cutting context
    ├── diagrams/        # Shared architecture diagrams
    ├── integrations/    # Cross-system integrations
    ├── product/         # Product documentation
    │   ├── plans/       # Product plans & roadmaps
    │   ├── prd/         # Product Requirements Docs
    │   │   ├── en/      # English PRDs
    │   │   └── pt/      # Portuguese PRDs (6 PRDs)
    │   └── rfc/         # Request for Comments
    │       ├── en/      # English RFCs
    │       └── pt/      # Portuguese RFCs
    ├── runbooks/        # Operational runbooks
    ├── summaries/       # Executive summaries
    └── tools/           # Tools & templates
        ├── diagrams/    # Diagram tools & conventions
        ├── docusaurus/  # Docusaurus tutorials
        ├── openspec/    # OpenSpec documentation
        └── templates/   # Document templates (ADR, PRD, etc.)
```

### `/docs/docusaurus/` - Docusaurus Instance (Port 3004)

**Descrição:** Aplicação Docusaurus que renderiza a documentação

```
docs/docusaurus/
├── src/                 # Docusaurus source
│   ├── components/      # Custom React components
│   │   ├── ApiEndpoint/ # API endpoint display
│   │   ├── CodeBlock/   # Enhanced code blocks
│   │   ├── HomepageFeatures/
│   │   └── Tabs/        # Tab components
│   ├── css/             # Custom CSS
│   └── pages/           # Custom pages
│       └── spec/        # Spec viewer pages
├── static/              # Static assets (docs/docusaurus/static/)
│   ├── img/             # Images
│   └── spec/            # API specifications (OpenAPI, JSON schemas)
├── scripts/             # Build scripts
├── build/               # Built static site
└── .docusaurus/         # Docusaurus cache
```

---

## 🏗️ Infrastructure

### `/infrastructure/` - DevOps & Infrastructure Root

**Descrição:** Toda a infraestrutura, containerização e configurações DevOps

```
infrastructure/
├── compose/             # Docker Compose files
├── monitoring/          # Monitoring stack (Prometheus, Grafana)
├── nginx-proxy/         # Nginx reverse proxy configs
├── openspec/            # OpenSpec specifications & change management
├── scripts/             # Infrastructure automation scripts
├── systemd/             # Linux systemd service definitions
├── timescaledb/         # TimescaleDB configuration
├── tp-capital/          # TP Capital specific configs
├── agno-agents/         # Agno multi-agent framework (MarketAnalysis, RiskManagement, SignalOrchestrator)
├── langgraph/           # LangGraph service (AI orchestration)
├── llamaindex/          # LlamaIndex RAG service
└── firecrawl/           # Firecrawl web scraping tool
```

### `/infrastructure/compose/` - Docker Compose Stacks

**Descrição:** Arquivos Docker Compose para diferentes stacks

```
infrastructure/compose/
├── docker-compose.infra.yml      # Infrastructure stack (Traefik, Portainer)
├── docker-compose.data.yml       # Data stack (QuestDB)
├── docker-compose.timescale.yml  # TimescaleDB stack
├── docker-compose.infra.yml   # Infrastructure services (LangGraph, LlamaIndex, Qdrant)
└── traefik.yml                   # Traefik configuration
```

### `/infrastructure/monitoring/` - Monitoring Stack

**Descrição:** Prometheus, Grafana e AlertManager

```
infrastructure/monitoring/
├── prometheus/          # Prometheus configuration
│   └── rules/           # Alerting rules
├── grafana/             # Grafana configuration
│   ├── dashboards/      # Dashboard JSON files
│   └── provisioning/    # Auto-provisioning configs
│       ├── dashboards/  # Dashboard providers
│       └── datasources/ # Datasource configs
├── alertmanager/        # AlertManager configuration
├── alert-router/        # Custom alert routing service
└── docker-compose.yml   # Monitoring stack compose
```

### `/infrastructure/nginx-proxy/` - Nginx Reverse Proxy

**Descrição:** Configurações de reverse proxy para unified domain

```
infrastructure/nginx-proxy/
├── tradingsystem.conf   # Main Nginx configuration
└── VPS-MIGRATION-GUIDE.md
```

### `/infrastructure/scripts/` - Automation Scripts

**Descrição:** Scripts de automação de infraestrutura

### `/infrastructure/systemd/` - Systemd Services

**Descrição:** Definições de serviços Linux (para Windows Services futuros)

### `/infrastructure/firecrawl/` - Firecrawl Integration

**Descrição:** Ferramenta de web scraping e crawling

```
infrastructure/firecrawl/
└── firecrawl-source/    # Firecrawl source code
    ├── examples/        # Usage examples
    └── apps/            # Firecrawl applications
```

### `/infrastructure/langgraph/` - LangGraph Service

**Descrição:** Multi-agent workflow orchestration (Port 8111)

```
infrastructure/langgraph/
├── Dockerfile           # Container definition
├── requirements.txt     # Python dependencies
└── server.py            # FastAPI server
```

### `/infrastructure/llamaindex/` - LlamaIndex RAG Service

**Descrição:** Document indexing & retrieval com LlamaIndex

```
infrastructure/llamaindex/
├── ingestion_service/   # Document ingestion pipeline
├── query_service/       # Query & retrieval API (Port 3450)
├── Dockerfile.ingestion # Ingestion container
├── Dockerfile.query     # Query container
├── requirements.txt     # Python dependencies
├── k8s/                 # Kubernetes manifests
│   ├── production/      # Production configs
│   └── staging/         # Staging configs
└── tests/               # Integration tests
```

**Funcionalidades:**

-   Document processing (MD, PDF, DOCX, TXT)
-   Vector embeddings com Qdrant
-   Semantic search & retrieval
-   RAG (Retrieval-Augmented Generation)

### `/infrastructure/agno-agents/` - Agno Multi-Agent Framework

**Descrição:** Sistema multi-agente para trading automatizado usando framework Agno

```
infrastructure/agno-agents/
├── src/                    # Source code
│   ├── domain/             # Domain models
│   ├── application/        # Application services & agents
│   │   ├── agents/         # MarketAnalysisAgent, RiskManagementAgent, SignalOrchestrator
│   │   └── services/       # Business services
│   ├── infrastructure/     # Integrations & adapters (Workspace, TP Capital, B3)
│   └── interfaces/         # FastAPI endpoints
├── tests/                  # Unit & integration tests
├── Dockerfile              # Container definition
├── requirements.txt        # Python dependencies
└── pyproject.toml          # Python project config
```

**Funcionalidades:**

-   **MarketAnalysisAgent** - Correlaciona dados B3, TP Capital e Workspace para gerar recomendações BUY/SELL/HOLD
-   **RiskManagementAgent** - Valida regras de risco e limites antes de executar sinais
-   **SignalOrchestrator** - Coordena agentes e gerencia workflows de decisão
-   Integra APIs Workspace (:3100), TP Capital (:3200), B3 (:3302) via HTTP/WebSocket
-   Resiliência com retry exponencial e circuit breaker
-   Observabilidade via Prometheus metrics (`GET /metrics`) e logs estruturados
-   Port: 8200

---

## 🤖 AI & ML Tools

**Nota:** Todas as ferramentas AI/ML estão consolidadas em `infrastructure/`. Veja seção **Infrastructure** acima para:

-   **Agno Agents** (`infrastructure/agno-agents/`) - Multi-agent framework with MarketAnalysisAgent, RiskManagementAgent, SignalOrchestrator - Port 8200
-   **LangGraph** (`infrastructure/langgraph/`) - Multi-agent orchestration - Port 8111
-   **LlamaIndex** (`infrastructure/llamaindex/`) - RAG service - Port 3450
-   **Firecrawl** (`infrastructure/firecrawl/`) - Web scraping tool - Port 3002
-   **Context7** - Context integration _(Planned - runtime data will be created at `backend/data/runtime/context7/` when enabled)_
-   **Infrastructure Services Compose**: `infrastructure/compose/docker-compose.infra.yml`

**Deprecated/Removed:**

-   **Agent-MCP** - Removed on 2025-10-15 (see `docs/reports/AGENTS-SCHEDULER-REMOVAL-SUMMARY.md`)

---

## ⚙️ Configuration & Tools

### `/scripts/` - Root Scripts

**Descrição:** Scripts de automação do projeto

```
scripts/
├── start-all-services.sh    # Start all Node.js services
└── (outros scripts de build, deploy, etc.)
```

### `/.github/` - GitHub Configuration

**Descrição:** GitHub Actions workflows e templates

```
.github/
└── workflows/           # CI/CD workflows
    ├── code-quality.yml
    └── docs-deploy.yml
```

### `/.vscode/` - VS Code Settings

**Descrição:** Configurações do workspace VS Code

### `/.husky/` - Git Hooks

**Descrição:** Git hooks para pre-commit, pre-push

---

## 💾 Runtime

### `/backend/data/runtime/` - Runtime Data

**Descrição:** Dados de runtime consolidados (execuções, cache, etc.)

**Conteúdo atual:**

-   `exa/` - Exa search cache
-   `langgraph/` - LangGraph execution data

**Conteúdo futuro (gerado quando habilitado):**

-   `context7/` - Context7 runtime data (criado pelo serviço quando ativo)

**Nota:** Dados de runtime foram consolidados de `/data/` raiz para `backend/data/runtime/` na v2.1

---

## 🔒 Hidden Directories

### `/.agent/` - Agent System Files

**Descrição:** Sistema de automação de agentes

```
.agent/
├── diffs/               # Code diffs
├── logs/                # Agent logs
└── notifications/       # Agent notifications
    ├── acknowledged/    # Processed notifications
    └── pending/         # Pending notifications
```

### `/.claude/` - Diretório removido

**Descrição:** Estrutura do Claude Code usada até 2025-10-18. Mantido aqui apenas como registro histórico; não deve existir em novas worktrees.

### `/.cursor/` - Cursor IDE Settings

**Descrição:** Configurações do Cursor IDE

### `/.tmp/` - Temporary Files

**Descrição:** Arquivos temporários (build, cache, etc.)
**Nota:** Pode ser gerado localmente; não existe no repositório por padrão

### `/.venv/` - Python Virtual Environment

**Descrição:** Ambiente virtual Python global do projeto
**Nota:** Pode ser gerado localmente; não existe no repositório por padrão

### `/node_modules/` - Node.js Dependencies

**Descrição:** Dependências Node.js do root package.json

### `/archive/` - Archived Code

**Descrição:** Código arquivado/depreciado (não deve ser usado)

---

## 📊 Estatísticas da Estrutura

**Nota:** Para estatísticas atualizadas dinamicamente, execute:

```bash
# Contar diretórios por seção
find backend -type d | wc -l
find frontend -type d | wc -l
find docs -type d | wc -l
find infrastructure -type d | wc -l

# Ou use script automatizado (se disponível)
# ./scripts/count-structure.sh
```

### Organização por Domínio (Overview)

-   **Backend APIs:** 6 serviços ativos (library, tp-capital-signals, b3-market-data, documentation-api, service-launcher, firecrawl-proxy)
-   **Frontend Apps:** 1 principal (Dashboard - Port 3103)
-   **Documentation:** 4 contextos (backend, frontend, ops, shared)
-   **Infrastructure:** 5 stacks (infra-core, data, monitoring, frontend, infrastructure services)
-   **AI/ML Tools:** Agno Agents, LangGraph, LlamaIndex, Firecrawl

---

## 🎯 Convenções de Nomenclatura

### Padrões de Pastas

#### Backend

-   `src/` - Source code principal
-   `tests/` ou `__tests__/` - Testes (veja tabela abaixo)
-   `scripts/` - Scripts auxiliares
-   `db/` - Database files/migrations
-   `uploads/` - Arquivos de upload

#### Frontend

-   `src/` - Source code
-   `public/` - Static assets
-   `cypress/` - E2E tests
-   `coverage/` - Test coverage
-   `scripts/` - Build scripts

### Convenções de Testes por Stack

| Stack/Framework                | Diretório de Testes      | Framework Padrão |
| ------------------------------ | ------------------------ | ---------------- |
| Node.js/Express (Backend APIs) | `__tests__/` ou `tests/` | Jest/Vitest      |
| Frontend (React/Vite)          | `src/__tests__/`         | Vitest           |
| Python                         | `tests/`                 | pytest           |
| E2E (Frontend)                 | `cypress/`               | Cypress          |

**Nota:** O projeto mistura `tests/` e `__tests__/` dependendo do serviço. Novos serviços devem seguir a convenção acima.

#### Documentation

-   `context/` - Main content (context-driven)
-   `static/` - Static assets
-   `src/` - Docusaurus source
-   `build/` - Built site

#### Infrastructure

-   `compose/` - Docker Compose files
-   `monitoring/` - Monitoring configs
-   `scripts/` - Automation scripts
-   `k8s/` - Kubernetes manifests

### Arquivos Especiais

-   `README.md` - Documentação da pasta
-   `package.json` - Node.js package definition
-   `requirements.txt` - Python dependencies
-   `pyproject.toml` - Python project config
-   `docker-compose.yml` - Docker composition
-   `.env` - Environment variables (not committed)
-   `.env.example` - Environment template
-   `_category_.json` - Docusaurus category metadata

---

## 🔍 Navegação Rápida

### Para Desenvolvedores Backend

```
backend/api/                    # APIs REST
backend/services/               # Microsserviços
backend/data/schemas/           # Schemas de dados
docs/context/backend/           # Documentação backend
```

### Para Desenvolvedores Frontend

```
frontend/apps/dashboard/src/    # Source code do dashboard
frontend/apps/dashboard/cypress/ # E2E tests
docs/context/frontend/          # Documentação frontend
```

### Para DevOps

```
infrastructure/compose/         # Docker stacks
infrastructure/monitoring/      # Monitoring setup
infrastructure/scripts/         # Automation
docs/context/ops/              # Operational docs
```

### Para Documentação

```
docs/context/                   # Main documentation
docs/docusaurus/               # Docusaurus app
docs/context/shared/tools/templates/ # Document templates
```

### Para AI/ML

```
infrastructure/langgraph/      # LangGraph orchestration
infrastructure/llamaindex/     # RAG service
infrastructure/compose/docker-compose.infra.yml  # Infrastructure services stack
infrastructure/agno-agents/    # Agno multi-agent framework
```

---

## 📝 Próximos Passos

### Melhorias na Organização

1. 📦 Consolidar pastas `docs/` duplicadas
2. 🧹 Limpar arquivos em `/archive/`
3. 📚 Padronizar estrutura de `tests/` vs `__tests__/`
4. 🔄 Mover scripts dispersos para `/scripts/`

### Documentação Faltante

1. 📖 README.md em cada pasta principal
2. 📋 CHANGELOG.md nos serviços
3. 🎯 CONTRIBUTING.md detalhado
4. 📐 Architecture diagrams atualizados

---

**Última atualização:** 2025-10-17  
**Responsável:** Sistema de Documentação Automática  
**Versão da Estrutura:** 2.1.2 (Corrigido: Dashboard port 3103, adicionado Firecrawl Proxy 3600, atualizado Library API)

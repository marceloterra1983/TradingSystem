---
title: OpenSpec Instructions
sidebar_position: 1
tags: [documentation]
domain: shared
type: guide
summary: "<!-- OPENSPEC:START -->"
status: active
last_review: "2025-10-23"
---

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@tools/openspec/AGENTS.md` when the request:

-   Mentions planning or proposals (words like proposal, spec, change, plan)
-   Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
-   Sounds ambiguous and you need the authoritative spec before coding

Use `@tools/openspec/AGENTS.md` to learn:

-   How to create and apply change proposals
-   Spec format and conventions
-   Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Canonical Source for AI Agents**  
> `CLAUDE.md` é a fonte única de instruções para qualquer agente de IA neste projeto. O arquivo `AGENTS.md` na raiz é um link simbólico para este documento, garantindo que atualizações em um se reflitam automaticamente no outro.

## 📚 Quick Start for New Sessions

**IMPORTANT:** Before working on any task, understand the project structure and documentation organization:

### Reference Documentation (Implementation Details)

**NEW:** Comprehensive reference documentation for implementation details:

- **[ref/README.md](ref/README.md)** - **START HERE** - Complete project overview, architecture, and quick links
- **[ref/backend/README.md](ref/backend/README.md)** - Backend services, APIs, patterns, and testing
- **[ref/frontend/README.md](ref/frontend/README.md)** - Frontend apps, React components, state management
- **[ref/infrastructure/README.md](ref/infrastructure/README.md)** - Docker, databases, monitoring, DevOps
- **[ref/scripts/README.md](ref/scripts/README.md)** - Automation scripts and tooling
- **[ref/docs/README.md](ref/docs/README.md)** - Documentation system and governance

### Core Documentation Structure

The project uses **Docusaurus v3** for comprehensive documentation under `/docs/`:

1. **[docs/README.md](docs/README.md)** - Documentation hub overview
2. **[docs/content/](docs/content/)** - All documentation content organized by domain:
    - **[apps/](docs/content/apps/)** - Application documentation (Workspace, TP Capital, Order Manager)
    - **[api/](docs/content/api/)** - API specifications and guides
    - **[frontend/](docs/content/frontend/)** - UI components, design system, guidelines
    - **[database/](docs/content/database/)** - Schemas, migrations, data lifecycle
    - **[tools/](docs/content/tools/)** - Development tools and infrastructure
    - **[sdd/](docs/content/sdd/)** - Software design documents (schemas, events, flows)
    - **[prd/](docs/content/prd/)** - Product requirements and feature briefs
    - **[reference/](docs/content/reference/)** - Templates, ADRs, standards
    - **[diagrams/](docs/content/diagrams/)** - PlantUML architectural diagrams
3. **[governance/](governance/README.md)** - Documentation governance and quality standards
4. **[docs/migration/](docs/migration/)** - Migration artifacts and history

### Key Documentation Locations

-   **Implementation Reference**: `ref/` (code patterns, APIs, infrastructure)
-   **Architecture Decisions**: `docs/content/reference/adrs/` (ADRs)
-   **Product Requirements**: `docs/content/prd/products/` (organized by product)
-   **Implementation Guides**: `docs/content/frontend/guides/` & `docs/content/apps/*/`
-   **API Documentation**: `docs/content/api/` (service-specific docs with Redocusaurus)
-   **Feature Documentation**: `docs/content/frontend/features/` & `docs/content/apps/*/features/`
-   **Data Schemas**: `docs/content/database/schema.mdx` (QuestDB, TimescaleDB, LowDB)
-   **Health Monitoring**: `docs/content/tools/monitoring/`
-   **Knowledge Dashboard**: Dashboard → Knowledge → Governance (live snapshot fed by `/governance`)

### Active Services & Ports

**⚠️ IMPORTANT: All services are accessed via Traefik API Gateway**

-   **API Gateway (Traefik)**: http://localhost:9080 (main entrypoint)
    -   **Dashboard UI**: http://localhost:9080/ (React + Vite)
    -   **Documentation Hub**: http://localhost:9080/docs/ (Docusaurus)
    -   **Workspace API**: http://localhost:9080/api/workspace/*
    -   **TP Capital API**: http://localhost:9080/api/tp-capital/*
    -   **Documentation API**: http://localhost:9080/api/docs/*
-   **Traefik Dashboard**: http://localhost:9081 (monitoring UI)
-   **LlamaIndex Query**: http://localhost:8202 (FastAPI + Qdrant + Ollama - RAG system - direct access only)

### 🐍 Python Environment (Auto-Activation with direnv)

**The project uses `direnv` for automatic Python virtual environment activation.**

**First-time setup:**

```bash
# 1. Install and configure direnv (one-time)
bash scripts/setup/setup-direnv.sh

# 2. Reload your shell
source ~/.bashrc  # or ~/.zshrc

# 3. Navigate to project (will auto-activate venv)
cd /home/marce/Projetos/TradingSystem

# 4. Allow .envrc (first time only)
direnv allow
```

**Daily usage:**
- Just `cd` into the project directory → Python venv activates automatically! 🐍
- Exit the directory → venv deactivates automatically
- No manual `source venv/bin/activate` needed

**Useful commands:**
- `direnv allow` - Allow .envrc after changes
- `direnv reload` - Reload environment
- `direnv deny` - Temporarily disable auto-activation
- `direnv revoke` - Revoke .envrc permissions

**Migration note:** The old `.bashrc` approach has been replaced by `direnv` for better automation and standard compliance. See `backups/dotfiles/README.md` for restoration instructions.

## 🖥️ Claude Code CLI

**Claude Code CLI is installed globally** for terminal-based development workflow.

### Quick Start

```bash
# Navigate to project and run Claude Code
cd /home/marce/projetos/TradingSystem
claude

# Or use custom commands
/health-check all
/docker-compose start-all
```

### Features

-   ✅ **Custom Commands** - Project-specific shortcuts (`.claude/commands/`)
-   ✅ **MCP Servers** - 6 integrated servers (filesystem, github, openapi, docker, postgres, sentry)
-   ✅ **Terminal Integration** - Works seamlessly in Cursor's terminal (WSL2)
-   ✅ **Project Configuration** - Automatic loading of rules and settings

### Documentation

**Complete CLI guide**: [`.claude/README.md`](.claude/README.md)

**Custom commands**:

-   `/git-workflows` - Git operations with Conventional Commits
-   `/docker-compose` - Docker stack management
-   `/health-check` - System health monitoring
-   `/scripts` - Direct access to project scripts

**Configuration files**:

-   `~/.claude.json` - Global config (API key, authentication)
-   `.claude-plugin` - Project settings (LOCAL - forces use of project config)
-   `.claude/commands/` - Custom commands
-   `.claude/mcp-servers.json` - MCP configuration
-   `.claude/settings.json` - Local settings (hooks, etc)

## Permissions

Claude Code has the following permissions in this project:

```json
{
    "permissions": {
        "allow": [
            "Bash",
            "Read",
            "Write",
            "Edit",
            "Glob",
            "Grep",
            "Task",
            "WebFetch",
            "WebSearch",
            "BashOutput",
            "KillShell",
            "NotebookEdit",
            "TodoWrite",
            "SlashCommand",
            "ExitPlanMode"
        ]
    }
}
```

## Project Overview

**Local Trading System** with Clean Architecture + DDD, integrating Nelogica's ProfitDLL for market data capture, ML-based analysis, and automated order execution. 100% on-premise, no cloud dependencies.

**Stack:** C# (.NET 8.0) + Python (3.11+) + React + Node.js
**Platform:** Hybrid: Native Windows (Core Trading) + Docker Compose Auxiliary Services (Linux/WSL)
**Architecture:** Microservices + Event-Driven + Domain-Driven Design

## ⚠️ CRITICAL DEPLOYMENT REQUIREMENT

### Core Trading Services (Native Windows)

**The core trading services (Data Capture and Order Manager) MUST RUN NATIVELY ON WINDOWS.**

**Reasons for Native Windows:**

1. **ProfitDLL is Windows-native 64-bit DLL** - Cannot run in containers
2. **Latency requirements (< 500ms)** - Direct hardware access required
3. **Disk I/O performance** - Direct NVMe/SSD access for Parquet writes
4. **Resource allocation** - 100% CPU/RAM for trading processes
5. **Production stability** - Native services for 24/7 operations

### Auxiliary Services (Docker Compose)

**All non-trading services run in Docker Compose stacks that can be orchestrated locally (Linux/WSL) or on a dedicated host.**

-   ✅ Scripts provided for start/stop (`start-all-stacks.sh`, `stop-all-stacks.sh`)
-   ✅ Services: APIs, documentation, monitoring, databases
-   📖 See: `scripts/start-all-services.sh` and infrastructure compose files for details

### Telegram Stack (Official Production Stack)

**Complete Telegram integration with 12 containers (8 core + 4 monitoring):**

**Official Compose File:** `tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml`

**Core Services (8):**
- TimescaleDB (5434) - Time-series database for messages
- PgBouncer (6434) - Connection pooling
- Redis Master/Replica/Sentinel (6379/6385/26379) - HA caching
- RabbitMQ (5672/15672) - Message broker
- MTProto (14007) - Telegram client gateway
- Gateway API (14010) - REST API for Telegram operations

**Monitoring Services (4):**
- Prometheus (9090) - Metrics collection
- Grafana (3100) - Visualization dashboards
- Postgres Exporter (9187) - Database metrics
- Redis Exporter (9121) - Cache metrics

**Quick Start:**
```bash
cd tools/compose
docker compose -f docker-compose.4-2-telegram-stack-minimal-ports.yml up -d
```

**Documentation:**
- 📖 Deployment Guide: `docs/content/tools/telegram/deployment-guide.mdx`
- 📖 Issues & Solutions: `TELEGRAM-ISSUES-SUMMARY.md`
- 📖 Monitoring Integration: `docs/TELEGRAM-MONITORING-INTEGRATION.md`
- 📖 Port Registry: `docs/content/tools/ports-services.mdx`

**Health Check:**
```bash
docker ps --filter "label=com.tradingsystem.stack=telegram-gateway"
```

## 🏗️ Project Structure (v2.1)

**MAJOR UPDATE (2025-10-12):** Enhanced structure with organized documentation and services!

```
TradingSystem/
├── backend/                        # 🎯 ALL BACKEND CODE
│   ├── api/                       # REST APIs (Node.js/Express)
│   │   ├── workspace/            # Port 3200 - Workspace API (Docker container only)
│   │   ├── tp-capital/           # Port 4005 - TP Capital ingestion (Docker container only)
│   │   ├── documentation-api/    # Port 3400 - Documentation management (container only)
│   │   └── telegram-gateway/     # Port 3201 - Telegram Gateway API (reference code)
│   ├── data/                      # Data layer
│   │   ├── questdb/              # QuestDB schemas & migrations
│   │   └── warehouse/            # Data warehouse configs
│   ├── services/                  # Core microservices (future)
│   │   ├── data-capture/         # C# + ProfitDLL (planned)
│   │   ├── order-manager/        # C# + Risk Engine (planned)
│   │   └── analytics-pipeline/   # Python + ML (planned)
│   └── shared/                    # Shared libraries
│       ├── logger/               # Centralized logging
│       └── metrics/              # Prometheus metrics
│
├── frontend/                      # 🎨 ALL FRONTEND CODE
│   ├── apps/
│   │   └── dashboard/            # Port 3103 - Main React dashboard
│   │       ├── src/components/   # UI components
│   │       ├── src/store/        # Zustand state management
│   │       └── src/hooks/        # Custom React hooks
│   └── shared/
│       ├── assets/               # Branding, icons, images
│       └── styles/               # Tailwind configs
│
├── docs/                          # 📚 DOCUMENTATION HUB (Docusaurus v3)
│   ├── content/                  # All documentation content
│   │   ├── apps/                 # Application docs (Workspace, TP Capital, etc.)
│   │   ├── api/                  # API specifications (Redocusaurus)
│   │   ├── frontend/             # UI components, design system
│   │   ├── database/             # Schemas, migrations
│   │   ├── tools/                # Development tools
│   │   ├── sdd/                  # Software design documents
│   │   ├── prd/                  # Product requirements
│   │   ├── reference/            # Templates, ADRs
│   │   └── diagrams/             # PlantUML diagrams
│   ├── governance/               # Documentation standards
│   ├── migration/                # Migration artifacts
│   ├── src/                      # Docusaurus source code
│   └── static/                   # Static assets (specs, images)
│
├── tools/                # 🔧 DEVOPS & INFRASTRUCTURE
│   ├── monitoring/               # Prometheus, Grafana configs
│   ├── scripts/                  # Automation scripts
│   ├── systemd/                  # Linux service definitions
│   ├── tp-capital/              # TP Capital specific infra
│   └── docker/                   # Docker compositions
│
├── compose.dev.yml               # Main development compose
└── .github/                      # GitHub Actions workflows
    └── workflows/
        ├── code-quality.yml      # Linting, formatting
        └── docs-deploy.yml       # Documentation deployment
```

## 🎯 Architecture Principles

### Clean Architecture (Layered)

-   **Domain Layer** → Entities, Value Objects, Aggregates, Business Rules
-   **Application Layer** → Use Cases, Commands, Queries, Services
-   **Infrastructure Layer** → ProfitDLL, WebSocket, Parquet, HTTP Clients
-   **Presentation Layer** → Controllers, APIs, Dashboard Components

### Domain-Driven Design (DDD)

-   **Aggregates**: `OrderAggregate`, `TradeAggregate`, `PositionAggregate`
-   **Value Objects**: `Price`, `Symbol`, `Quantity`, `Timestamp`
-   **Domain Events**: `OrderFilledEvent`, `SignalGeneratedEvent`, `PositionUpdatedEvent`
-   **Repositories**: `ITradeRepository`, `IOrderRepository`, `ISignalRepository`
-   **Ubiquitous Language**: Trade, Order, Signal, Position, Risk, Execution

### Microservices Architecture

Each service has single responsibility, independent deployment as Windows processes/services, communicates via WebSocket (data) + HTTP (commands).

## 🔄 System Data Flow

```
1. ProfitDLL Callback (C#)
   ↓
2. DataCapture validates & serializes → JSON
   ↓
3. WebSocket Publisher streams to internal consumers
   ↓
4. Gateway receives and validates trading commands (HTTP)
   ↓
5. OrderManager performs risk checks → Execute via ProfitDLL
   ↓
6. OrderCallback updates positions
   ↓
7. Dashboard real-time update (WebSocket)
```

## 🔌 ProfitDLL Integration

### Critical Requirements

-   **MUST compile in x64 mode** - ProfitDLL is 64-bit only
-   DLL location: `tools/ProfitDLL/`
-   Example code: `tools/ProfitDLL/Exemplo C#/`, `tools/ProfitDLL/Exemplo Python/`, `tools/ProfitDLL/Exemplo C++/`, `tools/ProfitDLL/Exemplo Delphi/`
-   Manual: `tools/ProfitDLL/Manual/` (português e inglês)

### Authentication

-   `DLLInitializeMarketLogin` - Market data only
-   `DLLInitializeLogin` - Market data + order routing
-   Requires: activation_key, username, password

### Connection States (TStateCallback)

-   State 0: Login (0=OK, 1=Invalid, 2=Wrong Password)
-   State 1: Broker (0=Disconnected, 2=Connected, 5=HCS Connected)
-   State 2: Market (4=Connected, 3=Not Logged)
-   State 3: Activation (0=Valid, else Invalid)

### Key Callbacks (MUST keep alive - GC prevention)

-   `TStateCallback` - Connection state
-   `TConnectorTradeCallback` - Trade events
-   `TOfferBookCallback` - Order book updates
-   `TConnectorOrderCallback` - Order execution
-   `TConnectorPriceDepthCallback` - Aggregated book

### Subscription Pattern

```csharp
// Wait for connection
if (bMarketConnected && bAtivo) {
    // Subscribe: "ASSET:EXCHANGE"
    SubscribeTicker("WINZ25", "B");
    SubscribeOfferBook("PETR4", "B");
}
```

### Order Execution

-   Market orders: `Price = -1`
-   Stop orders: Set both `Price` and `StopPrice`
-   Position types: `1 = DayTrade`, `2 = Consolidated`
-   Error codes: `NL_OK = 0x00000000`, negative = error

## 📡 Communication Protocols

### WebSocket (Market Data)

-   Port: `9001`
-   Format: JSON
-   Fields: `symbol`, `price`, `volume`, `aggressor`, `timestamp`
-   Buffer: 10,000 msgs (FIFO overflow)
-   Auto-reconnect: Every 5s

### HTTP REST - Traefik API Gateway (PRODUCTION)

**⚠️ IMPORTANT:** All HTTP services are now routed through Traefik API Gateway.

**API Gateway:**
- **HTTP Gateway**: `http://localhost:9080` (main entrypoint)
- **Dashboard**: `http://localhost:9081` (Traefik monitoring UI)
- **Metrics**: `http://localhost:9080/metrics` (Prometheus format)

**Services via Gateway (RECOMMENDED):**
- **Dashboard UI**: `http://localhost:9080/` (React + Vite)
- **Workspace API**: `http://localhost:9080/api/workspace/*` → `/api/*`
- **Docs Hub**: `http://localhost:9080/docs/` (Docusaurus v3)
- **Docs API**: `http://localhost:9080/api/docs/*` → `/api/*`
- **TP Capital**: `http://localhost:9080/api/tp-capital/*` → `/*`

**Direct Access (Development/Debug Only):**
- Dashboard: `http://localhost:3103`
- Workspace API: `http://localhost:3210`
- Docs Hub: `http://localhost:3404`
- Docs API: `http://localhost:3405`
- TP Capital: `http://localhost:4008`

### Gateway Features

- ✅ **Automatic Service Discovery** - Docker labels
- ✅ **CORS** - Configured for localhost:3103, localhost:9080
- ✅ **Security Headers** - X-Frame-Options, XSS protection
- ✅ **Rate Limiting** - 100 req/min per IP (burst 50)
- ✅ **Compression** - gzip/brotli (>1KB responses)
- ✅ **Circuit Breaker** - Opens at 20% error rate
- ✅ **Health Checks** - All services monitored at 30s intervals
- ✅ **Access Logs** - JSON format for analysis
- ✅ **Prometheus Metrics** - Request counts, latencies, errors

### Current API Endpoints (via Gateway)

-   **Workspace**: `GET/POST /api/workspace/items` - Manage workspace items
-   **TP Capital**: `GET /api/tp-capital/signals` - Get trading signals
-   **TP Capital**: `POST /api/tp-capital/webhook/telegram` - Telegram ingestion
-   **Documentation**: `GET/POST /api/docs/search` - Search documentation
-   **Firecrawl Proxy**: `POST /api/scrape` - Web scraping (direct access only)
-   **RAG System** (via Documentation API proxy):
    -   `GET /api/docs/rag/search` - Semantic search (JWT minted server-side)
    -   `POST /api/docs/rag/query` - Q&A with RAG context (JWT minted server-side)

### Future Trading Endpoints (Planned)

-   `POST /api/v1/execute` - Execute order
-   `POST /api/v1/risk/kill-switch` - Emergency stop
-   `GET /api/v1/signals/latest` - Recent signals
-   `GET /api/v1/positions` - Current positions
-   `GET /api/v1/metrics` - Performance metrics

## 🤖 ML Cause-and-Effect Model

**Concept**: Identify relationships between market conditions (causes) and price movements (effects).

**Features**: aggressor_flow, volatility_roll, book_delta, volume_anomaly, ma_price
**Window**: Rolling k ticks or seconds
**Algorithm**: `SGDClassifier.partial_fit()` (incremental learning)
**Classification**:

-   `ret_fut > +threshold` → BUY
-   `ret_fut < -threshold` → SELL
-   Neutral zone → HOLD
    **Feedback**: Model adjusts based on actual trade outcomes

## 🛡️ Risk Management

-   Global kill switch: `/api/v1/risk/kill-switch`
-   Daily loss limit (configured in `.env`)
-   Max position size
-   Trading hours restriction (9:00-18:00 default)
-   Auto-pause on connection errors/high latency
-   All executions audited (timestamp + justification)

## 💾 Data Storage

-   **Format**: Parquet (columnar, compressed)
-   **Structure**: `/backend/data/parquet/{asset}/{date}/trades.parquet`
-   **Logs**: JSONL structured (`/backend/data/logs/{service}/{date}.jsonl`)
-   **Models**: `/backend/data/models/{model_name}/{version}.pkl`
-   **Backups**: Incremental daily (`/backend/data/backups/{date}/`)

## 🚀 Development Commands

### ⚡ Universal Startup (Recomendado)

**O TradingSystem agora possui um comando universal de startup!**

#### Instalação (Uma Vez)

```bash
# Executar instalador de shortcuts
bash install-shortcuts.sh

# Recarregar shell
source ~/.bashrc  # ou source ~/.zshrc
```

#### Uso Diário

```bash
# Startup completo (Docker + Node.js)
start

# Parar todos os serviços (gracefully)
stop

# Force kill tudo
stop --force

# Ver status
status

# Health check completo
health

# Ver logs em tempo real
logs
```

#### Opções Avançadas

```bash
# Startup
start-docker          # Apenas containers Docker
start-services        # Apenas serviços Node.js
start-minimal         # Modo mínimo (essenciais)
start --force-kill    # Force restart (mata processos em portas ocupadas)
start --help          # Ajuda completa

# Shutdown
stop-docker           # Parar apenas containers Docker
stop-services         # Parar apenas serviços Node.js
stop-force            # Force kill tudo (SIGKILL)
stop --clean-logs     # Parar e limpar logs
stop --help           # Ajuda completa
```

### Manual Startup (Alternativa)

Se preferir iniciar serviços manualmente:

```bash
# Dashboard (Port 3103)
cd frontend/dashboard
npm install && npm run dev

# Documentation Hub (Port 3400) - runs as Docker container (docs-hub)
# Started automatically by `start` command via docker-compose.2-docs-stack.yml
# For manual start: docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d

# API Services (Ports 3200-3600)
# Workspace API, TP Capital, Documentation API, and Firecrawl Proxy run as Docker containers:
docker compose -f tools/compose/docker-compose.apps.yml up -d workspace
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d documentation-api
docker compose -f tools/compose/docker-compose.firecrawl.yml up -d firecrawl-proxy
```

### Container Management (Docker Compose)

Auxiliary services run through Docker Compose stacks. Use the helper scripts or compose files directly:

```bash
# Start all stacks (infra, data, monitoring, frontend, ai tools)
bash scripts/docker/start-stacks.sh

# Stop all stacks
bash scripts/docker/stop-stacks.sh

# Or manage individual stacks
docker compose -f tools/compose/docker-compose.infra.yml up -d
docker compose -f tools/compose/docker-compose.infra.yml down
```

Compose files are located under `tools/compose/`, `tools/monitoring/`, `frontend/compose/`, and `ai/compose/`.

### Production Deployment (Future - Windows Services)

```powershell
# For core trading services (when implemented)
# Install as Windows Services (run as Administrator)
.\scripts\setup\install-windows-services.ps1

# Start all services
sc.exe start TradingSystem-DataCapture
sc.exe start TradingSystem-Gateway
sc.exe start TradingSystem-OrderManager
```

### Testing

```bash
# Frontend Tests
cd frontend/dashboard
npm run test

# Backend API Tests (run inside container)
docker exec workspace-service npm run test

# Documentation Tests
cd docs
npm run test

# E2E Tests (when available)
npm run test:e2e

# Load Tests (when available)
npm run test:load
```

### Health Monitoring

```bash
# Check all services, containers, and databases
bash scripts/maintenance/health-check-all.sh

# JSON output for automation
bash scripts/maintenance/health-check-all.sh --format json | jq '.overallHealth'

# Prometheus metrics export
bash scripts/maintenance/health-check-all.sh --format prometheus

# Check only local services
bash scripts/maintenance/health-check-all.sh --services-only

# Check only Docker containers
bash scripts/maintenance/health-check-all.sh --containers-only

```

## 📝 Development Guidelines

### ⚠️ Execução de Comandos Privilegiados (sudo)

**REGRA: Quando necessário executar um comando `sudo` que requer senha do usuário:**

1. **NUNCA execute diretamente** comandos que solicitam senha interativa no terminal
2. **SEMPRE crie um script** contendo os comandos necessários
3. **Informe claramente ao usuário**:
   - Qual script foi criado e sua localização
   - Por que o comando precisa de privilégios elevados
   - Quais comandos serão executados (mostrar conteúdo do script)
   - Instruções para executar: `sudo bash caminho/do/script.sh`
4. **AGUARDE confirmação do usuário** antes de continuar com próximas etapas
5. **Marque como concluído** após confirmação do usuário

**Exemplo de comunicação:**

```
Criei o script /home/marce/Projetos/TradingSystem/scripts/setup-permissions.sh
que precisa ser executado com privilégios de administrador.

O script irá:
- Modificar permissões do diretório /var/log/trading
- Adicionar seu usuário ao grupo 'docker'

Por favor, execute:
sudo bash /home/marce/Projetos/TradingSystem/scripts/setup-permissions.sh

Aguardando sua confirmação após a execução...
```

**Scripts de manutenção/setup devem ser salvos em**:
- `scripts/setup/` - Scripts de configuração inicial
- `scripts/maintenance/` - Scripts de manutenção do sistema
- `scripts/docker/` - Scripts relacionados ao Docker

---

### ⚠️ CRITICAL: Traefik API Gateway Requirements

**RULE: ALL new HTTP services MUST be integrated with Traefik API Gateway.**

**Mandatory Requirements:**

1. **Docker Labels** - All services MUST have proper Traefik labels:
   ```yaml
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.{service}.rule=PathPrefix(`/path`)"
     - "traefik.http.routers.{service}.priority={number}"
     - "traefik.http.services.{service}.loadbalancer.server.port={port}"
     - "traefik.http.routers.{service}.middlewares=api-standard@file"
   ```

2. **Health Endpoint** - MUST implement `/health` endpoint:
   ```json
   {
     "status": "healthy",
     "service": "service-name",
     "timestamp": "2025-11-11T12:00:00Z"
   }
   ```

3. **Network Membership** - Gateway MUST be in service's network:
   ```yaml
   networks:
     - tradingsystem_backend  # For APIs
     # or
     - tradingsystem_frontend  # For UIs
   ```

4. **Priority Allocation**:
   - Catch-all routes (Dashboard): 1-10
   - Standard APIs: 50-89
   - Specific path prefixes: 90-100

5. **Path Transformation** - Document expected paths clearly:
   ```yaml
   # Gateway: /api/workspace/items → Backend: /api/items
   - "traefik.http.middlewares.{service}-path-transform.chain.middlewares={service}-strip,{service}-addapi"
   ```

**Validation:**
```bash
# Before committing, validate configuration
bash scripts/gateway/validate-traefik.sh --verbose

# Test service via gateway
curl http://localhost:9080/{your-path}
```

**Policy Document:** `governance/policies/api-gateway-policy.md`
**Migration Guide:** `docs/TRAEFIK-GATEWAY-MIGRATION.md`

---

### ⚠️ CRITICAL: Environment Variables Configuration

**RULE: ALL applications, services, and containers MUST use the centralized `.env` file from project root.**

**NEVER create local `.env` files!** Always reference the root `.env`:

✅ **Correct - Docker Compose**:

```yaml
services:
    my-service:
        env_file:
            - ../../.env # Always point to root
```

✅ **Correct - Node.js/Express**:

```javascript
import dotenv from "dotenv";
import path from "path";

const projectRoot = path.resolve(__dirname, "../../../../");
dotenv.config({ path: path.join(projectRoot, ".env") });
```

✅ **Correct - Vite/React**:

```javascript
// Vite automatically loads .env from project root
// No configuration needed!
```

❌ **WRONG - Local .env**:

```javascript
// DON'T DO THIS!
dotenv.config({ path: "./.env" }); // ❌ Local file
```

**Quick Start for New Services**:

```bash
# 1. Add variables to root .env.example
# 2. Update root .env with values
# 3. Configure service to load from root
# 4. NEVER create service-specific .env files

# Validate after changes
bash scripts/env/validate-env.sh
```

**Documentation**: See `docs/content/tools/security-config/env.mdx` for the complete guide.

---

### When working with Docusaurus (CRITICAL):

-   **NEVER restart docs-hub container without checking build first**
-   **ALWAYS rebuild Docusaurus after content changes**: `cd docs && npm run docs:build`
-   **Use emergency recovery for 500 errors**: `bash scripts/docs/emergency-recovery.sh`
-   **Follow SOP**: See `governance/controls/docusaurus-deployment-sop.md`
-   **AI Agent Guide**: See `docs/content/tools/documentation/docusaurus/ai-agent-troubleshooting-guide.mdx`

### When working with Governance JSON (CRITICAL):

-   **ALWAYS sanitize file content before embedding in JSON payloads**
-   **NEVER directly include raw file content in JSON.stringify()**
-   **Use `sanitizeForJson()` function to remove control characters**
-   **Validate after regeneration**: `bash scripts/governance/validate-governance-json.sh`
-   **Regenerate snapshot**: `node governance/automation/governance-metrics.mjs`
-   **Follow SOP**: See `governance/controls/governance-json-sanitization-sop.md`

### When working with ProfitDLL callbacks:

-   Store delegates as **static fields** to prevent GC
-   Use `[MarshalAs(UnmanagedType.LPWStr)]` for strings
-   Match `CallingConvention.StdCall`
-   Never do heavy work inside callbacks (use queues)

### When modifying orders:

-   Always test in simulation mode
-   Verify risk checks enforced
-   Ensure audit logging complete
-   Never bypass kill switch

### When creating documentation (REQUIRED):

-   **MUST include YAML frontmatter** with all required fields (title, tags, domain, type, summary, status, last_review)
-   **MUST include PlantUML diagrams** for architecture/design documents (ADR, RFC, Technical Specs)
-   **MUST provide both** `.puml` source file AND embedded rendering in markdown
-   Follow governance guides: `governance/controls/VALIDATION-GUIDE.md`
-   Use appropriate diagram types: Component, Sequence, State, Class, Deployment
-   Test rendering in Docusaurus before committing (`cd docs && npm run start -- --port 3400`)
-   See examples: `docs/content/diagrams/plantuml-guide.mdx`

### When working with documentation:

-   **ALWAYS edit** files in `docs/content/` (canonical source for Docusaurus)
-   **NEVER edit** files in `docs/build/` (generated by Docusaurus build)
-   **NEVER edit** files in `frontend/dashboard/public/docs/` (copied from `docs/content/` by build scripts)
-   PRDs are organized by product within `docs/content/prd/`
-   Follow governance checklists: `governance/controls/REVIEW-CHECKLIST.md`

### When working with Vite Proxy Configuration (CRITICAL):

⚠️ **READ THIS FIRST:** `docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md`

**The #1 cause of "API Indisponível" errors** is incorrect proxy configuration. Follow these rules religiously:

1. **NEVER use `VITE_` prefix for container hostnames**
   ```bash
   # ❌ WRONG - Exposes to browser
   VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200

   # ✅ CORRECT - Server-side only
   WORKSPACE_PROXY_TARGET=http://workspace-api:3200
   ```

2. **ALWAYS use relative paths in browser code**
   ```typescript
   // ❌ WRONG - Hardcoded localhost URL
   const url = 'http://localhost:3200/api/items';

   // ✅ CORRECT - Relative path (Vite proxy)
   const url = '/api/workspace/items';
   ```

3. **ALWAYS validate after changes**
   ```bash
   bash scripts/env/validate-env.sh
   ```

4. **ALWAYS rebuild container after config changes**
   ```bash
   docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d --build
   ```

5. **ESLint will catch hardcoded URLs** - Fix immediately if you see:
   > ❌ Use relative paths instead of localhost URLs

**Pattern:**
- Browser → Relative path `/api/workspace/*`
- Vite Proxy → Forwards to `workspace-api:3200/api/*`
- Container → Returns data

**If you see "API Indisponível":**
1. Check for `VITE_` prefix on proxy targets → Remove it
2. Check for hardcoded localhost URLs → Change to relative paths
3. Rebuild container → Test with curl → Verify in browser

### When working with RAG/LlamaIndex system:

-   **Use proxy endpoints** (`/api/v1/rag/*`) instead of direct access for security
-   **JWT tokens** are minted server-side in Documentation API - never expose in browser
-   **Unified domain mode**: Set `VITE_USE_UNIFIED_DOMAIN=true` to use reverse proxy automatically
-   **Embedding model**: `mxbai-embed-large` (384 dimensions) is the current standard
-   **LLM model**: `llama3.2:3b` for faster responses
-   **Qdrant collection**: `docs_index_mxbai` (fallback to `docs_index` if empty)
-   **Health checks**: Dashboard auto-checks proxy health every 30s with visual feedback
-   **Mode switching**: Runtime toggle between proxy/direct/auto without restart
-   **Validation**: Use `bash scripts/docker/validate-llamaindex-local.sh` before committing
-   **Query script**: `bash scripts/tools/query-llamaindex.sh` for CLI testing

### Code Style:

-   C#: PascalCase, 4 spaces, follow `.editorconfig`
-   Python: snake_case, Black formatter (88 chars)
-   TypeScript: camelCase, 2 spaces, ESLint rules
-   Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

## 🔐 Security & Configuration

-   **Never commit**: `.env`, `appsettings.*.json`, credentials
-   **Use**: `config/development/.env.example` as template
-   **Encrypt**: Credentials in production (`ENCRYPT_CREDENTIALS=true`)
-   **Audit**: All orders logged with timestamp + reason
-   **Sandbox**: Local execution only, no external APIs

## 📚 Documentation

**Centralized in `/docs` with Docusaurus v3:**

### Core Documentation Standards

-   **[docs/README.md](docs/README.md)** - Documentation hub overview
-   **[governance/controls/VALIDATION-GUIDE.md](governance/controls/VALIDATION-GUIDE.md)** - Validation suite and quality standards
-   **[governance/controls/REVIEW-CHECKLIST.md](governance/controls/REVIEW-CHECKLIST.md)** - Review process and criteria

### Documentation Hub (Port 3400)

-   **[docs/README.md](docs/README.md)** - Main documentation portal
-   **[docs/content/](docs/content/)** - All documentation content

### Apps Documentation

-   **[docs/content/apps/workspace/](docs/content/apps/workspace/)** - Workspace app (Port 3200)
-   **[docs/content/apps/tp-capital/](docs/content/apps/tp-capital/)** - TP Capital app (Port 4005)
-   **[docs/content/apps/order-manager/](docs/content/apps/order-manager/)** - Order Manager (planned)
-   **[docs/content/apps/data-capture/](docs/content/apps/data-capture/)** - Data Capture (planned)

### API Documentation

-   **[docs/content/api/overview.mdx](docs/content/api/overview.mdx)** - API catalogue
-   **[docs/content/api/order-manager.mdx](docs/content/api/order-manager.mdx)** - Order Manager API
-   **[docs/content/api/data-capture.mdx](docs/content/api/data-capture.mdx)** - Data Capture API
-   **Redocusaurus Integration**: http://localhost:3400/api/documentation-api, http://localhost:3400/api/workspace

### Frontend Documentation

-   **[docs/content/frontend/design-system/](docs/content/frontend/design-system/)** - Design tokens, components, theming
-   **[docs/content/frontend/guidelines/](docs/content/frontend/guidelines/)** - Style guide, accessibility, i18n
-   **[docs/content/frontend/engineering/](docs/content/frontend/engineering/)** - Architecture, conventions, testing

### Database Documentation

-   **[docs/content/database/overview.mdx](docs/content/database/overview.mdx)** - Architecture and data stores
-   **[docs/content/database/schema.mdx](docs/content/database/schema.mdx)** - Table definitions and ER diagrams
-   **[docs/content/database/migrations.mdx](docs/content/database/migrations.mdx)** - Migration strategy
-   **[docs/content/database/retention-backup.mdx](docs/content/database/retention-backup.mdx)** - Data lifecycle policies

### Tools Documentation

-   **[docs/content/tools/](docs/content/tools/)** - Development tools (Node.js, .NET, Python, Docker, PlantUML, Docusaurus)
-   **[docs/content/tools/security-config/](docs/content/tools/security-config/)** - Environment variables, risk limits, audit
-   **[docs/content/tools/ports-services/](docs/content/tools/ports-services/)** - Service port map (auto-generated)

### Product & Design Documentation

-   **[docs/content/prd/](docs/content/prd/)** - Product requirements and feature briefs
-   **[docs/content/sdd/](docs/content/sdd/)** - Software design documents (schemas, events, flows, API specs)
-   **[docs/content/reference/](docs/content/reference/)** - Templates, ADRs, standards
-   **[docs/content/diagrams/](docs/content/diagrams/)** - PlantUML architectural diagrams

## 🔗 Reference Code

-   C# ProfitDLL init: `tools/ProfitDLL/Exemplo C#/Program.cs`
-   C# Callbacks: `tools/ProfitDLL/Exemplo C#/CallbackHandler.cs`
-   Python init: `tools/ProfitDLL/Exemplo Python/main.py`
-   Delphi example: `tools/ProfitDLL/Exemplo Delphi/`
-   C++ example: `tools/ProfitDLL/Exemplo C++/main.cpp`

## 🏛️ Architecture & Quality Guidelines

### Architecture Review Status

**Last Review:** 2025-11-01 | **Grade:** B+ (Good, with room for optimization)
**Report:** [governance/evidence/reports/reviews/architecture-2025-11-01/index.md](governance/evidence/reports/reviews/architecture-2025-11-01/index.md)

### Current Architectural Strengths

✅ **Clean Architecture + DDD** - Well-defined layers and domain boundaries
✅ **Microservices** - Single responsibility per service with clear APIs
✅ **Security-First** - JWT authentication, rate limiting, CORS, Helmet
✅ **Modern Stack** - React 18, Zustand, TanStack Query, Docker Compose
✅ **Documentation** - 135+ pages with Docusaurus v3, RAG-powered search
✅ **Observability** - Health checks, structured logging, Prometheus metrics

### Critical Improvement Areas (Active)

⚠️ **No API Gateway** - Centralized auth/routing needed (Kong/Traefik)
⚠️ **Inter-Service Auth Missing** - Services trust each other without verification
⚠️ **Single DB Instance** - TimescaleDB needs read replicas for HA
⚠️ **Limited Test Coverage** - Currently ~30%, target 80%
⚠️ **No API Versioning** - Breaking changes will affect clients
⚠️ **Frontend Bundle Size** - ~800KB, needs code splitting
⚠️ **Circuit Breakers Missing** - WebSocket/ProfitDLL paths lack fault tolerance

### Best Practices (Newly Documented)

#### Service Layer Pattern
```javascript
// ✅ GOOD: Separate business logic from HTTP handlers
class OrderService {
  async createOrder(orderData) {
    // Validation, business rules, risk checks
    const validatedOrder = await this.validateOrder(orderData);
    return await this.orderRepository.save(validatedOrder);
  }
}

// ❌ BAD: Business logic in route handler
app.post('/api/orders', (req, res) => {
  // Mixing HTTP and business logic
  if (!req.body.symbol) return res.status(400).json({...});
  db.query('INSERT INTO orders...'); // Direct DB access
});
```

#### Circuit Breaker for Critical Paths
```javascript
// ✅ GOOD: Protect external calls with circuit breaker
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(callProfitDLL, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fallback(() => ({ error: 'Service unavailable' }));
breaker.on('open', () => logger.error('Circuit breaker opened!'));
```

#### Inter-Service Authentication
```javascript
// ✅ GOOD: Verify service-to-service calls
const INTER_SERVICE_SECRET = process.env.INTER_SERVICE_SECRET;

function verifyServiceAuth(req, res, next) {
  const serviceToken = req.headers['x-service-token'];
  if (serviceToken !== INTER_SERVICE_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.use('/internal/*', verifyServiceAuth);
```

#### API Versioning Strategy
```javascript
// ✅ GOOD: URL-based versioning for breaking changes
app.use('/api/v1/orders', ordersRouterV1);
app.use('/api/v2/orders', ordersRouterV2);

// ⚠️ ACCEPTABLE: Header-based versioning
app.use((req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version;
  next();
});
```

#### Frontend Code Splitting
```typescript
// ✅ GOOD: Route-based lazy loading
import { lazy, Suspense } from 'react';

const LlamaIndexPage = lazy(() => import('./components/pages/LlamaIndexPage'));
const WorkspacePage = lazy(() => import('./components/pages/WorkspacePageNew'));

<Route path="/llama" element={
  <Suspense fallback={<LoadingSpinner />}>
    <LlamaIndexPage />
  </Suspense>
} />
```

#### Error Boundaries (React)
```typescript
// ✅ GOOD: Catch runtime errors gracefully
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error({ error, errorInfo });
    // Send to Sentry/monitoring
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Technical Debt Tracking

**Critical (P1):**
- Missing tests (Effort: 4 weeks)
- No API gateway (Effort: 2 weeks)
- Single DB instance (Effort: 3 weeks)

**High (P2):**
- Circular dependencies (Effort: 2 weeks)
- No API versioning (Effort: 1 week)

**Medium (P3):**
- Code duplication (Effort: 2 weeks)
- Hardcoded configurations (Effort: 1 week)

**See:** [Architecture Review](governance/evidence/reports/reviews/architecture-2025-11-01/index.md) for detailed action plan.

---

## ⚠️ Important Reminders

-   ✅ Always build x64 (ProfitDLL requirement)
-   ✅ Check connection state before operations
-   ✅ Validate asset format: "TICKER:EXCHANGE"
-   ✅ Use UTC timezone, adjust for market hours
-   ✅ Test with replay data before live
-   ✅ Run health checks before deployments (`bash scripts/maintenance/health-check-all.sh`)
-   ✅ Follow architecture patterns (Service Layer, Circuit Breaker, Error Boundaries)
-   ✅ Implement security best practices (inter-service auth, API versioning)
-   ❌ Never skip risk checks
-   ❌ Never hardcode credentials
-   ❌ Never process heavy logic in callbacks
-   ❌ Never create services without circuit breakers for external calls
-   ❌ Never deploy without adequate test coverage (target: 80%)

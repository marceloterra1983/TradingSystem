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

Always open `@/openspec/AGENTS.md` when the request:

-   Mentions planning or proposals (words like proposal, spec, change, plan)
-   Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
-   Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

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

### Core Documentation Structure

The project uses **Docusaurus v3** for comprehensive documentation under `/docs/`:

1. **[docs/README.md](docs/README.md)** - Documentation hub overview (START HERE)
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
3. **[docs/governance/](docs/governance/)** - Documentation governance and quality standards
4. **[docs/migration/](docs/migration/)** - Migration artifacts and history

### Key Documentation Locations

-   **Architecture Decisions**: `docs/content/reference/adrs/` (ADRs)
-   **Product Requirements**: `docs/content/prd/products/` (organized by product)
-   **Implementation Guides**: `docs/content/frontend/guides/` & `docs/content/apps/*/`
-   **API Documentation**: `docs/content/api/` (service-specific docs with Redocusaurus)
-   **Feature Documentation**: `docs/content/frontend/features/` & `docs/content/apps/*/features/`
-   **Data Schemas**: `docs/content/database/schema.mdx` (QuestDB, TimescaleDB, LowDB)
-   **Health Monitoring**: `docs/content/tools/monitoring/`

### Active Services & Ports

-   **Dashboard**: http://localhost:3103 (React + Vite)
-   **Documentation Hub**: http://localhost:3400 (Docusaurus v3 via NGINX)
-   **Workspace API**: http://localhost:3200 (Express + TimescaleDB - Docker container only)
-   **TP Capital**: http://localhost:4005 (Express + Telegraf - Docker container only)
-   **Documentation API**: http://localhost:3401 (Express + FlexSearch)
-   **Service Launcher**: http://localhost:3500 (Express)
-   **Firecrawl Proxy**: http://localhost:3600 (Express + Firecrawl)

## 🖥️ Claude Code CLI

**Claude Code CLI is installed globally** for terminal-based development workflow.

### Quick Start

```bash
# Navigate to project and run Claude Code
cd /home/marce/projetos/TradingSystem
claude

# Or use custom commands
/health-check all
/service-launcher start dashboard
/docker-compose start-all
```

### Features

-   ✅ **Custom Commands** - Project-specific shortcuts (`claude/commands/`)
-   ✅ **MCP Servers** - 7 integrated servers (filesystem, git, fetch, memory, etc.)
-   ✅ **Terminal Integration** - Works seamlessly in Cursor's terminal (WSL2)
-   ✅ **Project Configuration** - Automatic loading of rules and settings

### Documentation

**Complete CLI guide**: [`claude/CLAUDE-CLI.md`](claude/CLAUDE-CLI.md)

**Custom commands**:

-   `/git-workflows` - Git operations with Conventional Commits
-   `/docker-compose` - Docker stack management
-   `/health-check` - System health monitoring
-   `/service-launcher` - Service orchestration
-   `/scripts` - Direct access to project scripts

**Configuration files**:

-   `~/.claude.json` - Global config (API key, MCP servers)
-   `.claude-plugin` - Project settings
-   `claude/commands/` - Custom commands
-   `claude/mcp-servers.json` - MCP configuration

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

## 🏗️ Project Structure (v2.1)

**MAJOR UPDATE (2025-10-12):** Enhanced structure with organized documentation and services!

```
TradingSystem/
├── backend/                        # 🎯 ALL BACKEND CODE
│   ├── api/                       # REST APIs (Node.js/Express)
│   │   ├── workspace/            # Port 3200 - Workspace API (Docker container only)
│   │   ├── tp-capital/           # Port 4005 - TP Capital ingestion (Docker container only)
│   │   ├── documentation-api/    # Port 3400 - Documentation management (container only)
│   │   ├── service-launcher/     # Port 3500 - Service orchestration
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

### HTTP REST (Current Services)

-   **Dashboard**: `http://localhost:3103` (React + Vite)
-   **Documentation Hub**: `http://localhost:3400` (Docusaurus v3 via NGINX)
-   **Workspace API**: `http://localhost:3200` (Express + TimescaleDB - Docker container)
-   **TP Capital**: `http://localhost:4005` (Express + Telegraf - Docker container)
-   **Documentation API**: `http://localhost:3401` (Express + FlexSearch)
-   **Service Launcher**: `http://localhost:3500` (Express)
-   **Firecrawl Proxy**: `http://localhost:3600` (Express + Firecrawl)

### Current API Endpoints

-   **Workspace**: `GET/POST /api/items` - Manage workspace items (runs as Docker container)
-   **TP Capital**: `POST /webhook/telegram` - Telegram message ingestion
-   **Documentation**: `GET/POST /api/docs` - Documentation management
-   **Service Launcher**: `GET /api/status` - Service health checks, `GET /api/health/full` - Comprehensive health status (services + containers + databases)
-   **Firecrawl Proxy**: `POST /api/scrape` - Web scraping via Firecrawl

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
-   **Structure**: `/data/parquet/{asset}/{date}/trades.parquet`
-   **Logs**: JSONL structured (`/data/logs/{service}/{date}.jsonl`)
-   **Models**: `/data/models/{model_name}/{version}.pkl`
-   **Backups**: Incremental daily (`/data/backups/{date}/`)

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

# Documentation Hub (Port 3400)
cd docs
npm install && npm run start -- --port 3400

# API Services (Ports 3200-3600)
# Run each in a separate terminal

cd apps/service-launcher && npm install && npm run dev

# Workspace API, TP Capital, Documentation API, and Firecrawl Proxy run as Docker containers:
docker compose -f tools/compose/docker-compose.apps.yml up -d workspace
docker compose -f tools/compose/docker-compose.docs.yml up -d documentation-api
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

# Via Service Launcher API (with caching)
curl http://localhost:3500/api/health/full | jq '.overallHealth'

# Check cache status
curl -I http://localhost:3500/api/health/full | grep X-Cache-Status
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
-   Follow governance guides: `docs/governance/VALIDATION-GUIDE.md`
-   Use appropriate diagram types: Component, Sequence, State, Class, Deployment
-   Test rendering in Docusaurus before committing (`cd docs && npm run start -- --port 3400`)
-   See examples: `docs/content/diagrams/plantuml-guide.mdx`

### When working with documentation:

-   **ALWAYS edit** files in `docs/content/` (canonical source for Docusaurus)
-   **NEVER edit** files in `docs/build/` (generated by Docusaurus build)
-   **NEVER edit** files in `frontend/dashboard/public/docs/` (copied from `docs/content/` by build scripts)
-   PRDs are organized by product within `docs/content/prd/`
-   Follow governance checklists: `docs/governance/REVIEW-CHECKLIST.md`

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
-   **[docs/governance/VALIDATION-GUIDE.md](docs/governance/VALIDATION-GUIDE.md)** - Validation suite and quality standards
-   **[docs/governance/REVIEW-CHECKLIST.md](docs/governance/REVIEW-CHECKLIST.md)** - Review process and criteria

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

## ⚠️ Important Reminders

-   ✅ Always build x64 (ProfitDLL requirement)
-   ✅ Check connection state before operations
-   ✅ Validate asset format: "TICKER:EXCHANGE"
-   ✅ Use UTC timezone, adjust for market hours
-   ✅ Test with replay data before live
-   ✅ Run health checks before deployments (`bash scripts/maintenance/health-check-all.sh`)
-   ❌ Never skip risk checks
-   ❌ Never hardcode credentials
-   ❌ Never process heavy logic in callbacks

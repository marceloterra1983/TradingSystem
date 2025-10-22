<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Canonical Source for AI Agents**  
> `CLAUDE.md` é a fonte única de instruções para qualquer agente de IA neste projeto. O arquivo `AGENTS.md` na raiz é um link simbólico para este documento, garantindo que atualizações em um se reflitam automaticamente no outro.

## 📚 Quick Start for New Sessions

**IMPORTANT:** Before working on any task, understand the project structure and documentation organization:

### Core Documentation Structure (v2.1)
The project follows a **context-driven documentation architecture** under `/docs/context/`:

1. **[docs/README.md](docs/README.md)** - Main Docusaurus (START HERE)
2. **[docs/DOCUMENTATION-STANDARD.md](docs/DOCUMENTATION-STANDARD.md)** - Official documentation standard (YAML frontmatter, PlantUML)
3. **[docs/DIRECTORY-STRUCTURE.md](docs/DIRECTORY-STRUCTURE.md)** - Complete project structure guide (v2.1.2)
4. **[docs/context/](docs/context/)** - Context-driven documentation organized by domain:
   - **[backend/](docs/context/backend/)** - Backend services, APIs, data, architecture
   - **[frontend/](docs/context/frontend/)** - UI apps, components, features
   - **[shared/](docs/context/shared/)** - Cross-cutting concerns, product specs, tools
   - **[ops/](docs/context/ops/)** - Infrastructure, deployment, monitoring

### Key Documentation Locations
- **Architecture Decisions**: `docs/context/backend/architecture/decisions/` (ADRs)
- **Product Requirements**: `docs/context/shared/product/prd/` (PRDs in EN/PT)
- **Implementation Guides**: `docs/context/frontend/guides/` & `docs/context/backend/guides/`
- **API Documentation**: `docs/context/backend/api/` (service-specific docs)
- **API Hub (Frontend ↔ Backend)**: `docs/context/shared/integrations/frontend-backend-api-hub.md` — também disponível como aba `API Hub` no Docusaurus
- **Feature Documentation**: `docs/context/frontend/features/` (Idea Bank, Escopo Page, etc.)
- **Data Schemas**: `docs/context/backend/data/schemas/` (QuestDB, analytics, logging)

### Active Services & Ports
- **Dashboard**: http://localhost:3103 (React + Vite)
- **Docusaurus**: http://localhost:3004 (Docusaurus)
- **Library API**: http://localhost:3200 (Express + LowDB/QuestDB)
- **TP Capital**: http://localhost:3200 (Express + Telegraf)
- **B3**: http://localhost:3302 (Express)
- **Documentation API**: http://localhost:3400 (Express + FlexSearch)
- **Service Launcher**: http://localhost:3500 (Express)
- **Firecrawl Proxy**: http://localhost:3600 (Express + Firecrawl)

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

- ✅ Scripts provided for start/stop (`start-all-stacks.sh`, `stop-all-stacks.sh`)
- ✅ Services: APIs, documentation, monitoring, databases
- 📖 See: `scripts/start-all-services.sh` and infrastructure compose files for details

## 🏗️ Project Structure (v2.1)

**MAJOR UPDATE (2025-10-12):** Enhanced structure with organized documentation and services!

```
TradingSystem/
├── backend/                        # 🎯 ALL BACKEND CODE
│   ├── api/                       # REST APIs (Node.js/Express)
│   │   ├── workspace/            # Port 3200 - Library API (Ideas & Docs)
│   │   ├── tp-capital/           # Port 3200 - TP Capital ingestion
│   │   ├── b3-market-data/       # Port 3302 - B3 market data service
│   │   ├── documentation-api/    # Port 3400 - Documentation management
│   │   ├── service-launcher/     # Port 3500 - Service orchestration
│   │   └── firecrawl-proxy/      # Port 3600 - Firecrawl proxy service
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
├── docs/                          # 📚 DOCUSAURUS (Docusaurus)
│   ├── context/                  # Context-driven docs
│   │   ├── backend/              # Backend architecture, APIs, data
│   │   │   ├── architecture/     # ADRs, service maps
│   │   │   ├── api/              # API documentation
│   │   │   └── data/             # Schemas, migrations
│   │   ├── frontend/             # UI documentation
│   │   │   ├── features/         # Feature specs & guides
│   │   │   └── guides/           # Implementation guides
│   │   ├── shared/               # Cross-cutting concerns
│   │   │   ├── product/prd/      # Product requirements (EN/PT)
│   │   │   ├── diagrams/         # PlantUML diagrams
│   │   │   └── tools/            # Templates, standards
│   │   └── ops/                  # Operations, infrastructure
│   ├── static/                   # Static assets for docs
│   └── src/                      # Docusaurus source code
│
├── infrastructure/                # 🔧 DEVOPS & INFRASTRUCTURE
│   ├── monitoring/               # Prometheus, Grafana configs
│   ├── scripts/                  # Automation scripts
│   ├── systemd/                  # Linux service definitions
│   ├── tp-capital/              # TP Capital specific infra
│   ├── b3/                      # B3 integration configs
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
- **Domain Layer** → Entities, Value Objects, Aggregates, Business Rules
- **Application Layer** → Use Cases, Commands, Queries, Services
- **Infrastructure Layer** → ProfitDLL, WebSocket, Parquet, HTTP Clients
- **Presentation Layer** → Controllers, APIs, Dashboard Components

### Domain-Driven Design (DDD)
- **Aggregates**: `OrderAggregate`, `TradeAggregate`, `PositionAggregate`
- **Value Objects**: `Price`, `Symbol`, `Quantity`, `Timestamp`
- **Domain Events**: `OrderFilledEvent`, `SignalGeneratedEvent`, `PositionUpdatedEvent`
- **Repositories**: `ITradeRepository`, `IOrderRepository`, `ISignalRepository`
- **Ubiquitous Language**: Trade, Order, Signal, Position, Risk, Execution

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
4. Gateway receives trading commands (HTTP)
   ↓
5. OrderManager: Risk checks → Execute via ProfitDLL
   ↓
6. OrderCallback updates positions
   ↓
7. Dashboard real-time update (WebSocket)
```

## 🔌 ProfitDLL Integration

### Critical Requirements
- **MUST compile in x64 mode** - ProfitDLL is 64-bit only
- DLL reference: `project-hub/systems/documentacao/ProfitDLL/DLLs/Win64/ProfitDLL.dll`
- Example code: `project-hub/systems/documentacao/ProfitDLL/examples/`
- Manual: `project-hub/systems/documentacao/ProfitDLL/Manual - ProfitDLL pt_br.pdf` (também disponível em inglês)

### Authentication
- `DLLInitializeMarketLogin` - Market data only
- `DLLInitializeLogin` - Market data + order routing
- Requires: activation_key, username, password

### Connection States (TStateCallback)
- State 0: Login (0=OK, 1=Invalid, 2=Wrong Password)
- State 1: Broker (0=Disconnected, 2=Connected, 5=HCS Connected)
- State 2: Market (4=Connected, 3=Not Logged)
- State 3: Activation (0=Valid, else Invalid)

### Key Callbacks (MUST keep alive - GC prevention)
- `TStateCallback` - Connection state
- `TConnectorTradeCallback` - Trade events
- `TOfferBookCallback` - Order book updates
- `TConnectorOrderCallback` - Order execution
- `TConnectorPriceDepthCallback` - Aggregated book

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
- Market orders: `Price = -1`
- Stop orders: Set both `Price` and `StopPrice`
- Position types: `1 = DayTrade`, `2 = Consolidated`
- Error codes: `NL_OK = 0x00000000`, negative = error

## 📡 Communication Protocols

### WebSocket (Market Data)
- Port: `9001`
- Format: JSON
- Fields: `symbol`, `price`, `volume`, `aggressor`, `timestamp`
- Buffer: 10,000 msgs (FIFO overflow)
- Auto-reconnect: Every 5s

### HTTP REST (Current Services)
- **Dashboard**: `http://localhost:3103` (React + Vite)
- **Docusaurus**: `http://localhost:3004` (Docusaurus)
- **Library API**: `http://localhost:3200` (Express + LowDB/QuestDB)
- **TP Capital**: `http://localhost:3200` (Express + Telegraf)
- **B3**: `http://localhost:3302` (Express)
- **Documentation API**: `http://localhost:3400` (Express + FlexSearch)
- **Service Launcher**: `http://localhost:3500` (Express)
- **Firecrawl Proxy**: `http://localhost:3600` (Express + Firecrawl)

### Current API Endpoints
- **Library**: `GET/POST /api/ideas` - Manage trading ideas and documentation library
- **TP Capital**: `POST /webhook/telegram` - Telegram message ingestion
- **B3**: `GET /api/market-data` - Real-time market data
- **Documentation**: `GET/POST /api/docs` - Documentation management
- **Service Launcher**: `GET /api/status` - Service health checks
- **Firecrawl Proxy**: `POST /api/scrape` - Web scraping via Firecrawl

### Future Trading Endpoints (Planned)
- `POST /api/v1/execute` - Execute order
- `POST /api/v1/risk/kill-switch` - Emergency stop
- `GET /api/v1/signals/latest` - Recent signals
- `GET /api/v1/positions` - Current positions
- `GET /api/v1/metrics` - Performance metrics

## 🤖 ML Cause-and-Effect Model

**Concept**: Identify relationships between market conditions (causes) and price movements (effects).

**Features**: aggressor_flow, volatility_roll, book_delta, volume_anomaly, ma_price
**Window**: Rolling k ticks or seconds
**Algorithm**: `SGDClassifier.partial_fit()` (incremental learning)
**Classification**:
- `ret_fut > +threshold` → BUY
- `ret_fut < -threshold` → SELL
- Neutral zone → HOLD
**Feedback**: Model adjusts based on actual trade outcomes

## 🛡️ Risk Management

- Global kill switch: `/api/v1/risk/kill-switch`
- Daily loss limit (configured in `.env`)
- Max position size
- Trading hours restriction (9:00-18:00 default)
- Auto-pause on connection errors/high latency
- All executions audited (timestamp + justification)

## 💾 Data Storage

- **Format**: Parquet (columnar, compressed)
- **Structure**: `/data/parquet/{asset}/{date}/trades.parquet`
- **Logs**: JSONL structured (`/data/logs/{service}/{date}.jsonl`)
- **Models**: `/data/models/{model_name}/{version}.pkl`
- **Backups**: Incremental daily (`/data/backups/{date}/`)

## 🚀 Development Commands

### Local Development (Native Services)

```bash
# Dashboard (Port 3103)
cd frontend/apps/dashboard
npm install && npm run dev

# Docusaurus (Port 3004)
cd docs/docusaurus
npm install && npm run start -- --port 3004

# API Services (Ports 3200-3600)
# Run each in a separate terminal

cd backend/api/workspace && npm install && npm run dev
cd frontend/apps/tp-capital && npm install && npm run dev
cd frontend/apps/b3-market-data && npm install && npm run dev
cd backend/api/documentation-api && npm install && npm run dev
cd frontend/apps/service-launcher && npm install && npm run dev
cd backend/api/firecrawl-proxy && npm install && npm run dev
```

### Container Management (Docker Compose)

Auxiliary services run through Docker Compose stacks. Use the helper scripts or compose files directly:

```bash
# Start all stacks (infra, data, monitoring, frontend, ai tools)
bash start-all-stacks.sh

# Stop all stacks
bash stop-all-stacks.sh

# Or manage individual stacks
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d
docker compose -f infrastructure/compose/docker-compose.infra.yml down
```

Compose files are located under `infrastructure/compose/`, `infrastructure/monitoring/`, `frontend/compose/`, and `ai/compose/`.

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
cd frontend/apps/dashboard
npm run test

# Backend API Tests
cd backend/api/workspace
npm run test

# Documentation Tests
cd docs
npm run test

# E2E Tests (when available)
npm run test:e2e

# Load Tests (when available)
npm run test:load
```

## 📝 Development Guidelines

### ⚠️ CRITICAL: Environment Variables Configuration

**RULE: ALL applications, services, and containers MUST use the centralized `.env` file from project root.**

**NEVER create local `.env` files!** Always reference the root `.env`:

✅ **Correct - Docker Compose**:
```yaml
services:
  my-service:
    env_file:
      - ../../.env  # Always point to root
```

✅ **Correct - Node.js/Express**:
```javascript
import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });
```

✅ **Correct - Vite/React**:
```javascript
// Vite automatically loads .env from project root
// No configuration needed!
```

❌ **WRONG - Local .env**:
```javascript
// DON'T DO THIS!
dotenv.config({ path: './.env' });  // ❌ Local file
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

**Documentation**: See `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` for complete guide.

---

### When working with ProfitDLL callbacks:
- Store delegates as **static fields** to prevent GC
- Use `[MarshalAs(UnmanagedType.LPWStr)]` for strings
- Match `CallingConvention.StdCall`
- Never do heavy work inside callbacks (use queues)

### When adding ML features:
- Update signal generation logic
- Test with replay before live

### When modifying orders:
- Always test in simulation mode
- Verify risk checks enforced
- Ensure audit logging complete
- Never bypass kill switch

### When creating documentation (REQUIRED):
- **MUST include YAML frontmatter** with all required fields (title, tags, domain, type, summary, status, last_review)
- **MUST include PlantUML diagrams** for architecture/design documents (ADR, RFC, Technical Specs)
- **MUST provide both** `.puml` source file AND embedded rendering in markdown
- Follow official standard: `docs/DOCUMENTATION-STANDARD.md`
- Use appropriate diagram types: Component, Sequence, State, Class, Deployment
- Test rendering in Docusaurus before committing (`cd docs/docusaurus && npm run start -- --port 3004`)
- See examples: `docs/context/shared/diagrams/plantuml-guide.md`

### Code Style:
- C#: PascalCase, 4 spaces, follow `.editorconfig`
- Python: snake_case, Black formatter (88 chars)
- TypeScript: camelCase, 2 spaces, ESLint rules
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

## 🔐 Security & Configuration

- **Never commit**: `.env`, `appsettings.*.json`, credentials
- **Use**: `config/development/.env.example` as template
- **Encrypt**: Credentials in production (`ENCRYPT_CREDENTIALS=true`)
- **Audit**: All orders logged with timestamp + reason
- **Sandbox**: Local execution only, no external APIs

## 📚 Documentation

**Centralized in `/docs` with context-driven organization:**

### Core Documentation Standards
- **[docs/DOCUMENTATION-STANDARD.md](docs/DOCUMENTATION-STANDARD.md)** - Official documentation standard (YAML frontmatter, PlantUML)
- **[docs/DIRECTORY-STRUCTURE.md](docs/DIRECTORY-STRUCTURE.md)** - Complete project structure guide

### Docusaurus (Docusaurus - Port 3004)
- **[docs/README.md](docs/README.md)** - Main Docusaurus (START HERE)
- **[docs/context/](docs/context/)** - Context-driven documentation architecture

### Backend Documentation
- **[docs/context/backend/architecture/](docs/context/backend/architecture/)** - Service maps, ADRs, architectural decisions
- **[docs/context/backend/api/](docs/context/backend/api/)** - Service-specific API documentation
- **[docs/context/backend/data/](docs/context/backend/data/)** - QuestDB schemas, migrations, data warehouse
- **[docs/context/backend/guides/](docs/context/backend/guides/)** - Implementation guides

### Frontend Documentation  
- **[docs/context/frontend/features/](docs/context/frontend/features/)** - Feature specs (Idea Bank, Escopo Page, etc.)
- **[docs/context/frontend/guides/](docs/context/frontend/guides/)** - UI implementation guides
- **[docs/context/frontend/architecture/](docs/context/frontend/architecture/)** - Frontend ADRs, component architecture

### Shared Documentation
- **[docs/context/shared/product/prd/](docs/context/shared/product/prd/)** - Product Requirements (EN/PT)
- **[docs/context/shared/diagrams/](docs/context/shared/diagrams/)** - PlantUML architectural diagrams
- **[docs/context/shared/tools/](docs/context/shared/tools/)** - Templates, standards, development tools

### API Documentation (Service-Specific)
- **[backend/api/workspace/README.md](backend/api/workspace/README.md)** - Library API (Port 3200)
- **[frontend/apps/tp-capital/README.md](frontend/apps/tp-capital/README.md)** - TP Capital (Port 3200)
- **[frontend/apps/b3-market-data/README.md](frontend/apps/b3-market-data/README.md)** - B3 (Port 3302)
- **[backend/api/documentation-api/README.md](backend/api/documentation-api/README.md)** - Documentation API (Port 3400)
- **[backend/api/firecrawl-proxy/README.md](backend/api/firecrawl-proxy/README.md)** - Firecrawl Proxy (Port 3600)

## 🔗 Reference Code

- C# ProfitDLL init: `project-hub/systems/documentacao/ProfitDLL/examples/Exemplo C#/Program.cs:928-961`
- C# Callbacks: `project-hub/systems/documentacao/ProfitDLL/examples/Exemplo C#/Program.cs:102-122`
- Python init: `project-hub/systems/documentacao/ProfitDLL/examples/Exemplo Python/main.py:721-758`
- Python orders: `project-hub/systems/documentacao/ProfitDLL/examples/Exemplo Python/main.py:848-922`

## ⚠️ Important Reminders

- ✅ Always build x64 (ProfitDLL requirement)
- ✅ Check connection state before operations
- ✅ Validate asset format: "TICKER:EXCHANGE"
- ✅ Use UTC timezone, adjust for market hours
- ✅ Test with replay data before live
- ❌ Never skip risk checks
- ❌ Never hardcode credentials
- ❌ Never process heavy logic in callbacks

---
title: 🚀 TradingSystem - Local Intelligent Trading Platform
sidebar_position: 1
tags: [documentation]
domain: shared
type: index
summary: "[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)"
status: active
last_review: "2025-10-23"
---

# 🚀 TradingSystem - Local Intelligent Trading Platform

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docs Links](https://github.com/marceloterra/TradingSystem/actions/workflows/docs-link-validation.yml/badge.svg)](https://github.com/marceloterra/TradingSystem/actions/workflows/docs-link-validation.yml)

> **Local trading system** with Clean Architecture + DDD, integrating Nelogica's ProfitDLL for real-time market data capture, ML-based cause-and-effect analysis, and automated order execution. 100% on-premise, no cloud dependencies.

> **🚨 DEVELOPERS:** Before creating ANY new service, read **[Environment Configuration Guide](http://localhost:3400/tools/security-config/env)** - Centralized `.env` is MANDATORY! Also see [Documentation Hub](http://localhost:3400) for comprehensive guides.

## 📋 Table of Contents

- [🚀 TradingSystem - Local Intelligent Trading Platform](#-tradingsystem---local-intelligent-trading-platform)
  - [📋 Table of Contents](#-table-of-contents)
  - [📚 Documentation](#-documentation)
  - [🎯 Overview](#-overview)
    - [Key Highlights](#key-highlights)
  - [✨ Features](#-features)
    - [Market Data Capture \& Signal Ingestion](#market-data-capture--signal-ingestion)
    - [ML-Powered Analysis](#ml-powered-analysis)
    - [Order Execution \& Risk](#order-execution--risk)
    - [Observability](#observability)
  - [🏗️ Architecture](#️-architecture)
    - [High-Level Design](#high-level-design)
    - [Principles](#principles)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [⚙️ Environment Configuration](#️-environment-configuration)
    - [Quick Setup (3 steps)](#quick-setup-3-steps)
    - [What Gets Configured](#what-gets-configured)
    - [Manual Setup](#manual-setup)
    - [Migrating from Old .env Files](#migrating-from-old-env-files)
  - [🚀 Getting Started](#-getting-started)
    - [⚡ Universal Startup (NOVO! - 2025-10-20)](#-universal-startup-novo---2025-10-20)
      - [Instalação (Uma Vez)](#instalação-uma-vez)
      - [Uso Diário](#uso-diário)
    - [Quick Start Manual (Linux/WSL)](#quick-start-manual-linuxwsl)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Development Setup](#development-setup)
      - [Pre-commit Hooks](#pre-commit-hooks)
    - [Environment Options](#environment-options)
  - [📁 Project Structure](#-project-structure)

## 📚 Documentation

**TradingSystem has comprehensive documentation powered by Docusaurus v3:**

**Quick Links**:
- 📖 [Documentation Hub](http://localhost:3400) (local runtime)
- 📖 [Documentation Hub](http://tradingsystem.local/docs) (unified domain)
- 🗂️ [Content Directory](docs/content/) - Browse all documentation
- 📋 [Validation Guide](docs/governance/VALIDATION-GUIDE.md) - How to validate docs
- ✅ [Review Checklist](docs/governance/REVIEW-CHECKLIST.md) - Quality standards

**Content Structure** (135+ pages):
- **Apps**: Workspace, TP Capital, Order Manager, Data Capture
- **APIs**: Order Manager, Data Capture, Workspace
- **Frontend**: Design system, guidelines, engineering practices
- **Database**: Schemas, migrations, backup/retention
- **Tools**: Node.js, .NET, Python, Docker, PlantUML, Docusaurus
- **SDD**: Domain schemas, events, flows, API specifications
- **PRD**: Product requirements, feature briefs
- **Reference**: Templates, ADRs, diagrams

**For Contributors**:
- Run `npm --prefix docs run docs:dev` to start local server
- Run `npm --prefix docs run docs:check` before committing
- See [docs/README.md](docs/README.md) for automation and helpers

**Migration Complete** (2025-10-26):
- ✅ Migrated from legacy Docusaurus v2 to Docusaurus v3
- ✅ 251 legacy files consolidated into 135 structured pages
- ✅ Documentation Hub now serves on port 3400 (DocsAPI on 3401)
- 📖 See [CHANGELOG.md](CHANGELOG.md) for migration history

> **🚨 First Time Here?** Read [Environment Configuration](#️-environment-configuration) BEFORE doing anything else!

## 🎯 Overview

TradingSystem is a professional-grade, locally-hosted trading platform that:

-   📊 **Captures** real-time market data via ProfitDLL (Nelogica)
-   🤖 **Analyzes** using machine learning (cause-and-effect modeling)
-   📈 **Generates** trading signals with probability-based decisions
-   ⚡ **Executes** automated orders with comprehensive risk management
-   📉 **Visualizes** everything in a real-time dashboard

### Key Highlights

-   ✅ **100% Local Execution** - No cloud dependencies, complete privacy
-   ✅ **Low Latency** - &lt; 500ms from data capture to decision
-   ✅ **Scalable Architecture** - Clean Architecture + DDD + Microservices
-   ✅ **Risk Management** - Kill switch, daily limits, position controls
-   ✅ **Full Audit Trail** - Every decision logged with timestamp + justification
-   ✅ **Unified Domain** - Single domain access with Nginx reverse proxy
-   ✅ **No CORS Required** - All services on same domain (tradingsystem.local)
-   ✅ **Documentation Quality** - Automated link validation, 195+ docs with complete frontmatter

## ✨ Features

### Market Data Capture & Signal Ingestion

-   Real-time tick data via ProfitDLL callbacks
-   Order book (bid/ask) streaming
-   Historical data retrieval
-   Multi-asset subscription
-   Auto-reconnection on disconnect
-   **Telegram Connections** - Bot and channel management for signal ingestion from TP Capital
-   **QuestDB Signals API** - `/api/tp-capital/signals` and `/logs` endpoints feed the TP CAPITAL | OPCOES dashboard view

### ML-Powered Analysis

-   **Cause-and-Effect Model** - Identifies market pattern relationships
-   **Incremental Learning** - `SGDClassifier` with online updates
-   **Feature Engineering** - Aggressor flow, volatility, book delta, volume anomalies
-   **Signal Generation** - BUY/SELL/HOLD with confidence scores
-   **Backtesting** - Replay historical data for strategy validation

### Order Execution & Risk

-   Automated order placement (Market, Limit, Stop)
-   Position tracking (Day Trade / Consolidated)
-   **Risk Engine**:
    -   Daily loss limits
    -   Max position size
    -   Trading hours restriction
    -   Global kill switch
-   Order lifecycle management (FILLED, PARTIAL, CANCELED)

### Observability

-   Structured logging (JSONL)
-   Prometheus metrics
-   Grafana dashboards
-   Real-time performance monitoring

## 🏗️ Architecture

### High-Level Design

```
                             Nginx Reverse Proxy
                         (tradingsystem.local:80)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌─────────┐    ┌──────────┐    ┌──────────┐
              │ Frontend │    │ Backend  │    │   Docs   │
              │Dashboard │    │  APIs    │    │ Hub      │
              └─────────┘    └──────────┘    └──────────┘
                    │             │               │
                    └─────────────┼───────────────┘
                                 │
                         Same Origin Access
                       (No CORS Required)
```

### Principles

-   **Clean Architecture** - Layered design (Domain → Application → Infrastructure → Presentation)
-   **Domain-Driven Design** - Aggregates, Value Objects, Domain Events, Repositories
-   **Microservices** - Independent services with single responsibility
-   **Event-Driven** - WebSocket (data streams) + HTTP (commands)
-   **Unified Domain** - Single domain access through Nginx reverse proxy
-   **Same-Origin Design** - All services under tradingsystem.local

### Containerized Services (New! 🐳)

**As of October 2025**, TP Capital and Workspace services are fully containerized:

```
Telegram Gateway (Local)  →  TP Capital API (Container)  →  TimescaleDB
       ↓                            ↓
   Port 4006               Port 4005 (Signals)
                                    ↓
                         Workspace API (Container)
                              Port 3200 (Ideas & Docs)
```

**What's Containerized**:
- ✅ **TP Capital API** - Trading signals ingestion (Port 4005)
- ✅ **Workspace API** - Ideas & documentation management (Port 3200)
- ✅ **Hot-Reload** - Development mode with nodemon + volume mounts
- ✅ **Health Checks** - Automatic health monitoring for all containers

**What Runs Locally**:
- 🖥️ **Telegram Gateway** - Shared message ingestion service (Port 4006)
- 🖥️ **Frontend Dashboard** - React UI (Port 3103)
- 🖥️ **Other APIs** - Documentation, Status, etc.

**Quick Start with Docker**:
```bash
# Start containerized services (3 commands)
docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb
docker compose -f tools/compose/docker-compose.apps.yml --env-file .env up -d
curl http://localhost:4005/health  # Verify TP Capital API
curl http://localhost:3200/health  # Verify Workspace API
```

**See**: [DOCKER-QUICK-START.md](DOCKER-QUICK-START.md) for comprehensive Docker setup guide

## 🛠️ Tech Stack

| Layer                | Technology                                                    |
| -------------------- | ------------------------------------------------------------- |
| **Backend Services** | C# (.NET 8.0), Python 3.11+                                   |
| **ML Toolkit**       | scikit-learn, Polars, NumPy                                   |
| **API Layer**        | FastAPI, ASP.NET Core Web API                                 |
| **Frontend**         | React 18, TypeScript, Tailwind CSS                            |
| **Data Storage**     | QuestDB (signals), LowDB (MVP), Parquet (Apache Arrow), JSONL |
| **Messaging**        | WebSockets, HTTP REST                                         |
| **Monitoring**       | Prometheus, Grafana                                           |
| **Platform**         | Native Windows (Core), Linux (Services)                       |
| **Reverse Proxy**    | Nginx (Unified Domain)                                        |

## ⚙️ Environment Configuration

> **⚠️ CRITICAL RULE FOR ALL DEVELOPERS:**  
> **ALL applications, services, and containers MUST use the centralized `.env` file from project root.**  
> **NEVER create local `.env` files in subdirectories!**

TradingSystem uses a **centralized `.env` file** for all configuration. Before starting, you need to set up your environment variables.

### Quick Setup (3 steps)

```bash
# 1. Run interactive setup (RECOMMENDED)
bash scripts/env/setup-env.sh

# 2. Validate configuration
bash scripts/env/validate-env.sh

# 3. Start services
bash scripts/docker/start-stacks.sh
```

### What Gets Configured

The setup script will:

-   ✅ Generate secure passwords automatically (TimescaleDB, PgAdmin, Grafana)
-   ✅ Prompt for OpenAI API key (required for AI features)
-   ✅ Create `.env` file with all required variables
-   ✅ Set secure file permissions (chmod 600)

### Manual Setup

If you prefer manual configuration:

```bash
# 1. Copy template
cp .env.example .env

# 2. Edit with your values
nano .env

# 3. Validate
bash scripts/env/validate-env.sh
```

**Required Variables**:

-   `TIMESCALEDB_PASSWORD` - Database password
-   `PGADMIN_DEFAULT_PASSWORD` - PgAdmin UI password
-   `GRAFANA_ADMIN_PASSWORD` - Grafana UI password
-   `OPENAI_API_KEY` - For LlamaIndex AI features
-   `JWT_SECRET_KEY` - API authentication secret

**Generate secure values**:

```bash
# Passwords
openssl rand -base64 32

# JWT Secret
openssl rand -hex 32
```

### Migrating from Old .env Files

If you have existing `.env` files scattered across the project:

```bash
bash scripts/env/migrate-env.sh
```

📖 **Complete Guide**: [Environment Variables Reference](http://localhost:3400/tools/security-config/env) | [Setup Script](scripts/env/setup-env.sh)

---

## 🚀 Getting Started

### ⚡ Universal Startup (NOVO! - 2025-10-20)

**O TradingSystem agora possui um comando universal de startup que inicia tudo com um único comando!**

#### Instalação (Uma Vez)

```bash
# 1. Executar instalador de shortcuts
bash /home/marce/projetos/TradingSystem/install-shortcuts.sh

# 2. Recarregar shell
source ~/.bashrc  # ou source ~/.zshrc
```

#### Uso Diário

```bash
# Startup completo (Docker + Node.js)
start

# Parar todos os serviços
stop

# Ver status
status

# Health check completo
health
```

**Opções avançadas:**

-   `start-docker` - Apenas containers Docker
-   `start-services` - Apenas serviços Node.js
-   `start-minimal` - Modo mínimo (essenciais)
-   `start --force-kill` - Force restart matando processos em portas ocupadas
-   `start --skip-vectors` - Não iniciar Qdrant/Ollama/LlamaIndex (RAG) quando não for necessário

📖 **Guia Completo**: [QUICK-START.md](QUICK-START.md) | [Startup Scripts](scripts/startup/README.md) | [Docs Hub](http://localhost:3400) (Docusaurus v3)

---

<a id="quick-start-linux--wsl"></a>

### Quick Start Manual (Linux/WSL)

> ✅ Ideal para desenvolvedores que preferem controle manual sobre cada serviço.

1. **Open your WSL terminal** (Ubuntu 20.04+ recommended) and ensure it is up to date:
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```
2. **Install core dependencies** (Git, Node.js, Python, Docker CLI helpers):
    ```bash
    sudo apt install -y git build-essential python3 python3-venv python3-pip
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    ```
    > If Docker Desktop is installed on Windows, enable **"Use the WSL 2 based engine"** so the containers and scripts can talk to Docker.
3. **Clone the repository inside WSL** (prefer `~/projects` or similar for consistent paths):
    ```bash
    git clone https://github.com/marceloterra/TradingSystem.git
    cd TradingSystem
    ```
4. **Run the environment bootstrap** (loads centralized `.env`, installs npm/yarn deps for docs/services):
    ```bash
    bash scripts/env/setup-env.sh
    bash scripts/env/validate-env.sh
    npm install --workspaces
    ```
5. **Start the documentation + dashboard stack**:
    ```bash
    # Documentation Hub (Port 3400)
    cd docs && npm run start -- --host 0.0.0.0 --port 3400
    ```
    In a second terminal:
    ```bash
    # Dashboard (Port 3103)
    cd frontend/dashboard && npm run dev -- --host 0.0.0.0 --port 3103
    ```
6. **(Optional) Bring up supporting services** from WSL using Docker Compose:
    ```bash
    bash tools/scripts/start-all-stacks.sh
    ```
7. **Access the portals from Windows** via your browser:
    - Documentation: http://localhost:3400
    - Dashboard: http://localhost:3103
    - API Hub (via Documentation Hub): http://localhost:3400/shared/integrations/frontend-backend-api-hub

Refer back to the [Operations Quick Start Guides](http://localhost:3400/tools/onboarding/start-services) for service-specific instructions.

### Prerequisites

-   **OS**:
    -   **Windows 11 x64** (Native only for .NET/ProfitDLL components)
    -   **Linux** (Ubuntu 20.04+, Debian 11+, Arch) for Node.js services and infrastructure
-   **.NET SDK**: 8.0 or higher (Windows only)
-   **Python**: 3.11 or higher (with Poetry)
-   **Node.js**: 18 or higher (with npm)
-   **ProfitDLL License**: Active Nelogica Data Solution subscription (Windows only)
-   **Nginx**: Latest stable version (for unified domain setup)
-   **Hardware**: RTX GPU recommended for ML (optional)

> **💡 Dual Platform Support:** .NET/ProfitDLL services run natively on Windows; Node.js APIs and development tools run on Linux/WSL; auxiliary containers are orchestrated locally via Docker Compose.

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/marceloterra/TradingSystem.git
cd TradingSystem
```

2. **Quick Start Setup**

```bash
# Run the quick start script (copies all configs and sets up environment)
bash QUICK-START.sh
```

3. **Access the System**

```
Dashboard: http://tradingsystem.local
Documentation: http://tradingsystem.local/docs
API endpoints: http://tradingsystem.local/api/*
```

### Development Setup

To boot the dashboard and documentation together in local mode:

```bash
npm run dev:dashboard-docs
```

This starts the dashboard at `http://localhost:3103` and the docs workspace at `http://localhost:3400`.

#### Pre-commit Hooks

Husky pre-commit hooks are automatically installed via `npm install` and run the following validations:

-   **Documentation Frontmatter**: Validates YAML frontmatter in staged markdown files (title, tags, domain, type, summary, status, last_review)
-   **Frontend Code Quality**: Runs ESLint and TypeScript checks on staged frontend files

Hooks run automatically before each commit. To bypass (emergency only):

```bash
git commit --no-verify -m "Emergency fix"
```

See [Documentation Standards](docs/governance/README.md#documentation-standards) for frontmatter requirements.

For detailed setup instructions, see:

-   [Reverse Proxy Setup](http://localhost:3400/tools/infrastructure/reverse-proxy-setup)
-   [VPS Migration Guide](http://localhost:3400/tools/infrastructure/nginx-proxy-vps-migration)

### Environment Options

You can access the system in two ways:

1. **Unified Domain (Recommended)**

    - All services through `http://tradingsystem.local`
    - No CORS configuration needed
    - Production-ready architecture
    - Single domain for all APIs

2. **Direct Port Access (Legacy)**
    - Frontend: `http://localhost:3103`
    - Workspace: `http://localhost:3102`
    - TP Capital API: `http://localhost:3200`
    - DocsAPI: `http://localhost:3400`
    - Laucher: `http://localhost:3500`
    - Documentation Hub: `http://localhost:3400`

## 📁 Project Structure

[Rest of the README remains unchanged...]

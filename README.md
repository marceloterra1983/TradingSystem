# 🚀 TradingSystem - Local Intelligent Trading Platform

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docs Links](https://github.com/marceloterra/TradingSystem/actions/workflows/docs-link-validation.yml/badge.svg)](https://github.com/marceloterra/TradingSystem/actions/workflows/docs-link-validation.yml)

> **Local trading system** with Clean Architecture + DDD, integrating Nelogica's ProfitDLL for real-time market data capture, ML-based cause-and-effect analysis, and automated order execution. 100% on-premise, no cloud dependencies.

> **🚨 DEVELOPERS:** Before creating ANY new service, read **[ENV-RULES.md](docs/context/ENV-RULES.md)** - Centralized `.env` is MANDATORY!

## 📋 Table of Contents

-   [📋 Table of Contents](#-table-of-contents)
-   [🎯 Overview](#-overview)
    -   [Key Highlights](#key-highlights)
-   [✨ Features](#-features)
    -   [Market Data Capture \& Signal Ingestion](#market-data-capture--signal-ingestion)
    -   [ML-Powered Analysis](#ml-powered-analysis)
    -   [Order Execution \& Risk](#order-execution--risk)
    -   [Observability](#observability)
-   [🏗️ Architecture](#️-architecture)
    -   [High-Level Design](#high-level-design)
    -   [Principles](#principles)
-   [🛠️ Tech Stack](#️-tech-stack)
-   [⚙️ Environment Configuration](#️-environment-configuration)
    -   [Quick Setup (3 steps)](#quick-setup-3-steps)
    -   [What Gets Configured](#what-gets-configured)
    -   [Manual Setup](#manual-setup)
    -   [Migrating from Old .env Files](#migrating-from-old-env-files)
-   [🚀 Getting Started](#-getting-started)
    -   [Quick Start (Linux/WSL)](#quick-start-linuxwsl)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Development Setup](#development-setup)
        -   [Pre-commit Hooks](#pre-commit-hooks)
    -   [Environment Options](#environment-options)
    -   [WebScraper App \& API](#webscraper-app--api)
-   [📁 Project Structure](#-project-structure)

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

📖 **Complete Guide**: [Environment Configuration Documentation](docs/context/ops/ENVIRONMENT-CONFIGURATION.md)

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

📖 **Guia Completo**: [QUICK-START.md](QUICK-START.md) | [Startup Scripts](scripts/startup/README.md)

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
    # Docusaurus (Port 3004)
    cd docs/docusaurus && npm run start -- --host 0.0.0.0 --port 3004
    ```
    In a second terminal:
    ```bash
    # Dashboard (Port 3103)
    cd frontend/apps/dashboard && npm run dev -- --host 0.0.0.0 --port 3103
    ```
6. **(Optional) Bring up supporting services** from WSL using Docker Compose:
    ```bash
    bash infrastructure/scripts/start-all-stacks.sh
    ```
7. **Access the portals from Windows** via your browser:
    - Documentation: http://localhost:3004
    - Dashboard: http://localhost:3103
    - API Hub (via Docusaurus): http://localhost:3004/shared/integrations/frontend-backend-api-hub

Refer back to the [Operations Quick Start Guides](docs/context/ops/onboarding/START-SERVICES.md) for service-specific instructions.

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

#### Pre-commit Hooks

Husky pre-commit hooks are automatically installed via `npm install` and run the following validations:

-   **Documentation Frontmatter**: Validates YAML frontmatter in staged markdown files (title, tags, domain, type, summary, status, last_review)
-   **Frontend Code Quality**: Runs ESLint and TypeScript checks on staged frontend files

Hooks run automatically before each commit. To bypass (emergency only):

```bash
git commit --no-verify -m "Emergency fix"
```

See [Documentation Standard](docs/DOCUMENTATION-STANDARD.md) for frontmatter requirements.

For detailed setup instructions, see:

-   [Reverse Proxy Setup](docs/context/ops/infrastructure/reverse-proxy-setup.md)
-   [VPS Migration Guide](docs/context/ops/infrastructure/nginx-proxy-vps-migration.md)

### Environment Options

You can access the system in two ways:

1. **Unified Domain (Recommended)**

    - All services through `http://tradingsystem.local`
    - No CORS configuration needed
    - Production-ready architecture
    - Single domain for all APIs

2. **Direct Port Access (Legacy)**
    - Frontend: `http://localhost:3103`
    - WebScraper App: `http://localhost:3800`
    - Workspace: `http://localhost:3102`
    - TP Capital API: `http://localhost:3200`
    - B3 Market API: `http://localhost:3302`
    - WebScraper API: `http://localhost:3700`
    - DocsAPI: `http://localhost:3400`
    - Laucher: `http://localhost:3500`
    - Docusaurus: `http://localhost:3004`

### WebScraper App & API

-   **Frontend**: `frontend/apps/WebScraper` (Vite + React, port `3800`)
-   **Backend**: `backend/api/webscraper-api` (Express + Prisma, port `3700`)
-   **Features**: Firecrawl integration, template management, job history & analytics
-   **Scripts**:
    -   `bash scripts/webscraper/start-service.sh` / `stop-service.sh`
    -   `bash backend/api/webscraper-api/scripts/init-database.sh [--seed]`
    -   `bash backend/api/webscraper-api/scripts/test-endpoints.sh`

```bash
# WebScraper API (Port 3700)
cd backend/api/webscraper-api
npm install
npx prisma generate
npm run dev
```

## 📁 Project Structure

[Rest of the README remains unchanged...]

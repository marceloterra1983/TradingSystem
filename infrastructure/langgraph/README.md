# LangGraph Service - Multi-Agent Workflow Orchestration

**Version:** 2.1.0
**Port:** 8111
**Status:** ✅ Production Ready (MVP)

---

## 🎯 Overview

LangGraph Service é o **orquestrador central de workflows** do TradingSystem, responsável por coordenar workflows complexos de trading e documentação usando state machines determinísticas com persistência de estado.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LangGraph Service                       │
│                     (Port: 8111)                            │
├─────────────────────────────────────────────────────────────┤
│  Trading Workflows          │  Docs Workflows               │
│  Market → Risk → Execute    │  Fetch → Review/Enrich → Save │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         ├─────────────┬──────────────────────┤
         ▼             ▼                      ▼
   ┌──────────┐  ┌──────────┐       ┌──────────────┐
   │  Agno    │  │ DocsAPI  │       │  Firecrawl   │
   │ Agents   │  │  (3400)  │       │  Proxy (3600)│
   │  (8200)  │  └──────────┘       └──────────────┘
   └──────────┘
         │
         ▼
   ┌──────────────────────────────────────────┐
   │  State Persistence                       │
   │  PostgreSQL (Checkpoints)                │
   │  QuestDB (Events/Telemetry)              │
   └──────────────────────────────────────────┘
```

---

## 📋 Features

### ✅ Implemented (D0-D3)

#### Trading Workflows
- **POST `/workflows/trading/execute`** - Execute trading workflow
  - Market Analysis (via Agno MarketAnalysisAgent)
  - Risk Validation (via Agno RiskManagementAgent)
  - Trade Execution (paper/live mode)
  - Deterministic state machine with rollback support

#### Documentation Workflows
- **POST `/workflows/docs/review`** - Review documentation
  - Fetch from DocsAPI, URL, or markdown
  - Analyze for issues (YAML frontmatter, headings, dates)
  - Generate suggestions
  - Save review report

- **POST `/workflows/docs/enrich`** - Enrich documentation
  - Scrape external references via Firecrawl
  - Add context and metadata
  - Update DocsAPI

#### State Persistence
- PostgreSQL checkpoints for workflow recovery
- QuestDB telemetry for high-frequency events
- Idempotency support via headers

#### Monitoring
- Prometheus metrics at `/metrics`
- Health check at `/health` with dependency status
- Structured logging (JSON)

### 🚧 Planned (D4-D6+)

- Webhook notifications
- Advanced retry strategies with exponential backoff
- Circuit breaker per exchange/service
- LLM-powered enrichment (GPT-4/Gemini)
- Status tracking endpoint (`GET /workflows/{run_id}/status`)
- Workflow cancellation
- OpenTelemetry tracing

---

## 🚀 Quick Start

### Development Modes

The LangGraph service supports two deployment modes:

#### Production Mode (Port 8111)
- **Purpose:** Production deployment with FastAPI server
- **Command:** `python server.py`
- **Deployment:** Docker Compose (`docker-compose.infra.yml`)
- **State:** Shared PostgreSQL (port 5432) + QuestDB (port 9000)
- **Features:** Full production features, metrics, health checks
- **Use case:** Production workloads, integration testing

#### Development Mode (Port 8112)
- **Purpose:** Local development with LangSmith Studio integration
- **Command:** `python server.py` (with dev configuration)
- **Deployment:** Docker Compose (`docker-compose.langgraph-dev.yml`)
- **State:** Isolated Redis (port 6380) + PostgreSQL (port 5443)
- **Features:** LangSmith tracing, isolated data, hot reload
- **Use case:** Workflow debugging, Studio UI testing, development

**Key Differences:**
- **Port:** 8111 (prod) vs 8112 (dev)
- **Data:** Shared databases (prod) vs isolated databases (dev)
- **Tracing:** Optional (prod) vs enabled by default (dev)
- **Redis:** Not used (prod) vs required for Studio (dev)

### 1. Prerequisites

Ensure these services are running:
- PostgreSQL/TimescaleDB (Port 5432)
- QuestDB (Port 9000)
- Agno Agents (Port 8200)
- DocsAPI (Port 3400)
- Firecrawl Proxy (Port 3600)

### 2. Setup Database

```bash
# PostgreSQL - Create tables
psql -U postgres -d tradingsystem -f backend/data/postgresql/schemas/langgraph_checkpoints.sql

# QuestDB - Create tables
curl -G "http://localhost:9000/exec" --data-urlencode "query=$(cat backend/data/questdb/schemas/langgraph_events.sql)"
```

### 3. Configure Environment

Add to project root `.env`:

```bash
# LangGraph
LANGGRAPH_PORT=8111
LANGGRAPH_ENV=production

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tradingsystem
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# QuestDB
QUESTDB_HOST=localhost
QUESTDB_HTTP_PORT=9000

# Services
AGNO_API_URL=http://localhost:8200
DOCS_API_URL=http://localhost:3400
FIRECRAWL_PROXY_URL=http://localhost:3600

# Features
ENABLE_TRADING_WORKFLOWS=true
ENABLE_DOCS_WORKFLOWS=true
ENABLE_METRICS=true
```

See `ENV_VARS.md` for complete list.

### 4. Start Service

**Docker Compose (Recommended):**
```bash
cd /home/marce/projetos/TradingSystem
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d langgraph
```

**Local Development:**
```bash
cd infrastructure/langgraph
pip install -r requirements.txt
python server.py
```

### 5. Verify

```bash
# Health check
curl http://localhost:8111/health | jq

# Service info
curl http://localhost:8111/ | jq
```

---

## 🔬 Development Environment (Port 8112)

### Prerequisites

1. **LangSmith API Key** (required for Studio integration):
   - Sign up at https://smith.langchain.com
   - Get API key from https://smith.langchain.com/settings
   - Add to `.env`: `LANGSMITH_API_KEY=lsv2_...`

2. **Environment Configuration:**
```bash
# Add to .env
LANGSMITH_API_KEY=lsv2_your_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=langgraph-dev
```

### Start Development Stack

```bash
# Start isolated dev environment
bash scripts/langgraph/start-dev.sh
```

**What this does:**
- Starts Redis (port 6380) for pub/sub
- Starts PostgreSQL (port 5443) for state persistence
- Starts LangGraph dev server (port 8112)
- Enables LangSmith tracing
- Isolated from production services

### Access Development Services

- **API:** http://localhost:8112
- **Health:** http://localhost:8112/health
- **Metrics:** http://localhost:8112/metrics
- **Studio:** https://smith.langchain.com/studio (with LANGSMITH_API_KEY)
- **Redis:** localhost:6380
- **PostgreSQL:** localhost:5443 (user: langgraph, db: langgraph_dev)

### Stop Development Stack

```bash
# Stop dev environment
bash scripts/langgraph/stop-dev.sh

# Stop and remove volumes (data will be lost)
docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml down -v
```

### Development Workflow

1. **Start dev stack:** `bash scripts/langgraph/start-dev.sh`
2. **Make code changes** in `infrastructure/langgraph/src/`
3. **Rebuild container:** `docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml up -d --build`
4. **View traces** in LangSmith Studio
5. **Check logs:** `docker logs langgraph-dev -f`

### Troubleshooting Dev Environment

**Studio not showing traces:**
- Verify `LANGSMITH_API_KEY` is set in `.env`
- Check `LANGSMITH_TRACING=true`
- View logs: `docker logs langgraph-dev -f`
- Verify health: `curl http://localhost:8112/health`

**Port conflicts:**
- Dev uses ports 8112, 6380, 5443 (different from production)
- Check if ports are available: `netstat -tuln | grep -E '8112|6380|5443'`

**Database connection issues:**
- Check PostgreSQL: `docker logs langgraph-postgres-dev`
- Check Redis: `docker logs langgraph-redis-dev`
- Verify health checks: `docker ps | grep langgraph`

## 🛠️ LangGraph CLI Development

### CLI Overview

The LangGraph CLI provides powerful local development capabilities for workflow testing and debugging. While the Docker development environment (port 8112) is recommended for comprehensive Studio integration, the CLI offers quick iteration and advanced use cases.

**CLI Capabilities:**
- `langgraph dev` - Local development server with in-memory state
- `langgraph build` - Build optimized Docker images
- `langgraph up` - Run production-style server locally

**When to Use CLI vs Docker Development:**
- **CLI Dev Mode**: Quick testing, simple workflows, no Docker required
- **Docker Dev Mode**: Complete Studio integration, isolated databases, production-like environment (recommended)

### CLI Installation

The CLI is included in the project requirements:

```bash
# Install dependencies including langgraph-cli
cd infrastructure/langgraph
pip install -r requirements.txt
```

**Note:** `langgraph-cli[inmem]>=0.1.50` is included in `requirements.txt`

### CLI Commands Reference

#### langgraph dev

**Purpose:** Local development server with in-memory state and Studio integration

```bash
cd infrastructure/langgraph
langgraph dev
```

**Output:**
```
Starting LangGraph dev server...
🚀 LangGraph Studio: https://smith.langchain.com/studio?baseUrl=http://localhost:2024
📊 API Documentation: http://localhost:2024/docs
🔗 Health Check: http://localhost:2024/health
```

**Key Features:**
- Default port: 2024 (not 8112)
- In-memory state (no database persistence)
- Auto-generates Studio URL with local baseUrl
- Hot reload support for code changes
- Real-time workflow execution and debugging

#### langgraph build

**Purpose:** Build optimized Docker image from `langgraph.json` configuration

```bash
cd infrastructure/langgraph
langgraph build -t langgraph:dev
```

**Output:**
```
Building Docker image from langgraph.json...
✅ Built image: langgraph:dev
📦 Image size: 245MB
🔧 Optimized for production deployment
```

**Use Cases:**
- Custom Docker deployments
- Production image optimization
- CI/CD pipeline integration
- Multi-stage builds with dependency pre-building

#### langgraph up

**Purpose:** Run production-style server locally with full LangGraph platform features

```bash
cd infrastructure/langgraph
langgraph up
```

**Requirements:**
- `LANGSMITH_API_KEY` environment variable
- Valid LangSmith account (or license file)

**Use Cases:**
- Production configuration testing
- Full platform feature testing
- Performance benchmarking
- Integration testing with external services

### langgraph.json Configuration

The CLI configuration is defined in `infrastructure/langgraph/langgraph.json`:

```json
{
  "python_version": "3.12",
  "dependencies": ["."],
  "graphs": {
    "trading": "src.interfaces.workflows.trading_workflow:trading_graph",
    "docs": "src.interfaces.workflows.docs_workflow:docs_graph"
  },
  "env": "../../.env"
}
```

**Configuration Details:**
- **python_version**: "3.12" - Python runtime version
- **dependencies**: ["."] - Local project dependencies
- **graphs**: Module-level exports for CLI access
  - `trading` → `trading_graph` module export
  - `docs` → `docs_graph` module export
- **env**: "../../.env" - Centralized environment configuration

**Dual Export Pattern:**
- **Module-level graphs** (`trading_graph`, `docs_graph`) - For LangGraph CLI
- **Factory functions** (`create_trading_workflow()`, `create_docs_workflow()`) - For FastAPI server

### Studio Integration Examples

#### Example 1: Quick Local Testing with CLI

```bash
# Start CLI dev server
cd infrastructure/langgraph
langgraph dev

# Terminal output will show:
# 🚀 LangGraph Studio: https://smith.langchain.com/studio?baseUrl=http://localhost:2024

# Open Studio URL in browser
# Execute workflow from Studio UI or via curl:
curl -X POST http://localhost:2024/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "WINZ25",
    "mode": "paper",
    "strategy": "default"
  }'

# View trace in Studio UI (automatically opened)
```

#### Example 2: Docker Dev Environment (Recommended)

```bash
# Start isolated dev stack with full Studio integration
bash scripts/langgraph/start-dev.sh

# Execute workflow
curl -X POST http://localhost:8112/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "WINZ25",
    "mode": "paper",
    "strategy": "default"
  }'

# View traces in Studio
# Navigate to: https://smith.langchain.com/studio
# Select project: langgraph-dev
# Real-time trace visualization with persistent state
```

#### Example 3: Production with Optional Tracing

```bash
# Enable tracing in production (temporary)
# Add to .env:
# LANGSMITH_TRACING=true
# LANGSMITH_API_KEY=lsv2_your_api_key_here
# LANGSMITH_PROJECT=langgraph-production

# Restart production service
docker compose -f infrastructure/compose/docker-compose.infra.yml restart langgraph

# Execute workflow
curl -X POST http://localhost:8111/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "WINZ25",
    "mode": "paper",
    "strategy": "default"
  }'

# View traces in Studio (project: langgraph-production)
# Disable tracing after debugging for performance:
# LANGSMITH_TRACING=false
```

### CLI vs Docker Comparison

| Feature | CLI Dev Mode | Docker Dev Mode |
|---------|--------------|-----------------|
| **Port** | 2024 | 8112 |
| **State Storage** | In-memory | PostgreSQL + Redis |
| **Persistence** | No | Yes (databases) |
| **Studio Integration** | Basic (local baseUrl) | Full (project-based) |
| **Data Isolation** | Not applicable | Complete isolation |
| **Startup Time** | Fast (~2s) | Slower (~10s) |
| **Resource Usage** | Low | Medium (Docker containers) |
| **Production Similarity** | Low | High |
| **Hot Reload** | Yes | Yes (with rebuild) |
| **Recommended For** | Quick testing, simple debugging | Complete development, Studio integration |

### Troubleshooting CLI

#### CLI Not Found

**Issue:** `langgraph: command not found`

**Solutions:**
```bash
# Install dependencies
cd infrastructure/langgraph
pip install -r requirements.txt

# Verify installation
langgraph --version
```

#### Port 2024 in Use

**Issue:** `Port 2024 is already in use`

**Solutions:**
```bash
# Use custom port
langgraph dev --port 2025

# Or stop conflicting service
lsof -ti:2024 | xargs kill -9
```

#### Studio URL Not Working

**Issue:** Studio UI shows connection errors

**Solutions:**
1. **Check API Key**: Ensure `LANGSMITH_API_KEY` is set
2. **Verify Network**: Check internet connectivity
3. **Browser Issues**: Try different browser or incognito mode
4. **Firewall**: Ensure outbound connections to `smith.langchain.com`

#### Graphs Not Found

**Issue:** Studio shows "No graphs found" or graph errors

**Solutions:**
1. **Verify langgraph.json**: Check file syntax and paths
2. **Check Module Exports**: Ensure `trading_graph` and `docs_graph` exist
3. **Python Path**: Verify running from correct directory
4. **Dependencies**: Ensure all required packages are installed

### CLI Best Practices

1. **Use Docker Dev Mode** for serious development (recommended)
2. **Use CLI for Quick Testing** when Docker overhead is unnecessary
3. **Verify langgraph.json** syntax before building
4. **Set LANGSMITH_API_KEY** in environment for Studio integration
5. **Use Custom Ports** if 2024 conflicts with other services
6. **Regular Updates**: Keep CLI updated for latest features
7. **Project Organization**: Use separate LangSmith projects for different environments

### CLI Commands Summary

```bash
# Development (quick testing)
langgraph dev                    # Start dev server (port 2024)
langgraph dev --port 2025       # Custom port

# Building (production deployment)
langgraph build                 # Build Docker image
langgraph build -t custom:tag   # Custom tag

# Production-style testing
langgraph up                    # Run production server locally

# Utilities
langgraph --version             # Check CLI version
langgraph --help                # Show all options
```

---
## 🏗️ Architecture

### Dual Export Pattern
The service supports both development modes using a dual export pattern:

- **Module-level graphs**: `trading_graph` and `docs_graph` for LangGraph CLI
- **Factory functions**: `create_trading_workflow()` and `create_docs_workflow()` for FastAPI server

This ensures both CLI-based development and production deployment work without conflicts.

#### Clean Architecture Layers

---

## 📡 API Endpoints

### Trading Workflows

#### Execute Trading Workflow
```bash
POST /workflows/trading/execute
Content-Type: application/json
X-Idempotency-Key: optional-unique-key

{
  "symbol": "WINZ25",
  "signal_id": "tg:123",
  "mode": "paper",  # paper|live
  "metadata": {}
}
```

**Response:**
```json
{
  "run_id": "uuid",
  "thread_id": "trading-WINZ25-uuid",
  "status": "completed",
  "message": "Trading workflow completed"
}
```

### Documentation Workflows

#### Review Document
```bash
POST /workflows/docs/review
Content-Type: application/json

{
  "doc_id": "optional-doc-id",
  "url": "optional-url",
  "markdown": "optional-markdown-content",
  "operation": "review",
  "metadata": {}
}
```

#### Enrich Document
```bash
POST /workflows/docs/enrich
Content-Type: application/json

{
  "doc_id": "doc-123",
  "operation": "enrich"
}
```

### Status & Health

#### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "langgraph",
  "version": "2.1.0",
  "dependencies": {
    "agno_agents": "healthy",
    "postgres": "healthy",
    "questdb": "healthy"
  }
}
```

#### Metrics
```bash
GET /metrics
```

Returns Prometheus metrics.

---

## 🏗️ Architecture

### Clean Architecture Layers

```
infrastructure/langgraph/
├── src/
│   ├── domain/              # Entities & Value Objects
│   │   └── models.py        # WorkflowRun, NodeEvent, etc.
│   ├── application/         # Use Cases (future)
│   ├── infrastructure/      # External integrations
│   │   ├── adapters/
│   │   │   ├── agno_client.py
│   │   │   ├── docs_client.py
│   │   │   └── firecrawl_client.py
│   │   └── persistence/
│   │       ├── postgres_checkpoint.py
│   │       └── questdb_logger.py
│   ├── interfaces/          # API & Workflows
│   │   ├── api/
│   │   │   └── routes.py
│   │   └── workflows/
│   │       ├── trading_workflow.py
│   │       └── docs_workflow.py
│   └── config.py
├── server.py                # Main entry point
├── requirements.txt
├── Dockerfile
└── ENV_VARS.md
```

### Workflow State Machines

#### Trading Workflow
```
START
  ↓
[Analyze Market]  ← Calls Agno MarketAnalysisAgent
  ↓
[Validate Risk]   ← Calls Agno RiskManagementAgent
  ↓
[Execute Trade]   ← Calls Agno Execution (paper/live)
  ↓
END
```

#### Documentation Workflow
```
START
  ↓
[Fetch Document]  ← DocsAPI/Firecrawl/Markdown
  ↓
[Review OR Enrich]
  ↓
[Save Results]    ← DocsAPI
  ↓
END
```

---

## 🧪 Testing

```bash
# Unit tests
cd infrastructure/langgraph
pytest tests/ -v

# Integration test - Trading
curl -X POST http://localhost:8111/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{"symbol":"WINZ25","mode":"paper"}'

# Integration test - Docs
curl -X POST http://localhost:8111/workflows/docs/review \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test\nSome content","operation":"review"}'
```

---

## 📊 Monitoring

### Prometheus Metrics

Key metrics exposed at `/metrics`:
- `langgraph_workflow_executions_total`
- `langgraph_workflow_duration_seconds`
- `langgraph_workflow_errors_total`
- `langgraph_node_executions_total`

### QuestDB Queries

```sql
-- Recent workflow executions
SELECT * FROM langgraph_events
WHERE workflow_type = 'trading'
ORDER BY timestamp DESC
LIMIT 100;

-- Node performance
SELECT node_name, AVG(duration_ms) as avg_duration
FROM langgraph_events
WHERE event_type = 'node_exit'
GROUP BY node_name;
```

---

## 🔧 Troubleshooting

### Service won't start

```bash
# Check logs
docker logs infra-langgraph --tail 50

# Check dependencies
curl http://localhost:8200/health  # Agno
curl http://localhost:3400/health  # DocsAPI
```

### Database connection issues

```bash
# Test PostgreSQL
psql -U postgres -d tradingsystem -c "SELECT 1"

# Test QuestDB
curl "http://localhost:9000/exec?query=SELECT 1"
```

### Workflow execution fails

1. Check `/health` endpoint for dependency status
2. Review logs: `docker logs infra-langgraph`
3. Verify Agno Agents are running
4. Check network connectivity between containers

---

## 📚 Related Documentation

- **[LangSmith Studio Guide](../../docs/context/backend/guides/langgraph-studio-guide.md)** - Complete Studio integration and debugging
- **[Development vs Production Comparison](./DEVELOPMENT.md)** - Environment setup and comparison
- **[LangGraph Implementation Guide](../../docs/context/backend/guides/langgraph-implementation-guide.md)** - Architecture and implementation details
- [PRD - Agno Integration](../../docs/context/shared/product/prd/pt/agno-integration-prd.md)
- [ADR-0002 - Agno Framework](../../docs/context/backend/architecture/decisions/2025-10-16-adr-0002-agno-framework.md)
- [Agno Agents README](../agno-agents/README.md)
- [Database Schemas](../../backend/data/)
- [LangGraph CLI Documentation](https://docs.langchain.com/langgraph-platform/cli)
- [LangGraph Studio UI Guide](https://docs.langchain.com/langgraph-platform/local-server)

---

## 📝 Changelog

### v2.1.0 (2025-10-18)
- ✅ **LangSmith Studio integration** - Comprehensive debugging and tracing
- ✅ **Development environment** - Isolated stack with Redis and PostgreSQL
- ✅ **CLI documentation** - Complete guide for langgraph dev/build/up commands
- ✅ **LangGraph CLI integration** - Local development with Studio UI
- ✅ **Dual export pattern** - CLI graphs + FastAPI functions compatibility
- ✅ **langgraph.json configuration** - CLI build and deployment support
- ✅ Complete rewrite with LangGraph workflows
- ✅ Trading workflow (Market → Risk → Execute)
- ✅ Docs workflow (Review + Enrich)
- ✅ PostgreSQL checkpoints
- ✅ QuestDB telemetry
- ✅ HTTP clients (Agno, DocsAPI, Firecrawl)
- ✅ Prometheus metrics
- ✅ Healthchecks with dependency status

### v1.0.0 (2025-10-12)
- Initial stub implementation
- Basic FastAPI endpoints

---

**Maintainer:** Marcelo Terra
**Last Updated:** 2025-10-18


---
title: 🏗️ Tools - TradingSystem
sidebar_position: 1
tags:
  - documentation
domain: ops
type: index
summary: '> Infrastructure, DevOps and AI/ML services hub'
status: active
last_review: '2025-10-23'
---

# 🏗️ Tools - TradingSystem

> **Infrastructure, DevOps and AI/ML services hub**
>
> **Last updated:** 2025-10-23  
> **Version:** 2.2.0

---

## 📁 Directory Structure

```text
tools/
├── compose/                # Docker Compose stacks
│   ├── docker-compose.infrastructure.yml  # Infrastructure services
│   ├── docker-compose.database.yml        # Database services
│   ├── docker-compose.timescale.yml       # TimescaleDB stack
│   ├── docker-compose.docs.yml            # Documentation services
│   ├── docker-compose.monitoring.yml      # Monitoring stack
│   ├── docker-compose.firecrawl.yml       # Firecrawl service
│   ├── docker-compose.individual.yml      # Individual services (Ollama, Registry)
│   └── README.md
│
├── langgraph/              # LangGraph service (Port 8111)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── server.py
│   ├── README.md
│   ├── QUICK_START.md
│   ├── DEVELOPMENT.md
│   └── ENV_VARS.md
│
├── llamaindex/             # LlamaIndex RAG service
│   ├── ingestion_service/  # Document ingestion (internal)
│   ├── query_service/      # Query API (Port 3450)
│   ├── Dockerfile.ingestion
│   ├── Dockerfile.query
│   ├── requirements.txt
│   ├── DEPLOYMENT.md
│   └── k8s/                # Kubernetes manifests
│
├── monitoring/             # Monitoring stack
│   ├── prometheus/
│   ├── grafana/
│   ├── alertmanager/
│   ├── alert-router/
│   ├── docker-compose.yml
│   └── README.md
│
├── agno-agents/            # Agno agents service
├── docs-api/               # Documentation API
├── firecrawl/              # Web scraping tool
├── nginx-proxy/            # Nginx reverse proxy
├── ollama/                 # Ollama LLM service
├── openspec/               # OpenAPI specifications
├── registry/               # Docker registry config
└── tests/                  # Infrastructure tests
```

---

## 🎯 Available Stacks

### 1. Infrastructure Core

```bash
docker compose -f tools/compose/docker-compose.infrastructure.yml up -d
```

**Services:** Core infrastructure services

### 2. TimescaleDB

```bash
docker compose -f tools/compose/docker-compose.timescale.yml up -d
```

**Services:** TimescaleDB, PgAdmin, Postgres Exporter, Backup Service

### 3. Documentation Services

```bash
docker compose -f tools/compose/docker-compose.docs.yml up -d
```

**Services:** DocsAPI (Port 3400), DocsSpecs (Port 3101)

### 4. AI & ML Tools ⭐

```bash
docker compose -f tools/compose/docker-compose.infrastructure.yml up -d
```

**Services:**

- LangGraph (Port 8111) - Multi-agent orchestration
- LlamaIndex Ingestion - Document processing
- LlamaIndex Query (Port 3450) - Semantic search API
- Qdrant (Ports 6333-6334) - Vector database
- Agno Agents (Port 8200) - Agent orchestration

### 5. Monitoring

```bash
docker compose -f tools/monitoring/docker-compose.yml up -d
```

**Services:** Prometheus (9090), Grafana (3000), AlertManager (9093)

### 6. Firecrawl

```bash
docker compose -f tools/compose/docker-compose.firecrawl.yml up -d
```

**Services:** Firecrawl web scraping service

### 7. Individual Services

```bash
docker compose -f tools/compose/docker-compose.individual.yml up -d
```

**Services:** Ollama (Port 11434), Docker Registry (Port 5000)

---

## 🚀 Quick Start

### Canonical Scripts Location

**IMPORTANT:** All infrastructure management scripts are located in `scripts/docker/`:

- **Start all**: `bash scripts/docker/start-stacks.sh`
- **Stop all**: `bash scripts/docker/stop-stacks.sh`

**Legacy scripts** in `.backup-scripts-raiz/` are preserved for backwards compatibility but point to outdated paths. Use `scripts/docker/` for all new workflows.

### Health Check Policy

All services implement **Docker health checks** with readiness verification:

**Monitoring Stack:**
- Prometheus: Checks `/healthy` endpoint
- Grafana: Checks `/api/health` endpoint
- Alertmanager: Checks `/-/healthy` endpoint

**AI/ML Stack:**
- Qdrant: Checks `/healthz` (required for dependent services)
- LlamaIndex services: Check both service `/health` AND Qdrant availability
- LangGraph: Checks `/health` endpoint

**Best practices:**
- Services use `depends_on` with `condition: service_healthy` to ensure proper startup order
- Health checks include `start_period` to allow initialization time
- Retries set to 5 for AI services (longer startup times)
- Scripts use health endpoint polling instead of fixed sleep delays

**Check service health:**

```bash
# Individual service
docker inspect --format='{{.State.Health.Status}}' infra-llamaindex_query

# All AI services
docker compose -f tools/compose/docker-compose.infrastructure.yml ps

# Wait for service to be healthy
until docker inspect --format='{{.State.Health.Status}}' data-qdrant | grep -q healthy; do sleep 2; done
```

### Start EVERYTHING

```bash
# Recommended: Canonical script location
bash scripts/docker/start-stacks.sh

# Alternative: Individual compose files
docker compose -f tools/compose/docker-compose.infrastructure.yml up -d
docker compose -f tools/compose/docker-compose.timescale.yml up -d
docker compose -f tools/compose/docker-compose.docs.yml up -d
docker compose -f tools/monitoring/docker-compose.yml up -d
```

### Start only AI/ML

```bash
docker compose -f tools/compose/docker-compose.infrastructure.yml up -d
```

### Stop EVERYTHING

```bash
# Recommended: Canonical script location
bash scripts/docker/stop-stacks.sh

# Alternative: Stop individual compose files
docker compose -f tools/compose/docker-compose.infrastructure.yml down
docker compose -f tools/compose/docker-compose.timescale.yml down
docker compose -f tools/compose/docker-compose.docs.yml down
docker compose -f tools/monitoring/docker-compose.yml down
```

### View logs

```bash
docker compose -f tools/compose/docker-compose.infrastructure.yml logs -f
```

---

## 🤖 AI & ML Services

### 🔀 LangGraph - Multi-Agent Workflow Orchestration

**Port:** 8111  
**Status:** ✅ Production Ready (MVP)

**Overview:**  
Orquestrador central de workflows do TradingSystem usando state machines determinísticas com persistência de estado.

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                 LangGraph Service (8111)                 │
├─────────────────────────────────────────────────────────┤
│  Trading Workflows      │  Docs Workflows                │
│  Market→Risk→Execute    │  Fetch→Review/Enrich→Save      │
└─────────────────────────────────────────────────────────┘
     ↓               ↓                  ↓
Agno Agents     DocsAPI           Firecrawl
  (8200)        (3400)             (3600)
```

**Key Features:**
- Trading workflows (Market Analysis → Risk Validation → Execution)
- Documentation workflows (Review + Enrich)
- PostgreSQL checkpoints for state persistence
- QuestDB telemetry for events
- Prometheus metrics at `/metrics`
- Health checks with dependency status

**Quick Start:**
```bash
# Start service
docker compose -f tools/compose/docker-compose.infrastructure.yml up -d

# Health check
curl http://localhost:8111/health | jq

# Execute trading workflow
curl -X POST http://localhost:8111/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{"symbol":"WINZ25","mode":"paper"}'

# Review documentation
curl -X POST http://localhost:8111/workflows/docs/review \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test\nContent","operation":"review"}'
```

**Development Mode:**
- Production: Port 8111 (FastAPI server)
- Development: Port 8112 (LangSmith Studio integration)
- LangGraph CLI: `langgraph dev` (port 2024)

---

### 🤖 Agno Agents - Multi-Agent Trading Orchestration

**Port:** 8200

**Overview:**  
Orchestration layer for multi-agent trading workflows using the Agno framework.

**Agents:**
- **MarketAnalysisAgent:** Analisa sinais TP Capital e indicadores internos
- **RiskManagementAgent:** Aplica controles de risco e compliance
- **SignalOrchestratorAgent:** Coordena análise e validação de risco

**HTTP Client Adapters:**
- WorkspaceClient (Port 3100) - Idea bank operations
- TPCapitalClient (Port 3200) - Telegram-derived signals
- RiskEngineClient - Risk checks and limits

**Resilience Patterns:**
- Retry logic with exponential backoff
- Circuit breaker for cascading failure prevention
- Configurable timeouts for all HTTP calls

**API Endpoints:**
```bash
GET  /                      # Service metadata
GET  /health               # Health check (detailed with ?detailed=true)
GET  /metrics              # Prometheus metrics
POST /api/v1/agents/analyze        # Generate market insights
POST /api/v1/agents/signals        # Execute orchestrated workflows
GET  /api/v1/agents/status         # Agent readiness status
```

**Quick Start:**
```bash
# Health check
curl http://localhost:8200/health | jq

# Detailed health check
curl http://localhost:8200/health?detailed=true | jq

# Generate market analysis
curl -X POST http://localhost:8200/api/v1/agents/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbols":["WINZ25","INDZ25"]}'
```

---

### 🦙 LlamaIndex - RAG & Semantic Search

**Ports:** 3450 (Query API), 6333-6334 (Qdrant)

**Components:**
- **Ingestion Service:** Document processing and indexing
- **Query Service:** Semantic search and retrieval API
- **Qdrant:** Vector database for embeddings

**Use Cases:**
- Semantic search over documentation
- AI-powered Q&A
- Context retrieval for AI assistants
- Knowledge base queries

**Quick Start:**
```bash
# Query API
curl http://localhost:3450/health

# Qdrant status
curl http://localhost:6333/healthz
```

---

### 🤖 Ollama - Local LLM Server

**Port:** 11434  
**GPU:** RTX 5090 (32GB VRAM)

**Installed Models (95GB total):**
- **gpt-oss:120b** (65GB) - Maximum quality, deep analysis
- **gpt-oss:20b** (13GB) - Balanced, general use
- **gemma2:27b** (15GB) - Google, multilingual
- **llama3.2** (2GB) - Fast for simple responses

**Quick Start:**
```bash
# Test model
curl -s http://localhost:11434/api/generate -d '{
  "model": "gpt-oss:120b",
  "prompt": "Analyze market trends",
  "stream": false
}' | jq -r '.response'

# List installed models
docker exec ollama ollama list

# Interactive mode
docker exec -it ollama ollama run gpt-oss:120b

# GPU usage
nvidia-smi
```

**When to Use Each Model:**
| Task | Model | Reason |
|------|-------|--------|
| Deep analysis | gpt-oss:120b | Maximum intelligence |
| Daily use | gpt-oss:20b | Balanced performance |
| Translation | gemma2:27b | Multilingual support |
| Quick tests | llama3.2 | Speed |

---

## 🔧 Infrastructure Services

### 🕸️ Firecrawl - Web Scraping & Crawling

**Port:** 3002 (Core), 3600 (Proxy - Use this!)  
**Status:** Self-hosted deployment

**Overview:**  
Powerful web scraping and crawling API designed for AI applications, providing clean, structured data in LLM-ready format.

**Architecture:**
```
┌─────────────────────────────────────────┐
│  Firecrawl API (3002)                   │
│  - REST API endpoints                    │
│  - Job queue management                  │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────┐        ┌──────────────┐
│  Redis  │        │  Playwright  │
│  Queue  │        │   (Browser)  │
└─────────┘        └──────────────┘
```

**Key Features:**
- Web scraping with clean output
- Recursive website crawling
- Markdown format for LLM processing
- JavaScript rendering via Playwright
- Redis-based job queuing

**⚠️ IMPORTANT:** Always use the proxy endpoint (Port 3600) from application code. Direct access (Port 3002) is for ops/troubleshooting only.

**Quick Start:**
```bash
# Setup
cd tools/firecrawl
git submodule update --init --recursive
cd firecrawl-source
docker compose build
docker compose up -d

# Verify
curl http://localhost:3002/admin/@/queues

# Scrape via proxy (recommended)
curl -X POST http://localhost:3600/api/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","formats":["markdown","links"]}'

# Start crawl
curl -X POST http://localhost:3600/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.firecrawl.dev",
    "limit": 10,
    "maxDepth": 2,
    "scrapeOptions": {"formats": ["markdown"], "onlyMainContent": true}
  }'

# Check crawl status
curl http://localhost:3600/api/v1/crawl/<crawl-id>
```

**Configuration:**  
All environment variables in root `.env` file with `FIRECRAWL_` prefix. See `.env.example` for all options.

**Use Cases:**
- Financial news scraping
- Regulatory document collection
- Market data aggregation
- Content extraction for AI processing

---

### 📊 Monitoring - Prometheus + Grafana + Alertmanager

**Ports:** 9090 (Prometheus), 3000 (Grafana), 9093 (Alertmanager), 8080 (Alert Router)

**Overview:**  
Complete monitoring stack for TradingSystem services with metrics collection, visualization, and alerting.

**Services:**
- **Prometheus:** Metrics collection and storage
- **Grafana:** Visualization dashboards (admin/admin default)
- **Alertmanager:** Alert routing and management
- **Alert Router:** GitHub issue creation from alerts
- **Node Exporter:** Host metrics (Linux/WSL2)

**Quick Start:**
```bash
# Set environment variables
export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/...'
export GITHUB_TOKEN='ghp_xxx'
export GITHUB_OWNER='marceloterra'
export GITHUB_REPO='TradingSystem'

# Start stack
cd tools/monitoring
docker compose up -d --build

# Access services
http://localhost:9090  # Prometheus
http://localhost:3000  # Grafana (admin/admin)
http://localhost:9093  # Alertmanager
```

**Features:**
- Auto-loaded TradingSystem dashboard
- Automatic Prometheus datasource configuration
- Alert routing to Slack and GitHub
- Host metrics via node-exporter
- Support for Linux/WSL2 and Windows

**Platform-Specific Notes:**
- **Linux/WSL2:** Uses node-exporter container (default)
- **Windows:** Install windows_exporter service separately

---

### 🔀 Nginx Proxy - Unified Reverse Proxy

**Port:** 80  
**Domain:** tradingsystem.local (local), tradingsystem.yourdomain.com (production)

**Overview:**  
Unified reverse proxy routing all TradingSystem services under a single domain, eliminating CORS requirements.

**Benefits:**
- ✅ Eliminates CORS completely (same-origin)
- ✅ Single domain for all services
- ✅ Simplified API configuration
- ✅ Production-ready architecture
- ✅ Easy HTTPS migration

**Service URL Mapping:**
| Service | Unified URL | Direct Port |
|---------|-------------|-------------|
| Dashboard | `http://tradingsystem.local/` | `http://localhost:3103` |
| Workspace | `http://tradingsystem.local/api/library` | `http://localhost:3102` |
| TP Capital API | `http://tradingsystem.local/api/tp-capital` | `http://localhost:3200` |
| Documentation API | `http://tradingsystem.local/api/docs` | `http://localhost:3400` |
| Launcher | `http://tradingsystem.local/api/launcher` | `http://localhost:3500` |
| Docusaurus | `http://tradingsystem.local/docs` | `http://localhost:3205` |

**Quick Setup (Linux/WSL2):**
```bash
# Install Nginx
sudo apt update && sudo apt install nginx

# Add local domain
echo "127.0.0.1 tradingsystem.local" | sudo tee -a /etc/hosts

# Copy configuration
sudo cp tools/nginx-proxy/tradingsystem.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/tradingsystem.conf /etc/nginx/sites-enabled/

# Apply
sudo nginx -t
sudo systemctl reload nginx

# Verify
curl http://tradingsystem.local/health
```

**Production Deployment:**
- SSL/TLS with Let's Encrypt: `sudo certbot --nginx -d yourdomain.com`
- Performance tuning (worker processes, buffers, gzip)
- Security hardening (rate limiting, security headers)
- Monitoring with Prometheus exporter

**Troubleshooting:**
```bash
# Test configuration
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/tradingsystem-error.log

# Restart
sudo systemctl restart nginx

# Check port 80
sudo netstat -tlnp | grep :80
```

---

## 📦 Docker Compose Stacks

**Location:** `tools/compose/`

All stacks use centralized `.env` from project root. Each stack has explicit project name to prevent resource conflicts.

**Network Conventions:**
- `tradingsystem_data` - Database connections
- `tradingsystem_infra` - AI/ML services
- `tradingsystem_backend` - Backend APIs
- `tradingsystem_frontend` - Frontend apps

**Available Compose Files:**

| Stack | File | Project Name | Description |
|-------|------|--------------|-------------|
| Infrastructure | `docker-compose.infrastructure.yml` | `tradingsystem-infra` | AI/ML services (LangGraph, Qdrant, LlamaIndex, Agno) |
| TimescaleDB | `docker-compose.timescale.yml` | `tradingsystem-timescale` | Database cluster + PgAdmin + Backup |
| Database | `docker-compose.database.yml` | `database` | Database services |
| Documentation | `docker-compose.docs.yml` | `documentation` | DocsAPI + DocsSpecs viewer |
| Monitoring | `monitoring/docker-compose.yml` | - | Prometheus + Grafana + Alertmanager |
| Firecrawl | `docker-compose.firecrawl.yml` | - | Web scraping service |
| Individual | `docker-compose.individual.yml` | `individual` | Ollama + Registry |

**Tips:**
- Use `docker compose ... config` to validate before starting
- Pass `--remove-orphans` when switching stack versions
- Stop with `down` using the same command that started it

---

## 📊 Service Ports Reference

| Category | Service | Port | URL |
|----------|---------|------|-----|
| **AI & ML** ||||
| LangGraph | 8111 | <http://localhost:8111> |
| LangGraph Dev | 8112 | <http://localhost:8112> |
| Agno Agents | 8200 | <http://localhost:8200> |
| LlamaIndex Query | 3450 | <http://localhost:3450> |
| Qdrant HTTP | 6333 | <http://localhost:6333> |
| Qdrant gRPC | 6334 | - |
| Ollama | 11434 | <http://localhost:11434> |
| **Data** ||||
| TimescaleDB | 5433 | postgresql://localhost:5433 |
| PgAdmin | 5050 | <http://localhost:5050> |
| QuestDB API | 9000 | <http://localhost:9000> |
| QuestDB Console | 9009 | <http://localhost:9009> |
| **Monitoring** ||||
| Prometheus | 9090 | <http://localhost:9090> |
| Grafana | 3000 | <http://localhost:3000> |
| AlertManager | 9093 | <http://localhost:9093> |
| Alert Router | 8080 | <http://localhost:8080> |
| **Infrastructure** ||||
| Firecrawl Core | 3002 | <http://localhost:3002> |
| Firecrawl Proxy | 3600 | <http://localhost:3600> |
| Nginx Proxy | 80 | <http://tradingsystem.local> |
| Docker Registry | 5000 | <http://localhost:5000> |
| **Documentation** ||||
| DocsAPI | 3400 | <http://localhost:3400> |
| DocsSpecs Viewer | 3101 | <http://localhost:3101> |

---

## 🔐 Security

### Admin UI Security Hardening

**CRITICAL:** As interfaces administrativas restantes são vinculadas ao localhost (`127.0.0.1`) por padrão:

- **PgAdmin**: `http://127.0.0.1:5050`
- **Grafana**: `http://127.0.0.1:3000`

### First-Time Setup

1. **Change Default Credentials on First Run:**

```bash
# For PgAdmin - Copy and configure .env file
cd tools/compose
cp .env.timescaledb.example .env.timescaledb

# Edit .env.timescaledb and change:
# - PGADMIN_DEFAULT_PASSWORD
# - TIMESCALEDB_PASSWORD

# For Grafana - Change admin password via Web UI after first login
# Default: admin/admin → Change immediately at http://127.0.0.1:3000

```

1. **Generate Strong Passwords:**

```bash
# Generate secure random password
openssl rand -base64 32

# For multiple secrets
for i in {1..3}; do openssl rand -base64 32; done
```

1. **Environment Variables Template:**

Create `tools/compose/.env.timescaledb` with:

```env
TIMESCALEDB_DB=tradingsystem
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=<GENERATE_STRONG_PASSWORD>

PGADMIN_DEFAULT_EMAIL=admin@yourdomain.com
PGADMIN_DEFAULT_PASSWORD=<GENERATE_STRONG_PASSWORD>
```

### Shared Host Deployment

If running on a shared host or accessible network:

1. **Firewall Configuration:**

```bash
# Allow only specific IPs to access admin UIs
sudo ufw allow from 192.168.1.0/24 to any port 5050 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
```

1. **Network Binding:**

If you need remote access, update compose files to bind specific IPs:

```yaml
ports:
  - "192.168.1.100:5050:5050"  # Bind to specific host IP
```

1. **Use Reverse Proxy with Authentication:**

Consider using Traefik or Nginx with Basic Auth for additional security layer.

### Secrets Management (Production)

For production deployments, use Docker secrets or external secret managers:

```bash
# Example with Docker Swarm Secrets
echo "my_strong_password" | docker secret create pgadmin_password -

# Reference in compose:
secrets:
  pgadmin_password:
    external: true
```

### Security Checklist

- [ ] Changed PgAdmin default credentials (via .env file)
- [ ] Changed Grafana admin password (default: admin/admin)
- [ ] All admin UIs bound to localhost or specific IPs
- [ ] Firewall rules configured for shared hosts
- [ ] Strong passwords generated (minimum 32 characters)
- [ ] `.env` files added to `.gitignore` (already configured)
- [ ] Regular password rotation schedule established

### Qdrant Security (AI/ML Stack)

**Development (default):** Qdrant runs without authentication for local development.

**Production deployment:**

1. **Enable API Key Authentication:**

```bash
# Generate API key
openssl rand -base64 32

# Add to .env file or environment
QDRANT_API_KEY=your_generated_key_here
```

Update `docker-compose.infra.yml`:

```yaml
qdrant:
  environment:
    - QDRANT__SERVICE__API_KEY=${QDRANT_API_KEY}
```

1. **Enable TLS:**

```bash
# Generate self-signed certificate (or use Let's Encrypt)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tools/certs/qdrant-key.pem \
  -out tools/certs/qdrant-cert.pem
```

Update compose:

```yaml
qdrant:
  environment:
    - QDRANT__SERVICE__ENABLE_TLS=true
    - QDRANT__SERVICE__TLS__CERT=/qdrant/certs/cert.pem
    - QDRANT__SERVICE__TLS__KEY=/qdrant/certs/key.pem
  volumes:
    - ./certs:/qdrant/certs:ro
```

1. **Restrict Network Access:**

```yaml
# Bind to localhost only for non-Docker access
ports:
  - "127.0.0.1:6333:6333"
  - "127.0.0.1:6334:6334"
```

**See also:** `tools/llamaindex/DEPLOYMENT.md` for complete security setup.

### AI/ML Tools Environment Variables

Create `tools/compose/.env.ai-tools` for LlamaIndex and AI services:

```bash
# OpenAI API Key (REQUIRED for LlamaIndex)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Qdrant API Key (production only)
# QDRANT_API_KEY=your-qdrant-api-key

# Optional: Rate limiting
# RATE_LIMIT_REQUESTS=100
# RATE_LIMIT_PERIOD=60

# Optional: Logging
# LOG_LEVEL=INFO
```

**Setup:**

```bash
cd tools/compose

# Create .env.ai-tools file
cat > .env.ai-tools << 'EOF'
OPENAI_API_KEY=your-api-key-here
EOF

# Secure the file
chmod 600 .env.ai-tools

# Start AI services
docker compose -f docker-compose.infrastructure.yml up -d
```

**IMPORTANT:**

- Never commit `.env.ai-tools` (already in `.gitignore`)
- Generate API keys from <https://platform.openai.com/api-keys>
- Rotate keys regularly for production environments

### Image Version Management

All Docker images use **pinned versions** for reproducibility and stability:

- **Qdrant**: `qdrant/qdrant:v1.11.3`
- **Prometheus**: `prom/prometheus:v2.54.1`
- **Grafana**: `grafana/grafana:11.3.0`
- **TimescaleDB**: `timescale/timescaledb:2.15.2-pg15`

**Maintenance:**

```bash
# Periodically review and update versions through controlled process:
# 1. Test new version in development
# 2. Update compose file with new version tag
# 3. Document breaking changes in CHANGELOG.md
# 4. Deploy to production with rollback plan

# Example version update:
# docker pull qdrant/qdrant:v1.12.0
# docker compose -f tools/compose/docker-compose.infrastructure.yml up -d --no-deps qdrant
```

### Multi-Clone Isolation

Networks and volumes are **automatically namespaced** by Docker Compose based on the project directory name, allowing multiple clones of the repository to run simultaneously without conflicts.

**How it works:**

```bash
# Clone 1 in /home/user/TradingSystem
cd /home/user/TradingSystem
docker compose -f tools/compose/docker-compose.timescale.yml up -d
# Creates: tradingsystem-timescale_default, tradingsystem_data, tradingsystem-timescale_timescaledb-data

# Clone 2 in /home/user/TradingSystem-dev
cd /home/user/TradingSystem-dev
docker compose -f tools/compose/docker-compose.timescale.yml up -d
# Creates: tradingsystem-dev-timescale_default, tradingsystem-dev_data, tradingsystem-dev-timescale_timescaledb-data
```

**Custom project name:**

```bash
# Override project name with -p flag
docker compose -p my-trading-env -f tools/compose/docker-compose.timescale.yml up -d
```

**Cleanup orphaned resources:**

```bash
# List all networks created by project
docker network ls | grep tradingsystem

# Remove orphaned networks from deleted clones
docker network prune

# List all volumes
docker volume ls | grep tradingsystem

# Remove unused volumes (CAUTION: Data loss!)
docker volume prune
```

---

## 🌐 Arquitetura de Redes Docker

### Overview

TradingSystem utiliza múltiplas redes Docker para isolar e conectar serviços de forma segura e escalável.

### Redes Principais

#### 1. **tradingsystem_backend** (Bridge, Externa)
**Propósito:** Comunicação entre serviços backend

**Containers:**
- `tools-langgraph` (8111)
- `tools-agno-agents` (8200)
- `docs-api` (3400)
- `firecrawl-proxy` (3600)

**Características:**
- Rede compartilhada entre múltiplos compose files
- Declarada como `external: true`
- Permite comunicação entre stacks diferentes

#### 2. **tradingsystem_data** (Bridge, Externa)
**Propósito:** Acesso a databases

**Containers:**
- `data-timescaledb` (5433)
- `data-questdb` (9000)
- `data-postgres-langgraph` (5435)
- APIs que precisam de DB

#### 3. **tradingsystem_frontend** (Bridge, Externa)
**Propósito:** Serviços frontend

**Containers:**
- `docs-api-viewer` (3101)
- Frontend apps

#### 4. **tradingsystem_infra** (Bridge, Externa)
**Propósito:** Serviços de infraestrutura AI/ML

**Containers:**
- `data-qdrant` (6333-6334)
- LlamaIndex services

#### 5. **tools_default** (Bridge, Interna)
**Propósito:** Rede local do stack tools

**Containers:**
- Containers do `docker-compose.infrastructure.yml`
- Isolamento interno entre serviços tools

#### 6. **firecrawl_network** (Bridge, Interna)
**Propósito:** Isolamento do stack Firecrawl

**Containers:**
- `firecrawl-api` (3002)
- `firecrawl-postgres`
- `firecrawl-redis`
- `firecrawl-playwright`
- `firecrawl-proxy` (3600) - Também em tradingsystem_backend

### Diagrama de Conectividade

```
┌─────────────────────────────────────────────────────────────────┐
│                    tradingsystem_backend                        │
│                    (Comunicação Principal)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐           │
│  │ LangGraph  │───▶│ Agno       │───▶│ DocsAPI    │           │
│  │  (8111)    │    │ Agents     │    │  (3400)    │           │
│  └────────────┘    │  (8200)    │    └────────────┘           │
│        │           └────────────┘           │                  │
│        │                  │                 │                  │
│        └──────────────────┼─────────────────┘                  │
│                           │                                     │
│                           ▼                                     │
│                  ┌────────────────┐                            │
│                  │ Firecrawl      │                            │
│                  │ Proxy (3600)   │                            │
│                  └────────────────┘                            │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                ┌───────────┴──────────────┐
                │  firecrawl_network       │
                │  (Isolamento Interno)     │
                ├──────────────────────────┤
                │ ┌─────────────────────┐  │
                │ │ Firecrawl API       │  │
                │ │ Redis │ Postgres    │  │
                │ │ Playwright          │  │
                │ └─────────────────────┘  │
                └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    tradingsystem_data                           │
│                    (Database Access)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐           │
│  │TimescaleDB │    │ QuestDB    │    │ PostgreSQL │           │
│  │  (5433)    │    │  (9000)    │    │ LangGraph  │           │
│  └────────────┘    └────────────┘    │  (5435)    │           │
│        ▲                 ▲            └────────────┘           │
│        │                 │                   ▲                  │
└────────┼─────────────────┼───────────────────┼──────────────────┘
         │                 │                   │
    ┌────┴───┐      ┌──────┴──┐        ┌──────┴──┐
    │DocsAPI │      │LangGraph│        │LangGraph│
    │  APIs  │      │ Events  │        │Checkpts │
    └────────┘      └─────────┘        └─────────┘
```

### Convenções de Nomenclatura

**Containers:**
- Formato: `<stack>-<service>`
- Exemplos: `tools-langgraph`, `docs-api`, `data-timescaledb`

**Redes:**
- Formato: `tradingsystem_<purpose>`
- Externas: `tradingsystem_backend`, `tradingsystem_data`, `tradingsystem_frontend`
- Internas: `tools_default`, `firecrawl_network`

### Conectividade Entre Stacks

**Como containers em stacks diferentes se comunicam:**

1. **Redes Externas:** Criadas manualmente e compartilhadas
   ```bash
   docker network create tradingsystem_backend
   docker network create tradingsystem_data
   docker network create tradingsystem_frontend
   ```

2. **Declaração em Compose:**
   ```yaml
   networks:
     tradingsystem_backend:
       external: true
   ```

3. **Múltiplas Redes por Container:**
   ```yaml
   services:
     langgraph:
       networks:
         - tools_default          # Rede local
         - tradingsystem_backend  # Comunicação externa
   ```

### URLs de Conexão Entre Containers

**Formato:** `http://<container-name>:<internal-port>`

**Exemplos:**
```yaml
# LangGraph conectando a outros serviços
AGNO_API_URL=http://tools-agno-agents:8200       # Porta interna (não 8200 externa)
DOCS_API_URL=http://docs-api:80                  # Porta 80 interna (não 3400 externa)
FIRECRAWL_PROXY_URL=http://firecrawl-proxy:80    # Porta 80 interna (não 3600 externa)
```

**⚠️ IMPORTANTE:** Use portas **internas** do container, não as portas expostas no host!

### Mapeamento de Portas

| Serviço | Porta Host → Container | Rede(s) |
|---------|------------------------|---------|
| LangGraph | 8111 → 8111 | tools_default, tradingsystem_backend |
| Agno Agents | 8200 → 8200 | tools_default, tradingsystem_backend |
| DocsAPI | 3400 → 80 | tradingsystem_backend |
| Firecrawl Proxy | 3600 → 80 | firecrawl_network, tradingsystem_backend |
| Firecrawl API | 3002 → 80 | firecrawl_network |
| TimescaleDB | 5433 → 5432 | tradingsystem_data |
| QuestDB | 9000 → 9000 | tradingsystem_data |

### Troubleshooting de Redes

#### Verificar redes de um container:
```bash
docker inspect <container-name> --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

#### Listar todas as redes:
```bash
docker network ls | grep tradingsystem
```

#### Conectar container a rede adicional:
```bash
docker network connect tradingsystem_backend <container-name>
```

#### Testar conectividade entre containers:
```bash
docker exec <source-container> curl http://<target-container>:<port>/health
```

#### Criar redes externas (se não existem):
```bash
docker network create tradingsystem_backend
docker network create tradingsystem_data
docker network create tradingsystem_frontend
docker network create tradingsystem_infra
```

### Security Best Practices

1. **Isolamento:** Serviços sensíveis em redes privadas
2. **Exposição Mínima:** Apenas portas necessárias no host
3. **Firewalls:** Use `--internal` para redes totalmente privadas
4. **DNS:** Use nomes de container, não IPs

---

## 📚 Related Documentation

- **Complete structure:** `docs/DIRECTORY-STRUCTURE.md`
- **Installed components:** `docs/INSTALLED-COMPONENTS.md`
- **LangGraph documentation:** `tools/langgraph/README.md`
- **LlamaIndex documentation:** `tools/llamaindex/DEPLOYMENT.md`
- **Docker Compose stacks:** `tools/compose/README.md`

---

## 🔄 Recent Changelog

### v2.2.0 (2025-10-23) - Tools Directory Cleanup & Organization

- ✅ Removed duplicate docker-compose files (cache.yml, documentation.yml)
- ✅ Cleaned up temporary status files from langgraph/
- ✅ Reorganized openspec/ directory (removed historical changes/)
- ✅ Updated all documentation paths from infrastructure/ to tools/
- ✅ Consolidated service definitions in compose/ directory

### v2.1.0 (2025-10-15) - AI/ML Reorganization

- ✅ Moved LangGraph from `ai/compose/` to `tools/langgraph/`
- ✅ Moved LlamaIndex from `backend/services/` to `tools/llamaindex/`
- ✅ Consolidated docker-compose into single AI/ML file
- ✅ Removed duplicated `ai/` folder
- ✅ Updated documentation

---

**Responsible:** DevOps & Infrastructure Team  
**Status:** ✅ Updated and Tested

# 🏗️ Infrastructure - TradingSystem

> **Infrastructure, DevOps and AI/ML services hub**
>
> **Last updated:** 2025-10-15  
> **Version:** 2.1.0

---

## 📁 Directory Structure

```text
infrastructure/
├── compose/                # Docker Compose stacks
│   ├── docker-compose.infra.yml      # Infrastructure placeholder (no default containers)
│   ├── docker-compose.data.yml       # Legacy stub (QuestDB retired)
│   ├── docker-compose.timescale.yml  # TimescaleDB stack
│   └── docker-compose.infra.yml   # AI & ML Tools (LangGraph, LlamaIndex, Qdrant)
│
├── langgraph/              # LangGraph service (Port 8111)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── server.py
│
├── llamaindex/             # LlamaIndex RAG service
│   ├── ingestion_service/  # Document ingestion (internal)
│   ├── query_service/      # Query API (Port 3450)
│   ├── Dockerfile.ingestion
│   ├── Dockerfile.query
│   ├── requirements.txt
│   └── k8s/                # Kubernetes manifests
│
├── monitoring/             # Monitoring stack
│   ├── prometheus/
│   ├── grafana/
│   └── alertmanager/
│
├── nginx-proxy/            # Nginx reverse proxy
├── scripts/                # Infrastructure automation
├── systemd/                # Linux service definitions
├── timescaledb/            # TimescaleDB configs
├── tp-capital/             # TP Capital integration
├── context7/               # Context7 integration
├── firecrawl/              # Web scraping tool
└── glm/                    # Graph Learning Model tools
```

---

## 🎯 Available Stacks

### 1. Infrastructure Core

```bash
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d
```

**Status:** Placeholder stack mantido apenas para compatibilidade (UI gráfica de containers removida, nenhum container definido por padrão)

### 2. Data Layer (Legacy)

> ⚠️ **QuestDB foi descontinuado.**  
> O arquivo `docker-compose.data.yml` permanece apenas para compatibilidade (não inicia serviços).
> Utilize o stack TimescaleDB abaixo para o datastore oficial.

### 3. TimescaleDB

```bash
docker compose -f infrastructure/compose/docker-compose.timescale.yml up -d
```

**Services:** TimescaleDB, PgAdmin, Postgres Exporter, Backup Service

### 4. AI & ML Tools ⭐ NEW

```bash
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d
```

**Services:**

- LangGraph (Port 8111) - Multi-agent orchestration
- LlamaIndex Ingestion - Document processing
- LlamaIndex Query (Port 3450) - Semantic search API
- Qdrant (Ports 6333-6334) - Vector database

### 5. Monitoring

```bash
docker compose -f infrastructure/monitoring/docker-compose.yml up -d
```

**Services:** Prometheus (9090), Grafana (3000), AlertManager (9093)

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
docker compose -f infrastructure/compose/docker-compose.infra.yml ps

# Wait for service to be healthy
until docker inspect --format='{{.State.Health.Status}}' data-qdrant | grep -q healthy; do sleep 2; done
```

### Start EVERYTHING

```bash
# Recommended: Canonical script location
bash scripts/docker/start-stacks.sh

# Alternative: Individual compose files
# (Optional) Placeholder stack - kept for compatibility (no containers defined)
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d
# Primary datastore
docker compose -f infrastructure/compose/docker-compose.timescale.yml up -d
docker compose -f infrastructure/monitoring/docker-compose.yml up -d
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d
```

### Start only AI/ML

```bash
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d
```

### Stop EVERYTHING

```bash
# Recommended: Canonical script location
bash scripts/docker/stop-stacks.sh

# Alternative: Stop individual compose files
docker compose -f infrastructure/compose/docker-compose.infra.yml down
docker compose -f infrastructure/monitoring/docker-compose.yml down
# Primary datastore
docker compose -f infrastructure/compose/docker-compose.timescale.yml down
# (Optional) Placeholder stack - kept for compatibility (no containers defined)
docker compose -f infrastructure/compose/docker-compose.infra.yml down
```

### View logs

```bash
docker compose -f infrastructure/compose/docker-compose.infra.yml logs -f
```

---

## 🤖 AI & ML Tools (New in v2.1)

### LangGraph

**Location:** `infrastructure/langgraph/`  
**Port:** 8111  
**Function:** Multi-agent workflow orchestration

**Endpoints:**

- `GET /` - Service info
- `GET /health` - Health check

### LlamaIndex

**Location:** `infrastructure/llamaindex/`  
**Ports:**

- 3450 (Query API)
- 6333-6334 (Qdrant)

**Components:**

- **Ingestion Service:** Processes and indexes documents
- **Query Service:** Semantic search and retrieval API
- **Qdrant:** Vector database for embeddings

**Use Cases:**

- Semantic search over documentation
- AI-powered Q&A
- Context retrieval for assistants
- Knowledge base queries

---

## 📊 Used Ports

> **Nota:** A stack de infraestrutura (`docker-compose.infra.yml`) não define mais containers por padrão. A antiga UI de containers e o Traefik foram removidos; utilize os demais stacks conforme necessário.

| Service | Port | URL |
|---------|------|-----|
| **Data** |||
| QuestDB API | 9000 | <http://localhost:9000> |
| QuestDB Console | 9009 | <http://localhost:9009> |
| TimescaleDB | 5433 | postgresql://localhost:5433 |
| PgAdmin | 5050 | <http://localhost:5050> |
| **Monitoring** |||
| Prometheus | 9090 | <http://localhost:9090> |
| Grafana | 3000 | <http://localhost:3000> |
| AlertManager | 9093 | <http://localhost:9093> |
| **AI & ML** |||
| LangGraph | 8111 | <http://localhost:8111> |
| LlamaIndex Query | 3450 | <http://localhost:3450> |
| Qdrant HTTP | 6333 | <http://localhost:6333> |
| Qdrant gRPC | 6334 | - |

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
cd infrastructure/compose
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

Create `infrastructure/compose/.env.timescaledb` with:

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
  -keyout infrastructure/certs/qdrant-key.pem \
  -out infrastructure/certs/qdrant-cert.pem
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

**See also:** `infrastructure/llamaindex/DEPLOYMENT.md` for complete security setup.

### AI/ML Tools Environment Variables

Create `infrastructure/compose/.env.ai-tools` for LlamaIndex and AI services:

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
cd infrastructure/compose

# Create .env.ai-tools file
cat > .env.ai-tools << 'EOF'
OPENAI_API_KEY=your-api-key-here
EOF

# Secure the file
chmod 600 .env.ai-tools

# Start AI services
docker compose -f docker-compose.infra.yml up -d
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
# docker compose -f infrastructure/compose/docker-compose.infra.yml up -d --no-deps qdrant
```

### Multi-Clone Isolation

Networks and volumes are **automatically namespaced** by Docker Compose based on the project directory name, allowing multiple clones of the repository to run simultaneously without conflicts.

**How it works:**

```bash
# Clone 1 in /home/user/TradingSystem
cd /home/user/TradingSystem
docker compose -f infrastructure/compose/docker-compose.timescale.yml up -d
# Creates: tradingsystem-timescale_default, tradingsystem_data, tradingsystem-timescale_timescaledb-data

# Clone 2 in /home/user/TradingSystem-dev
cd /home/user/TradingSystem-dev
docker compose -f infrastructure/compose/docker-compose.timescale.yml up -d
# Creates: tradingsystem-dev-timescale_default, tradingsystem-dev_data, tradingsystem-dev-timescale_timescaledb-data
```

**Custom project name:**

```bash
# Override project name with -p flag
docker compose -p my-trading-env -f infrastructure/compose/docker-compose.timescale.yml up -d
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

## 📚 Related Documentation

- **Complete structure:** `docs/DIRECTORY-STRUCTURE.md`
- **Installed components:** `docs/INSTALLED-COMPONENTS.md`
- **AI/ML reorganization:** `infrastructure/AI-ML-REORGANIZATION.md`
- **Docker services:** `infrastructure/DOCKER-SERVICES-SUMMARY.md`

---

## 🔄 Recent Changelog

### v2.1 (2025-10-15) - AI/ML Reorganization

- ✅ Moved LangGraph from `ai/compose/` to `infrastructure/langgraph/`
- ✅ Moved LlamaIndex from `backend/services/` to `infrastructure/llamaindex/`
- ✅ Consolidated docker-compose into single AI/ML file
- ✅ Removed duplicated `ai/` folder
- ✅ Updated documentation

---

**Responsible:** DevOps & Infrastructure Team  
**Status:** ✅ Updated and Tested

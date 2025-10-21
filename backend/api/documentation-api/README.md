# 📚 DocsAPI - Documentation Management API

> **RESTful API for managing TradingSystem documentation**
>
> **Port:** 3400  
> **Status:** ✅ Production Ready (Containerized)  
> **Database:** TimescaleDB (QuestDB legacy migration in progresso)  
> **Last Updated:** 2025-10-15

---

## 📋 Overview

DocsAPI is a Node.js/Express API that provides centralized management for TradingSystem documentation:

-   **📊 Systems Registry** - Track all documentation services (Docusaurus, APIs, tools)
-   **💡 Ideas Management** - Kanban workflow for documentation improvements
-   **📋 Spec Serving** - Serve and validate OpenAPI/AsyncAPI specifications
-   **🔍 Search Engine** - Full-text search across documentation
-   **📎 File Management** - Upload and manage file attachments
-   **📈 Statistics** - Documentation coverage and health metrics
-   **📝 Audit Trail** - Track all changes with timestamp and user info

---

## 🐳 Docker Deployment (Recommended)

### Quick Start

```bash
# Start DocsAPI container
docker compose -f infrastructure/compose/docker-compose.docs.yml up -d docs-api

# Check health
curl http://localhost:3400/health

# View logs
docker compose -f infrastructure/compose/docker-compose.docs.yml logs -f docs-api
```

### Prerequisites

-   Docker 24.0+ and Docker Compose v2.20+
-   TimescaleDB running (from `docker-compose.timescale.yml`)
-   PostgreSQL 15+ available when `DOCUMENTATION_DB_STRATEGY=postgres`

### Configuration

Copy environment template:

```bash
cp backend/api/documentation-api/docker.env.template backend/api/documentation-api/.env
```

Edit `.env` with your settings:

```env
PORT=3400
NODE_ENV=production
QUESTDB_HOST=questdb
QUESTDB_HTTP_PORT=9000
QUESTDB_USER=admin
QUESTDB_PASSWORD=quest
```

---

## 🖥️ Local Development (Alternative)

For local development without Docker:

```bash
cd backend/api/documentation-api

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Start server
npm run dev
```

**Requirements:**

-   Node.js 22+
-   TimescaleDB running (via `docker-compose.timescale.yml`)
    > _Nota:_ variáveis `QUESTDB_*` permanecem enquanto a refatoração não converte o cliente para TimescaleDB.

---

## 📡 API Endpoints

### Health & Info

```bash
# Health check
GET /health

# Service information
GET /

# Prometheus metrics
GET /metrics
```

### Documentation Systems

```bash
# List all systems
GET /api/v1/systems

# Get system by ID
GET /api/v1/systems/:id

# Create system
POST /api/v1/systems
{
  "name": "New API Documentation",
  "description": "Documentation for XYZ API",
  "port": 3500,
  "status": "online"
}

# Update system
PUT /api/v1/systems/:id

# Delete system
DELETE /api/v1/systems/:id
```

### Documentation Ideas

```bash
# List all ideas
GET /api/v1/ideas

# Create idea
POST /api/v1/ideas
{
  "title": "Improve API examples",
  "description": "Add more code examples",
  "category": "api",
  "priority": "medium"
}

# Update idea (e.g., change status)
PUT /api/v1/ideas/:id
{
  "status": "in_progress"
}

# Delete idea
DELETE /api/v1/ideas/:id
```

### Specifications

```bash
# Serve OpenAPI spec
GET /spec/openapi.yaml

# Serve AsyncAPI spec
GET /spec/asyncapi.yaml

# Spec validation status
GET /api/v1/docs/status

# Download all specs as ZIP
GET /api/v1/docs/download
```

### Search

```bash
# Search documentation
GET /api/v1/search?q=authentication

# Search with filters
GET /api/v1/search?q=auth&type=endpoint&source=openapi

# Autocomplete suggestions
GET /api/v1/suggest?q=auth&limit=5
```

### Markdown Documentation Search

```bash
# Search markdown documentation with faceted filtering
GET /api/v1/docs/search?q=dark+mode&domain=frontend&type=guide&limit=20

# Query Parameters:
# - q (required): Search query (min 2 chars, max 200 chars)
# - domain (optional): Filter by domain (frontend, backend, ops, shared)
# - type (optional): Filter by document type (guide, reference, adr, prd, rfc, runbook, overview, index, glossary, template, feature)
# - tags (optional): Filter by tags (comma-separated, max 10 tags)
# - status (optional): Filter by status (active, draft, deprecated)
# - limit (optional): Max results (1-100, default: 20)

# Response:
{
  "success": true,
  "total": 23,
  "results": [
    {
      "id": "frontend-guides-dark-mode",
      "title": "Dark Mode Implementation Hub",
      "domain": "frontend",
      "type": "guide",
      "tags": ["frontend", "ui", "dark-mode", "theming"],
      "status": "active",
      "path": "/docs/frontend/guides/dark-mode",
      "summary": "Navigation hub for dark mode implementation...",
      "score": 0.95
    }
  ],
  "query": {
    "q": "dark mode",
    "filters": {
      "domain": "frontend",
      "type": "guide"
    }
  }
}
```

```bash
# Get facet counts for filtering
GET /api/v1/docs/facets?q=deployment

# Query Parameters:
# - q (optional): Filter facets by search query

# Response:
{
  "success": true,
  "facets": {
    "domains": [
      {"value": "frontend", "count": 45},
      {"value": "backend", "count": 38},
      {"value": "ops", "count": 52},
      {"value": "shared", "count": 60}
    ],
    "types": [
      {"value": "guide", "count": 35},
      {"value": "reference", "count": 28},
      {"value": "adr", "count": 4}
    ],
    "tags": [
      {"value": "frontend", "count": 45},
      {"value": "api", "count": 32},
      {"value": "deployment", "count": 28}
    ],
    "statuses": [
      {"value": "active", "count": 185},
      {"value": "draft", "count": 8},
      {"value": "deprecated", "count": 2}
    ]
  }
}
```

```bash
# Autocomplete suggestions for markdown search
GET /api/v1/docs/suggest?q=dark&limit=5

# Query Parameters:
# - q (required): Partial query (min 2 chars)
# - limit (optional): Max suggestions (1-10, default: 5)

# Response:
{
  "success": true,
  "suggestions": [
    {
      "text": "Dark Mode Implementation Hub",
      "domain": "frontend",
      "type": "guide",
      "path": "/docs/frontend/guides/dark-mode"
    }
  ]
}
```

```bash
# Trigger manual reindex of markdown documentation
POST /api/v1/docs/reindex

# Response:
{
  "success": true,
  "indexed": {
    "files": 195,
    "domains": 4,
    "types": 11,
    "tags": 52,
    "duration_ms": 8234
  }
}

# Rate Limit: 1 request per minute
```

### Files

```bash
# Upload file attachment
POST /api/v1/files/upload
Content-Type: multipart/form-data

# List files
GET /api/v1/files?idea_id=<id>

# Download file
GET /api/v1/files/:fileId/download

# Delete file
DELETE /api/v1/files/:fileId
```

### Statistics

```bash
# Get documentation statistics
GET /api/v1/stats

# Response:
{
  "systems": { "total": 8, "online": 7 },
  "ideas": { "total": 45, "in_progress": 15 },
  "specs": { "endpoints": 25, "channels": 15 }
}
```

---

## 💾 Database Schema

### PostgreSQL & Prisma (in progress)

-   Prisma schema lives in `prisma/schema.prisma` with initial migration SQL at `prisma/migrations/0001_init/migration.sql`.
-   Generate client & sync schema locally:

```bash
cd backend/api/documentation-api
DOCUMENTATION_DATABASE_URL="postgresql://app_documentation:app_documentation_dev_password@localhost:5444/frontend_apps?schema=documentation" npm run prisma:generate
DOCUMENTATION_DATABASE_URL="postgresql://app_documentation:app_documentation_dev_password@localhost:5444/frontend_apps?schema=documentation" npm run prisma:migrate:deploy
```

-   Switch the service to PostgreSQL by setting in `.env`:

```env
DOCUMENTATION_DB_STRATEGY=postgres
DOCUMENTATION_DATABASE_URL=postgresql://app_documentation:app_documentation_dev_password@localhost:5444/frontend_apps?schema=documentation
```

-   Switch runtime strategy with `DOCUMENTATION_DB_STRATEGY=questdb|postgres` without changing API clients.
-   Current Prisma-backed repositories cover ideas, systems, and files (audit log pending). QuestDB remains the default until production cutover.

### QuestDB → PostgreSQL Migration

Use the helper script to copy QuestDB data into PostgreSQL:

```bash
cd backend/api/documentation-api

# Dry-run (preview only)
npm run migrate:questdb:postgres -- --dry-run

# Migrate while keeping existing Postgres rows
npm run migrate:questdb:postgres -- --skip-existing

# Full migration (truncate Postgres tables first)
npm run migrate:questdb:postgres -- --truncate
```

**Options**

-   `--dry-run` — validate connections and log planned changes without writing.
-   `--skip-existing` — skip rows whose IDs already exist in PostgreSQL.
-   `--truncate` — clear `documentation_systems`, `documentation_ideas`, and `documentation_files` before import.

The script preserves timestamps, normalizes JSON fields (`tags`, `metadata`), and migrates download counters. Ensure QuestDB is reachable and `DOCUMENTATION_DATABASE_URL` is configured before running.

**PostgreSQL Migration Checklist**

-   [x] Prisma tooling, schema, and migrations scaffolded.
-   [x] Documentation ideas repository ported with runtime strategy selection.
-   [x] Systems/files repositories ported to Prisma.
-   [x] Automated QuestDB → PostgreSQL migration scripts (ideas, systems, files).
-   [ ] Observability, backups, and rollout rehearsal for the new datastore.
-   [ ] Audit log migration and replay validation.
-   [ ] Test suite parity for PostgreSQL strategy (unit/integration).

### Tables in QuestDB

1. **`documentation_systems`** - Registered documentation services
2. **`documentation_ideas`** - Documentation improvement ideas
3. **`documentation_files`** - File attachments metadata
4. **`documentation_audit_log`** - Audit trail of all changes

### Initialize Schemas

```bash
# Via QuestDB Web Console (http://localhost:9000)
# Copy and execute: backend/api/documentation-api/db/init.sql

# Or via HTTP API:
curl -G http://localhost:9000/exec \
  --data-urlencode "query=$(cat backend/api/documentation-api/db/init.sql)"
```

---

## 🔧 Docker Management

### Development Mode (Hot Reload)

```bash
# Set development target
export BUILD_TARGET=development

# Start with source code mounted
docker compose -f infrastructure/compose/docker-compose.docs.yml up -d

# Changes to src/ will trigger auto-reload
```

### Production Mode

```bash
# Use default (production target)
docker compose -f infrastructure/compose/docker-compose.docs.yml up -d

# Optimized multi-stage build
# Non-root user
# Health checks enabled
```

### View Logs

```bash
# Follow logs
docker compose -f infrastructure/compose/docker-compose.docs.yml logs -f docs-api

# Last 100 lines
docker logs --tail 100 docs-api

# With timestamps
docker logs -t docs-api
```

### Execute Commands

```bash
# Open shell in container
docker exec -it docs-api sh

# Run health check
docker exec docs-api curl -s http://localhost:3400/health

# Check database connection
docker exec docs-api node -e "require('./src/utils/questDBClient.js').default.healthCheck().then(console.log)"
```

### Backup & Restore

```bash
# Backup uploads volume
docker run --rm -v tradingsystem_docs-api-uploads:/data \
  -v $(pwd)/backups:/backup alpine \
  tar czf /backup/docs-api-uploads-$(date +%Y%m%d).tar.gz /data

# Restore uploads volume
docker run --rm -v tradingsystem_docs-api-uploads:/data \
  -v $(pwd)/backups:/backup alpine \
  tar xzf /backup/docs-api-uploads-YYYYMMDD.tar.gz -C /
```

---

## 🧪 Testing

### Automated Test Suite

```bash
# Run complete test suite
bash scripts/docker/test-docs-api.sh

# Expected: All tests pass
```

### Manual Testing

```bash
# Health check
curl http://localhost:3400/health

# List systems
curl http://localhost:3400/api/v1/systems

# Create test idea
curl -X POST http://localhost:3400/api/v1/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Idea",
    "description": "Testing API",
    "category": "api",
    "priority": "low"
  }'

# Search
curl "http://localhost:3400/api/v1/search?q=test"
```

---

## 📊 Monitoring

### Health Checks

```bash
# Docker health status
docker inspect --format='{{.State.Health.Status}}' docs-api

# Application health
curl http://localhost:3400/health

# Expected:
{
  "status": "ok",
  "service": "documentation-api",
  "timestamp": "2025-10-15T10:00:00.000Z",
  "database": "healthy"
}
```

### Prometheus Metrics

```bash
# Get metrics
curl http://localhost:3400/metrics

# Metrics available:
# - tradingsystem_http_requests_total
# - tradingsystem_http_request_duration_seconds
# - tradingsystem_questdb_queries_total
# - tradingsystem_questdb_query_duration_seconds
```

### Container Stats

```bash
# Real-time stats
docker stats docs-api

# Expected:
# CPU: 1-5%
# MEM: 150-250 MB
# NET I/O: Variable
```

---

## 🔐 Security

### Production Checklist

-   [ ] Change `QUESTDB_PASSWORD` in `.env` (use strong password)
-   [ ] Set specific `CORS_ORIGIN` (never use `*` in production)
-   [ ] Enable HTTPS via reverse proxy (Traefik/Nginx)
-   [ ] Review rate limits based on traffic
-   [ ] Secure `.env` file (chmod 600, never commit)
-   [ ] Enable Docker secrets for sensitive data
-   [ ] Regular security updates: `docker compose pull && docker compose up -d`

### Generate Strong Password

```bash
# Generate 32-character password
openssl rand -base64 32
```

---

## 📚 Documentation

-   **Migration Guide:** `docs/DOCS-SERVICES-DOCKER-MIGRATION.md`
-   **Docker Compose:** `infrastructure/compose/docker-compose.docs.yml`
-   **API Specifications:** `docs/spec/openapi.yaml`
-   **Database Schema:** `backend/api/documentation-api/db/init.sql`

---

## 🆘 Support

-   **Logs:** `docker compose -f infrastructure/compose/docker-compose.docs.yml logs docs-api`
-   **Health:** <http://localhost:3400/health>
-   **Documentation:** `/docs/context/backend/api/documentation-api/`

---

**Deployment:** 🐳 Docker Container  
**Repository:** `backend/api/documentation-api/`  
**Container Name:** `docs-api`  
**Network:** `tradingsystem_backend`, `tradingsystem_data`


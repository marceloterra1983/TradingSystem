# Workspace Stack - Unified Container Deployment

**Workspace application** with dedicated **Neon PostgreSQL database** - all containers managed as a single unified stack.

## 🎯 Overview

The Workspace Stack is a **self-contained deployment** containing:

- **Workspace API** - Express REST API (Node.js 20)
- **Neon Database** - PostgreSQL 17 with database branching
  - Pageserver (storage layer)
  - Safekeeper (WAL service)
  - Compute (PostgreSQL endpoint)

**Total**: 4 containers managed as one unit via `docker-compose.workspace-stack.yml`

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│ Workspace Stack (workspace_network)             │
│                                                  │
│  Dashboard (Port 3103)                          │
│      ↓ HTTP REST                                │
│  workspace-api (Port 3200)                      │
│      ├─ GET /api/items - List items             │
│      ├─ POST /api/items - Create item           │
│      ├─ PUT /api/items/:id - Update item        │
│      ├─ DELETE /api/items/:id - Delete item     │
│      ├─ GET /health - Health check              │
│      └─ GET /metrics - Prometheus metrics       │
│      ↓ PostgreSQL Wire Protocol                 │
│  workspace-db-compute (Port 5433)               │
│      ↓                        ↓                  │
│  workspace-db-pageserver  workspace-db-safekeeper│
│  (Storage Layer)         (WAL Service)          │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 📋 Prerequisites

- Docker & Docker Compose (version 2.0+)
- 10GB+ free disk space (for Neon build)
- Project root `.env` configured
- Ports available: 3200, 5433, 6400, 9898, 5454, 7676

## 🚀 Quick Start

### Option A: Using Helper Scripts (Recommended)

```bash
# 1. Build Neon image (first time only - ~30 minutes)
bash scripts/database/build-neon-from-source.sh

# 2. Start entire Workspace stack (Neon + API)
bash scripts/docker/start-workspace-stack.sh

# 3. Initialize database
bash scripts/database/init-neon-workspace.sh

# 4. Test connection
bash scripts/database/test-neon-connection.sh

# 5. Verify API
curl http://localhost:3200/health
```

### Option B: Using Docker Compose Directly

```bash
# Build Neon (if not already built)
docker build -f tools/compose/neon.Dockerfile -t neon-local:latest .

# Start stack
docker compose -f tools/compose/docker-compose.workspace-stack.yml up -d

# Check status
docker compose -f tools/compose/docker-compose.workspace-stack.yml ps

# Initialize database
bash scripts/database/init-neon-workspace.sh
```

## 📝 Configuration

### Environment Variables (from root `.env`)

```env
# Database Strategy (locked to neon in workspace-stack)
LIBRARY_DB_STRATEGY=neon

# Neon Connection
NEON_HOST=localhost
NEON_PORT=5433
NEON_DATABASE=workspace
NEON_USER=postgres
NEON_PASSWORD=neon_secure_pass
NEON_SCHEMA=workspace

# Connection Pool
NEON_POOL_MAX=20
NEON_POOL_MIN=2
NEON_CONNECTION_TIMEOUT=5000

# Server
WORKSPACE_PORT=3200
WORKSPACE_EXTERNAL_PORT=3200
NODE_ENV=development
LOG_LEVEL=info
```

## 📊 Database Schema

### Tables

**workspace_items** (~10k rows expected):
- Primary key: `id` (SERIAL)
- Fields: title, description, category, priority, status
- Arrays: tags (TEXT[])
- JSONB: metadata (flexible data)
- Timestamps: created_at, updated_at
- Audit: created_by, updated_by

**workspace_categories** (6 fixed rows):
- Primary key: name (VARCHAR)
- Seeded with: documentacao, coleta-dados, banco-dados, analise-dados, gestao-riscos, dashboard

### Indexes

- B-tree: category, status, priority, created_at
- GIN: tags (array search), metadata (JSONB search)
- Partial: is_active (categories)

## 🔄 Data Migration

### From TimescaleDB to Neon

```bash
# Migrate with automatic backup
bash scripts/database/migrate-workspace-to-neon.sh --backup

# Dry run (preview migration)
bash scripts/database/migrate-workspace-to-neon.sh --dry-run
npm run migrate:lowdb
```

**Migration process:**
1. Exports data from TimescaleDB (categories + items)
2. Creates backup in /tmp (if --backup flag used)
3. Imports into Neon database
4. Verifies record counts match
5. Displays summary and next steps

**Verification:**
- Record counts compared automatically
- Rollback plan documented
- TimescaleDB backup retained for 14 days

---

## 🐳 Stack Management

### Start/Stop Commands

```bash
# Start entire stack (4 containers)
bash scripts/docker/start-workspace-stack.sh

# Stop stack (preserves data)
bash scripts/docker/stop-workspace-stack.sh

# Stop and DELETE ALL DATA (⚠️ CAUTION!)
bash scripts/docker/stop-workspace-stack.sh --remove-volumes

# Restart stack
docker compose -f tools/compose/docker-compose.workspace-stack.yml restart

# View logs
docker compose -f tools/compose/docker-compose.workspace-stack.yml logs -f
```

### Container Status

```bash
# Check all 4 containers
docker compose -f tools/compose/docker-compose.workspace-stack.yml ps

# Expected output:
# workspace-api            Up (healthy)   0.0.0.0:3200->3200/tcp
# workspace-db-compute     Up (healthy)   0.0.0.0:5433->55432/tcp
# workspace-db-pageserver  Up (healthy)   0.0.0.0:6400->6400/tcp, 0.0.0.0:9898->9898/tcp
# workspace-db-safekeeper  Up (healthy)   0.0.0.0:5454->5454/tcp, 0.0.0.0:7676->7676/tcp
```

### Resource Usage

```bash
# Monitor resources
docker stats --no-stream | grep workspace

# Expected usage:
# workspace-api:            ~200MB RAM, ~5% CPU
# workspace-db-compute:     ~500MB RAM, ~10% CPU
# workspace-db-pageserver:  ~500MB RAM, ~20% CPU
# workspace-db-safekeeper:  ~200MB RAM, ~10% CPU
# TOTAL:                    ~1.4GB RAM, ~45% CPU
```

---

## 🔌 API Endpoints

### Health Check

```bash
GET /health
```

**Response (healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T12:00:00.000Z",
  "service": "workspace-api",
  "version": "1.0.0",
  "checks": {
    "database": "neon connected"
  },
  "uptime": 3600
}
```

**Database strategy**: Always `neon` when using workspace-stack

### List Items

```bash
GET /api/items
```

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "abc-123",
      "title": "Implement dark mode",
      "description": "Add theme toggle",
      "category": "feature",
      "priority": "high",
      "status": "pending",
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-20T10:00:00.000Z"
    }
  ]
}
```

### Create Item

```bash
POST /api/items
Content-Type: application/json

{
  "title": "Fix navigation bug",
  "description": "Menu not closing on mobile",
  "category": "bug",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "item": {
    "id": "def-456",
    "title": "Fix navigation bug",
    "description": "Menu not closing on mobile",
    "category": "bug",
    "priority": "high",
    "status": "pending",
    "created_at": "2025-10-25T12:00:00.000Z",
    "updated_at": "2025-10-25T12:00:00.000Z"
  }
}
```

### Update Item

```bash
PUT /api/items/:id
Content-Type: application/json

{
  "status": "completed",
  "description": "Fixed by updating CSS"
}
```

### Delete Item

```bash
DELETE /api/items/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

### Prometheus Metrics

```bash
GET /metrics
```

**Key metrics:**
- `tradingsystem_http_requests_total{method,route,status}` - HTTP request counter
- `tradingsystem_http_request_duration_seconds{method,route,status}` - Request duration histogram
- `process_cpu_user_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage

---

## 🐳 Docker Commands

### Start Services

```bash
docker compose up -d
```

### Stop Services

```bash
docker compose down
```

### View Logs

```bash
# All services
docker compose logs -f

# Workspace only
docker compose logs -f workspace

# TimescaleDB only
docker compose logs -f timescaledb
```

### Restart Service

```bash
docker compose restart workspace
```

### Rebuild Image

```bash
docker compose build workspace
docker compose up -d workspace
```

### Execute Commands Inside Container

```bash
# Shell access
docker compose exec workspace sh

# Run migration
docker compose exec workspace npm run migrate:lowdb

# Check Node version
docker compose exec workspace node --version
```

---

## 🔧 Development

### Hot-Reload

The Dockerfile.dev mounts source code as volumes, enabling **hot-reload** with nodemon:

```yaml
volumes:
  - ./src:/app/src:ro
  - ./scripts:/app/scripts:ro
  - /app/node_modules  # Anonymous volume prevents overwrite
```

**How it works:**
1. Edit file in `backend/api/workspace/src/`
2. nodemon detects change within 2 seconds
3. Server restarts automatically
4. No container rebuild needed

### Run Locally (Without Docker)

```bash
cd backend/api/workspace

# Install dependencies
npm install

# Set environment variables
export LIBRARY_DB_STRATEGY=timescaledb
export TIMESCALEDB_HOST=localhost
export TIMESCALEDB_PORT=5433
export TIMESCALEDB_DATABASE=APPS-TPCAPITAL
export TIMESCALEDB_USER=timescale
export TIMESCALEDB_PASSWORD=your_password

# Start server
npm run dev
```

### Run Tests

```bash
npm test
npm run test:watch
```

---

## 🛡️ Database Schema

### workspace_items Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique item ID (UUID) |
| `title` | TEXT | NOT NULL | Item title |
| `description` | TEXT | - | Detailed description |
| `category` | TEXT | NOT NULL, CHECK | One of: feature, bug, task, idea |
| `priority` | TEXT | NOT NULL, CHECK | One of: low, medium, high |
| `status` | TEXT | NOT NULL, CHECK | One of: pending, in_progress, completed, cancelled |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_workspace_items_status` on `status`
- `idx_workspace_items_category` on `category`
- `idx_workspace_items_priority` on `priority`

---

## 📊 Monitoring

### Health Checks

```bash
# Container health (Docker)
docker inspect workspace-service | jq '.[0].State.Health'

# API health
curl http://localhost:3200/health
```

### Prometheus Integration

Add to Prometheus `scrape_configs`:

```yaml
scrape_configs:
  - job_name: 'workspace-service'
    static_configs:
      - targets: ['workspace:3200']
    metrics_path: '/metrics'
```

### Database Queries

```sql
-- Total items
SELECT COUNT(*) FROM workspace.workspace_items;

-- Items by status
SELECT status, COUNT(*) as count
FROM workspace.workspace_items
GROUP BY status;

-- Items by priority
SELECT priority, COUNT(*) as count
FROM workspace.workspace_items
GROUP BY priority
ORDER BY
  CASE priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END;
```

---

## 🐛 Troubleshooting

### Container Won't Start

**Symptom:** `docker compose up` fails

**Solutions:**
1. Check TimescaleDB credentials in `.env`
2. Ensure TimescaleDB container is running: `docker ps | grep timescaledb`
3. Check logs: `docker compose logs workspace`
4. Rebuild image: `docker compose build workspace`

### Database Connection Failed

**Symptom:** "ECONNREFUSED" or "Connection timeout"

**Solutions:**
1. Verify TimescaleDB is healthy: `docker compose ps timescaledb`
2. Check network: `docker network ls | grep tradingsystem`
3. Verify credentials match in `.env` and docker-compose.yml
4. Test connection manually:
   ```bash
   docker compose exec workspace node -e "
     const pg = require('pg');
     const pool = new pg.Pool({
       host: 'timescaledb',
       port: 5432,
       database: 'APPS-TPCAPITAL',
       user: 'timescale',
       password: process.env.TIMESCALEDB_PASSWORD
     });
     pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error);
   "
   ```

### Hot-Reload Not Working

**Symptom:** Code changes not reflected without restart

**Solutions:**
1. Verify volume mounts: `docker inspect workspace-service | jq '.[0].Mounts'`
2. Check nodemon is running: `docker compose logs workspace | grep nodemon`
3. Restart container: `docker compose restart workspace`

### Migration Failed

**Symptom:** `migrate:lowdb` script errors

**Solutions:**
1. Check `library.json` format (must have `items` array)
2. Verify TimescaleDB connection
3. Check schema exists: `psql -c "\dn" APPS-TPCAPITAL`
4. Check table exists: `psql -c "\dt workspace.*" APPS-TPCAPITAL`

---

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WORKSPACE_PORT` | No | 3200 | HTTP server port |
| `LIBRARY_DB_STRATEGY` | Yes | timescaledb | **MUST be "timescaledb"** (LowDB removed) |
| `TIMESCALEDB_HOST` | Yes | - | TimescaleDB hostname |
| `TIMESCALEDB_PORT` | Yes | 5432 | TimescaleDB port |
| `TIMESCALEDB_DATABASE` | Yes | - | Database name |
| `TIMESCALEDB_USER` | Yes | - | Database user |
| `TIMESCALEDB_PASSWORD` | Yes | - | Database password |
| `LOG_LEVEL` | No | info | Pino log level |
| `NODE_ENV` | No | development | Environment |

---

## 🔗 Related Services

- **TimescaleDB**: Shared database with TP Capital API
- **Dashboard**: Frontend at http://localhost:3103
- **TP Capital API**: Trading signals at http://localhost:4005
- **Telegram Gateway**: Message forwarder at http://localhost:4006

---

## 📚 Related Documentation

- **Specification:** `tools/openspec/changes/unified-tp-capital-split-workspace-containerize/specs/workspace-service/spec.md`
- **Migration Guide:** `tools/openspec/changes/unified-tp-capital-split-workspace-containerize/tasks.md` (Phase 3)
- **Architecture:** `tools/openspec/changes/unified-tp-capital-split-workspace-containerize/design.md`

---

## 📄 License

MIT

# Workspace Service (Containerized)

**Workspace API** for managing documentation backlog, ideas, and tasks - now fully containerized with TimescaleDB-only persistence.

## 🎯 Purpose

The Workspace Service provides:

- REST API for CRUD operations on workspace items
- **TimescaleDB-only persistence** (LowDB removed)
- Data migration from LowDB to TimescaleDB
- Hot-reload support for development
- Prometheus metrics export
- Docker containerization with health checks

## 🏗️ Architecture

```
Client (Frontend Dashboard)
    ↓ HTTP REST
Workspace Service (CONTAINER - Port 3200)
    ├─ GET /api/items - List items
    ├─ POST /api/items - Create item
    ├─ PUT /api/items/:id - Update item
    ├─ DELETE /api/items/:id - Delete item
    ├─ GET /health - Health check
    └─ GET /metrics - Prometheus metrics
    ↓ PostgreSQL
TimescaleDB (CONTAINER - Port 5433)
    └─ workspace.workspace_items table
```

## 📋 Prerequisites

- Docker & Docker Compose
- TimescaleDB credentials (from project `.env`)
- Node.js 20+ (for local development)

## 🚀 Installation

### 1. Configuration

The Workspace Service uses environment variables from the **project root `.env`** file.

**Required variables:**
```env
# TimescaleDB Connection
TIMESCALEDB_HOST=timescaledb
TIMESCALEDB_PORT=5432
TIMESCALEDB_DATABASE=APPS-TPCAPITAL
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=your_secure_password

# Database Strategy (MUST be "timescaledb")
LIBRARY_DB_STRATEGY=timescaledb

# Server
WORKSPACE_PORT=3200
```

### 2. Start with Docker Compose

```bash
cd backend/api/workspace

# Start Workspace + TimescaleDB
docker compose up -d

# Check logs
docker compose logs -f workspace

# Check health
curl http://localhost:3200/health
```

### 3. Initialize Database Schema

The `workspace_items` table will be created automatically on first run by the init script. If needed manually:

```sql
CREATE SCHEMA IF NOT EXISTS workspace;

CREATE TABLE IF NOT EXISTS workspace.workspace_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('feature', 'bug', 'task', 'idea')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_items_status ON workspace.workspace_items(status);
CREATE INDEX IF NOT EXISTS idx_workspace_items_category ON workspace.workspace_items(category);
CREATE INDEX IF NOT EXISTS idx_workspace_items_priority ON workspace.workspace_items(priority);
```

### 4. Migrate Data from LowDB (If Applicable)

If you have existing data in `library.json` (LowDB format):

```bash
# Inside container
docker compose exec workspace npm run migrate:lowdb

# Or locally
npm run migrate:lowdb
```

**Migration process:**
1. Reads `backend/data/workspace/library.json`
2. Inserts items into TimescaleDB with `ON CONFLICT DO NOTHING`
3. Validates item count
4. Renames JSON file to `library.migrated-YYYY-MM-DD.json`

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
  "timestamp": "2025-10-25T12:00:00.000Z",
  "service": "workspace-api",
  "dbStrategy": "timescaledb"
}
```

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

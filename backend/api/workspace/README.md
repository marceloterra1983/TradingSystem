# Library API - Backend

RESTful Backend for **Library** (Item Bank) in TradingSystem.

## 📋 Overview

Node.js/Express API that manages user items and suggestions:

- **Items CRUD** - Create, list, update and delete items
- **Categorization** - Organization by system (6 categories)
- **Prioritization** - 4 priority levels (low, medium, high, critical)
- **Status Tracking** - 5 states (new, review, in-progress, completed, rejected)
- **Tags** - Flexible tag system
- **Persistence** - Unified `frontend-apps` PostgreSQL cluster (TimescaleDB 16) with service-specific schema (`workspace`); LowDB only for local tests/smoke

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm ou yarn
- Frontend Apps database running (`postgresql://app_workspace:app_workspace_dev_password@localhost:5444/frontend_apps?schema=workspace`)

> Suggestion: quickly start with Docker.

```bash
docker run --rm -p 9000:9000 -p 8812:8812 -p 9009:9009 \
  -e QDB_PG_USER=admin -e QDB_PG_PASSWORD=quest \
  questdb/questdb:latest
```

### Installation

```bash
cd backend/api/workspace
npm install
```

### Start Server

```bash
# Production
npm start

# Development (auto-reload with --watch)
npm run dev
```

Server runs on: **<http://localhost:3100>**

### Observability

- **Health Check**: GET /health - Service and database status
- **Métricas Prometheus**: GET /metrics (text format)
- **HTTP Metrics**:
  - `tradingsystem_http_requests_total` - Total HTTP requests
  - `tradingsystem_http_request_duration_seconds` - Request duration
- **Database Metrics**:
  - `tradingsystem_db_queries_total` - Total queries (success/error)
  - `tradingsystem_db_query_duration_seconds` - Query duration (exec/query)

### Configuration (.env)

Use the file [.env.example](./.env.example) as base (for example: `cp .env.example .env`).

Supported variables:

- PORT - Server HTTP port (default: 3100)
- LOG_LEVEL - Pino log level (silent, info, debug, etc.)
- LIBRARY_DB_STRATEGY - Persistence strategy (`timescaledb` for production, `lowdb` for testing)
- **Frontend Apps DB Configuration (recommended):**
  - FRONTEND_APPS_DB_HOST / FRONTEND_APPS_DB_PORT - Unified Postgres host/port (default: localhost / 5444)
  - FRONTEND_APPS_DB_NAME - Physical database (default: `frontend_apps`)
- APP_WORKSPACE_DB_USER / APP_WORKSPACE_DB_PASSWORD - Role credentials scoped to `workspace` schema
- WORKSPACE_DATABASE_URL - Optional DSN override (`postgresql://app_workspace:...@localhost:5444/frontend_apps?schema=workspace`)
- WORKSPACE_DATABASE_SCHEMA - Logical schema (default: `workspace`)
- WORKSPACE_TABLE_NAME - Target table (default: `workspace_items`, search_path=`workspace,public`)
- **Legacy fallback variables** (`TIMESCALEDB_*`) remain supported for backward compatibility but should be phased out.
- DB_PATH - LowDB path (fallback in tests only)

### Logging

Structured logs use [pino](https://github.com/pinojs/pino). In development, just watch the terminal; in production, direct output to an aggregator or file if preferred.

### Automated Tests

Run `npm test` to run Jest + Supertest suite using an isolated database in ./tests/tmp/ideas.test.json (automated LowDB fallback for test scenario).

## 📡 API Endpoints

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-09T02:00:00.000Z",
  "service": "workspace-api"
}
```

---

## 💡 Ideas (Banco de Ideias)

### GET /api/items

curl http://localhost:3200/api/items
```

**Response:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "1",
      "title": "Implementar filtro avançado",
      "description": "Adicionar filtros por categoria e prioridade",
      "category": "dashboard",
      "priority": "high",
      "status": "new",
      "tags": ["ui", "ux", "filtros"],
      "createdAt": "2025-10-09T01:00:00.000Z"
    }
  ]
}
```

curl -X POST http://localhost:3200/api/items \
  -H "Content-Type: application/json" \
    "description": "Detailed description do item",
    "category": "documentacao",
    "priority": "medium",
    "tags": ["feature", "enhancement"]
  }'
```

**Validations:**

- `title` - Required, non-empty string
- `description` - Required, non-empty string
- `category` - Required, one of:
  - `documentacao`
  - `coleta-dados`
  - `banco-dados`
  - `analise-dados`
  - `gestao-riscos`
  - `dashboard`
- `priority` - Required, one of: `low`, `medium`, `high`, `critical`
- `tags` - Optional, array of strings
- `status` - Auto-set as `new`

**Response:**

```json
{
  "success": true,
  "message": "Item created successfully",
  "data": {
    "id": "2",
    "title": "Nova Feature X",
    "description": "Detailed description do item",
    "category": "documentacao",
    "priority": "medium",
    "status": "new",
    "tags": ["feature", "enhancement"],
    "createdAt": "2025-10-09T02:00:00.000Z"
  }
}
```

### PUT /api/items/:id

Updates existing item

```bash
curl -X PUT http://localhost:3200/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress",
    "priority": "high"
  }'
```

**Updatable fields:**

- `title` - Optional
- `description` - Optional
- `category` - Optional (same options as POST)
- `priority` - Optional (low, medium, high, critical)
- `status` - Optional: `new`, `review`, `in-progress`, `completed`, `rejected`
- `tags` - Optional, array of strings

**Response:**

```json
{
  "success": true,
  "message": "Item updated successfully",
  "data": {
    "id": "1",
    "title": "Implementar filtro avançado",
    "status": "in-progress",
    "priority": "high",
    "updatedAt": "2025-10-09T02:30:00.000Z"
  }
}
```

### DELETE /api/items/:id

Deletes item

```bash
curl -X DELETE http://localhost:3200/api/items/1
```

**Response:**

```json
{
  "success": true,
  "message": "Idea deleted successfully",
  "data": {
    "id": "1",
    "title": "Implementar filtro avançado"
  }
}
```

---

## 🗄️ Database Structure

### TimescaleDB (Recommended - Production)

**Schema:** `workspace_items` table in TimescaleDB (PostgreSQL with TimescaleDB extension)

```sql
CREATE TABLE workspace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('documentacao', 'coleta-dados', 'banco-dados', 'analise-dados', 'gestao-riscos', 'dashboard')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'review', 'in-progress', 'completed', 'rejected')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('workspace_items', 'created_at', chunk_time_interval => INTERVAL '1 month');
```

**Advantages:**

- ⚡ **High-performance time-series database** (ideal for timestamped data)
- 📊 **Automatic partitioning by month** (optimizes historical queries)
- 🔍 **Full PostgreSQL compatibility** (advanced SQL features, transactions, constraints)
- 📈 **Integrated metrics** (query duration via Prometheus)
- 💾 **Backup and restore** (standard PostgreSQL tools)
- 🔄 **ACID compliance** (data consistency guarantees)
- 🏗️ **Rich data types** (UUID, JSONB, arrays, enums)
- 🔐 **Advanced security** (row-level security, user management)

**Connection:**

- PostgreSQL connection: `postgresql://app_workspace:app_workspace_dev_password@localhost:5444/frontend_apps?schema=workspace`
- TimescaleDB extension: Automatically enabled on hypertables
- Admin tools: pgAdmin (`http://localhost:5050`), psql, or any PostgreSQL client

**Configuration:**

```env
LIBRARY_DB_STRATEGY=timescaledb
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5444
TIMESCALEDB_DATABASE=frontend_apps
TIMESCALEDB_USER=app_workspace
TIMESCALEDB_PASSWORD=your-password-here
TIMESCALEDB_SSL=false
WORKSPACE_TABLE_NAME=workspace_items
```

### LowDB (Fallback - Development/Testing)

Location: `backend/api/workspace/db/items.json`

```json
{
  "items": [
    {
      "id": "1",
      "title": "Idea title",
      "description": "Detailed description",
      "category": "dashboard",
      "priority": "high",
      "status": "new",
      "tags": ["tag1", "tag2"],
      "createdAt": "2025-10-09T01:00:00.000Z",
      "updatedAt": "2025-10-09T02:00:00.000Z"
    }
  ]
}
```

**Advantages:**

- Zero configuration
- Fast development
- Single JSON file
- Isolated tests (no external dependencies)

**Configuration:**

```env
LIBRARY_DB_STRATEGY=lowdb
DB_PATH=../db/items.json```

**Note:** LowDB is used only for development/testing. For production, always use TimescaleDB.

---

## 🔄 Backup, Restore & Migration

### Migrate from LowDB to TimescaleDB

If you have data in LowDB (JSON) and want to migrate to TimescaleDB:

```bash
cd backend/data/schemas/workspace

# Dry-run (preview without making changes)
node migrate-lowdb-to-timescaledb.js --dry-run

# Migrate (skip duplicates)
node migrate-lowdb-to-timescaledb.js --skip-existing

# Migrate (force overwrite)
node migrate-lowdb-to-timescaledb.js
```

**Options:**

- `--dry-run` - Shows what would be migrated without executing
- `--skip-existing` - Ignores items that already exist in TimescaleDB (match by title)
- `--continue-on-error` - Continue migration even if individual items fail
- `--incremental` - Enable incremental migration mode

**Environment Variables:**

```bash
TIMESCALEDB_HOST=localhost                    # TimescaleDB host
TIMESCALEDB_PORT=5444                         # TimescaleDB port
TIMESCALEDB_DATABASE=frontend_apps            # Database name
TIMESCALEDB_USER=app_workspace                # Database user
TIMESCALEDB_PASSWORD=your-password            # Database password
WORKSPACE_DATABASE_SCHEMA=workspace           # Schema name
WORKSPACE_TABLE_NAME=workspace_items          # Target table name
LOWDB_PATH=data/workspace/library.json        # Path to LowDB file
```

---

## 📂 File Structure

```text
backend/api/workspace/
├── src/
│   ├── server.js                  # Main Express server
│   ├── config.js                  # Configurations and environment variables
│   ├── logger.js                  # Structured logger (pino)
│   ├── metrics.js                 # Métricas Prometheus
│   └── repositories/              # Data access layer
│       ├── index.js               # Repository factory (strategy pattern)
│       └── lowdbRepository.js     # LowDB implementation (fallback)
├── db/
│   └── items.json                 # LowDB database (fallback)
├── tests/                         # (Future) Unit and integration tests
├── uploads/                       # (Future) File attachments
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Template for environment variables
├── package.json                   # Dependencies
├── node_modules/                  # npm modules
└── README.md                      # This documentation
```

---

## 🔒 CORS Configuration

CORS enabled for all origins by default:

```javascript
app.use(cors());
```

For production, restrict origins in `server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5177',  // Dashboard
    'http://localhost:3101',  // Data Collection
    'http://localhost:3100'   // Database
  ]
}));
```

---

## 📊 Data Model

### Item

```typescript
interface Item {
  id: string;                    // Auto-increment (string)
  title: string;                 // Item title
  description: string;           // Detailed description
  category: Category;            // Related system
  priority: Priority;            // Priority level
  status: Status;                // Current state
  tags: string[];                // Tags for filters
  createdAt: string;             // ISO 8601 timestamp
  updatedAt?: string;            // ISO 8601 timestamp (optional)
}

type Category =
  | 'documentacao'
  | 'coleta-dados'
  | 'banco-dados'
  | 'analise-dados'
  | 'gestao-riscos'
  | 'dashboard';

type Priority = 'low' | 'medium' | 'high' | 'critical';

type Status = 'new' | 'review' | 'in-progress' | 'completed' | 'rejected';
```

---

## 🔍 Error Handling

### Validation Errors (400)

```json
{
  "success": false,
  "errors": [
    {
      "msg": "Title is required",
      "param": "title",
      "location": "body"
    }
  ]
}
```

### Not Found (404)

```json
{
  "success": false,
  "error": "Item not found"
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": "Failed to create item"
}
```

---

## 🧪 Tests

### Test Health

```bash
curl http://localhost:3200/health
```

### Create test item

```bash
curl -X POST http://localhost:3200/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Teste de API",
    "description": "Testing item creation",
    "category": "dashboard",
    "priority": "low",
    "tags": ["teste"]
  }'
```

### List all

```bash
curl http://localhost:3200/api/items
```

### Update status

```bash
curl -X PUT http://localhost:3200/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### Delete

```bash
curl -X DELETE http://localhost:3200/api/items/1
```

---

## 📝 Logs

Logs displayed in console on startup:

```text
🚀 Library API Server running on port 3200
📍 http://localhost:3100
   GET    /api/items       - Get all items
   POST   /api/items       - Create item
   PUT    /api/items/:id   - Update item
   DELETE /api/items/:id   - Delete item
   GET    /health          - Health check
```

---

## 🐛 Troubleshooting

### Port already in use

```bash
# Windows - Kill process on port 3100
netstat -ano | findstr :3100
taskkill //PID {PID} //F

# Linux/Mac
lsof -ti:3100 | xargs kill
```

### Database does not initialize

Check if `db/items.json` exists:

```bash
cat backend/api/workspace/db/items.json
```

If it does not exist, create:

```bash
mkdir -p backend/api/workspace/db
echo '{"items":[]}' > backend/api/workspace/db/items.json
```

### Validation error

Check if todos os campos obrigatórios estão presentes:

- `title` (non-empty string)
- `description` (non-empty string)
- `category` (one of 6 valid options)
- `priority` (low, medium, high, critical)

---

## 🚀 Deploy

### PM2 (Production)

```bash
npm install -g pm2

cd backend/api/workspace
pm2 start src/server.js --name library-api
pm2 save
pm2 startup
```

### Variáveis de Ambiente

Create `.env` (optional):

```env
PORT=3200  # Official port per CLAUDE.md (updated from 3102)
NODE_ENV=production
```

Use in `server.js`:

```javascript
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3102;
```

---

## 📚 Dependencies

```json
{
  "express": "^4.18.2",          // Web framework
  "cors": "^2.8.5",              // CORS middleware
  "lowdb": "^7.0.1",             // JSON database
  "express-validator": "^7.0.1"  // Data validation
}
```

**Future DevDependencies:**

- `nodemon` - Auto-reload in development
- `jest` - Tests unitários
- `supertest` - Tests de API

---

## ✨ Future Features

### Planned

- [ ] Pagination (limit/offset)
- [ ] Filters by category, status, priority
- [ ] Full-text search in title/description
- [ ] File attachment upload
- [ ] Comments on items
- [ ] Voting system (upvote/downvote)
- [ ] User authentication
- [ ] Change history (audit log)
- [ ] Notifications (webhook/email)
- [ ] Export to CSV/JSON

### Integrations

- [ ] Webhook for external integrations when new item created
- [ ] Synchronization with Documentation API
- [ ] Real-time dashboard (WebSocket)

---

## 📞 References

- [Express.js](https://expressjs.com/)
- [LowDB](https://github.com/typicode/lowdb)
- [Express Validator](https://express-validator.github.io/)
- [REST API Best Practices](https://restfulapi.net/)

---

## ✅ Implementation Checklist

- [x] Express server running on port 3200
- [x] GET /api/items - List all as items
- [x] POST /api/items - Create item
- [x] PUT /api/items/:id - Update item
- [x] DELETE /api/items/:id - Delete item
- [x] Validação com express-validator
- [x] Functional LowDB database
- [x] CORS enabled
- [x] Health check endpoint
- [x] Error handling robust
- [x] ID auto-increment
- [x] Ordered by date (newest first)
- [x] Complete documentation

---

**Status:** ✅ Backend 100% functional + Migrated to TimescaleDB

**Created:** 2025-10-09
**Last updated:** 2025-10-18 (TimescaleDB migration)
**Port:** 3100
**API Base URL:** <http://localhost:3100/api>
**Database:** TimescaleDB (production) + LowDB (fallback)
**Total endpoints:** 5
**Prometheus Metrics:** ✅ HTTP + database queries
**Backup/Restore:** ✅ Automated scripts
**Migration Tool:** ✅ LowDB → TimescaleDB with advanced options

## 🎉 Completed Tasks (2025-10-18)

- ✅ **Migrated to TimescaleDB** - Production database with PostgreSQL compatibility and time-series optimization
- ✅ **Performance Monitoring** - Prometheus metrics for database queries
- ✅ **Data Migration** - LowDB → TimescaleDB migration tool with dry-run, skip-existing, and error handling
- ✅ **Documentation** - Complete README with TimescaleDB configuration and migration guides
- ✅ **Schema Design** - Optimized hypertable structure with proper constraints and indexes
- ✅ **Removed QuestDB Legacy** - Cleaned up legacy QuestDB references and configurations
- ✅ **Simplified Architecture** - TimescaleDB + LowDB only for cleaner maintenance

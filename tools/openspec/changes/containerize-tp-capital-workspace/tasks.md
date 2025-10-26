# Implementation Tasks: Containerize TP Capital and Workspace

> **Important**: Complete tasks sequentially. Mark `[x]` only after validation passes.

---

## 1. Preparação (Pre-Implementation)

**Objective**: Ensure environment is ready for containerization

- [ ] 1.1 **Backup dados LowDB do Workspace** (se existirem)
  ```bash
  # Check if file exists
  ls -lh backend/data/workspace/library.json
  # Backup with timestamp
  cp backend/data/workspace/library.json backend/data/workspace/library.json.backup-$(date +%Y%m%d-%H%M%S)
  ```
  **Validation**: Backup file exists and is readable

- [ ] 1.2 **Validar .env contém todas variáveis necessárias**
  ```bash
  # Required vars for TP Capital
  grep -E "TELEGRAM_INGESTION_BOT_TOKEN|TIMESCALEDB_HOST|TIMESCALEDB_PORT|TIMESCALEDB_PASSWORD" .env
  # Required vars for Workspace
  grep -E "WORKSPACE_PORT|TIMESCALEDB_" .env
  ```
  **Validation**: All variables present and non-empty

- [ ] 1.3 **Testar TimescaleDB acessível na porta 5433**
  ```bash
  docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb
  sleep 5
  docker exec -it timescaledb pg_isready -h localhost -p 5432
  ```
  **Validation**: Returns `accepting connections`

- [ ] 1.4 **Documentar portas atuais em service-port-map.md**
  ```bash
  # Verify current ports
  grep -E "3200|4005" docs/context/ops/service-port-map.md
  ```
  **Validation**: Ports documented correctly

---

## 2. Containerização - TP Capital

**Objective**: Create development-friendly Docker container for TP Capital

- [ ] 2.1 **Criar `apps/tp-capital/Dockerfile.dev`**
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app

  # Install dependencies first (cache layer)
  COPY package*.json ./
  RUN npm ci

  # Copy source code (will be overridden by volume in dev)
  COPY . .

  # Expose port
  EXPOSE 4005

  # Use nodemon for hot-reload
  CMD ["npm", "run", "dev"]
  ```
  **Validation**: File exists at correct path

- [ ] 2.2 **Criar `apps/tp-capital/.dockerignore`**
  ```
  node_modules
  npm-debug.log
  .env
  .env.*
  logs/
  *.log
  .git/
  .gitignore
  README.md
  Dockerfile*
  docker-compose*.yml
  ```
  **Validation**: Build excludes unnecessary files (check build context size < 5MB)

- [ ] 2.3 **Adicionar retry logic TimescaleDB em `src/timescaleClient.js`**
  ```javascript
  async function connectWithRetry(maxRetries = 5, delay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await timescaleClient.connect();
        logger.info('TimescaleDB connected successfully');
        return;
      } catch (err) {
        logger.warn(`TimescaleDB connection retry ${i+1}/${maxRetries}: ${err.message}`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error('TimescaleDB unavailable after max retries');
  }
  ```
  **Validation**: Function exists and is called on startup

- [ ] 2.4 **Testar build isolado**
  ```bash
  cd apps/tp-capital
  docker build -f Dockerfile.dev -t tp-capital:dev .
  ```
  **Validation**: Build succeeds without errors, image size < 500MB

- [ ] 2.5 **Testar run isolado**
  ```bash
  docker run --rm -p 4005:4005 --env-file ../../.env --name tp-capital-test tp-capital:dev
  # In another terminal
  curl http://localhost:4005/health
  ```
  **Validation**: Container starts, health endpoint returns 200 OK

---

## 3. Containerização - Workspace

**Objective**: Create development-friendly Docker container for Workspace with TimescaleDB only

- [ ] 3.1 **Criar `backend/api/workspace/Dockerfile.dev`**
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app

  # Install dependencies
  COPY package*.json ./
  RUN npm ci

  # Copy source code
  COPY . .

  # Expose port
  EXPOSE 3200

  # Use nodemon for hot-reload
  CMD ["npm", "run", "dev"]
  ```
  **Validation**: File exists at correct path

- [ ] 3.2 **Criar `backend/api/workspace/.dockerignore`**
  ```
  node_modules
  npm-debug.log
  .env
  .env.*
  logs/
  *.log
  .git/
  tests/tmp/
  coverage/
  ```
  **Validation**: Build context < 2MB

- [ ] 3.3 **Remover código LowDB de `src/db/index.js`**
  - Remove `lowdb` imports
  - Remove `getLowDbClient()` function
  - Update `getDbClient()` to return only TimescaleDB client
  - Add deprecation log if `LIBRARY_DB_STRATEGY=lowdb` detected

  **Validation**: Code compiles without LowDB dependencies

- [ ] 3.4 **Adicionar retry logic TimescaleDB em `src/db/timescaledb.js`**
  ```javascript
  async function initializeWithRetry(maxRetries = 5, delay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await pool.connect();
        logger.info('TimescaleDB connected');
        return pool;
      } catch (err) {
        logger.warn(`Retry ${i+1}/${maxRetries}: ${err.message}`);
        if (i < maxRetries - 1) await sleep(delay);
      }
    }
    throw new Error('TimescaleDB connection failed after retries');
  }
  ```
  **Validation**: Function exists and is called on startup

- [ ] 3.5 **Atualizar testes para usar apenas TimescaleDB**
  - Update test setup to use Testcontainers or in-memory TimescaleDB
  - Remove LowDB test cases
  - Ensure CI/CD has TimescaleDB available

  **Validation**: `npm test` passes without LowDB references

- [ ] 3.6 **Testar build e run isolado**
  ```bash
  cd backend/api/workspace
  docker build -f Dockerfile.dev -t workspace:dev .
  docker run --rm -p 3200:3200 --env-file ../../../.env --name workspace-test workspace:dev
  # Test
  curl http://localhost:3200/health
  curl http://localhost:3200/api/items
  ```
  **Validation**: Container starts, APIs respond correctly

---

## 4. Docker Compose Integration

**Objective**: Integrate both services into Docker Compose stack

- [ ] 4.1 **Criar `tools/compose/docker-compose.apps.yml`**
  ```yaml
  name: tradingsystem-apps

  services:
    tp-capital:
      container_name: tp-capital
      build:
        context: ../../apps/tp-capital
        dockerfile: Dockerfile.dev
      image: tradingsystem/tp-capital:dev
      ports:
        - "4005:4005"
      env_file:
        - ../../.env
      volumes:
        - ../../apps/tp-capital/src:/app/src:ro
        - ../../apps/tp-capital/package.json:/app/package.json:ro
        - tp-capital-node-modules:/app/node_modules
      networks:
        - tradingsystem_backend
      depends_on:
        timescaledb:
          condition: service_healthy
      healthcheck:
        test: ["CMD", "wget", "-q", "-O-", "http://localhost:4005/health"]
        interval: 30s
        timeout: 10s
        start_period: 20s
        retries: 3
      restart: unless-stopped
      labels:
        - "com.tradingsystem.service=tp-capital"
        - "com.tradingsystem.type=backend"

    workspace:
      container_name: workspace
      build:
        context: ../../backend/api/workspace
        dockerfile: Dockerfile.dev
      image: tradingsystem/workspace:dev
      ports:
        - "3200:3200"
      env_file:
        - ../../.env
      volumes:
        - ../../backend/api/workspace/src:/app/src:ro
        - ../../backend/api/workspace/package.json:/app/package.json:ro
        - workspace-node-modules:/app/node_modules
      networks:
        - tradingsystem_backend
      depends_on:
        timescaledb:
          condition: service_healthy
      healthcheck:
        test: ["CMD", "wget", "-q", "-O-", "http://localhost:3200/health"]
        interval: 30s
        timeout: 10s
        start_period: 20s
        retries: 3
      restart: unless-stopped
      labels:
        - "com.tradingsystem.service=workspace"
        - "com.tradingsystem.type=backend"

  volumes:
    tp-capital-node-modules:
    workspace-node-modules:

  networks:
    tradingsystem_backend:
      external: true
  ```
  **Validation**: File syntax valid (`docker compose -f ... config`)

- [ ] 4.2 **Criar network se não existir**
  ```bash
  docker network create tradingsystem_backend || true
  ```
  **Validation**: Network exists (`docker network ls | grep tradingsystem_backend`)

- [ ] 4.3 **Testar startup completo**
  ```bash
  # Start TimescaleDB first
  docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb
  # Wait for healthy
  docker compose -f tools/compose/docker-compose.database.yml ps timescaledb
  # Start apps
  docker compose -f tools/compose/docker-compose.apps.yml up -d
  ```
  **Validation**: Both containers running and healthy

- [ ] 4.4 **Testar volumes funcionando (hot-reload)**
  ```bash
  # Edit source file
  echo "// Test change" >> apps/tp-capital/src/server.js
  # Watch logs for reload
  docker compose -f tools/compose/docker-compose.apps.yml logs -f tp-capital | grep -i "restart"
  # Revert change
  git checkout apps/tp-capital/src/server.js
  ```
  **Validation**: Service restarts within 2 seconds

---

## 5. Scripts & Automation

**Objective**: Update startup/stop scripts to manage containers

- [ ] 5.1 **Atualizar `scripts/universal/start.sh`**
  - Detect if Docker is running
  - Start `docker-compose.apps.yml` before checking local processes
  - Skip local process start for tp-capital and workspace if containers running

  **Validation**: `bash scripts/universal/start.sh` starts containers

- [ ] 5.2 **Atualizar `scripts/universal/stop.sh`**
  - Stop containers gracefully (`docker compose down`)
  - Wait for containers to exit (timeout 30s)

  **Validation**: `bash scripts/universal/stop.sh` stops containers cleanly

- [ ] 5.3 **Atualizar `scripts/maintenance/health-check-all.sh`**
  - Add container health check section
  - Query Docker API for container status
  - Include in overall health score

  **Validation**: Script detects containers and reports health

- [ ] 5.4 **Criar `scripts/docker/start-apps.sh`**
  ```bash
  #!/bin/bash
  cd "$(dirname "$0")/../.."
  docker compose -f tools/compose/docker-compose.apps.yml up -d "$@"
  docker compose -f tools/compose/docker-compose.apps.yml ps
  ```
  **Validation**: Helper script starts services correctly

- [ ] 5.5 **Criar `scripts/docker/logs-apps.sh`**
  ```bash
  #!/bin/bash
  cd "$(dirname "$0")/../.."
  docker compose -f tools/compose/docker-compose.apps.yml logs -f "$@"
  ```
  **Validation**: Helper script tails logs correctly

---

## 6. Migração de Dados (Se Necessário)

**Objective**: Migrate LowDB data to TimescaleDB safely

- [ ] 6.1 **Verificar existência de `backend/data/workspace/library.json`**
  ```bash
  if [ -f backend/data/workspace/library.json ]; then
    echo "LowDB data found - migration required"
    wc -l backend/data/workspace/library.json
  fi
  ```
  **Validation**: Check logged, item count known

- [ ] 6.2 **Criar script `scripts/database/migrate-lowdb-to-timescale.js`**
  ```javascript
  import fs from 'fs';
  import path from 'path';
  import pg from 'pg';

  const lowdbPath = path.resolve('backend/data/workspace/library.json');
  const data = JSON.parse(fs.readFileSync(lowdbPath, 'utf8'));

  const pool = new pg.Pool({
    host: process.env.TIMESCALEDB_HOST,
    port: process.env.TIMESCALEDB_PORT,
    database: process.env.WORKSPACE_DATABASE,
    user: process.env.TIMESCALEDB_USER,
    password: process.env.TIMESCALEDB_PASSWORD,
  });

  async function migrate() {
    console.log(`Found ${data.items?.length || 0} items to migrate`);

    for (const item of data.items || []) {
      await pool.query(
        `INSERT INTO workspace.workspace_items (id, title, content, category, priority, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.title, item.content, item.category, item.priority, item.status, item.createdAt, item.updatedAt]
      );
    }

    const result = await pool.query('SELECT COUNT(*) FROM workspace.workspace_items');
    console.log(`Migration complete: ${result.rows[0].count} items in TimescaleDB`);

    await pool.end();
  }

  migrate().catch(console.error);
  ```
  **Validation**: Script exists and is executable

- [ ] 6.3 **Executar migração e validar integridade**
  ```bash
  node scripts/database/migrate-lowdb-to-timescale.js
  # Verify count matches
  ```
  **Validation**: COUNT(*) === JSON.items.length

- [ ] 6.4 **Backup arquivo LowDB (não deletar imediatamente)**
  ```bash
  mv backend/data/workspace/library.json backend/data/workspace/library.json.migrated-$(date +%Y%m%d)
  ```
  **Validation**: Original file moved, not deleted

---

## 7. Testing & Validation

**Objective**: Comprehensive end-to-end testing

- [ ] 7.1 **Testar startup completo via `start` command**
  ```bash
  bash scripts/universal/start.sh
  # Should start containers + other services
  ```
  **Validation**: All services running (containers + local)

- [ ] 7.2 **Validar hot-reload funcionando**
  ```bash
  # Edit TP Capital
  echo "// Test" >> apps/tp-capital/src/server.js
  docker compose -f tools/compose/docker-compose.apps.yml logs tp-capital | tail -20
  git checkout apps/tp-capital/src/server.js

  # Edit Workspace
  echo "// Test" >> backend/api/workspace/src/server.js
  docker compose -f tools/compose/docker-compose.apps.yml logs workspace | tail -20
  git checkout backend/api/workspace/src/server.js
  ```
  **Validation**: Both services reload within 2 seconds

- [ ] 7.3 **Testar endpoints**
  ```bash
  # Workspace
  curl http://localhost:3200/health
  curl http://localhost:3200/api/items | jq '.items | length'

  # TP Capital
  curl http://localhost:4005/health
  curl http://localhost:4005/metrics | grep tp_capital
  ```
  **Validation**: All endpoints return 200 OK

- [ ] 7.4 **Validar logs centralizados**
  ```bash
  docker compose -f tools/compose/docker-compose.apps.yml logs --tail=50
  ```
  **Validation**: Logs readable and structured

- [ ] 7.5 **Testar stop graceful**
  ```bash
  bash scripts/universal/stop.sh
  # Verify containers stopped
  docker ps | grep -E "workspace|tp-capital"
  ```
  **Validation**: No containers running, exit code 0

- [ ] 7.6 **Validar Service Launcher API detecta containers**
  ```bash
  curl http://localhost:3500/api/health/full | jq '.services[] | select(.name | contains("workspace") or contains("tp-capital"))'
  ```
  **Validation**: Both services detected and reported as healthy

- [ ] 7.7 **Executar testes automatizados**
  ```bash
  # Workspace tests (ensure TimescaleDB running)
  cd backend/api/workspace
  npm test

  # TP Capital tests
  cd ../../../apps/tp-capital
  npm test
  ```
  **Validation**: All tests pass

---

## 8. Documentation

**Objective**: Update all documentation to reflect containerization

- [ ] 8.1 **Atualizar `CLAUDE.md`**
  - Remove references to "local Node.js processes"
  - Update "Active Services & Ports" section
  - Add Docker Compose examples
  - Update "Development Commands" section

  **Validation**: No mentions of `npm run dev` for tp-capital/workspace

- [ ] 8.2 **Atualizar `docs/context/ops/service-port-map.md`**
  - Mark tp-capital and workspace as "containerized"
  - Add Docker Compose file reference

  **Validation**: Table reflects container deployment

- [ ] 8.3 **Atualizar `docs/context/backend/api/workspace/README.md`**
  - Add "Running with Docker" section
  - Update startup instructions
  - Document LowDB removal

  **Validation**: README has Docker examples

- [ ] 8.4 **Atualizar `docs/context/backend/guides/guide-tp-capital.md`**
  - Add containerization section
  - Update environment variables
  - Add troubleshooting for container issues

  **Validation**: Guide mentions Docker

- [ ] 8.5 **Criar `docs/context/ops/containerization-guide.md`**
  - Document containerization strategy
  - Hot-reload configuration
  - Volume management
  - Common issues & solutions

  **Validation**: New guide exists and is comprehensive

- [ ] 8.6 **Atualizar `README.md`**
  - Update "Development Commands" section
  - Add Docker prerequisites
  - Update quickstart guide

  **Validation**: README reflects container-first approach

---

## 9. Cleanup & Finalization

**Objective**: Clean up temporary artifacts and validate proposta

- [ ] 9.1 **Remover código LowDB comentado (se tudo ok)**
  ```bash
  # Search for commented LowDB code
  grep -r "lowdb" backend/api/workspace/src/ --include="*.js"
  # Remove if found
  ```
  **Validation**: No LowDB references in codebase

- [ ] 9.2 **Atualizar `.gitignore` se necessário**
  - Ensure `Dockerfile*.local` ignored if created
  - Ensure `docker-compose.override.yml` ignored

  **Validation**: `.gitignore` covers all temporary files

- [ ] 9.3 **Validar `.env.example` atualizado**
  ```bash
  # Check for new vars needed
  diff <(grep -oP '^[A-Z_]+=' .env | sort) <(grep -oP '^[A-Z_]+=' .env.example | sort)
  ```
  **Validation**: `.env.example` has all required vars

- [ ] 9.4 **Executar validação OpenSpec**
  ```bash
  npm run openspec -- validate containerize-tp-capital-workspace --strict
  ```
  **Validation**: All checks pass

- [ ] 9.5 **Commit com Conventional Commits**
  ```bash
  git add .
  git commit -m "feat(containers)!: containerize TP Capital and Workspace services

BREAKING CHANGE: Workspace no longer supports LowDB. Migration required.
BREAKING CHANGE: Services must be started via Docker Compose, not npm run dev.

- Add Dockerfile.dev for hot-reload development
- Integrate with docker-compose.apps.yml
- Add TimescaleDB retry logic for resilience
- Update startup/stop scripts to manage containers
- Migrate Workspace from dual-strategy to TimescaleDB only
- Add migration script for LowDB data
- Update all documentation

Co-authored-by: Claude Code AI Agent <noreply@anthropic.com>"
  ```
  **Validation**: Commit created with proper message

---

## Success Criteria

✅ All 47 tasks completed and marked `[x]`
✅ Both services start via `docker compose up -d`
✅ Hot-reload < 2s após mudança de código
✅ Health checks passing (Docker + Prometheus)
✅ Zero data loss após migração LowDB
✅ Startup universal (`start`) funciona sem regressões
✅ All tests passing (unit + integration)
✅ Documentation updated and reviewed

---

**Estimated Total Time**: 8-12 hours
**Last Updated**: 2025-10-25
**Status**: 🟡 Ready for Implementation

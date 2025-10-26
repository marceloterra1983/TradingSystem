# DocsAPI Implementation Tasks

## Phase 1: Core Infrastructure (3-4h)

### 1.1 File Audit & Dependency Mapping
- [ ] 1.1.1 Run Glob to list all JS files in `backend/api/documentation-api/src/`
- [ ] 1.1.2 Run Grep to find all `import` statements across codebase
- [ ] 1.1.3 Create dependency graph (which file imports what)
- [ ] 1.1.4 Identify all missing imports (files referenced but don't exist)
- [ ] 1.1.5 Document findings in `DEPENDENCY-AUDIT.md`

### 1.2 Create Missing Utility Files
- [ ] 1.2.1 Create `src/utils/logger.js` with Pino configuration
  - [ ] Export `createLogger()` function
  - [ ] Configure timezone: `translateTime: 'SYS:HH:MM:ss'` (São Paulo)
  - [ ] Support LOG_LEVEL environment variable
  - [ ] Add request ID correlation
- [ ] 1.2.2 Create `src/config/logger.js` with logger config
  - [ ] Development config (pretty print, colorize)
  - [ ] Production config (JSON format, no colors)
  - [ ] Log level mapping (debug/info/warn/error)
- [ ] 1.2.3 Test logger utility works: `node -e "import('./src/utils/logger.js').then(m => m.logger.info('test'))"`

### 1.3 Create Missing Middleware
- [ ] 1.3.1 Create `src/middleware/errorHandler.js`
  - [ ] Implement `errorHandler(err, req, res, next)` - Global error handler
  - [ ] Implement `notFoundHandler(req, res)` - 404 handler
  - [ ] Handle validation errors (400)
  - [ ] Handle authentication errors (401)
  - [ ] Handle not found errors (404)
  - [ ] Handle server errors (500)
  - [ ] Log errors with stack trace (dev mode only)
- [ ] 1.3.2 Verify existing middleware files:
  - [ ] `src/middleware/cache.js` - Cache control
  - [ ] `src/middleware/inputSanitization.js` - XSS protection
  - [ ] `src/middleware/upload.js` - File uploads
  - [ ] `src/middleware/validation.js` - Request validation

### 1.4 Create/Verify Missing Routes
- [ ] 1.4.1 Check if `src/routes/ideas.js` exists
  - [ ] If missing: Create basic CRUD routes
  - [ ] Implement GET /api/v1/ideas (list)
  - [ ] Implement POST /api/v1/ideas (create)
  - [ ] Implement PUT /api/v1/ideas/:id (update)
  - [ ] Implement DELETE /api/v1/ideas/:id (delete)
- [ ] 1.4.2 Check if `src/routes/files.js` exists
  - [ ] If missing: Create file management routes
  - [ ] Implement POST /api/v1/files/upload (file upload)
  - [ ] Implement GET /api/v1/files/:id (download)
  - [ ] Implement DELETE /api/v1/files/:id (delete)
- [ ] 1.4.3 Verify existing routes work:
  - [ ] `src/routes/systems.js` - Systems management
  - [ ] `src/routes/stats.js` - Statistics
  - [ ] `src/routes/search.js` - General search
  - [ ] `src/routes/specs.js` - Spec validation
  - [ ] `src/routes/docs-health.js` - Docs health
  - [ ] `src/routes/markdown-search.js` - Markdown search
  - [ ] `src/routes/metrics.js` - Prometheus metrics
  - [ ] `src/routes/versions.js` - Version management

### 1.5 Fix Import Statements
- [ ] 1.5.1 Update `src/server.js` imports
  - [ ] Change Pino import to use centralized logger
  - [ ] Verify all route imports point to existing files
  - [ ] Remove imports for non-existent files
- [ ] 1.5.2 Update all services to use centralized logger
  - [ ] `src/services/markdownSearchService.js`
  - [ ] `src/services/searchService.js`
  - [ ] `src/services/versionManager.js`
  - [ ] `src/services/redocManager.js`
  - [ ] `src/services/schemaValidator.js`
  - [ ] Others as discovered in audit
- [ ] 1.5.3 Update all repositories to use centralized logger
  - [ ] `src/repositories/FilesRepository.js`
  - [ ] `src/repositories/IdeasRepository.js`
  - [ ] `src/repositories/SystemsRepository.js`

### 1.6 Local Testing
- [ ] 1.6.1 Install dependencies: `cd backend/api/documentation-api && npm install`
- [ ] 1.6.2 Run server locally: `npm run dev`
- [ ] 1.6.3 Verify server starts without crashes
- [ ] 1.6.4 Check logs for errors
- [ ] 1.6.5 Test health endpoint: `curl http://localhost:3000/health`
- [ ] 1.6.6 Stop server gracefully (Ctrl+C)

---

## Phase 2: Containerization (2-3h)

### 2.1 Dockerfile Verification
- [ ] 2.1.1 Verify Dockerfile EXPOSE port is 3000 (not 3400)
- [ ] 2.1.2 Verify all source directories copied:
  - [ ] `src/` directory
  - [ ] `prisma/` directory (if using Prisma)
  - [ ] `db/` directory (if using SQLite)
  - [ ] `package.json` and `package-lock.json`
- [ ] 2.1.3 Verify health check command: `curl -f http://localhost:3000/health`
- [ ] 2.1.4 Verify user permissions (non-root user in production stage)
- [ ] 2.1.5 Verify uploads directory created with correct permissions

### 2.2 Environment Configuration
- [ ] 2.2.1 Create `.env.example` with all required variables:
  ```
  NODE_ENV=production
  PORT=3000
  LOG_LEVEL=info
  DOCS_DIR=/app/docs
  DB_STRATEGY=none  # or postgres/questdb
  CORS_ORIGIN=http://localhost:3103
  RATE_LIMIT_WINDOW_MS=900000
  RATE_LIMIT_MAX=100
  ```
- [ ] 2.2.2 Verify docker-compose.docs.yml environment section
- [ ] 2.2.3 Document all environment variables in README

### 2.3 Docker Build & Test
- [ ] 2.3.1 Build image: `docker compose -f tools/compose/docker-compose.docs.yml build docs-api`
- [ ] 2.3.2 Verify build completes without errors
- [ ] 2.3.3 Check image size (should be < 500MB)
- [ ] 2.3.4 Inspect image layers: `docker history docs-api:latest`

### 2.4 Container Startup
- [ ] 2.4.1 Start container: `docker compose -f tools/compose/docker-compose.docs.yml up docs-api`
- [ ] 2.4.2 Watch logs: `docker logs -f docs-api`
- [ ] 2.4.3 Verify no errors in logs
- [ ] 2.4.4 Wait for FlexSearch indexing to complete
- [ ] 2.4.5 Verify health check passes: `docker inspect docs-api --format='{{.State.Health.Status}}'`

### 2.5 Network & Volumes
- [ ] 2.5.1 Verify container connected to networks:
  - [ ] `tradingsystem_backend` (for database)
  - [ ] `tradingsystem_frontend` (for Dashboard)
- [ ] 2.5.2 Verify volume mounts:
  - [ ] `/app/docs` → Read-only mount of `docs/` directory
  - [ ] `docs-api-data` → Persistent volume for database
- [ ] 2.5.3 Test volume accessibility from inside container:
  - [ ] `docker exec docs-api ls -la /app/docs`

---

## Phase 3: Testing & Validation (2h)

### 3.1 Health Check Endpoint
- [ ] 3.1.1 Test health endpoint: `curl http://localhost:3401/health`
- [ ] 3.1.2 Verify response format:
  ```json
  {
    "status": "ok",
    "service": "documentation-api",
    "timestamp": "2025-10-26T...",
    "database": {...}
  }
  ```
- [ ] 3.1.3 Test health endpoint returns 503 if database down (if DB enabled)

### 3.2 Search Endpoints
- [ ] 3.2.1 Test markdown search: `curl "http://localhost:3401/api/v1/docs/search?q=test"`
- [ ] 3.2.2 Verify search results returned
- [ ] 3.2.3 Test empty query: `curl "http://localhost:3401/api/v1/docs/search?q="`
- [ ] 3.2.4 Test facets: `curl "http://localhost:3401/api/v1/docs/facets"`
- [ ] 3.2.5 Verify facets returned (domains, types, tags)
- [ ] 3.2.6 Test suggest: `curl "http://localhost:3401/api/v1/suggest?q=doc"`

### 3.3 CRUD Endpoints (if implemented)
- [ ] 3.3.1 Test systems list: `curl http://localhost:3401/api/v1/systems`
- [ ] 3.3.2 Test ideas list: `curl http://localhost:3401/api/v1/ideas`
- [ ] 3.3.3 Test stats: `curl http://localhost:3401/api/v1/stats`

### 3.4 Spec Validation Endpoints
- [ ] 3.4.1 Test spec list: `curl http://localhost:3401/api/v1/docs`
- [ ] 3.4.2 Test spec validation (if endpoint exists)
- [ ] 3.4.3 Test version management (if endpoint exists)

### 3.5 Metrics & Monitoring
- [ ] 3.5.1 Test Prometheus metrics: `curl http://localhost:3401/metrics`
- [ ] 3.5.2 Verify metrics format (Prometheus exposition format)
- [ ] 3.5.3 Verify custom metrics exist (search_requests_total, etc.)

### 3.6 Error Handling
- [ ] 3.6.1 Test 404 endpoint: `curl http://localhost:3401/nonexistent`
- [ ] 3.6.2 Verify 404 response with proper JSON
- [ ] 3.6.3 Test invalid request: `curl -X POST http://localhost:3401/api/v1/docs/search`
- [ ] 3.6.4 Verify validation error response (400)

### 3.7 Load Testing
- [ ] 3.7.1 Run 100 concurrent searches:
  ```bash
  for i in {1..100}; do
    curl -s "http://localhost:3401/api/v1/docs/search?q=test" &
  done
  wait
  ```
- [ ] 3.7.2 Monitor container resources: `docker stats docs-api`
- [ ] 3.7.3 Verify memory < 512MB
- [ ] 3.7.4 Verify CPU < 50% during load
- [ ] 3.7.5 Check logs for errors during load

### 3.8 Integration Testing
- [ ] 3.8.1 Test Dashboard → DocsAPI connection (if integrated)
- [ ] 3.8.2 Test NGINX → DocsAPI proxy (if configured)
- [ ] 3.8.3 Test cross-container communication

---

## Phase 4: Documentation (1-2h)

### 4.1 Service Documentation
- [ ] 4.1.1 Create `backend/api/documentation-api/README.md` with:
  - [ ] Service overview and purpose
  - [ ] Architecture diagram (if complex)
  - [ ] API endpoints documentation
  - [ ] Environment variables table
  - [ ] Development setup guide
  - [ ] Docker deployment guide
  - [ ] Troubleshooting section
  - [ ] Performance considerations
- [ ] 4.1.2 Add code examples for common use cases
- [ ] 4.1.3 Document FlexSearch configuration

### 4.2 Environment Documentation
- [ ] 4.2.1 Document all environment variables in README
- [ ] 4.2.2 Create `.env.example` file
- [ ] 4.2.3 Document default values and valid options

### 4.3 Integration Documentation
- [ ] 4.3.1 Update `DOCUMENTATION-CONTAINER-SOLUTION.md`:
  - [ ] Change DocsAPI status from "❌ Crash loop" to "✅ Working"
  - [ ] Add DocsAPI endpoints documentation
  - [ ] Add usage examples
- [ ] 4.3.2 Update `tools/compose/docker-compose.docs.yml` comments
- [ ] 4.3.3 Update `scripts/universal/start.sh` documentation header

### 4.4 Operational Documentation
- [ ] 4.4.1 Add DocsAPI to health checks in `start.sh`:
  ```bash
  declare -A HEALTH_URLS=(
    ...
    ["DocsAPI"]="http://localhost:3401/health"
  )
  ```
- [ ] 4.4.2 Update `docs/context/ops/service-port-map.md`:
  - [ ] Add port 3401 (DocsAPI)
  - [ ] Document endpoints
- [ ] 4.4.3 Create troubleshooting runbook

### 4.5 API Documentation
- [ ] 4.5.1 Generate OpenAPI spec (if not exists)
- [ ] 4.5.2 Add API examples to documentation
- [ ] 4.5.3 Document rate limits and quotas
- [ ] 4.5.4 Document authentication (if required)

---

## Phase 5: Deployment & Monitoring (1h)

### 5.1 Production Readiness
- [ ] 5.1.1 Set NODE_ENV=production in docker-compose
- [ ] 5.1.2 Disable development features (hot-reload, verbose logging)
- [ ] 5.1.3 Configure log rotation
- [ ] 5.1.4 Set resource limits (memory, CPU)

### 5.2 Health Monitoring
- [ ] 5.2.1 Verify health check interval in docker-compose (30s)
- [ ] 5.2.2 Test container auto-restart on failure
- [ ] 5.2.3 Configure alerting (if Prometheus/Grafana available)

### 5.3 Startup Integration
- [ ] 5.3.1 Test `bash scripts/universal/start.sh`
- [ ] 5.3.2 Verify DocsAPI health check included
- [ ] 5.3.3 Verify startup order:
  1. TimescaleDB (if needed)
  2. Documentation NGINX
  3. DocsAPI
- [ ] 5.3.4 Test graceful shutdown: `bash scripts/universal/stop.sh`

### 5.4 Monitoring (7 days)
- [ ] 5.4.1 Monitor container restarts (should be 0)
- [ ] 5.4.2 Monitor memory usage (should be < 512MB)
- [ ] 5.4.3 Monitor response times (p95 < 200ms)
- [ ] 5.4.4 Monitor error rate (should be < 1%)
- [ ] 5.4.5 Check logs daily for warnings

---

## Acceptance Criteria

### Functional Requirements
- ✅ Container starts successfully without crashes
- ✅ Health check returns 200 OK
- ✅ All API endpoints respond correctly
- ✅ Search returns relevant results
- ✅ Logs show no errors or warnings
- ✅ Graceful shutdown works (Ctrl+C or SIGTERM)

### Performance Requirements
- ✅ Container startup < 30 seconds
- ✅ Search response time < 200ms (p95)
- ✅ Memory usage < 512MB
- ✅ CPU usage < 10% at idle
- ✅ Indexing 1000 files < 10 seconds

### Quality Requirements
- ✅ No ESLint errors
- ✅ All import statements valid
- ✅ No Docker build warnings
- ✅ Documentation complete
- ✅ Environment variables documented

### Integration Requirements
- ✅ Docker Compose starts both containers (NGINX + DocsAPI)
- ✅ Universal start script includes DocsAPI
- ✅ Health checks passing for 24 hours continuous
- ✅ Dashboard can query DocsAPI (if integrated)

---

## Rollback Plan

If implementation fails or causes issues:

1. **Stop DocsAPI container**: `docker compose -f tools/compose/docker-compose.docs.yml stop docs-api`
2. **Remove from start script**: Comment out DocsAPI health check
3. **Documentation container continues working**: NGINX serves static content
4. **No impact on Dashboard**: Dashboard doesn't depend on DocsAPI yet

---

## Notes

- **Database strategy**: Start with no database (FlexSearch only), add Postgres later if needed
- **FlexSearch indexing**: Run in background to avoid blocking container startup
- **Logger consistency**: All modules must use centralized logger from `src/utils/logger.js`
- **Error handling**: All routes must use global error handler middleware
- **Testing**: Focus on container health first, then API endpoints

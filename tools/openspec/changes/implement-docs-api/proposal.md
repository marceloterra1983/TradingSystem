# Proposal: Complete DocsAPI Implementation

**Change ID**: `implement-docs-api`
**Status**: Proposal
**Created**: 2025-10-26
**Author**: Claude Code AI Agent
**Priority**: High (Documentation Infrastructure)

---

## Executive Summary

This proposal addresses the incomplete implementation of the Documentation API (DocsAPI), which is currently in a crash loop due to missing dependencies and incomplete module structure. The DocsAPI is a critical service for documentation management, search, and validation that complements the static documentation container.

---

## Why

### Problem: DocsAPI Container in Crash Loop

**Current State**: The DocsAPI container (`docs-api`) fails to start with the following error:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/src/utils/logger.js'
```

**Investigation Findings**:
- ✅ **Infrastructure exists**: Express server, FlexSearch, routes, services, repositories
- ✅ **Dependencies installed**: 30+ npm packages including FlexSearch, Pino, Prisma, Express
- ❌ **Missing critical files**: `src/utils/logger.js`, `src/middleware/errorHandler.js`, `src/routes/ideas.js`, `src/routes/files.js`
- ❌ **Import inconsistencies**: Some modules try to import from non-existent paths
- ❌ **No logger utility**: Server.js creates Pino instance inline, but services expect centralized logger

### Why This Matters

1. **Documentation Architecture**: The 2-container documentation solution requires both:
   - **NGINX container (port 3400)**: ✅ Working - serves static Docusaurus + specs
   - **DocsAPI container (port 3401)**: ❌ Broken - dynamic API for search, CRUD, validation

2. **User Impact**:
   - **Dashboard cannot search documentation**: Search API returns 503
   - **No spec validation**: OpenAPI/AsyncAPI validation unavailable
   - **No documentation CRUD**: Cannot manage documentation programmatically
   - **No FlexSearch**: Full-text search unavailable

3. **Development Velocity**: Without DocsAPI, developers cannot:
   - Search documentation via API
   - Validate API specifications
   - Track documentation health
   - Query documentation metadata

---

## What Changes

### 🛠️ Core Infrastructure (Immediate - Phase 1)

1. **Create Missing Utility Files**:
   - `src/utils/logger.js` - Centralized Pino logger with São Paulo timezone
   - `src/config/logger.js` - Logger configuration (dev vs prod)

2. **Create Missing Middleware**:
   - `src/middleware/errorHandler.js` - Global error handler + 404 handler
   - Verify all middleware imports in server.js

3. **Create Missing Routes** (if referenced but missing):
   - `src/routes/ideas.js` - Ideas CRUD endpoints
   - `src/routes/files.js` - File management endpoints
   - Verify all route files exist and are importable

4. **Fix Import Paths**:
   - Audit all `import` statements across codebase
   - Ensure all imports point to existing files
   - Add missing files or remove dead imports

### 📦 Containerization (Phase 2)

5. **Fix Dockerfile Configuration**:
   - ✅ Already fixed: Port 3400 → 3000
   - ✅ Already fixed: Added `prisma/` directory copy
   - ⚠️ Verify: All source directories copied correctly
   - ⚠️ Verify: Health check command works

6. **Environment Configuration**:
   - Create `.env.example` with all required variables
   - Document environment variables in README
   - Ensure Docker Compose passes correct env vars

### 🧪 Testing & Validation (Phase 3)

7. **Container Testing**:
   - Build image successfully: `docker compose -f tools/compose/docker-compose.docs.yml build docs-api`
   - Start container: `docker compose up docs-api`
   - Health check passes: `curl http://localhost:3401/health`
   - Logs show no errors: `docker logs docs-api`

8. **API Endpoint Testing**:
   - `/health` returns 200 OK with database status
   - `/api/v1/docs/search?q=test` returns search results
   - `/api/v1/docs/facets` returns documentation categories
   - `/metrics` returns Prometheus metrics

### 📚 Documentation (Phase 4)

9. **Service Documentation**:
   - Create `backend/api/documentation-api/README.md` with:
     - Architecture overview
     - API endpoints documentation
     - Environment variables
     - Development guide
     - Troubleshooting section
   - Update `docker-compose.docs.yml` comments

10. **Integration Documentation**:
    - Update `DOCUMENTATION-CONTAINER-SOLUTION.md` with DocsAPI status
    - Document Dashboard → DocsAPI integration
    - Add health monitoring guide

---

## Impact

### 🔴 Breaking Changes

**None** - This is a new implementation completing existing infrastructure.

### ✅ Affected Components

| Component | Type | Impact | Action Required |
|-----------|------|--------|-----------------|
| **DocsAPI Container** | Implementation | Completes missing files | Create logger, middleware, routes |
| **Dockerfile** | Configuration | Already fixed | Verify build works |
| **Docker Compose** | Configuration | No changes needed | Test container startup |
| **Dashboard** | Integration | Enable DocsAPI features | Update API base URL |
| **Documentation** | Content | Add service docs | Create README, guides |
| **Health Checks** | Monitoring | Add DocsAPI to checks | Update `start.sh` |

### 📊 Benefits

#### 🔍 Search & Discovery
- ✅ **Full-text search**: FlexSearch across all markdown documentation
- ✅ **Faceted navigation**: Filter by domain, type, status, tags
- ✅ **Relevance ranking**: Smart search with scoring
- ✅ **Autocomplete**: Suggest-as-you-type for documentation

#### 🛡️ Validation & Quality
- ✅ **Spec validation**: Validate OpenAPI/AsyncAPI specifications
- ✅ **Health monitoring**: Check documentation freshness and broken links
- ✅ **Version management**: Track documentation versions
- ✅ **Metrics export**: Prometheus metrics for monitoring

#### 🚀 Developer Experience
- ✅ **CRUD operations**: Programmatic documentation management
- ✅ **REST API**: Integration with Dashboard and CI/CD
- ✅ **Hot-reload**: < 2s feedback loop for development
- ✅ **Clear logs**: Structured logging with Pino

### ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| **Missing files not discovered** | Medium | High | Complete file audit with Glob + Grep |
| **Import path issues** | Medium | Medium | Test all routes individually before integration |
| **Database connection fails** | Low | Medium | Retry logic + fallback to read-only mode |
| **FlexSearch indexing slow** | Low | Low | Index on startup + background refresh |
| **Container resource limits** | Low | Low | Set memory limit 512MB, monitor usage |

---

## Timeline (Estimate ~8-10 hours)

### Phase 1: Core Infrastructure (3-4h)
1. Create `src/utils/logger.js` with Pino configuration
2. Create `src/middleware/errorHandler.js` with Express error handlers
3. Create missing route files (ideas.js, files.js if needed)
4. Audit and fix all import statements
5. Test server starts locally: `npm run dev`

### Phase 2: Containerization (2-3h)
1. Verify Dockerfile configuration
2. Build Docker image
3. Test container startup
4. Verify environment variables
5. Test health check endpoint

### Phase 3: Testing & Validation (2h)
1. Test all API endpoints
2. Test FlexSearch indexing
3. Test database connection (Postgres/QuestDB)
4. Test Prometheus metrics export
5. Load testing (100 concurrent searches)

### Phase 4: Documentation (1-2h)
1. Create comprehensive README
2. Document environment variables
3. Update containerization guide
4. Add troubleshooting section

**Total Estimated Time**: 8-10 hours over 2-3 days (with testing windows)

---

## Success Metrics

### Implementation Success
- ✅ Container starts without crashes
- ✅ Health check returns 200 OK
- ✅ All API endpoints respond correctly
- ✅ FlexSearch indexes documentation (>100 files)
- ✅ Database connection established (if configured)
- ✅ Logs show no errors for 24 hours

### Performance Benchmarks
- ✅ Container startup < 30 seconds
- ✅ Search response time < 200ms (p95)
- ✅ Indexing time < 10 seconds for 1000 files
- ✅ Memory usage < 512MB
- ✅ CPU usage < 10% at idle

### Quality Gates
- ✅ No ESLint errors
- ✅ All tests passing (if test suite exists)
- ✅ No Docker build warnings
- ✅ Health check passes continuously
- ✅ Documentation complete and accurate

---

## Open Questions

### Question 1: Should DocsAPI support both QuestDB and Postgres?

**Context**: Current code has dual-strategy support for both databases.

**Options**:
- **Dual support** (current) - Flexibility, complexity
- **Postgres only** - Simpler, aligns with Prisma
- **QuestDB only** - Time-series optimized

**Recommendation**: **Postgres only** for MVP. QuestDB is for time-series (trading data), Postgres makes more sense for documentation metadata. Remove QuestDB code path to simplify.

---

### Question 2: Should FlexSearch index run on startup or background?

**Context**: Indexing 1000+ files can take 10-30 seconds.

**Options**:
- **Startup blocking** (current) - Container healthy only after indexing
- **Background async** - Container starts immediately, index builds async
- **Pre-built index** - Build index at Docker build time

**Recommendation**: **Background async** - Container starts fast, search becomes available after indexing completes. Add `/ready` endpoint that waits for index.

---

### Question 3: What database features are actually needed?

**Context**: DocsAPI has Prisma + QuestDB clients, but unclear what's persisted.

**Options**:
- **No database** - FlexSearch index only (in-memory)
- **SQLite** - Lightweight, single-file persistence
- **Postgres** - Full-featured, scalable

**Recommendation**: Start with **No database** (FlexSearch index only). Add persistence later if needed for:
- Documentation metadata (authors, versions)
- Search analytics
- User favorites/bookmarks

---

## References

### Related Specs
- **EXISTING**: `specs/documentation-hosting/spec.md` (Docusaurus hosting)
- **NEW**: `specs/documentation-api/spec.md` (this proposal)

### Affected Documentation
- `DOCUMENTATION-CONTAINER-SOLUTION.md` - Update with DocsAPI status
- `tools/compose/docker-compose.docs.yml` - Already configured
- `backend/api/documentation-api/README.md` - NEW - Comprehensive service documentation
- `scripts/universal/start.sh` - Add DocsAPI health check
- `docs/context/ops/service-port-map.md` - Document port 3401

### Existing Code
- `backend/api/documentation-api/src/server.js` - Main server file
- `backend/api/documentation-api/Dockerfile` - Container configuration
- `backend/api/documentation-api/package.json` - Dependencies

### Related Proposals
- `migrate-docs-to-docusaurus-v2` - Docusaurus migration (archived)

---

**Status**: 🟡 Proposal Stage (awaiting approval)
**Approval Required**: DevOps, Backend Team
**Next Steps**: Review proposal → Approve → Begin Phase 1 implementation
**Timeline**: 8-10 hours total effort over 2-3 days (with testing windows)

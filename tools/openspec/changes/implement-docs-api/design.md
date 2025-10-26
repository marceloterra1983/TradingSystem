# DocsAPI - Technical Design

## Context

The Documentation API (DocsAPI) is a Node.js/Express service that provides dynamic documentation management capabilities to complement the static NGINX documentation server. The service was partially implemented but is currently non-functional due to missing dependencies and incomplete module structure.

### Problem Statement

**Current Issues**:
- Container crashes on startup due to missing `src/utils/logger.js`
- Multiple modules import from non-existent files
- No centralized error handling
- Unclear database strategy (dual-support for QuestDB + Postgres)
- FlexSearch configuration incomplete

**Requirements**:
- Complete missing infrastructure files
- Fix all import dependencies
- Containerize successfully (port 3401)
- Provide full-text search via FlexSearch
- Validate OpenAPI/AsyncAPI specifications
- Export Prometheus metrics
- Support hot-reload development

---

## Goals / Non-Goals

### Goals
- ✅ Make DocsAPI container start successfully
- ✅ Provide full-text search across documentation
- ✅ Validate API specifications (OpenAPI, AsyncAPI)
- ✅ Export health and metrics endpoints
- ✅ Integrate with existing 2-container documentation architecture
- ✅ Support development mode with hot-reload
- ✅ Maintain backward compatibility with NGINX container

### Non-Goals
- ❌ Implement authentication/authorization (future enhancement)
- ❌ Add write capabilities (CRUD is read-only for now)
- ❌ Support multiple database strategies (simplify to one)
- ❌ Build UI components (API only, Dashboard consumes)
- ❌ Migrate away from FlexSearch (use existing choice)

---

## Architectural Decisions

### Decision 1: Centralized Logger Utility

**Problem**: Server.js creates Pino logger inline, but services expect `import { logger } from './utils/logger.js'`

**Solution**: Create `src/utils/logger.js` as centralized logger factory

**Implementation**:
```javascript
// src/utils/logger.js
import pino from 'pino';

export const createLogger = (options = {}) => {
  const isDev = process.env.NODE_ENV !== 'production';

  return pino({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: isDev ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss', // São Paulo timezone
        ignore: 'pid,hostname',
      },
    } : undefined,
    ...options,
  });
};

export const logger = createLogger();
```

**Alternatives Considered**:
1. **No centralized logger** - Every module creates own Pino instance
   - ❌ Rejected: Inconsistent configuration, hard to change log format
2. **Winston instead of Pino** - Different logging library
   - ❌ Rejected: Pino already used, performant, no reason to change
3. **Pass logger as dependency injection** - Constructor injection
   - ❌ Rejected: Too complex for this codebase, overkill

**Trade-offs**:
- ✅ Pro: Single source of truth for logging config
- ✅ Pro: Easy to test (can mock logger)
- ❌ Con: Global singleton (but acceptable for logging)

---

### Decision 2: Database Strategy - No Database (FlexSearch Only)

**Problem**: Current code supports both QuestDB and Postgres, unclear which is needed

**Solution**: Start with **no database** - FlexSearch in-memory index only

**Rationale**:
1. **FlexSearch is sufficient** for documentation search
2. **No persistence needed** for MVP - docs indexed on startup
3. **Simplifies deployment** - No database connection dependencies
4. **Faster startup** - No database migrations or connection pooling
5. **Can add later** if persistence is needed (user prefs, analytics)

**What to Remove**:
- QuestDB client (`src/utils/questDBClient.js`) - Keep file but don't use
- Postgres Prisma client (`src/utils/prismaClient.js`) - Keep file but don't use
- Database health checks in `/health` endpoint
- Database environment variables

**What to Keep**:
- FlexSearch index
- Markdown file scanning
- In-memory search

**Migration Path** (if database needed later):
1. Add SQLite for lightweight persistence
2. Store: user favorites, search analytics, doc metadata
3. Keep FlexSearch for search performance

**Alternatives Considered**:
1. **Postgres** - Full-featured database
   - ❌ Rejected: Overkill for read-only search
2. **QuestDB** - Time-series database
   - ❌ Rejected: Not designed for documentation metadata
3. **SQLite** - Lightweight file-based
   - ⚠️ Deferred: Good option if persistence needed later

**Trade-offs**:
- ✅ Pro: Simpler deployment (no DB container)
- ✅ Pro: Faster startup (no connection wait)
- ✅ Pro: Easier testing (no DB mocking)
- ❌ Con: Search index rebuilt on restart (acceptable - fast)
- ❌ Con: No persistence for metadata (defer to future)

---

### Decision 3: FlexSearch Indexing - Background Async

**Problem**: Indexing 1000+ markdown files takes 10-30 seconds, blocks container startup

**Solution**: Index asynchronously in background, container starts immediately

**Implementation**:
```javascript
// Server starts listening immediately
app.listen(PORT, () => {
  logger.info('Server started, indexing documentation in background...');

  // Index in background (non-blocking)
  markdownSearchService.indexMarkdownFiles()
    .then((result) => {
      logger.info({ indexed: result }, 'Documentation indexed');
      indexReady = true;
    })
    .catch((error) => {
      logger.error({ err: error }, 'Failed to index documentation');
    });
});

// Health endpoint shows indexing status
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'documentation-api',
    search: {
      ready: indexReady,
      indexed_files: markdownSearchService.getIndexedCount()
    }
  });
});

// Separate /ready endpoint for Kubernetes-style readiness
app.get('/ready', (req, res) => {
  if (indexReady) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'Indexing in progress' });
  }
});
```

**Alternatives Considered**:
1. **Blocking startup** - Wait for indexing before accepting requests
   - ❌ Rejected: Container marked unhealthy for 30s, bad UX
2. **Pre-built index** - Build index at Docker build time
   - ❌ Rejected: Index depends on mounted `/docs` volume, not in image
3. **Lazy indexing** - Index on first search request
   - ❌ Rejected: First search would be slow, confusing UX

**Trade-offs**:
- ✅ Pro: Container starts fast (< 5s)
- ✅ Pro: Health checks pass immediately
- ✅ Pro: Clear status via `/ready` endpoint
- ❌ Con: Search returns empty results until indexing completes
- ⚠️ Mitigation: Dashboard shows "Indexing..." spinner while !ready

---

### Decision 4: Error Handling - Global Middleware

**Problem**: No centralized error handling, each route handles errors differently

**Solution**: Create `src/middleware/errorHandler.js` with Express error middleware

**Implementation**:
```javascript
// src/middleware/errorHandler.js
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log error with stack trace (dev only)
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
  }, 'Request error');

  // Validation error (express-validator)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  // Not found error
  if (err.status === 404) {
    return res.status(404).json({
      error: 'Not found',
      message: err.message,
    });
  }

  // Default to 500 server error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: 'Server error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.url} not found`,
  });
};
```

**Best Practices**:
- ✅ Log all errors with context
- ✅ Never expose stack traces in production
- ✅ Return consistent JSON error format
- ✅ Use appropriate HTTP status codes
- ✅ Handle async errors with try/catch in routes

**Alternatives Considered**:
1. **Route-level error handling** - try/catch in every route
   - ❌ Rejected: Duplicated code, easy to forget
2. **Custom error classes** - NotFoundError, ValidationError, etc.
   - ⚠️ Deferred: Good for future, overkill for MVP
3. **Error tracking service** - Sentry, Rollbar, etc.
   - ⚠️ Deferred: Add when monitoring is set up

---

### Decision 5: Missing Routes - Minimal Implementation

**Problem**: Some routes imported in server.js may not exist (ideas, files)

**Solution**: Create minimal CRUD routes only if referenced, else remove imports

**Implementation Strategy**:
1. **Check if route file exists** with Glob
2. **If missing and used**: Create minimal route:
   ```javascript
   // src/routes/ideas.js (minimal)
   import express from 'express';
   const router = express.Router();

   router.get('/', (req, res) => {
     res.json({ message: 'Ideas API - Coming soon' });
   });

   export default router;
   ```
3. **If missing and unused**: Remove import from server.js

**Rationale**:
- Don't implement features not needed for MVP
- Provide placeholder for future implementation
- Keep server.js imports valid (no crashes)

**Alternatives Considered**:
1. **Full CRUD implementation** - Complete ideas/files management
   - ❌ Rejected: Not needed for documentation search MVP
2. **Remove unused routes** - Delete imports
   - ⚠️ May break Dashboard if it expects these endpoints

---

## Component Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     DocsAPI Container                         │
│                      (Port 3401)                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Express Server (src/server.js)                        │  │
│  │  - CORS, Helmet, Rate Limiting                         │  │
│  │  - Request logging                                     │  │
│  │  - Prometheus metrics                                  │  │
│  └────────┬─────────────────────────────────────────────────┘  │
│           │                                                    │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │  Routes Layer (src/routes/)                            │  │
│  │  - /health - Health check                              │  │
│  │  - /api/v1/docs/search - Markdown search              │  │
│  │  - /api/v1/docs/facets - Search facets                │  │
│  │  - /api/v1/docs - Spec validation                     │  │
│  │  - /metrics - Prometheus metrics                      │  │
│  └────────┬─────────────────────────────────────────────────┘  │
│           │                                                    │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │  Services Layer (src/services/)                        │  │
│  │  - MarkdownSearchService - FlexSearch indexing         │  │
│  │  - SchemaValidator - OpenAPI/AsyncAPI validation       │  │
│  │  - VersionManager - Documentation versions             │  │
│  └────────┬─────────────────────────────────────────────────┘  │
│           │                                                    │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │  Data Layer                                            │  │
│  │  - FlexSearch Index (in-memory)                        │  │
│  │  - File System (/app/docs volume mount)               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Cross-Cutting Concerns                               │  │
│  │  - Logger (src/utils/logger.js)                       │  │
│  │  - Error Handler (src/middleware/errorHandler.js)     │  │
│  │  - Metrics (src/metrics.js)                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Module Dependencies

```
server.js
├── utils/logger.js (centralized Pino logger)
├── middleware/errorHandler.js (global error handling)
├── routes/
│   ├── markdown-search.js
│   │   └── services/markdownSearchService.js (FlexSearch)
│   ├── specs.js
│   │   └── services/schemaValidator.js (OpenAPI/AsyncAPI)
│   ├── versions.js
│   │   └── services/versionManager.js
│   └── metrics.js
│       └── metrics.js (Prometheus)
└── config/appConfig.js
```

---

## Data Flow

### Search Request Flow

```
1. Client → GET /api/v1/docs/search?q=authentication&domain=backend
   ↓
2. Route (markdown-search.js) validates query params
   ↓
3. Service (MarkdownSearchService) queries FlexSearch index
   ↓
4. FlexSearch returns matching documents
   ↓
5. Service filters by facets (domain, type, status)
   ↓
6. Service ranks results by relevance
   ↓
7. Route returns JSON response:
   {
     "results": [...],
     "total": 42,
     "took_ms": 15
   }
```

### Indexing Flow

```
1. Server starts → Launch background indexing
   ↓
2. MarkdownSearchService scans /app/docs directory
   ↓
3. For each .md file:
   - Parse YAML frontmatter
   - Extract title, summary, tags, domain, type
   - Extract markdown content
   - Tokenize text
   ↓
4. Add to FlexSearch index with metadata
   ↓
5. Set indexReady = true
   ↓
6. Log: "Indexed 1,234 files in 8.5s"
```

---

## Configuration

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | `development` | Environment mode (development/production) |
| `PORT` | number | `3000` | HTTP server port |
| `LOG_LEVEL` | string | `info` | Logging level (debug/info/warn/error) |
| `DOCS_DIR` | string | `/app/docs` | Documentation directory path |
| `CORS_ORIGIN` | string | `http://localhost:3103` | Allowed CORS origins (comma-separated) |
| `CORS_DISABLE` | boolean | `false` | Disable CORS (unified domain mode) |
| `RATE_LIMIT_WINDOW_MS` | number | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | number | `100` | Max requests per window |

### Docker Volumes

| Mount Point | Source | Mode | Purpose |
|-------------|--------|------|---------|
| `/app/docs` | `../../docs` | `ro` | Documentation content (read-only) |
| `/app/db` | `docs-api-data` (volume) | `rw` | Database persistence (if needed) |

---

## Performance Considerations

### Memory Usage

**Target**: < 512MB

**Breakdown**:
- Node.js runtime: ~50MB
- FlexSearch index: ~100MB (1000 docs × 100KB avg)
- Express + middleware: ~20MB
- Dependencies: ~50MB
- **Total**: ~220MB (43% of limit)

**Monitoring**:
- `docker stats docs-api` - Real-time memory usage
- Prometheus metric: `process_resident_memory_bytes`

### Indexing Performance

**Target**: < 10 seconds for 1000 files

**Optimization**:
- Parallel file reading (Promise.all)
- Stream large files (don't load into memory)
- Debounce file watcher (if hot-reload)
- Skip binary files (.pdf, .png)

**Benchmark**:
```bash
# Test indexing speed
time curl http://localhost:3401/api/v1/docs/reindex
```

### Search Performance

**Target**: < 200ms p95 latency

**Optimization**:
- FlexSearch default config (fast tokenizer)
- Limit results to 50 per query
- Cache facets (rebuild only on reindex)
- Use FlexSearch async API

**Monitoring**:
- Prometheus histogram: `search_request_duration_seconds`
- Track slow queries (> 500ms) in logs

---

## Security Considerations

### Input Validation

- ✅ Sanitize search queries (prevent XSS)
- ✅ Limit query length (max 200 chars)
- ✅ Rate limiting (100 req/15min per IP)
- ✅ Helmet.js security headers

### File System Access

- ✅ Read-only volume mount (`/app/docs:ro`)
- ✅ Never execute user-provided code
- ✅ Validate file paths (prevent directory traversal)
- ✅ Whitelist file extensions (.md, .yaml, .json)

### Error Messages

- ❌ Don't expose file system paths in production
- ❌ Don't expose stack traces in production
- ✅ Generic error messages for external users
- ✅ Detailed logs for debugging (server-side only)

---

## Testing Strategy

### Unit Tests
- Logger utility (timezone, format)
- Error handler middleware (status codes, JSON format)
- FlexSearch service (indexing, search, facets)

### Integration Tests
- Container startup (health check, indexing)
- API endpoints (search, facets, validation)
- Error handling (404, 400, 500)

### Load Tests
- 100 concurrent searches
- Memory usage under load
- Response time degradation

---

## Risks / Trade-offs

### Risk 1: FlexSearch Index Memory Growth

**Scenario**: Documentation grows to 10,000+ files, index exceeds 512MB limit

**Mitigation**:
1. Monitor index size via Prometheus
2. Alert if > 400MB (80% of limit)
3. Consider pagination or index sharding if needed
4. Use FlexSearch `doc` option to exclude content from index (store only metadata)

---

### Risk 2: Missing Files Discovered During Implementation

**Scenario**: File audit reveals more missing dependencies than expected

**Mitigation**:
1. Complete file audit in Phase 1 before coding
2. Create checklist of all missing files
3. Prioritize critical files (logger, error handler)
4. Defer non-critical features (ideas, files CRUD)

---

### Risk 3: Dashboard Integration Issues

**Scenario**: Dashboard expects endpoints that don't exist yet

**Mitigation**:
1. Review Dashboard code for DocsAPI calls
2. Create placeholder routes if needed
3. Document API contract before implementation
4. Test Dashboard integration end-to-end

---

## Migration Plan

### Phase 1: Core Files (No Downtime)
- Documentation container (NGINX) continues working
- Dashboard not yet integrated, no impact

### Phase 2: Container Build (No Downtime)
- Build new image locally
- Test container in isolation
- No impact on running services

### Phase 3: Container Deploy (< 1 min Downtime)
1. Stop old docs-api container (if running)
2. Start new container
3. Wait for health check
4. Verify search works

### Phase 4: Integration (No Downtime)
- Update Dashboard API calls (optional, when ready)
- Add DocsAPI to startup script health checks

### Rollback
- Stop docs-api container
- Documentation NGINX continues working
- No data loss (no database)

---

## Open Questions

### Q1: Should we index on file changes (hot-reload)?

**Context**: Development mode mounts `/docs` as volume, files can change

**Options**:
1. **Manual reindex** - POST /api/v1/docs/reindex endpoint
2. **Auto-reindex** - Watch /docs directory, reindex on changes
3. **No reindex** - Restart container to reindex

**Recommendation**: **Manual reindex** for MVP. Auto-reindex adds complexity (file watcher, debouncing). Developer can call reindex endpoint if needed.

---

### Q2: Should search support fuzzy matching?

**Context**: FlexSearch supports fuzzy search (typo tolerance)

**Options**:
1. **Exact match** - Fast, strict
2. **Fuzzy match** - Tolerates typos, slower

**Recommendation**: **Exact match** for MVP. Add fuzzy as query param later (`?fuzzy=true`).

---

## References

- FlexSearch documentation: https://github.com/nextapps-de/flexsearch
- Pino logger: https://getpino.io
- Express best practices: https://expressjs.com/en/advanced/best-practice-performance.html
- Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/

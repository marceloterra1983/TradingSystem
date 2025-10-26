# DocsAPI Implementation - OpenSpec Proposal

**Change ID**: `implement-docs-api`
**Created**: 2025-10-26
**Status**: Proposal (awaiting approval)

---

## Overview

This OpenSpec proposal addresses the incomplete implementation of the Documentation API (DocsAPI), which is currently in a crash loop due to missing dependencies. The proposal includes a complete implementation plan to get the DocsAPI container working.

---

## Problem

The DocsAPI container (`docs-api`, port 3401) fails to start with:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/src/utils/logger.js'
```

**Root Cause**: Missing critical files and incomplete module structure.

**Impact**:
- Documentation search unavailable
- No API spec validation
- Dashboard cannot integrate with DocsAPI
- 2-container documentation solution incomplete (NGINX works, DocsAPI broken)

---

## Solution

Complete the DocsAPI implementation by:

1. **Creating missing files**: logger.js, errorHandler.js, missing routes
2. **Fixing imports**: Audit and fix all import statements
3. **Containerization**: Verify Docker configuration
4. **Testing**: Validate container startup and API endpoints
5. **Documentation**: Create comprehensive README and guides

**Estimated Effort**: 8-10 hours over 2-3 days

---

## Proposal Files

This OpenSpec proposal includes:

### 📄 [proposal.md](./proposal.md)
- **Why**: Problem statement and motivation
- **What Changes**: Detailed list of changes (4 phases)
- **Impact**: Affected components, risks, benefits
- **Timeline**: 8-10 hours breakdown
- **Success Metrics**: Performance benchmarks, quality gates

### ✅ [tasks.md](./tasks.md)
- **Phase 1**: Core Infrastructure (3-4h) - Logger, middleware, routes, imports
- **Phase 2**: Containerization (2-3h) - Dockerfile, Docker Compose, volumes
- **Phase 3**: Testing & Validation (2h) - API endpoints, load testing
- **Phase 4**: Documentation (1-2h) - README, integration docs
- **Phase 5**: Deployment (1h) - Production readiness, monitoring

### 🏗️ [design.md](./design.md)
- **Architectural Decisions**: Logger, database strategy, error handling
- **Component Architecture**: Express layers, module dependencies
- **Data Flow**: Search and indexing flows
- **Performance**: Memory usage, indexing, search optimization
- **Security**: Input validation, file system access
- **Testing Strategy**: Unit, integration, load tests

### 📋 [specs/documentation-api/spec.md](./specs/documentation-api/spec.md)
- **18 Requirements** with scenarios following OpenSpec format
- Key requirements:
  - Centralized Logging
  - Global Error Handling
  - Container Health Check
  - Documentation Full-Text Search
  - Search Facets
  - API Specification Validation
  - Prometheus Metrics
  - Background Indexing
  - Rate Limiting
  - CORS Configuration
  - Development Hot-Reload
  - Graceful Shutdown

---

## Key Decisions

### 1. **No Database** (Simplification)
- FlexSearch in-memory index only
- No Postgres/QuestDB for MVP
- Can add later if persistence needed

**Rationale**: Search doesn't need persistence, simpler deployment

### 2. **Background Indexing** (Performance)
- Container starts immediately
- FlexSearch indexes asynchronously
- `/ready` endpoint for readiness checks

**Rationale**: Fast container startup, better UX

### 3. **Centralized Logger** (Consistency)
- `src/utils/logger.js` as single source
- All modules import from there
- Consistent timezone (São Paulo UTC-3)

**Rationale**: Fixes import errors, consistent logging

### 4. **Global Error Handler** (Reliability)
- Express middleware for all errors
- Consistent JSON error format
- No stack traces in production

**Rationale**: Better error handling, security

---

## Validation

To validate this proposal:

```bash
# If openspec CLI is available:
cd /home/marce/Projetos/TradingSystem
npx openspec validate implement-docs-api --strict

# Manual validation checklist:
# ✓ proposal.md has Why, What Changes, Impact sections
# ✓ tasks.md has implementation checklist
# ✓ design.md has technical decisions
# ✓ specs/documentation-api/spec.md has ADDED requirements
# ✓ Each requirement has at least one #### Scenario:
# ✓ Scenarios follow GIVEN/WHEN/THEN format
```

---

## Next Steps

### Approval Phase
1. **Review proposal.md** - Understand problem and solution
2. **Review tasks.md** - Validate implementation plan
3. **Review design.md** - Approve technical decisions
4. **Approve proposal** - Green light to implement

### Implementation Phase
1. **Phase 1**: Create logger, middleware, fix imports (3-4h)
2. **Phase 2**: Build and test container (2-3h)
3. **Phase 3**: Validate all endpoints (2h)
4. **Phase 4**: Write documentation (1-2h)
5. **Phase 5**: Deploy and monitor (1h)

### Post-Implementation
1. **Archive proposal** to `changes/archive/2025-10-26-implement-docs-api/`
2. **Update specs** if capabilities changed
3. **Update documentation** with DocsAPI status

---

## Success Criteria

### Must Have (P0)
- ✅ Container starts without crashes
- ✅ `/health` returns 200 OK
- ✅ Search endpoint works
- ✅ Logs show no errors

### Should Have (P1)
- ✅ All API endpoints tested
- ✅ Documentation complete
- ✅ Integrated with startup script
- ✅ Performance benchmarks met

### Nice to Have (P2)
- ⏸️ Dashboard integration (deferred)
- ⏸️ Spec validation working (deferred)
- ⏸️ Grafana dashboards (deferred)

---

## References

- **Current Issue**: `DOCUMENTATION-CONTAINER-SOLUTION.md` - DocsAPI crash loop
- **Docker Compose**: `tools/compose/docker-compose.docs.yml` - Container config
- **Existing Code**: `backend/api/documentation-api/` - Partial implementation
- **Related Spec**: `specs/documentation-hosting/spec.md` - NGINX container

---

## Contact

- **Proposal Author**: Claude Code AI Agent
- **Created**: 2025-10-26
- **OpenSpec Version**: Compatible with project OpenSpec format

---

**Ready for review!** 🚀

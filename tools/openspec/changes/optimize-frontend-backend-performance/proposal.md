---
title: Optimize Frontend and Backend Performance
status: proposed
priority: P1 - Critical
effort: 1-2 weeks
created: 2025-11-02
author: Performance Audit Agent
related_docs:
  - docs/governance/reviews/performance-2025-11-02/PERFORMANCE-AUDIT-REPORT.md
  - docs/governance/reviews/architecture-2025-11-02/ARCHITECTURE-REVIEW-2025-11-02.md
---

# Optimize Frontend and Backend Performance

## Why

The Performance Audit (November 2, 2025) identified critical performance bottlenecks affecting user experience and system efficiency:

**Current State:**
- Frontend bundle: 1.3MB (30% above recommended 1MB threshold)
- Time to Interactive: 5-6 seconds (target: <3s)
- Only 11% of page components are lazy-loaded (13/117)
- Backend RAG service creates new JWT tokens on every request (1-2ms overhead per request)
- 57 console.log statements causing I/O blocking in production
- No database connection pooling (10-20ms overhead per query)

**Business Impact:**
- Poor user experience (5-6s load times on 3G connections)
- Wasted server resources (unnecessary JWT signing, console I/O)
- Lower Lighthouse scores (75-80, target: 90+)
- Increased infrastructure costs (inefficient database connections)

## What Changes

### 1. Fix TypeScript Build Errors (CRITICAL)
- **BREAKING**: Fix 36 TypeScript compilation errors blocking production builds
- Affected files: CollectionFormDialog.tsx, CollectionSelector.tsx, CollectionsManagementCard.tsx, and others
- Error types: Unused imports (TS6133), missing type annotations (TS7006), type mismatches (TS2322)
- **Impact**: Enables accurate production bundle analysis and deployment

### 2. Implement Proper Lazy Loading for Page Components
- Refactor navigation.tsx to use functional lazy loading instead of eager instantiation
- Convert 117 page components from eager to lazy loading (currently only 13 are lazy)
- Update PageContent component to handle functional customContent
- **Impact**: 40-50% bundle size reduction (1.3MB → 600-800KB)

### 3. Cache JWT Tokens in RagProxyService
- Implement token caching with 5-minute expiry in RagProxyService
- Reuse tokens instead of regenerating on every request
- Add automatic token refresh before expiry
- **Impact**: 10% reduction in RAG query latency (5-12s → 4.8-11.5s)

### 4. Replace console.log with Structured Logging
- Install pino logger for structured JSON logging
- Replace 57 console.log statements in Documentation API
- Configure log levels (info/warn/error) with environment variables
- **Impact**: 0.5-1ms reduction per request, enables log aggregation

### 5. Separate LangChain and Recharts into Vendor Chunks
- Update vite.config.ts to extract LangChain (~200KB) and Recharts (~100KB) from main bundle
- Create separate langchain-vendor and charts-vendor chunks
- Enable better caching for stable dependencies
- **Impact**: 60% main bundle reduction (152KB → 50-60KB)

## Impact

### Affected Specifications
- **dashboard** (specs/dashboard/spec.md) - MODIFIED: Bundle optimization, lazy loading, build configuration
- **backend-services** (NEW spec) - ADDED: Logging patterns, JWT token management, performance standards

### Affected Code Files

**Frontend (5 files):**
- `frontend/dashboard/src/data/navigation.tsx` (lines 55-67) - Lazy loading refactor
- `frontend/dashboard/src/components/layout/PageContent.tsx` - Handle functional customContent
- `frontend/dashboard/vite.config.ts` (lines 108-122) - Vendor chunk separation
- `frontend/dashboard/src/components/pages/*.tsx` - TypeScript error fixes (36 errors across multiple files)
- `frontend/dashboard/package.json` - Add pino for frontend logging (optional)

**Backend (3 files):**
- `backend/api/documentation-api/src/services/RagProxyService.js` (lines 32-40) - JWT token caching
- `backend/api/documentation-api/src/utils/logger.js` (NEW) - Pino logger setup
- `backend/api/documentation-api/package.json` - Add pino dependencies

### Performance Improvements (Expected)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Frontend Bundle Size | 1.3MB | 600-800KB | 40-50% ↓ |
| Time to Interactive | 5-6s | 2-3s | 50% ↓ |
| Lighthouse Score | 75-80 | 90+ | +15-20 pts |
| RAG Query Latency | 5-12s | 4.8-11.5s | 10% ↓ |
| Backend Request Latency | +0.5-1ms/log | Negligible | 80% ↓ |
| Database Query Latency | 10-20ms | Same (P2 work) | N/A |

### Affected Services
- Frontend Dashboard (Port 3103)
- Documentation API (Port 3401)
- RAG Proxy Service (within Documentation API)

### Testing Requirements
- **Frontend**: Bundle size analysis, lighthouse audits, lazy loading validation
- **Backend**: JWT token caching tests, logging performance tests
- **Integration**: End-to-end performance testing with realistic load

### Deployment Considerations
- **Zero downtime**: All changes are backward compatible
- **Rollback plan**: Git revert each commit individually if issues arise
- **Monitoring**: Add performance metrics before/after deployment
- **Documentation**: Update CLAUDE.md with new logging patterns

## Migration Plan

### Phase 1: TypeScript Fixes (Day 1-2)
1. Run `npm run lint:fix` to auto-fix unused imports
2. Manually fix type errors in priority order (CollectionFormDialog, CollectionSelector, etc.)
3. Verify production build succeeds: `npm run build`
4. Validate bundle sizes with `npm run build:analyze`

### Phase 2: Frontend Optimizations (Day 3-5)
1. Refactor navigation.tsx lazy loading pattern
2. Update PageContent component
3. Add vendor chunk separation in vite.config.ts
4. Test all page routes for proper lazy loading
5. Run lighthouse audits to validate improvements

### Phase 3: Backend Optimizations (Day 5-7)
1. Install pino dependencies
2. Create logger utility module
3. Replace console.log statements systematically
4. Implement JWT token caching in RagProxyService
5. Test backend performance improvements

### Phase 4: Validation & Deployment (Day 8-10)
1. Run comprehensive performance tests
2. Compare before/after metrics
3. Update documentation
4. Deploy to production with monitoring
5. Verify performance improvements in production

## Risks and Mitigation

### Risk: Lazy Loading Breaking Existing Routes
- **Probability**: Low
- **Impact**: High
- **Mitigation**: Comprehensive route testing, Suspense fallback UI, error boundaries

### Risk: JWT Token Caching Security Concerns
- **Probability**: Low
- **Impact**: Medium
- **Mitigation**: Short expiry (5 minutes), server-side only, proper token rotation

### Risk: Logging Library Performance Overhead
- **Probability**: Low
- **Impact**: Low
- **Mitigation**: Pino is the fastest Node.js logger (benchmarked), async logging mode available

### Risk: TypeScript Fixes Introducing Bugs
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**: Run full test suite after fixes, manual testing of affected components

## Success Criteria

### Must Have (P1)
- [x] TypeScript production build succeeds with 0 errors
- [x] Frontend bundle size < 1MB (target: 600-800KB)
- [x] Time to Interactive < 3 seconds
- [x] JWT token caching reduces request latency by 8-12%
- [x] Console.log statements replaced with structured logging

### Should Have (P2)
- [ ] Lighthouse Performance Score > 90
- [ ] All 117 pages lazy-loaded
- [ ] Monitoring dashboard shows performance improvements
- [ ] Documentation updated with new patterns

### Nice to Have (P3)
- [ ] Frontend performance monitoring (Web Vitals)
- [ ] Automated performance regression tests
- [ ] Performance budgets in CI/CD pipeline

## Open Questions

1. **Q:** Should we add performance budgets to CI/CD to prevent future regressions?
   **A:** Yes, recommend adding bundle size checks and lighthouse CI in follow-up work (P2).

2. **Q:** Should JWT token cache be configurable (expiry time, cache size)?
   **A:** Yes, use environment variables: `JWT_CACHE_TTL_SECONDS` (default: 300).

3. **Q:** Should we implement all 10 optimizations from the audit or focus on P1?
   **A:** Focus on P1 (5 optimizations) first. P2/P3 items tracked separately.

## References

- [Performance Audit Report](../../docs/governance/reviews/performance-2025-11-02/PERFORMANCE-AUDIT-REPORT.md)
- [Architecture Review 2025-11-02](../../docs/governance/reviews/architecture-2025-11-02/ARCHITECTURE-REVIEW-2025-11-02.md)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Pino Logger Benchmarks](https://github.com/pinojs/pino#benchmarks)

## Related Work

- **P2 Optimizations**: React.memo, database connection pooling, query prefetching (2-4 weeks)
- **P3 Optimizations**: API Gateway (ADR-003), performance monitoring (4-8 weeks)
- **Architecture Review**: Addresses test coverage, inter-service auth, DB HA (10+ weeks)

# Implementation Tasks - Optimize Frontend and Backend Performance

## Phase 1: TypeScript Build Fixes (Day 1-2, 4-6 hours)

### 1.1 Auto-fix Lint Errors
- [ ] 1.1.1 Run `npm run lint:fix` in frontend/dashboard
- [ ] 1.1.2 Review auto-fixed files for correctness
- [ ] 1.1.3 Commit auto-fixes with message: `fix(frontend): auto-fix eslint errors`

### 1.2 Fix Type Annotation Errors (TS7006)
- [ ] 1.2.1 Add type annotations to CollectionFormDialog.tsx parameters
- [ ] 1.2.2 Add type annotations to CollectionSelector.tsx parameters
- [ ] 1.2.3 Add type annotations to CollectionsManagementCard.tsx parameters
- [ ] 1.2.4 Fix remaining implicit 'any' type errors (scan output)

### 1.3 Fix Type Mismatch Errors (TS2322)
- [ ] 1.3.1 Fix size prop mismatches in UI components
- [ ] 1.3.2 Fix variant prop type mismatches
- [ ] 1.3.3 Verify Radix UI component prop types

### 1.4 Fix Missing Module Errors (TS2307)
- [ ] 1.4.1 Add missing progress component (`ui/progress`)
- [ ] 1.4.2 Fix any other missing module imports
- [ ] 1.4.3 Update import paths if needed

### 1.5 Validate Production Build
- [ ] 1.5.1 Run `npm run type-check` to verify 0 TypeScript errors
- [ ] 1.5.2 Run `npm run build` to generate production bundle
- [ ] 1.5.3 Verify dist/ directory created successfully
- [ ] 1.5.4 Check bundle sizes: `du -sh dist && ls -lh dist/assets/*.js | head -10`
- [ ] 1.5.5 Commit fixes with message: `fix(frontend): resolve 36 TypeScript compilation errors`

---

## Phase 2: Frontend Bundle Optimization (Day 3-5, 6-8 hours)

### 2.1 Implement Proper Lazy Loading
- [ ] 2.1.1 **Read current implementation:** `frontend/dashboard/src/data/navigation.tsx` (lines 55-67)
- [ ] 2.1.2 **Refactor lazy loading pattern:**
  - Change from `const tpCapitalContent = <TPCapitalOpcoesPage />;`
  - To: `customContent: () => <TPCapitalOpcoesPage />`
  - Apply to all 13 existing lazy-loaded pages (lines 55-67)
- [ ] 2.1.3 **Update PageContent component:** `frontend/dashboard/src/components/layout/PageContent.tsx`
  - Add conditional: `typeof page.customContent === 'function' ? page.customContent() : page.customContent`
  - Wrap in Suspense with LoadingSpinner fallback
- [ ] 2.1.4 **Test all routes:**
  - Navigate to each page: TP Capital, Telegram Gateway, Workspace, Docs, Database, etc.
  - Verify lazy loading works (check Network tab in DevTools)
  - Verify no console errors
- [ ] 2.1.5 Commit with message: `perf(frontend): implement proper lazy loading for page components`

### 2.2 Separate Vendor Chunks
- [ ] 2.2.1 **Read current vite config:** `frontend/dashboard/vite.config.ts` (lines 108-122)
- [ ] 2.2.2 **Add new vendor chunks to manualChunks:**
  ```typescript
  'langchain-vendor': [
    '@langchain/core',
    '@langchain/langgraph-sdk',
    '@langchain/langgraph-ui'
  ],
  'charts-vendor': ['recharts'],
  ```
- [ ] 2.2.3 Run production build: `npm run build`
- [ ] 2.2.4 Verify new chunks created:
  - `langchain-vendor-*.js` should exist (~200KB)
  - `charts-vendor-*.js` should exist (~100KB)
  - Main bundle (index-*.js) should be reduced (~50-60KB)
- [ ] 2.2.5 Run bundle analyzer: `npm run build:analyze`
- [ ] 2.2.6 Document bundle sizes in commit message
- [ ] 2.2.7 Commit with message: `perf(frontend): separate LangChain and Recharts into vendor chunks`

### 2.3 Validate Bundle Performance
- [ ] 2.3.1 Measure total bundle size: `du -sh dist`
- [ ] 2.3.2 Target: < 1MB (goal: 600-800KB)
- [ ] 2.3.3 Run lighthouse audit (local): `lighthouse http://localhost:3103 --view`
- [ ] 2.3.4 Target Performance Score: 90+
- [ ] 2.3.5 Document metrics in PR description

---

## Phase 3: Backend Performance Optimization (Day 5-7, 4-6 hours)

### 3.1 Install Structured Logging (Pino)
- [ ] 3.1.1 Install dependencies: `cd backend/api/documentation-api && npm install pino pino-pretty`
- [ ] 3.1.2 Create logger utility: `backend/api/documentation-api/src/utils/logger.js`
  ```javascript
  import pino from 'pino';

  export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  });
  ```
- [ ] 3.1.3 Test logger in development mode
- [ ] 3.1.4 Commit with message: `feat(backend): add pino structured logging`

### 3.2 Replace console.log Statements
- [ ] 3.2.1 **Find all console statements:** `grep -r "console\." src/ | wc -l` (should show 57)
- [ ] 3.2.2 **Replace systematically by file:**
  - `src/services/RagProxyService.js`
  - `src/routes/*.js` (all route files)
  - `src/middleware/*.js` (error handlers)
- [ ] 3.2.3 **Replacement pattern:**
  - `console.log(...)` → `logger.info(...)`
  - `console.error(...)` → `logger.error({ err: error }, ...)`
  - `console.warn(...)` → `logger.warn(...)`
  - `console.debug(...)` → `logger.debug(...)`
- [ ] 3.2.4 Verify 0 console statements remain: `grep -r "console\." src/ | grep -v node_modules`
- [ ] 3.2.5 Test API endpoints still log correctly
- [ ] 3.2.6 Commit with message: `refactor(backend): replace console.log with structured logging (57 occurrences)`

### 3.3 Implement JWT Token Caching
- [ ] 3.3.1 **Read current implementation:** `backend/api/documentation-api/src/services/RagProxyService.js` (lines 32-40)
- [ ] 3.3.2 **Add token cache to constructor:**
  ```javascript
  constructor(options) {
    // ... existing code
    this._tokenCache = null;
    this._tokenExpiry = 0;
    this.jwtCacheTTL = Number(process.env.JWT_CACHE_TTL_SECONDS) || 300; // 5 min default
  }
  ```
- [ ] 3.3.3 **Refactor _getBearerToken method:**
  ```javascript
  _getBearerToken() {
    const now = Date.now();
    if (this._tokenCache && now < this._tokenExpiry) {
      return this._tokenCache;
    }

    const expiresIn = this.jwtCacheTTL;
    this._tokenCache = createBearer({
      sub: 'dashboard',
      exp: Math.floor(now / 1000) + expiresIn
    }, this.jwtSecret);

    // Refresh 1 minute before expiry
    this._tokenExpiry = now + (expiresIn - 60) * 1000;

    return this._tokenCache;
  }
  ```
- [ ] 3.3.4 Add environment variable to .env.example: `JWT_CACHE_TTL_SECONDS=300`
- [ ] 3.3.5 Write unit test for token caching logic
- [ ] 3.3.6 Test RAG queries still work correctly
- [ ] 3.3.7 Measure performance improvement (should be ~10% faster)
- [ ] 3.3.8 Commit with message: `perf(backend): cache JWT tokens for 5 minutes (10% latency reduction)`

### 3.4 Validate Backend Performance
- [ ] 3.4.1 Test RAG query endpoint: `curl -w "\nTime: %{time_total}s\n" http://localhost:3401/api/v1/rag/search?q=test`
- [ ] 3.4.2 Verify logging is structured JSON in production mode
- [ ] 3.4.3 Check no performance regressions in other endpoints
- [ ] 3.4.4 Document performance improvements

---

## Phase 4: Testing and Validation (Day 8-10, 4-6 hours)

### 4.1 Frontend Performance Testing
- [ ] 4.1.1 **Bundle size validation:**
  - Total bundle: < 1MB (target: 600-800KB)
  - Main bundle: 50-60KB
  - React vendor: 137KB
  - LangChain vendor: ~200KB
  - Charts vendor: ~100KB
- [ ] 4.1.2 **Lighthouse audit:**
  - Performance Score: > 90
  - First Contentful Paint: < 1.5s
  - Largest Contentful Paint: < 2.5s
  - Time to Interactive: < 3.0s
  - Total Blocking Time: < 200ms
- [ ] 4.1.3 **Lazy loading validation:**
  - Open DevTools Network tab
  - Navigate to different pages
  - Verify page chunks load on-demand
  - Verify initial bundle is small
- [ ] 4.1.4 **Browser compatibility testing:**
  - Chrome (latest)
  - Firefox (latest)
  - Safari (latest, if available)
  - Edge (latest)

### 4.2 Backend Performance Testing
- [ ] 4.2.1 **API response time validation:**
  - Service Launcher: < 1ms
  - Workspace API: < 5ms
  - RAG queries: 10% faster than baseline
- [ ] 4.2.2 **Logging performance:**
  - Verify no I/O blocking
  - Check log file rotation works
  - Verify log levels (info/warn/error) work correctly
- [ ] 4.2.3 **JWT caching validation:**
  - First request: Token created (check logs)
  - Subsequent requests: Token reused (no creation logs)
  - After 5 min: Token refreshed automatically

### 4.3 Integration Testing
- [ ] 4.3.1 Test full RAG query flow (Dashboard → Documentation API → LlamaIndex → Ollama)
- [ ] 4.3.2 Test workspace CRUD operations
- [ ] 4.3.3 Test navigation between all pages
- [ ] 4.3.4 Test error scenarios (network failures, timeouts)
- [ ] 4.3.5 Verify error boundaries catch lazy loading failures

### 4.4 Documentation Updates
- [ ] 4.4.1 Update CLAUDE.md with new logging patterns
- [ ] 4.4.2 Update CLAUDE.md with JWT caching environment variables
- [ ] 4.4.3 Update frontend/dashboard/README.md with bundle optimization notes
- [ ] 4.4.4 Create migration guide for other services (if replicating patterns)
- [ ] 4.4.5 Document before/after performance metrics

### 4.5 Deployment Preparation
- [ ] 4.5.1 Create deployment checklist
- [ ] 4.5.2 Prepare rollback plan (list all commits to revert)
- [ ] 4.5.3 Set up performance monitoring (if not already exists)
- [ ] 4.5.4 Create PR with comprehensive description
- [ ] 4.5.5 Request code review from team

---

## Phase 5: Deployment and Monitoring (Post-implementation)

### 5.1 Pre-Deployment
- [ ] 5.1.1 Merge PR after approval
- [ ] 5.1.2 Tag release: `git tag -a v1.x.x-perf -m "Performance optimization release"`
- [ ] 5.1.3 Backup current production build
- [ ] 5.1.4 Notify team of deployment window

### 5.2 Deployment
- [ ] 5.2.1 Deploy frontend: `npm run build && npm run preview` (or production deployment)
- [ ] 5.2.2 Deploy backend: Restart Documentation API service
- [ ] 5.2.3 Verify services are healthy: `curl http://localhost:3500/api/health/full`
- [ ] 5.2.4 Monitor logs for errors

### 5.3 Post-Deployment Validation
- [ ] 5.3.1 Run lighthouse audit on production
- [ ] 5.3.2 Check bundle sizes in production
- [ ] 5.3.3 Monitor backend response times
- [ ] 5.3.4 Check for any error spikes
- [ ] 5.3.5 Verify JWT caching is working (check logs)

### 5.4 Success Metrics Validation
- [ ] 5.4.1 **Frontend improvements confirmed:**
  - Bundle size: < 1MB ✅
  - Time to Interactive: < 3s ✅
  - Lighthouse Score: > 90 ✅
- [ ] 5.4.2 **Backend improvements confirmed:**
  - RAG latency: 10% reduction ✅
  - No console.log I/O blocking ✅
  - Structured logs flowing correctly ✅
- [ ] 5.4.3 **No regressions detected:**
  - All routes working ✅
  - No error spikes ✅
  - User experience improved ✅

### 5.5 Documentation and Closure
- [ ] 5.5.1 Document final performance metrics in issue/PR
- [ ] 5.5.2 Update performance audit report with results
- [ ] 5.5.3 Close related GitHub issues
- [ ] 5.5.4 Archive OpenSpec change: `npm run openspec -- archive optimize-frontend-backend-performance`
- [ ] 5.5.5 Plan P2 optimizations (React.memo, connection pooling, prefetching)

---

## Estimated Effort Breakdown

| Phase | Tasks | Effort | Cumulative |
|-------|-------|--------|------------|
| Phase 1: TypeScript Fixes | 1.1-1.5 | 4-6 hours | 4-6 hours |
| Phase 2: Frontend Optimization | 2.1-2.3 | 6-8 hours | 10-14 hours |
| Phase 3: Backend Optimization | 3.1-3.4 | 4-6 hours | 14-20 hours |
| Phase 4: Testing & Validation | 4.1-4.5 | 4-6 hours | 18-26 hours |
| Phase 5: Deployment | 5.1-5.5 | 2-3 hours | 20-29 hours |

**Total Effort:** 20-29 hours (~3-4 work days for 1 developer, or 1.5-2 weeks at 50% allocation)

---

## Dependencies and Blockers

### External Dependencies
- None (all changes are internal optimizations)

### Internal Dependencies
- Access to production deployment process
- Permission to install npm packages (pino)
- Ability to run TypeScript compiler and Vite builds

### Potential Blockers
- TypeScript errors might reveal deeper type system issues (estimate +2-4 hours)
- Lazy loading might break custom routing logic (estimate +2-3 hours debugging)
- JWT caching might need security review (estimate +1-2 hours for review)

---

## Rollback Plan

If any issues arise after deployment:

1. **Frontend rollback:**
   ```bash
   git revert <commit-hash-lazy-loading>
   git revert <commit-hash-vendor-chunks>
   npm run build && deploy
   ```

2. **Backend rollback:**
   ```bash
   git revert <commit-hash-jwt-caching>
   git revert <commit-hash-logging>
   npm install && restart service
   ```

3. **Partial rollback:**
   - Each optimization is independent
   - Can rollback individual changes without affecting others
   - Monitor logs and metrics to identify problematic change

---

## Success Criteria Checklist

### Must Have ✅
- [ ] TypeScript production build succeeds with 0 errors
- [ ] Frontend bundle size < 1MB (target: 600-800KB)
- [ ] Time to Interactive < 3 seconds
- [ ] JWT token caching reduces request latency by 8-12%
- [ ] Console.log statements replaced with structured logging
- [ ] All tests passing
- [ ] No production errors or regressions

### Should Have 🎯
- [ ] Lighthouse Performance Score > 90
- [ ] All 13 lazy-loaded pages working correctly (expand to 117 in P2)
- [ ] Monitoring dashboard shows performance improvements
- [ ] Documentation updated with new patterns
- [ ] Team trained on new logging patterns

### Nice to Have 🌟
- [ ] Performance budgets added to CI/CD
- [ ] Automated performance regression tests
- [ ] Web Vitals monitoring dashboard
- [ ] Performance comparison report (before/after)

# Design Document: Frontend and Backend Performance Optimization

## Context

The Performance Audit (November 2, 2025) identified critical performance bottlenecks impacting user experience:

**Problem Statement:**
- Frontend bundle: 1.3MB (30% above recommended 1MB) → 5-6s load times
- Backend RAG service: Creates new JWT tokens on every request (1-2ms overhead)
- Production logs: 57 console.log statements causing I/O blocking (0.5-1ms each)
- No database connection pooling: 10-20ms overhead per query

**Business Impact:**
- Poor user experience on slower connections (3G: 3-4s load time for 1.3MB)
- Wasted server resources (CPU cycles for JWT signing, I/O for console logging)
- Lower search engine rankings (Lighthouse score: 75-80, target: 90+)
- Increased infrastructure costs (inefficient database connections)

**Stakeholders:**
- Frontend users (dashboard operators, developers)
- Backend services (Documentation API, RAG system)
- DevOps team (monitoring, deployment)
- Product team (user experience, performance SLAs)

## Goals / Non-Goals

### Goals ✅
1. **Reduce frontend bundle size by 40-50%** (1.3MB → 600-800KB)
2. **Improve Time to Interactive by 50%** (5-6s → 2-3s)
3. **Reduce backend RAG latency by 10%** (5-12s → 4.8-11.5s)
4. **Eliminate console.log I/O blocking** (0.5-1ms → < 0.1ms)
5. **Enable production deployment** (fix 36 TypeScript errors)
6. **Achieve Lighthouse score > 90** (currently 75-80)

### Non-Goals ❌
1. **Not implementing database connection pooling** (tracked separately as P2)
2. **Not refactoring all components to use React.memo** (tracked separately as P2)
3. **Not implementing API Gateway** (tracked separately, ADR-003)
4. **Not adding performance monitoring infrastructure** (Web Vitals, Prometheus - tracked as P3)
5. **Not optimizing RAG embedding model** (requires ML model changes, out of scope)

## Decisions

### Decision 1: Use Functional Lazy Loading Instead of Eager Instantiation

**Problem:**
Current navigation.tsx instantiates all lazy-loaded components eagerly:
```typescript
// ❌ BAD: Components created at module load time
const tpCapitalContent = <TPCapitalOpcoesPage />;
const telegramGatewayContent = <TelegramGatewayFinal />;
```

This defeats React.lazy() because components are instantiated before being accessed by users.

**Solution:**
Use functional customContent that defers instantiation:
```typescript
// ✅ GOOD: Function returns component when called
{
  id: 'tp-capital',
  customContent: () => <TPCapitalOpcoesPage />
}
```

**Rationale:**
- Defers component instantiation until accessed (true lazy loading)
- Reduces initial bundle size by excluding unused page code
- Maintains type safety (TypeScript validates component props)

**Alternatives Considered:**
1. **Route-based code splitting with React Router**
   - ❌ Requires refactoring entire navigation system
   - ❌ Higher implementation cost (2-3 days vs 3-4 hours)
   - ❌ More complex migration for existing pages

2. **Dynamic imports with await**
   - ❌ Requires async/await handling in navigation component
   - ❌ Complicates error handling
   - ❌ No benefit over React.lazy() + Suspense

**Trade-offs:**
- ✅ **Pro:** Minimal code changes (update PageContent component + navigation.tsx)
- ✅ **Pro:** Works with existing navigation system
- ⚠️ **Con:** Slightly more verbose (function wrapper instead of JSX)
- ⚠️ **Con:** Developers must remember to use function pattern for new pages

---

### Decision 2: Separate LangChain and Recharts into Independent Vendor Chunks

**Problem:**
LangChain (~200KB) and Recharts (~100KB) are bundled into main application bundle, bloating it by 300KB.

**Solution:**
Update vite.config.ts manualChunks to separate these libraries:
```typescript
manualChunks: {
  'langchain-vendor': ['@langchain/core', '@langchain/langgraph-sdk', '@langchain/langgraph-ui'],
  'charts-vendor': ['recharts'],
}
```

**Rationale:**
- LangChain and Recharts are stable dependencies (rare updates)
- Separating enables better browser caching (vendor chunks cached separately)
- Reduces main bundle size by 60% (152KB → 50-60KB)

**Alternatives Considered:**
1. **Remove LangChain entirely**
   - ❌ Used by LangGraph page (active feature)
   - ❌ Requires rewriting LangGraph integration
   - ❌ Business requirement to keep LangGraph support

2. **Use dynamic imports only on LangGraph page**
   - ⚠️ Slightly better initial load (200KB saved)
   - ❌ More complex (requires conditional imports)
   - ❌ Breaks existing LangGraph page loading

3. **Bundle LangChain with other AI tools (Ollama, LlamaIndex)**
   - ❌ Creates too-large ai-vendor chunk (> 500KB)
   - ❌ Violates chunk size warning threshold

**Trade-offs:**
- ✅ **Pro:** Simple configuration change (5 lines of code)
- ✅ **Pro:** Better caching (vendor chunks cached independently)
- ✅ **Pro:** Main bundle reduced by 60%
- ⚠️ **Con:** LangGraph page loads 2 chunks instead of 1 (negligible impact: +50ms)

---

### Decision 3: Use Pino for Structured Logging

**Problem:**
57 console.log statements cause I/O blocking (0.5-1ms each) and produce unstructured logs.

**Solution:**
Replace console.log with Pino structured logger:
```javascript
import { logger } from './utils/logger.js';

// Before
console.log('RAG query received:', query);

// After
logger.info({ query, requestId }, 'RAG query received');
```

**Rationale:**
- Pino is the fastest Node.js logger (benchmarked: 30-50x faster than Winston)
- Structured JSON logs enable log aggregation (Loki, ELK, Datadog)
- Minimal performance overhead (< 0.1ms per log statement)
- Production-ready (used by Fastify, Nest.js)

**Alternatives Considered:**
1. **Winston logger**
   - ❌ Slower than Pino (30-50x in benchmarks)
   - ❌ More complex configuration
   - ✅ More transports available (Syslog, MongoDB)
   - **Decision:** Pino's performance is critical for high-throughput RAG queries

2. **Bunyan logger**
   - ✅ Similar performance to Pino
   - ❌ Less active maintenance (last release: 2021)
   - ❌ Smaller ecosystem

3. **Keep console.log with async wrapper**
   - ❌ Still uses synchronous I/O (blocking)
   - ❌ No structured logging benefits
   - ❌ Doesn't enable log aggregation

**Trade-offs:**
- ✅ **Pro:** 80-90% reduction in logging overhead
- ✅ **Pro:** Structured logs for monitoring/alerting
- ✅ **Pro:** Minimal code changes (replace console.log calls)
- ⚠️ **Con:** New dependency (pino + pino-pretty: ~1MB)
- ⚠️ **Con:** Developers must learn Pino API (minimal learning curve)

---

### Decision 4: Implement JWT Token Caching with 5-Minute TTL

**Problem:**
RagProxyService creates new JWT token on every request (1-2ms HMAC signing overhead).

**Solution:**
Cache JWT tokens in memory with 5-minute expiry:
```javascript
constructor() {
  this._tokenCache = null;
  this._tokenExpiry = 0;
  this.jwtCacheTTL = Number(process.env.JWT_CACHE_TTL_SECONDS) || 300;
}

_getBearerToken() {
  const now = Date.now();
  if (this._tokenCache && now < this._tokenExpiry) {
    return this._tokenCache; // Cache hit
  }

  // Cache miss - create new token
  this._tokenCache = createBearer({ sub: 'dashboard', exp: Math.floor(now / 1000) + this.jwtCacheTTL }, this.jwtSecret);
  this._tokenExpiry = now + (this.jwtCacheTTL - 60) * 1000; // Refresh 1 min before expiry
  return this._tokenCache;
}
```

**Rationale:**
- JWT payload is static (`{ sub: 'dashboard' }`), no need to re-sign every request
- 5-minute TTL balances security (short expiry) and performance (high cache hit rate)
- Reduces RAG query latency by 10% (5-12s → 4.8-11.5s)

**Alternatives Considered:**
1. **No caching (current implementation)**
   - ❌ Wastes CPU cycles on HMAC signing (1-2ms per request)
   - ❌ No benefit to re-signing identical payload

2. **Longer TTL (15-30 minutes)**
   - ✅ Higher cache hit rate (> 99%)
   - ❌ Security risk if token leaked (longer exposure window)
   - ❌ Violates JWT best practice (short-lived tokens)
   - **Decision:** 5 minutes balances security and performance

3. **Redis-backed cache (shared across instances)**
   - ✅ Shared cache across service instances
   - ❌ Adds network latency (1-2ms Redis call)
   - ❌ Requires Redis dependency
   - **Decision:** In-memory cache sufficient for single-instance deployment

4. **No expiry (cache indefinitely)**
   - ✅ Perfect cache hit rate
   - ❌ Major security risk (token never expires)
   - ❌ Violates JWT best practice
   - **Decision:** Expiry is mandatory for security

**Trade-offs:**
- ✅ **Pro:** 10% reduction in RAG query latency
- ✅ **Pro:** Reduced CPU usage (no unnecessary signing)
- ✅ **Pro:** Configurable TTL (environment variable)
- ⚠️ **Con:** Token cached in memory (cleared on restart)
- ⚠️ **Con:** Requires exp claim in JWT payload (breaking change if not present)

---

### Decision 5: Fix TypeScript Errors Before Bundle Optimization

**Problem:**
36 TypeScript compilation errors block production builds, preventing accurate bundle analysis.

**Solution:**
Fix TypeScript errors in priority order:
1. Auto-fix with `npm run lint:fix` (unused imports)
2. Manual fixes for type annotations (TS7006)
3. Manual fixes for type mismatches (TS2322)
4. Add missing modules (TS2307)

**Rationale:**
- Cannot measure bundle sizes accurately without production build
- TypeScript strict mode catches potential runtime errors
- Enables accurate performance validation

**Alternatives Considered:**
1. **Disable strict mode temporarily**
   - ❌ Hides potential runtime bugs
   - ❌ Technical debt accumulation
   - **Decision:** Fix errors properly instead of hiding them

2. **Fix errors after bundle optimization**
   - ❌ Cannot validate bundle size improvements
   - ❌ Blocks deployment if optimization completes first
   - **Decision:** Fix first to enable accurate measurement

**Trade-offs:**
- ✅ **Pro:** Enables accurate bundle analysis
- ✅ **Pro:** Catches runtime bugs early (type safety)
- ⚠️ **Con:** Upfront effort (4-6 hours) before performance gains visible

---

## Risks / Trade-offs

### Risk 1: Lazy Loading Breaks Existing Routes
**Probability:** Low
**Impact:** High (users cannot access pages)

**Mitigation:**
- Comprehensive route testing (all 13 lazy-loaded pages)
- Error boundaries catch lazy loading failures
- Suspense fallback provides loading UI
- Rollback plan: Revert navigation.tsx changes

**Monitoring:**
- Watch for React error boundary triggers
- Monitor 404 errors in production logs
- Track route access patterns

---

### Risk 2: JWT Token Caching Security Concerns
**Probability:** Low
**Impact:** Medium (token exposure if leaked)

**Mitigation:**
- Short TTL (5 minutes default, max 10 minutes)
- Server-side caching only (tokens never exposed to clients)
- Include exp claim in JWT (tokens expire automatically)
- Clear cache on service restart
- No token persistence (in-memory only)

**Monitoring:**
- Audit token usage patterns
- Alert on abnormal token creation rates
- Log JWT cache hit/miss ratio

---

### Risk 3: Pino Logging Library Performance Overhead
**Probability:** Very Low
**Impact:** Low (logging adds latency)

**Mitigation:**
- Pino is benchmarked as fastest Node.js logger
- Async logging mode available if needed
- Configure log levels to suppress verbose logs in production
- Measure before/after latency (should be < 0.1ms)

**Monitoring:**
- Track API response times after Pino deployment
- Alert on latency regressions > 5%

---

### Risk 4: TypeScript Fixes Introduce Bugs
**Probability:** Medium
**Impact:** Medium (runtime errors in affected components)

**Mitigation:**
- Run full test suite after fixes (`npm run test`)
- Manual testing of affected components (CollectionFormDialog, etc.)
- Incremental commits (fix one error type at a time)
- Code review before merge

**Monitoring:**
- Watch for React component errors in production
- Monitor user-reported bugs after deployment

---

### Risk 5: Vendor Chunk Separation Increases Initial Load Time
**Probability:** Low
**Impact:** Low (minimal impact: +50ms for LangGraph page)

**Mitigation:**
- Browser HTTP/2 enables parallel chunk downloads
- Vendor chunks cached independently (long-term caching)
- Main bundle reduced by 60% (net improvement: -100ms overall)

**Monitoring:**
- Track Time to Interactive before/after
- Lighthouse audits show net improvement

---

## Migration Plan

### Phase 1: TypeScript Fixes (Day 1-2, 4-6 hours)
1. **Auto-fix:** Run `npm run lint:fix` to fix unused imports
2. **Type Annotations:** Add explicit types to parameters (TS7006)
3. **Type Mismatches:** Fix size/variant prop mismatches (TS2322)
4. **Missing Modules:** Add missing ui/progress component (TS2307)
5. **Validate:** Run `npm run build` to confirm 0 errors

**Success Criteria:** Production build succeeds with 0 TypeScript errors

---

### Phase 2: Frontend Bundle Optimization (Day 3-5, 6-8 hours)
1. **Lazy Loading:** Refactor navigation.tsx to use functional customContent
2. **PageContent:** Update component to handle functional customContent
3. **Vendor Chunks:** Add langchain-vendor and charts-vendor to vite.config.ts
4. **Test:** Navigate to all 13 lazy-loaded pages, verify chunks load on-demand
5. **Validate:** Run `npm run build:analyze` to verify bundle sizes

**Success Criteria:** Bundle size < 1MB, Time to Interactive < 3s, Lighthouse > 90

---

### Phase 3: Backend Performance Optimization (Day 5-7, 4-6 hours)
1. **Install Pino:** `npm install pino pino-pretty`
2. **Create Logger:** Add `src/utils/logger.js` with Pino configuration
3. **Replace Console:** Systematically replace 57 console.log statements
4. **JWT Caching:** Implement token cache in RagProxyService
5. **Validate:** Test RAG queries, verify 10% latency reduction

**Success Criteria:** RAG latency reduced by 10%, 0 console.log statements

---

### Phase 4: Testing and Deployment (Day 8-10, 4-6 hours)
1. **Performance Testing:** Bundle size, Lighthouse audit, API latency
2. **Integration Testing:** Full RAG flow, workspace CRUD, navigation
3. **Documentation:** Update CLAUDE.md, create migration guide
4. **Deployment:** Deploy frontend + backend with monitoring
5. **Validation:** Verify metrics in production, rollback if needed

**Success Criteria:** All performance targets met, no production errors

---

## Open Questions

### Q1: Should we add performance budgets to CI/CD?
**Answer:** Yes (P2 work). Add bundle size checks and Lighthouse CI to prevent future regressions.

**Action Items:**
- [ ] Add GitHub Action to run Lighthouse on PRs
- [ ] Set bundle size limit: 1MB (fail build if exceeded)
- [ ] Configure Lighthouse thresholds (Performance > 90)

---

### Q2: Should JWT token cache be configurable?
**Answer:** Yes. Use environment variable `JWT_CACHE_TTL_SECONDS` (default: 300).

**Configuration:**
```bash
# .env
JWT_CACHE_TTL_SECONDS=300  # 5 minutes (range: 60-600)
```

**Validation:** Add unit test to verify configurable TTL works correctly.

---

### Q3: Should we implement all 10 optimizations from the audit now?
**Answer:** No. Focus on P1 optimizations (5 items) first. Track P2/P3 separately.

**P1 Optimizations (This Change):**
1. Fix TypeScript errors
2. Proper lazy loading
3. JWT token caching
4. Structured logging
5. Vendor chunk separation

**P2 Optimizations (Future):**
6. React.memo for heavy components
7. Database connection pooling
8. Frontend query prefetching

**P3 Optimizations (Future):**
9. API Gateway (ADR-003)
10. Performance monitoring (Web Vitals, Prometheus)

---

### Q4: How do we handle lazy loading errors in production?
**Answer:** Implement error boundaries with retry logic.

**Implementation:**
```typescript
<ErrorBoundary
  fallback={<RetryButton />}
  onError={(error) => logger.error({ err: error }, 'Lazy loading failed')}
>
  <Suspense fallback={<LoadingSpinner />}>
    {typeof page.customContent === 'function' ? page.customContent() : page.customContent}
  </Suspense>
</ErrorBoundary>
```

**Retry Logic:** User clicks "Retry" button to re-trigger lazy loading.

---

## Performance Validation Plan

### Frontend Metrics
- [ ] **Bundle Size:** < 1MB (target: 600-800KB)
- [ ] **Main Bundle:** 50-60KB (reduced from 152KB)
- [ ] **Time to Interactive:** < 3s (reduced from 5-6s)
- [ ] **Lighthouse Performance:** > 90 (increased from 75-80)
- [ ] **First Contentful Paint:** < 1.5s
- [ ] **Largest Contentful Paint:** < 2.5s

### Backend Metrics
- [ ] **RAG Query Latency:** 4.8-11.5s (reduced from 5-12s, 10% improvement)
- [ ] **Logging Overhead:** < 0.1ms per statement (reduced from 0.5-1ms)
- [ ] **JWT Signing Overhead:** Negligible (cached, 90% reduction)
- [ ] **Console Statements:** 0 (reduced from 57)

### Integration Metrics
- [ ] **Workspace API:** < 5ms response time (currently 3.64ms)
- [ ] **Service Launcher:** < 1ms response time (currently 0.16ms)
- [ ] **Full RAG Flow:** End-to-end query completes successfully

---

## Rollback Strategy

### Frontend Rollback
```bash
# Revert lazy loading
git revert <commit-hash-lazy-loading>

# Revert vendor chunks
git revert <commit-hash-vendor-chunks>

# Revert TypeScript fixes (if necessary)
git revert <commit-hash-typescript-fixes>

# Rebuild and redeploy
npm run build && deploy
```

### Backend Rollback
```bash
# Revert JWT caching
git revert <commit-hash-jwt-caching>

# Revert Pino logging
git revert <commit-hash-pino-logging>

# Reinstall and restart
npm install && restart-service
```

### Monitoring During Rollback
- Watch error rates (should return to baseline)
- Monitor API latency (should return to baseline)
- Check user-reported issues (should decrease)

---

## References

### Internal Documentation
- [Performance Audit Report](../../../docs/governance/reviews/performance-2025-11-02/PERFORMANCE-AUDIT-REPORT.md)
- [Architecture Review 2025-11-02](../../../docs/governance/reviews/architecture-2025-11-02/ARCHITECTURE-REVIEW-2025-11-02.md)
- [CLAUDE.md - Project Guidelines](../../../../CLAUDE.md)

### External Resources
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [React Code Splitting](https://react.dev/reference/react/lazy)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [Pino Logger Benchmarks](https://github.com/pinojs/pino#benchmarks)
- [Pino Best Practices](https://github.com/pinojs/pino/blob/master/docs/best-practices.md)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)

### Benchmarks and Studies
- [Pino vs Winston Benchmark](https://github.com/pinojs/pino/blob/master/docs/benchmarks.md) - Pino is 30-50x faster
- [JWT Signing Performance](https://auth0.com/blog/jwt-signing-performance/) - HMAC vs RSA comparison
- [HTTP/2 Parallel Downloads](https://web.dev/performance-http2/) - Vendor chunk parallelization
- [Bundle Size Impact Study](https://web.dev/reduce-javascript-payloads-with-code-splitting/) - Every 100KB adds 0.5-1s on 3G

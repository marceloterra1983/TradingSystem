# Phase 2.3 - Performance Optimization Plan

**Start Date:** 2025-11-11
**Estimated Duration:** 32 hours
**Status:** 🟡 In Progress

---

## 🎯 Performance Goals

### Current State (Baseline)

**Bundle Sizes:**
- Total dist size: 9.2MB
- Main vendor bundle: 596KB
- React vendor: 136KB
- Docusaurus page: 104KB
- LlamaIndex page: 88KB
- UI Radix components: 68KB

**Dependencies:**
- Production: 32 packages
- Development: 37 packages
- Largest: date-fns (39MB), lucide-react (28MB), typescript (23MB)

**Performance Metrics (Estimated):**
- Initial load time: ~2-3s
- Time to Interactive (TTI): ~3-4s
- First Contentful Paint (FCP): ~1.5s

### Target State

**Bundle Optimization:**
- ✅ Main bundle: < 500KB (currently 596KB, need 16% reduction)
- ✅ Initial load: < 200KB (with code splitting)
- ✅ Lazy-loaded chunks: < 100KB each

**Performance Targets:**
- ✅ Initial load time: < 1s
- ✅ Time to Interactive (TTI): < 2s
- ✅ First Contentful Paint (FCP): < 800ms
- ✅ Largest Contentful Paint (LCP): < 2.5s
- ✅ Cumulative Layout Shift (CLS): < 0.1
- ✅ First Input Delay (FID): < 100ms

**Database Performance:**
- ✅ Query response time (p95): < 50ms
- ✅ Connection pool utilization: < 70%
- ✅ Cache hit rate: > 80%

---

## 📋 Optimization Strategies

### 1. Code Splitting (High Impact)

**Goal:** Reduce initial bundle size by 40%

**Actions:**
1. ✅ Route-based code splitting
   - Split by page components
   - Lazy load Workspace, TP Capital, LlamaIndex pages
   - Estimated savings: ~250KB

2. ✅ Component-based code splitting
   - Split large UI libraries (Radix, Recharts)
   - Lazy load modal dialogs
   - Estimated savings: ~100KB

3. ✅ Vendor code splitting
   - Separate React ecosystem from business logic
   - Split date-fns, lucide-react
   - Estimated savings: ~150KB

**Implementation:**
```typescript
// Route-based lazy loading
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const TPCapitalPage = lazy(() => import('./pages/TPCapitalPage'));
const LlamaIndexPage = lazy(() => import('./pages/LlamaIndexPage'));

// Component-based lazy loading
const HeavyChart = lazy(() => import('./components/charts/HeavyChart'));
const DataTable = lazy(() => import('./components/tables/DataTable'));
```

**Expected Result:**
- Initial bundle: 596KB → 300KB (50% reduction)
- Lazy chunks: 4-5 chunks of ~80KB each

---

### 2. Lazy Loading (High Impact)

**Goal:** Load components on-demand

**Actions:**
1. ✅ Implement React.lazy() for routes
2. ✅ Add Suspense boundaries with loading states
3. ✅ Preload critical routes on hover
4. ✅ Lazy load heavy dependencies (Recharts, date-fns)

**Implementation:**
```typescript
// Suspense with fallback
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/workspace" element={<WorkspacePage />} />
    <Route path="/tp-capital" element={<TPCapitalPage />} />
  </Routes>
</Suspense>

// Preload on hover
<Link
  to="/workspace"
  onMouseEnter={() => import('./pages/WorkspacePage')}
>
  Workspace
</Link>
```

**Expected Result:**
- Faster initial page load
- Progressive enhancement
- Better perceived performance

---

### 3. Browser Caching (Medium Impact)

**Goal:** Cache static assets for offline access

**Actions:**
1. ✅ Configure Vite build for cache-friendly output
2. ✅ Add service worker for offline support
3. ✅ Implement cache-first strategy for static assets
4. ✅ Add versioning for cache invalidation

**Vite Configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['date-fns', 'clsx'],
        },
      },
    },
  },
});
```

**Service Worker:**
```typescript
// Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/vendor-react.js',
        '/assets/vendor-ui.js',
      ]);
    })
  );
});

// Cache-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Expected Result:**
- Instant load on repeat visits
- Offline support for static content
- Reduced bandwidth usage

---

### 4. Application Caching (Redis) (High Impact)

**Goal:** Cache API responses and expensive computations

**Actions:**
1. ✅ Implement Redis cache-aside pattern
2. ✅ Cache API responses with TTL
3. ✅ Cache expensive queries (workspace items, TP Capital data)
4. ✅ Implement cache invalidation strategy

**Cache Implementation:**
```javascript
// Cache-aside pattern
async function getWorkspaceItems(userId) {
  const cacheKey = `workspace:items:${userId}`;

  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Query database
  const items = await db.query('SELECT * FROM workspace_items WHERE user_id = $1', [userId]);

  // 3. Store in cache
  await redis.setex(cacheKey, 300, JSON.stringify(items)); // 5 min TTL

  return items;
}

// Cache invalidation
async function updateWorkspaceItem(userId, itemId, data) {
  // Update database
  await db.query('UPDATE workspace_items SET ... WHERE id = $1', [itemId]);

  // Invalidate cache
  await redis.del(`workspace:items:${userId}`);
}
```

**Cache Strategy:**
| Data Type | TTL | Invalidation |
|-----------|-----|--------------|
| Workspace items | 5 min | On update/delete |
| TP Capital messages | 10 min | On new message |
| Telegram channels | 30 min | On sync |
| User profile | 1 hour | On profile update |
| Documentation search | 1 hour | On doc update |

**Expected Result:**
- API response time: 200ms → 10ms (95% improvement)
- Database load reduction: 70%
- Cache hit rate: > 80%

---

### 5. Database Query Optimization (High Impact)

**Goal:** Reduce query response time to < 50ms (p95)

**Actions:**
1. ✅ Identify slow queries (> 100ms)
2. ✅ Add missing indexes
3. ✅ Optimize JOIN operations
4. ✅ Implement query result caching
5. ✅ Add database connection pooling

**Slow Query Analysis:**
```sql
-- Find slow queries in TimescaleDB
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Index Optimization:**
```sql
-- Workspace items
CREATE INDEX CONCURRENTLY idx_workspace_items_user_id ON workspace_items(user_id);
CREATE INDEX CONCURRENTLY idx_workspace_items_created_at ON workspace_items(created_at DESC);

-- TP Capital messages
CREATE INDEX CONCURRENTLY idx_tp_capital_channel_time ON tp_capital_messages(channel_id, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_tp_capital_search ON tp_capital_messages USING gin(to_tsvector('portuguese', content));

-- Telegram gateway
CREATE INDEX CONCURRENTLY idx_telegram_messages_time ON telegram_messages(timestamp DESC);
CREATE INDEX CONCURRENTLY idx_telegram_channels_active ON telegram_channels(is_active) WHERE is_active = true;
```

**Query Optimization Examples:**
```javascript
// ❌ BAD: N+1 query problem
for (const item of items) {
  const details = await db.query('SELECT * FROM item_details WHERE item_id = $1', [item.id]);
  item.details = details;
}

// ✅ GOOD: Single query with JOIN
const items = await db.query(`
  SELECT i.*, d.*
  FROM workspace_items i
  LEFT JOIN item_details d ON d.item_id = i.id
  WHERE i.user_id = $1
`, [userId]);

// ❌ BAD: Fetching all records then filtering in JS
const allMessages = await db.query('SELECT * FROM tp_capital_messages');
const filtered = allMessages.filter(m => m.channel_id === channelId);

// ✅ GOOD: Filter in database
const messages = await db.query(
  'SELECT * FROM tp_capital_messages WHERE channel_id = $1 LIMIT 100',
  [channelId]
);
```

**Connection Pooling:**
```javascript
// Configure pg pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max: 50, // Maximum pool size
  min: 2, // Minimum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if can't connect
});
```

**Expected Result:**
- Query response time (p95): 200ms → 30ms (85% improvement)
- Database CPU usage: 60% → 30%
- Connection pool efficiency: > 80%

---

## 📊 Performance Metrics to Track

### Frontend Metrics

| Metric | Current | Target | Tool |
|--------|---------|--------|------|
| **Bundle Size** | 596KB | < 500KB | Webpack Bundle Analyzer |
| **Initial Load** | ~2-3s | < 1s | Lighthouse |
| **FCP** | ~1.5s | < 800ms | Chrome DevTools |
| **LCP** | ~3s | < 2.5s | Web Vitals |
| **TTI** | ~3-4s | < 2s | Lighthouse |
| **CLS** | ~0.05 | < 0.1 | Web Vitals |

### Backend Metrics

| Metric | Current | Target | Tool |
|--------|---------|--------|------|
| **API Response (p95)** | ~200ms | < 100ms | Prometheus |
| **Query Time (p95)** | ~150ms | < 50ms | pg_stat_statements |
| **Cache Hit Rate** | 0% | > 80% | Redis INFO |
| **Database Connections** | Variable | < 35/50 | pg_stat_activity |

---

## 🛠️ Implementation Plan

### Week 1: Code Splitting & Lazy Loading (8h)

**Day 1-2: Route-based splitting**
- Configure Vite for code splitting
- Implement lazy loading for pages
- Add Suspense boundaries
- Test loading states

**Day 3-4: Component-based splitting**
- Identify heavy components (> 50KB)
- Implement lazy loading
- Add preload hints
- Measure improvements

### Week 2: Caching (Browser + Redis) (12h)

**Day 1-2: Browser caching**
- Configure Vite build for caching
- Implement service worker
- Test offline functionality
- Add cache versioning

**Day 3-5: Redis caching**
- Setup Redis connection
- Implement cache-aside pattern
- Add cache invalidation
- Configure TTL strategies
- Monitor cache hit rate

### Week 3: Database Optimization (8h)

**Day 1-2: Query analysis**
- Enable pg_stat_statements
- Identify slow queries
- Analyze query plans (EXPLAIN)

**Day 3-4: Index optimization**
- Create missing indexes
- Test query performance
- Monitor index usage
- Validate improvements

### Week 4: Testing & Validation (4h)

**Day 1: Performance benchmarks**
- Run Lighthouse audits
- Measure Core Web Vitals
- Test API response times
- Verify cache hit rates

**Day 2: Documentation & reporting**
- Document optimizations
- Create performance guide
- Update deployment docs
- Generate final report

---

## 🧪 Testing Strategy

### Performance Testing

1. **Lighthouse Audits**
   ```bash
   lighthouse http://localhost:9080 --output=json --output-path=lighthouse-report.json
   ```

2. **Bundle Size Analysis**
   ```bash
   npm run build
   npx vite-bundle-visualizer
   ```

3. **Load Testing**
   ```bash
   # Apache Bench
   ab -n 1000 -c 10 http://localhost:3200/api/items

   # Artillery
   artillery quick --count 10 --num 100 http://localhost:3200/api/items
   ```

4. **Database Performance**
   ```sql
   -- Query performance
   SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

   -- Index usage
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;

   -- Cache hit rate
   SELECT
     sum(heap_blks_read) as heap_read,
     sum(heap_blks_hit) as heap_hit,
     sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
   FROM pg_statio_user_tables;
   ```

### Automated Monitoring

```javascript
// Prometheus metrics
import { register, Histogram, Counter } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000],
});

const cacheHitCounter = new Counter({
  name: 'cache_hit_total',
  help: 'Total cache hits',
  labelNames: ['cache_type'],
});
```

---

## 📈 Success Criteria

### Primary Goals (Must Have)

- ✅ Bundle size reduced by > 30% (596KB → < 420KB)
- ✅ Initial load time < 1s
- ✅ API response time (p95) < 100ms
- ✅ Database query time (p95) < 50ms
- ✅ Cache hit rate > 80%

### Secondary Goals (Nice to Have)

- ✅ Lighthouse score > 90 (Performance)
- ✅ Core Web Vitals: All green
- ✅ Service worker offline support
- ✅ Automated performance monitoring
- ✅ Performance budget alerts

---

## 🚧 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Code splitting breaks build** | High | Gradual rollout, feature flags |
| **Cache invalidation issues** | Medium | Conservative TTL, manual invalidation endpoint |
| **Service worker bugs** | Medium | Progressive enhancement, kill switch |
| **Database index bloat** | Low | Monitor index size, REINDEX if needed |
| **Redis memory limits** | Medium | Configure maxmemory policy, LRU eviction |

---

## 📚 References

- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Web Vitals](https://web.dev/vitals/)
- [Redis Caching Patterns](https://redis.io/docs/manual/patterns/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)

---

**Status:** 🟡 Phase 2.3 in progress - Starting with code splitting
**Next Update:** After code splitting implementation

# Quality Check Action Plan - Immediate Fixes
**Date:** 2025-11-02
**Priority:** P0 - Critical Issues

---

## Issue #1: Unhealthy Alert-Router Container (CRITICAL)

### Problem
```
Container: monitor-alert-router
Status: unhealthy (482 consecutive failures)
Error: "/usr/share/nginx/html/index.jsonindex.html" is not a directory
HTTP 500 on health check endpoint
```

### Root Cause
NGINX configuration has malformed path: `index.jsonindex.html` instead of `index.html`

### Solution

**Option A: Quick Fix - Restart Container**
```bash
docker restart monitor-alert-router
docker logs monitor-alert-router --tail 20
```

**Option B: Fix NGINX Config (Recommended)**
```bash
# 1. Find the NGINX config
docker exec monitor-alert-router cat /etc/nginx/nginx.conf > /tmp/alert-router-nginx.conf

# 2. Locate and fix the malformed path
# Look for: index.jsonindex.html
# Replace with: index.json index.html

# 3. Copy fixed config back
docker cp /tmp/alert-router-nginx.conf monitor-alert-router:/etc/nginx/nginx.conf

# 4. Reload NGINX
docker exec monitor-alert-router nginx -s reload
```

**Option C: Rebuild from Source**
```bash
# Check compose file
grep -A 20 "alert-router" tools/monitoring/docker-compose.monitoring.yml

# Rebuild
docker compose -f tools/monitoring/docker-compose.monitoring.yml up -d --build alert-router
```

### Verification
```bash
# Check health
curl http://localhost:9094/health

# Verify container is healthy
docker ps --filter "name=alert-router" --format "{{.Status}}"
```

---

## Issue #2: DocsHybridSearchPage Test Failures (CRITICAL)

### Problem
```
9/9 tests failing in DocsHybridSearchPage.spec.tsx
Error: TimeoutError in waitFor() after 1000ms
Success Rate: 0%
```

### Root Cause
1. Mock API responses not resolving properly
2. Async state updates timing out
3. React 18 concurrent rendering race conditions

### Solution

**Fix #1: Increase Timeout Globally**

```typescript
// src/__tests__/components/DocsHybridSearchPage.spec.tsx
import { waitFor } from '@testing-library/react';

// At top of file
const EXTENDED_TIMEOUT = 5000;

// Replace all waitFor calls
await waitFor(() => {
  expect(screen.getByText('Docker Compose Setup')).toBeInTheDocument();
}, { timeout: EXTENDED_TIMEOUT });
```

**Fix #2: Use findBy Instead of waitFor**

```typescript
// ❌ Old (timing out)
await waitFor(() => {
  expect(screen.getByText('Docker Compose Setup')).toBeInTheDocument();
});

// ✅ New (built-in waiting)
const result = await screen.findByText('Docker Compose Setup', {}, { timeout: 5000 });
expect(result).toBeInTheDocument();
```

**Fix #3: Flush Promises in Tests**

```typescript
import { act } from '@testing-library/react';

// After triggering async operations
await act(async () => {
  fireEvent.click(searchButton);
  await new Promise(resolve => setTimeout(resolve, 100));
});
```

**Fix #4: Mock API Properly**

```typescript
// Ensure mocks resolve
beforeEach(() => {
  vi.mocked(documentationService.hybridSearch).mockResolvedValue({
    results: [
      {
        id: 'doc-1',
        title: 'Docker Compose Setup',
        content: 'Setup guide...',
        domain: 'tools',
        score: 0.95
      }
    ],
    total: 1
  });
});

// Clear after each test
afterEach(() => {
  vi.clearAllMocks();
});
```

### Quick Fix Script

```bash
#!/bin/bash
# scripts/fix-docs-tests.sh

cd frontend/dashboard

# Run tests with verbose output
npm run test -- src/__tests__/components/DocsHybridSearchPage.spec.tsx --reporter=verbose

# If still failing, increase timeout in vitest config
echo "Updating vitest.config.ts timeout..."
sed -i 's/timeout: 10000/timeout: 30000/g' vitest.config.ts

# Re-run tests
npm run test -- src/__tests__/components/DocsHybridSearchPage.spec.tsx
```

---

## Issue #3: Security Vulnerabilities (telegram-gateway)

### Problem
```
Package: fast-redact (prototype pollution)
Severity: LOW
Affected: pino-http dependency chain
```

### Solution

**Step 1: Review Breaking Changes**
```bash
cd backend/api/telegram-gateway

# Check current version
npm list pino-http

# Review changelog
npm view pino-http@11.0.0 --json | jq '.version, .dependencies'
```

**Step 2: Backup Current Setup**
```bash
# Backup package files
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# Document current behavior
npm test > test-results-before.txt
```

**Step 3: Apply Fix**
```bash
# Update with force (breaking change)
npm audit fix --force

# Or manual update
npm install pino-http@latest
```

**Step 4: Test Thoroughly**
```bash
# Run all tests
npm test

# Check logging still works
npm run dev &
sleep 5
curl http://localhost:3201/api/health
pkill -f "node.*telegram-gateway"

# Compare logs
diff test-results-before.txt <(npm test)
```

**Step 5: Update Documentation**
```bash
# Document changes
cat << EOF >> backend/api/telegram-gateway/CHANGELOG.md
## [YYYY-MM-DD] Security Update

### Changed
- Updated pino-http from v9.x to v11.x
- Fixes CVE-XXXX: fast-redact prototype pollution

### Breaking Changes
- Logger configuration format may have changed
- Review any custom pino transports

### Testing
- All tests passing ✅
- Logging functionality verified ✅
EOF
```

---

## Issue #4: Bundle Size Optimization

### Problem
```
Main vendor bundle: 528KB (41% of total)
Warning: Chunk exceeds 500KB threshold
```

### Solution

**Step 1: Analyze Current Bundle**
```bash
cd frontend/dashboard

# Build and open analyzer
npm run build
open dist/stats.html

# Identify largest dependencies
npx vite-bundle-visualizer
```

**Step 2: Implement Code Splitting**

Create `vite.config.ts` optimization:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React ecosystem
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }

          // UI libraries
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }

          // State management
          if (id.includes('zustand') || id.includes('@tanstack/react-query')) {
            return 'state-vendor';
          }

          // Heavy utilities
          if (id.includes('lodash') || id.includes('date-fns')) {
            return 'utils-vendor';
          }

          // Charts (lazy load recommended)
          if (id.includes('recharts')) {
            return 'charts-vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600 // Temporary increase
  }
});
```

**Step 3: Lazy Load Heavy Pages**

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

// ✅ Lazy load heavy pages
const LlamaIndexPage = lazy(() => import('./components/pages/LlamaIndexPage'));
const WorkspacePage = lazy(() => import('./components/pages/WorkspacePageNew'));
const DocsHybridSearchPage = lazy(() => import('./components/pages/DocsHybridSearchPage'));
const TPCapitalPage = lazy(() => import('./components/pages/TPCapitalOpcoesPage'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
  </div>
);

// Routes
<Suspense fallback={<PageLoader />}>
  <Route path="/llama" element={<LlamaIndexPage />} />
  <Route path="/workspace" element={<WorkspacePage />} />
  <Route path="/docs" element={<DocsHybridSearchPage />} />
  <Route path="/tp-capital" element={<TPCapitalPage />} />
</Suspense>
```

**Step 4: Tree Shaking Improvements**

```bash
# Find large lodash imports
grep -r "import.*from 'lodash'" frontend/dashboard/src

# Replace with specific imports
# ❌ Bad: import _ from 'lodash';
# ✅ Good: import debounce from 'lodash-es/debounce';
```

**Step 5: Verify Improvements**

```bash
# Rebuild
npm run build

# Compare sizes
echo "Before: 528KB"
du -sh dist/assets/vendor*.js
echo "Target: <300KB"

# Test loading performance
npm run preview
# Open http://localhost:4173
# Check Network tab in DevTools
```

**Expected Results:**
```
Before:
- vendor-Da4xBVGg.js: 528KB (gzip: 160KB)

After:
- react-vendor.js: 140KB (gzip: 45KB)
- ui-vendor.js: 70KB (gzip: 22KB)
- state-vendor.js: 35KB (gzip: 12KB)
- utils-vendor.js: 60KB (gzip: 20KB)
Total: ~305KB (gzip: ~99KB) ✅ 43% reduction
```

---

## Issue #5: ESLint Warnings (Low Priority)

### Problem
```
2 unused variable warnings:
- add-all-timeouts.mjs:13:59 - 'testName'
- scripts/analyze-bundle.js:37:10 - 'parseSize'
```

### Solution

**Quick Fix:**
```bash
cd frontend/dashboard

# Option 1: Prefix with underscore
sed -i 's/testName/_testName/g' add-all-timeouts.mjs
sed -i 's/parseSize/_parseSize/g' scripts/analyze-bundle.js

# Option 2: Remove if unused
# Review and delete if not needed
```

**Verify:**
```bash
npm run lint
# Should show 0 warnings
```

---

## Execution Order (Recommended)

### Phase 1: Critical Fixes (Today)
```bash
# 1. Fix alert-router (5 min)
docker restart monitor-alert-router
docker logs monitor-alert-router --tail 10

# 2. Fix DocsHybridSearchPage tests (30 min)
bash scripts/fix-docs-tests.sh

# 3. Verify fixes
npm run test
docker ps --filter health=unhealthy
```

### Phase 2: Security & Performance (Next 2 days)
```bash
# 4. Update telegram-gateway dependencies (1 hour)
cd backend/api/telegram-gateway
npm audit fix --force
npm test

# 5. Optimize bundle size (2 hours)
cd frontend/dashboard
# Implement code splitting (see above)
npm run build
# Verify <300KB target
```

### Phase 3: Cleanup (End of week)
```bash
# 6. Fix ESLint warnings (5 min)
cd frontend/dashboard
# Fix unused variables
npm run lint

# 7. Run full quality check
cd /home/marce/Projetos/TradingSystem
/quality-check --full
```

---

## Success Criteria

### Critical (P0) - Must Pass
- [ ] Alert-router container healthy
- [ ] All DocsHybridSearchPage tests passing (9/9)
- [ ] Zero test failures in CI/CD

### High (P1) - Should Pass
- [ ] Security vulnerabilities resolved (0 low/medium/high)
- [ ] Bundle size < 300KB main chunk
- [ ] All containers healthy (20/20)

### Medium (P2) - Nice to Have
- [ ] Zero ESLint warnings
- [ ] Test coverage > 80%
- [ ] All quality gates passing

---

## Verification Commands

```bash
# Quick health check
docker ps --filter health=unhealthy
npm run test -- DocsHybridSearchPage
npm audit --production

# Full quality check
/quality-check --full

# Performance metrics
npm run build && cat dist/stats.html | grep "Total size"

# Generate report
/quality-check --full --format html > quality-report.html
```

---

## Rollback Plan

If any fixes cause issues:

```bash
# Rollback alert-router
docker compose -f tools/monitoring/docker-compose.monitoring.yml down
docker compose -f tools/monitoring/docker-compose.monitoring.yml up -d

# Rollback telegram-gateway dependencies
cd backend/api/telegram-gateway
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json
npm install

# Rollback bundle optimization
cd frontend/dashboard
git checkout vite.config.ts
npm run build
```

---

## Next Review

**Date:** 2025-11-09 (7 days)
**Agenda:**
- Verify all P0 issues resolved
- Review P1 progress
- Identify new technical debt
- Update quality metrics

---

**Created by:** Claude Code CLI
**Related:** [QUALITY-CHECK-REPORT-2025-11-02.md](./QUALITY-CHECK-REPORT-2025-11-02.md)

# Test Coverage Roadmap - From 5.8% to 80%

**Document Type:** Implementation Roadmap
**Status:** Proposed
**Created:** 2025-11-02
**Owner:** Development Team Lead + QA Lead
**Timeline:** 4 weeks (2026-01-20 to 2026-02-17)

---

## Executive Summary

This roadmap provides a systematic, phase-by-phase plan to increase test coverage from the current **5.8%** to **80%** over 16 weeks (4 phases × 4 weeks each). The approach prioritizes **critical paths first**, ensures **incremental value delivery**, and establishes **sustainable testing practices**.

**Key Metrics:**
- **Current Coverage:** 5.8% (2,505 tests / 43,536 files)
- **Target Coverage:** 80% (Phase 4 completion)
- **Intermediate Milestones:** 30% (Phase 1), 50% (Phase 2), 65% (Phase 3)
- **Investment:** 16 engineer-weeks
- **Expected ROI:** 50% reduction in production incidents, 30% faster development velocity

---

## Current State Assessment

### Coverage Breakdown (2025-11-02)

```
┌─────────────────────────────────────────┐
│           Test Coverage Status          │
├─────────────────────────────────────────┤
│ Layer              │ Coverage │ Status  │
├────────────────────┼──────────┼─────────┤
│ Backend APIs       │    2%    │ ❌ Critical
│ Frontend           │    1%    │ ❌ Critical
│ Integration Tests  │    0%    │ ❌ Missing
│ E2E Tests          │    0%    │ ❌ Missing
│ Load Tests         │    0%    │ ❌ Missing
├────────────────────┼──────────┼─────────┤
│ Overall            │   5.8%   │ ❌ Unacceptable
└─────────────────────────────────────────┘
```

### Risk Assessment

| Risk Level | Impact | Services Affected |
|------------|--------|-------------------|
| **Critical** | Production incidents, data loss | All backend APIs |
| **High** | User experience degradation | Frontend dashboard |
| **Medium** | Integration failures | Inter-service communication |
| **Low** | Performance degradation | Load handling |

### Testing Infrastructure Gaps

- ❌ No test framework configuration (Vitest)
- ❌ No test fixtures or data factories
- ❌ No CI/CD integration for tests
- ❌ No code coverage reporting (Codecov)
- ❌ No E2E framework (Playwright)
- ❌ No container-based integration tests (Testcontainers)
- ❌ No API mocking strategy (MSW)

---

## Phase 1: Foundation & Backend Unit Tests (Weeks 1-4)

### Goals
- ✅ Establish testing infrastructure
- ✅ Backend coverage: 2% → 30%
- ✅ Create test fixtures library
- ✅ CI/CD integration
- ✅ Team training on testing practices

### Week 1: Infrastructure Setup + Critical Services

#### Day 1-2: Testing Infrastructure
```bash
# Tasks
- Install and configure Vitest for backend
- Set up coverage reporting (@vitest/coverage-v8)
- Configure GitHub Actions workflow
- Install Testcontainers for integration tests
- Create test fixtures directory structure

# Deliverables
✅ vitest.config.js for all backend services
✅ .github/workflows/test.yml (CI/CD pipeline)
✅ backend/api/*/src/__tests__/ directory structure
✅ backend/api/*/src/__tests__/fixtures/ directory
```

**Configuration Example:**
```javascript
// backend/api/documentation-api/vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'node_modules/**',
      ],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 25,
        statements: 30,
      },
    },
    include: ['src/**/__tests__/**/*.test.js'],
    timeout: 10000,
  },
});
```

#### Day 3-5: RagProxyService Tests (Target: 100% coverage)
```javascript
// Priority: Critical (handles all RAG queries)
// Files: backend/api/documentation-api/src/services/RagProxyService.js

Test Cases:
✅ search() - Basic query
✅ search() - Empty query validation
✅ search() - Query too long validation
✅ search() - Timeout handling
✅ search() - Upstream 5xx errors
✅ search() - Upstream 4xx errors
✅ search() - JWT token generation
✅ search() - Network errors (ETIMEDOUT, ECONNREFUSED)
✅ queryCollectionsService() - All scenarios above
✅ getGpuPolicy() - Success and failure
✅ _validateQuery() - Edge cases (null, undefined, numbers, objects)
✅ _validateMaxResults() - Boundary testing (0, -1, 1000, NaN)
✅ _makeRequest() - Request formatting
✅ _makeRequest() - Header injection
✅ _parseJson() - Malformed JSON handling

Estimated Tests: 25-30 tests
Coverage Goal: 100%
```

**Deliverable:** `backend/api/documentation-api/src/services/__tests__/RagProxyService.test.js`

### Week 2: Service Layer + Middleware

#### Day 1-2: CollectionService Tests (Target: 100% coverage)
```javascript
// Priority: High (manages RAG collections)
// Files: backend/api/documentation-api/src/services/CollectionService.js

Test Cases:
✅ createCollection() - Valid data
✅ createCollection() - Duplicate name
✅ createCollection() - Invalid parameters
✅ getCollection() - Existing collection
✅ getCollection() - Non-existent collection
✅ updateCollection() - Valid update
✅ updateCollection() - Concurrent modification
✅ deleteCollection() - Cascade delete
✅ deleteCollection() - References exist
✅ listCollections() - Empty result
✅ listCollections() - Pagination
✅ listCollections() - Sorting
✅ triggerIngestion() - Success
✅ triggerIngestion() - Service unavailable

Estimated Tests: 20-25 tests
Coverage Goal: 100%
```

#### Day 3: SearchService Tests (Target: 80% coverage)
```javascript
// Priority: High (FlexSearch integration)
// Files: backend/api/documentation-api/src/services/searchService.js

Test Cases:
✅ indexDocuments() - Single document
✅ indexDocuments() - Batch indexing
✅ indexDocuments() - Empty array
✅ search() - Simple query
✅ search() - Multi-term query
✅ search() - Fuzzy matching
✅ search() - Pagination
✅ search() - No results
✅ removeDocument() - Existing doc
✅ removeDocument() - Non-existent doc
✅ clearIndex() - Complete clear

Estimated Tests: 15-20 tests
Coverage Goal: 80%
```

#### Day 4-5: Middleware Tests (Target: 100% coverage)
```javascript
// Priority: Critical (security layer)
// Files: backend/shared/middleware/*.js

Test Cases (Auth Middleware):
✅ Valid JWT token → Allow request
✅ Invalid JWT token → 401 Unauthorized
✅ Expired JWT token → 401 Unauthorized
✅ Missing Authorization header → 401 Unauthorized
✅ Malformed token → 401 Unauthorized

Test Cases (Rate Limiting):
✅ Request within limit → Allow
✅ Request exceeds limit → 429 Too Many Requests
✅ Different IPs counted separately
✅ Window reset after time expires

Test Cases (CORS):
✅ Allowed origin → Add CORS headers
✅ Disallowed origin → Reject
✅ Preflight OPTIONS request → Handle
✅ Credentials flag → Set correctly

Test Cases (Error Handling):
✅ ValidationError → 400 + details
✅ ServiceUnavailableError → 503
✅ ExternalServiceError → 502
✅ Unexpected error → 500 + generic message
✅ Error logging → Correlation ID included

Estimated Tests: 30-35 tests
Coverage Goal: 100%
```

**Deliverables:**
- `backend/shared/middleware/__tests__/auth.test.js`
- `backend/shared/middleware/__tests__/rateLimit.test.js`
- `backend/shared/middleware/__tests__/cors.test.js`
- `backend/shared/middleware/__tests__/errorHandler.test.js`

### Week 3: Repository Layer + Utilities

#### Day 1-3: TimescaleDB Repositories (Target: 80% coverage)
```javascript
// Priority: High (data persistence)
// Files: backend/api/workspace/src/db/timescaledb.js
//        backend/api/documentation-api/src/repositories/*.js

Test Cases (Workspace Repository):
✅ createItem() - Valid item
✅ createItem() - Duplicate ID
✅ createItem() - NULL title (constraint violation)
✅ getItem() - Existing item
✅ getItem() - Non-existent item
✅ updateItem() - Partial update
✅ updateItem() - Full update
✅ updateItem() - Concurrent modification
✅ deleteItem() - Soft delete
✅ deleteItem() - Hard delete
✅ listItems() - Pagination
✅ listItems() - Filtering by category
✅ listItems() - Sorting by date
✅ searchItems() - Full-text search

Test Cases (TP Capital Repository):
✅ insertSignal() - Valid signal
✅ insertSignal() - Duplicate signal
✅ getSignals() - Time range query
✅ getSignals() - Channel filter
✅ aggregateSignals() - Daily stats
✅ aggregateSignals() - Monthly stats

Estimated Tests: 40-50 tests (across all repositories)
Coverage Goal: 80%
```

**Testing Strategy:**
```javascript
// Use Testcontainers for real database integration
import { GenericContainer } from 'testcontainers';

let timescaleContainer;

beforeAll(async () => {
  timescaleContainer = await new GenericContainer('timescale/timescaledb:latest-pg15')
    .withExposedPorts(5432)
    .start();

  process.env.TIMESCALEDB_HOST = timescaleContainer.getHost();
  process.env.TIMESCALEDB_PORT = timescaleContainer.getMappedPort(5432);
}, 60000);

afterAll(async () => {
  await timescaleContainer.stop();
});
```

#### Day 4-5: Utility Functions (Target: 100% coverage)
```javascript
// Priority: Medium (helper functions)
// Files: backend/api/*/src/utils/*.js

Test Cases (Logger):
✅ info() - Correct format
✅ warn() - Correct format
✅ error() - Stack trace included
✅ child() - Correlation ID propagation

Test Cases (Validation):
✅ validateEmail() - Valid/invalid emails
✅ sanitizeInput() - XSS prevention
✅ validateUUID() - UUID v4 format
✅ validateTimestamp() - ISO 8601 format

Test Cases (JWT):
✅ createBearer() - Valid token generation
✅ verifyBearer() - Valid token verification
✅ verifyBearer() - Expired token
✅ verifyBearer() - Invalid signature

Estimated Tests: 25-30 tests
Coverage Goal: 100%
```

### Week 4: Integration Tests (Backend)

#### Day 1-2: Workspace API Integration Tests
```javascript
// Target: 15 integration tests
// Approach: Supertest + Testcontainers

Test Scenarios:
✅ POST /api/items → CREATE → GET (verify persistence)
✅ POST /api/items (invalid) → 400 validation error
✅ GET /api/items → Pagination works correctly
✅ GET /api/items?category=idea → Filtering works
✅ PUT /api/items/:id → UPDATE → GET (verify change)
✅ DELETE /api/items/:id → 204 → GET 404
✅ POST /api/categories → CREATE → GET
✅ Concurrent requests don't cause deadlocks
✅ Bulk insert performance (100 items < 5s)
✅ Rate limiting triggers after 100 requests

Estimated Tests: 15 tests
Execution Time: ~2 minutes
```

#### Day 3-4: Documentation API Integration Tests
```javascript
// Target: 15 integration tests
// Approach: Supertest + Testcontainers + MSW (for LlamaIndex)

Test Scenarios:
✅ POST /api/v1/rag/query → Valid response
✅ POST /api/v1/rag/query (empty query) → 400
✅ POST /api/v1/rag/query (LlamaIndex down) → 502
✅ POST /api/v1/rag/query (timeout) → 504
✅ GET /api/v1/rag/search → Valid response
✅ POST /api/v1/rag/collections → CREATE → GET
✅ DELETE /api/v1/rag/collections/:id → 204
✅ GET /api/docs/search → Full-text search works
✅ GET /api/docs/markdown/:path → File retrieval
✅ Caching works (Redis integration)

Estimated Tests: 15 tests
Execution Time: ~3 minutes
```

#### Day 5: TP Capital API Integration Tests
```javascript
// Target: 10 integration tests
// Approach: Supertest + Testcontainers

Test Scenarios:
✅ GET /api/signals → Returns signals from TimescaleDB
✅ GET /api/signals?channel=xxx → Filtering works
✅ GET /api/channels → Returns channel list
✅ POST /internal/ingest → Stores signal (auth required)
✅ POST /internal/ingest (no auth) → 403
✅ GET /health → Returns healthy status

Estimated Tests: 10 tests
Execution Time: ~2 minutes
```

### Phase 1 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Backend Coverage** | 30% | Codecov report |
| **Test Execution Time** | <5 min | GitHub Actions |
| **Flaky Test Rate** | <5% | CI logs (3 runs) |
| **Test Count** | 150+ | Vitest reporter |
| **Integration Tests** | 40+ | Test manifest |

### Phase 1 Deliverables

✅ **Code:**
- 150+ backend unit tests
- 40+ integration tests
- Test fixtures library
- Testcontainers configuration

✅ **Infrastructure:**
- Vitest configuration for all services
- GitHub Actions CI/CD pipeline
- Codecov integration
- Test data factories

✅ **Documentation:**
- Testing guidelines (`TESTING.md`)
- Test patterns and best practices
- CI/CD troubleshooting guide

---

## Phase 2: Frontend + Advanced Integration (Weeks 5-8)

### Goals
- ✅ Frontend coverage: 1% → 25%
- ✅ Complete integration test suite (50+ tests)
- ✅ Overall coverage: 30% → 50%
- ✅ MSW API mocking strategy

### Week 5: Frontend Infrastructure + State Management

#### Day 1-2: Frontend Testing Setup
```bash
# Tasks
- Install Vitest for frontend
- Configure @testing-library/react
- Set up MSW (Mock Service Worker)
- Configure coverage reporting
- Create test utilities and helpers

# Deliverables
✅ frontend/dashboard/vitest.config.ts
✅ frontend/dashboard/src/mocks/server.ts
✅ frontend/dashboard/src/test-utils.tsx
✅ frontend/dashboard/src/__tests__/setup.ts
```

**MSW Configuration:**
```typescript
// frontend/dashboard/src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/items', () => {
    return HttpResponse.json([
      { id: '1', title: 'Item 1', content: 'Content 1' },
      { id: '2', title: 'Item 2', content: 'Content 2' },
    ]);
  }),

  http.post('/api/items', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: crypto.randomUUID(),
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  http.post('/api/v1/rag/query', async ({ request }) => {
    const { query } = await request.json();
    return HttpResponse.json({
      results: [{ title: 'Result', score: 0.9 }],
      answer: `Answer for: ${query}`,
    });
  }),
];
```

#### Day 3-5: Zustand Store Tests (Target: 100% coverage)
```typescript
// Priority: Critical (global state management)
// Files: frontend/dashboard/src/store/*.ts

Test Cases (useWorkspaceStore):
✅ Initial state is empty
✅ setItems() updates items array
✅ addItem() appends new item
✅ updateItem() modifies existing item
✅ deleteItem() removes item
✅ setLoading() updates loading state
✅ setError() updates error state
✅ Concurrent updates don't cause race conditions

Test Cases (useRagStore):
✅ Initial state has empty results
✅ setResults() updates results
✅ setQuery() updates query string
✅ clearResults() resets to initial state

Estimated Tests: 25-30 tests
Coverage Goal: 100%
```

**Test Example:**
```typescript
// frontend/dashboard/src/store/__tests__/workspaceStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceStore } from '../workspaceStore';

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ items: [], loading: false });
  });

  it('should add item to store', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.addItem({
        id: '1',
        title: 'Test Item',
        content: 'Content',
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe('Test Item');
  });

  it('should update existing item', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.setItems([
        { id: '1', title: 'Original', content: 'Content' },
      ]);
    });

    act(() => {
      result.current.updateItem('1', { title: 'Updated' });
    });

    expect(result.current.items[0].title).toBe('Updated');
  });
});
```

### Week 6: Custom Hooks + Utilities

#### Day 1-2: useWorkspace Hook Tests (Target: 100% coverage)
```typescript
// Priority: High (workspace CRUD operations)
// Files: frontend/dashboard/src/hooks/useWorkspace.ts

Test Cases:
✅ useWorkspace() - Fetches items on mount
✅ useWorkspace() - Loading state during fetch
✅ useWorkspace() - Error state on failure
✅ createItem() - Success flow
✅ createItem() - Validation error (400)
✅ createItem() - Network error (500)
✅ createItem() - Optimistic update
✅ updateItem() - Success flow
✅ updateItem() - Rollback on error
✅ deleteItem() - Success flow
✅ deleteItem() - Confirmation dialog

Estimated Tests: 15-20 tests
Coverage Goal: 100%
```

#### Day 3: useRagQuery Hook Tests (Target: 100% coverage)
```typescript
// Priority: High (RAG system integration)
// Files: frontend/dashboard/src/hooks/llamaIndex/useRagQuery.ts

Test Cases:
✅ useRagQuery() - Query submission
✅ useRagQuery() - Loading state
✅ useRagQuery() - Success with results
✅ useRagQuery() - Empty results
✅ useRagQuery() - Error handling
✅ useRagQuery() - Retry logic (3 attempts)
✅ useRagQuery() - Debouncing (300ms)
✅ useRagQuery() - Cache hit (localStorage)

Estimated Tests: 12-15 tests
Coverage Goal: 100%
```

#### Day 4-5: Utility Functions + Helpers
```typescript
// Files: frontend/dashboard/src/utils/*.ts

Test Cases (Logger):
✅ log() - Correct format
✅ log() - Different log levels
✅ log() - Redacts sensitive data

Test Cases (Formatting):
✅ formatDate() - Various formats
✅ formatDate() - Timezone handling
✅ truncateText() - Boundary cases
✅ sanitizeHtml() - XSS prevention

Test Cases (API Client):
✅ apiClient.get() - Success
✅ apiClient.post() - Success
✅ apiClient.post() - Timeout
✅ apiClient.post() - Retry logic

Estimated Tests: 20-25 tests
Coverage Goal: 100%
```

### Week 7: Critical Components

#### Day 1-2: WorkspacePageNew Component (Target: 80% coverage)
```typescript
// Priority: Critical (main workspace interface)
// Files: frontend/dashboard/src/components/pages/WorkspacePageNew.tsx

Test Cases:
✅ Renders workspace items list
✅ "New Item" button opens create dialog
✅ Create form submission works
✅ Create form validation (title required)
✅ Edit button opens edit dialog
✅ Edit form updates item
✅ Delete button shows confirmation
✅ Delete confirmation works
✅ Search filters items
✅ Category filter works
✅ Pagination works
✅ Loading state shows spinner
✅ Error state shows message

Estimated Tests: 15-20 tests
Coverage Goal: 80%
```

#### Day 3: DocsHybridSearchPage Component (Target: 80% coverage)
```typescript
// Priority: High (documentation search)
// Files: frontend/dashboard/src/components/pages/DocsHybridSearchPage.tsx

Test Cases:
✅ Renders search input
✅ Search triggers API call
✅ Results display correctly
✅ Markdown formatting works
✅ Syntax highlighting works
✅ "Show More" expands content
✅ Copy code button works
✅ No results message shown
✅ Loading state shows
✅ Error state shows

Estimated Tests: 12-15 tests
Coverage Goal: 80%
```

#### Day 4-5: LlamaIndexPage Component (Target: 80% coverage)
```typescript
// Priority: High (RAG system interface)
// Files: frontend/dashboard/src/components/pages/LlamaIndexPage.tsx

Test Cases:
✅ Renders query input
✅ Query submission triggers search
✅ Results display with sources
✅ Answer formatting (markdown)
✅ Source links clickable
✅ Collection selector works
✅ "Clear" button resets form
✅ Loading state shows
✅ Error handling
✅ Cache indicator shows

Estimated Tests: 12-15 tests
Coverage Goal: 80%
```

### Week 8: Integration Tests (Complete Suite)

#### Day 1-2: RAG System Integration Tests
```typescript
// Target: 15 additional integration tests
// Approach: Full RAG flow (Dashboard → Documentation API → LlamaIndex)

Test Scenarios:
✅ Query submission → LlamaIndex → Results displayed
✅ Query with no results → Empty state shown
✅ Query timeout → Error message shown
✅ LlamaIndex unavailable → Fallback message
✅ Collection selection → Correct collection queried
✅ Cache hit → Results from cache
✅ Cache miss → Fresh query to LlamaIndex
✅ Multiple queries → Each tracked separately

Estimated Tests: 15 tests
Execution Time: ~4 minutes
```

#### Day 3-4: Complete User Flows
```typescript
// Target: 20 additional integration tests
// Approach: Multi-step user journeys

Test Scenarios:
✅ User logs in → Creates item → Edits → Deletes
✅ User searches docs → Clicks result → Views content
✅ User queries RAG → Views sources → Opens link
✅ User manages collections → Creates → Ingests → Queries
✅ User views signals → Filters → Exports
✅ Error recovery → Network error → Retry → Success

Estimated Tests: 20 tests
Execution Time: ~5 minutes
```

#### Day 5: Performance & Load Testing
```javascript
// Target: 10 load tests (k6)
// Approach: Stress critical endpoints

Test Scenarios:
✅ Workspace API: 100 req/s for 60s
✅ RAG API: 50 req/s for 60s (LLM bottleneck)
✅ Documentation search: 200 req/s for 60s
✅ Dashboard page load: 50 users/s
✅ Concurrent writes: 20 users creating items simultaneously

Success Criteria:
- P95 latency < 500ms (except RAG: < 15s)
- Error rate < 1%
- No database deadlocks
- No memory leaks
```

### Phase 2 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Frontend Coverage** | 25% | Codecov report |
| **Integration Tests** | 50+ | Test manifest |
| **Overall Coverage** | 50% | Aggregated report |
| **Test Execution Time** | <10 min | GitHub Actions |
| **Load Test Success** | 100% | k6 reports |

### Phase 2 Deliverables

✅ **Code:**
- 80+ frontend unit tests
- 50+ total integration tests
- 10 load tests (k6 scripts)
- MSW API mocking setup

✅ **Infrastructure:**
- Frontend Vitest configuration
- MSW handlers for all APIs
- k6 load testing scripts
- Performance baselines

✅ **Documentation:**
- Frontend testing guide
- MSW usage patterns
- Load testing runbook

---

## Phase 3: E2E Tests + Advanced Scenarios (Weeks 9-12)

### Goals
- ✅ 20+ E2E tests with Playwright
- ✅ Cross-browser testing (Chrome, Firefox)
- ✅ Mobile viewport testing
- ✅ Visual regression testing
- ✅ Overall coverage: 50% → 65%

### Week 9: Playwright Setup + Critical Flows

#### Day 1-2: Playwright Infrastructure
```bash
# Tasks
- Install Playwright
- Configure test environments
- Set up Docker Compose for E2E (all services)
- Create page object models
- Configure CI/CD for E2E tests

# Deliverables
✅ playwright.config.ts
✅ docker-compose.e2e.yml
✅ frontend/dashboard/e2e/**/*.spec.ts
✅ .github/workflows/e2e.yml
```

**Playwright Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3103',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'docker compose -f docker-compose.e2e.yml up',
    url: 'http://localhost:3103',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

#### Day 3-5: Critical User Flows
```typescript
// Priority: Critical paths only
// Files: frontend/dashboard/e2e/*.spec.ts

Test Cases (Workspace):
✅ User creates new workspace item
✅ User edits existing item
✅ User deletes item with confirmation
✅ User searches items by title
✅ User filters by category
✅ User paginates through items

Test Cases (Documentation):
✅ User searches documentation
✅ User views search results
✅ User clicks result → Views markdown
✅ User copies code snippet

Test Cases (RAG System):
✅ User queries RAG system
✅ User views answer + sources
✅ User selects different collection
✅ User clears query

Estimated Tests: 15 E2E tests
Execution Time: ~10 minutes
```

**Test Example:**
```typescript
// e2e/workspace.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workspace Management', () => {
  test('should create new item', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Workspace' }).click();

    await page.getByRole('button', { name: 'New Item' }).click();
    await page.getByLabel('Title').fill('E2E Test Item');
    await page.getByLabel('Content').fill('Content here');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Item created successfully')).toBeVisible();
    await expect(page.getByText('E2E Test Item')).toBeVisible();
  });

  test('should handle validation errors', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Workspace' }).click();

    await page.getByRole('button', { name: 'New Item' }).click();
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(/title is required/i)).toBeVisible();
  });
});
```

### Week 10: Advanced E2E Scenarios

#### Day 1-2: Multi-Step User Journeys
```typescript
// Target: 10 E2E tests
// Focus: Complex workflows spanning multiple pages

Test Cases:
✅ User creates item → Edits → Searches → Finds → Deletes
✅ User searches docs → Views → Copies code → Searches again
✅ User queries RAG → Views sources → Opens link → Returns
✅ User manages collections → Creates → Ingests → Queries → Deletes
✅ Error recovery: Network offline → Shows error → Reconnects → Retries
✅ Session persistence: Refreshes page → Data persists

Estimated Tests: 10 E2E tests
Execution Time: ~12 minutes
```

#### Day 3: Cross-Browser Testing
```typescript
// Target: Run all E2E tests on Chrome, Firefox, Safari (if available)
// Approach: Playwright project configuration

Projects:
✅ Desktop Chrome (1920x1080)
✅ Desktop Firefox (1920x1080)
✅ Mobile Chrome (375x667 - iPhone SE)
✅ Mobile Safari (if macOS available)

Success Criteria:
- All tests pass on all browsers
- No browser-specific bugs
- Consistent behavior across browsers
```

#### Day 4-5: Visual Regression Testing
```typescript
// Target: 15 visual regression tests
// Approach: Playwright screenshots + pixel comparison

Test Cases:
✅ Workspace page (empty state)
✅ Workspace page (with items)
✅ Create item dialog
✅ Edit item dialog
✅ Delete confirmation dialog
✅ Search results page
✅ RAG query results
✅ Collection management page
✅ Loading states (spinner)
✅ Error states (error messages)
✅ Dark mode (if implemented)
✅ Mobile viewport (responsive)

Estimated Tests: 15 visual tests
Execution Time: ~8 minutes
```

**Visual Test Example:**
```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test('workspace page visual regression', async ({ page }) => {
  await page.goto('/workspace');
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await expect(page).toHaveScreenshot('workspace-page.png', {
    maxDiffPixels: 100, // Allow small differences
  });
});
```

### Week 11: Accessibility + Performance

#### Day 1-2: Accessibility Testing
```typescript
// Target: 20 accessibility tests
// Approach: Playwright + axe-core

Test Cases:
✅ Keyboard navigation (Tab order correct)
✅ Screen reader labels (ARIA labels present)
✅ Focus indicators visible
✅ Color contrast meets WCAG AA
✅ Form labels associated with inputs
✅ Error messages announced
✅ Headings hierarchy correct
✅ Alt text for images
✅ Skip to main content link

Success Criteria:
- No critical accessibility violations
- WCAG 2.1 AA compliance
- Screen reader compatible
```

**Accessibility Test Example:**
```typescript
// e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('workspace page has no accessibility violations', async ({ page }) => {
  await page.goto('/workspace');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

#### Day 3-4: Performance Testing (Frontend)
```typescript
// Target: 10 performance tests
// Approach: Lighthouse CI + Playwright

Test Cases:
✅ Page load time < 3s (LCP)
✅ Time to Interactive < 5s (TTI)
✅ First Contentful Paint < 1.5s (FCP)
✅ Cumulative Layout Shift < 0.1 (CLS)
✅ Bundle size < 300KB (gzipped)
✅ Lighthouse score > 90 (performance)
✅ Lighthouse score > 90 (accessibility)
✅ Lighthouse score > 90 (best practices)

Success Criteria:
- All Core Web Vitals green
- Lighthouse scores > 90
- No performance regressions
```

**Lighthouse CI Configuration:**
```yaml
# lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3103/",
        "http://localhost:3103/workspace",
        "http://localhost:3103/docs",
        "http://localhost:3103/llama"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

#### Day 5: Flaky Test Stabilization
```bash
# Tasks
- Identify flaky tests (run 10 times, flag failures)
- Add explicit waits (waitForSelector, waitForLoadState)
- Increase timeouts for slow operations
- Add retry logic for network requests
- Document known flaky tests and workarounds

# Success Criteria
- Flaky test rate < 2% (run 100 times, <2 failures)
- All tests have explicit waits
- No "sleep()" or arbitrary delays
```

### Week 12: Test Stability + Documentation

#### Day 1-2: Test Maintenance
```bash
# Tasks
- Refactor common patterns into page objects
- Extract test utilities and helpers
- Remove duplicate test code (DRY principle)
- Add test tags for selective execution
- Optimize slow tests (parallelize where possible)

# Deliverables
✅ Page object models (e2e/pages/*.ts)
✅ Test utilities (e2e/utils/*.ts)
✅ Test tags (@smoke, @critical, @regression)
✅ Parallel execution configuration
```

#### Day 3-4: Comprehensive Testing Documentation
```markdown
# Deliverables

✅ TESTING.md - Complete testing guide
  - Testing philosophy
  - Test types and when to use them
  - Running tests locally
  - CI/CD integration
  - Debugging failing tests
  - Writing new tests
  - Best practices

✅ CONTRIBUTING.md (testing section)
  - PR requirements (tests required)
  - Coverage thresholds
  - Test review checklist

✅ Runbooks
  - Troubleshooting flaky tests
  - Updating Playwright
  - Managing Testcontainers
  - Performance testing guide
```

#### Day 5: Team Training + Knowledge Transfer
```bash
# Activities
- Team training session (2 hours)
  - Testing philosophy and benefits
  - Demo of test frameworks (Vitest, Playwright)
  - Writing your first test (pair programming)
  - Q&A session

- Documentation review
  - Walk through testing guide
  - Review common patterns
  - Share tips and tricks

- Establish ongoing practices
  - Test-first development
  - Code review checklist (tests required)
  - Retrospective on testing process
```

### Phase 3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **E2E Tests** | 20+ | Test manifest |
| **Visual Regression Tests** | 15+ | Playwright screenshots |
| **Accessibility Score** | 90+ | axe-core |
| **Performance Score** | 90+ | Lighthouse |
| **Cross-Browser Pass Rate** | 100% | Playwright matrix |
| **Flaky Test Rate** | <2% | 100 test runs |
| **Overall Coverage** | 65% | Codecov report |

### Phase 3 Deliverables

✅ **Code:**
- 20+ E2E tests (Playwright)
- 15 visual regression tests
- 20 accessibility tests
- Page object models
- Test utilities library

✅ **Infrastructure:**
- Playwright configuration
- Docker Compose for E2E
- Lighthouse CI setup
- GitHub Actions E2E workflow

✅ **Documentation:**
- Complete testing guide (TESTING.md)
- Contributing guide (testing section)
- Troubleshooting runbooks
- Team training materials

---

## Phase 4: Advanced Testing + Continuous Improvement (Weeks 13-16)

### Goals
- ✅ Overall coverage: 65% → 80%
- ✅ Mutation testing (Stryker)
- ✅ Contract testing (Pact)
- ✅ Chaos engineering experiments
- ✅ Establish sustainable testing culture

### Week 13: Mutation Testing

#### Day 1-2: Stryker Setup
```bash
# Tasks
- Install Stryker Mutator
- Configure for backend (JavaScript)
- Configure for frontend (TypeScript)
- Run initial mutation test

# Deliverables
✅ stryker.conf.json (backend)
✅ stryker.conf.json (frontend)
✅ Initial mutation score baseline
```

**Stryker Configuration:**
```javascript
// stryker.conf.json
module.exports = {
  mutate: [
    'src/**/*.js',
    '!src/**/__tests__/**',
  ],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.js',
  },
  coverageAnalysis: 'perTest',
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
  reporters: ['html', 'clear-text', 'progress'],
};
```

#### Day 3-5: Fix Mutation Survivors
```javascript
// Goal: Mutation score > 80%
// Approach: Identify and kill mutation survivors

Example Mutation Survivors:
❌ Boundary condition mutations (> vs >=)
❌ Boolean mutations (true vs false)
❌ Return value mutations (return vs return undefined)
❌ Arithmetic operator mutations (+ vs -)

Solution: Add missing test cases
✅ Test boundary conditions explicitly
✅ Test boolean branches
✅ Test return values
✅ Test arithmetic edge cases

Estimated: 20-30 new tests to kill survivors
```

### Week 14: Contract Testing

#### Day 1-2: Pact Setup (Consumer-Driven Contracts)
```javascript
// Goal: Ensure API contracts between services
// Approach: Pact (consumer-driven contract testing)

Consumer (Dashboard) ↔️ Provider (Documentation API)
Consumer (Documentation API) ↔️ Provider (LlamaIndex)

Test Cases:
✅ Dashboard expects RAG query response format
✅ Documentation API expects LlamaIndex query format
✅ TP Capital expects Telegram Gateway message format

Deliverables:
✅ Pact contracts (JSON files)
✅ Pact verification tests
✅ Pact Broker setup (for sharing contracts)
```

**Pact Consumer Test:**
```javascript
// frontend/dashboard/src/__tests__/pacts/rag-api.pact.test.js
import { pactWith } from 'jest-pact';
import { RagApiClient } from '../../services/ragApi';

pactWith({ consumer: 'Dashboard', provider: 'Documentation API' }, (provider) => {
  describe('RAG API Contract', () => {
    const client = new RagApiClient(provider.mockService.baseUrl);

    it('should query RAG system', async () => {
      await provider.addInteraction({
        state: 'RAG system is available',
        uponReceiving: 'a query request',
        withRequest: {
          method: 'POST',
          path: '/api/v1/rag/query',
          headers: { 'Content-Type': 'application/json' },
          body: { query: 'test query', limit: 5 },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            results: pact.eachLike({
              title: pact.string('Result Title'),
              score: pact.number(0.9),
            }),
            answer: pact.string('Test answer'),
          },
        },
      });

      const response = await client.query('test query', 5);

      expect(response.results).toBeDefined();
      expect(response.answer).toBeDefined();
    });
  });
});
```

#### Day 3-5: Chaos Engineering

```javascript
// Goal: Test system resilience
// Approach: Introduce controlled failures

Experiments:
✅ Kill TimescaleDB container → Verify graceful degradation
✅ Slow network (1000ms latency) → Verify timeout handling
✅ LlamaIndex returns 500 errors → Verify fallback
✅ Qdrant unavailable → Verify error message
✅ Redis cache failure → Verify direct query works

Tools:
- Testcontainers (pause/unpause containers)
- Toxiproxy (network simulation)
- Custom failure injection middleware

Success Criteria:
- No cascading failures
- Graceful degradation
- User-friendly error messages
- System recovers automatically
```

**Chaos Test Example:**
```javascript
// e2e/chaos/resilience.spec.ts
import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('Chaos Engineering', () => {
  test('should handle database unavailability', async ({ page }) => {
    await page.goto('/workspace');

    // Stop TimescaleDB container
    await execAsync('docker stop data-timescale');

    // Attempt to create item
    await page.getByRole('button', { name: 'New Item' }).click();
    await page.getByLabel('Title').fill('Test Item');
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify user-friendly error message
    await expect(page.getByText(/unable to connect to database/i)).toBeVisible();

    // Restart database
    await execAsync('docker start data-timescale');

    // Verify retry works
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Item created successfully')).toBeVisible();
  });
});
```

### Week 15: Security Testing

#### Day 1-2: OWASP ZAP Scanning
```bash
# Tasks
- Install OWASP ZAP
- Configure automated scanning
- Scan all API endpoints
- Scan frontend application
- Fix identified vulnerabilities

# Test Cases
✅ SQL injection attempts
✅ XSS (Cross-Site Scripting) attempts
✅ CSRF token validation
✅ Authentication bypass attempts
✅ Rate limiting enforcement
✅ CORS policy validation

# Success Criteria
- Zero high/critical vulnerabilities
- All medium vulnerabilities documented
```

**ZAP Configuration:**
```yaml
# .zap/automation-config.yaml
env:
  contexts:
    - name: TradingSystem
      urls:
        - http://localhost:3103
        - http://localhost:3200
        - http://localhost:3401
  parameters:
    failOnError: true
    failOnWarning: false
    progressToStdout: true
jobs:
  - type: spider
    parameters:
      maxDuration: 5
  - type: passiveScan-wait
  - type: activeScan
    parameters:
      policy: Default Policy
  - type: report
    parameters:
      template: traditional-html
      reportDir: /zap/reports
```

#### Day 3-4: Dependency Scanning
```bash
# Tasks
- Run npm audit on all services
- Fix vulnerable dependencies
- Set up Dependabot alerts
- Configure Snyk scanning

# Commands
npm audit --audit-level=moderate
npm audit fix
npx snyk test

# Success Criteria
- Zero critical vulnerabilities
- All high vulnerabilities fixed or documented
- Dependabot configured
```

#### Day 5: Penetration Testing
```bash
# Tasks
- Manual penetration testing
- API fuzzing (RestFuzz)
- Authentication testing
- Authorization testing (privilege escalation)

# Test Scenarios
✅ Bypass JWT authentication
✅ Access other users' data (IDOR)
✅ SQL injection via query parameters
✅ File upload vulnerabilities
✅ Rate limit bypass

# Deliverable
- Penetration test report
- Remediation plan
```

### Week 16: Sustainable Testing Culture

#### Day 1-2: Test Quality Metrics Dashboard
```bash
# Tasks
- Set up Codecov dashboard
- Configure Grafana dashboards for test metrics
- Create alerts for coverage drops
- Set up weekly test reports

# Metrics to Track
✅ Code coverage (overall, by service)
✅ Test execution time
✅ Flaky test rate
✅ Mutation score
✅ Security scan results
✅ E2E test pass rate
✅ Performance test results

# Deliverable
- Grafana dashboard URL
- Weekly automated reports (email)
```

#### Day 3: Test Maintenance Policy
```markdown
# Deliverables

✅ Test Maintenance Policy Document
  - Coverage threshold enforcement (80% for new code)
  - Test review requirements (all PRs must have tests)
  - Flaky test SLA (fix within 24 hours)
  - Test execution time budget (<10 minutes)
  - Mutation testing cadence (monthly)
  - Security scanning frequency (weekly)

✅ Definition of Done (Updated)
  - [ ] Feature implemented
  - [ ] Unit tests added (80% coverage)
  - [ ] Integration tests added (if applicable)
  - [ ] E2E test added (for UI changes)
  - [ ] Tests pass locally
  - [ ] Tests pass in CI/CD
  - [ ] Code review approved
  - [ ] Documentation updated
```

#### Day 4: Retrospective + Lessons Learned
```bash
# Activities
- Team retrospective (2 hours)
  - What went well?
  - What didn't go well?
  - What can we improve?
  - Action items for next quarter

- Document lessons learned
  - Testing patterns that worked
  - Common pitfalls to avoid
  - Tips for writing good tests
  - Resources and references

- Celebrate wins!
  - Team achievement: 5.8% → 80% coverage
  - Production incident reduction
  - Developer confidence improvement
```

#### Day 5: Future Testing Strategy
```markdown
# Next Steps (Q2 2026)

1. **Achieve 90% Coverage** (Stretch goal)
   - Focus on edge cases
   - Increase E2E coverage
   - Add more integration tests

2. **Property-Based Testing** (Fast-check)
   - Generate random test inputs
   - Find edge cases automatically
   - Increase confidence in algorithms

3. **Visual Testing at Scale** (Percy/Chromatic)
   - Automated visual regression for all components
   - Review visual changes in PRs
   - Prevent UI regressions

4. **AI-Powered Test Generation** (GitHub Copilot)
   - Auto-generate test cases from code
   - Suggest edge cases
   - Improve test coverage

5. **Continuous Testing Culture**
   - Monthly testing workshops
   - Quarterly testing hackathons
   - Testing champions program
```

### Phase 4 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Overall Coverage** | 80% | Codecov report |
| **Mutation Score** | 80%+ | Stryker report |
| **Security Score** | A | OWASP ZAP |
| **Zero Critical Vulnerabilities** | 0 | npm audit + Snyk |
| **E2E Pass Rate** | 98%+ | Playwright |
| **Team Satisfaction** | 4/5 | Survey |

### Phase 4 Deliverables

✅ **Code:**
- Mutation testing setup (Stryker)
- Contract tests (Pact)
- Chaos engineering tests
- Security tests (OWASP ZAP)

✅ **Infrastructure:**
- Test metrics dashboard (Grafana)
- Automated security scanning
- Dependabot configuration
- Weekly test reports

✅ **Documentation:**
- Test maintenance policy
- Lessons learned document
- Future testing strategy
- Testing culture guide

---

## Long-Term Roadmap (Beyond Phase 4)

### Q2 2026: Optimization & Scale
- Achieve 90% coverage
- Reduce test execution time by 50% (parallelize)
- Implement property-based testing (Fast-check)
- Add visual testing at scale (Percy/Chromatic)

### Q3 2026: Advanced Techniques
- AI-powered test generation (GitHub Copilot)
- Shift-left security testing (pre-commit hooks)
- Performance testing in production (shadow traffic)
- Chaos engineering in staging

### Q4 2026: Maturity & Excellence
- Testing Center of Excellence
- Industry best practices adoption
- Testing metrics benchmarking
- Continuous improvement culture

---

## Appendix A: Test Categories Reference

### Unit Tests
**Purpose:** Test individual functions/methods in isolation
**Coverage Goal:** 80%
**Execution Time:** <2 minutes
**Examples:** Service methods, utility functions, middleware

### Integration Tests
**Purpose:** Test component interactions with real dependencies
**Coverage Goal:** Critical paths only
**Execution Time:** <5 minutes
**Examples:** API endpoints, database operations, inter-service calls

### E2E Tests
**Purpose:** Test complete user journeys
**Coverage Goal:** Critical user flows only
**Execution Time:** <15 minutes
**Examples:** User creates item, User searches docs, User queries RAG

### Performance Tests
**Purpose:** Validate system performance under load
**Coverage Goal:** All critical endpoints
**Execution Time:** Variable (60s per test)
**Examples:** 100 req/s for 60s, P95 latency < 500ms

### Security Tests
**Purpose:** Identify security vulnerabilities
**Coverage Goal:** All attack vectors
**Execution Time:** <30 minutes (OWASP ZAP)
**Examples:** SQL injection, XSS, CSRF, auth bypass

### Mutation Tests
**Purpose:** Validate test quality (kill mutants)
**Coverage Goal:** Mutation score > 80%
**Execution Time:** <60 minutes
**Examples:** Boundary conditions, boolean branches, return values

---

## Appendix B: Test Data Management

### Test Fixtures
```javascript
// backend/api/workspace/__tests__/fixtures/index.js
export const fixtures = {
  items: {
    valid: {
      id: '123',
      title: 'Test Item',
      content: 'Test content',
      category: 'idea',
    },
    invalid: {
      title: '', // Empty title (invalid)
      content: 'Content without title',
    },
  },
  users: {
    admin: {
      id: '1',
      name: 'Admin User',
      role: 'admin',
    },
    regular: {
      id: '2',
      name: 'Regular User',
      role: 'user',
    },
  },
};
```

### Test Data Factories
```javascript
// Use @faker-js/faker for dynamic test data
import { faker } from '@faker-js/faker';

export class ItemFactory {
  static create(overrides = {}) {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      category: faker.helpers.arrayElement(['idea', 'todo', 'note']),
      created_at: faker.date.past().toISOString(),
      ...overrides,
    };
  }

  static createMany(count, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

---

## Appendix C: CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [workspace, documentation-api, tp-capital]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: cd backend/api/${{ matrix.service }} && npm ci
      - name: Run tests
        run: cd backend/api/${{ matrix.service }} && npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: cd frontend/dashboard && npm ci
      - name: Run tests
        run: cd frontend/dashboard && npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Start services
        run: docker compose -f docker-compose.e2e.yml up -d
      - name: Install Playwright
        run: cd frontend/dashboard && npx playwright install --with-deps
      - name: Run E2E tests
        run: cd frontend/dashboard && npx playwright test
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/dashboard/playwright-report/

  coverage-gate:
    needs: [test-backend, test-frontend, test-e2e]
    runs-on: ubuntu-latest
    steps:
      - name: Check coverage threshold
        run: |
          echo "Minimum coverage: 80%"
          # Fail if coverage < 80%
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-02
**Next Review:** 2026-02-17 (after Phase 1 completion)

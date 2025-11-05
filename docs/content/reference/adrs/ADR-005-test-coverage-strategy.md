---
title: "ADR-005: Test Coverage Strategy - Systematic Quality Improvement"
date: 2025-11-02
description: "Architecture Decision Record for systematically increasing test coverage from 5.8% to 80% across backend and frontend"
status: proposed
tags: [architecture, testing, quality, ci-cd]
domain: development-process
type: adr
summary: "Architecture Decision Record for systematically increasing test coverage from 5.8% to 80% across backend and frontend"
owner: ArchitectureGuild
lastReviewed: "2025-11-02"
last_review: 2025-11-02
---

# ADR-005: Test Coverage Strategy - Systematic Quality Improvement

## Status
**Proposed** - Pending approval for implementation in Q1 2026

## Context

### Current Situation

The TradingSystem has critically low test coverage:

```
Total Source Files:  43,536
Total Test Files:    2,505
Current Coverage:    ~5.8%
Target Coverage:     80%
```

**Coverage Breakdown:**
- **Backend APIs:** ~2% (15 test files)
- **Frontend:** ~1% (8 test files)
- **Integration Tests:** 0 (non-existent)
- **E2E Tests:** 0 (non-existent)
- **Load Tests:** 0 (non-existent)

### Problems Identified

1. **Quality Risks:**
   - High risk of regressions when refactoring
   - No confidence in code changes
   - Difficult to onboard new developers
   - Manual testing is error-prone and slow

2. **Development Velocity:**
   - Fear of breaking existing functionality
   - Slow feedback loops (manual testing)
   - Difficult to refactor legacy code
   - CI/CD pipeline lacks quality gates

3. **Production Incidents:**
   - Unable to catch bugs before production
   - No automated smoke tests
   - Difficult to reproduce reported bugs
   - No performance regression detection

4. **Technical Debt:**
   - Code is tightly coupled (hard to test)
   - Missing test fixtures and factories
   - No mocking strategy for external services
   - No testing infrastructure (Testcontainers, etc.)

### Architecture Review Findings

From the [Architecture Review 2025-11-02](https://github.com/marceloterra1983/TradingSystem/blob/main/governance/reviews/architecture-2025-11-02/ARCHITECTURE-REVIEW-2025-11-02.md):
- **Quality Grade:** C (Needs significant improvement)
- **Priority:** P1 (Critical)
- **Effort:** 4 weeks
- **Impact:** Reduces production incidents, improves developer confidence

## Decision

We will implement a **phased approach** to increase test coverage from 5.8% to 80% over 4 phases:

### Phase 1: Backend Unit Tests (Weeks 1-2)
**Target:** Backend coverage 2% → 40%

**Focus Areas:**
1. Service layer methods (business logic)
2. Repository layer (data access)
3. Middleware (auth, validation, error handling)
4. Utility functions

**Priority Services:**
- RagProxyService (100% coverage)
- CollectionService (100% coverage)
- SearchService (80% coverage)
- All TimescaleDB repositories (80% coverage)

### Phase 2: Frontend Unit Tests (Weeks 2-3)
**Target:** Frontend coverage 1% → 25%

**Focus Areas:**
1. Zustand stores (state management)
2. Custom React hooks
3. Utility functions
4. Critical page components

**Priority Components:**
- useWorkspace hook (100%)
- useRagQuery hook (100%)
- useServiceAutoRecovery hook (100%)
- WorkspacePageNew component (80%)
- DocsHybridSearchPage component (80%)

### Phase 3: Integration Tests (Week 3)
**Target:** 50+ integration tests

**Focus Areas:**
1. API endpoint testing (end-to-end)
2. Database integration (Testcontainers)
3. Inter-service communication
4. Error scenarios and edge cases

**Priority Flows:**
- Workspace CRUD operations
- RAG search and query
- Collection management
- Telegram message ingestion
- TP Capital signal processing

### Phase 4: E2E Tests (Week 4)
**Target:** 20+ E2E tests with Playwright

**Focus Areas:**
1. Critical user journeys
2. Cross-browser testing
3. Mobile responsiveness
4. Error handling and recovery

**Priority Flows:**
- User creates/edits workspace item
- User searches documentation
- User queries RAG system
- User manages collections
- User views TP Capital signals

## Implementation Strategy

### 1. Testing Infrastructure

#### Backend Testing Stack
```json
{
  "framework": "Vitest (ESM-native, faster than Jest)",
  "coverage": "@vitest/coverage-v8 (built-in V8 coverage)",
  "mocking": "vitest/mocks (built-in mocking)",
  "integration": "supertest (HTTP assertion)",
  "containers": "testcontainers (Docker-based integration)",
  "fixtures": "Custom test data factories"
}
```

#### Frontend Testing Stack
```json
{
  "framework": "Vitest (same as backend for consistency)",
  "dom": "@testing-library/react (user-centric testing)",
  "mocking": "msw (Mock Service Worker for API mocking)",
  "e2e": "@playwright/test (cross-browser E2E)",
  "visual": "playwright/test snapshots (visual regression)"
}
```

### 2. Test Patterns and Best Practices

#### Backend Unit Test Pattern
```javascript
// backend/api/documentation-api/src/services/__tests__/RagProxyService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagProxyService } from '../RagProxyService.js';

describe('RagProxyService', () => {
  let service;
  let mockFetch;

  beforeEach(() => {
    service = new RagProxyService({
      queryBaseUrl: 'http://localhost:8202',
      jwtSecret: 'test-secret',
      timeout: 30000,
    });

    mockFetch = vi.spyOn(global, 'fetch');
  });

  describe('search()', () => {
    it('should validate query parameters', async () => {
      await expect(
        service.search('', 5)
      ).rejects.toThrow('Query cannot be empty');

      await expect(
        service.search('a'.repeat(10001), 5)
      ).rejects.toThrow('Query is too long');
    });

    it('should make request with JWT authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({ results: [] }),
      });

      await service.search('test query', 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /),
          }),
        })
      );
    });

    it('should handle upstream timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      await expect(
        service.search('test query', 5)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle upstream errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        text: async () => 'Internal Server Error',
      });

      await expect(
        service.search('test query', 5)
      ).rejects.toThrow('LlamaIndex query service');
    });
  });

  describe('_validateQuery()', () => {
    it('should trim whitespace', () => {
      const result = service._validateQuery('  test query  ');
      expect(result).toBe('test query');
    });

    it('should reject non-string queries', () => {
      expect(() => service._validateQuery(null)).toThrow();
      expect(() => service._validateQuery(undefined)).toThrow();
      expect(() => service._validateQuery(123)).toThrow();
    });
  });
});
```

#### Frontend Component Test Pattern
```typescript
// frontend/dashboard/src/components/pages/__tests__/WorkspacePageNew.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspacePageNew } from '../WorkspacePageNew';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post('/api/items', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: '123',
      ...body,
      created_at: new Date().toISOString(),
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('WorkspacePageNew', () => {
  it('should create new workspace item', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WorkspacePageNew />
      </QueryClientProvider>
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New Item' },
    });

    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: 'Item content here' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/item created successfully/i)).toBeInTheDocument();
    });

    // Verify item appears in list
    expect(screen.getByText('New Item')).toBeInTheDocument();
  });

  it('should handle validation errors', async () => {
    server.use(
      http.post('/api/items', () => {
        return HttpResponse.json(
          { error: 'Title is required' },
          { status: 400 }
        );
      })
    );

    render(
      <QueryClientProvider client={new QueryClient()}>
        <WorkspacePageNew />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });
});
```

#### Integration Test Pattern
```javascript
// backend/api/workspace/__tests__/integration/items.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { GenericContainer, Wait } from 'testcontainers';
import app from '../../src/server.js';

describe('Workspace Items API (Integration)', () => {
  let timescaleContainer;
  let baseUrl;

  beforeAll(async () => {
    // Start TimescaleDB container
    timescaleContainer = await new GenericContainer('timescale/timescaledb:latest-pg15')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_DB: 'tradingsystem',
        POSTGRES_USER: 'timescale',
        POSTGRES_PASSWORD: 'test-password',
      })
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();

    const host = timescaleContainer.getHost();
    const port = timescaleContainer.getMappedPort(5432);

    process.env.TIMESCALEDB_HOST = host;
    process.env.TIMESCALEDB_PORT = port.toString();
    process.env.TIMESCALEDB_PASSWORD = 'test-password';

    baseUrl = 'http://localhost:3200';

    // Run migrations
    await runMigrations();
  }, 60000); // 60s timeout for container startup

  afterAll(async () => {
    await timescaleContainer.stop();
  });

  describe('POST /api/items', () => {
    it('should create item with valid data', async () => {
      const response = await request(baseUrl)
        .post('/api/items')
        .send({
          title: 'Integration Test Item',
          content: 'Test content',
          category: 'testing',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: 'Integration Test Item',
        content: 'Test content',
        category: 'testing',
        created_at: expect.any(String),
      });
    });

    it('should reject item without title', async () => {
      const response = await request(baseUrl)
        .post('/api/items')
        .send({
          content: 'Test content',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/items', () => {
    it('should return all items', async () => {
      // Create test items
      await request(baseUrl)
        .post('/api/items')
        .send({ title: 'Item 1', content: 'Content 1' });

      await request(baseUrl)
        .post('/api/items')
        .send({ title: 'Item 2', content: 'Content 2' });

      const response = await request(baseUrl)
        .get('/api/items')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});
```

#### E2E Test Pattern
```typescript
// frontend/dashboard/e2e/workspace.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3103');
    await page.waitForLoadState('networkidle');
  });

  test('should create new workspace item', async ({ page }) => {
    // Navigate to workspace page
    await page.getByRole('link', { name: 'Workspace' }).click();

    // Open create dialog
    await page.getByRole('button', { name: 'New Item' }).click();

    // Fill form
    await page.getByLabel('Title').fill('E2E Test Item');
    await page.getByLabel('Content').fill('This is an E2E test item');
    await page.getByLabel('Category').selectOption('testing');

    // Submit
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify success
    await expect(page.getByText('Item created successfully')).toBeVisible();

    // Verify item appears in list
    await expect(page.getByText('E2E Test Item')).toBeVisible();
  });

  test('should edit existing item', async ({ page }) => {
    await page.getByRole('link', { name: 'Workspace' }).click();

    // Find and click edit button for first item
    await page.locator('tr').first().getByRole('button', { name: 'Edit' }).click();

    // Update title
    await page.getByLabel('Title').fill('Updated Title');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify update
    await expect(page.getByText('Updated Title')).toBeVisible();
  });

  test('should delete item with confirmation', async ({ page }) => {
    await page.getByRole('link', { name: 'Workspace' }).click();

    // Click delete button
    await page.locator('tr').first().getByRole('button', { name: 'Delete' }).click();

    // Confirm deletion
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Verify deletion
    await expect(page.getByText('Item deleted successfully')).toBeVisible();
  });
});
```

### 3. Test Data Management

#### Test Fixtures Factory Pattern
```javascript
// backend/api/workspace/__tests__/fixtures/itemFactory.js
import { faker } from '@faker-js/faker';

export class ItemFactory {
  static create(overrides = {}) {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      category: faker.helpers.arrayElement(['idea', 'todo', 'note', 'link']),
      tags: faker.helpers.arrayElements(['tag1', 'tag2', 'tag3'], 2),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      ...overrides,
    };
  }

  static createMany(count, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createValid() {
    return this.create({
      title: 'Valid Item',
      content: 'Valid content here',
      category: 'idea',
    });
  }

  static createInvalid() {
    return {
      title: '', // Invalid: empty title
      content: 'Content without title',
    };
  }
}

// Usage in tests
import { ItemFactory } from './fixtures/itemFactory.js';

it('should handle bulk creation', async () => {
  const items = ItemFactory.createMany(10);
  const results = await bulkCreateItems(items);
  expect(results).toHaveLength(10);
});
```

### 4. CI/CD Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Coverage

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: timescale/timescaledb:latest-pg15
        env:
          POSTGRES_DB: tradingsystem_test
          POSTGRES_USER: timescale
          POSTGRES_PASSWORD: test-password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install backend dependencies
        run: |
          cd backend/api/documentation-api
          npm ci

      - name: Run backend tests
        run: |
          cd backend/api/documentation-api
          npm test -- --coverage --reporter=verbose
        env:
          TIMESCALEDB_HOST: localhost
          TIMESCALEDB_PORT: 5432
          TIMESCALEDB_PASSWORD: test-password
          NODE_ENV: test

      - name: Upload backend coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/api/documentation-api/coverage/lcov.info
          flags: backend
          fail_ci_if_error: true

  test-frontend:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install frontend dependencies
        run: |
          cd frontend/dashboard
          npm ci

      - name: Run frontend tests
        run: |
          cd frontend/dashboard
          npm test -- --coverage --reporter=verbose

      - name: Upload frontend coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/dashboard/coverage/lcov.info
          flags: frontend
          fail_ci_if_error: true

  test-e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Playwright
        run: |
          cd frontend/dashboard
          npx playwright install --with-deps

      - name: Start services
        run: |
          docker compose -f docker-compose.test.yml up -d
          bash scripts/wait-for-healthy.sh

      - name: Run E2E tests
        run: |
          cd frontend/dashboard
          npx playwright test

      - name: Upload E2E test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/dashboard/playwright-report/

  coverage-gate:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - name: Check coverage threshold
        run: |
          echo "Checking minimum coverage: 30%"
          # This step fails if coverage < 30%
```

### 5. Coverage Monitoring

#### Codecov Configuration
```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 30%
        threshold: 2%  # Allow 2% drop
    patch:
      default:
        target: 50%  # New code must have 50% coverage

comment:
  layout: "reach, diff, flags, files"
  behavior: default
  require_changes: true

flags:
  backend:
    paths:
      - backend/
    carryforward: true
  frontend:
    paths:
      - frontend/
    carryforward: true
```

## Consequences

### Positive

1. **Quality Improvements:**
   ✅ Reduced production incidents (target: 50% reduction)
   ✅ Faster bug detection (shift-left testing)
   ✅ Improved code quality and maintainability
   ✅ Confidence in refactoring and feature development

2. **Development Velocity:**
   ✅ Faster feedback loops (automated testing)
   ✅ Easier onboarding for new developers
   ✅ Reduced manual testing effort
   ✅ Faster code reviews (automated checks)

3. **Operational Benefits:**
   ✅ Better regression detection
   ✅ Automated smoke tests for deployments
   ✅ Performance regression detection
   ✅ Documentation through tests (living documentation)

4. **Business Value:**
   ✅ Reduced downtime (fewer production bugs)
   ✅ Faster feature delivery (less rework)
   ✅ Lower maintenance costs (less technical debt)
   ✅ Improved customer satisfaction

### Negative

1. **Initial Investment:**
   ⚠️ 4 weeks of dedicated effort
   ⚠️ Learning curve for testing frameworks
   ⚠️ Initial slowdown in feature development
   ⚠️ Infrastructure setup (Testcontainers, Playwright)

2. **Ongoing Maintenance:**
   ⚠️ Tests require maintenance alongside code
   ⚠️ Flaky tests can slow down CI/CD
   ⚠️ Test execution time increases with coverage
   ⚠️ Need for test data management strategy

3. **Challenges:**
   ⚠️ Legacy code may be difficult to test (needs refactoring)
   ⚠️ External dependencies require mocking
   ⚠️ E2E tests can be slow and flaky
   ⚠️ Team resistance to "testing culture"

### Mitigation Strategies

**For Initial Investment:**
- Phased approach (spread over 4 weeks)
- Training sessions for team
- Pair programming for complex tests
- Start with high-value tests (critical paths)

**For Ongoing Maintenance:**
- Dedicate time for test maintenance (10% of sprint)
- Monitor and fix flaky tests immediately
- Parallelize test execution (GitHub Actions matrix)
- Use test data factories (reduce brittleness)

**For Challenges:**
- Refactor legacy code incrementally
- Use Testcontainers for integration tests
- Retry mechanism for E2E tests (max 3 retries)
- Celebrate testing wins (gamification)

## Implementation Roadmap

### Week 1: Backend Unit Tests (Part 1)
- [ ] Set up Vitest configuration
- [ ] Create test fixtures and factories
- [ ] Test RagProxyService (100% coverage)
- [ ] Test CollectionService (100% coverage)
- [ ] Test SearchService (80% coverage)
- [ ] Test authentication middleware (100% coverage)

**Deliverables:**
- 50+ backend unit tests
- Test fixtures library
- CI/CD integration
- Coverage: 20% → 30%

### Week 2: Backend Unit Tests (Part 2) + Integration Tests (Start)
- [ ] Test all repositories (80% coverage)
- [ ] Test all middleware (100% coverage)
- [ ] Test utility functions (100% coverage)
- [ ] Set up Testcontainers
- [ ] Create 20 integration tests (Workspace API)
- [ ] Create 15 integration tests (Documentation API)

**Deliverables:**
- 50+ additional unit tests
- 35 integration tests
- Testcontainers setup
- Coverage: 30% → 40%

### Week 3: Frontend Unit Tests + Integration Tests (Complete)
- [ ] Test Zustand stores (100% coverage)
- [ ] Test custom hooks (100% coverage)
- [ ] Test utility functions (100% coverage)
- [ ] Test critical components (80% coverage)
- [ ] Set up MSW for API mocking
- [ ] Create 15 integration tests (TP Capital API)
- [ ] Complete integration test suite (50+ tests total)

**Deliverables:**
- 60+ frontend unit tests
- 15 additional integration tests
- MSW configuration
- Coverage: 40% → 50%

### Week 4: E2E Tests + Performance Tests
- [ ] Set up Playwright
- [ ] Test critical user journeys (20+ tests)
- [ ] Cross-browser testing (Chrome, Firefox)
- [ ] Mobile viewport testing
- [ ] Visual regression testing
- [ ] Create load tests (k6)
- [ ] Document testing guidelines
- [ ] Team training session

**Deliverables:**
- 20+ E2E tests
- 10+ load tests
- Testing documentation
- Coverage: 50% → 60%+

## Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Target (6 months) |
|--------|---------|---------|---------|---------|---------|-------------------|
| **Overall Coverage** | 5.8% | 30% | 40% | 50% | 60% | 80% |
| **Backend Coverage** | 2% | 30% | 40% | 40% | 40% | 80% |
| **Frontend Coverage** | 1% | 10% | 25% | 30% | 35% | 70% |
| **Integration Tests** | 0 | 15 | 35 | 50 | 50 | 100+ |
| **E2E Tests** | 0 | 0 | 0 | 10 | 20 | 50+ |
| **Test Execution Time** | 0s | `under 2min` | `under 3min` | `under 4min` | `under 5min` | `under 10min` |
| **Flaky Test Rate** | N/A | `under 5%` | `under 3%` | `under 2%` | `under 2%` | `under 1%` |
| **Production Incidents** | Baseline | -20% | -30% | -40% | -50% | -60% |

## Alternatives Considered

### Alternative 1: Big Bang Approach (Rejected)
**Description:** Stop all feature development for 1 month, write all tests.
**Why Rejected:**
- Too risky (business impact)
- Team burnout
- No incremental value delivery
- Difficult to maintain focus

### Alternative 2: Ad-hoc Testing (Rejected)
**Description:** Developers write tests as they work on features.
**Why Rejected:**
- Inconsistent coverage
- No systematic approach
- Low priority (always deprioritized)
- No accountability

### Alternative 3: Outsource Testing (Rejected)
**Description:** Hire external QA team to write tests.
**Why Rejected:**
- Expensive
- Knowledge drain (no internal expertise)
- Disconnected from development process
- Not sustainable long-term

## Decision Makers

- **Architecture Review Team:** Claude Code Architecture Reviewer
- **Approval Required:** Project Lead, Development Team, QA Team
- **Implementation Owner:** Development Team Lead + QA Lead

## Timeline

**Proposed Start:** 2026-01-20
**Target Completion:** 2026-02-17 (4 weeks)
**Mid-point Review:** 2026-02-03 (after Week 2)
**Final Review:** 2026-02-24 (one week after completion)

## References

- [Architecture Review 2025-11-02](https://github.com/marceloterra1983/TradingSystem/blob/main/governance/reviews/architecture-2025-11-02/ARCHITECTURE-REVIEW-2025-11-02.md)
- [Test Coverage Roadmap](https://github.com/marceloterra1983/TradingSystem/blob/main/governance/reviews/architecture-2025-11-02/test-coverage-roadmap.md)
- [GitHub Issue #3: Increase Test Coverage to 30%](https://github.com/marceloterra1983/TradingSystem/blob/main/governance/reviews/architecture-2025-11-02/github-issues.md#issue-3)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Testcontainers](https://testcontainers.com/)

---

**Document Version:** 1.0
**Next Review:** 2026-02-03 (mid-implementation review)

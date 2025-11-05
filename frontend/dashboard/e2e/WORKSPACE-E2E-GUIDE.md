# Workspace E2E Testing Guide

Complete guide for running end-to-end tests on the Workspace feature.

## 📚 Table of Contents

- [Quick Start](#quick-start)
- [Test Suites](#test-suites)
- [Running Tests](#running-tests)
- [Test Architecture](#test-architecture)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

1. **Workspace API running**:
   ```bash
   docker compose -p workspace -f tools/compose/docker-compose.workspace-postgres.yml up -d
   ```

2. **Dashboard running**:
   ```bash
   cd frontend/dashboard
   npm run dev
   ```

3. **Playwright installed**:
   ```bash
   cd frontend/dashboard
   npm install
   npx playwright install
   ```

### Run All Tests

```bash
cd frontend/dashboard
npm run test:e2e:workspace
```

---

## 📋 Test Suites

### 1. Smoke Tests (Fast - 2-3 minutes)

**Purpose**: Basic sanity checks to ensure core functionality works.

**Coverage**:
- ✅ Page loads without errors
- ✅ Categories display correctly
- ✅ Items table renders
- ✅ Kanban board visible
- ✅ API health check passes
- ✅ No console errors

**Run**:
```bash
npm run test:e2e:workspace:smoke
```

**When to use**: Quick validation after deployments, before starting work.

---

### 2. Functional Tests (Medium - 10-15 minutes)

**Purpose**: Comprehensive coverage of all features and workflows.

**Coverage**:
- ✅ Create items (with all fields)
- ✅ Edit existing items
- ✅ Delete items
- ✅ Form validation (required fields, length limits)
- ✅ Search functionality
- ✅ Filtering by category/priority
- ✅ Sorting columns
- ✅ Edge cases (empty state, special characters)
- ✅ Performance (rapid operations)

**Run**:
```bash
npm run test:e2e:workspace:functional
```

**When to use**: Before merging PRs, after major changes.

---

### 3. Visual Regression Tests (Medium - 5-8 minutes)

**Purpose**: Detect unintended UI changes by comparing screenshots.

**Coverage**:
- ✅ Full page snapshots
- ✅ Component-level snapshots (categories, items, dialogs)
- ✅ Responsive layouts (desktop, tablet, mobile)
- ✅ Theme variants (light, dark)
- ✅ Interactive states (hover, focus)
- ✅ Empty states
- ✅ Filled forms

**Run**:
```bash
npm run test:e2e:workspace:visual
```

**Update baselines** (after intentional UI changes):
```bash
npm run test:e2e:workspace:visual -- --update-snapshots
```

**When to use**: After CSS/design changes, theme updates.

---

### 4. Accessibility Tests (Medium - 5-7 minutes)

**Purpose**: Ensure WCAG 2.1 AA compliance for inclusivity.

**Coverage**:
- ✅ No axe-core violations
- ✅ Proper heading hierarchy (h1 > h2 > h3)
- ✅ Semantic HTML landmarks (main, nav, section)
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Color contrast ratios
- ✅ Form labels and required field indicators
- ✅ Screen reader compatibility
- ✅ Focus management in dialogs
- ✅ Reduced motion support

**Run**:
```bash
npm run test:e2e:workspace:accessibility
```

**When to use**: Before releases, accessibility audits.

---

## 🏃 Running Tests

### Local Development

```bash
# All workspace tests
npm run test:e2e:workspace

# Specific suite
npm run test:e2e:workspace:smoke
npm run test:e2e:workspace:functional
npm run test:e2e:workspace:visual
npm run test:e2e:workspace:accessibility

# Interactive UI mode (debug)
npm run test:e2e:ui -- workspace

# Headed mode (see browser)
npm run test:e2e:headed -- workspace.smoke.spec.ts

# Debug specific test
npm run test:e2e:debug -- workspace.functional.spec.ts -g "should create"

# Specific browser
npm run test:e2e:chromium -- workspace
npm run test:e2e:firefox -- workspace
npm run test:e2e:webkit -- workspace

# View last report
npm run test:e2e:report
```

### CI/CD (GitHub Actions)

Tests run automatically on:
- ✅ Push to `main` or `develop` (if workspace files changed)
- ✅ Pull requests affecting workspace
- ✅ Manual workflow dispatch

**Workflow**: `.github/workflows/workspace-e2e.yml`

**Jobs**:
1. **Smoke Tests** - Fast validation (runs first)
2. **Functional Tests** - Full CRUD testing (after smoke)
3. **Visual Tests** - Screenshot comparison (parallel)
4. **Accessibility Tests** - WCAG compliance (parallel)
5. **Test Summary** - Aggregated results

---

## 🏗️ Test Architecture

### Page Object Model

**File**: `e2e/pages/workspace.page.ts`

Encapsulates all page interactions for maintainability:

```typescript
const workspace = new WorkspacePage(page);

// Navigation
await workspace.goto();
await workspace.waitForPageLoad();

// CRUD operations
await workspace.createItem({ title, description, category, priority });
await workspace.deleteFirstItem();

// Utilities
const count = await workspace.getItemsCount();
const categories = await workspace.getCategoryNames();
```

**Benefits**:
- ✅ Centralized selectors (easier to update)
- ✅ Reusable methods (DRY principle)
- ✅ Type-safe with TypeScript
- ✅ Clear separation of concerns

### Test Fixtures

**File**: `e2e/fixtures/workspace.fixtures.ts`

Provides reusable test data:

```typescript
import { mockItems, createMockItem, validItemData } from './fixtures/workspace.fixtures';

// Use predefined items
await createItem(mockItems[0]);

// Create custom mock
await createItem(createMockItem({ priority: 'critical' }));

// Use validation test data
await createItem(validItemData.complete);
```

### Test Structure

```
e2e/
├── pages/
│   └── workspace.page.ts       # Page Object Model
├── fixtures/
│   └── workspace.fixtures.ts   # Test data
├── helpers/                     # Shared utilities
├── workspace.smoke.spec.ts      # Smoke tests
├── workspace.functional.spec.ts # Functional tests
├── workspace.visual.spec.ts     # Visual regression
└── workspace.accessibility.spec.ts # A11y tests
```

---

## 🔄 CI/CD Integration

### Workflow Configuration

**File**: `.github/workflows/workspace-e2e.yml`

**Triggers**:
- Push to main/develop (workspace files changed)
- Pull requests
- Manual dispatch

**Environment**:
- Ubuntu latest
- Node.js 20
- Docker Compose
- Playwright browsers (chromium, firefox, webkit)

**Steps**:
1. Checkout code
2. Setup Node.js with cache
3. Install dependencies
4. Install Playwright browsers
5. Start Workspace API (Docker)
6. Run test suite
7. Upload artifacts (reports, screenshots)
8. Stop services

### Artifacts

All test runs upload artifacts (available for 7-14 days):
- Test reports (HTML)
- Screenshots (failures, visual diffs)
- Trace files (for debugging)
- Accessibility reports

**Download**: GitHub Actions → Workflow run → Artifacts section

---

## 🔧 Troubleshooting

### Tests Failing Locally

**1. Workspace API not running**:
```bash
# Check API health
curl http://localhost:3200/health

# Start if needed
docker compose -p workspace -f tools/compose/docker-compose.workspace-postgres.yml up -d

# Check logs
docker logs workspace-api --tail 50
```

**2. Dashboard not running**:
```bash
# Start dashboard
cd frontend/dashboard
npm run dev

# Verify
curl http://localhost:3103
```

**3. Port conflicts**:
```bash
# Check what's using ports
lsof -i:3103  # Dashboard
lsof -i:3200  # Workspace API

# Kill if needed
lsof -ti:3103 | xargs kill -9
lsof -ti:3200 | xargs kill -9
```

### Visual Tests Failing

**Legitimate UI changes**:
```bash
# Update baseline screenshots
npm run test:e2e:workspace:visual -- --update-snapshots
```

**Platform differences** (macOS vs Linux):
- Visual tests may have slight rendering differences
- Run tests on same platform as CI (Ubuntu)
- Use Docker for consistent rendering

### Accessibility Tests Failing

**Common issues**:
- Missing alt text on images
- Insufficient color contrast
- Missing ARIA labels
- Improper heading hierarchy

**Debug**:
```bash
# Run with verbose output
npm run test:e2e:workspace:accessibility -- --reporter=line

# Check specific violations
# See playwright-report/index.html for details
```

### Performance Issues

**Tests timing out**:
```bash
# Increase timeout in playwright.config.ts
timeout: 60 * 1000  # 60 seconds

# Or per-test
test('slow test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes
});
```

**Network issues**:
```bash
# Check API connectivity
curl -v http://localhost:3200/health

# Restart Docker networking
docker compose -p workspace -f tools/compose/docker-compose.workspace-postgres.yml restart
```

---

## 📊 Best Practices

### Writing New Tests

1. **Use Page Object Model**: Don't use raw selectors in tests
2. **Descriptive test names**: `should create item with all required fields`
3. **One assertion per test**: Focus on single behavior
4. **Clean up after tests**: Delete created data if possible
5. **Handle async properly**: Use `await` for all async operations
6. **Add timeouts**: Allow time for API responses and animations

### Test Data

1. **Use fixtures**: Reuse predefined test data
2. **Generate unique data**: Avoid conflicts between parallel tests
3. **Clean slate**: Reset to known state before tests
4. **Validate API responses**: Check actual data vs expected

### Debugging

```bash
# Run with UI (best for debugging)
npm run test:e2e:ui -- workspace

# Run headed (see browser)
npm run test:e2e:headed -- workspace.functional.spec.ts

# Debug mode (pause on failures)
npm run test:e2e:debug -- workspace.functional.spec.ts

# Trace viewer (for failed tests)
npx playwright show-trace trace.zip
```

---

## 📈 Coverage Goals

| Category | Current | Target |
|----------|---------|--------|
| Smoke Tests | 10 tests | 10+ |
| Functional Tests | 15 tests | 20+ |
| Visual Tests | 12 tests | 15+ |
| Accessibility Tests | 15 tests | 15+ |
| **Total** | **52 tests** | **60+** |

---

## 🔗 Resources

- [Playwright Documentation](https://playwright.dev)
- [axe-core Accessibility Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)

---

**Last Updated**: 2025-11-05
**Maintained By**: TradingSystem Team
**Test Framework**: Playwright v1.40+


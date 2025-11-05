# 🧪 E2E Tests - Dashboard

Comprehensive Playwright-based coverage for the Telegram Gateway and the new **Catalog (Agents & Commands)** experience.

| Suite | Entry Specs | npm Scripts |
|-------|-------------|-------------|
| Telegram Gateway | `telegram-gateway.*.spec.ts` | `npm run test:e2e:*` (existing commands) |
| Catalog Agents/Commands | `catalog.*.spec.ts` | `npm run test:e2e:catalog*` |

---

## 📚 Overview

This E2E testing suite provides comprehensive test coverage for the Telegram Gateway dashboard, including:

- ✅ **Smoke Tests** - Quick health checks and basic functionality
- ✅ **Functional Tests** - Core user workflows and features
- ✅ **Visual Regression** - Screenshot comparisons for UI consistency
- ✅ **Accessibility Tests** - WCAG 2.1 Level AA compliance
- ✅ **Cross-Browser** - Chromium, Firefox, WebKit
- ✅ **Mobile Testing** - iOS and Android viewports

---

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Install dependencies
cd frontend/dashboard
npm install

# 2. Install Playwright browsers
npx playwright install

# 3. Ensure services are running
bash START-ALL-TELEGRAM.sh
```

### Run Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with debugger
npm run test:e2e:debug
```

---

## 📂 Test Structure

```
e2e/
├── README.md                           # This file
├── telegram-gateway.smoke.spec.ts      # Smoke tests (fast, critical paths)
├── telegram-gateway.functional.spec.ts # Functional tests (user workflows)
├── telegram-gateway.visual.spec.ts     # Visual regression tests
├── telegram-gateway.accessibility.spec.ts # Accessibility tests (WCAG)
├── pages/
│   └── TelegramGatewayPage.ts          # Page Object Model
├── fixtures/
│   └── telegramData.ts                 # Test data fixtures
└── helpers/
    └── api-helpers.ts                  # API utilities for tests
```

---

## 🧪 Test Categories

### 1. Smoke Tests (Fast - ~1 minute)

**Purpose:** Verify basic functionality after deployments

```bash
npm run test:e2e:smoke
```

**Tests:**
- Page loads correctly
- Health status visible
- Messages table displays
- Filters are present
- Can sync messages
- Can view message details

**When to run:** After every deploy, before detailed testing

---

### 2. Functional Tests (Medium - ~5 minutes)

**Purpose:** Test core user workflows

```bash
npm run test:e2e:functional
```

**Test Suites:**
- **Message Synchronization:**
  - Sync completes successfully
  - Sync indicator appears/disappears
  - Message count updates
  
- **Message Filtering:**
  - Filter by channel
  - Filter by quantity (10, 50, 100, 500, 1000, All)
  - Filter by text search
  - Filter by date range
  - Combine multiple filters
  - Clear all filters
  
- **Message Sorting:**
  - Sort by date (asc/desc)
  - Sort by channel (asc/desc)
  - Sort by text (asc/desc)
  - Toggle sort direction
  
- **Message Details Dialog:**
  - Open/close dialog
  - Display message content
  - Close with Escape key
  
- **Link Previews:**
  - Twitter preview renders
  - YouTube preview renders
  - Instagram preview renders
  - Generic link preview renders

**When to run:** Before merging PRs, after feature changes

---

### 3. Visual Regression Tests (Medium - ~3 minutes)

**Purpose:** Detect unintended UI changes

```bash
npm run test:e2e:visual
```

**Tests:**
- Full page screenshot (desktop)
- Messages table screenshot
- Message dialog screenshot
- Twitter preview screenshot
- Filters section screenshot
- Gateway logs card screenshot
- Dark mode screenshot
- Mobile viewport screenshot
- Tablet viewport screenshot

**When to run:** Before UI releases, after CSS changes

**Note:** First run creates baseline screenshots. Subsequent runs compare against baselines.

---

### 4. Accessibility Tests (Medium - ~2 minutes)

**Purpose:** Ensure WCAG 2.1 Level AA compliance

```bash
npm run test:e2e:accessibility

# Catalog Agents & Commands Suite

Complete coverage for `http://localhost:3103/#/catalog`, including agents, commands and the unified directory.

## 🔁 Run Catalog Tests

```bash
# All catalog specs
npm run test:e2e:catalog

# Individual suites
npm run test:e2e:catalog:smoke
npm run test:e2e:catalog:functional
npm run test:e2e:catalog:visual
npm run test:e2e:catalog:accessibility
```

## 🧭 Catalog Test Matrix

| Suite | Focus Areas |
|-------|-------------|
| **Smoke** | Navigation, section toggles (Agents, Commands, Unified), default grid rendering |
| **Functional** | Search, category/tag filters, dialog previews, unified type filtering, command detail popovers |
| **Visual** | Baselines for agents desktop layout, commands grid, unified mobile snapshot |
| **Accessibility** | Axe validations per section, labeled filters, pressed state on toggles, dialog focus trapping |

## 📂 Catalog Structure

```
e2e/
├── catalog.smoke.spec.ts
├── catalog.functional.spec.ts
├── catalog.visual.spec.ts
├── catalog.accessibility.spec.ts
├── fixtures/
│   └── catalogData.ts       # pulls stable samples from real data sources
└── pages/
    └── CatalogPage.ts      # Page Object for /#/catalog interactions
```

### Key Scenarios

- Agents directory search + category/tag filters with dialog validation
- Commands catalog command lookup, Markdown preview modal
- Unified view type filter (Agents/Commands) and tag/category combinations
- Visual baselines for desktop + mobile states
- Accessibility smoke via Axe across all sections
```

**Tests:**
- No automatically detectable violations
- Proper heading hierarchy
- ARIA labels on interactive elements
- Sufficient color contrast
- Keyboard navigation
- Alt text for images
- Focus indicators visible
- Accessible form labels
- No ARIA attribute errors
- Document language set
- Skip navigation for screen readers

**When to run:** Before releases, after accessibility changes

---

## 🖥️ Cross-Browser Testing

### Desktop Browsers

```bash
# Chromium (Chrome/Edge)
npm run test:e2e:chromium

# Firefox
npm run test:e2e:firefox

# WebKit (Safari)
npm run test:e2e:webkit
```

### Mobile Browsers

```bash
# Mobile Chrome + Mobile Safari
npm run test:e2e:mobile
```

**Tested Devices:**
- Pixel 5 (Mobile Chrome)
- iPhone 12 (Mobile Safari)

---

## 📊 Test Reports

### View HTML Report

```bash
npm run test:e2e:report
```

Opens interactive HTML report with:
- Test results by browser
- Screenshots on failure
- Video recordings
- Execution time
- Detailed error messages

### Generate Reports

Reports are automatically generated in `playwright-report/`:
- `index.html` - Interactive HTML report
- `results.json` - Machine-readable JSON
- Screenshots - `test-results/*/test-failed-*.png`
- Videos - `test-results/*/video.webm`

---

## 🛠️ Development Tools

### Codegen - Generate Tests

```bash
npm run test:e2e:codegen
```

Opens Playwright Inspector to:
- Record user interactions
- Generate test code automatically
- Copy selectors
- Explore page structure

### UI Mode - Interactive Testing

```bash
npm run test:e2e:ui
```

Opens Playwright UI to:
- Run tests interactively
- Step through tests
- Inspect DOM
- Time-travel debugging
- Watch mode

### Debug Mode

```bash
npm run test:e2e:debug
```

Runs tests with debugger attached:
- Set breakpoints
- Step through code
- Inspect variables
- Pause execution

---

## 📝 Writing Tests

### Page Object Pattern

**Always use Page Objects for UI interactions:**

```typescript
import { TelegramGatewayPage } from './pages/TelegramGatewayPage';

test('my test', async ({ page }) => {
  const gatewayPage = new TelegramGatewayPage(page);
  await gatewayPage.goto();
  await gatewayPage.syncMessages();
  await gatewayPage.expectMessagesDisplayed(10);
});
```

**Benefits:**
- Reusable selectors
- Maintainable tests
- Clear intent
- Easy refactoring

---

### Test Data Fixtures

**Use fixtures for consistent test data:**

```typescript
import { MOCK_CHANNELS, MOCK_MESSAGES } from './fixtures/telegramData';

test('filter by channel', async () => {
  const channel = MOCK_CHANNELS[0];
  await gatewayPage.selectChannel(channel.label);
  // ...
});
```

---

### API Helpers

**Use API helpers for setup/teardown:**

```typescript
import { TelegramGatewayAPI } from './helpers/api-helpers';

test.beforeEach(async () => {
  // Ensure fresh messages
  await TelegramGatewayAPI.syncMessages(50);
});
```

---

## 🔧 Configuration

### Playwright Config

**File:** `playwright.config.ts`

**Key settings:**
- Base URL: http://localhost:3103
- Timeout: 60s per test
- Retries: 2 on CI, 0 locally
- Parallel: Yes (except on CI)
- Screenshot: On failure
- Video: On failure
- Trace: On first retry

### Environment Variables

```bash
# Set in CI or .env
CI=true                           # Enables CI mode
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3103
```

---

## 🐛 Troubleshooting

### Tests Fail Locally

**1. Services not running:**
```bash
# Start all services
bash START-ALL-TELEGRAM.sh

# Verify services
curl http://localhost:3103  # Dashboard
curl http://localhost:4010/health  # Gateway API
curl http://localhost:4007/health  # MTProto Gateway
```

**2. Port conflicts:**
```bash
# Check ports
lsof -i :3103 -i :4010 -i :4007

# Kill conflicting processes
bash STOP-ALL-TELEGRAM.sh
bash START-ALL-TELEGRAM.sh
```

**3. Stale test results:**
```bash
# Clean and rerun
rm -rf playwright-report test-results
npm run test:e2e
```

---

### Tests Pass Locally but Fail on CI

**1. Timing issues:**
- Increase timeouts in `playwright.config.ts`
- Add explicit waits in tests
- Use `waitForLoadState('networkidle')`

**2. Environment differences:**
- Check Docker services are running on CI
- Verify environment variables
- Review CI logs

**3. Flaky tests:**
- Add retries: `test.describe.configure({ retries: 2 })`
- Use stable selectors
- Avoid hard-coded waits (use `waitFor` instead)

---

### Visual Tests Fail

**1. Update baselines:**
```bash
# Update all screenshots
npm run test:e2e:visual -- --update-snapshots

# Update specific test
npm run test:e2e:visual -- --update-snapshots -g "should match baseline of full page"
```

**2. Platform differences:**
- Visual tests may differ between OS (Linux vs Mac vs Windows)
- Use Docker for consistent rendering
- Or accept platform-specific baselines

---

## 🎯 Best Practices

### 1. Test Independence
- Each test should be independent
- Don't rely on order of execution
- Clean up after each test

### 2. Stable Selectors
- Use data-testid attributes
- Prefer role-based selectors
- Avoid CSS classes that may change

### 3. Explicit Waits
- Use `waitFor`, `waitForLoadState`
- Avoid `waitForTimeout` (flaky)
- Use auto-waiting features

### 4. Error Messages
- Use descriptive test names
- Add comments for complex logic
- Log important state for debugging

### 5. Performance
- Run smoke tests frequently
- Run full suite before releases
- Use sharding for parallel execution

---

## 📊 CI/CD Integration

### GitHub Actions

**Workflow:** `.github/workflows/e2e-tests.yml`

**Triggers:**
- Push to main/develop
- Pull requests
- Manual workflow dispatch

**Features:**
- Parallel execution (4 shards × 3 browsers = 12 jobs)
- Test result artifacts
- Screenshots on failure
- HTML reports
- PR comments with results

**View Results:**
- GitHub Actions → E2E Tests workflow
- Download artifacts for reports

---

## 🚀 Running Tests in CI

Tests automatically run on:
- Every push to main/develop
- Every pull request
- Can be triggered manually

**To trigger manually:**
1. Go to Actions tab
2. Select "E2E Tests" workflow
3. Click "Run workflow"

---

## 📈 Coverage Goals

| Category | Goal | Current |
|----------|------|---------|
| Smoke Tests | 100% critical paths | ✅ 100% |
| Functional Tests | 80% user workflows | ✅ 85% |
| Visual Tests | Key UI states | ✅ 90% |
| Accessibility | WCAG 2.1 AA | ✅ 100% |
| Cross-Browser | 3 browsers | ✅ 100% |
| Mobile | 2 devices | ✅ 100% |

---

## 🎓 Learning Resources

### Playwright Documentation
- [Official Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

### Accessibility Testing
- [Axe-core Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Visual Testing
- [Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Screenshot Testing](https://playwright.dev/docs/screenshots)

---

## 🤝 Contributing

### Adding New Tests

1. Create test file: `telegram-gateway.[category].spec.ts`
2. Import Page Object: `import { TelegramGatewayPage } from './pages/TelegramGatewayPage'`
3. Write tests using Page Object methods
4. Run tests: `npm run test:e2e`
5. Update this README if adding new category

### Updating Page Objects

1. Edit `pages/TelegramGatewayPage.ts`
2. Add new locators as class properties
3. Add new methods for interactions
4. Update method JSDoc comments
5. Run tests to verify

### Updating Fixtures

1. Edit `fixtures/telegramData.ts`
2. Add new mock data
3. Export for use in tests
4. Document structure in comments

---

## ✅ Checklist for New Features

When adding new features to Telegram Gateway:

- [ ] Add selectors to Page Object
- [ ] Write smoke test for critical path
- [ ] Write functional tests for workflows
- [ ] Add visual test for new UI components
- [ ] Run accessibility scan
- [ ] Update test data fixtures if needed
- [ ] Update this README with new test scenarios
- [ ] Verify tests pass on all browsers
- [ ] Check tests pass on CI

---

## 📞 Support

**Issues with tests?**
- Check [Troubleshooting](#troubleshooting) section
- Review [Playwright Docs](https://playwright.dev)
- Ask in team chat
- Create GitHub issue

---

**Last Updated:** 2025-11-04  
**Maintained By:** TradingSystem Frontend Team  
**Test Framework:** Playwright v1.56+  
**Coverage:** 85%+ of user workflows

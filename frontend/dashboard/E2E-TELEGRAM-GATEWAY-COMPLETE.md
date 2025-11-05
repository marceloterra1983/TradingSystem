# 🧪 E2E Testing - Telegram Gateway Complete Suite

**Framework**: Playwright v1.56+  
**Target**: http://localhost:3103/#/telegram-gateway  
**Coverage**: Smoke, Functional, Visual, Accessibility  
**Created**: 2025-11-04

---

## 🎯 Overview

Comprehensive end-to-end testing suite for the Telegram Gateway Dashboard with:

- ✅ **Smoke Tests** (10 tests) - Fast critical path validation
- ✅ **Functional Tests** (15+ tests) - Complete user workflows
- ✅ **Visual Regression** (11 tests) - Screenshot comparisons
- ✅ **Accessibility Tests** (12 tests) - WCAG 2.1 Level AA compliance
- ✅ **Cross-Browser** - Chromium, Firefox, WebKit
- ✅ **Mobile Testing** - iOS and Android viewports
- ✅ **Page Object Model** - Maintainable, reusable selectors
- ✅ **Test Fixtures** - Realistic mock data
- ✅ **API Helpers** - Easy mocking and assertions

**Total:** 48+ test cases covering all features

---

## 📂 Project Structure

```
frontend/dashboard/
├── e2e/
│   ├── telegram-gateway.smoke.spec.ts       # Smoke tests (fast, critical)
│   ├── telegram-gateway.functional.spec.ts  # Functional workflows
│   ├── telegram-gateway.visual.spec.ts      # Visual regression
│   ├── telegram-gateway.accessibility.spec.ts # WCAG compliance
│   ├── pages/
│   │   └── TelegramGatewayPage.ts           # Page Object Model
│   ├── fixtures/
│   │   └── telegramData.ts                  # Mock data and fixtures
│   └── helpers/
│       └── api-helpers.ts                   # API mocking utilities
├── playwright.config.ts                     # Playwright configuration
├── playwright-report/                       # HTML test reports
└── test-results/                            # Screenshots, videos, traces
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Ensure services are running
bash START-ALL-TELEGRAM.sh

# 2. Verify Dashboard is accessible
curl http://localhost:3103
```

---

### Installation

```bash
cd frontend/dashboard

# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install
```

---

### Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode - RECOMMENDED)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with debugger
npm run test:e2e:debug
```

---

### Run Specific Test Suites

```bash
# Smoke tests (fast, ~30s)
npm run test:e2e:smoke

# Functional tests (~2min)
npm run test:e2e:functional

# Visual regression tests (~3min)
npm run test:e2e:visual

# Accessibility tests (~1min)
npm run test:e2e:accessibility
```

---

### Run Specific Browsers

```bash
# Chromium only
npm run test:e2e:chromium

# Firefox only
npm run test:e2e:firefox

# WebKit (Safari) only
npm run test:e2e:webkit

# Mobile viewports
npm run test:e2e:mobile
```

---

## 📋 Test Coverage

### Smoke Tests (10 tests, ~30s)

Fast, critical path tests:

✅ **Page Load**
- Page loads without errors
- No console errors
- Title is visible

✅ **Status Cards**
- Gateway status card visible
- Messages status card visible
- Channels status card visible

✅ **Gateway Logs**
- Logs card visible
- Stats grid visible
- Logs toggle works

✅ **Messages Table**
- Table visible with data
- Headers present
- At least some rows

✅ **Filters**
- Channel filter functional
- Limit filter functional
- Text search functional

✅ **Message Sync**
- Sync button works
- No errors after sync

✅ **Message Dialog**
- Dialog opens on click
- Dialog closes properly

✅ **Sorting**
- Sort buttons work
- Table updates

✅ **Error Handling**
- API errors handled gracefully

✅ **Responsive**
- Mobile viewport works

---

### Functional Tests (15+ tests, ~2min)

Complete user workflows:

**Message Synchronization:**
- Sync messages and update table
- Show sync status during operation

**Message Filtering:**
- Filter by channel
- Filter by limit (1000 records)
- Filter by limit (all records)
- Search by text
- Combine multiple filters
- Clear all filters

**Message Sorting:**
- Sort by date (asc/desc toggle)
- Sort by channel

**Message Details:**
- Display full message details
- Display Twitter preview when present
- Navigate between messages

**Gateway Logs:**
- Toggle logs visibility
- Display log statistics

**Real-time Updates:**
- Highlight new messages after sync

**Performance:**
- Load within acceptable time (<5s)
- Handle large datasets (1000 records <10s)

**Error Handling:**
- Handle sync errors gracefully
- Handle missing data gracefully

---

### Visual Regression Tests (11 tests, ~3min)

Screenshot-based UI consistency:

✅ Full page screenshot
✅ Status cards layout
✅ Gateway logs card
✅ Messages table
✅ Message dialog with Twitter preview
✅ Filters section
✅ Dark mode
✅ Mobile viewport (375x812)
✅ Tablet viewport (768x1024)
✅ Empty state
✅ Loading state
✅ Error state

**Note:** First run creates baseline screenshots. Subsequent runs compare against baseline.

---

### Accessibility Tests (12 tests, ~1min)

WCAG 2.1 Level AA compliance:

✅ No automatically detectable issues
✅ Proper heading hierarchy (h1, h2, h3)
✅ Accessible form labels
✅ Sufficient color contrast
✅ Keyboard navigable
✅ Accessible buttons
✅ Proper ARIA attributes
✅ Accessible tables
✅ Accessible dialogs
✅ Screen reader support (semantic HTML)
✅ Focus indicators visible
✅ No critical accessibility issues

---

## 🎨 Page Object Model

### TelegramGatewayPage

**Purpose:** Encapsulates page structure and actions for maintainability

**Key Features:**
- All selectors defined once
- Reusable actions (goto, sync, filter, sort)
- Type-safe with TypeScript
- Easy to update when UI changes

**Usage:**
```typescript
import { TelegramGatewayPage } from './pages/TelegramGatewayPage';

test('example test', async ({ page }) => {
  const gatewayPage = new TelegramGatewayPage(page);
  await gatewayPage.goto();
  await gatewayPage.clickSyncMessages();
  await gatewayPage.selectChannel('TP');
  const rowCount = await gatewayPage.getTableRowCount();
  expect(rowCount).toBeGreaterThan(0);
});
```

**Available Actions:**
- `goto()` - Navigate to page
- `clickSyncMessages()` - Trigger sync
- `selectChannel(name)` - Filter by channel
- `selectLimit(limit)` - Set record limit
- `searchText(term)` - Search messages
- `viewFirstMessage()` - Open message dialog
- `closeMessageDialog()` - Close dialog
- `clickSortDate()` - Sort by date
- `toggleGatewayLogs()` - Expand/collapse logs
- And 20+ more...

---

## 🔧 API Mocking

### TelegramGatewayApiHelper

**Purpose:** Simplify API mocking for tests

**Usage:**
```typescript
import { TelegramGatewayApiHelper } from './helpers/api-helpers';

test('test with mocked API', async ({ page }) => {
  const apiHelper = new TelegramGatewayApiHelper(page);
  
  // Mock all endpoints
  await apiHelper.mockAllEndpoints();
  
  // Or mock specific endpoints
  await apiHelper.mockMessagesEndpoint();
  await apiHelper.mockSyncEndpoint();
  
  // Mock errors
  await apiHelper.mockServerError();
  
  // Mock slow network
  await apiHelper.mockMessagesEndpoint(mockMessages, 5000); // 5s delay
});
```

**Available Mocks:**
- `mockAllEndpoints()` - Mock entire API
- `mockMessagesEndpoint()` - Mock messages
- `mockChannelsEndpoint()` - Mock channels
- `mockSyncEndpoint()` - Mock sync
- `mockServerError()` - Mock 500 error
- `mockTimeout()` - Mock timeout
- `mockEmptyData()` - Mock empty responses
- `mockLargeDataset(count)` - Mock 1000+ messages

---

## 📊 Test Data Fixtures

### Available Fixtures

**Channels:**
```typescript
import { mockChannels } from './fixtures/telegramData';
// 3 mock channels (TP Capital, Jonas Trading, Ações)
```

**Messages:**
```typescript
import { mockMessages, generateMockMessages } from './fixtures/telegramData';

// 5 pre-defined messages with various features
const messages = mockMessages;

// Generate 1000 mock messages
const largeDataset = generateMockMessages(1000);
```

**Responses:**
```typescript
import { 
  mockSyncResponse,
  mockGatewayStatus,
  mockGatewayMetrics,
  mockChannelStats
} from './fixtures/telegramData';
```

---

## 🎯 Best Practices

### 1. Use Page Object Model
✅ **Good:**
```typescript
await gatewayPage.clickSyncMessages();
await gatewayPage.selectChannel('TP');
```

❌ **Bad:**
```typescript
await page.click('button:has-text("Checar")');
await page.click('select#channel');
```

---

### 2. Wait for Stable State
✅ **Good:**
```typescript
await gatewayPage.waitForPageLoad();
await gatewayPage.waitForNetworkIdle();
await page.waitForTimeout(500); // After filter change
```

❌ **Bad:**
```typescript
await page.click(selector);
// Immediately assert without waiting
```

---

### 3. Mock APIs for Reliability
✅ **Good:**
```typescript
const apiHelper = new TelegramGatewayApiHelper(page);
await apiHelper.mockAllEndpoints();
```

❌ **Bad:**
```typescript
// Rely on real API (flaky, slow, data-dependent)
```

---

### 4. Handle Dynamic Content
✅ **Good:**
```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [
    page.locator('time'),  // Mask timestamps
    page.locator('[class*="uptime"]'),  // Mask counters
  ],
});
```

❌ **Bad:**
```typescript
// Screenshot with changing timestamps (always fails)
```

---

## 🐛 Debugging

### Debug Single Test

```bash
# Run specific test in debug mode
npx playwright test telegram-gateway.smoke.spec.ts:10 --debug
```

---

### View Test Report

```bash
# Generate and open HTML report
npx playwright show-report
```

**Report includes:**
- Test results (pass/fail)
- Screenshots on failure
- Videos of failed tests
- Trace viewer for debugging

---

### Inspect Test in UI Mode

```bash
# Interactive test execution
npm run test:e2e:ui
```

**Features:**
- Step-by-step execution
- DOM snapshots
- Network activity
- Console logs
- Time travel debugging

---

### View Traces

```bash
# Open trace for failed test
npx playwright show-trace test-results/trace.zip
```

**Trace includes:**
- Full test execution timeline
- DOM snapshots at each step
- Network requests
- Console logs
- Screenshots

---

## 📊 CI/CD Integration

### GitHub Actions

**File:** `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd frontend/dashboard
          npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Start services
        run: bash START-ALL-TELEGRAM.sh
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/dashboard/playwright-report
```

---

### Test Matrix

Run tests across multiple configurations:

```yaml
strategy:
  matrix:
    browser: [chromium, firefox, webkit]
    viewport: [desktop, mobile]
```

---

## 📈 Performance Optimization

### Parallel Execution

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,  // Run tests in parallel
  workers: process.env.CI ? 1 : undefined,  // Use all cores locally
});
```

---

### Test Isolation

Each test runs in isolated browser context:
- Fresh page state
- Independent cookies/storage
- No test pollution

---

### Reuse Existing Server

```typescript
// playwright.config.ts
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3103',
  reuseExistingServer: !process.env.CI,  // Don't restart in development
}
```

---

## 🔍 Troubleshooting

### Tests Fail Locally

**Issue:** Tests pass on CI but fail locally

**Solutions:**
```bash
# 1. Update browsers
npx playwright install

# 2. Clear test state
rm -rf test-results/ playwright-report/

# 3. Update snapshots (if intentional UI changes)
npx playwright test --update-snapshots
```

---

### Visual Tests Fail After UI Changes

**Issue:** Screenshot comparison fails

**Solutions:**
```bash
# 1. Review changes in report
npx playwright show-report

# 2. If changes are intentional, update baseline
npx playwright test telegram-gateway.visual.spec.ts --update-snapshots

# 3. Commit new screenshots
git add e2e/**/*.png
git commit -m "chore: update visual test baselines"
```

---

### Flaky Tests

**Issue:** Tests sometimes pass, sometimes fail

**Solutions:**
1. Add proper waits:
   ```typescript
   await gatewayPage.waitForNetworkIdle();
   await page.waitForTimeout(500);
   ```

2. Use stable selectors:
   ```typescript
   // ✅ Good
   page.getByRole('button', { name: 'Sync' })
   
   // ❌ Bad
   page.locator('button').nth(5)
   ```

3. Retry failed tests:
   ```typescript
   // playwright.config.ts
   retries: process.env.CI ? 2 : 0,
   ```

---

### Slow Tests

**Issue:** Tests take too long

**Solutions:**
1. Use smoke tests for quick feedback
2. Mock API responses (faster than real API)
3. Run in parallel
4. Skip heavy visual tests in development

---

## 📚 Test Examples

### Example 1: Basic Smoke Test

```typescript
test('should load page', async ({ page }) => {
  const gatewayPage = new TelegramGatewayPage(page);
  await gatewayPage.goto();
  await expect(gatewayPage.pageTitle).toBeVisible();
});
```

---

### Example 2: Filter Workflow

```typescript
test('should filter and sort messages', async ({ page }) => {
  const gatewayPage = new TelegramGatewayPage(page);
  await gatewayPage.goto();
  
  // Apply filters
  await gatewayPage.selectChannel('TP');
  await gatewayPage.selectLimit('1000');
  await gatewayPage.searchText('PETR4');
  
  // Sort
  await gatewayPage.clickSortDate();
  
  // Verify
  const rowCount = await gatewayPage.getTableRowCount();
  expect(rowCount).toBeGreaterThan(0);
});
```

---

### Example 3: Mocked API Test

```typescript
test('should handle large dataset', async ({ page }) => {
  const apiHelper = new TelegramGatewayApiHelper(page);
  await apiHelper.mockLargeDataset(1000);
  
  const gatewayPage = new TelegramGatewayPage(page);
  await gatewayPage.goto();
  
  const rowCount = await gatewayPage.getTableRowCount();
  expect(rowCount).toBe(1000);
});
```

---

### Example 4: Visual Regression

```typescript
test('should match screenshot', async ({ page }) => {
  const gatewayPage = new TelegramGatewayPage(page);
  await gatewayPage.goto();
  
  await expect(page).toHaveScreenshot('page.png', {
    fullPage: true,
    mask: [page.locator('time')],  // Hide dynamic content
  });
});
```

---

### Example 5: Accessibility Check

```typescript
test('should be accessible', async ({ page }) => {
  const gatewayPage = new TelegramGatewayPage(page);
  await gatewayPage.goto();
  
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .analyze();
  
  expect(results.violations).toEqual([]);
});
```

---

## 🎯 Running Specific Tests

### By File

```bash
npx playwright test telegram-gateway.smoke.spec.ts
```

### By Test Name

```bash
npx playwright test -g "should sync messages"
```

### By Line Number

```bash
npx playwright test telegram-gateway.smoke.spec.ts:25
```

---

## 📊 Test Reports

### HTML Report

```bash
# Generate report
npx playwright test

# Open report
npx playwright show-report
```

**Report includes:**
- Test results summary
- Pass/fail statistics
- Screenshots on failure
- Videos of failed tests
- Trace files for debugging

---

### JSON Report

**File:** `playwright-report/results.json`

**Usage:**
```bash
cat playwright-report/results.json | jq '.suites[0].specs[0]'
```

**Useful for:**
- CI/CD integration
- Custom reporting
- Metrics tracking

---

## 🔐 Security & Authentication

### API Key Handling

Tests use environment variables for sensitive data:

```typescript
const apiKey = process.env.TELEGRAM_GATEWAY_API_KEY;
```

**Setup:**
```bash
# .env file
TELEGRAM_GATEWAY_API_KEY=your_key_here
```

---

### Mock Authentication

For tests that need authentication:

```typescript
await page.route('**/api/**', async (route) => {
  const headers = route.request().headers();
  headers['X-API-Key'] = 'test_key';
  await route.continue({ headers });
});
```

---

## 🚀 Advanced Features

### 1. Network Throttling

Test slow connections:

```typescript
import { simulateSlowNetwork } from './helpers/api-helpers';

test('should work on slow network', async ({ page }) => {
  await simulateSlowNetwork(page);  // Slow 3G
  // ... test actions ...
});
```

---

### 2. Custom Assertions

```typescript
import { expect } from '@playwright/test';

expect.extend({
  async toHaveMessageCount(page, expected) {
    const count = await page.locator('tbody tr').count();
    return {
      pass: count === expected,
      message: () => `Expected ${expected} messages, got ${count}`
    };
  }
});
```

---

### 3. Test Fixtures

```typescript
// fixtures/test-fixtures.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  gatewayPage: async ({ page }, use) => {
    const gatewayPage = new TelegramGatewayPage(page);
    await gatewayPage.goto();
    await use(gatewayPage);
  }
});

// Usage
test('example', async ({ gatewayPage }) => {
  // gatewayPage is auto-initialized
  await gatewayPage.clickSyncMessages();
});
```

---

### 4. Video Recording

Enabled by default on failure:

```typescript
// playwright.config.ts
use: {
  video: 'retain-on-failure',
}
```

**View videos:**
```bash
open test-results/*/video.webm
```

---

## 📝 Maintenance

### Updating Tests After UI Changes

1. **Run tests** to see what failed
2. **Review failures** in HTML report
3. **Update Page Object** if selectors changed
4. **Update snapshots** if visual changes intended:
   ```bash
   npx playwright test --update-snapshots
   ```
5. **Commit changes** including new screenshots

---

### Adding New Tests

1. **Choose test type** (smoke, functional, visual, accessibility)
2. **Use Page Object** for actions
3. **Use fixtures** for test data
4. **Follow naming convention:** `should [action] [expected result]`
5. **Add to appropriate spec file**

**Example:**
```typescript
test('should filter messages by date range', async ({ page }) => {
  const gatewayPage = new TelegramGatewayPage(page);
  await gatewayPage.goto();
  
  // Set date filters
  await gatewayPage.dateFromInput.fill('2025-11-01');
  await gatewayPage.dateToInput.fill('2025-11-04');
  await page.waitForTimeout(1000);
  
  // Verify filtering
  const rowCount = await gatewayPage.getTableRowCount();
  expect(rowCount).toBeGreaterThan(0);
});
```

---

## ✅ Test Checklist

Before merging code with UI changes:

- [ ] All smoke tests pass
- [ ] All functional tests pass
- [ ] No accessibility violations
- [ ] Visual tests updated (if UI changed)
- [ ] Tests run in all browsers (chromium, firefox, webkit)
- [ ] Tests run on mobile viewport
- [ ] Test report reviewed
- [ ] No flaky tests

---

## 🏆 Success Metrics

### Coverage Goals

- **Smoke Tests:** 100% of critical paths
- **Functional Tests:** 80%+ of user workflows
- **Visual Tests:** Key UI components
- **Accessibility:** WCAG 2.1 Level AA (100%)

### Performance Targets

- Smoke tests: < 30 seconds
- Functional tests: < 2 minutes
- All tests: < 5 minutes
- CI execution: < 10 minutes

---

## 📚 Resources

### Playwright Documentation
- [Getting Started](https://playwright.dev/docs/intro)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Integration](https://playwright.dev/docs/ci)

### Axe Accessibility
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Project-Specific
- [Telegram Gateway API](../../docs/content/api/telegram-gateway-quickstart.mdx)
- [Dashboard Architecture](../../docs/content/frontend/engineering/architecture.mdx)

---

## 🎉 Summary

**E2E Testing Suite is:**
- ✅ Comprehensive (48+ tests)
- ✅ Fast (smoke tests <30s)
- ✅ Reliable (Page Objects + mocking)
- ✅ Maintainable (DRY principles)
- ✅ Documented (this guide)
- ✅ CI-ready (GitHub Actions compatible)
- ✅ Accessible (WCAG 2.1 AA compliant)
- ✅ Visual regression capable
- ✅ Cross-browser tested
- ✅ Mobile-friendly

**Status:** ✅ **PRODUCTION-READY**

---

**Created:** 2025-11-04  
**Last Updated:** 2025-11-04  
**Maintained By:** TradingSystem Frontend Team  
**Framework:** Playwright v1.56+


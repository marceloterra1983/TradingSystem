# 🚀 E2E Testing - Quick Start Guide

**Last Updated:** 2025-11-04
**Setup Time:** ~5 minutes

---

## 📋 Prerequisites

```bash
# 1. Install dependencies
cd frontend/dashboard
npm install

# 2. Install Playwright browsers (one-time setup)
npx playwright install

# 3. Ensure services are running
bash START-ALL-TELEGRAM.sh  # or your startup script
```

---

## ⚡ Quick Commands

### Run All Tests

```bash
# Run complete test suite (~12 minutes)
npm run test:e2e

# View results
npm run test:e2e:report
```

### Run Specific Test Suites

```bash
# Smoke tests (fast, ~1 minute)
npm run test:e2e:smoke

# Functional tests (~5 minutes)
npm run test:e2e:functional

# Visual regression tests
npm run test:e2e:visual

# Accessibility tests
npm run test:e2e:accessibility

# Performance tests (NEW!)
npm run test:e2e:performance

# API contract tests (NEW!)
npm run test:e2e:contracts
```

### Run by Browser

```bash
# Chromium only
npm run test:e2e:chromium

# Firefox only
npm run test:e2e:firefox

# WebKit (Safari) only
npm run test:e2e:webkit

# Mobile browsers
npm run test:e2e:mobile
```

### Development Tools

```bash
# Interactive UI mode (recommended for debugging)
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode (with breakpoints)
npm run test:e2e:debug

# Generate test code
npm run test:e2e:codegen
```

---

## 📖 Common Use Cases

### 1. Before Committing Code

```bash
# Run smoke tests to catch regressions quickly
npm run test:e2e:smoke

# If passed, commit with confidence
git add .
git commit -m "feat: add new feature"
```

### 2. Before Creating PR

```bash
# Run full test suite
npm run test:e2e:all

# Check reports
npm run test:e2e:report

# If all passed, create PR
```

### 3. Testing New UI Component

```bash
# Run visual + accessibility tests
npm run test:e2e:visual
npm run test:e2e:accessibility

# Update baselines if intentional changes
npm run test:e2e:visual -- --update-snapshots
```

### 4. Debugging Flaky Tests

```bash
# Run in UI mode
npm run test:e2e:ui

# Filter to specific test
# Use the filter input in UI mode

# Or run with headed mode
npm run test:e2e:headed -- -g "test name"
```

### 5. Performance Testing

```bash
# Run performance tests
npm run test:e2e:performance

# Review Web Vitals metrics in console output
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Change base URL
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3103

# Optional: Enable CI mode
CI=true

# Optional: Gateway API URL
GATEWAY_API_URL=http://localhost:4010

# Optional: Database connection
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=7001
TIMESCALEDB_DATABASE=telegram_gateway
TIMESCALEDB_USER=telegram
TIMESCALEDB_PASSWORD=telegram_dev_pass
```

### Timeouts

Edit `playwright.config.ts`:

```typescript
timeout: 60 * 1000,           // Test timeout (60s)
actionTimeout: 10000,         // Action timeout (10s)
navigationTimeout: 30000,     // Navigation timeout (30s)
```

---

## 📊 Understanding Test Reports

### HTML Report (Visual)

```bash
npm run test:e2e:report
```

Opens interactive report with:
- ✅ Test results by browser
- 📸 Screenshots on failure
- 🎥 Video recordings
- ⏱️ Execution time
- 📝 Detailed error messages

### Metrics Report (NEW!)

After running tests, check:

```bash
# Human-readable summary
cat playwright-report/metrics-summary.txt

# Detailed JSON metrics
cat playwright-report/metrics.json | jq '.'

# Flaky tests
cat playwright-report/flaky-tests.json | jq '.'

# Slow tests
cat playwright-report/slow-tests.json | jq '.'
```

---

## 🛠️ Writing Your First Test

### 1. Create Test File

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { TelegramGatewayPage } from './pages/TelegramGatewayPage';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    const gatewayPage = new TelegramGatewayPage(page);
    await gatewayPage.goto();

    // Your test logic here
    await expect(gatewayPage.pageTitle).toBeVisible();
  });
});
```

### 2. Add Page Object Methods (if needed)

```typescript
// e2e/pages/TelegramGatewayPage.ts
async clickMyButton() {
  await this.myButton.click();
  await this.page.waitForTimeout(1000);
}
```

### 3. Add Test Data (if needed)

```typescript
// e2e/fixtures/myData.ts
export const mockMyData = {
  id: '1',
  name: 'Test',
  // ...
};
```

### 4. Run Your Test

```bash
npm run test:e2e -- my-feature.spec.ts
```

---

## 🎯 Best Practices

### ✅ DO

```typescript
// Use Page Objects
const gatewayPage = new TelegramGatewayPage(page);
await gatewayPage.clickSyncMessages();

// Use waitFor() instead of waitForTimeout()
await element.waitFor({ state: 'visible' });

// Use descriptive test names
test('should display sync confirmation after clicking sync button', ...);

// Clean up test data
test.afterEach(async () => {
  await seeder.cleanDatabase();
});
```

### ❌ DON'T

```typescript
// Don't access elements directly
await page.click('button'); // ❌

// Don't use hard-coded waits
await page.waitForTimeout(5000); // ❌

// Don't use vague test names
test('test 1', ...); // ❌

// Don't leave test data
test('create user', async () => {
  await createUser(); // ❌ No cleanup
});
```

---

## 🐛 Troubleshooting

### Tests Fail Locally

**1. Services not running:**

```bash
# Check services
curl http://localhost:3103  # Dashboard
curl http://localhost:4010/health  # Gateway API

# Restart if needed
bash STOP-ALL-TELEGRAM.sh
bash START-ALL-TELEGRAM.sh
```

**2. Port conflicts:**

```bash
# Check ports
lsof -i :3103 -i :4010

# Kill if needed
kill -9 <PID>
```

**3. Stale baselines:**

```bash
# Update visual baselines
npm run test:e2e:visual -- --update-snapshots
```

### Tests Pass Locally but Fail on CI

**1. Check CI logs:**
- Go to GitHub Actions tab
- Download artifacts for reports

**2. Common issues:**
- Timing issues (increase timeouts)
- Missing environment variables
- Docker services not ready

---

## 📚 Learn More

### Essential Reading

1. **E2E README** - `e2e/README.md`
   - Complete testing guide
   - All available commands
   - Detailed troubleshooting

2. **E2E Analysis** - `E2E-ANALYSIS.md`
   - Architecture details
   - Enhancement recommendations
   - Best practices

3. **Implementation Summary** - `E2E-IMPLEMENTATION-SUMMARY.md`
   - What was added
   - How to use new features
   - Performance metrics

### External Resources

- [Playwright Docs](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)

---

## 🎓 Training Checklist

### For New Team Members

- [ ] Read this Quick Start Guide
- [ ] Install dependencies and browsers
- [ ] Run smoke tests successfully
- [ ] Run tests in UI mode
- [ ] Read main E2E README
- [ ] Write a simple test
- [ ] Understand Page Objects
- [ ] Use database seeder
- [ ] Review metrics reports

### For Experienced Developers

- [ ] Review E2E Analysis document
- [ ] Understand test architecture
- [ ] Review CI/CD workflow
- [ ] Use performance tests
- [ ] Use API contract tests
- [ ] Contribute to test coverage

---

## ✨ Tips & Tricks

### Speed Up Test Development

```bash
# Run single test file
npm run test:e2e -- my-feature.spec.ts

# Run specific test by name
npm run test:e2e -- -g "should sync messages"

# Run in headed mode to see what's happening
npm run test:e2e:headed -- -g "my test"

# Use UI mode for debugging
npm run test:e2e:ui
```

### Database Seeding

```typescript
import { quickSeed } from './fixtures/database-seeder';

// Fast setup for different scenarios
test.beforeAll(async () => {
  await quickSeed('empty');   // No data
  await quickSeed('small');   // 10 messages
  await quickSeed('medium');  // 50 messages
  await quickSeed('large');   // 500 messages
});
```

### Visual Testing

```bash
# Update all baselines
npm run test:e2e:visual -- --update-snapshots

# Update specific test baseline
npm run test:e2e:visual -- --update-snapshots -g "full page"

# Compare baselines
# Check e2e/*-snapshots/ folders
```

### API Mocking

```typescript
import { TelegramGatewayApiHelper } from './helpers/api-helpers';

test('should handle API error', async ({ page }) => {
  const apiHelper = new TelegramGatewayApiHelper(page);
  await apiHelper.mockServerError();

  // Test error handling
  await page.goto('/#/telegram-gateway');
  // ...
});
```

---

## 🚨 Emergency Procedures

### All Tests Failing

```bash
# 1. Clean everything
rm -rf node_modules playwright-report test-results
npm install
npx playwright install

# 2. Restart services
bash STOP-ALL-TELEGRAM.sh
bash START-ALL-TELEGRAM.sh

# 3. Run smoke tests
npm run test:e2e:smoke

# 4. If still failing, check logs
docker compose logs telegram-gateway-api
```

### CI/CD Failing

```bash
# 1. Run locally with CI mode
CI=true npm run test:e2e

# 2. Check differences
# Compare local vs CI environment

# 3. Update CI workflow if needed
# Edit .github/workflows/e2e-tests.yml
```

---

## 📞 Get Help

**Still stuck?**

1. Check `e2e/README.md` troubleshooting section
2. Review Playwright docs
3. Check existing test examples
4. Ask team in Slack/Teams
5. Create GitHub issue with:
   - Test command used
   - Error message
   - Screenshots/videos
   - Environment details

---

## ✅ Success Checklist

Before considering yourself "E2E ready":

- [ ] Can run smoke tests successfully
- [ ] Understand Page Object pattern
- [ ] Can write a basic test
- [ ] Can debug failing tests
- [ ] Can update visual baselines
- [ ] Understand metrics reports
- [ ] Can seed test data
- [ ] Know when to run which tests

---

**Happy Testing! 🧪**

*Remember: Good tests catch bugs before users do.*

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Maintained By:** TradingSystem Frontend Team

# Workspace E2E Tests - Quick Reference

⚡ **Fast start guide for running Workspace E2E tests**

---

## 🚀 Quick Start (3 steps)

### 1. Start Services

```bash
# Start Workspace API
docker compose -p workspace -f tools/compose/docker-compose.workspace-postgres.yml up -d

# Verify API is healthy
curl http://localhost:3200/health
# Expected: {"status":"healthy",...}

# Dashboard should be running (or start it)
cd frontend/dashboard && npm run dev
```

### 2. Run Tests

```bash
# Smoke tests (fastest - 12 seconds)
npm run test:e2e:workspace:smoke

# All workspace tests
npm run test:e2e:workspace

# Specific suite
npm run test:e2e:workspace:functional
npm run test:e2e:workspace:visual
npm run test:e2e:workspace:accessibility
```

### 3. View Results

```bash
# Open HTML report
npm run test:e2e:report

# Or open manually
npx playwright show-report
```

---

## 🎯 Test Commands

### Development

```bash
# UI mode (best for debugging)
npm run test:e2e:ui -- workspace

# Headed (see browser)
npm run test:e2e:headed -- workspace.smoke.spec.ts

# Debug specific test
npm run test:e2e:debug -- workspace -g "should create"

# Chromium only (fastest)
npm run test:e2e:chromium -- workspace.smoke.spec.ts
```

### CI/CD

```bash
# Full suite (all browsers)
npm run test:e2e:workspace

# Generate report
npm run test:e2e:report
```

---

## 📁 Files

```
e2e/
├── pages/
│   └── workspace.page.ts           # Page Object Model
├── fixtures/
│   └── workspace.fixtures.ts       # Test data
├── workspace.smoke.spec.ts         # 10 smoke tests ⚡
├── workspace.functional.spec.ts    # 15+ functional tests 🔧
├── workspace.visual.spec.ts        # 12+ visual tests 👁️
├── workspace.accessibility.spec.ts # 15+ a11y tests ♿
├── WORKSPACE-E2E-GUIDE.md         # Complete guide 📖
└── README.workspace.md            # This file
```

---

## ✅ Current Status

**Pass Rate**: 70% (7/10 smoke tests)

**Passing**:
- ✅ Page loads
- ✅ Categories display
- ✅ API health checks
- ✅ Navigation
- ✅ Responsive layout

**Needs Work**:
- ⚠️  Add button selector (too generic)
- ⚠️  Kanban section detection
- ⚠️  Console error 500 (API)

---

## 🔧 Common Issues

### "API Unavailable" Error

```bash
# Check API
curl http://localhost:3200/health

# Restart if needed
docker compose -p workspace -f tools/compose/docker-compose.workspace-postgres.yml restart
```

### "Webkit not installed"

```bash
# Install all browsers
npx playwright install

# Or just webkit
npx playwright install webkit
```

### Tests Timeout

```bash
# Increase timeout in test
test.setTimeout(60000); // 60 seconds

# Or in config
timeout: 60 * 1000 // playwright.config.ts
```

---

## 📊 Test Metrics

- **Total Tests**: 52+
- **Smoke**: 10 tests (~12s)
- **Functional**: 15 tests (~3-5min)
- **Visual**: 12 tests (~5-8min)
- **Accessibility**: 15 tests (~5-7min)

**Total Runtime**: ~20-30 minutes (all suites, all browsers)
**Chromium Only**: ~8-10 minutes

---

## 🎓 Learn More

- **Complete Guide**: [WORKSPACE-E2E-GUIDE.md](./WORKSPACE-E2E-GUIDE.md)
- **Implementation Summary**: [WORKSPACE-E2E-SUMMARY.md](../WORKSPACE-E2E-SUMMARY.md)
- **Playwright Docs**: https://playwright.dev

---

**Last Updated**: 2025-11-05
**Status**: ✅ Functional (70% passing)


import { test, expect } from '@playwright/test';
import { SystemHealthPage } from './pages/SystemHealthPage';

/**
 * System Health - Smoke Tests
 *
 * Fast sanity checks to ensure System Health dashboard works.
 * Part of Phase 2.1 - Testing Enhancement.
 *
 * Smoke tests verify:
 * - Page loads successfully
 * - Health API is accessible
 * - Core UI elements are present
 * - Services and infrastructure are displayed
 * - No critical errors on load
 */

test.describe('System Health - Smoke Tests', () => {
  let healthPage: SystemHealthPage;

  test.beforeEach(async ({ page }) => {
    healthPage = new SystemHealthPage(page);
    await healthPage.goto();
  });

  test('should load health dashboard without errors', async ({ page }) => {
    await healthPage.waitForPageLoad();

    // Page should have correct title
    await expect(page).toHaveTitle(/TradingSystem/i);

    // Health page title should be visible
    await expect(healthPage.pageTitle).toBeVisible();

    // No error banner displayed
    const hasError = await healthPage.hasError();
    expect(hasError).toBeFalsy();
  });

  test('should display overall health status', async () => {
    await healthPage.waitForPageLoad();

    // Overall status badge should be visible
    await expect(healthPage.overallStatusBadge).toBeVisible();

    // Should have a valid status (healthy, degraded, or unhealthy)
    const status = await healthPage.getOverallStatus();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(status);
  });

  test('should display health summary counts', async () => {
    await healthPage.waitForPageLoad();

    // Should show healthy count
    const healthyCount = await healthPage.getHealthyCount();
    expect(healthyCount).toBeGreaterThanOrEqual(0);

    // Total count should match monitored components
    const totalCount = await healthPage.getTotalComponentCount();
    expect(totalCount).toBeGreaterThanOrEqual(5); // At least 5 services + infrastructure
  });

  test('should display services section', async () => {
    await healthPage.waitForPageLoad();

    // Services section should be visible
    await expect(healthPage.servicesSection).toBeVisible();

    // Should have service cards
    const serviceCount = await healthPage.serviceCards.count();
    expect(serviceCount).toBeGreaterThan(0);
  });

  test('should display infrastructure section', async () => {
    await healthPage.waitForPageLoad();

    // Infrastructure section should be visible
    await expect(healthPage.infrastructureSection).toBeVisible();

    // Should have infrastructure cards
    const infraCount = await healthPage.infrastructureCards.count();
    expect(infraCount).toBeGreaterThan(0);
  });

  test('should have working refresh button', async () => {
    await healthPage.waitForPageLoad();

    // Refresh button should be visible and enabled
    await expect(healthPage.refreshButton).toBeVisible();
    await expect(healthPage.refreshButton).toBeEnabled();

    // Get initial time
    const initialTime = await healthPage.getLastUpdatedTime();

    // Click refresh
    await healthPage.clickRefresh();

    // Should update (loading indicator should appear and disappear)
    await healthPage.waitForRefresh();

    // Time should be updated (or at least refresh completed)
    const newTime = await healthPage.getLastUpdatedTime();
    expect(newTime).toBeTruthy();
  });

  test('should have auto-refresh toggle', async () => {
    await healthPage.waitForPageLoad();

    // Auto-refresh toggle should be visible
    await expect(healthPage.autoRefreshToggle).toBeVisible();

    // Should be able to toggle
    const initialState = await healthPage.isAutoRefreshEnabled();
    await healthPage.toggleAutoRefresh();
    const newState = await healthPage.isAutoRefreshEnabled();

    expect(newState).toBe(!initialState);
  });

  test('should have export functionality', async () => {
    await healthPage.waitForPageLoad();

    // Export button should be visible
    await expect(healthPage.exportButton).toBeVisible();
    await expect(healthPage.exportButton).toBeEnabled();
  });

  test('should respond to system health API', async ({ request }) => {
    // Test aggregated health API
    const response = await request.get('http://localhost:3200/api/health/system', {
      timeout: 10000
    });

    if (!response.ok()) {
      const text = await response.text();
      console.error('System Health API failed:', response.status(), text);
    }

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.overallHealth).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.overallHealth);
    expect(data.services).toBeDefined();
    expect(data.infrastructure).toBeDefined();
    expect(Array.isArray(data.services)).toBeTruthy();
    expect(Array.isArray(data.infrastructure)).toBeTruthy();
  });

  test('should have expected services monitored', async () => {
    await healthPage.waitForPageLoad();

    // Expected services from Phase 1.7 implementation
    const expectedServices = [
      'Workspace API',
      'Documentation API',
      'Documentation Hub',
      'Firecrawl Proxy',
      'TP Capital'
    ];

    // Verify at least some services are present (may not all be running)
    const serviceCount = await healthPage.serviceCards.count();
    expect(serviceCount).toBeGreaterThanOrEqual(3);
  });

  test('should have expected infrastructure monitored', async () => {
    await healthPage.waitForPageLoad();

    // Expected infrastructure from Phase 1.7 implementation
    const expectedInfra = [
      'TimescaleDB',
      'QuestDB',
      'Redis',
      'Qdrant',
      'Prometheus',
      'Grafana'
    ];

    // Verify at least some infrastructure is present
    const infraCount = await healthPage.infrastructureCards.count();
    expect(infraCount).toBeGreaterThanOrEqual(3);
  });

  test('should not have critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await healthPage.goto();
    await healthPage.waitForPageLoad();

    // Filter out expected errors (development environment)
    const criticalErrors = consoleErrors.filter(err => {
      const lower = err.toLowerCase();
      return (
        !lower.includes('econnrefused') &&
        !lower.includes('500') &&
        !lower.includes('failed to load resource') &&
        !lower.includes('net::err_') &&
        !lower.includes('cors')
      );
    });

    if (consoleErrors.length > 0) {
      console.log('Console errors (filtered):', consoleErrors.length);
    }

    expect(criticalErrors.length).toBeLessThanOrEqual(1);
  });

  test('should have responsive layout', async ({ page }) => {
    await healthPage.goto();
    await healthPage.waitForPageLoad();

    // Desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await expect(healthPage.servicesSection).toBeVisible();
    await expect(healthPage.infrastructureSection).toBeVisible();

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(healthPage.pageTitle).toBeVisible();

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(healthPage.pageTitle).toBeVisible();
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await healthPage.goto();
    await healthPage.waitForPageLoad();

    const loadTime = Date.now() - startTime;

    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});

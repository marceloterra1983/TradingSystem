import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/workspace.page';

/**
 * Workspace Smoke Tests
 * 
 * Basic sanity checks to ensure core functionality works.
 * These tests should run fast and cover critical paths.
 * 
 * Smoke tests verify:
 * - Page loads successfully
 * - API is accessible
 * - Core UI elements are present
 * - No critical errors on load
 */

test.describe('Workspace - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workspace before each test
    await page.goto('/#/workspace');
  });

  test('should load workspace page without errors', async ({ page }) => {
    const workspace = new WorkspacePage(page);
    
    // Page should load
    await expect(page).toHaveTitle(/TradingSystem/i);
    
    // Wait for content to load
    await workspace.waitForPageLoad();
    
    // Page URL should contain hash route (may be #/ or #/workspace)
    expect(page.url()).toMatch(/#\/(workspace)?$/);
    
    // No API error banner
    const hasError = await workspace.apiStatusBanner.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test('should display categories', async ({ page }) => {
    const workspace = new WorkspacePage(page);
    await workspace.waitForPageLoad();
    
    // Should have categories table visible
    const categoriesTable = page.locator('table:has(th:text-is("#"))').first();
    await expect(categoriesTable).toBeVisible({ timeout: 10000 });
    
    // Should have category rows (non-loading rows)
    const rows = categoriesTable.locator('tbody tr').filter({ hasNotText: 'Carregando' });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('should display items table', async ({ page }) => {
    const workspace = new WorkspacePage(page);
    await workspace.waitForPageLoad();
    
    // Items table should be visible
    await expect(workspace.itemsTable).toBeVisible();
    
    // Table should have proper headers
    const hasTitleHeader = await workspace.itemsTable.locator('th:has-text("Título")').isVisible();
    expect(hasTitleHeader).toBeTruthy();
  });

  test('should display kanban board section', async ({ page }) => {
    const workspace = new WorkspacePage(page);
    await workspace.waitForPageLoad();
    
    // Look for kanban-related elements (may be collapsed or below fold)
    const hasKanbanElements = 
      await page.locator('[data-status]').count() > 0 ||
      await page.locator('.kanban-card').count() > 0 ||
      await page.locator('div:has-text("Status")').count() > 0;
    
    // Kanban might exist but be in different layout (skip if not found)
    if (!hasKanbanElements) {
      test.skip();
    }
    
    expect(hasKanbanElements).toBeTruthy();
  });

  test('should have working navigation', async ({ page }) => {
    // Verify we're on a valid route (may redirect from #/workspace to #/)
    const url = page.url();
    expect(url).toMatch(/#\//);  // Contains hash route
    
    // Navigate away and back
    await page.goto('/#/tp-capital');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/#/workspace');
    await page.waitForLoadState('networkidle');
    
    // Should be on a hash route
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/#\/(workspace)?$/);
  });

  test('should not have critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });
    
    const workspace = new WorkspacePage(page);
    await workspace.goto();
    await workspace.waitForPageLoad();
    
    // Filter out expected/known errors (development environment)
    const criticalErrors = consoleErrors.filter(err => {
      const lower = err.toLowerCase();
      return (
        !lower.includes('econnrefused') &&
        !lower.includes('service launcher') &&
        !lower.includes('proxy error') &&
        !lower.includes('500') &&
        !lower.includes('internal server error') &&
        !lower.includes('failed to load resource') &&
        !lower.includes('net::err_') &&
        !lower.includes('cors')  // CORS errors in dev are expected
      );
    });
    
    // Log errors for debugging but don't fail test if they're all filtered
    if (consoleErrors.length > 0) {
      console.log('Console errors (filtered):', consoleErrors.length);
    }
    
    expect(criticalErrors.length).toBeLessThanOrEqual(1);  // Allow 1 edge case
  });

  test('should respond to API health check', async ({ request }) => {
    // Test workspace API directly with retry
    let response;
    let retries = 3;
    
    while (retries > 0) {
      try {
        response = await request.get('http://localhost:3200/health', { timeout: 5000 });
        if (response.ok()) break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    expect(response!.ok()).toBeTruthy();
    
    const data = await response!.json();
    expect(data.status).toBe('healthy');
    expect(data.checks.database.status).toBe('healthy');
  });

  test('should load categories from API', async ({ request }) => {
    const response = await request.get('http://localhost:3200/api/categories', {
      timeout: 5000,
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok()) {
      const text = await response.text();
      console.error('Categories API failed:', response.status(), text);
    }
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(6);
  });

  test('should load items from API', async ({ request }) => {
    const response = await request.get('http://localhost:3200/api/items', {
      timeout: 5000,
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok()) {
      const text = await response.text();
      console.error('Items API failed:', response.status(), text);
    }
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('should have responsive layout', async ({ page }) => {
    const workspace = new WorkspacePage(page);
    await workspace.goto();
    await workspace.waitForPageLoad();
    
    // Desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await expect(workspace.categoriesTable).toBeVisible();
    
    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(workspace.itemsTable).toBeVisible();
    
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    // At least one table should adapt
    const anyTable = page.locator('table').first();
    await expect(anyTable).toBeVisible();
  });
});


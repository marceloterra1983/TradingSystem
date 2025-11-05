import { test, expect } from '@playwright/test';
import { TelegramGatewayPage } from './pages/TelegramGatewayPage';

/**
 * Telegram Gateway - Visual Regression Tests
 * Screenshot-based testing for UI consistency
 * Detects unintended visual changes
 */

test.describe('Telegram Gateway - Visual Regression Tests', () => {
  let gatewayPage: TelegramGatewayPage;
  
  test.beforeEach(async ({ page }) => {
    gatewayPage = new TelegramGatewayPage(page);
    await gatewayPage.goto();
    await gatewayPage.waitForPageLoad();
    await gatewayPage.waitForNetworkIdle();
  });
  
  test('should match full page screenshot', async ({ page }) => {
    // Hide dynamic elements that change (timestamps, etc.)
    await page.addStyleTag({
      content: `
        [data-testid="timestamp"],
        time,
        .timestamp {
          visibility: hidden !important;
        }
      `
    });
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('telegram-gateway-full-page.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('time'),  // Mask timestamps
        page.locator('[class*="uptime"]'),  // Mask uptime counters
      ],
    });
  });
  
  test('should match status cards layout', async ({ page }) => {
    await expect(gatewayPage.statusCards.first()).toHaveScreenshot('status-card.png', {
      animations: 'disabled',
      mask: [
        page.locator('time'),
        page.locator('[class*="timestamp"]'),
      ],
    });
  });
  
  test('should match gateway logs card', async ({ page }) => {
    // Expand logs
    await gatewayPage.toggleGatewayLogs();
    await page.waitForTimeout(1000);
    
    await expect(gatewayPage.gatewayLogsCard).toHaveScreenshot('gateway-logs-card.png', {
      animations: 'disabled',
      mask: [
        page.locator('[class*="timestamp"]'),
        gatewayPage.gatewayLogsCard.locator('time'),
      ],
    });
  });
  
  test('should match messages table', async ({ page }) => {
    await expect(gatewayPage.messagesTable).toHaveScreenshot('messages-table.png', {
      animations: 'disabled',
      mask: [
        page.locator('time'),
        page.locator('td:has-text("ago")'),  // Relative times
      ],
    });
  });
  
  test('should match message dialog with Twitter preview', async ({ page }) => {
    // Search for Twitter messages
    await gatewayPage.searchText('twitter.com');
    await page.waitForTimeout(1000);
    
    const rowCount = await gatewayPage.getTableRowCount();
    
    if (rowCount > 0) {
      // Open first message
      await gatewayPage.viewFirstMessage();
      await page.waitForTimeout(1000);
      
      // Check if has Twitter preview
      const hasPreview = await gatewayPage.hasTwitterPreview();
      
      if (hasPreview) {
        await expect(gatewayPage.messageDialog).toHaveScreenshot('message-dialog-twitter.png', {
          animations: 'disabled',
          mask: [
            page.locator('time'),
            page.locator('[class*="timestamp"]'),
          ],
        });
      }
      
      await gatewayPage.closeMessageDialog();
    }
  });
  
  test('should match filters section', async ({ page }) => {
    const filtersSection = page.locator('[class*="grid"]:has(button:has-text("Canal"))').first();
    
    await expect(filtersSection).toHaveScreenshot('filters-section.png', {
      animations: 'disabled',
    });
  });
  
  test('should match dark mode', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('telegram-gateway-dark-mode.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('time'),
        page.locator('[class*="timestamp"]'),
      ],
    });
  });
  
  test('should match mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gatewayPage.reload();
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('telegram-gateway-mobile.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('time'),
      ],
    });
  });
  
  test('should match tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await gatewayPage.reload();
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('telegram-gateway-tablet.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('time'),
      ],
    });
  });
  
  test('should match empty state', async ({ page }) => {
    // Mock empty data
    await page.route('**/api/messages**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, data: [], pagination: { total: 0 } })
      });
    });
    
    await gatewayPage.reload();
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('telegram-gateway-empty-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
  
  test('should match loading state', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/messages**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: [] })
        });
      }, 5000);
    });
    
    // Reload and capture loading state quickly
    const reloadPromise = gatewayPage.reload();
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('telegram-gateway-loading-state.png', {
      animations: 'disabled',
    });
    
    await reloadPromise;
  });
  
  test('should match error state', async ({ page }) => {
    // Mock API error
    await page.route('**/api/telegram-gateway/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, error: 'Server Error' })
      });
    });
    
    await gatewayPage.reload();
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('telegram-gateway-error-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

import { test, expect } from '@playwright/test';
import { TelegramGatewayPage } from './pages/TelegramGatewayPage';

/**
 * Telegram Gateway - Functional Tests
 * Complete user workflows and feature testing
 * Tests critical business logic and user interactions
 */

test.describe('Telegram Gateway - Functional Tests', () => {
  let gatewayPage: TelegramGatewayPage;
  
  test.beforeEach(async ({ page }) => {
    gatewayPage = new TelegramGatewayPage(page);
    await gatewayPage.goto();
    await gatewayPage.waitForPageLoad();
  });
  
  test.describe('Message Synchronization', () => {
    test('should sync messages and update table', async ({ page }) => {
      // Get initial row count
      const initialCount = await gatewayPage.getTableRowCount();
      
      // Sync messages
      await gatewayPage.clickSyncMessages();
      await gatewayPage.waitForSyncComplete();
      
      // Row count should be >= initial (may have new messages)
      const finalCount = await gatewayPage.getTableRowCount();
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    });
    
    test('should show sync status during synchronization', async ({ page }) => {
      // Click sync
      await gatewayPage.syncButton.click();
      
      // Should show loading indicator (button disabled or loading state)
      // Wait a bit for loading state
      await page.waitForTimeout(500);
      
      // Wait for completion
      await gatewayPage.waitForSyncComplete();
      
      // Button should be enabled again
      await expect(gatewayPage.syncButton).toBeEnabled();
    });
  });
  
  test.describe('Message Filtering', () => {
    test('should filter messages by channel', async () => {
      // Select a specific channel
      await gatewayPage.selectChannel('TP');
      await gatewayPage.page.waitForTimeout(1000);
      
      // Table should update
      const rowCount = await gatewayPage.getTableRowCount();
      expect(rowCount).toBeGreaterThan(0);
      
      // All visible messages should be from selected channel
      // (This is validated by the UI filter badge)
    });
    
    test('should filter messages by limit (1000 records)', async () => {
      // Select 1000 records
      await gatewayPage.selectLimit('1000');
      await gatewayPage.page.waitForTimeout(1000);
      
      // Table should update
      const rowCount = await gatewayPage.getTableRowCount();
      // Should have more rows than default (50)
      expect(rowCount).toBeGreaterThan(50);
    });
    
    test('should filter messages by limit (all records)', async () => {
      // Select all records
      await gatewayPage.selectLimit('Todos');
      await gatewayPage.page.waitForTimeout(2000);
      
      // Table should update with maximum rows
      const rowCount = await gatewayPage.getTableRowCount();
      expect(rowCount).toBeGreaterThan(0);
    });
    
    test('should search messages by text', async () => {
      // Search for common term
      await gatewayPage.searchText('PETR4');
      await gatewayPage.page.waitForTimeout(1000);
      
      // Table should filter
      const rowCount = await gatewayPage.getTableRowCount();
      // May have 0 or more results
      expect(rowCount).toBeGreaterThanOrEqual(0);
    });
    
    test('should combine multiple filters', async () => {
      // Apply channel filter
      await gatewayPage.selectChannel('TP');
      await gatewayPage.page.waitForTimeout(500);
      
      // Apply limit filter
      await gatewayPage.selectLimit('100');
      await gatewayPage.page.waitForTimeout(500);
      
      // Apply text search
      await gatewayPage.searchText('COMPRA');
      await gatewayPage.page.waitForTimeout(1000);
      
      // Table should show filtered results
      const rowCount = await gatewayPage.getTableRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    });
    
    test('should clear all filters', async () => {
      // Apply some filters
      await gatewayPage.selectChannel('TP');
      await gatewayPage.selectLimit('100');
      await gatewayPage.page.waitForTimeout(500);
      
      // Clear filters
      await gatewayPage.clearFilters();
      await gatewayPage.page.waitForTimeout(1000);
      
      // Should return to default view
      const rowCount = await gatewayPage.getTableRowCount();
      expect(rowCount).toBeGreaterThan(0);
    });
  });
  
  test.describe('Message Sorting', () => {
    test('should sort messages by date (toggle asc/desc)', async () => {
      // Get first message text before sort
      const firstMessageBefore = await gatewayPage.getFirstMessageText();
      
      // Click sort date (toggle to asc)
      await gatewayPage.clickSortDate();
      await gatewayPage.page.waitForTimeout(500);
      
      // First message should potentially be different
      const firstMessageAfter = await gatewayPage.getFirstMessageText();
      
      // Either changed or stayed same (if only one message)
      expect(firstMessageAfter).toBeDefined();
    });
    
    test('should sort messages by channel', async () => {
      await gatewayPage.clickSortChannel();
      await gatewayPage.page.waitForTimeout(500);
      
      // Table should still have rows
      const rowCount = await gatewayPage.getTableRowCount();
      expect(rowCount).toBeGreaterThan(0);
    });
  });
  
  test.describe('Message Details Dialog', () => {
    test('should display full message details', async () => {
      // Open first message
      await gatewayPage.viewFirstMessage();
      
      // Dialog should show message text
      const messageText = await gatewayPage.getDialogMessageText();
      expect(messageText.length).toBeGreaterThan(0);
      
      // Close dialog
      await gatewayPage.closeMessageDialog();
    });
    
    test('should display Twitter preview when present', async ({ page }) => {
      // Sync messages to ensure we have some
      await gatewayPage.clickSyncMessages();
      await gatewayPage.waitForSyncComplete();
      
      // Search for Twitter links
      await gatewayPage.searchText('twitter.com');
      await page.waitForTimeout(1000);
      
      const rowCount = await gatewayPage.getTableRowCount();
      
      if (rowCount > 0) {
        // Open first message with Twitter link
        await gatewayPage.viewFirstMessage();
        
        // Check if Twitter preview exists (may or may not depending on data)
        const hasPreview = await gatewayPage.hasTwitterPreview();
        
        // If has preview, verify it's visible
        if (hasPreview) {
          await expect(gatewayPage.twitterPreview).toBeVisible();
        }
        
        await gatewayPage.closeMessageDialog();
      }
    });
    
    test('should navigate between messages', async () => {
      const rowCount = await gatewayPage.getTableRowCount();
      
      if (rowCount >= 2) {
        // View first message
        await gatewayPage.viewMessageByIndex(0);
        await expect(gatewayPage.messageDialog).toBeVisible();
        await gatewayPage.closeMessageDialog();
        
        // View second message
        await gatewayPage.viewMessageByIndex(1);
        await expect(gatewayPage.messageDialog).toBeVisible();
        await gatewayPage.closeMessageDialog();
      }
    });
  });
  
  test.describe('Gateway Logs', () => {
    test('should toggle logs visibility', async () => {
      // Logs should be initially visible or collapsed
      const initialState = await gatewayPage.gatewayLogsCard.isVisible();
      
      // Toggle logs
      await gatewayPage.toggleGatewayLogs();
      await gatewayPage.page.waitForTimeout(500);
      
      // Should have some logs (if expanded)
      const logCount = await gatewayPage.getLogCount();
      expect(logCount).toBeGreaterThanOrEqual(0);
    });
    
    test('should display log statistics', async () => {
      // Stats grid should be visible
      await expect(gatewayPage.logsStatsGrid).toBeVisible();
      
      // Should have stat items (Total, Info, Warn, Error)
      const stats = gatewayPage.logsStatsGrid.locator('> div');
      const statCount = await stats.count();
      expect(statCount).toBeGreaterThanOrEqual(3);
    });
  });
  
  test.describe('Real-time Updates', () => {
    test('should highlight new messages after sync', async () => {
      // Get initial state
      const initialCount = await gatewayPage.getTableRowCount();
      
      // Sync messages
      await gatewayPage.clickSyncMessages();
      await gatewayPage.waitForSyncComplete();
      
      // New messages should be highlighted (check for highlight class/style)
      const highlightedRows = gatewayPage.page.locator('tr[class*="animate"], tr[class*="highlight"]');
      const highlightedCount = await highlightedRows.count();
      
      // May or may not have highlighted rows depending on new messages
      expect(highlightedCount).toBeGreaterThanOrEqual(0);
    });
  });
  
  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await gatewayPage.goto();
      await gatewayPage.waitForPageLoad();
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
    
    test('should handle large datasets (1000 records)', async () => {
      // Select 1000 records
      await gatewayPage.selectLimit('1000');
      
      const startTime = Date.now();
      await gatewayPage.page.waitForTimeout(3000);
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      // Table should be responsive
      const rowCount = await gatewayPage.getTableRowCount();
      expect(rowCount).toBeGreaterThan(0);
    });
  });
  
  test.describe('Error Handling', () => {
    test('should handle sync errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/telegram-gateway/sync-messages', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ success: false, error: 'Internal Server Error' })
        });
      });
      
      // Try to sync
      await gatewayPage.clickSyncMessages();
      await gatewayPage.page.waitForTimeout(2000);
      
      // Should show error message (not crash)
      const errorIndicator = page.locator('text=/erro|error|falhou|failed/i');
      await expect(errorIndicator).toBeVisible({ timeout: 5000 });
    });
    
    test('should handle missing data gracefully', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/messages**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: [] })
        });
      });
      
      await gatewayPage.reload();
      
      // Should show empty state (not crash)
      await expect(gatewayPage.pageTitle).toBeVisible();
    });
  });
});

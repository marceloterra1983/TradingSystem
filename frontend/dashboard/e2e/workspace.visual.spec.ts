import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/workspace.page';

/**
 * Workspace Visual Regression Tests
 * 
 * Captures screenshots and compares against baseline images
 * to detect unintended visual changes.
 * 
 * Tests cover:
 * - Full page layout
 * - Component states (empty, loaded, loading)
 * - Responsive breakpoints
 * - Dark/light themes
 * - Interactive states (hover, focus)
 */

test.describe('Workspace - Visual Tests', () => {
  let workspace: WorkspacePage;

  test.beforeEach(async ({ page }) => {
    workspace = new WorkspacePage(page);
    await workspace.goto();
    await workspace.waitForPageLoad();
  });

  test('should match full page snapshot', async ({ page }) => {
    // Wait for all content to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow animations to complete
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('workspace-full-page.png', {
      fullPage: true,
      mask: [
        // Mask dynamic content
        page.locator('text=/\\d{2}:\\d{2}:\\d{2}/'), // Times
        page.locator('text=/há \\d+ (segundo|minuto|hora)/'), // Relative times
      ],
    });
  });

  test('should match categories section snapshot', async ({ page }) => {
    const section = workspace.categoriesSection.or(workspace.categoriesTable);
    await expect(section).toBeVisible();
    
    await expect(section).toHaveScreenshot('workspace-categories-section.png');
  });

  test('should match items table snapshot', async ({ page }) => {
    await expect(workspace.itemsTable).toBeVisible();
    
    await expect(workspace.itemsTable).toHaveScreenshot('workspace-items-table.png', {
      mask: [
        // Mask timestamps and dynamic data
        page.locator('[data-testid="timestamp"], .timestamp'),
      ],
    });
  });

  test('should match empty state', async ({ page }) => {
    // Delete all items to show empty state
    let count = await workspace.getItemsCount();
    
    while (count > 0 && count < 5) {
      try {
        await workspace.deleteFirstItem();
        count = await workspace.getItemsCount();
      } catch (e) {
        break;
      }
    }
    
    if (count === 0) {
      await expect(workspace.itemsTable).toHaveScreenshot('workspace-empty-state.png');
    } else {
      test.skip();
    }
  });

  test('should match add item dialog', async ({ page }) => {
    await workspace.clickAddItem();
    
    await expect(workspace.addItemDialog).toHaveScreenshot('workspace-add-dialog.png');
  });

  test('should match filled form', async ({ page }) => {
    await workspace.clickAddItem();
    
    await workspace.fillItemForm({
      title: 'Visual Test Item',
      description: 'This is for visual regression testing',
      category: 'feature',
      priority: 'high',
      tags: ['visual', 'test']
    });
    
    await expect(workspace.addItemDialog).toHaveScreenshot('workspace-filled-form.png');
  });

  test.describe('Responsive Layouts', () => {
    test('should match desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('workspace-desktop-1920.png', {
        fullPage: true,
      });
    });

    test('should match laptop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('workspace-laptop-1366.png', {
        fullPage: true,
      });
    });

    test('should match tablet layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('workspace-tablet-768.png', {
        fullPage: true,
      });
    });

    test('should match mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('workspace-mobile-375.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Theme Variants', () => {
    test('should match light theme', async ({ page }) => {
      // Ensure light theme is active
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('workspace-light-theme.png');
    });

    test('should match dark theme', async ({ page }) => {
      // Switch to dark theme
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('workspace-dark-theme.png');
    });
  });

  test.describe('Component States', () => {
    test('should match button hover state', async ({ page }) => {
      await workspace.addItemButton.hover();
      await page.waitForTimeout(200);
      
      await expect(workspace.addItemButton).toHaveScreenshot('workspace-button-hover.png');
    });

    test('should match table row hover', async ({ page }) => {
      const firstRow = workspace.itemRows.first();
      
      if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstRow.hover();
        await page.waitForTimeout(200);
        
        await expect(firstRow).toHaveScreenshot('workspace-row-hover.png');
      } else {
        test.skip();
      }
    });

    test('should match focused input', async ({ page }) => {
      await workspace.clickAddItem();
      await workspace.titleInput.focus();
      await page.waitForTimeout(100);
      
      await expect(workspace.titleInput).toHaveScreenshot('workspace-input-focus.png');
    });
  });

  test.describe('Priority and Status Badges', () => {
    test('should match priority badges', async ({ page }) => {
      // Create items with different priorities
      const priorities = ['low', 'medium', 'high', 'critical'];
      
      for (const priority of priorities) {
        try {
          await workspace.createItem({
            title: `Priority ${priority}`,
            description: 'Test priority badge',
            category: 'feature',
            priority
          });
        } catch (e) {
          // Continue if item creation fails
        }
      }
      
      await page.waitForTimeout(1000);
      
      // Capture table with all priority badges
      await expect(workspace.itemsTable).toHaveScreenshot('workspace-priority-badges.png');
    });
  });
});


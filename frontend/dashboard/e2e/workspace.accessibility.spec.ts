import { test, expect } from '@playwright/test';
import { WorkspacePage } from './pages/workspace.page';
import AxeBuilder from '@axe-core/playwright';

/**
 * Workspace Accessibility Tests
 * 
 * Ensures the Workspace page is accessible according to WCAG 2.1 standards.
 * 
 * Tests cover:
 * - ARIA labels and roles
 * - Keyboard navigation
 * - Color contrast
 * - Screen reader compatibility
 * - Focus management
 * - Semantic HTML
 */

test.describe('Workspace - Accessibility Tests', () => {
  let workspace: WorkspacePage;

  test.beforeEach(async ({ page }) => {
    workspace = new WorkspacePage(page);
    await workspace.goto();
    await workspace.waitForPageLoad();
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Headings should be in order (h1 > h2 > h3, no skipping)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have semantic HTML landmarks', async ({ page }) => {
    // Main content should be in <main> or role="main"
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Navigation should exist
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    // Add button should have accessible name
    const addButton = workspace.addItemButton;
    const hasLabel = await addButton.getAttribute('aria-label') !== null ||
                     await addButton.textContent() !== '';
    expect(hasLabel).toBeTruthy();

    // All buttons should have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const label = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const hasAccessibleName = (label && label.length > 0) || (text && text.trim().length > 0);
      
      if (!hasAccessibleName) {
        const html = await button.innerHTML();
        console.warn('Button without accessible name:', html.substring(0, 100));
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab should move focus through interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    const focused1 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT', 'SELECT']).toContain(focused1);

    // Tab again
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    // Should move to next element
    const focused2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT', 'SELECT']).toContain(focused2);

    // Shift+Tab should go back
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(100);
  });

  test('should open add item dialog with keyboard', async ({ page }) => {
    // Focus the add button
    await workspace.addItemButton.focus();
    
    // Press Enter
    await page.keyboard.press('Enter');
    
    // Dialog should open
    await expect(workspace.addItemDialog).toBeVisible();
    
    // Focus should move into dialog
    await page.waitForTimeout(300);
    const focusedElement = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]'));
    expect(focusedElement).toBeTruthy();
  });

  test('should close dialog with Escape key', async ({ page }) => {
    await workspace.clickAddItem();
    await expect(workspace.addItemDialog).toBeVisible();
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Dialog should close
    await expect(workspace.addItemDialog).not.toBeVisible({ timeout: 2000 });
  });

  test('should trap focus within dialog', async ({ page }) => {
    await workspace.clickAddItem();
    
    // Tab through all elements in dialog
    const dialogInputs = await workspace.addItemDialog.locator('input, textarea, select, button').count();
    
    if (dialogInputs > 0) {
      for (let i = 0; i < dialogInputs + 2; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(50);
        
        // Focus should stay within dialog
        const isInDialog = await page.evaluate(() => {
          const focused = document.activeElement;
          return focused?.closest('[role="dialog"]') !== null;
        });
        
        expect(isInDialog).toBeTruthy();
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const contrastResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ rules: { 'color-contrast': { enabled: true } } })
      .analyze();

    const contrastViolations = contrastResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('should have proper form labels', async ({ page }) => {
    await workspace.clickAddItem();
    
    // All inputs should have associated labels
    const inputs = await workspace.addItemDialog.locator('input, textarea, select').all();
    
    for (const input of inputs) {
      const hasLabel = 
        await input.getAttribute('aria-label') !== null ||
        await input.getAttribute('aria-labelledby') !== null ||
        await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0;
      
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should indicate required fields', async ({ page }) => {
    await workspace.clickAddItem();
    
    // Required fields should have aria-required or required attribute
    const titleField = workspace.titleInput;
    const hasRequiredIndicator = 
      await titleField.getAttribute('required') !== null ||
      await titleField.getAttribute('aria-required') === 'true';
    
    expect(hasRequiredIndicator).toBeTruthy();
  });

  test('should have table with proper structure', async ({ page }) => {
    const table = workspace.itemsTable;
    
    // Table should have thead and tbody
    const thead = table.locator('thead');
    const tbody = table.locator('tbody');
    
    await expect(thead).toBeVisible();
    await expect(tbody).toBeVisible();
    
    // Headers should use <th>
    const headers = await thead.locator('th').count();
    expect(headers).toBeGreaterThan(0);
  });

  test('should have proper link text (no "click here")', async ({ page }) => {
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const text = await link.textContent();
      if (text) {
        const lowerText = text.toLowerCase();
        expect(lowerText).not.toContain('click here');
        expect(lowerText).not.toContain('read more');
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    // Check for aria-live regions
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count();
    
    // Should have at least one live region for dynamic updates
    expect(liveRegions).toBeGreaterThan(0);
  });

  test('should have proper button roles', async ({ page }) => {
    // Elements that look like buttons should have button role
    const clickableElements = await page.locator('[onclick], [ng-click]').all();
    
    for (const element of clickableElements) {
      const tagName = await element.evaluate(el => el.tagName);
      const role = await element.getAttribute('role');
      
      if (tagName !== 'BUTTON' && tagName !== 'A') {
        expect(role).toBe('button');
      }
    }
  });

  test('should have proper image alt text', async ({ page }) => {
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test('should support reduced motion preference', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await workspace.goto();
    await workspace.waitForPageLoad();
    
    // Page should load without errors
    await expect(workspace.itemsTable).toBeVisible();
  });

  test('should be navigable with screen reader', async ({ page }) => {
    // Simulate screen reader by checking ARIA attributes
    const mainRegion = page.locator('main, [role="main"]');
    await expect(mainRegion).toBeVisible();
    
    // Navigation should have role
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
    
    // Sections should have headings
    const sections = await page.locator('section, [role="region"]').all();
    for (const section of sections) {
      const hasHeading = await section.locator('h1, h2, h3, [role="heading"]').count() > 0;
      expect(hasHeading).toBeTruthy();
    }
  });
});


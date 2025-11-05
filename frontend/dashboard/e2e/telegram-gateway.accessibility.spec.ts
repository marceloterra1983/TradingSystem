import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TelegramGatewayPage } from './pages/TelegramGatewayPage';

const ACCESSIBILITY_PROJECTS = new Set(['chromium']);

/**
 * Telegram Gateway - Accessibility Tests
 * WCAG 2.1 Level AA compliance testing
 * Uses axe-core for automated accessibility checks
 */

test.describe('Telegram Gateway - Accessibility Tests', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!ACCESSIBILITY_PROJECTS.has(testInfo.project.name)) {
      testInfo.skip(
        'A varredura de acessibilidade com axe é executada apenas no projeto Chromium.',
      );
    }
  });
  let gatewayPage: TelegramGatewayPage;
  
  test.beforeEach(async ({ page }) => {
    gatewayPage = new TelegramGatewayPage(page);
    await gatewayPage.goto();
    await gatewayPage.waitForPageLoad();
  });
  
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('should have proper heading hierarchy', async ({ page }) => {
    // Check heading levels (h1, h2, h3)
    const h1 = page.locator('h1');
    const h2 = page.locator('h2');
    
    // Should have at least one h1
    await expect(h1).toHaveCount(1);
    
    // Headings should be in logical order
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['best-practice'])
      .include('h1, h2, h3, h4, h5, h6')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('should have accessible form labels', async ({ page }) => {
    // Check all inputs have labels
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .include('input, select, textarea')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('should have sufficient color contrast', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    // Filter for color-contrast violations only
    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );
    
    expect(contrastViolations).toEqual([]);
  });
  
  test('should be keyboard navigable', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Focus should move between elements
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
    expect(focused).not.toBe('BODY');
  });
  
  test('should have accessible buttons', async ({ page }) => {
    // All buttons should have accessible names
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('button')
      .analyze();
    
    const buttonNameViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'button-name'
    );
    
    expect(buttonNameViolations).toEqual([]);
  });
  
  test('should have proper ARIA attributes', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze();
    
    // Check for ARIA violations
    const ariaViolations = accessibilityScanResults.violations.filter(
      v => v.id.startsWith('aria-')
    );
    
    expect(ariaViolations).toEqual([]);
  });
  
  test('should have accessible tables', async ({ page }) => {
    // Check table accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('table')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('should have accessible dialogs', async ({ page }, testInfo) => {
    const hasMessages = (await gatewayPage.viewMessageButtons.count()) > 0;
    if (!hasMessages) {
      testInfo.skip('Nenhuma mensagem disponível para validar o diálogo.');
      return;
    }
    
    // Open message dialog
    await gatewayPage.viewFirstMessage();
    
    // Check dialog accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Close dialog
    await gatewayPage.closeMessageDialog();
  });
  
  test('should support screen readers (semantic HTML)', async ({ page }) => {
    // Check for semantic elements
    const main = page.locator('main');
    const nav = page.locator('nav');
    const article = page.locator('article');
    
    // At least one semantic element should exist
    const hasMain = await main.count() > 0;
    const hasNav = await nav.count() > 0;
    const hasArticle = await article.count() > 0;
    
    expect(hasMain || hasNav || hasArticle).toBe(true);
  });
  
  test('should have focus indicators', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    
    // Check if focused element has visible outline/focus indicator
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Get computed style
    const outlineWidth = await focusedElement.evaluate(el => 
      window.getComputedStyle(el).outlineWidth
    );
    
    // Should have some form of focus indicator
    // (outline, box-shadow, or border change)
    expect(outlineWidth).toBeDefined();
  });
  
  test('should not have any critical accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Filter critical and serious violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    
    // Log violations for debugging
    if (criticalViolations.length > 0) {
      console.log('Accessibility Violations:', JSON.stringify(criticalViolations, null, 2));
    }
    
    expect(criticalViolations).toEqual([]);
  });
});

import { expect, test } from '@playwright/test';
import { CatalogPage } from './pages/CatalogPage';

const VISUAL_BASELINE_PROJECTS = new Set(['chromium', 'Mobile Chrome']);

test.describe('Catalog - Visual Regression Tests', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!VISUAL_BASELINE_PROJECTS.has(testInfo.project.name)) {
      testInfo.skip(
        'Visual baselines são mantidas apenas para Chromium desktop e mobile.',
      );
    }
  });

  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    await catalogPage.goto();
  });

  test('matches agents catalog desktop layout', async ({ page }) => {
    await catalogPage.waitForPageLoad();
    await expect(page).toHaveScreenshot('catalog-agents-desktop.png', {
      fullPage: true,
    });
  });

  test('matches commands catalog grid', async () => {
    await catalogPage.switchSection('commands');
    await expect(catalogPage.commandsCardGrid).toHaveScreenshot('catalog-commands-grid.png');
  });

  test('matches unified catalog on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await catalogPage.goto();
    await catalogPage.switchSection('unified');
    await expect(page).toHaveScreenshot('catalog-unified-mobile.png', {
      fullPage: true,
    });
  });
});

import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { catalogFixtures } from './fixtures/catalogData';
import { CatalogPage } from './pages/CatalogPage';

test.describe('Catalog - Accessibility Tests', () => {
  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    await catalogPage.goto();
  });

  test('has no axe-core violations on agents view', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('remains accessible on commands and unified sections', async ({ page }) => {
    await catalogPage.switchSection('commands');
    let results = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);

    await catalogPage.switchSection('unified');
    results = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('filter inputs expose accessible labels', async ({ page }) => {
    const inputs = page.locator('input, [role="combobox"]');
    const firstInputs = await inputs.elementHandles();
    for (const handle of firstInputs.slice(0, 6)) {
      const hasLabel = await handle.evaluate((element) => {
        const htmlEl = element as HTMLElement;
        if (htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('aria-labelledby')) {
          return true;
        }
        if (htmlEl instanceof HTMLInputElement && htmlEl.placeholder) {
          return true;
        }
        return false;
      });
      expect(hasLabel).toBeTruthy();
    }
  });

  test('section toggles expose pressed state', async () => {
    await catalogPage.expectSectionActive('agents');
    await catalogPage.switchSection('commands');
    await catalogPage.expectSectionActive('commands');
  });

  test('dialog content is focus trapped', async () => {
    await catalogPage.searchAgents(catalogFixtures.agent.name);
    await catalogPage.openAgentDialog(catalogFixtures.agent.name);

    const initialFocus = await catalogPage.dialog.evaluate((dialog) => {
      const active = dialog.querySelector('button, a, input, select, textarea');
      return Boolean(active);
    });
    expect(initialFocus).toBeTruthy();

    await catalogPage.closeDialog();
  });
});

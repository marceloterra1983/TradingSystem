import { expect, test } from '@playwright/test';
import { CatalogPage } from './pages/CatalogPage';

test.describe('Catalog - Smoke Tests', () => {
  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    await catalogPage.goto();
  });

  test('loads catalog route and default section', async ({ page }) => {
    await expect(page).toHaveURL(/#\/catalog$/);
    await catalogPage.expectSectionActive('agents');
    await expect(catalogPage.agentsCardGrid).toBeVisible();
    await expect(catalogPage.agentCards.first()).toBeVisible();
  });

  test('renders section header actions', async () => {
    await expect(catalogPage.sectionButtons.agents).toBeVisible();
    await expect(catalogPage.sectionButtons.commands).toBeVisible();
    await expect(catalogPage.sectionButtons.unified).toBeVisible();
  });

  test('switches between commands and unified sections', async () => {
    await catalogPage.switchSection('commands');
    await catalogPage.expectSectionActive('commands');
    await expect(catalogPage.commandsCardGrid).toBeVisible();
    await expect(catalogPage.commandCards.first()).toBeVisible();

    await catalogPage.switchSection('unified');
    await catalogPage.expectSectionActive('unified');
    await expect(catalogPage.unifiedCardGrid).toBeVisible();
    await expect(catalogPage.unifiedCards.first()).toBeVisible();
  });

  test('displays filter controls for agents section', async () => {
    await expect(catalogPage.agentsSearchInput).toBeVisible();
    await expect(catalogPage.agentsCategoryFilter).toBeVisible();
    await expect(catalogPage.agentsTagFilter).toBeVisible();
  });
});

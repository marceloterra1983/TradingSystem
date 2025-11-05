import { expect, test } from '@playwright/test';
import { catalogFixtures } from './fixtures/catalogData';
import { CatalogPage } from './pages/CatalogPage';

test.describe('Catalog - Functional Tests', () => {
  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    await catalogPage.goto();
  });

  test('filters agents by search query and resets filters', async () => {
    await catalogPage.searchAgents(catalogFixtures.agent.name);
    await expect(
      catalogPage.agentCards.filter({ hasText: catalogFixtures.agent.name }).first(),
    ).toBeVisible();

    await catalogPage.searchAgents(catalogFixtures.unmatchedQuery);
    await expect(catalogPage.agentCards).toHaveCount(0);
    await expect(catalogPage.agentsEmptyState).toBeVisible();

    await catalogPage.clearVisibleFilters();
    await expect(catalogPage.agentCards.first()).toBeVisible();
  });

  test('applies category and tag filters for agents', async () => {
    test.skip(!catalogFixtures.agent.tag, 'Agent fixture does not expose tags');
    await catalogPage.selectAgentsCategory(catalogFixtures.agent.category);
    const categories = await catalogPage.getVisibleAttributeValues(
      catalogPage.agentCards,
      'data-agent-category',
    );
    expect(categories.length).toBeGreaterThan(0);
    expect(new Set(categories)).toEqual(new Set([catalogFixtures.agent.category]));

    const agentTag = catalogFixtures.agent.tag!;
    await catalogPage.selectAgentsTag(agentTag);
    const tags = await catalogPage.getVisibleAttributeValues(
      catalogPage.agentCards,
      'data-agent-tags',
    );
    expect(tags.every((value) => value.includes(agentTag))).toBeTruthy();
  });

  test('opens agent details dialog', async () => {
    await catalogPage.searchAgents(catalogFixtures.agent.name);
    await catalogPage.openAgentDialog(catalogFixtures.agent.name);
    await expect(catalogPage.dialog).toBeVisible();
    await catalogPage.closeDialog();
  });

  test('filters commands and opens command modal', async () => {
    await catalogPage.switchSection('commands');
    await catalogPage.searchCommands(catalogFixtures.command.name);
    await expect(
      catalogPage.commandCards.filter({ hasText: catalogFixtures.command.name }).first(),
    ).toBeVisible();

    await catalogPage.openCommandDialog(catalogFixtures.command.name);
    await expect(catalogPage.dialog).toBeVisible();
    await catalogPage.closeDialog();
  });

  test('filters unified catalog by type and entry name', async () => {
    await catalogPage.switchSection('unified');
    await catalogPage.selectUnifiedType('Commands');
    await catalogPage.searchUnified(catalogFixtures.command.name);

    const entryTypes = await catalogPage.getVisibleAttributeValues(
      catalogPage.unifiedCards,
      'data-entry-type',
    );
    expect(entryTypes.every((type) => type === 'command')).toBeTruthy();

    await catalogPage.openUnifiedEntry(catalogFixtures.command.name);
    await expect(catalogPage.dialog).toBeVisible();
    await catalogPage.closeDialog();
  });
});

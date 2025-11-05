import { expect, type Locator, type Page } from '@playwright/test';

export type CatalogSection = 'agents' | 'commands' | 'unified';

export class CatalogPage {
  readonly page: Page;
  readonly url = '/#/catalog';

  readonly sectionButtons: Record<CatalogSection, Locator>;

  // Agents selectors
  readonly agentsSearchInput: Locator;
  readonly agentsCategoryFilter: Locator;
  readonly agentsTagFilter: Locator;
  readonly agentsCardGrid: Locator;
  readonly agentCards: Locator;
  readonly agentsEmptyState: Locator;

  // Commands selectors
  readonly commandsSearchInput: Locator;
  readonly commandsCategoryFilter: Locator;
  readonly commandsTagFilter: Locator;
  readonly commandsCardGrid: Locator;
  readonly commandCards: Locator;
  readonly commandsEmptyState: Locator;

  // Unified selectors
  readonly unifiedSearchInput: Locator;
  readonly unifiedTypeFilter: Locator;
  readonly unifiedCategoryFilter: Locator;
  readonly unifiedTagFilter: Locator;
  readonly unifiedCardGrid: Locator;
  readonly unifiedCards: Locator;
  readonly unifiedEmptyState: Locator;

  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;

    this.sectionButtons = {
      agents: page.getByTestId('catalog-section-agents'),
      commands: page.getByTestId('catalog-section-commands'),
      unified: page.getByTestId('catalog-section-unified'),
    } as const;

    this.agentsSearchInput = page.getByTestId('agents-search-input');
    this.agentsCategoryFilter = page.getByTestId('agents-category-filter');
    this.agentsTagFilter = page.getByTestId('agents-tag-filter');
    this.agentsCardGrid = page.getByTestId('agents-card-grid');
    this.agentCards = page.getByTestId('agent-card');
    this.agentsEmptyState = page.getByTestId('agents-empty-state');

    this.commandsSearchInput = page.getByTestId('commands-search-input');
    this.commandsCategoryFilter = page.getByTestId('commands-category-filter');
    this.commandsTagFilter = page.getByTestId('commands-tag-filter');
    this.commandsCardGrid = page.getByTestId('commands-card-grid');
    this.commandCards = page.getByTestId('command-card');
    this.commandsEmptyState = page.getByTestId('commands-empty-state');

    this.unifiedSearchInput = page.getByTestId('unified-search-input');
    this.unifiedTypeFilter = page.getByTestId('unified-type-filter');
    this.unifiedCategoryFilter = page.getByTestId('unified-category-filter');
    this.unifiedTagFilter = page.getByTestId('unified-tag-filter');
    this.unifiedCardGrid = page.getByTestId('unified-card-grid');
    this.unifiedCards = page.getByTestId('unified-card');
    this.unifiedEmptyState = page.getByTestId('unified-empty-state');

    this.dialog = page.locator('[role="dialog"]');
  }

  async goto() {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.getByText('Catálogo de Agentes Claude')).toBeVisible();
  }

  async switchSection(section: CatalogSection) {
    const button = this.sectionButtons[section];
    await button.click();
    await this.page.waitForTimeout(250);
  }

  async expectSectionActive(section: CatalogSection) {
    await expect(this.sectionButtons[section]).toHaveAttribute('aria-pressed', 'true');
  }

  async searchAgents(term: string) {
    await this.agentsSearchInput.fill(term);
    await this.page.waitForTimeout(400);
  }

  async selectAgentsCategory(category: string) {
    if (!category) return;
    await this.selectOption(this.agentsCategoryFilter, category);
  }

  async selectAgentsTag(tag: string) {
    if (!tag) return;
    await this.selectOption(this.agentsTagFilter, tag);
  }

  async searchCommands(term: string) {
    await this.commandsSearchInput.fill(term);
    await this.page.waitForTimeout(400);
  }

  async searchUnified(term: string) {
    await this.unifiedSearchInput.fill(term);
    await this.page.waitForTimeout(400);
  }

  async selectUnifiedType(typeLabel: string) {
    await this.selectOption(this.unifiedTypeFilter, typeLabel);
  }

  async selectUnifiedCategory(category: string) {
    if (!category) return;
    await this.selectOption(this.unifiedCategoryFilter, category);
  }

  async selectUnifiedTag(tag: string) {
    if (!tag) return;
    await this.selectOption(this.unifiedTagFilter, tag);
  }

  async clearVisibleFilters() {
    const clearButton = this.page.getByRole('button', { name: /limpar filtros/i }).first();
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForTimeout(200);
    }
  }

  async openAgentDialog(name: string) {
    await this.page.getByRole('button', { name: new RegExp(`Visualizar ${escapeRegex(name)}`, 'i') }).first().click();
    await this.dialog.waitFor({ state: 'visible' });
  }

  async openCommandDialog(commandName: string) {
    await this.page.getByRole('button', { name: new RegExp(`Visualizar ${escapeRegex(commandName)}`, 'i') }).first().click();
    await this.dialog.waitFor({ state: 'visible' });
  }

  async openUnifiedEntry(name: string) {
    const card = this.unifiedCards.filter({ hasText: name }).first();
    await card.click();
    await this.dialog.waitFor({ state: 'visible' });
  }

  async closeDialog() {
    if (await this.dialog.isVisible()) {
      await this.dialog.getByRole('button', { name: /fechar/i }).click();
      await this.dialog.waitFor({ state: 'hidden' });
    }
  }

  async getVisibleAttributeValues(locator: Locator, attribute: string) {
    const values = await locator.evaluateAll((elements, attr) =>
      elements
        .map((element) => element.getAttribute(attr))
        .filter((value): value is string => !!value),
      attribute,
    );
    return values;
  }

  private async selectOption(trigger: Locator, optionLabel: string) {
    const normalizedLabel = optionLabel.trim();
    if (!normalizedLabel) return;
    await trigger.click();
    await this.page
      .getByRole('option', {
        name: new RegExp(`^${escapeRegex(normalizedLabel)}$`, 'i'),
      })
      .click();
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

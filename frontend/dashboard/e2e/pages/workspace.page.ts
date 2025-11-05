import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Workspace Page
 * 
 * Encapsulates all interactions with the Workspace page
 * following the Page Object Pattern for maintainability.
 */
export class WorkspacePage {
  readonly page: Page;
  
  // Section containers
  readonly categoriesSection: Locator;
  readonly itemsSection: Locator;
  readonly kanbanSection: Locator;
  
  // Categories section elements
  readonly categoriesTable: Locator;
  readonly categoryRows: Locator;
  
  // Items section elements
  readonly itemsTable: Locator;
  readonly itemRows: Locator;
  readonly addItemButton: Locator;
  readonly searchInput: Locator;
  readonly sortHeaders: Locator;
  
  // Kanban board elements
  readonly kanbanColumns: Locator;
  readonly kanbanCards: Locator;
  
  // Dialogs
  readonly addItemDialog: Locator;
  readonly editItemDialog: Locator;
  readonly deleteConfirmDialog: Locator;
  
  // Form fields
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly categorySelect: Locator;
  readonly prioritySelect: Locator;
  readonly tagsInput: Locator;
  readonly statusSelect: Locator;
  
  // Action buttons
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;
  
  // Status indicators
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly apiStatusBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Section containers (use most specific selectors to avoid strict mode violations)
    this.categoriesSection = page.locator('div:has(> div > h3:has-text("Categorias"))').first();
    this.itemsSection = page.locator('div:has(> div > h3:has-text("Workspace"))').first();
    this.kanbanSection = page.locator('div').filter({ has: page.locator('h3:text-matches("Status|Quadro", "i")') }).first();
    
    // Categories - table with "#" and "Categoria" columns (narrower table)
    this.categoriesTable = page.locator('table:has(th:text-is("#"))').first();
    this.categoryRows = this.categoriesTable.locator('tbody tr').filter({ hasNotText: 'Carregando' });
    
    // Items table - table with "Título" column (wider table)
    this.itemsTable = page.locator('table:has(th:has-text("Título"))').first();
    this.itemRows = this.itemsTable.locator('tbody tr').filter({ hasNotText: 'Carregando' });
    
    // Add button - look for button near "Workspace" heading or with specific icon
    this.addItemButton = page.locator('button[aria-label*="Adicionar"], button[aria-label*="Nova"]')
      .or(page.locator('button:has(svg):near(h3:has-text("Workspace"))'))
      .first();
    this.searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    this.sortHeaders = page.locator('th[role="button"], th:has(svg)');
    
    // Kanban
    this.kanbanColumns = page.locator('[data-status], .kanban-column');
    this.kanbanCards = page.locator('.kanban-card, [data-item-id]');
    
    // Dialogs
    this.addItemDialog = page.locator('[role="dialog"]:has-text("Nova Ideia"), [role="dialog"]:has-text("Adicionar")');
    this.editItemDialog = page.locator('[role="dialog"]:has-text("Editar")');
    this.deleteConfirmDialog = page.locator('[role="dialog"]:has-text("Excluir"), [role="dialog"]:has-text("Confirmar")');
    
    // Form fields
    this.titleInput = page.locator('input[name="title"], input[placeholder*="título"]');
    this.descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="descrição"]');
    this.categorySelect = page.locator('select[name="category"], [role="combobox"]:near(:text("Categoria"))');
    this.prioritySelect = page.locator('select[name="priority"], [role="combobox"]:near(:text("Prioridade"))');
    this.tagsInput = page.locator('input[name="tags"], input[placeholder*="tags"]');
    this.statusSelect = page.locator('select[name="status"], [role="combobox"]:near(:text("Status"))');
    
    // Buttons
    this.saveButton = page.locator('button:has-text("Salvar"), button[type="submit"]');
    this.cancelButton = page.locator('button:has-text("Cancelar")');
    this.deleteButton = page.locator('button:has-text("Excluir"), button:has-text("Deletar")');
    
    // Status
    this.loadingSpinner = page.locator('[role="status"], .loading, text=Carregando');
    this.errorMessage = page.locator('[role="alert"]:has-text("Erro"), .error-message');
    this.successMessage = page.locator('[role="alert"]:has-text("Sucesso"), .success-message');
    this.apiStatusBanner = page.locator('text=API Indisponível, text=API Unavailable');
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  async goto() {
    await this.page.goto('/#/workspace');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    // Wait for page to stabilize
    await this.page.waitForLoadState('networkidle');
    
    // Wait for main content to load (at least one table with data, not just "Carregando")
    await this.page.waitForSelector('table tbody tr:not(:has-text("Carregando"))', { 
      timeout: 10000,
      state: 'visible' 
    }).catch(() => {
      // If no data rows, at least ensure tables exist
      return this.page.waitForSelector('table', { timeout: 5000 });
    });
    
    // Ensure API is available (no error banner)
    const hasErrorBanner = await this.apiStatusBanner.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasErrorBanner) {
      throw new Error('API is unavailable - cannot run tests');
    }
  }

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  async getCategoriesCount(): Promise<number> {
    return await this.categoryRows.count();
  }

  async getCategoryNames(): Promise<string[]> {
    // Wait for rows to be visible
    await this.categoryRows.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    
    const rows = await this.categoryRows.all();
    const names: string[] = [];
    
    for (const row of rows) {
      const text = await row.textContent();
      if (text && !text.includes('Carregando')) {
        // Extract category name (second column after #)
        const cells = await row.locator('td').allTextContents();
        if (cells.length > 1) {
          const categoryName = cells[1]?.trim().toLowerCase();
          if (categoryName) names.push(categoryName);
        }
      }
    }
    
    return names;
  }

  // ============================================================================
  // ITEMS - CRUD OPERATIONS
  // ============================================================================

  async getItemsCount(): Promise<number> {
    // Check if empty state is shown
    const emptyState = this.page.locator('text=Nenhum item cadastrado, text=No items');
    if (await emptyState.isVisible({ timeout: 1000 }).catch(() => false)) {
      return 0;
    }
    
    return await this.itemRows.count();
  }

  async clickAddItem() {
    await this.addItemButton.click();
    await expect(this.addItemDialog).toBeVisible();
  }

  async fillItemForm(data: {
    title: string;
    description: string;
    category: string;
    priority: string;
    tags?: string[];
  }) {
    await this.titleInput.fill(data.title);
    await this.descriptionInput.fill(data.description);
    
    // Select category
    await this.categorySelect.click();
    await this.page.locator(`option:has-text("${data.category}"), [role="option"]:has-text("${data.category}")`).first().click();
    
    // Select priority
    await this.prioritySelect.click();
    await this.page.locator(`option:has-text("${data.priority}"), [role="option"]:has-text("${data.priority}")`).first().click();
    
    // Add tags if provided
    if (data.tags && data.tags.length > 0) {
      await this.tagsInput.fill(data.tags.join(', '));
    }
  }

  async saveItem() {
    await this.saveButton.click();
    
    // Wait for dialog to close
    await expect(this.addItemDialog).not.toBeVisible({ timeout: 5000 });
    
    // Wait for success message (optional)
    if (await this.successMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.successMessage.waitFor({ state: 'hidden', timeout: 5000 });
    }
  }

  async createItem(data: {
    title: string;
    description: string;
    category: string;
    priority: string;
    tags?: string[];
  }) {
    const initialCount = await this.getItemsCount();
    
    await this.clickAddItem();
    await this.fillItemForm(data);
    await this.saveItem();
    
    // Verify item was created
    await this.page.waitForTimeout(1000); // Allow time for API response
    const finalCount = await this.getItemsCount();
    expect(finalCount).toBe(initialCount + 1);
  }

  async deleteFirstItem() {
    const initialCount = await this.getItemsCount();
    
    if (initialCount === 0) {
      throw new Error('No items to delete');
    }
    
    // Click delete button on first item
    await this.itemRows.first().locator('button:has-text("Excluir"), button[aria-label*="delete"]').click();
    
    // Confirm deletion if dialog appears
    if (await this.deleteConfirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.deleteConfirmDialog.locator('button:has-text("Confirmar"), button:has-text("Sim")').click();
    }
    
    // Verify item was deleted
    await this.page.waitForTimeout(1000);
    const finalCount = await this.getItemsCount();
    expect(finalCount).toBe(initialCount - 1);
  }

  // ============================================================================
  // SEARCH & FILTER
  // ============================================================================

  async searchItems(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async sortBy(column: string) {
    await this.page.locator(`th:has-text("${column}")`).click();
    await this.page.waitForTimeout(300);
  }

  // ============================================================================
  // KANBAN BOARD
  // ============================================================================

  async getKanbanColumnsCount(): Promise<number> {
    return await this.kanbanColumns.count();
  }

  async getItemsInColumn(status: string): Promise<number> {
    const column = this.page.locator(`[data-status="${status}"]`);
    return await column.locator('.kanban-card, [data-item-id]').count();
  }

  async dragItemToColumn(itemTitle: string, targetStatus: string) {
    const item = this.page.locator(`.kanban-card:has-text("${itemTitle}")`);
    const targetColumn = this.page.locator(`[data-status="${targetStatus}"]`);
    
    await item.dragTo(targetColumn);
    await this.page.waitForTimeout(500); // Allow drag animation
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `screenshots/workspace-${name}.png`,
      fullPage: true 
    });
  }

  async checkAccessibility() {
    // Basic accessibility checks
    const mainContent = this.page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
    
    // Check for proper heading hierarchy
    const h1 = this.page.locator('h1');
    await expect(h1).toHaveCount(1);
  }
}


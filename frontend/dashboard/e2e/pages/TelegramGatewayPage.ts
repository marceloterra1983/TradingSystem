import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Telegram Gateway
 * Provides reusable selectors and actions for E2E tests
 */
export class TelegramGatewayPage {
  readonly page: Page;
  
  // Navigation
  readonly url: string = '/#/telegram-gateway';
  
  // Header Elements
  readonly pageTitle: Locator;
  readonly refreshButton: Locator;
  readonly syncButton: Locator;
  
  // Status Cards
  readonly statusCards: Locator;
  readonly gatewayStatusCard: Locator;
  readonly messagesStatusCard: Locator;
  readonly channelsStatusCard: Locator;
  
  // Gateway Logs Card
  readonly gatewayLogsCard: Locator;
  readonly gatewayLogsToggle: Locator;
  readonly logsStatsGrid: Locator;
  readonly logsList: Locator;
  
  // Messages Filters
  readonly channelFilter: Locator;
  readonly limitFilter: Locator;
  readonly textSearchInput: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly clearFiltersButton: Locator;
  
  // Messages Table
  readonly messagesTable: Locator;
  readonly tableHeaders: Locator;
  readonly tableRows: Locator;
  readonly sortDateButton: Locator;
  readonly sortChannelButton: Locator;
  readonly sortTextButton: Locator;
  
  // Message Actions
  readonly viewMessageButtons: Locator;
  
  // Message Dialog
  readonly messageDialog: Locator;
  readonly dialogTitle: Locator;
  readonly dialogCloseButton: Locator;
  readonly messageText: Locator;
  readonly messageMetadata: Locator;
  readonly twitterPreview: Locator;
  readonly youtubePreview: Locator;
  readonly instagramPreview: Locator;
  readonly genericLinkPreview: Locator;
  readonly photoPreview: Locator;
  
  // Channel Management
  readonly addChannelButton: Locator;
  readonly channelForm: Locator;
  readonly channelIdInput: Locator;
  readonly channelLabelInput: Locator;
  readonly channelDescInput: Locator;
  readonly saveChannelButton: Locator;
  readonly channelsList: Locator;
  readonly channelToggleButtons: Locator;
  readonly channelEditButtons: Locator;
  readonly channelDeleteButtons: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Initialize all locators
    this.pageTitle = page.getByRole('heading', { name: /telegram gateway/i });
    this.refreshButton = page.getByRole('button', { name: /atualizar/i });
    this.syncButton = page.getByRole('button', { name: /checar mensagens/i });
    
    // Status cards
    this.statusCards = page.locator('[class*="rounded-lg"][class*="border"]').filter({ hasText: /status|mensagens|canais/i });
    this.gatewayStatusCard = page.getByRole('heading', { name: 'Status do Sistema' }).locator('..');
    this.messagesStatusCard = page.getByRole('heading', { name: /^Mensagens \(\d+ de/ }).locator('..');
    this.channelsStatusCard = page.getByRole('heading', { name: /^Canais Monitorados/ }).locator('..');
    
    // Gateway Logs
    this.gatewayLogsCard = page.getByRole('heading', { name: 'Gateway MTProto Logs' }).locator('..');
    this.gatewayLogsToggle = this.gatewayLogsCard.getByRole('button').first();
    this.logsStatsGrid = this.gatewayLogsCard.locator('[class*="grid grid-cols-4"]');
    this.logsList = this.gatewayLogsCard.locator('[class*="space-y"]');
    
    // Filters
    this.channelFilter = page.locator('[data-testid="channel-filter"], button:has-text("Canal")').first();
    this.limitFilter = page.locator('[data-testid="limit-filter"], button:has-text("registros")').first();
    this.textSearchInput = page.getByPlaceholder(/buscar/i);
    this.dateFromInput = page.getByLabel(/data inicial/i);
    this.dateToInput = page.getByLabel(/data final/i);
    this.clearFiltersButton = page.getByRole('button', { name: /limpar filtros/i });
    
    // Table
    this.messagesTable = page.locator('table').first();
    this.tableHeaders = this.messagesTable.locator('thead th');
    this.tableRows = this.messagesTable.locator('tbody tr');
    this.sortDateButton = page.getByRole('button', { name: /data/i }).first();
    this.sortChannelButton = page.getByRole('button', { name: /canal/i }).first();
    this.sortTextButton = page.getByRole('button', { name: /mensagem/i }).first();
    
    // Message actions
    this.viewMessageButtons = page.getByRole('button', { name: /^ver$/i });
    
    // Dialog
    this.messageDialog = page.locator('[role="dialog"]');
    this.dialogTitle = this.messageDialog.locator('[class*="DialogTitle"]');
    this.dialogCloseButton = this.messageDialog.getByRole('button', { name: /fechar|close|×/i });
    this.messageText = this.messageDialog.locator('text=/texto da mensagem/i').locator('..');
    this.messageMetadata = this.messageDialog.locator('text=/metadata/i');
    this.twitterPreview = this.messageDialog.locator('[class*="twitter"]', { hasText: /twitter|tweet/i });
    this.youtubePreview = this.messageDialog.locator('[class*="youtube"]');
    this.instagramPreview = this.messageDialog.locator('[class*="instagram"]');
    this.genericLinkPreview = this.messageDialog.locator('text=/link externo/i').locator('..');
    this.photoPreview = this.messageDialog.locator('img[alt]');
    
    // Channels
    this.addChannelButton = page.getByRole('button', { name: /adicionar canal/i });
    this.channelForm = page.locator('form').filter({ hasText: /channel id|canal/i });
    this.channelIdInput = page.getByLabel(/channel id/i);
    this.channelLabelInput = page.getByLabel(/label|etiqueta/i);
    this.channelDescInput = page.getByLabel(/descrição|description/i);
    this.saveChannelButton = page.getByRole('button', { name: /salvar|save/i });
    this.channelsList = page.locator('[data-testid="channels-list"], ul').filter({ hasText: /canal|channel/i });
    this.channelToggleButtons = page.locator('button[aria-label*="toggle"], button:has-text("Ativar")');
    this.channelEditButtons = page.getByRole('button', { name: /editar|edit/i });
    this.channelDeleteButtons = page.getByRole('button', { name: /deletar|delete|remover/i });
  }
  
  // Navigation Actions
  async goto() {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle');
  }
  
  async waitForPageLoad() {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 });
  }
  
  // Sync Actions
  async clickSyncMessages() {
    await this.syncButton.click();
    // Wait for sync to complete (look for success/error message)
    await this.page.waitForTimeout(2000);
  }

  async syncMessages() {
    await this.clickSyncMessages();
    await this.waitForSyncComplete();
  }
  
  async waitForSyncComplete() {
    // Wait for loading indicators to disappear
    await this.page.waitForTimeout(3000);
  }
  
  // Filter Actions
  async selectChannel(channelName: string) {
    await this.channelFilter.click();
    await this.page.getByRole('option', { name: new RegExp(channelName, 'i') }).click();
  }
  
  async selectLimit(limit: string) {
    await this.limitFilter.click();
    await this.page.getByRole('option', { name: new RegExp(`${limit}.*registros?`, 'i') }).click();
  }
  
  async searchText(searchTerm: string) {
    await this.textSearchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Debounce
  }
  
  async clearFilters() {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click();
    }
  }
  
  // Table Actions
  async getTableRowCount(): Promise<number> {
    return await this.tableRows.count();
  }
  
  async clickSortDate() {
    await this.sortDateButton.click();
  }
  
  async clickSortChannel() {
    await this.sortChannelButton.click();
  }
  
  async getFirstMessageText(): Promise<string> {
    const firstRow = this.tableRows.first();
    return await firstRow.locator('td').nth(2).textContent() || '';
  }
  
  async viewFirstMessage() {
    await this.viewMessageButtons.first().click();
    await this.messageDialog.waitFor({ state: 'visible' });
  }
  
  async viewMessageByIndex(index: number) {
    await this.viewMessageButtons.nth(index).click();
    await this.messageDialog.waitFor({ state: 'visible' });
  }
  
  // Dialog Actions
  async closeMessageDialog() {
    await this.dialogCloseButton.click();
    await this.messageDialog.waitFor({ state: 'hidden' });
  }
  
  async getDialogMessageText(): Promise<string> {
    return await this.messageText.textContent() || '';
  }
  
  async hasTwitterPreview(): Promise<boolean> {
    try {
      await this.twitterPreview.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
  
  async hasYouTubePreview(): Promise<boolean> {
    try {
      await this.youtubePreview.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
  
  async hasInstagramPreview(): Promise<boolean> {
    try {
      await this.instagramPreview.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
  
  async hasGenericLinkPreview(): Promise<boolean> {
    try {
      await this.genericLinkPreview.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
  
  async hasPhotoPreview(): Promise<boolean> {
    try {
      await this.photoPreview.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
  
  // Gateway Logs Actions
  async toggleGatewayLogs() {
    await this.gatewayLogsToggle.click();
  }
  
  async getLogCount(): Promise<number> {
    const logs = await this.logsList.locator('> div').count();
    return logs;
  }
  
  // Channel Management Actions
  async addChannel(channelId: string, label: string, description?: string) {
    await this.addChannelButton.click();
    await this.channelIdInput.fill(channelId);
    await this.channelLabelInput.fill(label);
    if (description) {
      await this.channelDescInput.fill(description);
    }
    await this.saveChannelButton.click();
    await this.page.waitForTimeout(1000);
  }
  
  async getChannelCount(): Promise<number> {
    return await this.channelsList.locator('li, > div').count();
  }
  
  // Utility Methods
  async takeFullPageScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `e2e/screenshots/${name}.png`, 
      fullPage: true 
    });
  }
  
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }
  
  async reload() {
    await this.page.reload();
    await this.waitForPageLoad();
  }
}

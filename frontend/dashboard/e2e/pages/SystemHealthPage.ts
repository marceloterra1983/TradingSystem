import { Page, Locator, expect } from '@playwright/test';

/**
 * System Health Page Object Model
 *
 * Encapsulates interactions with the System Health monitoring dashboard.
 * Created for Phase 2.1 - Testing Enhancement.
 *
 * Key Features:
 * - Health status monitoring (services + infrastructure)
 * - Auto-refresh functionality
 * - Service details expansion
 * - Export functionality
 * - Real-time status updates
 */

export class SystemHealthPage {
  readonly page: Page;

  // Main page elements
  readonly pageTitle: Locator;
  readonly refreshButton: Locator;
  readonly autoRefreshToggle: Locator;
  readonly exportButton: Locator;
  readonly lastUpdatedTime: Locator;

  // Overall health indicators
  readonly overallStatusBadge: Locator;
  readonly healthyCount: Locator;
  readonly degradedCount: Locator;
  readonly unhealthyCount: Locator;

  // Service sections
  readonly servicesSection: Locator;
  readonly infrastructureSection: Locator;

  // Service cards
  readonly serviceCards: Locator;
  readonly infrastructureCards: Locator;

  // Loading/error states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /system health|saúde do sistema/i }).first();
    this.refreshButton = page.locator('button:has-text("Atualizar"), button:has-text("Refresh")').first();
    this.autoRefreshToggle = page.locator('[type="checkbox"]').first();
    this.exportButton = page.locator('button:has-text("Exportar"), button:has-text("Export")').first();
    this.lastUpdatedTime = page.locator('text=/última atualização|last updated/i');

    // Overall health
    this.overallStatusBadge = page.locator('[data-testid="overall-status"], .status-badge').first();
    this.healthyCount = page.locator('[data-testid="healthy-count"], text=/\\d+\\s+(healthy|saudável)/i').first();
    this.degradedCount = page.locator('[data-testid="degraded-count"], text=/\\d+\\s+degraded/i').first();
    this.unhealthyCount = page.locator('[data-testid="unhealthy-count"], text=/\\d+\\s+(unhealthy|não saudável)/i').first();

    // Sections
    this.servicesSection = page.locator('[data-section="services"], section:has-text("Services"), section:has-text("Serviços")').first();
    this.infrastructureSection = page.locator('[data-section="infrastructure"], section:has-text("Infrastructure"), section:has-text("Infraestrutura")').first();

    // Cards
    this.serviceCards = page.locator('[data-card-type="service"], .service-card');
    this.infrastructureCards = page.locator('[data-card-type="infrastructure"], .infrastructure-card');

    // States
    this.loadingSpinner = page.locator('[role="status"], .loading-spinner, text=/carregando|loading/i').first();
    this.errorMessage = page.locator('[role="alert"], .error-message').filter({ hasText: /erro|error/i }).first();
  }

  /**
   * Navigate to System Health page
   */
  async goto() {
    await this.page.goto('/#/health');
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    // Wait for loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  /**
   * Click the manual refresh button
   */
  async clickRefresh() {
    await this.refreshButton.click();
    // Wait for refresh to start (loading indicator)
    await this.page.waitForTimeout(500);
    // Wait for refresh to complete
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Toggle auto-refresh functionality
   */
  async toggleAutoRefresh() {
    await this.autoRefreshToggle.click();
  }

  /**
   * Check if auto-refresh is enabled
   */
  async isAutoRefreshEnabled(): Promise<boolean> {
    return await this.autoRefreshToggle.isChecked();
  }

  /**
   * Click export button to download health report
   */
  async clickExport() {
    // Setup download listener
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportButton.click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * Get overall health status (healthy | degraded | unhealthy)
   */
  async getOverallStatus(): Promise<string> {
    const badge = await this.overallStatusBadge.textContent();
    const lower = badge?.toLowerCase() || '';

    if (lower.includes('healthy') || lower.includes('saudável')) return 'healthy';
    if (lower.includes('degraded')) return 'degraded';
    if (lower.includes('unhealthy') || lower.includes('não saudável')) return 'unhealthy';

    return 'unknown';
  }

  /**
   * Get count of healthy services
   */
  async getHealthyCount(): Promise<number> {
    const text = await this.healthyCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get count of degraded services
   */
  async getDegradedCount(): Promise<number> {
    const text = await this.degradedCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get count of unhealthy services
   */
  async getUnhealthyCount(): Promise<number> {
    const text = await this.unhealthyCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get total number of monitored components
   */
  async getTotalComponentCount(): Promise<number> {
    const serviceCount = await this.serviceCards.count();
    const infraCount = await this.infrastructureCards.count();
    return serviceCount + infraCount;
  }

  /**
   * Get service card by name
   */
  getServiceCard(serviceName: string): Locator {
    return this.page.locator(`[data-service="${serviceName}"], .service-card:has-text("${serviceName}")`).first();
  }

  /**
   * Get infrastructure card by name
   */
  getInfrastructureCard(infraName: string): Locator {
    return this.page.locator(`[data-infrastructure="${infraName}"], .infrastructure-card:has-text("${infraName}")`).first();
  }

  /**
   * Expand service details (dependency checks)
   */
  async expandServiceDetails(serviceName: string) {
    const card = this.getServiceCard(serviceName);
    const expandButton = card.locator('button:has-text("Details"), button:has-text("Detalhes"), button[aria-expanded]').first();

    if (await expandButton.isVisible()) {
      const isExpanded = await expandButton.getAttribute('aria-expanded');
      if (isExpanded === 'false') {
        await expandButton.click();
        await this.page.waitForTimeout(300); // Animation
      }
    }
  }

  /**
   * Get service status (healthy | degraded | unhealthy)
   */
  async getServiceStatus(serviceName: string): Promise<string> {
    const card = this.getServiceCard(serviceName);
    const statusBadge = card.locator('.status-badge, [data-testid="status-badge"]').first();
    const text = await statusBadge.textContent();
    const lower = text?.toLowerCase() || '';

    if (lower.includes('healthy') || lower.includes('saudável')) return 'healthy';
    if (lower.includes('degraded')) return 'degraded';
    if (lower.includes('unhealthy') || lower.includes('não saudável')) return 'unhealthy';

    return 'unknown';
  }

  /**
   * Get service response time
   */
  async getServiceResponseTime(serviceName: string): Promise<number | null> {
    const card = this.getServiceCard(serviceName);
    const responseTime = card.locator('text=/\\d+ms/i').first();

    if (await responseTime.isVisible({ timeout: 1000 }).catch(() => false)) {
      const text = await responseTime.textContent();
      const match = text?.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }

    return null;
  }

  /**
   * Get service uptime
   */
  async getServiceUptime(serviceName: string): Promise<string | null> {
    const card = this.getServiceCard(serviceName);
    const uptime = card.locator('text=/uptime|tempo ativo/i').first();

    if (await uptime.isVisible({ timeout: 1000 }).catch(() => false)) {
      return await uptime.textContent();
    }

    return null;
  }

  /**
   * Check if service has dependency checks visible
   */
  async hasDependencyChecks(serviceName: string): Promise<boolean> {
    await this.expandServiceDetails(serviceName);
    const card = this.getServiceCard(serviceName);
    const dependencies = card.locator('[data-testid="dependency"], .dependency-check');
    return await dependencies.count() > 0;
  }

  /**
   * Get dependency check status
   */
  async getDependencyStatus(serviceName: string, dependencyName: string): Promise<string> {
    await this.expandServiceDetails(serviceName);
    const card = this.getServiceCard(serviceName);
    const dependency = card.locator(`[data-dependency="${dependencyName}"], .dependency-check:has-text("${dependencyName}")`).first();
    const statusIcon = dependency.locator('svg, .status-icon').first();

    // Infer status from icon color/class
    const className = await statusIcon.getAttribute('class') || '';
    const lower = className.toLowerCase();

    if (lower.includes('green') || lower.includes('success')) return 'healthy';
    if (lower.includes('yellow') || lower.includes('warning')) return 'degraded';
    if (lower.includes('red') || lower.includes('error') || lower.includes('danger')) return 'unhealthy';

    return 'unknown';
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Wait for health data to refresh
   */
  async waitForRefresh() {
    // Wait for loading spinner to appear
    await this.loadingSpinner.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    // Wait for loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    // Small delay for UI update
    await this.page.waitForTimeout(500);
  }

  /**
   * Verify all expected services are present
   */
  async verifyExpectedServices(expectedServices: string[]): Promise<boolean> {
    for (const service of expectedServices) {
      const card = this.getServiceCard(service);
      if (!await card.isVisible({ timeout: 5000 }).catch(() => false)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Verify all expected infrastructure components are present
   */
  async verifyExpectedInfrastructure(expectedInfra: string[]): Promise<boolean> {
    for (const infra of expectedInfra) {
      const card = this.getInfrastructureCard(infra);
      if (!await card.isVisible({ timeout: 5000 }).catch(() => false)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get last updated timestamp
   */
  async getLastUpdatedTime(): Promise<string | null> {
    if (await this.lastUpdatedTime.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await this.lastUpdatedTime.textContent();
      // Extract time from text (e.g., "Last updated: 14:32:15")
      const match = text?.match(/(\d{1,2}:\d{2}:\d{2})/);
      return match ? match[1] : text;
    }
    return null;
  }

  /**
   * Reload the page
   */
  async reload() {
    await this.page.reload();
    await this.waitForPageLoad();
  }
}

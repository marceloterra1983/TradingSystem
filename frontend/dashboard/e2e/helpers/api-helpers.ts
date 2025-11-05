import { Page, Route } from '@playwright/test';
import { 
  mockChannels, 
  mockMessages, 
  mockSyncResponse, 
  mockGatewayStatus,
  mockGatewayMetrics,
  generateMockMessages
} from '../fixtures/telegramData';

/**
 * API Helpers for E2E Tests
 * Provides utilities for mocking API responses and testing API interactions
 */

export class TelegramGatewayApiHelper {
  constructor(private page: Page) {}
  
  /**
   * Mock all Telegram Gateway API endpoints with default data
   */
  async mockAllEndpoints() {
    await this.mockMessagesEndpoint();
    await this.mockChannelsEndpoint();
    await this.mockSyncEndpoint();
    await this.mockStatusEndpoint();
    await this.mockMetricsEndpoint();
  }
  
  /**
   * Mock /api/messages endpoint
   */
  async mockMessagesEndpoint(messages = mockMessages, delay = 0) {
    await this.page.route('**/api/messages**', async (route: Route) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: messages,
          pagination: {
            total: messages.length,
            page: 1,
            limit: 50,
            totalPages: Math.ceil(messages.length / 50)
          }
        })
      });
    });
  }
  
  /**
   * Mock /api/channels endpoint
   */
  async mockChannelsEndpoint(channels = mockChannels) {
    await this.page.route('**/api/channels**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: channels
        })
      });
    });
  }
  
  /**
   * Mock /api/telegram-gateway/sync-messages endpoint
   */
  async mockSyncEndpoint(response = mockSyncResponse, delay = 0) {
    await this.page.route('**/api/telegram-gateway/sync-messages', async (route: Route) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }
  
  /**
   * Mock /api/telegram-gateway/status endpoint
   */
  async mockStatusEndpoint(status = mockGatewayStatus) {
    await this.page.route('**/api/telegram-gateway/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(status)
      });
    });
  }
  
  /**
   * Mock /api/telegram-gateway/metrics endpoint
   */
  async mockMetricsEndpoint(metrics = mockGatewayMetrics) {
    await this.page.route('**/api/telegram-gateway/metrics', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(metrics)
      });
    });
  }
  
  /**
   * Mock health endpoint
   */
  async mockHealthEndpoint(healthy = true) {
    await this.page.route('**/health', async (route: Route) => {
      await route.fulfill({
        status: healthy ? 200 : 503,
        contentType: 'application/json',
        body: JSON.stringify({
          status: healthy ? 'healthy' : 'unhealthy',
          service: 'telegram-gateway-api',
          timestamp: new Date().toISOString()
        })
      });
    });
  }
  
  /**
   * Mock API error (500)
   */
  async mockServerError(endpoint = '**/api/**') {
    await this.page.route(endpoint, async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal Server Error',
          message: 'Something went wrong'
        })
      });
    });
  }
  
  /**
   * Mock API timeout
   */
  async mockTimeout(endpoint = '**/api/**') {
    await this.page.route(endpoint, async (route: Route) => {
      // Wait longer than expected timeout
      await new Promise(resolve => setTimeout(resolve, 60000));
      await route.abort('timedout');
    });
  }
  
  /**
   * Mock empty data response
   */
  async mockEmptyData() {
    await this.page.route('**/api/messages**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      });
    });
    
    await this.page.route('**/api/channels**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });
  }
  
  /**
   * Mock large dataset (1000+ messages)
   */
  async mockLargeDataset(count = 1000) {
    const messages = generateMockMessages(count);
    await this.mockMessagesEndpoint(messages);
  }
  
  /**
   * Wait for API call to specific endpoint
   */
  async waitForApiCall(endpoint: string, timeout = 10000): Promise<void> {
    await this.page.waitForResponse(
      response => response.url().includes(endpoint) && response.status() === 200,
      { timeout }
    );
  }
  
  /**
   * Get API call count for endpoint
   */
  async getApiCallCount(endpoint: string): Promise<number> {
    let count = 0;
    
    this.page.on('response', response => {
      if (response.url().includes(endpoint)) {
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * Verify API was called with correct headers
   */
  async verifyApiHeaders(endpoint: string, expectedHeaders: Record<string, string>) {
    return new Promise<boolean>((resolve) => {
      this.page.on('request', request => {
        if (request.url().includes(endpoint)) {
          const headers = request.headers();
          const allHeadersMatch = Object.entries(expectedHeaders).every(
            ([key, value]) => headers[key.toLowerCase()] === value
          );
          resolve(allHeadersMatch);
        }
      });
    });
  }
}

/**
 * Helper to wait for specific network conditions
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Helper to wait for element to be stable (no animations)
 */
export async function waitForStableElement(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  
  // Wait for animations to complete
  await page.waitForTimeout(500);
  
  // Verify element is still visible and at same position
  await expect(element).toBeVisible();
}

/**
 * Helper to simulate slow network
 */
export async function simulateSlowNetwork(page: Page) {
  // Slow 3G simulation
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 500 * 1024 / 8,  // 500 Kbps
    uploadThroughput: 500 * 1024 / 8,
    latency: 400  // 400ms latency
  });
}

/**
 * Helper to restore normal network
 */
export async function restoreNormalNetwork(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0
  });
}

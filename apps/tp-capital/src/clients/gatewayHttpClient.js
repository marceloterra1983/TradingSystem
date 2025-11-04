import CircuitBreaker from 'opossum';
import { logger } from '../logger.js';
import { config } from '../config.js';

/**
 * Gateway HTTP Client
 * 
 * Replaces direct database access to Gateway database with HTTP API calls.
 * Benefits:
 * - Decouples TP-Capital from Gateway database schema
 * - Removes cross-stack network dependency
 * - Enables independent deployment
 * - Simplifies authentication (API key only)
 * 
 * Circuit Breaker Protection:
 * - Timeout: 5s
 * - Error threshold: 50%
 * - Reset timeout: 30s
 * - Fallback: Return empty array (allows graceful degradation)
 */
export class GatewayHttpClient {
  constructor({ gatewayUrl, apiKey, channelId }) {
    this.gatewayUrl = gatewayUrl || config.gateway.url || 'http://localhost:4010';
    this.apiKey = apiKey || config.gateway.apiKey || process.env.TELEGRAM_GATEWAY_API_KEY;
    this.channelId = channelId || config.gateway.signalsChannelId;
    
    // Circuit breaker for resilience
    this.breaker = new CircuitBreaker(this.fetchUnprocessedInternal.bind(this), {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      name: 'gateway-http-client',
    });
    
    // Fallback: Return empty array on circuit open
    this.breaker.fallback(() => {
      logger.warn('[GatewayHttpClient] Circuit breaker OPEN, returning empty array');
      return [];
    });
    
    // Event listeners
    this.breaker.on('open', () => {
      logger.error('[GatewayHttpClient] Circuit breaker opened (too many failures)');
    });
    
    this.breaker.on('halfOpen', () => {
      logger.info('[GatewayHttpClient] Circuit breaker half-open (testing recovery)');
    });
    
    this.breaker.on('close', () => {
      logger.info('[GatewayHttpClient] Circuit breaker closed (recovered)');
    });
    
    logger.info({
      gatewayUrl: this.gatewayUrl,
      channelId: this.channelId,
      hasApiKey: !!this.apiKey,
    }, '[GatewayHttpClient] Initialized with HTTP API mode');
  }

  /**
   * Fetch unprocessed messages via HTTP API
   * 
   * @param {Object} options - Fetch options
   * @param {number} options.limit - Max messages to fetch (default: 100)
   * @returns {Promise<Array>} - Array of messages
   */
  async fetchUnprocessedMessages({ limit = 100 } = {}) {
    return await this.breaker.fire({ limit });
  }

  /**
   * Internal fetch method (wrapped by circuit breaker)
   * @private
   */
  async fetchUnprocessedInternal({ limit }) {
    const url = new URL('/api/messages/unprocessed', this.gatewayUrl);
    url.searchParams.set('channel', this.channelId);
    url.searchParams.set('excludeProcessedBy', 'tp-capital');
    url.searchParams.set('limit', String(limit));

    logger.debug({
      url: url.toString(),
      channelId: this.channelId,
      limit,
    }, '[GatewayHttpClient] Fetching unprocessed messages');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gateway API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Gateway API error: ${data.message || 'Unknown error'}`);
    }

    logger.debug({
      count: data.count,
      filters: data.filters,
    }, '[GatewayHttpClient] Fetched unprocessed messages');

    return data.data || [];
  }

  /**
   * Mark messages as processed via HTTP API
   * 
   * @param {Array<string>} messageIds - Array of message IDs
   * @returns {Promise<number>} - Number of messages marked
   */
  async markAsProcessed(messageIds) {
    if (!messageIds || messageIds.length === 0) {
      return 0;
    }

    const url = new URL('/api/messages/mark-processed', this.gatewayUrl);

    logger.debug({
      messageIds: messageIds.length,
    }, '[GatewayHttpClient] Marking messages as processed');

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-API-Key': this.apiKey }),
        },
        body: JSON.stringify({
          messageIds,
          processedBy: 'tp-capital',
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gateway API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Gateway API error: ${data.message || 'Unknown error'}`);
      }

      logger.debug({
        requested: data.data.requested,
        updated: data.data.updated,
      }, '[GatewayHttpClient] Messages marked as processed');

      return data.data.updated;
      
    } catch (error) {
      logger.error({
        err: error,
        messageIds: messageIds.length,
      }, '[GatewayHttpClient] Failed to mark messages as processed');
      
      // Non-fatal: Message processing succeeded, just acknowledgment failed
      // Next poll will skip them anyway (already saved with duplicate check)
      return 0;
    }
  }

  /**
   * Test connection to Gateway API
   * 
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      const url = new URL('/health', this.gatewayUrl);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        logger.info('[GatewayHttpClient] Connection test successful');
        return true;
      }
      
      logger.warn({
        status: response.status,
      }, '[GatewayHttpClient] Connection test failed (non-200 status)');
      
      return false;
      
    } catch (error) {
      logger.error({
        err: error,
        gatewayUrl: this.gatewayUrl,
      }, '[GatewayHttpClient] Connection test failed');
      
      return false;
    }
  }

  /**
   * Get circuit breaker stats
   * 
   * @returns {Object} - Circuit breaker stats
   */
  getStats() {
    return {
      isOpen: this.breaker.opened,
      isHalfOpen: this.breaker.halfOpen,
      isClosed: this.breaker.closed,
      stats: this.breaker.stats,
    };
  }

  /**
   * Close HTTP client (cleanup)
   */
  async close() {
    // No persistent connections to close (fetch uses HTTP/1.1 keep-alive by default)
    logger.info('[GatewayHttpClient] Closed');
  }
}

/**
 * Create singleton instance
 */
let httpClientInstance;

export const createGatewayHttpClient = (options) => {
  if (!httpClientInstance) {
    httpClientInstance = new GatewayHttpClient(options);
  }
  return httpClientInstance;
};

export const getGatewayHttpClient = () => {
  if (!httpClientInstance) {
    throw new Error('Gateway HTTP Client not initialized. Call createGatewayHttpClient() first.');
  }
  return httpClientInstance;
};


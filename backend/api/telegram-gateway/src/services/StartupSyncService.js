/**
 * Startup Synchronization Service
 * 
 * Automatically synchronizes the latest messages from all monitored channels
 * when the Telegram Gateway service starts. This ensures that the local database
 * is always up-to-date with the channels being monitored.
 * 
 * Features:
 * - Waits for Telegram connection to be established
 * - Syncs all active channels in parallel
 * - Configurable via environment variables
 * - Non-blocking (errors don't prevent server startup)
 * - Detailed logging for observability
 * 
 * Environment Variables:
 * - TELEGRAM_GATEWAY_SYNC_ON_STARTUP: Enable/disable startup sync (default: true)
 * - TELEGRAM_GATEWAY_STARTUP_SYNC_DELAY: Delay before sync in ms (default: 5000)
 * - TELEGRAM_GATEWAY_STARTUP_SYNC_LIMIT: Max messages per channel (default: 500)
 * - TELEGRAM_GATEWAY_STARTUP_SYNC_CONCURRENCY: Parallel channel syncs (default: 3)
 */

import { MessageSyncService } from './MessageSyncService.js';
import { getTelegramClient } from './TelegramClientService.js';
import { listChannels } from '../db/channelsRepository.js';

export class StartupSyncService {
  /**
   * @param {Object} logger - Pino logger instance
   */
  constructor(logger) {
    this.logger = logger;
    
    // Configuration from environment variables
    this.enabled = this.parseBoolean(process.env.TELEGRAM_GATEWAY_SYNC_ON_STARTUP, true);
    this.delay = parseInt(process.env.TELEGRAM_GATEWAY_STARTUP_SYNC_DELAY || '5000', 10);
    this.limit = parseInt(process.env.TELEGRAM_GATEWAY_STARTUP_SYNC_LIMIT || '500', 10);
    this.concurrency = parseInt(process.env.TELEGRAM_GATEWAY_STARTUP_SYNC_CONCURRENCY || '3', 10);
  }

  /**
   * Parse boolean from environment variable
   */
  parseBoolean(value, defaultValue) {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    return value.toLowerCase() === 'true';
  }

  /**
   * Execute startup synchronization
   * 
   * This is the main entry point called from server.js after the server starts.
   * It runs asynchronously and won't block the server startup.
   */
  async execute() {
    if (!this.enabled) {
      this.logger.info('[StartupSync] Startup synchronization disabled (TELEGRAM_GATEWAY_SYNC_ON_STARTUP=false)');
      return;
    }

    this.logger.info(
      { delay: this.delay, limit: this.limit, concurrency: this.concurrency },
      '[StartupSync] Startup synchronization enabled - will run after delay'
    );

    // Run sync in background (non-blocking)
    setTimeout(() => {
      this.runSync().catch(error => {
        this.logger.error(
          { err: error },
          '[StartupSync] Startup synchronization failed - service will continue running'
        );
      });
    }, this.delay);
  }

  /**
   * Run the actual synchronization logic
   * 
   * ARCHITECTURAL FIX: Delegate to MTProto service via HTTP
   * This service already has an authenticated Telegram session
   * Avoids duplicate authentication and follows single responsibility principle
   */
  async runSync() {
    const startTime = Date.now();
    
    try {
      this.logger.info('[StartupSync] Starting automatic synchronization...');

      // Step 1: Call MTProto service endpoint (has authenticated session)
      const mtprotoServiceUrl = process.env.MTPROTO_SERVICE_URL || 'http://localhost:4007';
      
      this.logger.info(
        { mtprotoServiceUrl, limit: this.limit },
        '[StartupSync] Delegating to MTProto service via HTTP'
      );
      
      const response = await fetch(`${mtprotoServiceUrl}/sync-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: this.limit
        }),
        signal: AbortSignal.timeout(90000) // 90s timeout for startup
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          { status: response.status, error: errorText },
          '[StartupSync] MTProto service returned error'
        );
        return;
      }

      const result = await response.json();
      
      const totalSynced = result.data?.totalMessagesSynced || 0;
      const channelsSynced = result.data?.channelsSynced || [];
      const duration = Date.now() - startTime;
      
      this.logger.info(
        {
          totalMessagesSynced: totalSynced,
          channelsSynced: channelsSynced.length,
          durationMs: duration,
          durationSeconds: (duration / 1000).toFixed(2)
        },
        '[StartupSync] ✅ Startup synchronization completed successfully'
      );

      // Log per-channel details
      channelsSynced.forEach(channel => {
        this.logger.info(
          {
            channelId: channel.channelId,
            label: channel.label,
            messagesSynced: channel.messagesSynced
          },
          `[StartupSync] Channel synchronized: ${channel.label || channel.channelId}`
        );
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(
        {
          err: error,
          errorMessage: error.message,
          errorStack: error.stack,
          durationMs: duration
        },
        '[StartupSync] ❌ Startup synchronization failed'
      );

      // Log specific error types
      if (error.code === 'ECONNREFUSED') {
        this.logger.error('[StartupSync] MTProto service not available - check if service is running on port 4007');
      } else if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
        this.logger.error('[StartupSync] Timeout connecting to MTProto service - sync may take longer than 90s');
      } else if (error.message?.includes('Network')) {
        this.logger.error('[StartupSync] Network error - check connectivity');
      }

      // Don't throw - let the service continue running
    }
  }
}

/**
 * Helper function to initialize and run startup sync
 * 
 * Usage in server.js:
 * 
 * import { initializeStartupSync } from './services/StartupSyncService.js';
 * 
 * const server = app.listen(port, () => {
 *   logger.info({ port }, 'Server started');
 *   initializeStartupSync(logger);
 * });
 */
export async function initializeStartupSync(logger) {
  const syncService = new StartupSyncService(logger);
  await syncService.execute();
}


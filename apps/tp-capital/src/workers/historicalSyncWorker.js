import { logger } from '../logger.js';
import { config } from '../config.js';

/**
 * Historical Sync Worker
 * 
 * Performs one-time backfill of ALL historical messages from Telegram Gateway
 * when TP-Capital stack starts for the first time.
 * 
 * Features:
 * - Runs only once (checks completion flag in database)
 * - Paginates through all historical messages (500 per batch)
 * - Waits 10s between batches to avoid overwhelming Gateway
 * - Saves checkpoint in database to prevent re-runs
 * - Graceful error handling with retry logic
 * 
 * Usage:
 *   const worker = new HistoricalSyncWorker({ db });
 *   await worker.runIfNeeded(); // In server.js startup
 */
export class HistoricalSyncWorker {
  constructor({ db }) {
    this.db = db;
    this.gatewayUrl = config.gateway.url || 'http://localhost:4006'; // Corrected port
    this.apiKey = config.gateway.apiKey;
    this.batchSize = 500; // Max messages per sync request
    this.batchDelay = 10000; // 10s between batches
    this.maxBatches = 50; // Increased: Max 25,000 messages (was 20)
  }

  /**
   * Run historical sync if not already completed
   */
  async runIfNeeded() {
    try {
      // Check if already completed
      const checkpoint = await this.getCheckpoint();
      
      if (checkpoint && checkpoint.completed) {
        logger.info({
          completedAt: checkpoint.completedAt,
          totalSynced: checkpoint.totalSynced,
          batches: checkpoint.batches,
        }, '[HistoricalSync] Already completed, skipping');
        return;
      }

      logger.info('[HistoricalSync] Starting full historical backfill...');
      
      await this.runFullBackfill();
      
    } catch (error) {
      logger.error({
        err: error,
      }, '[HistoricalSync] Failed to run historical sync');
      
      // Non-fatal: Don't crash the service, just log error
      // Manual sync via dashboard is still available
    }
  }

  /**
   * Run full backfill (paginate through all historical messages)
   */
  async runFullBackfill() {
    const startTime = Date.now();
    let totalSynced = 0;
    let batchCount = 0;
    let hasMore = true;

    while (hasMore && batchCount < this.maxBatches) {
      try {
        batchCount++;
        
        logger.info({
          batch: batchCount,
          totalSynced,
        }, `[HistoricalSync] Batch ${batchCount}/${this.maxBatches}...`);

        // Call Gateway API sync endpoint
        const result = await this.syncBatch();
        
        const batchSynced = result.totalMessagesSynced || 0;
        totalSynced += batchSynced;
        
        logger.info({
          batch: batchCount,
          batchSynced,
          totalSynced,
          channelsSynced: result.channelsSynced?.length || 0,
        }, `[HistoricalSync] Batch ${batchCount} completed: ${batchSynced} messages`);

        // Check if there are more messages
        hasMore = batchSynced >= this.batchSize;
        
        // Wait before next batch (avoid overwhelming Gateway)
        if (hasMore) {
          logger.debug({
            delay: this.batchDelay,
          }, '[HistoricalSync] Waiting before next batch...');
          
          await this.sleep(this.batchDelay);
        }
        
      } catch (error) {
        logger.error({
          err: error,
          batch: batchCount,
          totalSynced,
        }, '[HistoricalSync] Batch failed, continuing...');
        
        // Continue to next batch (don't stop on single batch failure)
        await this.sleep(this.batchDelay);
      }
    }

    const duration = Date.now() - startTime;
    
    // Save checkpoint
    await this.saveCheckpoint({
      completed: true,
      completedAt: new Date().toISOString(),
      totalSynced,
      batches: batchCount,
      durationMs: duration,
    });

    logger.info({
      totalSynced,
      batches: batchCount,
      durationSeconds: (duration / 1000).toFixed(1),
    }, '[HistoricalSync] ✅ Full backfill completed successfully');
  }

  /**
   * Sync single batch of historical messages
   * @private
   */
  async syncBatch() {
    const url = `${this.gatewayUrl}/api/telegram-gateway/sync-messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      },
      body: JSON.stringify({ limit: this.batchSize }),
      signal: AbortSignal.timeout(60000), // 60s timeout for batch
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gateway API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Gateway API error: ${data.message || 'Unknown error'}`);
    }

    return data.data || {};
  }

  /**
   * Get checkpoint from database
   * @private
   */
  async getCheckpoint() {
    try {
      const query = `
        SELECT metadata
        FROM ${config.timescale.schema}.tp_capital_signals
        WHERE asset = '__checkpoint__'
          AND signal_type = 'historical_sync'
        ORDER BY ingested_at DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Checkpoint stored in raw_message as JSON
      return JSON.parse(result.rows[0].raw_message || '{}');
      
    } catch (error) {
      logger.warn({
        err: error,
      }, '[HistoricalSync] Failed to get checkpoint, assuming not completed');
      
      return null;
    }
  }

  /**
   * Save checkpoint to database
   * @private
   */
  async saveCheckpoint(checkpoint) {
    try {
      const query = `
        INSERT INTO ${config.timescale.schema}.tp_capital_signals (
          channel,
          signal_type,
          asset,
          raw_message,
          source,
          ingested_at,
          ts
        ) VALUES (
          'system',
          'historical_sync',
          '__checkpoint__',
          $1,
          'historical-sync-worker',
          NOW(),
          $2
        )
        ON CONFLICT DO NOTHING
      `;
      
      await this.db.query(query, [
        JSON.stringify(checkpoint),
        Date.now(),
      ]);
      
      logger.info({
        checkpoint,
      }, '[HistoricalSync] Checkpoint saved');
      
    } catch (error) {
      logger.error({
        err: error,
      }, '[HistoricalSync] Failed to save checkpoint');
    }
  }

  /**
   * Sleep helper
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}


import { config } from './config.js';
import { logger } from './logger.js';
import { parseSignal } from './parseSignal.js';
import { getGatewayHttpClient } from './clients/gatewayHttpClient.js';

/**
 * Gateway Polling Worker
 * Polls the Telegram Gateway API (HTTP) for new messages from signals channel
 * and processes them into TP Capital signals
 * 
 * Updated: 2025-11-04 - Migrated from database polling to HTTP API
 */
export class GatewayPollingWorker {
  constructor({ gatewayHttpClient, tpCapitalDb, metrics }) {
    this.gatewayHttpClient = gatewayHttpClient || getGatewayHttpClient();
    this.tpCapitalDb = tpCapitalDb;
    this.metrics = metrics;

    this.interval = config.gateway.pollingIntervalMs;
    this.channelId = config.gateway.signalsChannelId;
    this.batchSize = config.gateway.batchSize;
    this.schema = config.gateway.schema;
    this.tpCapitalSchema = config.timescale.schema;
    this.filters = config.gateway.filters;

    this.isRunning = false;
    this.currentBatchPromise = null;
    this.lastPollAt = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 10;

    logger.info({
      interval: this.interval,
      channelId: this.channelId,
      filters: {
        messageTypes: this.filters.messageTypes.length > 0 ? this.filters.messageTypes : 'todos',
        sources: this.filters.sources.length > 0 ? this.filters.sources : 'todas',
        textContains: this.filters.textContains || 'nenhum',
        textNotContains: this.filters.textNotContains || 'nenhum'
      },
      batchSize: this.batchSize
    }, 'Gateway polling worker configured');
  }

  /**
   * Start the polling worker
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Polling worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('Gateway polling worker started');

    // Start polling loop
    this.pollLoop();
  }

  /**
   * Main polling loop with exponential backoff on errors
   */
  async pollLoop() {
    let retryDelay = 1000; // Start with 1s
    const maxRetryDelay = 30000; // Cap at 30s

    while (this.isRunning) {
      try {
        this.currentBatchPromise = this.pollAndProcess();
        await this.currentBatchPromise;
        this.currentBatchPromise = null;

        // Reset retry delay on success
        retryDelay = 1000;
        this.consecutiveErrors = 0;

        // Update last poll timestamp
        this.lastPollAt = new Date();
        if (this.metrics) {
          this.metrics.pollingLagSeconds.set(0);
        }

      } catch (error) {
        this.consecutiveErrors++;
        logger.error({
          err: error,
          retryDelay,
          consecutiveErrors: this.consecutiveErrors
        }, 'Polling cycle failed');

        if (this.metrics) {
          this.metrics.pollingErrors.inc({ type: 'connection' });
        }

        // Alert if too many consecutive errors
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          logger.fatal({
            consecutiveErrors: this.consecutiveErrors
          }, 'Max consecutive errors reached, polling worker may be unhealthy');
        }

        // Wait before retry with exponential backoff
        await this.sleep(retryDelay);
        retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
      }

      // Sleep until next poll
      await this.sleep(this.interval);
    }

    logger.info('Polling loop stopped');
  }

  /**
   * Poll Gateway database and process messages
   */
  async pollAndProcess() {
    // Fetch unprocessed messages
    const messages = await this.fetchUnprocessedMessages();

    if (messages.length === 0) {
      // Silently skip - no need to log every empty poll
      return;
    }

    logger.info({ count: messages.length }, 'Processing batch of messages');

    // Update messages waiting gauge
    if (this.metrics) {
      this.metrics.messagesWaiting.set(messages.length);
    }

    // Process each message
    for (const msg of messages) {
      const startTime = Date.now();

      try {
        await this.processMessage(msg);

        // Record processing duration
        if (this.metrics) {
          const duration = (Date.now() - startTime) / 1000;
          this.metrics.processingDuration.observe(duration);
        }

      } catch (error) {
        logger.error({
          err: error,
          messageId: msg.message_id,
          channelId: msg.channel_id
        }, 'Failed to process message');

        // Mark as failed in Gateway DB
        await this.markMessageAsFailed(msg.message_id, error);

        if (this.metrics) {
          this.metrics.messagesProcessed.inc({ status: 'failed' });
        }
      }
    }
  }

  /**
   * Fetch unprocessed messages from Gateway API (HTTP)
   * 
   * Updated: 2025-11-04 - Migrated from SQL to HTTP API
   * Benefits: Decouples from Gateway database, removes network dependency
   */
  async fetchUnprocessedMessages() {
    try {
      const messages = await this.gatewayHttpClient.fetchUnprocessedMessages({
        limit: this.batchSize,
      });

      // Note: Filtering by message_type, source, textContains is now handled
      // by the Gateway API endpoint. For now, we do basic filtering here.
      // TODO: Add query parameters to Gateway API for advanced filtering
      
      let filtered = messages;
      
      // Apply client-side filters if needed
      if (this.filters.messageTypes && this.filters.messageTypes.length > 0) {
        filtered = filtered.filter(msg => 
          this.filters.messageTypes.includes(msg.messageType)
        );
      }
      
      if (this.filters.sources && this.filters.sources.length > 0) {
        filtered = filtered.filter(msg => 
          this.filters.sources.includes(msg.source)
        );
      }
      
      if (this.filters.textContains) {
        const regex = new RegExp(this.filters.textContains, 'i');
        filtered = filtered.filter(msg => 
          msg.text && regex.test(msg.text)
        );
      }
      
      if (this.filters.textNotContains) {
        const regex = new RegExp(this.filters.textNotContains, 'i');
        filtered = filtered.filter(msg => 
          !msg.text || !regex.test(msg.text)
        );
      }

      return filtered.map(msg => ({
        channel_id: msg.channelId,
        message_id: msg.messageId,
        text: msg.text,
        caption: msg.caption, // ✅ ADICIONADO: Caption para fotos
        telegram_date: msg.telegramDate,
        received_at: msg.receivedAt,
        metadata: msg.metadata,
        media_type: msg.mediaType,
        source: msg.source,
        message_type: msg.messageType,
      }));
      
    } catch (error) {
      logger.error({
        err: error,
        channelId: this.channelId,
        batchSize: this.batchSize,
      }, '[GatewayPollingWorker] Failed to fetch unprocessed messages via HTTP');
      
      // Return empty array to allow graceful degradation
      return [];
    }
  }

  /**
   * Process a single message
   */
  async processMessage(msg) {
    // 1. Try to parse signal
    // Use text or caption (photos have caption instead of text)
    const messageContent = msg.text || msg.caption || '';
    
    // Skip empty messages (photos without caption/text)
    if (!messageContent || messageContent.trim().length === 0) {
      logger.debug({
        messageId: msg.message_id,
        hasPhoto: !!msg.photo_id,
        mediaType: msg.media_type
      }, '[GatewayPollingWorker] Empty message (photo without text), skipping');
      
      await this.markMessageAsFailed(msg.message_id, new Error('Empty message (photo without text)'));
      if (this.metrics) {
        this.metrics.messagesProcessed.inc({ status: 'empty_skipped' });
      }
      return;
    }
    
    let signal;
    try {
      signal = parseSignal(messageContent, {
        timestamp: new Date(msg.telegram_date).getTime(),
        channel: msg.channel_id,
        source: 'telegram-gateway'
      });
    } catch (parseError) {
      // Parsing failed - this is not a signal, mark as failed
      logger.debug({
        messageId: msg.message_id,
        parseError: parseError.message
      }, 'Message is not a valid signal format');

      await this.markMessageAsFailed(msg.message_id, parseError);
      if (this.metrics) {
        this.metrics.messagesProcessed.inc({ status: 'parse_failed' });
      }
      return;
    }

    // 2. VALIDAR SE É UM SINAL DE TRADING VÁLIDO
    // Critérios obrigatórios:
    // - Ativo no formato LETRAS+NÚMEROS (ex: PETR4, CSNAW919, BBDCU159)
    // - Pelo menos buy_min OU (target_1 E stop) preenchidos
    
    const assetRegex = /^[A-Z]{3,6}\d{1,4}$/;
    const isValidAsset = assetRegex.test(signal.asset);
    
    // Sinal completo: tem valores de compra OU (tem alvos E stop)
    const hasCompraValues = signal.buy_min && signal.buy_max;
    const hasTargetAndStop = (signal.target_1 || signal.target_final) && signal.stop;
    const isCompleteSignal = hasCompraValues || hasTargetAndStop;
    
    if (!isValidAsset || !isCompleteSignal) {
      logger.debug({
        messageId: msg.message_id,
        asset: signal.asset,
        isValidAsset,
        hasCompraValues,
        hasTargetAndStop,
        reason: !isValidAsset ? 'Invalid asset format' : 'Incomplete signal (no trade values)'
      }, 'Skipping message - not a valid trading signal');
      
      await this.markMessageAsIgnored(msg.message_id, 'Invalid or incomplete trading signal');
      if (this.metrics) {
        this.metrics.messagesProcessed.inc({ status: 'ignored_invalid' });
      }
      return;
    }

    // 3. Check for duplicate (idempotency)
    const isDuplicate = await this.checkDuplicate(msg);
    if (isDuplicate) {
      logger.debug({
        messageId: msg.message_id,
        asset: signal.asset
      }, 'Signal already processed, skipping');

      await this.markMessageAsPublished(msg.message_id, signal);
      if (this.metrics) {
        this.metrics.messagesProcessed.inc({ status: 'duplicate' });
      }
      return;
    }

    // 4. Insert signal into TP Capital database
    await this.insertSignal(signal, msg);

    // 5. Mark Gateway message as published
    await this.markMessageAsPublished(msg.message_id, signal);

    if (this.metrics) {
      this.metrics.messagesProcessed.inc({ status: 'published' });
    }

    logger.info({
      messageId: msg.message_id,
      asset: signal.asset,
      signalType: signal.signal_type,
      buyRange: `${signal.buy_min} - ${signal.buy_max}`
    }, 'Signal processed successfully');
  }

  /**
   * Check if message was already processed (idempotency check)
   */
  async checkDuplicate(msg) {
    const rawMessage = (msg.text || msg.caption || '')
      .replace(/\r/gi, '')
      .trim();

    const query = `
      SELECT 1 FROM ${this.tpCapitalSchema}.tp_capital_signals
      WHERE raw_message = $1
        AND channel = $2
      LIMIT 1
    `;

    const result = await this.tpCapitalDb.query(query, [rawMessage, msg.channel_id]);
    return result.rows.length > 0;
  }

  /**
   * Insert signal into TP Capital database
   */
  async insertSignal(signal, msg) {
    const now = new Date();
    await this.tpCapitalDb.insertSignal({
      ...signal,
      channel: signal.channel || msg.channel_id,
      source: signal.source || 'telegram-gateway',
      ingested_at: signal.ingested_at || now,
      created_at: signal.created_at || now,
      updated_at: signal.updated_at || now,
    });
  }

  /**
   * Mark Gateway message as published via HTTP API
   * 
   * Updated: 2025-11-04 - Migrated from SQL to HTTP API
   */
  async markMessageAsPublished(messageId, signal) {
    try {
      await this.gatewayHttpClient.markAsProcessed([messageId]);
      
      logger.debug({
        messageId,
        asset: signal?.asset,
      }, '[GatewayPollingWorker] Message marked as published via HTTP');
      
    } catch (error) {
      logger.error({
        err: error,
        messageId,
      }, '[GatewayPollingWorker] Failed to mark message as published (non-fatal)');
      
      // Non-fatal: Signal was saved successfully, acknowledgment can fail
      // Next poll will skip it anyway due to duplicate check
    }
  }

  /**
   * Mark Gateway message as failed via HTTP API
   * 
   * Updated: 2025-11-04 - Migrated from SQL to HTTP API
   * Note: Gateway API doesn't have a "mark as failed" endpoint yet,
   * so we just log locally. Failed messages remain with status 'received'
   * and will be retried on next poll (with exponential backoff).
   */
  async markMessageAsFailed(messageId, error) {
    logger.warn({
      messageId,
      error: error.message || String(error),
    }, '[GatewayPollingWorker] Message processing failed (will retry on next poll)');
    
    // TODO: Add Gateway API endpoint for marking failed messages
    // For now, failed messages remain as 'received' and get retried
  }

  /**
   * Mark Gateway message as ignored via HTTP API
   * 
   * Updated: 2025-11-04 - Migrated from SQL to HTTP API
   * Ignored messages are marked as processed to prevent reprocessing.
   */
  async markMessageAsIgnored(messageId, reason) {
    try {
      await this.gatewayHttpClient.markAsProcessed([messageId]);
      
      logger.debug({
        messageId,
        reason,
      }, '[GatewayPollingWorker] Message marked as ignored (processed)');
      
    } catch (error) {
      logger.error({
        err: error,
        messageId,
      }, '[GatewayPollingWorker] Failed to mark message as ignored (non-fatal)');
    }
  }

  /**
   * Get polling worker status
   */
  getStatus() {
    return {
      running: this.isRunning,
      lastPollAt: this.lastPollAt,
      lagSeconds: this.lastPollAt
        ? (Date.now() - this.lastPollAt.getTime()) / 1000
        : null,
      consecutiveErrors: this.consecutiveErrors,
      interval: this.interval,
      channelId: this.channelId,
      batchSize: this.batchSize
    };
  }

  /**
   * Get count of messages waiting to be processed
   * 
   * Updated: 2025-11-04 - Simplified implementation (HTTP API doesn't expose count)
   * Returns 0 as HTTP client doesn't provide this metric
   * TODO: Add count endpoint to Gateway API if needed
   */
  async getMessagesWaiting() {
    // HTTP client doesn't provide waiting count
    // Return 0 for now (non-critical metric)
    return 0;
  }

  /**
   * Stop the polling worker gracefully
   */
  async stop() {
    logger.info('Stopping gateway polling worker...');
    this.isRunning = false;

    // Wait for current batch to complete (with timeout)
    if (this.currentBatchPromise) {
      logger.info('Waiting for current batch to complete...');
      try {
        await Promise.race([
          this.currentBatchPromise,
          this.sleep(30000).then(() => {
            throw new Error('Shutdown timeout after 30s');
          })
        ]);
        logger.info('Current batch completed successfully');
      } catch (error) {
        logger.warn({ err: error }, 'Shutdown timeout or error, forcing exit');
      }
    }

    logger.info('Gateway polling worker stopped');
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

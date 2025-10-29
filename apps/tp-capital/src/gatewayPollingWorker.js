import { config } from './config.js';
import { logger } from './logger.js';
import { parseSignal } from './parseSignal.js';

/**
 * Gateway Polling Worker
 * Polls the Telegram Gateway database for new messages from signals channel
 * and processes them into TP Capital signals
 */
export class GatewayPollingWorker {
  constructor({ gatewayDb, tpCapitalDb, metrics }) {
    this.gatewayDb = gatewayDb;
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
   * Fetch unprocessed messages from Gateway database
   */
  async fetchUnprocessedMessages() {
    const conditions = ['channel_id = $1', 'status = $2'];
    const params = [this.channelId, 'received'];
    let paramIndex = 3;

    // Filtro por message_type
    if (this.filters.messageTypes && this.filters.messageTypes.length > 0) {
      conditions.push(`message_type = ANY($${paramIndex}::text[])`);
      params.push(this.filters.messageTypes);
      paramIndex++;
    }

    // Filtro por source
    if (this.filters.sources && this.filters.sources.length > 0) {
      conditions.push(`source = ANY($${paramIndex}::text[])`);
      params.push(this.filters.sources);
      paramIndex++;
    }

    // Filtro por texto contém (usando regex case-insensitive)
    if (this.filters.textContains) {
      conditions.push(`text ~* $${paramIndex}`);
      params.push(this.filters.textContains);
      paramIndex++;
    }

    // Filtro por texto NÃO contém
    if (this.filters.textNotContains) {
      conditions.push(`text !~* $${paramIndex}`);
      params.push(this.filters.textNotContains);
      paramIndex++;
    }

    const query = `
      SELECT channel_id, message_id, text, telegram_date, received_at, metadata, media_type, source, message_type
      FROM ${this.schema}.messages
      WHERE ${conditions.join(' AND ')}
      ORDER BY received_at ASC
      LIMIT $${paramIndex}
    `;

    params.push(this.batchSize);

    const result = await this.gatewayDb.query(query, params);
    return result.rows;
  }

  /**
   * Process a single message
   */
  async processMessage(msg) {
    // 1. Try to parse signal
    let signal;
    try {
      signal = parseSignal(msg.text, {
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

    // 2. Validar se é um sinal COMPLETO (com valores de compra)
    // APENAS sinais completos devem ser salvos na tabela
    if (!signal.buy_min || !signal.buy_max) {
      logger.debug({
        messageId: msg.message_id,
        asset: signal.asset,
        hasBuyMin: !!signal.buy_min,
        hasBuyMax: !!signal.buy_max
      }, 'Message parsed but incomplete signal (no buy values) - ignoring');

      await this.markMessageAsIgnored(msg.message_id, 'Incomplete signal - missing buy values');
      if (this.metrics) {
        this.metrics.messagesProcessed.inc({ status: 'ignored_incomplete' });
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
    const query = `
      SELECT 1 FROM ${this.tpCapitalSchema}.tp_capital_signals
      WHERE raw_message = $1
        AND channel = $2
      LIMIT 1
    `;

    const result = await this.tpCapitalDb.query(query, [msg.text, msg.channel_id]);
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
   * Mark Gateway message as published
   */
  async markMessageAsPublished(messageId, signal) {
    const metadata = {
      processed_by: 'tp-capital',
      processed_at: new Date().toISOString(),
      signal_asset: signal?.asset || 'unknown'
    };

    const query = `
      UPDATE ${this.schema}.messages
      SET status = 'published',
          metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
      WHERE message_id = $2
    `;

    await this.gatewayDb.query(query, [JSON.stringify(metadata), messageId]);
  }

  /**
   * Mark Gateway message as failed
   */
  async markMessageAsFailed(messageId, error) {
    const metadata = {
      processed_by: 'tp-capital',
      failed_at: new Date().toISOString(),
      error: error.message || String(error)
    };

    const query = `
      UPDATE ${this.schema}.messages
      SET status = 'failed',
          metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
      WHERE message_id = $2
    `;

    try {
      await this.gatewayDb.query(query, [JSON.stringify(metadata), messageId]);
    } catch (updateError) {
      logger.error({
        err: updateError,
        messageId
      }, 'Failed to mark message as failed');
    }
  }

  /**
   * Mark Gateway message as ignored (not a complete signal)
   * Uses 'reprocessed' status with metadata to indicate it was intentionally skipped
   */
  async markMessageAsIgnored(messageId, reason) {
    const metadata = {
      processed_by: 'tp-capital',
      ignored_at: new Date().toISOString(),
      reason: reason,
      ignored: true
    };

    const query = `
      UPDATE ${this.schema}.messages
      SET status = 'reprocessed',
          metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
      WHERE message_id = $2
    `;

    try {
      await this.gatewayDb.query(query, [JSON.stringify(metadata), messageId]);
    } catch (updateError) {
      logger.error({
        err: updateError,
        messageId
      }, 'Failed to mark message as ignored');
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
   */
  async getMessagesWaiting() {
    return await this.gatewayDb.getWaitingMessagesCount(this.channelId);
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

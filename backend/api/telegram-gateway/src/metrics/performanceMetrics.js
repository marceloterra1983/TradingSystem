import promClient from 'prom-client';

/**
 * Performance Metrics for Telegram Gateway
 * 
 * Tracks:
 * - Message synchronization performance
 * - Database operation performance
 * - Telegram API latency
 * - Lock contention
 */

// Sync duration histogram
export const syncDurationHistogram = new promClient.Histogram({
  name: 'telegram_gateway_sync_duration_seconds',
  help: 'Time to synchronize messages from a channel',
  labelNames: ['channel_id', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],  // Up to 60 seconds
});

// Messages synced counter
export const messagesSyncedCounter = new promClient.Counter({
  name: 'telegram_gateway_messages_synced_total',
  help: 'Total messages synchronized from Telegram',
  labelNames: ['channel_id', 'source'],
});

// Messages saved counter
export const messagesSavedCounter = new promClient.Counter({
  name: 'telegram_gateway_messages_saved_total',
  help: 'Total messages saved to database',
  labelNames: ['channel_id'],
});

// Database bulk insert duration
export const bulkInsertDurationHistogram = new promClient.Histogram({
  name: 'telegram_gateway_bulk_insert_duration_seconds',
  help: 'Time to perform bulk insert of messages',
  labelNames: ['message_count_bucket'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],  // Up to 5 seconds
});

// Database query duration
export const dbQueryDurationHistogram = new promClient.Histogram({
  name: 'telegram_gateway_db_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Telegram API call duration
export const telegramApiDurationHistogram = new promClient.Histogram({
  name: 'telegram_gateway_telegram_api_duration_seconds',
  help: 'Time to fetch messages from Telegram API',
  labelNames: ['channel_id'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30],
});

// Lock contention counter
export const lockContentionCounter = new promClient.Counter({
  name: 'telegram_gateway_lock_contention_total',
  help: 'Number of times a lock was already held',
  labelNames: ['lock_key'],
});

// Parallel sync gauge (current concurrency)
export const parallelSyncGauge = new promClient.Gauge({
  name: 'telegram_gateway_parallel_sync_current',
  help: 'Current number of parallel channel syncs in progress',
});

/**
 * Helper: Measure database query duration
 */
export const measureDbQuery = async (operation, queryFn) => {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = (Date.now() - startTime) / 1000;
    dbQueryDurationHistogram.observe({ operation }, duration);
    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    dbQueryDurationHistogram.observe({ operation: `${operation}:error` }, duration);
    throw error;
  }
};

/**
 * Helper: Measure Telegram API call duration
 */
export const measureTelegramApi = async (channelId, apiFn) => {
  const startTime = Date.now();
  try {
    const result = await apiFn();
    const duration = (Date.now() - startTime) / 1000;
    telegramApiDurationHistogram.observe({ channel_id: channelId }, duration);
    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    telegramApiDurationHistogram.observe({ channel_id: `${channelId}:error` }, duration);
    throw error;
  }
};

/**
 * Helper: Track sync performance for a channel
 */
export const trackChannelSync = (channelId) => {
  const startTime = Date.now();
  
  return {
    recordSuccess: (messageCount, savedCount) => {
      const duration = (Date.now() - startTime) / 1000;
      syncDurationHistogram.observe({ channel_id: channelId, status: 'success' }, duration);
      messagesSyncedCounter.inc({ channel_id: channelId, source: 'mtproto' }, messageCount);
      messagesSavedCounter.inc({ channel_id: channelId }, savedCount);
    },
    recordError: () => {
      const duration = (Date.now() - startTime) / 1000;
      syncDurationHistogram.observe({ channel_id: channelId, status: 'error' }, duration);
    },
  };
};


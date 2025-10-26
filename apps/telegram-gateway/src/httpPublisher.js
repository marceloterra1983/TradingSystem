import { config } from './config.js';
import { logger } from './logger.js';
import { saveToFailureQueue } from './failureQueue.js';
import {
  recordPublishAttempt,
  recordMessagePublished,
  recordMessageFailed,
  recordMessageQueued,
} from './messageStore.js';

/**
 * Publish message to API with exponential backoff retry logic
 * @param {Object} messageData - Message payload
 * @param {number} attempt - Current retry attempt (0-based)
 * @returns {Promise<{success: boolean, queued?: boolean}>}
 */
export async function publishWithRetry(messageData, attempt = 0) {
  const { maxRetries, baseDelayMs } = config.retry;
  let lastError;

  for (const endpoint of config.api.endpoints) {
    try {
      const startedAt = Date.now();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Token': config.api.secretToken,
        },
        body: JSON.stringify(messageData),
        signal: AbortSignal.timeout(config.api.timeout),
      });
      const latencyMs = Date.now() - startedAt;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info(
        {
          endpoint,
          messageId: messageData.messageId,
          channelId: messageData.channelId,
          attempt,
          latencyMs,
        },
        'Message published successfully',
      );

      await recordMessagePublished(messageData, {
        endpoint,
        attempt,
        latencyMs,
        logger,
      });

      return { success: true, result };
    } catch (error) {
      lastError = error;

      logger.warn(
        {
          endpoint,
          error: error.message,
          attempt,
          messageId: messageData.messageId,
        },
        'Failed to publish message',
      );

      await recordPublishAttempt(messageData, {
        attempt,
        endpoint,
        error: error.message,
        logger,
      });

      const isLastEndpoint =
        endpoint === config.api.endpoints[config.api.endpoints.length - 1];

      if (isLastEndpoint && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.info(
          { delay, attempt: attempt + 1, maxRetries },
          'Retrying after delay...',
        );

        await sleep(delay);
        return publishWithRetry(messageData, attempt + 1);
      }
    }
  }

  logger.error(
    {
      messageId: messageData.messageId,
      channelId: messageData.channelId,
      attempts: maxRetries + 1,
      lastError: lastError?.message,
    },
    'Max retries exceeded, saving to failure queue',
  );

  await recordMessageFailed(messageData, {
    error: lastError?.message,
    logger,
  });

  await recordMessageQueued(messageData, {
    queuePath: config.failureQueue.path,
    error: lastError?.message,
    logger,
  });

  await saveToFailureQueue(messageData);
  return { success: false, queued: true };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

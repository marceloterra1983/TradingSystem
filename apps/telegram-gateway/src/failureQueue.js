import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Append message to JSONL failure queue
 * @param {Object} messageData - Message that failed to publish
 */
export async function saveToFailureQueue(messageData) {
  try {
    const queuePath = config.failureQueue.path;

    // Ensure directory exists
    const dir = path.dirname(queuePath);
    await fs.mkdir(dir, { recursive: true });

    // Append message with failedAt timestamp
    const entry = JSON.stringify({
      ...messageData,
      failedAt: new Date().toISOString(),
    });

    await fs.appendFile(queuePath, entry + '\n', 'utf8');

    logger.info({
      queuePath,
      messageId: messageData.messageId,
    }, 'Message saved to failure queue');

  } catch (error) {
    logger.error({
      err: error,
      messageId: messageData.messageId,
    }, 'Failed to save message to failure queue');
  }
}

/**
 * Get current failure queue size
 * @returns {Promise<number>} Number of messages in queue
 */
export async function getQueueSize() {
  try {
    const queuePath = config.failureQueue.path;
    const content = await fs.readFile(queuePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    return lines.length;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 0; // Queue file doesn't exist yet
    }
    logger.error({ err: error }, 'Failed to read failure queue');
    return 0;
  }
}

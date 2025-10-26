import express from 'express';
import { authGateway } from '../middleware/authGateway.js';

const router = express.Router();

/**
 * POST /ingest
 * Receives messages from Telegram Gateway
 * Validates payload and stores in TimescaleDB with idempotency checks
 */
router.post('/ingest', authGateway, async (req, res) => {
  // Access dependencies from app.locals (set in server.js)
  const logger = req.app.get('logger') || console;
  const timescaleClient = req.app.locals.timescaleClient;
  const metrics = req.app.locals.metrics;

  try {
    const { channelId, messageId, text, timestamp, photos } = req.body;

    // Validate required fields
    const errors = [];
    if (!channelId) errors.push('channelId is required');
    if (messageId === undefined || messageId === null) errors.push('messageId is required');
    if (!text) errors.push('text is required');
    if (!timestamp) errors.push('timestamp is required');

    if (errors.length > 0) {
      logger.warn({ errors, body: req.body }, 'Validation failed');
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Validate timestamp format
    const parsedTimestamp = new Date(timestamp);
    if (isNaN(parsedTimestamp.getTime())) {
      logger.warn({ timestamp }, 'Invalid timestamp format');
      return res.status(400).json({
        error: 'Validation failed',
        details: ['timestamp must be valid ISO 8601 datetime'],
      });
    }

    // Validate channelId format (Telegram channels start with -100)
    if (!channelId.toString().startsWith('-100')) {
      logger.warn({ channelId }, 'Unusual channelId format (expected -100...)');
    }

    // Store in TimescaleDB with idempotency check
    try {
      const result = await timescaleClient.insertSignalWithIdempotency({
        channelId: channelId.toString(),
        messageId: parseInt(messageId, 10),
        text,
        timestamp: parsedTimestamp.toISOString(),
        photos: photos || [],
      });

      if (result.inserted) {
        // Track metrics
        if (metrics?.messagesIngestedTotal) {
          metrics.messagesIngestedTotal.inc({ channel_id: channelId, result: 'inserted' });
        }

        logger.info({
          channelId,
          messageId,
          textPreview: text.substring(0, 50),
        }, 'Signal stored successfully');

        return res.status(200).json({
          success: true,
          messageId,
          stored: true,
        });
      } else {
        // Duplicate - idempotency check prevented insertion
        if (metrics?.messagesIngestedTotal) {
          metrics.messagesIngestedTotal.inc({ channel_id: channelId, result: 'duplicate' });
        }

        logger.info({
          channelId,
          messageId,
        }, 'Duplicate message skipped (idempotent)');

        return res.status(200).json({
          success: true,
          messageId,
          stored: false,
          reason: 'duplicate',
        });
      }

    } catch (dbError) {
      logger.error({ err: dbError, channelId, messageId }, 'Database error storing signal');

      return res.status(503).json({
        error: 'Database connection failed',
      });
    }

  } catch (error) {
    logger.error({ err: error }, 'Unexpected error in /ingest endpoint');
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;

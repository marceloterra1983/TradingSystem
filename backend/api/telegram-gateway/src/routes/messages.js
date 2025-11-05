import { Router } from 'express';
import {
  listMessages,
  getMessageById,
  softDeleteMessage,
  markReprocessRequested,
  findUnprocessed,
  markAsProcessed,
} from '../db/messagesRepository.js';
import { invalidateCaches } from '../services/telegramGatewayFacade.js';
import { cacheWithETag, invalidateCache } from '../middleware/cachingMiddleware.js';

export const messagesRouter = Router();

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim());
};

/**
 * GET /api/messages/unprocessed - Fetch unprocessed messages for downstream consumers
 * 
 * Query Parameters:
 * - channel: Channel ID (required)
 * - excludeProcessedBy: Consumer name to exclude (optional, e.g., 'tp-capital')
 * - limit: Max messages to return (default: 1000, max: 10000)
 * 
 * Used by TP-Capital and other services to poll for new messages
 * IMPORTANT: This route MUST come BEFORE /:id to avoid matching "unprocessed" as an ID
 */
messagesRouter.get('/unprocessed', async (req, res, next) => {
  try {
    const channelId = req.query.channel ? String(req.query.channel).trim() : undefined;
    
    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "channel" is required',
      });
    }

    const filters = {
      channelId,
      statuses: req.query.status 
        ? String(req.query.status).split(',').map(s => s.trim())
        : ['received'],
      excludeProcessedBy: req.query.excludeProcessedBy 
        ? String(req.query.excludeProcessedBy).trim()
        : undefined,
      limit: req.query.limit,
    };

    const messages = await findUnprocessed(filters, req.log);

    res.json({
      success: true,
      data: messages,
      count: messages.length,
      filters: {
        channelId: filters.channelId,
        statuses: filters.statuses,
        excludeProcessedBy: filters.excludeProcessedBy,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/messages/mark-processed - Mark messages as processed by a consumer
 * 
 * Body:
 * - messageIds: Array of message IDs (required)
 * - processedBy: Consumer name (required, e.g., 'tp-capital')
 * 
 * Used by downstream services to acknowledge message processing
 * IMPORTANT: This route MUST come BEFORE /:id to avoid path conflicts
 */
messagesRouter.post('/mark-processed', async (req, res, next) => {
  try {
    const { messageIds, processedBy } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Body parameter "messageIds" must be a non-empty array',
      });
    }

    if (!processedBy || typeof processedBy !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Body parameter "processedBy" is required',
      });
    }

    const updated = await markAsProcessed(messageIds, processedBy, req.log);

    res.json({
      success: true,
      message: `${updated} message(s) marked as processed`,
      data: {
        requested: messageIds.length,
        updated,
        processedBy,
      },
    });
    
    // Invalidate caches after status change
    invalidateCaches();
  } catch (error) {
    next(error);
  }
});

// Cache message list for 60 seconds (frequently accessed)
messagesRouter.get('/', cacheWithETag(60), async (req, res, next) => {
  try {
    const filters = {
      channelId: req.query.channelId
        ? Array.isArray(req.query.channelId)
          ? req.query.channelId
          : String(req.query.channelId)
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
        : undefined,
      messageId: req.query.messageId ? String(req.query.messageId).trim() : undefined,
      status: req.query.status,
      source: req.query.source
        ? Array.isArray(req.query.source)
          ? req.query.source
          : String(req.query.source)
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
        : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      search: req.query.search ? String(req.query.search).trim() : undefined,
      includeDeleted: parseBoolean(req.query.includeDeleted),
      sort: req.query.sort ? String(req.query.sort) : undefined,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const result = await listMessages(filters, req.log);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.rows.length < result.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

messagesRouter.get('/:id', async (req, res, next) => {
  try {
    const message = await getMessageById(req.params.id, req.log);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.json({
      success: true,
      data: message,
    });
    invalidateCaches();
  } catch (error) {
    next(error);
  }
});

// Invalidate cache after delete
messagesRouter.delete('/:id', invalidateCache(['/api/messages']), async (req, res, next) => {
  try {
    const message = await softDeleteMessage(req.params.id, {
      reason: req.body?.reason,
      logger: req.log,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

messagesRouter.post('/:id/reprocess', async (req, res, next) => {
  try {
    const requestedBy =
      typeof req.body?.requestedBy === 'string' && req.body.requestedBy.trim().length > 0
        ? req.body.requestedBy.trim()
        : 'dashboard';

    const message = await markReprocessRequested(req.params.id, {
      requestedBy,
      logger: req.log,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.json({
      success: true,
      data: message,
      message: 'Reprocess request registered',
    });
    invalidateCaches();
  } catch (error) {
    next(error);
  }
});

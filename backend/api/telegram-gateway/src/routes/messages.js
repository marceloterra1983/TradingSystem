import { Router } from 'express';
import {
  listMessages,
  getMessageById,
  softDeleteMessage,
  markReprocessRequested,
} from '../db/messagesRepository.js';

export const messagesRouter = Router();

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim());
};

messagesRouter.get('/', async (req, res, next) => {
  try {
    const filters = {
      channelId: req.query.channelId ? String(req.query.channelId).trim() : undefined,
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
  } catch (error) {
    next(error);
  }
});

messagesRouter.delete('/:id', async (req, res, next) => {
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
  } catch (error) {
    next(error);
  }
});

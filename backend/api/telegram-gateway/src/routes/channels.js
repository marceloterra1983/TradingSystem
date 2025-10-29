import { Router } from 'express';
import {
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
} from '../db/channelsRepository.js';
import { invalidateCaches } from '../services/telegramGatewayFacade.js';

export const channelsRouter = Router();

channelsRouter.get('/', async (req, res, next) => {
  try {
    const channels = await listChannels({ logger: req.log });
    res.json({
      success: true,
      data: channels,
    });
  } catch (error) {
    next(error);
  }
});

channelsRouter.post('/', async (req, res, next) => {
  try {
    const { channelId, label, description, isActive } = req.body ?? {};
    if (typeof channelId === 'undefined' || channelId === null || String(channelId).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'O campo "channelId" é obrigatório',
      });
    }

    const channel = await createChannel({
      channelId,
      label,
      description,
      isActive,
      logger: req.log,
    });

    res.status(201).json({
      success: true,
      data: channel,
    });
    invalidateCaches();
  } catch (error) {
    if (error.code === 'INVALID_CHANNEL_ID') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    // Unique violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Já existe um canal cadastrado com este ID',
      });
    }
    // Invalid text representation (e.g., invalid bigint)
    if (error.code === '22P02') {
      return res.status(400).json({
        success: false,
        message: 'Canal inválido: formato do channelId incorreto',
      });
    }
    // Log unexpected error for troubleshooting
    req.log?.error?.({ err: error }, 'Failed to create channel');
    next(error);
  }
});

channelsRouter.put('/:id', async (req, res, next) => {
  try {
    const updated = await updateChannel(req.params.id, req.body ?? {}, { logger: req.log });
    res.json({
      success: true,
      data: updated,
    });
    invalidateCaches();
  } catch (error) {
    if (error.code === 'INVALID_CHANNEL_ID') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Canal não encontrado',
      });
    }
    if (error.code === 'NO_CHANGES') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    if (error.code === '22P02') {
      return res.status(400).json({
        success: false,
        message: 'Canal inválido: formato do channelId incorreto',
      });
    }
    req.log?.error?.({ err: error }, 'Failed to update channel');
    next(error);
  }
});

channelsRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteChannel(req.params.id, { logger: req.log });
    res.json({
      success: true,
    });
    invalidateCaches();
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Canal não encontrado',
      });
    }
    req.log?.error?.({ err: error }, 'Failed to delete channel');
    next(error);
  }
});

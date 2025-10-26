const express = require('express');
const telegramGatewayService = require('../services/telegram-gateway');

const router = express.Router();

router.post('/actions/reload', (_req, res) => {
  telegramGatewayService.invalidateCaches();
  res.json({
    success: true,
    message: 'Telegram Gateway caches invalidated',
    timestamp: new Date().toISOString(),
  });
});

router.get('/auth/status', (_req, res) => {
  const status = telegramGatewayService.getAuthenticationStatus();
  res.json({
    success: true,
    data: status,
  });
});

router.post('/auth/start', (_req, res, next) => {
  try {
    const status = telegramGatewayService.startAuthentication();
    res.json({
      success: true,
      data: status,
      message: 'Processo de autenticação iniciado',
    });
  } catch (error) {
    if (error.code === 'ALREADY_RUNNING') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

router.post('/auth/input', (req, res, next) => {
  const value = typeof req.body?.value === 'string' ? req.body.value.trim() : '';
  if (!value) {
    return res.status(400).json({
      success: false,
      message: 'Campo "value" é obrigatório',
    });
  }

  try {
    telegramGatewayService.submitAuthenticationInput(value);
    res.json({
      success: true,
      message: 'Entrada enviada ao processo de autenticação',
      data: telegramGatewayService.getAuthenticationStatus(),
    });
  } catch (error) {
    if (error.code === 'NO_PROCESS') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

router.post('/auth/cancel', (_req, res, next) => {
  try {
    telegramGatewayService.cancelAuthentication();
    res.json({
      success: true,
      message: 'Cancelamento solicitado',
      data: telegramGatewayService.getAuthenticationStatus(),
    });
  } catch (error) {
    if (error.code === 'NO_PROCESS') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

router.get('/overview', async (_req, res, next) => {
  try {
    const data = await telegramGatewayService.getOverview();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/metrics', async (_req, res, next) => {
  try {
    const metrics = await telegramGatewayService.getMetrics();
    res.json({
      success: !metrics.error,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/session', async (_req, res, next) => {
  try {
    const session = await telegramGatewayService.getSession();
    res.json({
      success: !session.error,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/queue', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const queue = await telegramGatewayService.getQueue(limit);
    res.json({
      success: !queue.error,
      data: queue,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/messages/summary', async (_req, res, next) => {
  try {
    const summary = await telegramGatewayService.buildMessageSummary();
    res.json({
      success: !summary?.error,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/messages', async (req, res, next) => {
  try {
    const data = await telegramGatewayService.listMessages(req.query);
    res.json({
      success: true,
      data: data.data ?? data,
      pagination: data.pagination ?? null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/messages/:id/reprocess', async (req, res, next) => {
  try {
    const result = await telegramGatewayService.requestMessageReprocess(req.params.id, req.body);
    res.json({
      success: true,
      data: result.data ?? result,
      message: result.message || 'Reprocess request registered',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/messages/:id', async (req, res, next) => {
  try {
    const result = await telegramGatewayService.deleteMessage(req.params.id, req.body);
    res.json({
      success: true,
      data: result.data ?? result,
      message: result.message || 'Message deleted',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/channels', async (req, res, next) => {
  try {
    const result = await telegramGatewayService.listChannels(req.query);
    res.json({
      success: true,
      data: result.data ?? result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/channels', async (req, res, next) => {
  const { channelId, label, description, isActive } = req.body || {};

  if (typeof channelId === 'undefined' || channelId === null || String(channelId).trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Campo "channelId" é obrigatório',
    });
  }

  try {
    const result = await telegramGatewayService.createChannel({
      channelId,
      label,
      description,
      isActive,
    });
    res.status(201).json({
      success: true,
      data: result.data ?? result,
      message: 'Canal cadastrado com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

router.put('/channels/:id', async (req, res, next) => {
  try {
    const result = await telegramGatewayService.updateChannel(req.params.id, req.body || {});
    res.json({
      success: true,
      data: result.data ?? result,
      message: 'Canal atualizado com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/channels/:id', async (req, res, next) => {
  try {
    await telegramGatewayService.deleteChannel(req.params.id);
    res.json({
      success: true,
      message: 'Canal removido com sucesso',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

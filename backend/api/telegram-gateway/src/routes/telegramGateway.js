import { Router } from 'express';
import {
  buildMessageSummary,
  cancelAuthentication,
  getAuthenticationStatus,
  getMetrics,
  getOverview,
  getQueue,
  getQueuePreviewLimit,
  getSession,
  invalidateCaches,
  startAuthentication,
  submitAuthenticationInput,
} from '../services/telegramGatewayFacade.js';

export const telegramGatewayRouter = Router();

telegramGatewayRouter.post('/actions/reload', (_req, res) => {
  invalidateCaches();
  res.json({
    success: true,
    message: 'Caches invalidados com sucesso',
    timestamp: new Date().toISOString(),
  });
});

telegramGatewayRouter.get('/auth/status', (_req, res) => {
  res.json({
    success: true,
    data: getAuthenticationStatus(),
  });
});

telegramGatewayRouter.post('/auth/start', (_req, res, next) => {
  try {
    const status = startAuthentication();
    res.json({
      success: true,
      message: 'Processo de autenticação iniciado',
      data: status,
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

telegramGatewayRouter.post('/auth/input', (req, res, next) => {
  const value = typeof req.body?.value === 'string' ? req.body.value.trim() : '';
  if (!value) {
    return res.status(400).json({
      success: false,
      message: 'Campo "value" é obrigatório',
    });
  }

  try {
    submitAuthenticationInput(value);
    res.json({
      success: true,
      message: 'Entrada enviada ao processo de autenticação',
      data: getAuthenticationStatus(),
    });
  } catch (error) {
    if (error.code === 'NO_PROCESS') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    if (error.code === 'STDIN_CLOSED') {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

telegramGatewayRouter.post('/auth/cancel', (_req, res, next) => {
  try {
    cancelAuthentication();
    res.json({
      success: true,
      message: 'Cancelamento solicitado',
      data: getAuthenticationStatus(),
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

telegramGatewayRouter.get('/overview', async (req, res, next) => {
  try {
    const data = await getOverview({ logger: req.log });
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get('/metrics', async (_req, res, next) => {
  try {
    const data = await getMetrics();
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get('/queue', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = await getQueue({ limit });
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get('/session', async (_req, res, next) => {
  try {
    const data = await getSession();
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get('/messages/summary', async (req, res, next) => {
  try {
    const data = await buildMessageSummary({ logger: req.log });
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get('/queue/preview-limit', (_req, res) => {
  res.json({
    success: true,
    data: {
      limit: getQueuePreviewLimit(),
    },
  });
});

// PROTECTED ENDPOINT: Require API key authentication
telegramGatewayRouter.post('/sync-messages', async (req, res, next) => {
  // Validate API key first
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.TELEGRAM_GATEWAY_API_KEY;
  
  if (!expectedKey) {
    req.log?.error?.('[Auth] TELEGRAM_GATEWAY_API_KEY not configured');
    return res.status(500).json({
      success: false,
      error: 'API authentication not configured',
      message: 'Server misconfiguration: API key not set',
    });
  }
  
  if (!apiKey || apiKey !== expectedKey) {
    req.log?.warn?.({ ip: req.ip, path: req.path }, '[Auth] Invalid or missing API key');
    return res.status(apiKey ? 403 : 401).json({
      success: false,
      error: apiKey ? 'Forbidden' : 'Unauthorized',
      message: apiKey ? 'Invalid API key' : 'Missing X-API-Key header',
    });
  }
  
  // API key validated, continue with sync logic
  try {
    req.log.info('[SyncMessages] Sync requested via dashboard (authenticated)');
    
    const { limit = 500, channels, concurrency = 3 } = req.body;
    
    // Get Telegram client
    const { getTelegramClient } = await import('../services/TelegramClientService.js');
    const telegramClient = await getTelegramClient();
    await telegramClient.connect();
    
    // Determine which channels to sync
    const { listChannels } = await import('../db/channelsRepository.js');
    const activeChannels = await listChannels({ logger: req.log });
    const activeChannelIds = activeChannels
      .filter(ch => ch.isActive)
      .map(ch => ch.channelId);
    
    const channelsToSync = channels || 
                          (activeChannelIds.length > 0 ? activeChannelIds : [process.env.TELEGRAM_SIGNALS_CHANNEL_ID]);
    
    req.log.info(
      { channelCount: channelsToSync.length },
      '[SyncMessages] Channels to sync determined'
    );
    
    // REFACTORED: Delegate to service layer (Clean Architecture)
    const { MessageSyncService } = await import('../services/MessageSyncService.js');
    const syncService = new MessageSyncService(telegramClient, req.log);
    
    const result = await syncService.syncChannels({
      channelIds: channelsToSync,
      limit,
      concurrency
    });
    
    // HTTP response handling (route responsibility)
    return res.json({
      success: true,
      message: result.totalMessagesSynced > 0 
        ? `${result.totalMessagesSynced} mensagem(ns) sincronizada(s) de ${result.channelsSynced.length} canal(is). ${result.totalMessagesSaved} salvas no banco.`
        : 'Todas as mensagens estão sincronizadas',
      data: {
        totalMessagesSynced: result.totalMessagesSynced,
        totalMessagesSaved: result.totalMessagesSaved,
        channelsSynced: result.channelsSynced,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    req.log.error({ err: error }, '[SyncMessages] Unexpected error');
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar sincronização',
      error: error.message,
    });
  }
});

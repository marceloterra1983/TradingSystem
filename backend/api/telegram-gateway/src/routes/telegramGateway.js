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

telegramGatewayRouter.post('/sync-messages', async (req, res, next) => {
  try {
    req.log.info('[SyncMessages] Sincronização solicitada via dashboard');
    
    // Este endpoint faz proxy para o gateway MTProto (porta 4006)
    // que tem acesso ao TelegramClient
    const gatewayPort = Number(process.env.TELEGRAM_GATEWAY_PORT || 4006);
    const gatewayUrl = process.env.TELEGRAM_GATEWAY_URL || `http://localhost:${gatewayPort}`;
    
    try {
      const proxyResponse = await fetch(`${gatewayUrl}/sync-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await proxyResponse.json();
      
      if (proxyResponse.ok) {
        req.log.info(
          { totalSynced: result.data?.totalMessagesSynced },
          '[SyncMessages] Sincronização concluída com sucesso'
        );
        return res.json(result);
      } else {
        req.log.warn({ result }, '[SyncMessages] Gateway retornou erro');
        return res.status(proxyResponse.status).json(result);
      }
    } catch (fetchError) {
      req.log.error(
        { err: fetchError, gatewayUrl },
        '[SyncMessages] Erro ao conectar com Telegram Gateway MTProto'
      );
      
      return res.status(503).json({
        success: false,
        message: 'Telegram Gateway MTProto não está acessível. Verifique se o serviço está rodando na porta 4006.',
        error: fetchError.message,
        data: { totalMessagesSynced: 0 }
      });
    }
    
  } catch (error) {
    next(error);
  }
});

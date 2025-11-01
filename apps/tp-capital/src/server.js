/**
 * TP Capital API - Migrated to use shared modules
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Using shared logger (backend/shared/logger)
 * - Using shared middleware (backend/shared/middleware)
 * - Standardized health check endpoint
 * - Correlation ID support
 */

import express from 'express';
import promClient from 'prom-client';
import path from 'path';
import { fileURLToPath } from 'url';

// Shared modules
import { createLogger } from '../../../backend/shared/logger/index.js';
import {
  configureCors,
  configureRateLimit,
  configureHelmet,
  createErrorHandler,
  createNotFoundHandler,
  createCorrelationIdMiddleware,
} from '../../../backend/shared/middleware/index.js';
import { createHealthCheckHandler } from '../../../backend/shared/middleware/health.js';
import { configureCompression, compressionMetrics } from '../../../backend/shared/middleware/compression.js';

// Service-specific modules
import { config, validateConfig } from './config.js';
import { getLogs } from './logStore.js';
import { timescaleClient } from './timescaleClient.js';
import { getGatewayDatabaseClient, closeGatewayDatabaseClient } from './gatewayDatabaseClient.js';
import { GatewayPollingWorker } from './gatewayPollingWorker.js';
import { gatewayMetrics } from './gatewayMetrics.js';
import { createTelegramUserForwarderPolling } from './telegramUserForwarderPolling.js';
import { formatTimestamp } from './timeUtils.js';
import ingestionRouter from '../api/src/routes/ingestion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logger
const logger = createLogger('tp-capital', {
  version: '1.0.0',
  base: {
    channelId: config.gateway?.signalsChannelId,
  },
});

validateConfig(logger);

const app = express();

// Expose shared resources to nested routers
app.set('logger', logger);
app.locals.metrics = {
  ...gatewayMetrics,
  // Maintain compatibility with ingestion router expectations
  messagesIngestedTotal: gatewayMetrics.messagesProcessed,
};
app.locals.timescaleClient = timescaleClient;

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register, prefix: 'tp_capital_' });

// ============================================================================
// MIDDLEWARE STACK (using shared modules)
// ============================================================================

// 1. Correlation ID (must be first for tracing)
app.use(createCorrelationIdMiddleware());

// 2. Response compression (OPT-001: 40% payload reduction, ~60ms savings)
app.use(compressionMetrics);
app.use(configureCompression({ logger }));

// 3. Security headers (Helmet)
app.use(configureHelmet({ logger }));

// 4. CORS configuration
app.use(configureCors({ logger }));

// 5. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Rate limiting (environment-based)
app.use(configureRateLimit({ logger }));

// ============================================================================
// ROUTES
// ============================================================================

// Mount ingestion route (receives from Telegram Gateway)
app.use('/', ingestionRouter);

// Servir imagens estáticas do Telegram
app.use('/telegram-images', express.static(path.join(__dirname, '..', 'public', 'telegram-images')));

// Health check endpoint (standardized with dependency checks)
app.get('/health', createHealthCheckHandler({
  serviceName: 'tp-capital',
  version: '1.0.0',
  logger,
  checks: {
    timescaledb: async () => {
      const healthy = await timescaleClient.healthcheck();
      if (!healthy) throw new Error('TimescaleDB unhealthy');
      return 'connected';
    },
    gatewayDatabase: async () => {
      const gatewayDb = getGatewayDatabaseClient();
      const isConnected = await gatewayDb.testConnection();
      if (!isConnected) throw new Error('Gateway DB disconnected');
      return 'connected';
    },
    pollingWorker: async () => {
      if (!globalPollingWorker) return 'not initialized';
      const status = globalPollingWorker.getStatus();
      const waiting = await globalPollingWorker.getMessagesWaiting();
      return `${status} (${waiting} messages waiting)`;
    },
  },
}));

// Readiness probe
app.get('/ready', createHealthCheckHandler({
  serviceName: 'tp-capital',
  version: '1.0.0',
  logger,
  checks: {
    timescaledb: async () => {
      const healthy = await timescaleClient.healthcheck();
      if (!healthy) throw new Error('TimescaleDB not ready');
      return 'ready';
    },
  },
}));

// Liveness probe
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'tp-capital',
    uptime: process.uptime(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    endpoints: ['/health', '/signals', '/logs', '/metrics'],
    message: 'TP Capital ingestion API'
  });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.post('/sync-messages', async (req, res) => {
  try {
    logger.info('[SyncMessages] Sincronização solicitada via dashboard');
    
    // Chamar o endpoint de sincronização do Telegram Gateway com limite de 500 mensagens
    const gatewayPort = Number(process.env.TELEGRAM_GATEWAY_PORT || 4006);
    const gatewayUrl = process.env.TELEGRAM_GATEWAY_URL || `http://localhost:${gatewayPort}`;
    
    try {
      const response = await fetch(`${gatewayUrl}/sync-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 500 })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        const channelId = config.gateway.signalsChannelId;
        const channelData = result.data.channelsSynced.find(c => c.channelId === channelId);
        const messagesSynced = channelData?.messagesSynced || 0;
        
        logger.info(
          { channelId, messagesSynced },
          '[SyncMessages] Mensagens sincronizadas do Telegram para Gateway'
        );
        
        // Converter mensagens 'queued' para 'received' para que o worker as processe
        const gatewayDb = await getGatewayDatabaseClient();
        const updateQuery = `
          UPDATE telegram_gateway.messages
          SET status = 'received'
          WHERE channel_id = $1
          AND status = 'queued'
        `;
        const updateResult = await gatewayDb.query(updateQuery, [channelId]);
        
        logger.info(
          { queuedConverted: updateResult.rowCount },
          '[SyncMessages] Mensagens queued convertidas para received'
        );
        
        return res.json({
          success: true,
          message: messagesSynced > 0 
            ? `${messagesSynced} mensagem(ns) sincronizada(s). Processamento iniciado.`
            : 'Todas as mensagens estão sincronizadas',
          data: {
            messagesSynced,
            queuedConverted: updateResult.rowCount,
            channelId,
            channelLabel: channelData?.label || 'TP Capital',
            filters: config.gateway.filters,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        logger.warn({ result }, '[SyncMessages] Gateway retornou erro');
        return res.status(response.status).json(result);
      }
    } catch (fetchError) {
      logger.error(
        { err: fetchError, gatewayUrl },
        '[SyncMessages] Erro ao conectar com Telegram Gateway'
      );
      
      return res.status(503).json({
        success: false,
        message: 'Telegram Gateway não está acessível. Verifique se o serviço está rodando na porta 4006.',
        error: fetchError.message
      });
    }
  } catch (error) {
    logger.error({ err: error }, '[SyncMessages] Erro ao sincronizar mensagens');
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar mensagens',
      error: error.message
    });
  }
});

app.get('/signals', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const channel = req.query.channel ? String(req.query.channel) : undefined;
    const signalType = req.query.type ? String(req.query.type) : undefined;
    const search = req.query.search ? String(req.query.search).toLowerCase() : undefined;

    const rows = await timescaleClient.fetchSignals({
      limit,
      channel,
      signalType,
      fromTs: req.query.from ? Number(req.query.from) || Date.parse(String(req.query.from)) : undefined,
      toTs: req.query.to ? Number(req.query.to) || Date.parse(String(req.query.to)) : undefined,
    });

    const filtered = search
      ? rows.filter((row) =>
          row.asset?.toLowerCase().includes(search) ||
          row.raw_message?.toLowerCase().includes(search)
        )
      : rows;

    // Convert ts from Date object to timestamp in milliseconds for frontend
    const normalized = filtered.map(row => ({
      ...row,
      ts: row.ts ? new Date(row.ts).getTime() : null,
      ingested_at: row.ingested_at ? new Date(row.ingested_at).toISOString() : null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    }));

    res.json({ data: normalized });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch signals');
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

app.get('/forwarded-messages', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const channelId = req.query.channelId ? String(req.query.channelId) : undefined;

    const rows = await timescaleClient.fetchForwardedMessages({
      limit,
      channelId,
      fromTs: req.query.from ? Number(req.query.from) || Date.parse(String(req.query.from)) : undefined,
      toTs: req.query.to ? Number(req.query.to) || Date.parse(String(req.query.to)) : undefined,
    });

    res.json({ data: rows });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch forwarded messages');
    res.status(500).json({ error: 'Failed to fetch forwarded messages' });
  }
});

// ========== TELEGRAM CHANNELS CRUD ==========

app.get('/telegram-channels', async (req, res) => {
  try {
    const channels = await timescaleClient.getTelegramChannels();
    res.json({ data: channels });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch telegram channels');
    res.status(500).json({ error: 'Failed to fetch telegram channels' });
  }
});

app.post('/telegram-channels', async (req, res) => {
  try {
    const { label, channel_id, channel_type, description } = req.body;
    
    if (!label || !channel_id) {
      return res.status(400).json({ error: 'label and channel_id are required' });
    }

    const channel = {
      id: `ch_${Date.now()}`,
      label,
      channel_id: String(channel_id),
      channel_type: channel_type || 'source',
      description: description || '',
    };

    await timescaleClient.createTelegramChannel(channel);
    logger.info({ channelId: channel_id }, 'Telegram channel created');
    
    res.status(201).json({ success: true, channel });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create telegram channel');
    res.status(500).json({ error: 'Failed to create telegram channel' });
  }
});

app.put('/telegram-channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await timescaleClient.updateTelegramChannel(id, updates);
    logger.info({ channelId: id }, 'Telegram channel updated');
    
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update telegram channel');
    res.status(500).json({ error: 'Failed to update telegram channel' });
  }
});

app.delete('/telegram-channels/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await timescaleClient.deleteTelegramChannel(id);
    logger.info({ channelId: id }, 'Telegram channel deleted');
    
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete telegram channel');
    res.status(500).json({ error: 'Failed to delete telegram channel' });
  }
});

app.get('/logs', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const level = req.query.level ? String(req.query.level) : undefined;
  const logs = getLogs({ limit, level });
  res.json({ data: logs });
});

app.delete('/signals', async (req, res) => {
  try {
    const ingestedAt = req.body?.ingestedAt ? String(req.body.ingestedAt) : null;
    if (!ingestedAt) {
      res.status(400).json({ error: 'ingestedAt is required' });
      return;
    }

    await timescaleClient.deleteSignalByIngestedAt(ingestedAt);
    logger.info({ ingestedAt }, 'Signal deleted');
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete signal');
    res.status(500).json({ error: 'Failed to delete signal' });
  }
});

// Endpoint for bot information
app.get('/bots', async (_req, res) => {
  try {
    const botInfo = {
      configured: Boolean(config.telegram.ingestionBotToken),
      mode: config.telegram.mode,
      webhook: config.telegram.mode === 'webhook' ? {
        url: config.telegram.webhook.url || null,
        hasSecretToken: Boolean(config.telegram.webhook.secretToken)
      } : null,
      status: 'running',
      timestamp: formatTimestamp()
    };

    res.json({ data: botInfo });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch bot info');
    res.status(500).json({ error: 'Failed to fetch bot info' });
  }
});

// Endpoint for channel information (from TimescaleDB)
app.get('/channels', async (_req, res) => {
  try {
    const channels = await timescaleClient.getChannelsWithStats();
    res.json({
      data: channels,
      source: 'timescale',
      timestamp: formatTimestamp()
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch channels from TimescaleDB');
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Endpoint for configured source channels
app.get('/config/channels', async (_req, res) => {
  try {
    const sourceChannels = config.telegram.forwarderSourceChannels.map((id) => ({
      channelId: id,
      type: 'source'
    }));

    const destinationChannel = config.telegram.destinationChannelId ? [{
      channelId: config.telegram.destinationChannelId,
      type: 'destination'
    }] : [];

    res.json({
      data: [...sourceChannels, ...destinationChannel],
      timestamp: formatTimestamp()
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch channel config');
    res.status(500).json({ error: 'Failed to fetch channel config' });
  }
});

// === TELEGRAM BOTS CRUD ENDPOINTS ===

// Get all telegram bots from TimescaleDB
app.get('/telegram/bots', async (_req, res) => {
  try {
    const bots = await timescaleClient.getTelegramBots();
    res.json({ data: bots, timestamp: formatTimestamp() });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch telegram bots');
    res.status(500).json({ error: 'Failed to fetch telegram bots' });
  }
});

// Create new telegram bot
app.post('/telegram/bots', async (req, res) => {
  try {
    const { username, token, bot_type, description } = req.body;

    if (!username || !token) {
      return res.status(400).json({ error: 'username and token are required' });
    }

    const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const result = await timescaleClient.createTelegramBot({
      id,
      username,
      token,
      bot_type,
      description
    });

    logger.info({ id, username }, 'Telegram bot created');
    res.json({ status: 'ok', id: result.id });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create telegram bot');
    res.status(500).json({ error: 'Failed to create telegram bot' });
  }
});

// Update telegram bot
app.put('/telegram/bots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, token, bot_type, description, status } = req.body;

    await timescaleClient.updateTelegramBot(id, {
      username,
      token,
      bot_type,
      description,
      status
    });

    logger.info({ id }, 'Telegram bot updated');
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update telegram bot');
    res.status(500).json({ error: 'Failed to update telegram bot' });
  }
});

// Delete telegram bot (soft delete)
app.delete('/telegram/bots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await timescaleClient.deleteTelegramBot(id);
    logger.info({ id }, 'Telegram bot soft deleted');
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete telegram bot');
    res.status(500).json({ error: 'Failed to delete telegram bot' });
  }
});

// === TELEGRAM CHANNELS CRUD ENDPOINTS ===

// Get all telegram channels from TimescaleDB
app.get('/telegram/channels', async (_req, res) => {
  try {
    const channels = await timescaleClient.getTelegramChannels();
    res.json({ data: channels, timestamp: formatTimestamp() });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch telegram channels');
    res.status(500).json({ error: 'Failed to fetch telegram channels' });
  }
});

// Create new telegram channel
app.post('/telegram/channels', async (req, res) => {
  try {
    const { label, channel_id, channel_type, description } = req.body;

    if (!label || !channel_id) {
      return res.status(400).json({ error: 'label and channel_id are required' });
    }

    const id = `channel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const result = await timescaleClient.createTelegramChannel({
      id,
      label,
      channel_id,
      channel_type,
      description
    });

    logger.info({ id, label }, 'Telegram channel created');
    res.json({ status: 'ok', id: result.id });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create telegram channel');
    res.status(500).json({ error: 'Failed to create telegram channel' });
  }
});

// Update telegram channel
app.put('/telegram/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { label, channel_id, channel_type, description, status, signal_count, last_signal } = req.body;

    await timescaleClient.updateTelegramChannel(id, {
      label,
      channel_id,
      channel_type,
      description,
      status,
      signal_count,
      last_signal
    });

    logger.info({ id }, 'Telegram channel updated');
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update telegram channel');
    res.status(500).json({ error: 'Failed to update telegram channel' });
  }
});

// Delete telegram channel (soft delete)
app.delete('/telegram/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await timescaleClient.deleteTelegramChannel(id);
    logger.info({ id }, 'Telegram channel soft deleted');
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete telegram channel');
    res.status(500).json({ error: 'Failed to delete telegram channel' });
  }
});

// ============================================================================
// ERROR HANDLING (using shared modules)
// ============================================================================

// 404 handler (must be before error handler)
app.use(createNotFoundHandler({ logger }));

// Global error handler (must be last)
app.use(createErrorHandler({ logger, includeStack: config.server.env !== 'production' }));

// ============================================================================
// SERVER STARTUP & GRACEFUL SHUTDOWN
// ============================================================================

const server = app.listen(config.server.port, () => {
  logger.startup('TP Capital API started successfully', {
    port: config.server.port,
    environment: config.server.env,
    gatewayPolling: config.gateway?.enabled,
    signalsChannel: config.gateway?.signalsChannelId,
  });
});

// Initialize Gateway Polling Worker
let globalPollingWorker = null;

async function startGatewayPollingWorker() {
  try {
    // Initialize Gateway database client
    const gatewayDb = getGatewayDatabaseClient();

    // Test connectivity
    const isConnected = await gatewayDb.testConnection();
    if (!isConnected) {
      logger.error('Failed to connect to Gateway database');
      return;
    }

    logger.info('Gateway database connected successfully');

    // Create and start polling worker
    globalPollingWorker = new GatewayPollingWorker({
      gatewayDb,
      tpCapitalDb: timescaleClient,
      metrics: gatewayMetrics
    });

    await globalPollingWorker.start();
    logger.info('Gateway polling worker started successfully');

  } catch (error) {
    logger.error({ err: error }, 'Failed to start Gateway polling worker');
    process.exitCode = 1;
  }
}

// Start polling worker
startGatewayPollingWorker();

// Load channels from database and launch forwarder
async function loadChannelsAndStartForwarder() {
  try {
    // Buscar canais ativos do banco
    const channels = await timescaleClient.getTelegramChannels();
    const activeChannels = channels
      .filter(ch => ch.status === 'active' && ch.channel_type === 'source')
      .map(ch => Number(ch.channel_id));

    logger.info({ count: activeChannels.length, channels: activeChannels }, 'Loaded active channels from database');

    // Se não houver canais no banco, usa do .env como fallback
    const channelsToUse = activeChannels.length > 0 
      ? activeChannels 
      : config.telegram.forwarderSourceChannels;

    if (channelsToUse.length === 0) {
      logger.warn('No channels configured. Please add channels via API or .env');
      return null;
    }

    // Launch forwarder com canais do banco
    const forwarder = createTelegramUserForwarderPolling(channelsToUse);
    if (forwarder) {
      await forwarder.launch();
    }
    return forwarder;
  } catch (error) {
    logger.error({ err: error }, 'Failed to load channels and start forwarder');
    return null;
  }
}

let telegramUserForwarder = null;
loadChannelsAndStartForwarder().then(forwarder => {
  telegramUserForwarder = forwarder;
}).catch(error => {
  logger.error({ err: error }, 'Failed to initialize forwarder');
});

// Endpoint para recarregar canais dinamicamente
app.post('/reload-channels', async (req, res) => {
  try {
    const channels = await timescaleClient.getTelegramChannels();
    const activeChannels = channels
      .filter(ch => ch.status === 'active' && ch.channel_type === 'source')
      .map(ch => Number(ch.channel_id));

    if (telegramUserForwarder && telegramUserForwarder.updateChannels) {
      telegramUserForwarder.updateChannels(activeChannels);
      logger.info({ channels: activeChannels }, 'Channels reloaded');
      res.json({ success: true, channels: activeChannels });
    } else {
      res.status(503).json({ error: 'Forwarder not running' });
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to reload channels');
    res.status(500).json({ error: 'Failed to reload channels' });
  }
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal, closing server...');

  // Close HTTP server
  server.close(async () => {
    logger.info('HTTP server closed');

    // Stop components gracefully
    const stopPromises = [];

    // Stop polling worker
    if (globalPollingWorker) {
      logger.info('Stopping Gateway polling worker...');
      stopPromises.push(globalPollingWorker.stop());
    }

    // Stop Telegram forwarder (if running)
    if (telegramUserForwarder?.stop) {
      logger.info('Stopping Telegram forwarder...');
      stopPromises.push(telegramUserForwarder.stop());
    }

    await Promise.all(stopPromises);

    // Close database connections
    await Promise.all([
      timescaleClient.close().catch(err => logger.error({ err }, 'Error closing TimescaleDB')),
      closeGatewayDatabaseClient().catch(err => logger.error({ err }, 'Error closing Gateway DB'))
    ]);

    logger.info('TP Capital API stopped gracefully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled promise rejection');
  process.exit(1);
});

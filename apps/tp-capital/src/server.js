import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import promClient from 'prom-client';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { getLogs } from './logStore.js';
import { timescaleClient } from './timescaleClient.js';
import { createTelegramIngestion } from './telegramIngestion.js';
import { createTelegramForwarderManual } from './telegramForwarderManual.js';
import { formatTimestamp } from './timeUtils.js';

validateConfig(logger);

const app = express();

// CORS configuration
// When using unified domain (tradingsystem.local), CORS is not needed
// Only enable CORS when accessing APIs directly via different ports
const disableCors = process.env.DISABLE_CORS === 'true';

if (!disableCors) {
  const rawCorsOrigin = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim() !== ''
    ? process.env.CORS_ORIGIN
    : 'http://localhost:3101,http://localhost:3004';
  const corsOrigins = rawCorsOrigin === '*'
    ? undefined
    : rawCorsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
  const corsOptions = corsOrigins ? { origin: corsOrigins, credentials: true } : undefined;
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
} else {
  logger.info('CORS disabled - Using unified domain mode');
}

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(express.json());

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/health', async (_req, res) => {
  const timescaleHealthy = await timescaleClient.healthcheck();
  res.json({ status: 'ok', timescale: timescaleHealthy });
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

    res.json({ data: filtered });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch signals');
    res.status(500).json({ error: 'Failed to fetch signals' });
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

const server = app.listen(config.server.port, () => {
  logger.info({ port: config.server.port }, 'TP Capital ingestion service listening');
});

// Launch ingestion bot (listens to channels and saves to QuestDB)
const telegramIngestion = createTelegramIngestion();
if (telegramIngestion) {
  telegramIngestion.launch().catch((error) => {
    logger.error({ err: error }, 'Failed to launch Telegram ingestion bot');
    process.exitCode = 1;
  });
}

// Launch forwarder bot (forwards messages from source to destination channels)
const telegramForwarder = createTelegramForwarderManual();
if (telegramForwarder) {
  telegramForwarder.launch().catch((error) => {
    logger.error({ err: error }, 'Failed to launch Telegram forwarder bot');
    process.exitCode = 1;
  });
}

process.on('SIGINT', async () => {
  logger.info('Shutting down');
  server.close();

  // Stop both bots gracefully
  const stopPromises = [];
  if (telegramIngestion?.bot) {
    stopPromises.push(telegramIngestion.bot.stop());
  }
  if (telegramForwarder?.bot) {
    stopPromises.push(telegramForwarder.bot.stop());
  }

  await Promise.all(stopPromises);
  process.exit(0);
});
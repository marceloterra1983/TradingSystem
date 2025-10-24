import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import promClient from 'prom-client';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { getLogs } from './logStore.js';
import { questdbClient } from './questdbClient.js';
import { createTelegramIngestion } from './telegramIngestion.js';
import { createTelegramForwarder } from './telegramForwarder.js';
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
  const questdbHealthy = await questdbClient.healthcheck();
  res.json({ status: 'ok', questdb: questdbHealthy });
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

    const rows = await questdbClient.fetchSignals({
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

    await questdbClient.deleteSignalByIngestedAt(ingestedAt);
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

// Endpoint for channel information (from QuestDB)
app.get('/channels', async (_req, res) => {
  try {
    // Query to get unique channels from signals table
    const query = `SELECT DISTINCT channel, COUNT(*) as signal_count, MAX(ts) as last_signal
                   FROM tp_capital_signals
                   GROUP BY channel
                   ORDER BY signal_count DESC`;

    const { data } = await questdbClient.http.get('/exec', { params: { query } });
    const columns = data?.columns?.map((col) => col.name) || [];
    const rows = data?.dataset || [];

    const channels = rows.map((row) => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });

    res.json({
      data: channels,
      source: 'questdb',
      timestamp: formatTimestamp()
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch channels from QuestDB');
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

// Get all telegram bots from QuestDB
app.get('/telegram/bots', async (_req, res) => {
  try {
    const query = `SELECT id, username, token, bot_type, description, status, created_at, updated_at
                   FROM (
                     SELECT id, username, token, bot_type, description, status, created_at, updated_at
                     FROM telegram_bots
                     LATEST ON updated_at PARTITION BY id
                   )
                   WHERE status != 'deleted'
                   ORDER BY updated_at DESC`;

    const { data } = await questdbClient.http.get('/exec', { params: { query } });
    const columns = data?.columns?.map((col) => col.name) || [];
    const rows = data?.dataset || [];

    const bots = rows.map((row) => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });

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
    const now = new Date().toISOString();

    const query = `INSERT INTO telegram_bots (id, username, token, bot_type, description, status, created_at, updated_at)
                   VALUES ('${questdbClient.escape(id)}',
                           '${questdbClient.escape(username)}',
                           '${questdbClient.escape(token)}',
                           '${questdbClient.escape(bot_type || 'Sender')}',
                           '${questdbClient.escape(description || '')}',
                           'active',
                           to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ'),
                           to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ'))`;

    await questdbClient.http.get('/exec', { params: { query } });
    logger.info({ id, username }, 'Telegram bot created');
    res.json({ status: 'ok', id });
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

    const updates = [];
    if (username) updates.push(`username='${questdbClient.escape(username)}'`);
    if (token) updates.push(`token='${questdbClient.escape(token)}'`);
    if (bot_type) updates.push(`bot_type='${questdbClient.escape(bot_type)}'`);
    if (description !== undefined) updates.push(`description='${questdbClient.escape(description)}'`);
    if (status) updates.push(`status='${questdbClient.escape(status)}'`);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const now = new Date().toISOString();
    updates.push(`updated_at=to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')`);

    const query = `UPDATE telegram_bots SET ${updates.join(', ')} WHERE id='${questdbClient.escape(id)}'`;

    await questdbClient.http.get('/exec', { params: { query } });
    logger.info({ id }, 'Telegram bot updated');
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update telegram bot');
    res.status(500).json({ error: 'Failed to update telegram bot' });
  }
});

// Delete telegram bot (soft delete by inserting with deleted status)
app.delete('/telegram/bots/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the current record
    const selectQuery = `SELECT id, username, token, bot_type, description FROM telegram_bots WHERE id='${questdbClient.escape(id)}' LATEST ON updated_at PARTITION BY id`;
    const { data: selectData } = await questdbClient.http.get('/exec', { params: { query: selectQuery } });

    if (!selectData?.dataset || selectData.dataset.length === 0) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const [botId, username, token, bot_type, description] = selectData.dataset[0];
    const now = new Date().toISOString();

    // Insert new record with deleted status (append-only pattern)
    const insertQuery = `INSERT INTO telegram_bots (id, username, token, bot_type, description, status, created_at, updated_at)
                         VALUES ('${questdbClient.escape(botId)}',
                                 '${questdbClient.escape(username)}',
                                 '${questdbClient.escape(token)}',
                                 '${questdbClient.escape(bot_type)}',
                                 '${questdbClient.escape(description || '')}',
                                 'deleted',
                                 to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ'),
                                 to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ'))`;

    await questdbClient.http.get('/exec', { params: { query: insertQuery } });
    logger.info({ id }, 'Telegram bot soft deleted');
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete telegram bot');
    res.status(500).json({ error: 'Failed to delete telegram bot' });
  }
});

// === TELEGRAM CHANNELS CRUD ENDPOINTS ===

// Get all telegram channels from QuestDB
app.get('/telegram/channels', async (_req, res) => {
  try {
    const query = `SELECT id, label, channel_id, channel_type, description, status, signal_count, last_signal, created_at, updated_at
                   FROM (
                     SELECT id, label, channel_id, channel_type, description, status, signal_count, last_signal, created_at, updated_at
                     FROM telegram_channels
                     LATEST ON updated_at PARTITION BY id
                   )
                   WHERE status != 'deleted'
                   ORDER BY updated_at DESC`;

    const { data } = await questdbClient.http.get('/exec', { params: { query } });
    const columns = data?.columns?.map((col) => col.name) || [];
    const rows = data?.dataset || [];

    const channels = rows.map((row) => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });

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
    const now = new Date().toISOString();

    const query = `INSERT INTO telegram_channels (id, label, channel_id, channel_type, description, status, signal_count, last_signal, created_at, updated_at)
                   VALUES ('${questdbClient.escape(id)}',
                           '${questdbClient.escape(label)}',
                           ${Number(channel_id)},
                           '${questdbClient.escape(channel_type || 'source')}',
                           '${questdbClient.escape(description || '')}',
                           'active',
                           0,
                           null,
                           to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ'),
                           to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ'))`;

    await questdbClient.http.get('/exec', { params: { query } });
    logger.info({ id, label }, 'Telegram channel created');
    res.json({ status: 'ok', id });
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

    const updates = [];
    if (label) updates.push(`label='${questdbClient.escape(label)}'`);
    if (channel_id) updates.push(`channel_id=${Number(channel_id)}`);
    if (channel_type) updates.push(`channel_type='${questdbClient.escape(channel_type)}'`);
    if (description !== undefined) updates.push(`description='${questdbClient.escape(description)}'`);
    if (status) updates.push(`status='${questdbClient.escape(status)}'`);
    if (signal_count !== undefined) updates.push(`signal_count=${Number(signal_count)}`);
    if (last_signal) updates.push(`last_signal=to_timestamp('${last_signal}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')`);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const now = new Date().toISOString();
    updates.push(`updated_at=to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')`);

    const query = `UPDATE telegram_channels SET ${updates.join(', ')} WHERE id='${questdbClient.escape(id)}'`;

    await questdbClient.http.get('/exec', { params: { query } });
    logger.info({ id }, 'Telegram channel updated');
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update telegram channel');
    res.status(500).json({ error: 'Failed to update telegram channel' });
  }
});

// Delete telegram channel (soft delete by inserting with deleted status)
app.delete('/telegram/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the current record
    const selectQuery = `SELECT id, label, channel_id, channel_type, description, signal_count, last_signal FROM telegram_channels WHERE id='${questdbClient.escape(id)}' LATEST ON updated_at PARTITION BY id`;
    const { data: selectData } = await questdbClient.http.get('/exec', { params: { query: selectQuery } });

    if (!selectData?.dataset || selectData.dataset.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const [channelId, label, channel_id, channel_type, description, signal_count, last_signal] = selectData.dataset[0];
    const now = new Date().toISOString();

    // Insert new record with deleted status (append-only pattern)
    const insertQuery = `INSERT INTO telegram_channels (id, label, channel_id, channel_type, description, status, signal_count, last_signal, created_at, updated_at)
                         VALUES ('${questdbClient.escape(channelId)}',
                                 '${questdbClient.escape(label)}',
                                 ${Number(channel_id)},
                                 '${questdbClient.escape(channel_type)}',
                                 '${questdbClient.escape(description || '')}',
                                 'deleted',
                                 ${Number(signal_count) || 0},
                                 ${last_signal ? `to_timestamp('${last_signal}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')` : 'null'},
                                 to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ'),
                                 to_timestamp('${now}', 'yyyy-MM-ddTHH:mm:ss.SSSZ'))`;

    await questdbClient.http.get('/exec', { params: { query: insertQuery } });
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
const telegramForwarder = createTelegramForwarder();
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
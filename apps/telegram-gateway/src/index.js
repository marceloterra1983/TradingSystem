import express from 'express';
import promClient from 'prom-client';
import { Telegraf } from 'telegraf';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { publishWithRetry } from './httpPublisher.js';
import { getQueueSize } from './failureQueue.js';
import {
  initializeMessageStore,
  recordMessageReceived,
  isChannelAllowed,
  closeMessageStore,
} from './messageStore.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate configuration on startup
validateConfig(logger);

try {
  await initializeMessageStore(logger);
} catch (error) {
  logger.error({ err: error }, 'Failed to initialize TimescaleDB message store');
  process.exit(1);
}

const app = express();

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const telegramConnectionGauge = new promClient.Gauge({
  name: 'telegram_connection_status',
  help: 'Telegram connection status (0=disconnected, 1=connected)',
  registers: [register],
});

const messagesReceivedCounter = new promClient.Counter({
  name: 'telegram_messages_received_total',
  help: 'Total messages received from Telegram',
  labelNames: ['channel_id'],
  registers: [register],
});

const messagesPublishedCounter = new promClient.Counter({
  name: 'telegram_messages_published_total',
  help: 'Total messages successfully published to API',
  registers: [register],
});

const publishFailuresCounter = new promClient.Counter({
  name: 'telegram_publish_failures_total',
  help: 'Total failed publish attempts',
  labelNames: ['reason'],
  registers: [register],
});

const retryAttemptsCounter = new promClient.Counter({
  name: 'telegram_retry_attempts_total',
  help: 'Total retry attempts',
  labelNames: ['attempt_number'],
  registers: [register],
});

const failureQueueSizeGauge = new promClient.Gauge({
  name: 'telegram_failure_queue_size',
  help: 'Current size of failure queue',
  registers: [register],
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const isConnected = telegramConnectionGauge['hashMap']?.['']?.value === 1 || false;

  if (isConnected) {
    res.status(200).json({
      status: 'healthy',
      telegram: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      telegram: 'disconnected',
      error: 'Connection lost to Telegram servers',
      timestamp: new Date().toISOString(),
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Telegram Gateway (Shared Service)',
    endpoints: ['/health', '/metrics'],
    message: 'Shared Telegram Gateway - handles authentication and message forwarding',
  });
});

// Start HTTP server
const server = app.listen(config.gateway.port, () => {
  logger.info({ port: config.gateway.port }, 'Telegram Gateway HTTP server listening');
});

// Initialize Telegram Bot (Telegraf) if token is provided
let bot;
if (config.telegram.botToken) {
  bot = new Telegraf(config.telegram.botToken);

  bot.on('channel_post', async (ctx) => {
    try {
      const message = ctx.channelPost;
      const channelId = message.chat.id.toString();
      const messageId = message.message_id;
      const telegramDate = new Date(message.date * 1000);
      const receivedAt = new Date();

      const mediaRefs = [];
      let mediaType = 'text';

      if (Array.isArray(message.photo) && message.photo.length > 0) {
        mediaType = 'photo';
        mediaRefs.push(
          ...message.photo.map((photo) => ({
            fileId: photo.file_id,
            width: photo.width,
            height: photo.height,
            fileSize: photo.file_size,
          })),
        );
      }

      if (message.document) {
        mediaType = 'document';
        mediaRefs.push({
          fileId: message.document.file_id,
          fileName: message.document.file_name,
          mimeType: message.document.mime_type,
          fileSize: message.document.file_size,
        });
      }

      if (message.video) {
        mediaType = 'video';
        mediaRefs.push({
          fileId: message.video.file_id,
          duration: message.video.duration,
          width: message.video.width,
          height: message.video.height,
          thumbnail: message.video.thumbnail?.file_id,
          mimeType: message.video.mime_type,
          fileSize: message.video.file_size,
        });
      }

      const messageData = {
        channelId,
        messageId,
        text: message.text || message.caption || '',
        caption: message.caption || null,
        timestamp: telegramDate.toISOString(),
        photos: message.photo ? message.photo.map(p => p.file_id) : [],
        mediaRefs,
        mediaType,
        receivedAt: receivedAt.toISOString(),
        telegramDate: telegramDate.toISOString(),
        threadId: message.message_thread_id ?? null,
        source: 'bot',
        messageType: ctx.updateType,
        chatId: message.chat?.id ?? null,
        metadata: {
          telegramDetails: {
            chatTitle: message.chat?.title ?? null,
            chatUsername: message.chat?.username ?? null,
            viaBot: message.via_bot?.username ?? null,
            mediaGroupId: message.media_group_id ?? null,
          },
        },
      };

      const isAllowed = await isChannelAllowed(messageData.channelId, { logger });
      if (!isAllowed) {
        logger.debug(
          {
            channelId: messageData.channelId,
            messageId: messageData.messageId,
          },
          'Ignoring message from channel not registered in channel registry',
        );
        return;
      }

      messagesReceivedCounter.inc({ channel_id: channelId });

      try {
        await recordMessageReceived(messageData, {
          metadata: {
            contentPreview:
              (messageData.text || message.caption || '').slice(0, 140) || null,
          },
          logger,
        });
      } catch (storeError) {
        logger.error(
          { err: storeError, channelId, messageId },
          'Failed to persist Telegram message before publishing',
        );
      }

      logger.info({
        channelId,
        messageId,
        text: messageData.text.substring(0, 50),
      }, 'Received channel post via bot');

      const result = await publishWithRetry(messageData);

      if (result.success) {
        messagesPublishedCounter.inc();
      } else {
        publishFailuresCounter.inc({ reason: 'max_retries' });
      }

    } catch (error) {
      logger.error({ err: error }, 'Error processing channel post');
    }
  });

  bot.launch()
    .then(() => {
      logger.info('Telegraf bot launched successfully');
      telegramConnectionGauge.set(1);
    })
    .catch((error) => {
      logger.error({ err: error }, 'Failed to launch Telegraf bot');
      telegramConnectionGauge.set(0);
    });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

// Initialize Telegram User Client (for forwarding with user account) if phone is provided
let userClient;
if (config.telegram.phoneNumber) {
  // Use StringSession with file-based persistence
  const sessionDir = path.resolve(__dirname, '..', '.session');
  const sessionFile = path.join(sessionDir, 'telegram-gateway.session');

  // Create directory if it doesn't exist
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Load session from file if exists
  let sessionString = '';
  if (fs.existsSync(sessionFile)) {
    try {
      sessionString = fs.readFileSync(sessionFile, 'utf8').trim();
      logger.info('Loaded existing session from file');
    } catch (err) {
      logger.warn({ err }, 'Could not read session file');
    }
  }

  const session = new StringSession(sessionString);

  userClient = new TelegramClient(
    session,
    config.telegram.apiId,
    config.telegram.apiHash,
    {
      connectionRetries: 5,
    }
  );

  (async () => {
    try {
      // Check if we have a valid session (not empty string)
      const hasSession = sessionString.length > 0;
      const isInteractive = process.stdin.isTTY;

      if (!hasSession && !isInteractive) {
        // Running in background without session - skip authentication
        logger.warn('No session found and running in non-interactive mode');
        logger.warn('Gateway will start but Telegram will be disconnected');
        logger.warn('Run authenticate-interactive.sh to authenticate');
        telegramConnectionGauge.set(0);
        return;
      }

      await userClient.start({
        phoneNumber: async () => config.telegram.phoneNumber,
        password: async () => await input.text('Please enter your 2FA password: '),
        phoneCode: async () => await input.text('Please enter the code you received: '),
        onError: (err) => logger.error({ err }, 'Telegram client error'),
      });

      // Save session to file after successful connection
      const newSessionString = session.save();
      fs.writeFileSync(sessionFile, newSessionString, 'utf8');
      logger.info({ sessionFile }, 'Telegram user client connected successfully');
      logger.info('Session saved to file');
      telegramConnectionGauge.set(1);

    } catch (error) {
      logger.error({ err: error }, 'Failed to connect Telegram user client');
      telegramConnectionGauge.set(0);
    }
  })();
}

// Periodic queue size monitoring (every 60 seconds)
setInterval(async () => {
  try {
    const queueSize = await getQueueSize();
    failureQueueSizeGauge.set(queueSize);

    if (queueSize > 100) {
      logger.warn({ queueSize }, 'Failure queue growing - check API connectivity');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to update queue size metric');
  }
}, 60000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  server.close(() => {
    logger.info('HTTP server closed');
  });

  if (bot) {
    await bot.stop('SIGTERM');
  }

  if (userClient) {
    await userClient.disconnect();
  }

  await closeMessageStore();

  logger.info('Graceful shutdown completed');
  process.exit(0);
});

logger.info({
  botEnabled: !!config.telegram.botToken,
  userClientEnabled: !!config.telegram.phoneNumber,
}, 'Telegram Gateway started');

import express from 'express';
import promClient from 'prom-client';
import { Telegraf } from 'telegraf';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
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
import apiRoutes from './routes.js';
import { extractLinkPreviews } from './utils/linkPreview.js';

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

// Middleware
app.use(express.json());

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
    endpoints: ['/health', '/metrics', '/sync-messages'],
    message: 'Shared Telegram Gateway - handles authentication and message forwarding',
  });
});

// API routes
app.use('/', apiRoutes);

// Start HTTP server (ENABLED for sync-messages endpoint)
const server = app.listen(config.gateway.port, () => {
  logger.info({ port: config.gateway.port }, 'Telegram Gateway HTTP server listening');
});
logger.info({ port: config.gateway.port }, 'Telegram Gateway HTTP server enabled for sync operations');

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
      
      // Tornar o userClient acessível nas rotas
      app.set('telegramUserClient', userClient);

      // Important: Enable catching up to receive all updates (if supported by gramJS)
      if (typeof userClient.catchUp === 'function') {
        try {
          await userClient.catchUp();
          logger.info('Telegram user client caught up with updates');
        } catch (catchUpError) {
          logger.warn({ err: catchUpError }, 'CatchUp failed, but continuing anyway');
        }
      } else {
        logger.info('catchUp() not available in this gramJS version; continuing without it');
      }

      // Add event handler for new channel messages (polling mode)
      userClient.addEventHandler(async (event) => {
        try {
          // Handle new channel messages
          if (event.className === 'UpdateNewChannelMessage') {
            const message = event.message;
            
            // Only process messages from channels (not groups or private chats)
            if (!message.peerId?.channelId) {
              return;
            }

            const channelId = `-100${message.peerId.channelId.toString()}`;
            const messageId = message.id;
            const receivedAt = new Date();
            const telegramDate = new Date(message.date * 1000);

            // Extract message text
            let text = '';
            if (message.message) {
              text = message.message;
            }

            // Extract media info
            const mediaRefs = [];
            let mediaType = 'text';

            if (message.media) {
              const mediaClass = message.media.className;
              if (mediaClass === 'MessageMediaPhoto') {
                mediaType = 'photo';
                mediaRefs.push({
                  type: 'photo',
                  id: message.media.photo?.id?.toString(),
                });
              } else if (mediaClass === 'MessageMediaDocument') {
                mediaType = 'document';
                const doc = message.media.document;
                mediaRefs.push({
                  type: 'document',
                  id: doc?.id?.toString(),
                  mimeType: doc?.mimeType,
                  size: doc?.size,
                });
              } else if (mediaClass === 'MessageMediaWebPage') {
                mediaType = 'text'; // Treat as text
              }
            }

            // Extract link previews (Twitter, YouTube, Instagram, Generic)
            let linkPreview = null;
            if (text && text.length > 0) {
              try {
                linkPreview = await extractLinkPreviews(text);
                if (linkPreview) {
                  logger.info(
                    { channelId, messageId, previewType: linkPreview.type },
                    '[EventHandler] Link preview extracted successfully'
                  );
                }
              } catch (linkError) {
                logger.warn(
                  { err: linkError, channelId, messageId },
                  '[EventHandler] Failed to extract link preview'
                );
              }
            }

            const messageData = {
              channelId,
              messageId,
              text: text || '',
              caption: null,
              timestamp: telegramDate.toISOString(),
              photos: [],
              mediaRefs,
              mediaType,
              receivedAt: receivedAt.toISOString(),
              telegramDate: telegramDate.toISOString(),
              threadId: null,
              source: 'user_client',
              messageType: 'channel_post',
              chatId: null,
              metadata: {
                telegramDetails: {
                  peerId: message.peerId?.channelId?.toString(),
                  out: message.out,
                  mentioned: message.mentioned,
                  mediaUnread: message.mediaUnread,
                  silent: message.silent,
                  post: message.post,
                  fromScheduled: message.fromScheduled,
                },
                linkPreview: linkPreview,  // Add link preview to metadata
              },
            };

            // Check if channel is allowed
            const isAllowed = await isChannelAllowed(messageData.channelId, { logger });
            if (!isAllowed) {
              logger.debug(
                {
                  channelId: messageData.channelId,
                  messageId: messageData.messageId,
                },
                'Ignoring message from channel not registered in channel registry (user client)',
              );
              return;
            }

            messagesReceivedCounter.inc({ channel_id: channelId });

            // Save to database
            try {
              await recordMessageReceived(messageData, {
                metadata: {
                  contentPreview: text.slice(0, 140) || null,
                },
                logger,
              });

              logger.info({
                channelId,
                messageId,
                text: text.substring(0, 50),
              }, 'Received channel post via user client');

            } catch (storeError) {
              logger.error(
                { err: storeError, channelId, messageId },
                'Failed to persist Telegram message from user client',
              );
            }

            // Publish to API endpoints
            try {
              const result = await publishWithRetry(messageData);
              if (result.success) {
                messagesPublishedCounter.inc();
              } else {
                publishFailuresCounter.inc({ reason: 'max_retries' });
              }
            } catch (publishError) {
              logger.error(
                { err: publishError, channelId, messageId },
                'Failed to publish message from user client',
              );
            }
          }
        } catch (error) {
          logger.error({ err: error }, 'Error processing user client message event');
        }
      });

      logger.info('User client event handler registered for channel messages');

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

  // HTTP server is disabled (using API on port 4010 instead)
  // No need to close server since it's not running
  
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
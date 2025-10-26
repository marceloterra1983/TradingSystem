import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Create Telegram forwarder bot using manual polling (workaround for bot.launch() issues)
 * @returns {Object|null} Bot instance with launch function, or null if not configured
 */
export function createTelegramForwarderManual() {
  if (!config.telegram.forwarderBotToken) {
    logger.warn('Telegram forwarder disabled because TELEGRAM_FORWARDER_BOT_TOKEN is not set.');
    return null;
  }

  if (!config.telegram.destinationChannelId) {
    logger.warn('Telegram forwarder disabled because TELEGRAM_DESTINATION_CHANNEL_ID is not set.');
    return null;
  }

  if (config.telegram.forwarderSourceChannels.length === 0) {
    logger.warn('Telegram forwarder disabled because TELEGRAM_SOURCE_CHANNEL_IDS is empty.');
    return null;
  }

  const bot = new Telegraf(config.telegram.forwarderBotToken);
  let offset = 0;
  let isPolling = false;

  async function handleChannelPost(post) {
    const sourceChannelId = post.chat?.id;

    // Check if this message is from one of our source channels
    if (!config.telegram.forwarderSourceChannels.includes(sourceChannelId)) {
      // Silently ignore - no need to log every ignored channel
      return;
    }

    try {
      // Forward the message to destination channel
      await bot.telegram.forwardMessage(
        config.telegram.destinationChannelId,
        sourceChannelId,
        post.message_id
      );

      logger.info(
        {
          sourceChannelId,
          destinationChannelId: config.telegram.destinationChannelId,
          messageId: post.message_id,
          hasText: Boolean(post.text),
          hasCaption: Boolean(post.caption),
          hasPhoto: Boolean(post.photo),
          hasVideo: Boolean(post.video),
        },
        'Forwarder: Message forwarded successfully'
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          sourceChannelId,
          destinationChannelId: config.telegram.destinationChannelId,
          messageId: post.message_id,
        },
        'Forwarder: Failed to forward message'
      );
    }
  }

  async function pollUpdates() {
    if (!isPolling) return;

    try {
      const pollingTimeout = Number(process.env.TELEGRAM_POLLING_TIMEOUT || 10); // Reduced to 10s
      const updates = await bot.telegram.getUpdates({
        offset,
        timeout: pollingTimeout,
        allowed_updates: ['channel_post', 'edited_channel_post']
      });

      // Process updates
      if (updates.length > 0) {
        logger.debug({ updateCount: updates.length }, 'Forwarder: Received updates');
      }
      
      for (const update of updates) {
        offset = update.update_id + 1;

        if (update.channel_post) {
          const channelId = update.channel_post.chat?.id;
          logger.debug(
            { 
              channelId, 
              isConfigured: config.telegram.forwarderSourceChannels.includes(channelId),
              messageId: update.channel_post.message_id 
            }, 
            'Forwarder: Processing channel post'
          );
          await handleChannelPost(update.channel_post);
        }
        // Silently ignore other update types
      }
      
      // If we got here successfully, continue immediately
      if (isPolling) {
        setImmediate(() => pollUpdates());
      }
    } catch (error) {
      // Only log timeout errors at warn level, others at error
      if (error.code === 'ETIMEDOUT') {
        logger.warn({ code: error.code }, 'Forwarder: Polling timeout, retrying...');
        // Shorter retry for timeouts
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        logger.error({ err: error }, 'Forwarder: Error during polling');
        // Longer wait for other errors
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Continue polling even after error
      if (isPolling) {
        setImmediate(() => pollUpdates());
      }
    }
  }

  const launch = async () => {
    // Clear any existing webhook
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });

    // Verify bot info
    try {
      const botInfo = await bot.telegram.getMe();
      logger.info(
        {
          botUsername: botInfo.username,
          botId: botInfo.id,
        },
        'Forwarder bot authenticated successfully'
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to authenticate forwarder bot');
      throw error;
    }

    isPolling = true;
    
    logger.info(
      {
        sourceChannels: config.telegram.forwarderSourceChannels,
        destinationChannel: config.telegram.destinationChannelId,
        mode: 'manual-polling',
        pollingTimeout: Number(process.env.TELEGRAM_POLLING_TIMEOUT || 10),
      },
      'Telegram forwarder bot started (manual polling)'
    );

    // Start polling
    pollUpdates();
  };

  const stop = async () => {
    isPolling = false;
    logger.info('Telegram forwarder bot stopped');
  };

  return { bot, launch, stop };
}


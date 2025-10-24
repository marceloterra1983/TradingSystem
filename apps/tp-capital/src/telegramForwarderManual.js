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
      logger.debug(
        { sourceChannelId, configuredChannels: config.telegram.forwarderSourceChannels },
        'Forwarder: Ignoring message from non-configured channel'
      );
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
      const updates = await bot.telegram.getUpdates({
        offset,
        timeout: 30, // Long polling timeout
        allowed_updates: ['channel_post', 'edited_channel_post']
      });

      if (updates.length > 0) {
        logger.debug({ count: updates.length }, 'Forwarder: Received updates');
      }

      for (const update of updates) {
        offset = update.update_id + 1;

        if (update.channel_post) {
          await handleChannelPost(update.channel_post);
        }

        if (update.edited_channel_post) {
          logger.debug(
            { messageId: update.edited_channel_post.message_id },
            'Forwarder: Edited channel post detected (not forwarding edits)'
          );
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Forwarder: Error during polling');
      // Wait a bit before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Continue polling
    if (isPolling) {
      setImmediate(() => pollUpdates());
    }
  }

  const launch = async () => {
    // Clear any existing webhook
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });

    isPolling = true;
    
    logger.info(
      {
        sourceChannels: config.telegram.forwarderSourceChannels,
        destinationChannel: config.telegram.destinationChannelId,
        mode: 'manual-polling',
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


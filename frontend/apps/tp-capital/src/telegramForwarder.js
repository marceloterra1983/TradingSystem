import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Create Telegram forwarder bot that forwards messages from source channels to destination channel
 * @returns {Object|null} Bot instance with launch function, or null if not configured
 */
export function createTelegramForwarder() {
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

  // Log all incoming updates for debugging
  bot.use(async (ctx, next) => {
    logger.debug(
      {
        updateType: ctx.updateType,
        chatId: ctx.chat?.id,
        hasChannelPost: Boolean(ctx.update?.channel_post),
        hasEditedChannelPost: Boolean(ctx.update?.edited_channel_post),
      },
      'Forwarder: Incoming Telegram update'
    );
    return next();
  });

  // Handle new channel posts
  bot.on('channel_post', async (ctx) => {
    const { channel_post: post } = ctx.update;
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
      await ctx.telegram.forwardMessage(
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
  });

  // Handle edited channel posts (optional - forwards edits too)
  bot.on('edited_channel_post', async (ctx) => {
    const { edited_channel_post: post } = ctx.update;
    const sourceChannelId = post.chat?.id;

    // Check if this message is from one of our source channels
    if (!config.telegram.forwarderSourceChannels.includes(sourceChannelId)) {
      return;
    }

    logger.info(
      {
        sourceChannelId,
        messageId: post.message_id,
      },
      'Forwarder: Edited channel post detected (not forwarding edits)'
    );
    // Note: Telegram doesn't allow forwarding edited messages directly
    // If you need to handle edits, you'd need to send a new message with updated content
  });

  const launch = async () => {
    if (config.telegram.mode === 'webhook') {
      // For webhook mode, you'd need a separate webhook URL for the forwarder bot
      // This is more complex and typically not needed for forwarders
      logger.warn('Webhook mode not implemented for forwarder bot, falling back to polling');
    }

    await bot.launch({
      allowedUpdates: ['channel_post', 'edited_channel_post', 'my_chat_member']
    });

    logger.info(
      {
        sourceChannels: config.telegram.forwarderSourceChannels,
        destinationChannel: config.telegram.destinationChannelId,
        mode: 'polling',
      },
      'Telegram forwarder bot started'
    );
  };

  return { bot, launch };
}

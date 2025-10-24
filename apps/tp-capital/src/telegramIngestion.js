import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { logger } from './logger.js';
import { parseSignal } from './parseSignal.js';
import { timescaleClient } from './timescaleClient.js';

export function createTelegramIngestion() {
  if (!config.telegram.ingestionBotToken) {
    logger.warn('Telegram ingestion disabled because TELEGRAM_INGESTION_BOT_TOKEN is not set.');
    return null;
  }

  const bot = new Telegraf(config.telegram.ingestionBotToken);

  bot.use(async (ctx, next) => {
    logger.info(
      {
        updateType: ctx.updateType,
        chatId: ctx.chat?.id,
        hasChannelPost: Boolean(ctx.update?.channel_post),
        rawUpdate: ctx.update
      },
      'Incoming Telegram update'
    );
    return next();
  });

  bot.on('channel_post', async (ctx) => {
    const { channel_post: post } = ctx.update;
    try {
      const signal = parseSignal(post.text || post.caption || '', {
        timestamp: post.date * 1000,
        channel: post.chat?.title || `channel:${post.chat?.id}`,
        source: 'forwarder'
      });

      await timescaleClient.insertSignal(signal);
      logger.info({ asset: signal.asset, channel: signal.channel }, 'Signal ingested');

      if (post.chat?.id) {
        const assetLabel = signal.asset || 'Sinal';
        const processedAt = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });
        const confirmation = `[OK] ${assetLabel} processado as ${processedAt}`;
        try {
          await ctx.telegram.sendMessage(post.chat.id, confirmation, {
            disable_notification: true
          });
        } catch (ackError) {
          logger.warn(
            { err: ackError, channelId: post.chat.id },
            'Failed to send Telegram confirmation message'
          );
        }
      }
    } catch (error) {
      logger.error({ err: error, channelId: post.chat?.id }, 'Failed to ingest message');
    }
  });

  const launch = async () => {
    if (config.telegram.mode === 'webhook') {
      if (!config.telegram.webhook.url) {
        throw new Error('TELEGRAM_WEBHOOK_URL required for webhook mode');
      }
      await bot.telegram.setWebhook(config.telegram.webhook.url, {
        secret_token: config.telegram.webhook.secretToken || undefined
      });
      logger.info({ url: config.telegram.webhook.url }, 'Telegram webhook configured');
    } else {
      try {
        await bot.launch({
          allowedUpdates: ['channel_post', 'my_chat_member', 'edited_channel_post'],
          dropPendingUpdates: true
        });
        logger.info('Telegram ingestion bot started in polling mode');
      } catch (error) {
        logger.error({ err: error }, 'Failed to launch ingestion bot');
        throw error;
      }
    }
  };

  return { bot, launch };
}

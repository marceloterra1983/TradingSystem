import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { logger } from './logger.js';
import { timescaleClient } from './timescaleClient.js';
import { parseSignal } from './parseSignal.js';

/**
 * Create Telegram ingestion bot using manual polling
 * @returns {Object|null} Bot instance with launch function, or null if not configured
 */
export function createTelegramIngestionManual() {
  if (!config.telegram.ingestionBotToken) {
    logger.warn('Telegram ingestion disabled because TELEGRAM_INGESTION_BOT_TOKEN is not set.');
    return null;
  }

  const bot = new Telegraf(config.telegram.ingestionBotToken);
  let offset = 0;
  let isPolling = false;
  let isFirstPoll = true; // Flag para primeira execução
  const processedMessageIds = new Set();

  async function handleChannelPost(post) {
    const messageId = `${post.chat?.id}_${post.message_id}`;
    const messageText = post.text || post.caption || '';
    
    // Ignora mensagens de confirmação do próprio bot
    if (messageText.startsWith('[OK]') && messageText.includes('processado')) {
      return;
    }
    
    // Evita processar a mesma mensagem múltiplas vezes (cache em memória)
    if (processedMessageIds.has(messageId)) {
      // Silently skip - this is expected behavior
      return;
    }
    
    const channel = post.chat?.title || `channel:${post.chat?.id}`;
    const timestamp = new Date(post.date * 1000);
    
    // Verifica se a mensagem já foi processada antes (no banco de dados)
    // Para evitar reprocessar ao reiniciar o servidor
    try {
      const existingSignals = await timescaleClient.fetchSignals({
        limit: 1,
        fromTs: timestamp.toISOString(),
        toTs: new Date(timestamp.getTime() + 1000).toISOString() // +1 segundo
      });
      
      // Se já existe um sinal com esse timestamp exato do mesmo canal, pula
      if (existingSignals.some(s => 
        Math.abs(new Date(s.ts).getTime() - timestamp.getTime()) < 1000 &&
        s.channel === channel
      )) {
        // Adiciona ao cache para não verificar no banco novamente
        processedMessageIds.add(messageId);
        return; // Já foi processado anteriormente
      }
    } catch (dbCheckError) {
      // Se falhar a verificação, continua o processamento
      logger.debug({ err: dbCheckError }, 'Failed to check if message was already processed');
    }
    
    processedMessageIds.add(messageId);
    
    // Limpa mensagens antigas (mantém últimas 1000)
    if (processedMessageIds.size > 1000) {
      const arr = Array.from(processedMessageIds);
      arr.slice(0, 500).forEach(id => processedMessageIds.delete(id));
    }

    try {
      let signal;
      let isParsed = true;

      // Tenta fazer o parse da mensagem
      try {
        signal = parseSignal(messageText, {
          timestamp: post.date * 1000,
          channel,
          source: 'telegram'
        });
      } catch (parseError) {
        // Se falhar o parse, cria um registro apenas com a mensagem bruta
        isParsed = false;
        signal = {
          ts: timestamp,
          channel,
          signal_type: 'unparsed',
          asset: 'N/A',
          buy_min: null,
          buy_max: null,
          target_1: null,
          target_2: null,
          target_final: null,
          stop: null,
          raw_message: messageText,
          source: 'telegram',
          ingested_at: new Date()
        };
        // Log only at debug level for non-signal messages
        logger.debug({ channel }, 'Message does not match signal pattern, saving as raw');
      }

      // Salva no banco (seja signal parseado ou raw)
      await timescaleClient.insertSignal(signal);
      
      if (isParsed) {
        logger.info({ asset: signal.asset, channel: signal.channel }, 'Signal parsed and ingested');
      } else {
        logger.info({ channel, messageLength: messageText.length }, 'Raw message ingested (not a signal)');
      }

      // Forward para canal de destino se configurado
      const sourceChannelId = post.chat?.id;
      if (config.telegram.destinationChannelId && 
          config.telegram.forwarderSourceChannels.includes(sourceChannelId)) {
        try {
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
            },
            'Message forwarded to destination channel'
          );
        } catch (forwardError) {
          logger.warn(
            { err: forwardError, sourceChannelId, messageId: post.message_id },
            'Failed to forward message to destination channel'
          );
        }
      }

      // Envia confirmação apenas para sinais parseados
      if (isParsed && post.chat?.id) {
        const assetLabel = signal.asset || 'Sinal';
        const processedAt = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });
        const confirmation = `[OK] ${assetLabel} processado as ${processedAt}`;
        try {
          await bot.telegram.sendMessage(post.chat.id, confirmation, {
            disable_notification: true
          });
          logger.info({ asset: assetLabel, channel }, 'Confirmation sent');
        } catch (ackError) {
          logger.warn(
            { err: ackError, channelId: post.chat.id },
            'Failed to send Telegram confirmation message'
          );
        }
      }
    } catch (error) {
      logger.error({ err: error, channelId: post.chat?.id, messageText }, 'Failed to ingest message');
    }
  }

  async function pollUpdates() {
    if (!isPolling) return;

    try {
      // Na primeira execução, ignora mensagens pendentes (antigas)
      if (isFirstPoll) {
        await bot.telegram.getUpdates({
          offset: -1, // Pega apenas o último update ID
          timeout: 1,
          allowed_updates: ['channel_post']
        }).then(updates => {
          if (updates.length > 0) {
            offset = updates[updates.length - 1].update_id + 1;
            logger.info({ offset }, 'Skipped pending updates, starting from latest');
          }
        }).catch(() => {
          // Se falhar, continua normalmente
        });
        isFirstPoll = false;
      }

      const updates = await bot.telegram.getUpdates({
        offset,
        timeout: 30, // Long polling timeout
        allowed_updates: ['channel_post', 'edited_channel_post', 'my_chat_member']
      });

      // Process updates (only log when actually processing messages)
      for (const update of updates) {
        // Atualiza offset ANTES de processar para garantir que não reprocessamos
        offset = update.update_id + 1;

        if (update.channel_post) {
          await handleChannelPost(update.channel_post);
        } else if (update.edited_channel_post) {
          // Silently ignore edited posts
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Ingestion: Error during polling');
      // Wait a bit before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Continue polling
    if (isPolling) {
      setImmediate(() => pollUpdates());
    }
  }

  const launch = async () => {
    // Clear any existing webhook and DROP pending updates to avoid reprocessing old messages
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });

    isPolling = true;
    
    logger.info('Telegram ingestion bot started (manual polling) - pending updates dropped');

    // Start polling
    pollUpdates();
  };

  const stop = async () => {
    isPolling = false;
    logger.info('Telegram ingestion bot stopped');
  };

  return { bot, launch, stop };
}


import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import input from 'input';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Create Telegram forwarder using user account (MTProto)
 * This allows reading messages from channels where the user is a member (not admin)
 * @returns {Object|null} Client instance with launch function, or null if not configured
 */
export function createTelegramUserForwarder() {
  const apiId = Number(process.env.TELEGRAM_API_ID || 0);
  const apiHash = process.env.TELEGRAM_API_HASH || '';
  const phoneNumber = process.env.TELEGRAM_PHONE_NUMBER || '';
  const sessionString = process.env.TELEGRAM_SESSION || '';

  if (!apiId || !apiHash) {
    logger.warn('Telegram user forwarder disabled because TELEGRAM_API_ID or TELEGRAM_API_HASH is not set.');
    return null;
  }

  if (!phoneNumber) {
    logger.warn('Telegram user forwarder disabled because TELEGRAM_PHONE_NUMBER is not set.');
    return null;
  }

  if (!config.telegram.destinationChannelId) {
    logger.warn('Telegram user forwarder disabled because TELEGRAM_DESTINATION_CHANNEL_ID is not set.');
    return null;
  }

  if (config.telegram.forwarderSourceChannels.length === 0) {
    logger.warn('Telegram user forwarder disabled because TELEGRAM_SOURCE_CHANNEL_IDS is empty.');
    return null;
  }

  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  const processedMessageIds = new Set();

  async function handleNewMessage(event) {
    try {
      const message = event.message;
      
      logger.debug(
        { 
          hasMessage: Boolean(message),
          hasPeerId: Boolean(message?.peerId),
          hasChannelId: Boolean(message?.peerId?.channelId)
        },
        'User forwarder: Event received'
      );
      
      // Get peer ID (channel ID)
      const peerId = message.peerId;
      if (!peerId || !peerId.channelId) {
        logger.debug('User forwarder: Not a channel message, skipping');
        return; // Not a channel message
      }

      // Convert BigInt channelId to number format used in config
      const channelIdBigInt = peerId.channelId;
      const chatId = -1000000000000 - Number(channelIdBigInt);
      
      logger.info(
        { 
          channelIdBigInt: String(channelIdBigInt),
          chatIdCalculated: chatId, 
          isConfigured: config.telegram.forwarderSourceChannels.includes(chatId),
          configuredChannels: config.telegram.forwarderSourceChannels
        },
        'User forwarder: Received message from channel'
      );
      
      // Verifica se é de um dos canais de origem
      if (!config.telegram.forwarderSourceChannels.includes(chatId)) {
        logger.debug({ chatId }, 'User forwarder: Channel not in source list, ignoring');
        return;
      }

      const messageId = `${chatId}_${message.id}`;
      
      // Evita processar a mesma mensagem múltiplas vezes
      if (processedMessageIds.has(messageId)) {
        return;
      }
      
      processedMessageIds.add(messageId);
      
      // Limpa cache de mensagens antigas
      if (processedMessageIds.size > 1000) {
        const arr = Array.from(processedMessageIds);
        arr.slice(0, 500).forEach(id => processedMessageIds.delete(id));
      }

      // Forward message para o canal de destino
      await client.forwardMessages(config.telegram.destinationChannelId, {
        messages: [message.id],
        fromPeer: peerId,
      });

      logger.info(
        {
          sourceChannelId: chatId,
          destinationChannelId: config.telegram.destinationChannelId,
          messageId: message.id,
          hasText: Boolean(message.text),
          hasMedia: Boolean(message.media),
        },
        'User forwarder: Message forwarded successfully'
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          messageId: event.message?.id,
        },
        'User forwarder: Failed to process/forward message'
      );
    }
  }

  const launch = async () => {
    try {
      logger.info('Starting Telegram user forwarder...');

      // Connect and authenticate
      await client.start({
        phoneNumber: async () => phoneNumber,
        password: async () => await input.text('Please enter your 2FA password (if enabled): '),
        phoneCode: async () => await input.text('Please enter the code you received: '),
        onError: (err) => logger.error({ err }, 'Authentication error'),
      });

      logger.info('User forwarder authenticated successfully');

      // Save session string for next time (print to console)
      const sessionStr = client.session.save();
      if (!sessionString) {
        logger.info(
          { sessionString: sessionStr },
          'IMPORTANT: Save this session string to TELEGRAM_SESSION env var to avoid re-authentication'
        );
      }

      // Listen for ALL new messages (will filter inside the handler)
      const eventHandler = async (event) => {
        logger.info('🔔 EVENT HANDLER CALLED!'); // Log de teste
        await handleNewMessage(event);
      };
      
      client.addEventHandler(
        eventHandler, 
        new NewMessage({})
      );
      
      // Test: também adicionar handler raw
      client.on('updates', (updates) => {
        logger.debug({ updateCount: updates?.length || 0 }, '📨 Raw updates received');
      });

      logger.info(
        {
          sourceChannels: config.telegram.forwarderSourceChannels,
          destinationChannel: config.telegram.destinationChannelId,
          mode: 'user-account',
          eventHandlerRegistered: true,
        },
        'Telegram user forwarder started - listening to ALL channels (will filter)'
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to launch user forwarder');
      throw error;
    }
  };

  const stop = async () => {
    await client.disconnect();
    logger.info('Telegram user forwarder stopped');
  };

  return { client, launch, stop };
}


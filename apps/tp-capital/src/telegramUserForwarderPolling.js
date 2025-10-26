import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'telegram-images');

/**
 * Create Telegram forwarder using user account with ACTIVE POLLING
 * Busca ativamente por novas mensagens ao invés de esperar eventos
 */
export function createTelegramUserForwarderPolling(sourceChannelIds = null) {
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

  // Usa canais fornecidos como parâmetro OU do config
  const channelsToMonitor = sourceChannelIds || config.telegram.forwarderSourceChannels;

  if (channelsToMonitor.length === 0) {
    logger.warn('Telegram user forwarder disabled because no source channels provided.');
    return null;
  }

  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  let isRunning = false;
  const lastMessageIds = new Map(); // Track last message ID per channel

  // Cache para nomes de canais
  const channelNames = new Map();

  async function getChannelName(channelId) {
    // Verifica cache primeiro
    if (channelNames.has(channelId)) {
      return channelNames.get(channelId);
    }

    try {
      const entity = await client.getEntity(channelId);
      const name = entity.title || entity.username || `Canal ${channelId}`;
      channelNames.set(channelId, name);
      return name;
    } catch (error) {
      logger.debug({ err: error.message, channelId }, 'Failed to get channel name');
      return `Canal ${channelId}`;
    }
  }

  async function pollChannelForNewMessages(channelId) {
    try {
      // Get last 1 message from channel
      const messages = await client.getMessages(channelId, { limit: 1 });
      
      if (!messages || messages.length === 0) {
        return;
      }

      const latestMessage = messages[0];
      const lastKnownId = lastMessageIds.get(channelId) || 0;

      // Se é uma mensagem nova (ID maior que o último conhecido)
      if (latestMessage.id > lastKnownId) {
        logger.info(
          {
            channelId,
            messageId: latestMessage.id,
            lastKnownId,
            hasText: Boolean(latestMessage.text),
            hasMedia: Boolean(latestMessage.media),
          },
          'User forwarder: New message detected!'
        );

        // Atualiza last ID ANTES de tentar forward
        lastMessageIds.set(channelId, latestMessage.id);

        // Busca o nome real do canal
        const channelName = await getChannelName(channelId);

        // Extrai informações da mensagem para salvar no banco
        const messageText = latestMessage.text || latestMessage.message || '';
        const messageDate = latestMessage.date ? new Date(latestMessage.date * 1000) : new Date();
        
        // Tenta baixar e salvar imagem se existir
        let imageUrl = null;
        let imageWidth = null;
        let imageHeight = null;

        if (latestMessage.media) {
          logger.info(
            { 
              channelId, 
              messageId: latestMessage.id,
              mediaType: latestMessage.media.className,
              hasPhoto: Boolean(latestMessage.media.photo)
            },
            '🔍 Media detected, attempting download...'
          );

          try {
            // Baixar a imagem (funciona para photo, document com imagem, etc)
            const buffer = await client.downloadMedia(latestMessage.media, {
              progressCallback: null
            });

            logger.info(
              { 
                channelId, 
                messageId: latestMessage.id,
                bufferSize: buffer ? buffer.length : 0,
                bufferType: buffer ? typeof buffer : 'null'
              },
              '📥 Download attempt result'
            );

            if (buffer && buffer.length > 0) {
              // Detectar dimensões se for photo
              if (latestMessage.media.photo) {
                const photo = latestMessage.media.photo;
                const sizes = photo.sizes || [];
                const largestSize = sizes[sizes.length - 1];
                
                if (largestSize) {
                  imageWidth = largestSize.w;
                  imageHeight = largestSize.h;
                }
              }

              // Salvar no filesystem
              const filename = `${String(channelId).replace('-', '')}_${latestMessage.id}_${Date.now()}.jpg`;
              const filepath = path.join(IMAGES_DIR, filename);
              
              // Garantir que o diretório existe
              if (!fs.existsSync(IMAGES_DIR)) {
                fs.mkdirSync(IMAGES_DIR, { recursive: true });
                logger.info({ dir: IMAGES_DIR }, 'Images directory created');
              }
              
              fs.writeFileSync(filepath, buffer);
              
              // URL relativo acessível via HTTP
              imageUrl = `/telegram-images/${filename}`;
              
              logger.info(
                { 
                  channelId, 
                  messageId: latestMessage.id, 
                  filename,
                  filepath,
                  size: buffer.length,
                  url: imageUrl
                },
                '📷 Image downloaded and saved successfully!'
              );
            } else {
              logger.warn(
                { channelId, messageId: latestMessage.id },
                'Media download returned empty buffer'
              );
            }
          } catch (imageError) {
            logger.error(
              { 
                err: imageError.message, 
                stack: imageError.stack,
                channelId, 
                messageId: latestMessage.id 
              },
              'Failed to download/save image'
            );
          }
        }

        // Tenta encaminhar, se falhar por CHAT_FORWARDS_RESTRICTED, copia o conteúdo
        let forwardMethod = 'forward';
        try {
          await client.forwardMessages(config.telegram.destinationChannelId, {
            messages: [latestMessage.id],
            fromPeer: channelId,
          });

          logger.info(
            {
              sourceChannelId: channelId,
              destinationChannelId: config.telegram.destinationChannelId,
              messageId: latestMessage.id,
            },
            '✅ Message forwarded successfully!'
          );
        } catch (forwardError) {
          // Se falhou por restrição de forward, copia o conteúdo
          if (forwardError.errorMessage === 'CHAT_FORWARDS_RESTRICTED') {
            logger.info({ channelId }, 'Channel has forward restrictions, copying content instead...');
            
            forwardMethod = 'copy';
            
            try {
              const contentToCopy = `${messageText}\n\n📤 Fonte: Canal ${channelId}`;
              
              // Se tem imagem, tenta enviar também
              if (latestMessage.media && latestMessage.media.photo) {
                await client.sendMessage(config.telegram.destinationChannelId, {
                  message: contentToCopy,
                  file: latestMessage.media,
                });
              } else {
                await client.sendMessage(config.telegram.destinationChannelId, {
                  message: contentToCopy,
                });
              }

              logger.info(
                {
                  sourceChannelId: channelId,
                  destinationChannelId: config.telegram.destinationChannelId,
                  messageId: latestMessage.id,
                  method: 'copy',
                  hasImage: Boolean(imageUrl),
                },
                '✅ Message COPIED successfully (forward was restricted)!'
              );
            } catch (copyError) {
              logger.error(
                {
                  err: copyError,
                  channelId,
                  messageId: latestMessage.id,
                },
                'Failed to copy message content'
              );
              return; // Não salva no banco se falhou
            }
          } else {
            logger.error(
              {
                err: forwardError,
                channelId,
                messageId: latestMessage.id,
              },
              'Failed to forward message'
            );
            return; // Não salva no banco se falhou
          }
        }

        // Tenta parsear como sinal
        let isSignal = false;
        try {
          const { parseSignal } = await import('./signalParser.js');
          const signal = parseSignal(messageText, {
            timestamp: messageDate.getTime(),
            channel: channelName,
            source: 'telegram'
          });
          
          // Se parseou com sucesso, salva como sinal
          const { timescaleClient } = await import('./timescaleClient.js');
          await timescaleClient.insertSignal(signal);
          isSignal = true;
          
          logger.info(
            { channelId, channelName, messageId: latestMessage.id, asset: signal.asset },
            '📊 Signal parsed and saved'
          );
        } catch (parseError) {
          // Não é um sinal, salva como mensagem encaminhada
          isSignal = false;
        }

        // Se NÃO for sinal, salva em forwarded_messages
        if (!isSignal) {
          try {
            const { timescaleClient } = await import('./timescaleClient.js');
            
            await timescaleClient.insertForwardedMessage({
              ts: messageDate,
              source_channel_id: channelId,
              source_channel_name: channelName,
              message_id: latestMessage.id,
              message_text: messageText,
              image_url: imageUrl,
              image_width: imageWidth,
              image_height: imageHeight,
              forwarded_at: new Date(),
              destination_channel_id: config.telegram.destinationChannelId,
              forward_method: forwardMethod,
            });

            logger.info(
              { channelId, channelName, messageId: latestMessage.id, hasImage: Boolean(imageUrl) },
              '💾 Non-signal message saved to forwarded_messages'
            );
          } catch (dbError) {
            logger.error(
              { err: dbError, channelId, messageId: latestMessage.id },
              'Failed to save forwarded message to database'
            );
          }
        }
      }
    } catch (error) {
      logger.debug(
        {
          err: error.message,
          channelId,
        },
        'Error polling channel'
      );
    }
  }

  async function pollLoop() {
    while (isRunning) {
      for (const channelId of channelsToMonitor) {
        if (!isRunning) break;
        await pollChannelForNewMessages(channelId);
      }
      
      // Aguarda 3 segundos antes do próximo poll
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  const updateChannels = (newChannelIds) => {
    // Atualiza a lista de canais monitorados
    channelsToMonitor.length = 0;
    channelsToMonitor.push(...newChannelIds);
    
    // Inicializa IDs para novos canais
    newChannelIds.forEach(channelId => {
      if (!lastMessageIds.has(channelId)) {
        lastMessageIds.set(channelId, 0);
      }
    });

    logger.info({ channels: channelsToMonitor }, 'Channels list updated');
  };

  const launch = async () => {
    try {
      logger.info('Starting Telegram user forwarder (active polling)...');

      await client.start({
        phoneNumber: async () => phoneNumber,
        password: async () => await input.text('Please enter your 2FA password (if enabled): '),
        phoneCode: async () => await input.text('Please enter the code you received: '),
        onError: (err) => logger.error({ err }, 'Authentication error'),
      });

      logger.info('User forwarder authenticated successfully');

      const sessionStr = client.session.save();
      if (!sessionString) {
        logger.info(
          { sessionString: sessionStr },
          'IMPORTANT: Save this session string to TELEGRAM_SESSION env var'
        );
      }

      // Inicializar last message IDs
      logger.info('Initializing last message IDs for each channel...');
      for (const channelId of channelsToMonitor) {
        try {
          const messages = await client.getMessages(channelId, { limit: 1 });
          if (messages && messages.length > 0) {
            lastMessageIds.set(channelId, messages[0].id);
            logger.info({ channelId, lastMessageId: messages[0].id }, 'Initialized channel');
          }
        } catch (error) {
          logger.warn({ channelId, err: error.message }, 'Failed to get initial messages from channel');
        }
      }

      isRunning = true;

      logger.info(
        {
          sourceChannels: channelsToMonitor,
          destinationChannel: config.telegram.destinationChannelId,
          pollingInterval: '3s',
        },
        '✅ Telegram user forwarder started - ACTIVE POLLING MODE'
      );

      // Start polling loop
      pollLoop();
    } catch (error) {
      logger.error({ err: error }, 'Failed to launch user forwarder');
      throw error;
    }
  };

  const stop = async () => {
    isRunning = false;
    await client.disconnect();
    logger.info('Telegram user forwarder stopped');
  };

  return { client, launch, stop, updateChannels };
}


import express from 'express';
import { 
  getLastMessagesForChannel, 
  getActiveChannels, 
  recordMessageReceived,
  getPool
} from './messageStore.js';
import { logger } from './logger.js';

const router = express.Router();

/**
 * GET /photo/:channelId/:messageId
 * Baixa a foto de uma mensagem específica
 */
router.get('/photo/:channelId/:messageId', async (req, res) => {
  try {
    const { channelId, messageId } = req.params;
    const userClient = req.app.get('telegramUserClient');
    
    if (!userClient || !userClient.connected) {
      return res.status(503).json({
        success: false,
        message: 'Telegram client não está conectado'
      });
    }
    
    logger.info({ channelId, messageId }, '[PhotoDownload] Baixando foto...');
    
    const numericChannelId = BigInt(channelId);
    const numericMessageId = Number(messageId);
    
    // Buscar a mensagem do Telegram
    const messages = await userClient.getMessages(numericChannelId, {
      ids: [numericMessageId]
    });
    
    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({
        success: false,
        message: 'Mensagem ou mídia não encontrada'
      });
    }
    
    const msg = messages[0];
    
    if (msg.media.className !== 'MessageMediaPhoto') {
      return res.status(400).json({
        success: false,
        message: 'Mensagem não contém foto'
      });
    }
    
    // Baixar a foto
    const buffer = await userClient.downloadMedia(msg.media, {});
    
    if (!buffer) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao baixar foto'
      });
    }
    
    // Retornar imagem como JPEG
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache por 24h
    res.send(buffer);
    
    logger.info({ channelId, messageId, size: buffer.length }, '[PhotoDownload] Foto enviada');
    
  } catch (error) {
    logger.error({ err: error }, '[PhotoDownload] Erro ao baixar foto');
    res.status(500).json({
      success: false,
      message: 'Erro ao baixar foto',
      error: error.message
    });
  }
});

/**
 * POST /sync-messages
 * Sincroniza mensagens faltantes do Telegram para o banco de dados
 */
router.post('/sync-messages', async (req, res) => {
  try {
    // Aceitar limite de mensagens no body (padrão: 100)
    const telegramLimit = Number(req.body?.limit) || 100;
    logger.info({ telegramLimit }, '[SyncMessages] Iniciando verificação de sincronização...');
    
    // Obter o cliente Telegram do contexto global (será injetado pelo index.js)
    const userClient = req.app.get('telegramUserClient');
    
    if (!userClient || !userClient.connected) {
      return res.status(503).json({
        success: false,
        message: 'Telegram client não está conectado. Execute a autenticação primeiro.',
        data: { totalMessagesSynced: 0 }
      });
    }
    
    // 1. Buscar canais ativos
    const channels = await getActiveChannels({ logger });
    
    logger.info(
      { 
        totalChannels: channels.length,
        channels: channels.map(ch => ({ id: ch.channelId, label: ch.label, isActive: ch.isActive }))
      },
      '[SyncMessages] Active channels loaded from database'
    );
    
    if (channels.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum canal ativo para sincronizar',
        data: { 
          totalMessagesSynced: 0, 
          channelsSynced: [],
          mode: 'permissive'
        }
      });
    }
    
    let totalMessagesSynced = 0;
    const channelsSynced = [];
    const channelsSkipped = [];
    
    // 2. Para cada canal, verificar e sincronizar
    for (const channel of channels) {
      try {
        logger.info(
          { channelId: channel.channelId, label: channel.label },
          '[SyncMessages] Syncing channel...'
        );
        
        const result = await syncChannel(channel.channelId, userClient, { logger, telegramLimit });
        
        // Always include in result (even if 0 messages synced)
        totalMessagesSynced += result.messagesSynced || 0;
        channelsSynced.push({
          channelId: channel.channelId,
          label: channel.label,
          messagesSynced: result.messagesSynced || 0
        });
        
        if (result.messagesSynced === 0) {
          logger.info(
            { channelId: channel.channelId, label: channel.label },
            '[SyncMessages] Channel already up-to-date'
          );
        }
      } catch (error) {
        logger.error(
          { err: error, channelId: channel.channelId, label: channel.label }, 
          '[SyncMessages] Error syncing channel'
        );
        channelsSkipped.push({
          channelId: channel.channelId,
          label: channel.label,
          reason: error.message
        });
      }
    }
    
    logger.info(
      { 
        totalMessagesSynced, 
        channelsSyncedCount: channelsSynced.length,
        channelsSkippedCount: channelsSkipped.length,
        channelsSynced: channelsSynced.map(ch => ch.label),
        channelsSkipped: channelsSkipped.map(ch => ({ label: ch.label, reason: ch.reason }))
      },
      '[SyncMessages] Sync summary'
    );
    
    logger.info(
      { totalMessagesSynced, channelsCount: channelsSynced.length },
      '[SyncMessages] Sincronização concluída'
    );
    
    res.json({
      success: true,
      message: totalMessagesSynced > 0 
        ? `${totalMessagesSynced} mensagem(ns) recuperada(s)`
        : 'Todas as mensagens estão sincronizadas',
      data: {
        totalMessagesSynced,
        channelsSynced,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error({ err: error }, '[SyncMessages] Erro ao sincronizar mensagens');
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar mensagens',
      error: error.message
    });
  }
});

/**
 * Sincroniza um canal específico
 */
async function syncChannel(channelId, telegramClient, { logger, telegramLimit = 100 } = {}) {
  try {
    // 1. Buscar últimas N mensagens do banco (mesmo número que vamos buscar do Telegram)
    // Isso garante que a comparação seja precisa
    const dbMessages = await getLastMessagesForChannel(channelId, telegramLimit, { logger });
    const dbMessageIds = new Set(dbMessages.map(msg => Number(msg.messageId)));
    
    logger.debug(
      { channelId, totalInDb: dbMessages.length, telegramLimit },
      '[SyncChannel] Buscando mensagens do Telegram...'
    );
    
    // 2. Buscar mensagens do Telegram
    // Para canais, usar o ID completo como BigInt negativo
    const numericChannelId = BigInt(channelId);
    
    logger.info(
      { 
        channelId, 
        numericChannelId: numericChannelId.toString(),
        telegramLimit 
      },
      '[SyncChannel] Buscando mensagens do Telegram...'
    );
    
    let telegramMessages;
    try {
      // Buscar mensagens do Telegram (limite configurável)
      telegramMessages = await telegramClient.getMessages(numericChannelId, {
        limit: telegramLimit
      });
      
      logger.info(
        { 
          channelId, 
          messagesFound: telegramMessages ? telegramMessages.length : 0 
        },
        '[SyncChannel] Mensagens obtidas do Telegram'
      );
    } catch (error) {
      logger.error(
        { err: error, channelId, numericChannelId: numericChannelId.toString() },
        '[SyncChannel] Erro ao buscar mensagens do Telegram'
      );
      return { messagesSynced: 0 };
    }

    if (!telegramMessages || telegramMessages.length === 0) {
      logger.info({ channelId }, '[SyncChannel] Nenhuma mensagem encontrada no Telegram.');
      return { messagesSynced: 0 };
    }

    // 3. Identificar mensagens faltando
    const missingMessages = telegramMessages.filter(tgMsg => {
      const msgId = Number(tgMsg.id);
      return !dbMessageIds.has(msgId);
    });

    if (missingMessages.length === 0) {
      logger.info({ channelId }, '[SyncChannel] Sincronizado (todas as mensagens já estão no banco).');
      return { messagesSynced: 0 };
    }

    logger.info(
      { channelId, missingCount: missingMessages.length },
      '[SyncChannel] Mensagens faltando detectadas. Recuperando...'
    );
    
    // Limitar sincronização conforme telegramLimit (máximo de mensagens do Telegram)
    // Mas só inserir no máximo as mais recentes que estão faltando
    const maxToSync = Math.min(missingMessages.length, telegramLimit);
    const messagesToSync = missingMessages
      .sort((a, b) => Number(b.id) - Number(a.id)) // Ordenar por ID decrescente (mais recentes primeiro)
      .slice(0, maxToSync);
    
    if (messagesToSync.length < missingMessages.length) {
      logger.info(
        { channelId, total: missingMessages.length, limited: messagesToSync.length },
        '[SyncChannel] Limitando sincronização às mensagens mais recentes'
      );
    }
    
    // 4. Inserir mensagens no banco
    let synced = 0;
    for (const msg of messagesToSync) {
      try {
        // Extrair informações de mídia
        const mediaRefs = [];
        let mediaType = 'text';
        let photoData = null;
        
        if (msg.media) {
          const mediaClass = msg.media.className;
          
          if (mediaClass === 'MessageMediaPhoto') {
            mediaType = 'photo';
            
            // Salvar metadados da foto para download sob demanda
            const photo = msg.media.photo;
            if (photo) {
              mediaRefs.push({
                type: 'photo',
                id: photo.id?.toString(),
                accessHash: photo.accessHash?.toString(),
                fileReference: photo.fileReference ? Buffer.from(photo.fileReference).toString('base64') : null,
                date: photo.date,
                sizes: photo.sizes?.map(s => ({
                  type: s.className,
                  w: s.w,
                  h: s.h,
                  size: s.size
                })) || []
              });
              
              // Salvar dados para reconstrução futura
              photoData = {
                channelId: channelId,
                messageId: msg.id,
                photoId: photo.id?.toString(),
                accessHash: photo.accessHash?.toString(),
                hasPhoto: true
              };
            }
          } else if (mediaClass === 'MessageMediaDocument') {
            mediaType = 'document';
            const doc = msg.media.document;
            mediaRefs.push({
              type: 'document',
              id: doc?.id?.toString(),
              mimeType: doc?.mimeType,
              size: doc?.size,
            });
          }
        }
        
        // Verificar se é resposta a outra mensagem
        let replyToMessageText = null;
        if (msg.replyTo && msg.replyTo.replyToMsgId) {
          try {
            const replyMsgId = msg.replyTo.replyToMsgId;
            const replyMessages = await telegramClient.getMessages(numericChannelId, {
              ids: [replyMsgId]
            });
            
            if (replyMessages && replyMessages.length > 0) {
              replyToMessageText = replyMessages[0].message || replyMessages[0].text || null;
            }
          } catch (replyError) {
            logger.warn(
              { err: replyError, channelId, messageId: msg.id, replyToId: msg.replyTo.replyToMsgId },
              '[SyncChannel] Não foi possível buscar mensagem de origem'
            );
          }
        }
        
        // Usar a data original do Telegram (quando a mensagem foi realmente enviada)
        const originalDate = new Date(msg.date * 1000);
        
        const messageData = {
          channelId,
          messageId: msg.id,
          text: msg.message || msg.text || '',
          caption: msg.message && msg.media ? msg.message : null,
          timestamp: originalDate.toISOString(),
          photos: [],
          mediaRefs,
          mediaType,
          receivedAt: originalDate.toISOString(), // Usar data original, não data de sincronização
          telegramDate: originalDate.toISOString(),
          threadId: null,
          source: 'sync',
          messageType: 'channel_post',
          chatId: null,
          metadata: {
            sync: {
              syncedAt: new Date().toISOString(), // Hora da sincronização fica aqui
              reason: 'manual_check'
            },
            photo: photoData,
            replyTo: msg.replyTo ? {
              messageId: msg.replyTo.replyToMsgId,
              text: replyToMessageText
            } : null
          },
        };

        // Inserir no banco usando a função existente
        await recordMessageReceived(messageData, { 
          logger,
          statusOverride: 'received'
        });
        
        synced++;
        
        logger.debug(
          { channelId, messageId: msg.id },
          '[SyncChannel] Mensagem recuperada'
        );
      } catch (error) {
        logger.error(
          { err: error, channelId, messageId: msg.id },
          '[SyncChannel] Erro ao inserir mensagem'
        );
      }
    }
    
    logger.info(
      { channelId, synced, total: missingMessages.length },
      '[SyncChannel] Sincronização do canal concluída'
    );
    
    return { messagesSynced: synced };

  } catch (error) {
    logger.error(
      { err: error, channelId },
      '[SyncChannel] Erro ao sincronizar canal'
    );
    return { messagesSynced: 0 };
  }
}

export default router;


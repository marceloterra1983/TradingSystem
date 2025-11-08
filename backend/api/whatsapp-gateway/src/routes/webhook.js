/**
 * Webhook routes - Receive events from WhatsApp Core
 */

import express from 'express';
import { storeMessage, updateMessageAck } from '../services/messageService.js';
import { storeContact } from '../services/contactService.js';
import { updateSessionStatus } from '../services/sessionService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /webhooks/messages
 * Receive WhatsApp events (messages, ACKs, session status)
 */
router.post('/messages', async (req, res) => {
  try {
    const { event, data, session } = req.body;
    
    logger.debug('Webhook received', { event, session });
    
    switch (event) {
      case 'message':
      case 'message.any':
        await handleMessageEvent(data, session);
        break;
      
      case 'message.ack':
        await handleAckEvent(data, session);
        break;
      
      case 'session.status':
        await handleSessionStatusEvent(data, session);
        break;
      
      default:
        logger.warn('Unknown webhook event', { event });
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    logger.error('Webhook processing failed', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle message event
 */
async function handleMessageEvent(data, session) {
  const {
    id: message_id,
    from,
    to,
    fromMe,
    type,
    body,
    caption,
    hasMedia,
    mediaUrl,
    quotedMsg,
    location,
    vCards,
    timestamp,
    ack,
  } = data;
  
  // Store contact if not exists
  if (from && !fromMe) {
    await storeContact({
      whatsapp_id: from,
      session_name: session,
      contact_type: from.includes('@g.us') ? 'group' : 'individual',
      name: data.notifyName || data.pushName || null,
      push_name: data.pushName || null,
    });
  }
  
  // Prepare message data
  const messageData = {
    message_id,
    session_name: session,
    chat_id: fromMe ? to : from,
    from_whatsapp_id: from,
    to_whatsapp_id: to,
    message_type: type,
    body: body || null,
    caption: caption || null,
    has_media: hasMedia || false,
    media_type: hasMedia ? type : null,
    media_url: mediaUrl || null,
    media_mime_type: data.mimetype || null,
    media_size_bytes: data.fileSize || null,
    media_filename: data.filename || null,
    is_from_me: fromMe || false,
    is_forwarded: data.isForwarded || false,
    is_broadcast: data.isBroadcast || false,
    is_status: data.isStatus || false,
    is_group: from?.includes('@g.us') || false,
    quoted_message_id: quotedMsg?.id || null,
    quoted_participant: quotedMsg?.participant || null,
    reactions: data.reactions ? JSON.parse(JSON.stringify(data.reactions)) : null,
    location_latitude: location?.latitude || null,
    location_longitude: location?.longitude || null,
    location_name: location?.name || null,
    location_address: location?.address || null,
    location_url: location?.url || null,
    contact_vcard: vCards?.[0] || null,
    contact_name: data.contactName || null,
    link_preview: data.linkPreview || null,
    timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
    ack_status: ack ? `${ack}` : 'pending',
    metadata: {},
    raw_data: data,
  };
  
  await storeMessage(messageData);
}

/**
 * Handle ACK event
 */
async function handleAckEvent(data, session) {
  const { id: message_id, ack } = data;
  
  const ackMap = {
    0: 'pending',
    1: 'server',
    2: 'delivered',
    3: 'read',
    4: 'played',
  };
  
  const ackStatus = ackMap[ack] || 'pending';
  
  await updateMessageAck(session, message_id, ackStatus);
}

/**
 * Handle session status event
 */
async function handleSessionStatusEvent(data, session) {
  const { status } = data;
  
  const statusMap = {
    'starting': 'connecting',
    'qr': 'connecting',
    'working': 'connected',
    'failed': 'failed',
    'stopped': 'disconnected',
  };
  
  const mappedStatus = statusMap[status] || status;
  
  await updateSessionStatus(session, mappedStatus, data);
}

export default router;


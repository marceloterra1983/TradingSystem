/**
 * Message Service - Handles message storage and retrieval
 */

import pool from '../db/pool.js';
import logger from '../utils/logger.js';
import { downloadMedia } from './mediaService.js';

/**
 * Store message from webhook
 */
export async function storeMessage(messageData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      message_id,
      session_name,
      chat_id,
      from_whatsapp_id,
      to_whatsapp_id,
      message_type,
      body,
      caption,
      has_media,
      media_type,
      media_url,
      media_mime_type,
      media_size_bytes,
      media_filename,
      is_from_me,
      is_forwarded,
      is_broadcast,
      is_status,
      is_group,
      quoted_message_id,
      quoted_participant,
      reactions,
      location_latitude,
      location_longitude,
      location_name,
      location_address,
      location_url,
      contact_vcard,
      contact_name,
      link_preview,
      timestamp,
      ack_status,
      metadata,
      raw_data,
    } = messageData;
    
    const query = `
      INSERT INTO whatsapp_gateway.messages (
        message_id, session_name, chat_id, from_whatsapp_id, to_whatsapp_id,
        message_type, body, caption, has_media, media_type, media_url,
        media_mime_type, media_size_bytes, media_filename,
        is_from_me, is_forwarded, is_broadcast, is_status, is_group,
        quoted_message_id, quoted_participant, reactions,
        location_latitude, location_longitude, location_name, location_address, location_url,
        contact_vcard, contact_name, link_preview,
        timestamp, ack_status, sync_source, metadata, raw_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
        $28, $29, $30, $31, $32, $33, $34, $35
      )
      ON CONFLICT (message_id, session_name) DO UPDATE
      SET body = EXCLUDED.body,
          ack_status = EXCLUDED.ack_status,
          updated_at = NOW()
      RETURNING id
    `;
    
    const values = [
      message_id, session_name, chat_id, from_whatsapp_id, to_whatsapp_id,
      message_type, body, caption, has_media, media_type, media_url,
      media_mime_type, media_size_bytes, media_filename,
      is_from_me, is_forwarded, is_broadcast, is_status, is_group,
      quoted_message_id, quoted_participant, reactions ? JSON.stringify(reactions) : null,
      location_latitude, location_longitude, location_name, location_address, location_url,
      contact_vcard, contact_name, link_preview ? JSON.stringify(link_preview) : null,
      timestamp || new Date(), ack_status || 'pending', 'webhook',
      metadata ? JSON.stringify(metadata) : null,
      raw_data ? JSON.stringify(raw_data) : null,
    ];
    
    const result = await client.query(query, values);
    const messageDbId = result.rows[0].id;
    
    // If message has media, queue for download
    if (has_media && media_url) {
      await queueMediaDownload(client, {
        message_id,
        session_name,
        chat_id,
        media_url,
        media_type,
        media_mime_type,
        media_size_bytes,
        media_filename,
      });
    }
    
    // Increment session message counter
    await client.query(`
      SELECT whatsapp_gateway.increment_message_counter($1, $2)
    `, [session_name, is_from_me]);
    
    await client.query('COMMIT');
    
    logger.info('Message stored successfully', {
      message_id,
      session_name,
      chat_id,
      has_media,
    });
    
    return { id: messageDbId, message_id };
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to store message', {
      error: error.message,
      message_id: messageData.message_id,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Queue media download
 */
async function queueMediaDownload(client, mediaData) {
  const {
    message_id,
    session_name,
    chat_id,
    media_url,
    media_type,
    media_mime_type,
    media_size_bytes,
    media_filename,
  } = mediaData;
  
  const query = `
    INSERT INTO whatsapp_gateway.media_downloads (
      message_id, session_name, chat_id,
      media_url, media_type, media_mime_type, media_size_bytes, media_filename,
      download_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
    ON CONFLICT (message_id, session_name) DO NOTHING
  `;
  
  await client.query(query, [
    message_id,
    session_name,
    chat_id,
    media_url,
    media_type,
    media_mime_type,
    media_size_bytes,
    media_filename,
  ]);
}

/**
 * Get messages for a chat
 */
export async function getMessages(sessionName, chatId, { limit = 100, offset = 0, before = null }) {
  const query = `
    SELECT
      id, message_id, session_name, chat_id, from_whatsapp_id, to_whatsapp_id,
      message_type, body, caption, has_media, media_type, media_local_path,
      media_filename, is_from_me, is_forwarded, is_group, quoted_message_id,
      timestamp, ack_status, created_at
    FROM whatsapp_gateway.messages
    WHERE session_name = $1
      AND chat_id = $2
      ${before ? 'AND timestamp < $4' : ''}
    ORDER BY timestamp DESC
    LIMIT $3
    OFFSET ${before ? '$5' : '$4'}
  `;
  
  const values = before
    ? [sessionName, chatId, limit, before, offset]
    : [sessionName, chatId, limit, offset];
  
  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Get message by ID
 */
export async function getMessageById(sessionName, messageId) {
  const query = `
    SELECT * FROM whatsapp_gateway.messages
    WHERE session_name = $1 AND message_id = $2
  `;
  
  const result = await pool.query(query, [sessionName, messageId]);
  return result.rows[0];
}

/**
 * Update message ACK status
 */
export async function updateMessageAck(sessionName, messageId, ackStatus) {
  const query = `
    UPDATE whatsapp_gateway.messages
    SET ack_status = $3,
        ack_timestamp = NOW(),
        updated_at = NOW()
    WHERE session_name = $1
      AND message_id = $2
  `;
  
  await pool.query(query, [sessionName, messageId, ackStatus]);
  
  logger.debug('Message ACK updated', { session_name: sessionName, message_id: messageId, ack_status: ackStatus });
}

/**
 * Search messages by text
 */
export async function searchMessages(sessionName, searchText, { limit = 50, offset = 0 }) {
  const query = `
    SELECT
      id, message_id, chat_id, from_whatsapp_id, message_type, body,
      timestamp, is_from_me
    FROM whatsapp_gateway.messages
    WHERE session_name = $1
      AND to_tsvector('portuguese', COALESCE(body, '')) @@ plainto_tsquery('portuguese', $2)
    ORDER BY timestamp DESC
    LIMIT $3
    OFFSET $4
  `;
  
  const result = await pool.query(query, [sessionName, searchText, limit, offset]);
  return result.rows;
}


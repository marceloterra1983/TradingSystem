#!/usr/bin/env node
/**
 * Backfill Link Previews for Existing Messages
 * 
 * This script updates messages that have Twitter/YouTube/Instagram/Generic links
 * but don't have link previews (because they were synced before the feature was added).
 */

import pg from 'pg';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../..');

// Import from apps/telegram-gateway
import { extractLinkPreviews } from '../../../../../apps/telegram-gateway/src/utils/linkPreview.js';

const logger = pino({ name: 'backfill-link-previews' });
const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5434,
  database: 'telegram_gateway',
  user: 'telegram',
  password: process.env.TELEGRAM_DB_PASSWORD || 'NYMBgrENUZP8FqUHN1Yo8sdzSfs3kLhp',
});

async function backfillLinkPreviews() {
  const client = await pool.connect();
  
  try {
    // Find messages with links but no previews
    const query = `
      SELECT id, message_id, channel_id, text, metadata
      FROM telegram_gateway.messages
      WHERE (
        text LIKE '%twitter.com%' OR 
        text LIKE '%x.com%' OR
        text LIKE '%youtube.com%' OR
        text LIKE '%youtu.be%' OR
        text LIKE '%instagram.com%' OR
        text LIKE '%http%'
      )
      AND (
        metadata->'linkPreview' IS NULL OR
        metadata->>'linkPreview' = 'null'
      )
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    const result = await client.query(query);
    const messages = result.rows;
    
    logger.info({ total: messages.length }, 'Messages found for backfill');
    
    if (messages.length === 0) {
      logger.info('No messages need backfill');
      return;
    }
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const msg of messages) {
      processed++;
      
      try {
        // Extract link preview
        const linkPreview = await extractLinkPreviews(msg.text);
        
        if (linkPreview) {
          // Update metadata with link preview
          const updatedMetadata = {
            ...msg.metadata,
            linkPreview: linkPreview
          };
          
          await client.query(
            `UPDATE telegram_gateway.messages 
             SET metadata = $1, updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(updatedMetadata), msg.id]
          );
          
          updated++;
          logger.info(
            { 
              messageId: msg.message_id, 
              channelId: msg.channel_id,
              previewType: linkPreview.type,
              progress: `${processed}/${messages.length}`
            }, 
            'Link preview added'
          );
          
          // Rate limit: wait 500ms between requests to avoid API throttling
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          skipped++;
          logger.debug(
            { messageId: msg.message_id, text: msg.text.substring(0, 60) },
            'No link preview found for message'
          );
        }
        
      } catch (error) {
        errors++;
        logger.error(
          { err: error, messageId: msg.message_id, text: msg.text.substring(0, 60) },
          'Failed to extract link preview'
        );
      }
    }
    
    logger.info({ 
      total: messages.length,
      processed,
      updated,
      skipped,
      errors
    }, 'Backfill complete');
    
  } finally {
    client.release();
    await pool.end();
  }
}

// Run backfill
backfillLinkPreviews()
  .then(() => {
    logger.info('Backfill completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ err: error }, 'Backfill failed');
    process.exit(1);
  });


/**
 * WhatsApp Sync Service
 * Background service for synchronizing WhatsApp messages
 */

import pg from 'pg';
import axios from 'axios';
import PQueue from 'p-queue';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../..');
dotenv.config({ path: join(projectRoot, '.env') });

const { Pool } = pg;

// Configuration
const config = {
  db: {
    host: process.env.WHATSAPP_GATEWAY_DB_HOST || 'whatsapp-pgbouncer',
    port: parseInt(process.env.WHATSAPP_GATEWAY_DB_PORT || '6432', 10),
    database: process.env.WHATSAPP_GATEWAY_DB_NAME || 'whatsapp_gateway',
    user: process.env.WHATSAPP_GATEWAY_DB_USER || 'whatsapp',
    password: process.env.WHATSAPP_GATEWAY_DB_PASSWORD,
  },
  whatsappCore: {
    url: process.env.WHATSAPP_CORE_URL || 'http://whatsapp-gateway-core:3000',
    apiKey: process.env.WHATSAPP_CORE_API_KEY || 'changeme-whatsapp-api-key',
  },
  sync: {
    intervalMs: parseInt(process.env.WHATSAPP_SYNC_INTERVAL_MS || '300000', 10),
    batchSize: parseInt(process.env.WHATSAPP_SYNC_BATCH_SIZE || '100', 10),
    lookbackDays: parseInt(process.env.WHATSAPP_SYNC_LOOKBACK_DAYS || '7', 10),
    concurrentChats: parseInt(process.env.WHATSAPP_SYNC_CONCURRENT_CHATS || '5', 10),
  },
};

// Initialize database pool
const pool = new Pool({
  ...config.db,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Initialize queue for concurrent sync operations
const syncQueue = new PQueue({ concurrency: config.sync.concurrentChats });

console.log('[WhatsApp Sync] Service starting...');
console.log('[WhatsApp Sync] Config:', {
  db: `${config.db.host}:${config.db.port}/${config.db.database}`,
  whatsappCore: config.whatsappCore.url,
  syncInterval: `${config.sync.intervalMs}ms`,
  batchSize: config.sync.batchSize,
});

/**
 * Get chats ready for sync from sync_queue view
 */
async function getChatsToSync() {
  const query = `
    SELECT
      id, session_name, chat_id, chat_name, chat_type,
      sync_status, sync_type, synced_messages_count, total_messages_count,
      last_successful_sync_at
    FROM whatsapp_gateway.sync_queue
    LIMIT $1
  `;
  
  const result = await pool.query(query, [config.sync.concurrentChats * 2]);
  return result.rows;
}

/**
 * Sync messages for a chat
 */
async function syncChat(chat) {
  const { session_name, chat_id, sync_type } = chat;
  
  console.log(`[Sync] Starting sync for ${session_name}/${chat_id} (${sync_type})`);
  
  try {
    // Mark as syncing
    await pool.query(
      `UPDATE whatsapp_gateway.sync_state
       SET sync_status = 'syncing', sync_started_at = NOW()
       WHERE session_name = $1 AND chat_id = $2`,
      [session_name, chat_id]
    );
    
    // Fetch messages from WhatsApp Core API
    const messagesUrl = `${config.whatsappCore.url}/api/${session_name}/chats/${encodeURIComponent(chat_id)}/messages`;
    
    const response = await axios.get(messagesUrl, {
      headers: {
        'X-Api-Key': config.whatsappCore.apiKey,
      },
      params: {
        limit: config.sync.batchSize,
      },
      timeout: 30000,
    });
    
    const messages = response.data.messages || [];
    
    console.log(`[Sync] Fetched ${messages.length} messages for ${chat_id}`);
    
    // Store each message
    let syncedCount = 0;
    for (const message of messages) {
      try {
        await storeMessageFromSync(session_name, message);
        syncedCount++;
      } catch (error) {
        console.error(`[Sync] Failed to store message ${message.id}:`, error.message);
      }
    }
    
    // Update sync progress
    await pool.query(
      `SELECT whatsapp_gateway.update_sync_progress($1, $2, $3, $4, $5)`,
      [session_name, chat_id, syncedCount, messages.length, messages[0]?.timestamp || null]
    );
    
    // Mark as completed
    await pool.query(
      `SELECT whatsapp_gateway.complete_sync($1, $2)`,
      [session_name, chat_id]
    );
    
    console.log(`[Sync] Completed sync for ${chat_id}: ${syncedCount}/${messages.length} messages`);
    
  } catch (error) {
    console.error(`[Sync] Failed to sync ${chat_id}:`, error.message);
    
    // Mark as failed and schedule retry
    await pool.query(
      `SELECT whatsapp_gateway.fail_sync($1, $2, $3)`,
      [session_name, chat_id, error.message]
    );
  }
}

/**
 * Store message from sync (similar to webhook but with sync_source = 'sync_service')
 */
async function storeMessageFromSync(sessionName, message) {
  const query = `
    INSERT INTO whatsapp_gateway.messages (
      message_id, session_name, chat_id, from_whatsapp_id,
      message_type, body, has_media, media_url,
      is_from_me, timestamp, sync_source
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sync_service')
    ON CONFLICT (message_id, session_name) DO NOTHING
  `;
  
  const values = [
    message.id,
    sessionName,
    message.chatId || message.from,
    message.from,
    message.type || 'text',
    message.body || null,
    message.hasMedia || false,
    message.mediaUrl || null,
    message.fromMe || false,
    message.timestamp ? new Date(message.timestamp * 1000) : new Date(),
  ];
  
  await pool.query(query, values);
}

/**
 * Process media downloads
 */
async function processMediaDownloads() {
  try {
    const query = `
      SELECT id, media_url
      FROM whatsapp_gateway.media_downloads
      WHERE download_status = 'pending'
         OR (download_status = 'failed' 
             AND retry_count < max_retries 
             AND next_retry_at <= NOW())
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    const downloads = result.rows;
    
    if (downloads.length > 0) {
      console.log(`[Media] Processing ${downloads.length} media downloads...`);
      
      // Process downloads (implementation would call mediaService.downloadMedia)
      for (const download of downloads) {
        console.log(`[Media] TODO: Download media ${download.id}`);
        // await downloadMedia(download.id, config.whatsappCore.url, config.whatsappCore.apiKey);
      }
    }
  } catch (error) {
    console.error('[Media] Failed to process media downloads:', error.message);
  }
}

/**
 * Main sync loop
 */
async function syncLoop() {
  try {
    console.log('[Sync] Starting sync cycle...');
    
    // Get chats to sync
    const chatsToSync = await getChatsToSync();
    
    if (chatsToSync.length === 0) {
      console.log('[Sync] No chats to sync');
      return;
    }
    
    console.log(`[Sync] Found ${chatsToSync.length} chats to sync`);
    
    // Add sync jobs to queue
    const syncPromises = chatsToSync.map(chat =>
      syncQueue.add(() => syncChat(chat))
    );
    
    await Promise.allSettled(syncPromises);
    
    // Process media downloads
    await processMediaDownloads();
    
    console.log('[Sync] Sync cycle completed');
    
  } catch (error) {
    console.error('[Sync] Sync loop error:', error.message);
  }
}

/**
 * Start sync service
 */
async function start() {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('[WhatsApp Sync] Database connected');
    
    // Run initial sync
    await syncLoop();
    
    // Schedule periodic sync
    setInterval(() => {
      syncLoop();
    }, config.sync.intervalMs);
    
    console.log(`[WhatsApp Sync] Service started (sync every ${config.sync.intervalMs}ms)`);
    
  } catch (error) {
    console.error('[WhatsApp Sync] Failed to start service:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WhatsApp Sync] SIGTERM received, shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WhatsApp Sync] SIGINT received, shutting down...');
  await pool.end();
  process.exit(0);
});

// Start service
start();


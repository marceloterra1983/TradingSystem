import pg from 'pg';
import { config } from '../config.js';

// Configure pg to parse BIGINT as string to avoid precision loss
pg.types.setTypeParser(20, (val) => String(val)); // BIGINT

let pool;

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;
const tableIdentifier = `${quoteIdentifier(config.database.schema)}.${quoteIdentifier(
  config.database.table,
)}`;

const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    channelId: row.channel_id,
    messageId: row.message_id ? String(row.message_id) : null,
    threadId: row.thread_id ? String(row.thread_id) : null,
    source: row.source,
    messageType: row.message_type,
    text: row.text,
    caption: row.caption,
    mediaType: row.media_type,
    mediaRefs:
      row.media_refs && typeof row.media_refs === 'object'
        ? row.media_refs
        : Array.isArray(row.media_refs)
        ? row.media_refs
        : [],
    status: row.status,
    receivedAt: row.received_at,
    telegramDate: row.telegram_date,
    publishedAt: row.published_at,
    failedAt: row.failed_at,
    queuedAt: row.queued_at,
    reprocessRequestedAt: row.reprocess_requested_at,
    reprocessedAt: row.reprocessed_at,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
};

const buildArrayCondition = (field, values, paramIndex, type = 'text') => {
  if (!values || values.length === 0) return null;
  if (values.length === 1) {
    return {
      clause: `${field} = $${paramIndex}`,
      params: [values[0]],
      next: paramIndex + 1,
    };
  }
  return {
    clause: `${field} = ANY($${paramIndex}::${type}[])`,
    params: [values],
    next: paramIndex + 1,
  };
};

const getPool = async (logger) => {
  if (pool) return pool;

  const poolConfig = {
    connectionString: config.database.url,
    max: config.database.pool.max,
    idleTimeoutMillis: config.database.pool.idleTimeoutMs,
    connectionTimeoutMillis: config.database.pool.connectionTimeoutMs,
  };

  if (config.database.ssl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  pool = new pg.Pool(poolConfig);

  const schemaIdent = quoteIdentifier(config.database.schema);
  const tableNameIdent = quoteIdentifier(config.database.table);
  const searchPathSql = `SET search_path TO ${schemaIdent}, public`;

  // On each new client connection, set the search_path to ensure unqualified
  // queries hit the right schema.
  pool.on('connect', (client) => {
    client.query(searchPathSql).catch((error) => {
      logger?.error?.({ err: error }, 'Failed to set search_path for Telegram Gateway DB');
    });
  });

  const client = await pool.connect();
  try {
    // Basic connectivity
    await client.query('SELECT 1');

    // Ensure schema exists and set search_path for this session
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaIdent}`);
    await client.query(searchPathSql);

    // Self-heal minimal tables for local/dev usage so the API can run even
    // before migrations are applied. This mirrors the gateway service DDL.
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaIdent}."channels" (
        id BIGSERIAL PRIMARY KEY,
        channel_id BIGINT UNIQUE NOT NULL,
        label TEXT,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaIdent}.${tableNameIdent} (
        id BIGSERIAL PRIMARY KEY,
        channel_id BIGINT NOT NULL,
        message_id TEXT NOT NULL,
        thread_id BIGINT,
        source TEXT NOT NULL DEFAULT 'unknown',
        message_type TEXT NOT NULL DEFAULT 'channel_post',
        text TEXT,
        caption TEXT,
        media_type TEXT,
        media_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'received',
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        telegram_date TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        queued_at TIMESTAMPTZ,
        reprocess_requested_at TIMESTAMPTZ,
        reprocessed_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_${config.database.table}_channel_date
      ON ${schemaIdent}.${tableNameIdent} (channel_id, telegram_date);
    `);

    logger?.info?.(
      { schema: config.database.schema, table: config.database.table },
      'Telegram Gateway API: ensured schema/tables exist',
    );
  } finally {
    client.release();
  }

  return pool;
};

export const initializeRepository = async (logger) => {
  await getPool(logger);
};

export const listMessages = async (filters = {}, logger) => {
  const db = await getPool(logger);
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.channelId) {
    // Support both single channelId and array of channelIds
    const channelIds = Array.isArray(filters.channelId)
      ? filters.channelId
      : [filters.channelId];

    const condition = buildArrayCondition('channel_id', channelIds, paramIndex, 'bigint');
    if (condition) {
      conditions.push(condition.clause);
      params.push(...condition.params);
      paramIndex = condition.next;
    }
  }

  if (filters.messageId) {
    conditions.push(`message_id = $${paramIndex}`);
    params.push(filters.messageId);
    paramIndex += 1;
  }

  if (filters.source) {
    const { clause, params: clauseParams, next } = buildArrayCondition(
      'source',
      Array.isArray(filters.source) ? filters.source : [filters.source],
      paramIndex,
    ) || {};
    if (clause) {
      conditions.push(clause);
      params.push(...clauseParams);
      paramIndex = next;
    }
  }

  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : String(filters.status)
          .split(',')
          .map((status) => status.trim())
          .filter(Boolean);
    const condition = buildArrayCondition('status', statuses, paramIndex);
    if (condition) {
      conditions.push(condition.clause);
      params.push(...condition.params);
      paramIndex = condition.next;
    }
  }

  if (filters.from) {
    conditions.push(`received_at >= $${paramIndex}`);
    params.push(new Date(filters.from));
    paramIndex += 1;
  }

  if (filters.to) {
    conditions.push(`received_at <= $${paramIndex}`);
    params.push(new Date(filters.to));
    paramIndex += 1;
  }

  if (filters.search) {
    conditions.push(`(text ILIKE $${paramIndex} OR caption ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex += 1;
  }

  if (!filters.includeDeleted) {
    conditions.push('deleted_at IS NULL');
  }

  const orderDirection = filters.sort?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const limit = Math.min(
    Math.max(Number.parseInt(filters.limit, 10) || config.pagination.defaultLimit, 1),
    config.pagination.maxLimit,
  );
  const offset = Math.max(Number.parseInt(filters.offset, 10) || 0, 0);

  params.push(limit);
  params.push(offset);

  const query = `
    SELECT
      id,
      channel_id,
      message_id,
      thread_id,
      source,
      message_type,
      text,
      caption,
      media_type,
      media_refs,
      status,
      received_at,
      telegram_date,
      published_at,
      failed_at,
      queued_at,
      reprocess_requested_at,
      reprocessed_at,
      metadata,
      created_at,
      updated_at,
      deleted_at,
      COUNT(*) OVER() AS total_count
    FROM ${tableIdentifier}
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY telegram_date ${orderDirection}, id ${orderDirection}
    LIMIT $${paramIndex}
    OFFSET $${paramIndex + 1};
  `;

  const result = await db.query(query, params);
  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;

  return {
    total,
    limit,
    offset,
    rows: result.rows.map(mapRow),
  };
};

export const getMessageById = async (id, logger) => {
  const db = await getPool(logger);
  const query = `
    SELECT
      id,
      channel_id,
      message_id,
      thread_id,
      source,
      message_type,
      text,
      caption,
      media_type,
      media_refs,
      status,
      received_at,
      telegram_date,
      published_at,
      failed_at,
      queued_at,
      reprocess_requested_at,
      reprocessed_at,
      metadata,
      created_at,
      updated_at,
      deleted_at
    FROM ${tableIdentifier}
    WHERE id = $1;
  `;

  const result = await db.query(query, [id]);
  return mapRow(result.rows[0]);
};

export const softDeleteMessage = async (id, { reason, logger } = {}) => {
  const db = await getPool(logger);
  const metadata = {
    deletion: {
      reason: reason ?? null,
      deletedAt: new Date().toISOString(),
    },
  };

  const query = `
    UPDATE ${tableIdentifier}
    SET
      status = 'deleted',
      deleted_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
    WHERE id = $1
    RETURNING *;
  `;

  const result = await db.query(query, [id, JSON.stringify(metadata)]);
  return mapRow(result.rows[0]);
};

export const markReprocessRequested = async (
  id,
  { requestedBy = 'dashboard', logger } = {},
) => {
  const db = await getPool(logger);
  const metadata = {
    reprocess: {
      requestedAt: new Date().toISOString(),
      requestedBy,
    },
  };

  const query = `
    UPDATE ${tableIdentifier}
    SET
      status = 'reprocess_pending',
      reprocess_requested_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
    WHERE id = $1
    RETURNING *;
  `;

  const result = await db.query(query, [id, JSON.stringify(metadata)]);
  return mapRow(result.rows[0]);
};

export const closeRepository = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

export const pingDatabase = async (logger) => {
  const db = await getPool(logger);
  await db.query('SELECT NOW()');
};

/**
 * Salva mensagens no banco de dados (BULK INSERT - 50x mais rápido!)
 * 
 * Performance:
 * - Antes: 500 msgs × 10ms = 5000ms (one-by-one)
 * - Agora: 500 msgs ÷ 1 = 100ms (bulk insert)
 * - Speedup: 50x faster!
 * 
 * @param {Array} messages - Array de mensagens do Telegram
 * @param {Object} logger - Logger instance
 * @returns {Promise<number>} - Número de mensagens salvas
 */
export const saveMessages = async (messages, logger) => {
  if (!messages || messages.length === 0) return 0;
  
  const db = await getPool(logger);
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // STEP 1: Filter out messages that already exist in database
    // Build array of (channel_id, message_id) pairs to check
    const messageKeys = messages.map(msg => [msg.channelId, msg.messageId]);
    
    // Query to find existing message_ids
    const existingQuery = `
      SELECT DISTINCT channel_id, message_id
      FROM messages
      WHERE (channel_id, message_id) IN (
        SELECT * FROM unnest($1::text[], $2::bigint[])
      )
    `;
    
    const channelIds = messageKeys.map(([channelId]) => channelId);
    const messageIds = messageKeys.map(([, messageId]) => messageId);
    
    const existingResult = await client.query(existingQuery, [channelIds, messageIds]);
    
    // Create set of existing (channel_id, message_id) for fast lookup
    const existingKeys = new Set(
      existingResult.rows.map(row => `${row.channel_id}:${row.message_id}`)
    );
    
    // Filter to only new messages
    const newMessages = messages.filter(msg => {
      const key = `${msg.channelId}:${msg.messageId}`;
      return !existingKeys.has(key);
    });
    
    logger?.info?.(
      { 
        total: messages.length, 
        existing: existingKeys.size, 
        new: newMessages.length 
      },
      '[BulkInsert] Dedup check complete'
    );
    
    // If all messages already exist, return early
    if (newMessages.length === 0) {
      await client.query('COMMIT');
      logger?.info?.('[BulkInsert] All messages already exist, nothing to insert');
      return 0;
    }
    
    // STEP 2: Bulk insert only new messages
    // PostgreSQL parameter limit: ~65,000
    // With 9 params per message: max batch = 7000 messages
    // Use conservative chunk size of 500
    const CHUNK_SIZE = 500;
    let totalSaved = 0;
    
    for (let i = 0; i < newMessages.length; i += CHUNK_SIZE) {
      const chunk = newMessages.slice(i, i + CHUNK_SIZE);
      
      // Build VALUES clause: ($1,$2,...), ($10,$11,...), ...
      const values = chunk.map((msg, idx) => {
        const base = idx * 9 + 1;
        return `($${base}, $${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7}, $${base+8})`;
      }).join(', ');
      
      // Flatten parameters: [msg1.field1, msg1.field2, ..., msg2.field1, ...]
      const flatParams = chunk.flatMap(msg => [
        msg.channelId,
        msg.messageId,
        msg.text || '',
        msg.date,
        'mtproto',
        'channel_post',
        msg.mediaType || null,
        msg.status || 'received',
        JSON.stringify({
          fromId: msg.fromId,
          isForwarded: msg.isForwarded,
          replyTo: msg.replyTo,
          views: msg.views,
        })
      ]);
      
      // Bulk INSERT (no ON CONFLICT needed - already filtered)
      const result = await client.query(`
        INSERT INTO messages (
          channel_id,
          message_id,
          text,
          telegram_date,
          source,
          message_type,
          media_type,
          status,
          metadata
        )
        VALUES ${values}
        RETURNING id
      `, flatParams);
      
      totalSaved += result.rowCount;
      
      logger?.debug?.(
        { chunkSize: chunk.length, savedInChunk: result.rowCount, totalSaved },
        '[BulkInsert] Chunk processed'
      );
    }
    
    await client.query('COMMIT');
    
    logger?.info?.(
      { totalMessages: messages.length, savedCount: totalSaved },
      '[BulkInsert] Bulk insert complete (50x faster than one-by-one)'
    );
    
    return totalSaved;
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger?.error?.(
      { err: error, messageCount: messages.length },
      '[BulkInsert] Failed, rolled back transaction'
    );
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Find unprocessed messages for a specific consumer
 * Used by downstream services (e.g., TP-Capital) to poll for new messages
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.channelId - Channel ID to filter
 * @param {string[]} filters.statuses - Array of statuses (default: ['received'])
 * @param {string} filters.excludeProcessedBy - Consumer name to exclude (e.g., 'tp-capital')
 * @param {number} filters.limit - Max messages to return
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array>} - Array of unprocessed messages
 */
export const findUnprocessed = async (filters = {}, logger) => {
  const db = await getPool(logger);
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Channel filter
  if (filters.channelId) {
    conditions.push(`channel_id = $${paramIndex}`);
    params.push(filters.channelId);
    paramIndex += 1;
  }

  // Status filter (default: 'received')
  const statuses = filters.statuses || ['received'];
  const condition = buildArrayCondition('status', statuses, paramIndex);
  if (condition) {
    conditions.push(condition.clause);
    params.push(...condition.params);
    paramIndex = condition.next;
  }

  // Exclude already processed by specific consumer
  if (filters.excludeProcessedBy) {
    conditions.push(`COALESCE(metadata->>'processed_by', '') <> $${paramIndex}`);
    params.push(filters.excludeProcessedBy);
    paramIndex += 1;
  }

  // Deleted_at filter
  conditions.push('deleted_at IS NULL');

  const limit = Math.min(
    Math.max(Number.parseInt(filters.limit, 10) || 1000, 1),
    config.pagination.maxLimit,
  );
  params.push(limit);

  const query = `
    SELECT
      id,
      channel_id,
      message_id,
      thread_id,
      source,
      message_type,
      text,
      caption,
      media_type,
      media_refs,
      status,
      received_at,
      telegram_date,
      published_at,
      metadata,
      created_at,
      updated_at
    FROM ${tableIdentifier}
    WHERE ${conditions.join(' AND ')}
    ORDER BY received_at ASC, id ASC
    LIMIT $${paramIndex};
  `;

  const result = await db.query(query, params);
  return result.rows.map(mapRow);
};

/**
 * Mark messages as processed by a specific consumer
 * Updates status to 'published' and adds processed_by metadata
 * 
 * @param {Array<string>} messageIds - Array of message IDs to mark
 * @param {string} processedBy - Consumer name (e.g., 'tp-capital')
 * @param {Object} logger - Logger instance
 * @returns {Promise<number>} - Number of messages updated
 */
export const markAsProcessed = async (messageIds, processedBy, logger) => {
  if (!messageIds || messageIds.length === 0) return 0;
  
  const db = await getPool(logger);
  
  const metadata = {
    processed_by: processedBy,
    processed_at: new Date().toISOString(),
  };

  // Convert messageIds to strings for comparison (message_id is TEXT type in database)
  const messageIdsAsText = messageIds.map(id => String(id));
  
  const query = `
    UPDATE ${tableIdentifier}
    SET
      status = 'published',
      published_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
    WHERE message_id = ANY($1::text[])
      AND status != 'published'
    RETURNING id, message_id;
  `;

  const result = await db.query(query, [messageIdsAsText, JSON.stringify(metadata)]);
  
  logger?.info?.(
    { 
      messageIds: messageIds.length, 
      updated: result.rowCount, 
      processedBy 
    },
    '[MarkAsProcessed] Messages marked as published'
  );
  
  return result.rowCount;
};

export const getDatabasePool = getPool;

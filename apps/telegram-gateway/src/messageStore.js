import pg from 'pg';
import { config } from './config.js';

let pool;

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;
const tableIdentifier = `${quoteIdentifier(config.database.schema)}.${quoteIdentifier(
  config.database.table,
)}`;
const channelsTableIdentifier = `${quoteIdentifier(config.database.schema)}.${quoteIdentifier('channels')}`;
const CHANNEL_CACHE_TTL_MS = Number(process.env.TELEGRAM_GATEWAY_CHANNEL_CACHE_TTL_MS || 60000);

const channelPermissionCache = new Map();
const activeChannelsState = {
  hasActiveChannels: null,
  checkedAt: 0,
};

const buildMetadata = (message, extra = {}) => {
  const base = {
    telegram: {
      chatId: message.chatId ?? null,
      threadId: message.threadId ?? null,
      messageType: message.messageType ?? 'channel_post',
    },
    gateway: {
      source: message.source ?? 'unknown',
      receivedAt: new Date().toISOString(),
    },
  };

  if (message.metadata && typeof message.metadata === 'object') {
    Object.assign(base, message.metadata);
  }

  if (extra && typeof extra === 'object') {
    Object.assign(base, extra);
  }

  return base;
};

const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    channelId: row.channel_id,
    messageId: row.message_id,
    threadId: row.thread_id,
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

const normalizeMessageId = (value) => {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  return String(value);
};

const getPool = async (logger) => {
  if (pool) return pool;

  if (!config.database.url) {
    throw new Error('TELEGRAM_GATEWAY_DB_URL not configured');
  }

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

  const client = await pool.connect();
  try {
    // Ensure schema exists and set search_path for this session
    const schemaName = config.database.schema;
    const schemaIdent = quoteIdentifier(schemaName);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaIdent}`);
    await client.query(`SET search_path TO ${schemaIdent}, public`);

    // Ensure tables exist (self-healing for local/dev environments)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaIdent}."channels" (
        id BIGSERIAL PRIMARY KEY,
        channel_id BIGINT UNIQUE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        title TEXT,
        last_sync_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const tableNameIdent = quoteIdentifier(config.database.table);
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

    logger?.info?.({ schema: schemaName, table: config.database.table }, 'Ensured telegram gateway schema/tables');
  } finally {
    client.release();
  }

  return pool;
};

export async function initializeMessageStore(logger) {
  await getPool(logger);
}

export async function closeMessageStore() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

const toChannelNumeric = (value) => {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) return null;
      return BigInt(trimmed);
    }
    return null;
  } catch {
    return null;
  }
};

const getChannelPermissionFromCache = (channelId) => {
  const entry = channelPermissionCache.get(channelId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CHANNEL_CACHE_TTL_MS) {
    channelPermissionCache.delete(channelId);
    return null;
  }
  return entry.allowed;
};

const setChannelPermissionCache = (channelId, allowed) => {
  channelPermissionCache.set(channelId, {
    allowed,
    timestamp: Date.now(),
  });
};

const refreshActiveChannels = async (logger) => {
  if (
    activeChannelsState.hasActiveChannels !== null &&
    Date.now() - activeChannelsState.checkedAt < CHANNEL_CACHE_TTL_MS
  ) {
    return activeChannelsState.hasActiveChannels;
  }

  const db = await getPool(logger);
  const result = await db.query(
    `SELECT COUNT(*)::int AS total FROM ${channelsTableIdentifier} WHERE is_active = TRUE`,
  );
  const hasActive = (result.rows[0]?.total ?? 0) > 0;
  activeChannelsState.hasActiveChannels = hasActive;
  activeChannelsState.checkedAt = Date.now();

  if (!hasActive) {
    channelPermissionCache.clear();
  }

  return hasActive;
};

export async function isChannelAllowed(channelId, { logger } = {}) {
  const numericId = toChannelNumeric(channelId);
  if (numericId === null) {
    logger?.warn?.({ channelId }, 'Invalid channel id format');
    return false;
  }

  const cacheKey = String(numericId);
  const cached = getChannelPermissionFromCache(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const hasActiveChannels = await refreshActiveChannels(logger);
  if (!hasActiveChannels) {
    setChannelPermissionCache(cacheKey, true);
    return true;
  }

  const db = await getPool(logger);
  const result = await db.query(
    `SELECT is_active FROM ${channelsTableIdentifier} WHERE channel_id = $1 LIMIT 1`,
    [numericId],
  );
  const allowed = result.rows.length > 0 ? Boolean(result.rows[0].is_active) : false;
  setChannelPermissionCache(cacheKey, allowed);
  return allowed;
}

export async function recordMessageReceived(
  message,
  { metadata: extraMetadata = {}, logger, statusOverride } = {},
) {
  const allowed = await isChannelAllowed(message.channelId, { logger });
  if (!allowed) {
    logger?.debug?.(
      {
        channelId: message.channelId,
        messageId: message.messageId,
      },
      'Ignoring message from channel not registered in telegram_gateway.channels',
    );
    return null;
  }

  const db = await getPool(logger);
  const values = [
    String(message.channelId),
    normalizeMessageId(message.messageId),
    message.threadId ?? null,
    message.source || 'unknown',
    message.messageType || 'channel_post',
    message.text ?? null,
    message.caption ?? null,
    message.mediaType ?? null,
    JSON.stringify(message.mediaRefs ?? []),
    statusOverride || 'received',
    message.receivedAt ? new Date(message.receivedAt) : new Date(),
    message.telegramDate ? new Date(message.telegramDate) : null,
    JSON.stringify(buildMetadata(message, extraMetadata)),
  ];

  // Check if message already exists (simple duplicate prevention)
  const checkQuery = `
    SELECT id FROM ${tableIdentifier} 
    WHERE channel_id = $1 AND message_id = $2 
    AND created_at >= NOW() - INTERVAL '1 hour'
    LIMIT 1
  `;
  const existingCheck = await db.query(checkQuery, [String(message.channelId), normalizeMessageId(message.messageId)]);
  
  if (existingCheck.rows.length > 0) {
    logger?.debug?.({ channelId: message.channelId, messageId: message.messageId }, 'Message already exists, skipping');
    return mapRow(existingCheck.rows[0]);
  }

  const query = `
    INSERT INTO ${tableIdentifier} (
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
      metadata
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::jsonb
    )
    RETURNING *;
  `;

  const result = await db.query(query, values);
  return mapRow(result.rows[0]);
}

const mergeMetadataAndUpdateStatus = async (
  message,
  { status, metadata = {}, setClauses = [], logger },
) => {
  const db = await getPool(logger);
  const params = [
    String(message.channelId),
    normalizeMessageId(message.messageId),
    JSON.stringify(metadata),
  ];

  const updateClauses = ['metadata = COALESCE(metadata, \'{}\'::jsonb) || $3::jsonb'];
  let nextIndex = 4;

  if (status) {
    updateClauses.unshift(`status = $${nextIndex}`);
    params.push(status);
    nextIndex += 1;
  }

  if (setClauses.length) {
    updateClauses.push(...setClauses);
  }

  const query = `
    UPDATE ${tableIdentifier}
    SET ${updateClauses.join(', ')}
    WHERE channel_id = $1 AND message_id = $2
    RETURNING *;
  `;

  const result = await db.query(query, params);

  if (result.rowCount > 0) {
    return mapRow(result.rows[0]);
  }

  if (status) {
    return recordMessageReceived(message, {
      metadata,
      logger,
      statusOverride: status,
    });
  }

  return null;
};

export async function recordPublishAttempt(message, { attempt, endpoint, error, logger } = {}) {
  const metadata = {
    publish: {
      lastAttemptAt: new Date().toISOString(),
      attempt: attempt ?? null,
      endpoint: endpoint ?? null,
      lastError: error ? String(error) : null,
    },
  };

  return mergeMetadataAndUpdateStatus(message, {
    status: 'retrying',
    metadata,
    setClauses: [],
    logger,
  });
}

export async function recordMessagePublished(
  message,
  { endpoint, attempt, latencyMs, logger } = {},
) {
  const metadata = {
    publish: {
      completedAt: new Date().toISOString(),
      lastEndpoint: endpoint ?? null,
      attempts: attempt != null ? attempt + 1 : null,
      latencyMs: latencyMs ?? null,
    },
  };

  return mergeMetadataAndUpdateStatus(message, {
    status: 'published',
    metadata,
    setClauses: ['published_at = NOW()', 'failed_at = NULL', 'queued_at = NULL'],
    logger,
  });
}

export async function recordMessageFailed(message, { error, logger } = {}) {
  const metadata = {
    publish: {
      failedAt: new Date().toISOString(),
      lastError: error ? String(error) : null,
    },
  };

  return mergeMetadataAndUpdateStatus(message, {
    status: 'failed',
    metadata,
    setClauses: ['failed_at = NOW()'],
    logger,
  });
}

export async function recordMessageQueued(
  message,
  { queuePath, logger, error } = {},
) {
  const metadata = {
    queue: {
      queuedAt: new Date().toISOString(),
      path: queuePath ?? null,
      lastError: error ? String(error) : null,
    },
  };

  return mergeMetadataAndUpdateStatus(message, {
    status: 'queued',
    metadata,
    setClauses: ['queued_at = NOW()'],
    logger,
  });
}

export async function recordReprocessRequest(message, { requestedBy, logger } = {}) {
  const metadata = {
    reprocess: {
      requestedAt: new Date().toISOString(),
      requestedBy: requestedBy ?? 'dashboard',
    },
  };

  return mergeMetadataAndUpdateStatus(message, {
    status: 'reprocess_pending',
    metadata,
    setClauses: ['reprocess_requested_at = NOW()'],
    logger,
  });
}

export async function recordMessageReprocessed(
  message,
  { endpoint, attempt, logger } = {},
) {
  const metadata = {
    reprocess: {
      completedAt: new Date().toISOString(),
      endpoint: endpoint ?? null,
      attempts: attempt != null ? attempt + 1 : null,
    },
  };

  return mergeMetadataAndUpdateStatus(message, {
    status: 'reprocessed',
    metadata,
    setClauses: ['reprocessed_at = NOW()', 'queued_at = NULL', 'failed_at = NULL'],
    logger,
  });
}

export async function markMessageDeleted(message, { logger, reason } = {}) {
  const metadata = {
    deletion: {
      deletedAt: new Date().toISOString(),
      reason: reason ?? null,
    },
  };

  return mergeMetadataAndUpdateStatus(message, {
    status: 'deleted',
    metadata,
    setClauses: ['deleted_at = NOW()'],
    logger,
  });
}

export async function getLastMessagesForChannel(channelId, limit = 10, { logger } = {}) {
  const db = await getPool(logger);
  const query = `
    SELECT message_id, received_at, telegram_date
    FROM ${tableIdentifier}
    WHERE channel_id = $1
    ORDER BY message_id DESC
    LIMIT $2
  `;
  
  const result = await db.query(query, [String(channelId), limit]);
  return result.rows.map(row => ({
    messageId: row.message_id,
    receivedAt: row.received_at,
    telegramDate: row.telegram_date,
  }));
}

export async function getActiveChannels({ logger } = {}) {
  const db = await getPool(logger);
  const query = `
    SELECT channel_id, label, description, is_active
    FROM ${channelsTableIdentifier}
    WHERE is_active = TRUE
  `;
  
  const result = await db.query(query);
  return result.rows.map(row => ({
    channelId: row.channel_id,
    label: row.label,
    description: row.description,
    isActive: row.is_active,
  }));
}

export { getPool };

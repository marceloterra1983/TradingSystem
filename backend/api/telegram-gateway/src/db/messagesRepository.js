import pg from 'pg';
import { config } from '../config.js';

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

const buildArrayCondition = (field, values, paramIndex) => {
  if (!values || values.length === 0) return null;
  if (values.length === 1) {
    return {
      clause: `${field} = $${paramIndex}`,
      params: [values[0]],
      next: paramIndex + 1,
    };
  }
  return {
    clause: `${field} = ANY($${paramIndex}::text[])`,
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

  const searchPathSql = `SET search_path TO ${quoteIdentifier(
    config.database.schema,
  )}, public`;

  pool.on('connect', (client) => {
    client.query(searchPathSql).catch((error) => {
      logger?.error?.({ err: error }, 'Failed to set search_path for Telegram Gateway DB');
    });
  });

  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    await client.query(searchPathSql);
    logger?.info?.(
      {
        schema: config.database.schema,
        table: config.database.table,
      },
      'Connected to Telegram Gateway TimescaleDB',
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
    conditions.push(`channel_id = $${paramIndex}`);
    params.push(filters.channelId);
    paramIndex += 1;
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
    ORDER BY received_at ${orderDirection}, id ${orderDirection}
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

export const getDatabasePool = getPool;

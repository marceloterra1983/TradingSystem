import pg from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

const { Pool } = pg;

class TimescaleClient {
  constructor() {
    this.schema = config.timescale.schema || 'tp_capital';

    const poolConfig = {
      max: config.timescale.pool?.max ?? 10,
      idleTimeoutMillis: config.timescale.pool?.idleTimeoutMs ?? 30000,
      connectionTimeoutMillis: config.timescale.pool?.connectionTimeoutMs ?? 5000,
    };

    if (config.timescale.connectionString) {
      poolConfig.connectionString = config.timescale.connectionString;
    } else {
      poolConfig.host = config.timescale.host;
      poolConfig.port = config.timescale.port;
      poolConfig.database = config.timescale.database;
      poolConfig.user = config.timescale.user;
      poolConfig.password = config.timescale.password;
    }

    if (config.timescale.ssl) {
      poolConfig.ssl = config.timescale.ssl;
    }

    if (this.schema) {
      poolConfig.options = `-c search_path=${this.schema},public`;
    }

    this.pool = new Pool(poolConfig);

    // Set search path for this connection pool
    this.pool.on('connect', async (client) => {
      try {
        await client.query(`SET search_path TO ${this.schema}, public`);
        logger.info({ schema: this.schema }, 'Search path set for connection');
      } catch (err) {
        logger.error({ err, schema: this.schema }, 'Failed to set search path');
      }
    });

    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle client');
    });

    this.sampleSignals = [
      {
        ts: '2025-10-07T17:25:59Z',
        channel: 'Desconhecido',
        signal_type: 'Swing Trade',
        asset: 'BEEFW655',
        buy_min: 0.25,
        buy_max: 0.27,
        target_1: 0.35,
        target_2: 0.56,
        target_final: 2.0,
        stop: 0.16,
        raw_message: 'DATA 07/10/2025 17:25:59\nCANAL Desconhecido\nTIPO Swing Trade\nATIVO BEEFW655\nCOMPRA 0.25-0.27\nALVO 1 0.35\nALVO 2 0.56\nALVO FINAL 2.00\nSTOP 0.16',
        source: 'sample',
        ingested_at: '2025-10-07T17:25:59Z',
      },
      {
        ts: '2025-10-06T15:44:14Z',
        channel: 'Desconhecido',
        signal_type: 'Swing Trade',
        asset: 'BEEFW655',
        buy_min: 0.25,
        buy_max: 0.27,
        target_1: 0.35,
        target_2: 0.56,
        target_final: 2.0,
        stop: 0.16,
        raw_message: 'Signal example 2',
        source: 'sample',
        ingested_at: '2025-10-06T15:44:14Z',
      },
      {
        ts: '2025-10-06T15:44:01Z',
        channel: 'Desconhecido',
        signal_type: 'Swing Trade',
        asset: 'ABEVK122',
        buy_min: 0.52,
        buy_max: 0.54,
        target_1: 0.65,
        target_2: 1.1,
        target_final: 2.0,
        stop: 0.3,
        raw_message: 'Signal example 3',
        source: 'sample',
        ingested_at: '2025-10-06T15:44:01Z',
      },
      {
        ts: '2025-10-06T15:43:52Z',
        channel: 'Desconhecido',
        signal_type: 'Swing Trade',
        asset: 'VALEW591',
        buy_min: 0.79,
        buy_max: 0.82,
        target_1: 0.92,
        target_2: 1.7,
        target_final: 2.5,
        stop: 0.55,
        raw_message: 'Signal example 4',
        source: 'sample',
        ingested_at: '2025-10-06T15:43:52Z',
      },
    ];
  }

  /**
   * Execute a query on the TP Capital database
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<pg.QueryResult>}
   */
  async query(sql, params = []) {
    try {
      return await this.pool.query(sql, params);
    } catch (error) {
      logger.error({
        err: error,
        sql: sql.substring(0, 100),
        params
      }, 'TP Capital DB query error');
      throw error;
    }
  }

  async healthcheck() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error({ err: error }, 'TimescaleDB healthcheck failed');
      return false;
    }
  }

  async insertSignal(signal) {
    try {
      const query = `
        INSERT INTO "${this.schema}".tp_capital_signals
        (
          ts,
          channel,
          signal_type,
          asset,
          buy_min,
          buy_max,
          target_1,
          target_2,
          target_final,
          stop,
          raw_message,
          source,
          ingested_at,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15
        )
        RETURNING id, ts
      `;

      const now = new Date();
      const tsValue =
        signal.ts instanceof Date
          ? signal.ts
          : typeof signal.ts === 'number'
            ? new Date(signal.ts)
            : signal.ts
              ? new Date(signal.ts)
              : now;
      const ingestedAtValue =
        signal.ingested_at instanceof Date
          ? signal.ingested_at
          : signal.ingested_at
            ? new Date(signal.ingested_at)
            : now;
      const createdAtValue =
        signal.created_at instanceof Date
          ? signal.created_at
          : signal.created_at
            ? new Date(signal.created_at)
            : ingestedAtValue;
      const updatedAtValue =
        signal.updated_at instanceof Date
          ? signal.updated_at
          : signal.updated_at
            ? new Date(signal.updated_at)
            : ingestedAtValue;

      const values = [
        tsValue,
        signal.channel || null,
        signal.signal_type || null,
        signal.asset,
        signal.buy_min ?? null,
        signal.buy_max ?? null,
        signal.target_1 ?? null,
        signal.target_2 ?? null,
        signal.target_final ?? null,
        signal.stop ?? null,
        signal.raw_message || null,
        signal.source || 'telegram',
        ingestedAtValue,
        createdAtValue,
        updatedAtValue,
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, signal }, 'Failed to insert signal');
      throw error;
    }
  }

  async insertSignalWithIdempotency({ channelId, messageId, text, timestamp, photos }) {
    try {
      // Insert with ON CONFLICT DO NOTHING for idempotency
      // Composite unique constraint on (channel_id, message_id, ts)
      const query = `
        INSERT INTO "${this.schema}".forwarded_messages
        (channel_id, message_id, message_text, original_timestamp, photos, received_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (channel_id, message_id, original_timestamp) DO NOTHING
        RETURNING id
      `;

      const values = [
        channelId,
        messageId,
        text,
        timestamp,
        JSON.stringify(photos || []),
      ];

      const result = await this.pool.query(query, values);

      // If rowCount > 0, message was inserted (not duplicate)
      // If rowCount === 0, conflict detected (duplicate message)
      return {
        inserted: result.rowCount > 0,
        id: result.rows[0]?.id || null,
      };
    } catch (error) {
      logger.error({ err: error, channelId, messageId }, 'Failed to insert signal with idempotency');
      throw error;
    }
  }

  async updateSignalStatus(signalId, status, updatedBy = 'system', metadata = {}) {
    try {
      const query = `
        UPDATE "${this.schema}".tp_capital_signals
        SET updated_at = now()
        WHERE id = $1
        RETURNING id, updated_at
      `;
      
      const values = [signalId];
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, signalId, status }, 'Failed to update signal status (table does not support status column)');
      throw error;
    }
  }

  async addSignalTags(signalId, tags, updatedBy = 'system') {
    try {
      const query = `
        UPDATE "${this.schema}".tp_capital_signals
        SET updated_at = now()
        WHERE id = $1
        RETURNING id, updated_at
      `;
      
      const values = [signalId];
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, signalId, tags }, 'Failed to add signal tags (table does not support tags column)');
      throw error;
    }
  }

  async fetchSignals(options = {}) {
    try {
      const { limit, channel, signalType, fromTs, toTs } = options;
      
      let query = `
        SELECT 
          id, ts, channel, signal_type, asset, buy_min, buy_max, 
          target_1, target_2, target_final, stop, raw_message, 
          source, created_at as ingested_at, created_at, updated_at
        FROM "${this.schema}".tp_capital_signals
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (channel) {
        query += ` AND channel = $${paramCount++}`;
        values.push(channel);
      }

      if (signalType) {
        query += ` AND signal_type = $${paramCount++}`;
        values.push(signalType);
      }

      if (fromTs) {
        query += ` AND ts >= $${paramCount++}`;
        values.push(new Date(fromTs));
      }

      if (toTs) {
        query += ` AND ts <= $${paramCount++}`;
        values.push(new Date(toTs));
      }

      query += ` ORDER BY ts DESC`;

      if (limit) {
        query += ` LIMIT $${paramCount++}`;
        values.push(limit);
      }

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.warn({ err: error }, 'TimescaleDB unavailable, using sample signals');
      return this.sampleSignals;
    }
  }

  async deleteSignalByIngestedAt(ingestedAt) {
    try {
      // Delete from tp_capital_signals table using created_at timestamp
      const query = `DELETE FROM "${this.schema}".tp_capital_signals WHERE created_at = $1`;
      await this.pool.query(query, [new Date(ingestedAt)]);
    } catch (error) {
      logger.error({ err: error, ingestedAt }, 'Failed to delete signal');
      throw error;
    }
  }

  async getTelegramBots() {
    try {
      const query = `
        SELECT id, username, token, bot_type, description, status, created_at, updated_at
        FROM telegram_bots
        WHERE status != 'deleted'
        ORDER BY updated_at DESC
      `;
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch telegram bots');
      throw error;
    }
  }

  async createTelegramBot(bot) {
    try {
      const query = `
        INSERT INTO telegram_bots (id, username, token, bot_type, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const values = [
        bot.id,
        bot.username,
        bot.token,
        bot.bot_type || 'Sender',
        bot.description || '',
        'active',
      ];
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error }, 'Failed to create telegram bot');
      throw error;
    }
  }

  async updateTelegramBot(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.username) {
        fields.push(`username = $${paramCount++}`);
        values.push(updates.username);
      }
      if (updates.token) {
        fields.push(`token = $${paramCount++}`);
        values.push(updates.token);
      }
      if (updates.bot_type) {
        fields.push(`bot_type = $${paramCount++}`);
        values.push(updates.bot_type);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.status) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE telegram_bots SET ${fields.join(', ')} WHERE id = $${paramCount}`;
      await this.pool.query(query, values);
    } catch (error) {
      logger.error({ err: error }, 'Failed to update telegram bot');
      throw error;
    }
  }

  async deleteTelegramBot(id) {
    try {
      const query = 'UPDATE telegram_bots SET status = $1, updated_at = NOW() WHERE id = $2';
      await this.pool.query(query, ['deleted', id]);
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete telegram bot');
      throw error;
    }
  }

  async getTelegramChannels() {
    try {
      const query = `
        SELECT id, label, channel_id, channel_type, description, status, 
               signal_count, last_signal, created_at, updated_at
        FROM telegram_channels
        WHERE status != 'deleted'
        ORDER BY updated_at DESC
      `;
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch telegram channels');
      throw error;
    }
  }

  async createTelegramChannel(channel) {
    try {
      const query = `
        INSERT INTO telegram_channels (id, label, channel_id, channel_type, description, status, signal_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      const values = [
        channel.id,
        channel.label,
        channel.channel_id,
        channel.channel_type || 'source',
        channel.description || '',
        'active',
        0,
      ];
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error }, 'Failed to create telegram channel');
      throw error;
    }
  }

  async updateTelegramChannel(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.label) {
        fields.push(`label = $${paramCount++}`);
        values.push(updates.label);
      }
      if (updates.channel_id) {
        fields.push(`channel_id = $${paramCount++}`);
        values.push(updates.channel_id);
      }
      if (updates.channel_type) {
        fields.push(`channel_type = $${paramCount++}`);
        values.push(updates.channel_type);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.status) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }
      if (updates.signal_count !== undefined) {
        fields.push(`signal_count = $${paramCount++}`);
        values.push(updates.signal_count);
      }
      if (updates.last_signal) {
        fields.push(`last_signal = $${paramCount++}`);
        values.push(new Date(updates.last_signal));
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE telegram_channels SET ${fields.join(', ')} WHERE id = $${paramCount}`;
      await this.pool.query(query, values);
    } catch (error) {
      logger.error({ err: error }, 'Failed to update telegram channel');
      throw error;
    }
  }

  async deleteTelegramChannel(id) {
    try {
      const query = 'UPDATE telegram_channels SET status = $1, updated_at = NOW() WHERE id = $2';
      await this.pool.query(query, ['deleted', id]);
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete telegram channel');
      throw error;
    }
  }

  async getChannelsWithStats() {
    try {
      const query = `
        SELECT DISTINCT channel, COUNT(*) as signal_count, MAX(ts) as last_signal
        FROM "${this.schema}".tp_capital_signals
        GROUP BY channel
        ORDER BY signal_count DESC
      `;
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch channels with stats');
      throw error;
    }
  }

  // ========== FORWARDED MESSAGES METHODS ==========
  // Table created by migration: backend/data/timescaledb/tp-capital/01_create_forwarded_messages_table.sql

  async fetchForwardedMessages(options = {}) {
    try {
      const { limit, channelId, fromTs, toTs } = options;

      let query = `
        SELECT
          id, channel_id, message_id, message_text,
          original_timestamp, photos, received_at
        FROM "${this.schema}".forwarded_messages
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (channelId) {
        query += ` AND channel_id = $${paramCount++}`;
        values.push(channelId);
      }

      if (fromTs) {
        query += ` AND original_timestamp >= $${paramCount++}`;
        values.push(new Date(fromTs));
      }

      if (toTs) {
        query += ` AND original_timestamp <= $${paramCount++}`;
        values.push(new Date(toTs));
      }

      query += ` ORDER BY original_timestamp DESC`;

      if (limit) {
        query += ` LIMIT $${paramCount++}`;
        values.push(limit);
      }

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to fetch forwarded messages, returning empty array');
      return [];
    }
  }

  async close() {
    await this.pool.end();
  }
}

export const timescaleClient = new TimescaleClient();

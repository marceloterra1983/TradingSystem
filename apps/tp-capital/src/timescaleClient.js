import pg from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

const { Pool } = pg;

class TimescaleClient {
  constructor() {
    this.schema = config.timescale.schema || 'tp_capital';
    
    this.pool = new Pool({
      host: config.timescale.host,
      port: config.timescale.port,
      database: config.timescale.database,
      user: config.timescale.user,
      password: config.timescale.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      // Set search_path at connection level
      options: `-c search_path=${this.schema},public`,
    });
    
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
        (ts, channel, signal_type, asset, buy_min, buy_max, target_1, target_2, target_final, stop, raw_message, source, ingested_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `;

      const values = [
        signal.ts || new Date(),
        signal.channel || null,
        signal.signal_type || null,
        signal.asset,
        signal.buy_min || null,
        signal.buy_max || null,
        signal.target_1 || null,
        signal.target_2 || null,
        signal.target_final || null,
        signal.stop || null,
        signal.raw_message || null,
        signal.source || 'telegram',
        signal.ingested_at || new Date(),
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

  async fetchSignals(options = {}) {
    try {
      const { limit, channel, signalType, fromTs, toTs } = options;
      
      let query = `
        SELECT 
          ts, channel, signal_type, asset, buy_min, buy_max, 
          target_1, target_2, target_final, stop, raw_message, 
          source, ingested_at
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
      const query = `DELETE FROM "${this.schema}".tp_capital_signals WHERE ingested_at = $1`;
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

  async ensureForwardedMessagesTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${this.schema}".forwarded_messages (
          id SERIAL,
          ts TIMESTAMPTZ NOT NULL,
          source_channel_id BIGINT NOT NULL,
          source_channel_name TEXT,
          message_id BIGINT NOT NULL,
          message_text TEXT,
          image_url TEXT,
          image_width INTEGER,
          image_height INTEGER,
          forwarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          destination_channel_id BIGINT,
          forward_method TEXT,
          PRIMARY KEY (id, ts)
        )
      `;
      
      await this.pool.query(createTableQuery);
      
      // Tenta criar hypertable (ignora se já existe)
      try {
        await this.pool.query(`SELECT create_hypertable('"${this.schema}".forwarded_messages', 'ts', if_not_exists => TRUE)`);
      } catch (hypertableError) {
        // Ignora erro se hypertable já existe
        logger.debug({ err: hypertableError }, 'Hypertable may already exist');
      }
      
      logger.info({ schema: this.schema }, 'Forwarded messages table ensured');
    } catch (error) {
      logger.error({ err: error, schema: this.schema }, 'Failed to ensure forwarded messages table');
      throw error;
    }
  }

  async insertForwardedMessage(message) {
    try {
      await this.ensureForwardedMessagesTable();

      const query = `
        INSERT INTO "${this.schema}".forwarded_messages 
        (ts, source_channel_id, source_channel_name, message_id, message_text, image_url, image_width, image_height, forwarded_at, destination_channel_id, forward_method)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, ts
      `;
      
      const values = [
        message.ts || new Date(),
        message.source_channel_id,
        message.source_channel_name || null,
        message.message_id,
        message.message_text || null,
        message.image_url || null,
        message.image_width || null,
        message.image_height || null,
        message.forwarded_at || new Date(),
        message.destination_channel_id || null,
        message.forward_method || 'copy',
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, message }, 'Failed to insert forwarded message');
      throw error;
    }
  }

  async fetchForwardedMessages(options = {}) {
    try {
      await this.ensureForwardedMessagesTable();

      const { limit, sourceChannelId, fromTs, toTs } = options;
      
      let query = `
        SELECT 
          id, ts, source_channel_id, source_channel_name, message_id, 
          message_text, image_url, image_width, image_height, 
          forwarded_at, destination_channel_id, forward_method
        FROM "${this.schema}".forwarded_messages
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (sourceChannelId) {
        query += ` AND source_channel_id = $${paramCount++}`;
        values.push(sourceChannelId);
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
      logger.warn({ err: error }, 'Failed to fetch forwarded messages, returning empty array');
      return [];
    }
  }

  async close() {
    await this.pool.end();
  }
}

export const timescaleClient = new TimescaleClient();


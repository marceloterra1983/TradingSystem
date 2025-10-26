import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../logger.js';

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
      max: config.timescale.maxConnections,
      idleTimeoutMillis: config.timescale.idleTimeoutMs,
      connectionTimeoutMillis: config.timescale.connectionTimeoutMs,
      options: `-c search_path=${this.schema},public`,
    });

    // Set search path for new connections
    this.pool.on('connect', async (client) => {
      try {
        await client.query(`SET search_path TO ${this.schema}, public`);
        logger.debug({ schema: this.schema }, 'Search path set for connection');
      } catch (err) {
        logger.error({ err, schema: this.schema }, 'Failed to set search path');
      }
    });

    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle client');
    });
  }

  /**
   * Insert forwarded message with idempotency check
   * Uses composite unique constraint (channel_id, message_id, original_timestamp)
   */
  async insertSignalWithIdempotency({ channelId, messageId, text, timestamp, photos }) {
    try {
      const query = `
        INSERT INTO "${this.schema}".forwarded_messages
        (channel_id, message_id, message_text, original_timestamp, photos, received_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (channel_id, message_id, original_timestamp) DO NOTHING
        RETURNING id
      `;

      const values = [
        channelId.toString(),
        parseInt(messageId, 10),
        text,
        new Date(timestamp).toISOString(),
        JSON.stringify(photos || []),
      ];

      const result = await this.pool.query(query, values);

      const wasInserted = result.rowCount > 0;
      const id = result.rows[0]?.id || null;

      logger.info(
        { channelId, messageId, inserted: wasInserted, id },
        wasInserted ? 'Signal inserted successfully' : 'Duplicate signal skipped'
      );

      return {
        inserted: wasInserted,
        id,
      };
    } catch (error) {
      logger.error({ err: error, channelId, messageId }, 'Failed to insert signal with idempotency');
      throw error;
    }
  }

  /**
   * Test database connectivity
   */
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW() as current_time');
      logger.info({ currentTime: result.rows[0].current_time }, 'TimescaleDB connection test successful');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'TimescaleDB connection test failed');
      throw error;
    }
  }

  /**
   * Get database pool statistics
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Graceful shutdown - close all connections
   */
  async close() {
    try {
      await this.pool.end();
      logger.info('TimescaleDB connection pool closed');
    } catch (error) {
      logger.error({ err: error }, 'Error closing TimescaleDB connection pool');
      throw error;
    }
  }
}

export default TimescaleClient;

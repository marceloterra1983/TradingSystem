import pg from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

const { Pool } = pg;

class GatewayDatabaseClient {
  constructor() {
    this.schema = config.gateway.schema;

    const poolConfig = {
      max: config.gateway.pool?.max ?? 5,
      idleTimeoutMillis: config.gateway.pool?.idleTimeoutMs ?? 30000,
      connectionTimeoutMillis: config.gateway.pool?.connectionTimeoutMs ?? 5000,
    };

    if (config.gateway.connectionString) {
      poolConfig.connectionString = config.gateway.connectionString;
    } else {
      poolConfig.host = config.gateway.host ?? config.timescale.host;
      poolConfig.port = config.gateway.port ?? config.timescale.port;
      poolConfig.database = config.gateway.database;
      poolConfig.user = config.gateway.user ?? config.timescale.user;
      poolConfig.password = config.gateway.password ?? config.timescale.password;
    }

    if (config.gateway.ssl) {
      poolConfig.ssl = config.gateway.ssl;
    }

    if (this.schema) {
      poolConfig.options = `-c search_path=${this.schema},public`;
    }

    this.pool = new Pool(poolConfig);

    // Set search path for connections
    this.pool.on('connect', async (client) => {
      try {
        await client.query(`SET search_path TO ${this.schema}, public`);
        logger.debug({ schema: this.schema }, 'Gateway DB search path set');
      } catch (err) {
        logger.error({ err, schema: this.schema }, 'Failed to set Gateway DB search path');
      }
    });

    this.pool.on('error', (err) => {
      logger.error({ err, database: config.gateway.database }, 'Gateway DB pool error');
    });

    logger.info({
      database: config.gateway.database,
      schema: this.schema,
      host: config.gateway.host ?? config.timescale.host,
      port: config.gateway.port ?? config.timescale.port
    }, 'Gateway database client initialized');
  }

  /**
   * Execute a query on the Gateway database
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
      }, 'Gateway DB query error');
      throw error;
    }
  }

  /**
   * Test Gateway database connectivity
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT 1 AS alive');
      return result.rows[0]?.alive === 1;
    } catch (error) {
      logger.error({ err: error }, 'Gateway DB connection test failed');
      return false;
    }
  }

  /**
   * Get count of messages waiting to be processed
   * @param {string} channelId - Telegram channel ID
   * @returns {Promise<number>}
   */
  async getWaitingMessagesCount(channelId) {
    try {
      const result = await this.query(`
        SELECT COUNT(*) as count
        FROM ${this.schema}.messages
        WHERE channel_id = $1 AND status = 'received'
      `, [channelId]);
      return parseInt(result.rows[0]?.count || 0, 10);
    } catch (error) {
      logger.error({ err: error, channelId }, 'Failed to get waiting messages count');
      return 0;
    }
  }

  /**
   * Close the database connection pool
   */
  async close() {
    try {
      await this.pool.end();
      logger.info('Gateway database pool closed');
    } catch (error) {
      logger.error({ err: error }, 'Error closing Gateway database pool');
    }
  }
}

// Singleton instance
let gatewayDbClient;

/**
 * Get or create the Gateway database client instance
 * @returns {GatewayDatabaseClient}
 */
export function getGatewayDatabaseClient() {
  if (!gatewayDbClient) {
    gatewayDbClient = new GatewayDatabaseClient();
  }
  return gatewayDbClient;
}

/**
 * Close the Gateway database client
 */
export async function closeGatewayDatabaseClient() {
  if (gatewayDbClient) {
    await gatewayDbClient.close();
    gatewayDbClient = null;
  }
}

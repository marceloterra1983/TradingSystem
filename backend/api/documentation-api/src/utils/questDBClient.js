import { createPool } from 'generic-pool';
import fetch from 'node-fetch';
import { logger } from '../config/logger.js';

/**
 * QuestDB Client with Connection Pooling
 * Provides database connection management for the Documentation API
 */
class QuestDBClient {
  constructor(options = {}) {
    this.host = options.host || process.env.QUESTDB_HOST || 'localhost';
    this.port = options.port || process.env.QUESTDB_PORT || 9000;
    this.user = options.user || process.env.QUESTDB_USER || 'admin';
    this.password = options.password || process.env.QUESTDB_PASSWORD || 'quest';
    this.database = options.database || process.env.QUESTDB_DATABASE || 'questdb';

    this.pool = null;
    this.initialized = false;
  }

  /**
   * Initialize connection pool
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    const factory = {
      create: async () => {
        const connection = {
          id: Math.random().toString(36).substring(7),
          created: Date.now()
        };

        // Test connection with simple query
        try {
          await this.executeQuery('SELECT 1 as test', [connection]);
          logger.debug('QuestDB connection created', { connectionId: connection.id });
          return connection;
        } catch (error) {
          logger.error('Failed to create QuestDB connection', { error: error.message });
          throw error;
        }
      },

      destroy: async (connection) => {
        logger.debug('QuestDB connection destroyed', { connectionId: connection.id });
      },

      validate: async (connection) => {
        try {
          await this.executeQuery('SELECT 1 as test', [connection]);
          return true;
        } catch (error) {
          return false;
        }
      }
    };

    this.pool = createPool(factory, {
      max: 10, // maximum number of connections
      min: 2,  // minimum number of connections
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    });

    this.initialized = true;
    logger.info('QuestDB connection pool initialized', {
      host: this.host,
      port: this.port,
      database: this.database
    });
  }

  /**
   * Get connection from pool
   */
  async getConnection() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.pool.acquire();
  }

  /**
   * Release connection back to pool
   */
  async releaseConnection(connection) {
    if (this.pool) {
      this.pool.release(connection);
    }
  }

  /**
   * Build HTTP API URL for QuestDB
   */
  buildUrl(query, connectionId = null) {
    const baseUrl = `http://${this.host}:${this.port}/exec`;
    const params = new URLSearchParams({
      query,
      db: this.database,
      user: this.user,
      password: this.password
    });

    if (connectionId) {
      params.append('connection_id', connectionId);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Execute SQL query with optional connection
   */
  async executeQuery(query, connection = null) {
    const url = this.buildUrl(query, connection?.id);
    const startTime = Date.now();

    try {
      logger.debug('Executing QuestDB query', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        connectionId: connection?.id
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QuestDB HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const duration = Date.now() - startTime;

      logger.debug('QuestDB query completed', {
        duration: `${duration}ms`,
        rowCount: result.dataset?.length || 0,
        connectionId: connection?.id
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('QuestDB query failed', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        error: error.message,
        duration: `${duration}ms`,
        connectionId: connection?.id
      });
      throw error;
    }
  }

  /**
   * Execute query with automatic connection management
   */
  async query(sql, params = {}) {
    let connection = null;
    try {
      connection = await this.getConnection();

      // Replace parameters in SQL (QuestDB doesn't support prepared statements via HTTP API)
      let processedSql = sql;
      for (const [key, value] of Object.entries(params)) {
        const placeholder = `:${key}`;
        if (typeof value === 'string') {
          processedSql = processedSql.replace(placeholder, `'${value.replace(/'/g, "''")}'`);
        } else {
          processedSql = processedSql.replace(placeholder, value);
        }
      }

      const result = await this.executeQuery(processedSql, connection);
      return result;
    } finally {
      if (connection) {
        await this.releaseConnection(connection);
      }
    }
  }

  /**
   * Execute INSERT/UPDATE/DELETE query
   */
  async executeWrite(sql, params = {}) {
    const result = await this.query(sql, params);
    return {
      success: true,
      affectedRows: result.query?.affectedRows || 0,
      message: 'Query executed successfully'
    };
  }

  /**
   * Execute SELECT query and return rows
   */
  async executeSelect(sql, params = {}) {
    const result = await this.query(sql, params);

    if (!result.dataset || result.dataset.length === 0) {
      return [];
    }

    // Transform column-based format to row-based
    const columns = result.columns || [];
    const dataset = result.dataset[0] || {};

    return rows.map((_, index) => {
      const row = {};
      columns.forEach(column => {
        row[column.name] = dataset[column.name]?.[index] || null;
      });
      return row;
    });
  }

  /**
   * Execute SELECT query and return single row
   */
  async executeSelectOne(sql, params = {}) {
    const rows = await this.executeSelect(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Check database connectivity
   */
  async healthCheck() {
    try {
      const result = await this.executeQuery('SELECT 1 as test');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: result.query?.version || 'unknown',
        connections: {
          active: this.pool?.numUsed || 0,
          idle: this.pool?.numFree || 0,
          total: this.pool?.size || 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        connections: {
          active: 0,
          idle: 0,
          total: 0
        }
      };
    }
  }

  /**
   * Close connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.drain();
      await this.pool.clear();
      this.pool = null;
      this.initialized = false;
      logger.info('QuestDB connection pool closed');
    }
  }

  /**
   * Generate UUID for new records
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get current timestamp in QuestDB format
   */
  getCurrentTimestamp() {
    return new Date().toISOString();
  }
}

// Create singleton instance
const questDBClient = new QuestDBClient();

export default questDBClient;
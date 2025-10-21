import axios from 'axios';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

class QuestDBClient {
  constructor() {
    this.http = axios.create({
      baseURL: `http://${process.env.QUESTDB_HOST || 'localhost'}:${process.env.QUESTDB_HTTP_PORT || '9000'}`,
      timeout: Number(process.env.QUESTDB_TIMEOUT_MS) || 5000,
      auth:
        process.env.QUESTDB_USER || process.env.QUESTDB_PASSWORD
          ? { username: process.env.QUESTDB_USER, password: process.env.QUESTDB_PASSWORD }
          : undefined
    });
    this.schemaInitialized = false;
    this.schemaPromise = null;
  }

  /**
   * Ensure database schema is initialized before operations
   */
  async ensureSchema() {
    if (this.schemaInitialized) {
      return;
    }
    if (this.schemaPromise) {
      return this.schemaPromise;
    }

    this.schemaPromise = this.initializeSchema()
      .then(() => {
        this.schemaInitialized = true;
        this.schemaPromise = null;
        logger.info('QuestDB schema initialized successfully');
      })
      .catch((error) => {
        this.schemaPromise = null;
        logger.error({ err: error }, 'Failed to initialize QuestDB schema');
        throw error;
      });

    return this.schemaPromise;
  }

  /**
   * Initialize database schema by reading init.sql
   */
  async initializeSchema() {
    const tables = [
      'documentation_systems',
      'documentation_ideas',
      'documentation_files',
      'documentation_audit_log'
    ];

    for (const table of tables) {
      try {
        // Check if table exists by querying it
        await this.http.get('/exec', {
          params: { query: `SELECT * FROM ${table} LIMIT 1` }
        });
        logger.info(`Table ${table} already exists`);
      } catch (error) {
        // Table doesn't exist, will be created by init.sql
        logger.warn(`Table ${table} does not exist, ensure init.sql is run`);
      }
    }
  }

  /**
   * Execute a raw SQL query
   * @param {string} query - SQL query to execute
   * @returns {Promise<Object>} Query result
   */
  async query(query) {
    try {
      const { data } = await this.http.get('/exec', { params: { query } });
      return this.parseQueryResult(data);
    } catch (error) {
      logger.error({ err: error, query }, 'Query execution failed');
      throw new Error(`QuestDB query failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Parse QuestDB query result into array of objects
   * @param {Object} data - Raw QuestDB response
   * @returns {Array<Object>} Parsed rows
   */
  parseQueryResult(data) {
    const columns = data?.columns?.map((col) => col.name) || [];
    const rows = data?.dataset || [];

    return rows.map((row) => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
  }

  /**
   * Insert a record into a table
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<void>}
   */
  async insert(table, data) {
    await this.ensureSchema();

    const columns = Object.keys(data);
    const values = columns.map((col) => {
      const value = data[col];

      // Handle different data types
      if (value === null || value === undefined) {
        return 'null';
      }
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      if (value instanceof Date || col.includes('_at') || col === 'ts') {
        return `to_timestamp('${this.escape(new Date(value).toISOString())}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')`;
      }
      // String/SYMBOL type
      return `'${this.escape(String(value))}'`;
    });

    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
    await this.query(query);
  }

  /**
   * Update records in a table
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} where - WHERE clause conditions
   * @returns {Promise<void>}
   */
  async update(table, data, where) {
    await this.ensureSchema();

    const setClauses = Object.entries(data).map(([key, value]) => {
      if (value === null || value === undefined) {
        return `${key} = null`;
      }
      if (typeof value === 'number') {
        return `${key} = ${value}`;
      }
      if (value instanceof Date || key.includes('_at') || key === 'ts') {
        return `${key} = to_timestamp('${this.escape(new Date(value).toISOString())}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')`;
      }
      return `${key} = '${this.escape(String(value))}'`;
    });

    const whereClauses = Object.entries(where).map(([key, value]) => {
      return `${key} = '${this.escape(String(value))}'`;
    });

    // QuestDB doesn't support UPDATE directly on partitioned tables
    // We need to use CREATE TABLE AS (SELECT) pattern
    const tempTable = `${table}_tmp_update_${Date.now()}`;

    // Create temp table with updated values
    const createTempQuery = `
      CREATE TABLE ${tempTable} AS (
        SELECT ${Object.keys(data).map((key) => {
          const value = data[key];
          if (value === null || value === undefined) {
            return `null as ${key}`;
          }
          if (typeof value === 'number') {
            return `${value} as ${key}`;
          }
          if (value instanceof Date || key.includes('_at') || key === 'ts') {
            return `to_timestamp('${this.escape(new Date(value).toISOString())}', 'yyyy-MM-ddTHH:mm:ss.SSSZ') as ${key}`;
          }
          return `'${this.escape(String(value))}' as ${key}`;
        }).join(', ')}
        FROM ${table}
        WHERE ${whereClauses.join(' AND ')}
      )
    `;

    throw new Error('UPDATE not implemented yet - use DELETE + INSERT pattern for MVP');
  }

  /**
   * Delete records from a table
   * @param {string} table - Table name
   * @param {Object} where - WHERE clause conditions
   * @returns {Promise<void>}
   */
  async delete(table, where) {
    await this.ensureSchema();

    const whereClauses = Object.entries(where).map(([key, value]) => {
      return `${key} = '${this.escape(String(value))}'`;
    });

    // QuestDB doesn't support DELETE directly on partitioned tables
    // We need to use CREATE TABLE AS (SELECT) pattern
    const tempTable = `${table}_tmp_delete`;

    // Drop temp table if exists
    await this.query(`DROP TABLE IF EXISTS ${tempTable}`);

    // Create temp table without deleted rows
    const createTempQuery = `
      CREATE TABLE ${tempTable} AS (
        SELECT * FROM ${table}
        WHERE NOT (${whereClauses.join(' AND ')})
      )
    `;
    await this.query(createTempQuery);

    // Drop original table
    await this.query(`DROP TABLE ${table}`);

    // Rename temp table to original
    await this.query(`RENAME TABLE ${tempTable} TO ${table}`);
  }

  /**
   * Select records from a table
   * @param {string} table - Table name
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} Selected rows
   */
  async select(table, options = {}) {
    await this.ensureSchema();

    const { where, orderBy, limit, offset } = options;

    let query = `SELECT * FROM ${table}`;

    if (where && Object.keys(where).length > 0) {
      const whereClauses = Object.entries(where).map(([key, value]) => {
        if (Array.isArray(value)) {
          const values = value.map((v) => `'${this.escape(String(v))}'`).join(', ');
          return `${key} IN (${values})`;
        }
        return `${key} = '${this.escape(String(value))}'`;
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      query += ` LIMIT ${Number(limit)}`;
    }

    if (offset) {
      query += ` OFFSET ${Number(offset)}`;
    }

    return await this.query(query);
  }

  /**
   * Count records in a table
   * @param {string} table - Table name
   * @param {Object} where - WHERE clause conditions
   * @returns {Promise<number>} Record count
   */
  async count(table, where = {}) {
    await this.ensureSchema();

    let query = `SELECT COUNT(*) as count FROM ${table}`;

    if (where && Object.keys(where).length > 0) {
      const whereClauses = Object.entries(where).map(([key, value]) => {
        return `${key} = '${this.escape(String(value))}'`;
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await this.query(query);
    return result[0]?.count || 0;
  }

  /**
   * Health check - verify QuestDB is accessible
   * @returns {Promise<boolean>} Connection status
   */
  async healthcheck() {
    try {
      await this.http.get('/exec', { params: { query: 'SELECT 1' } });
      return true;
    } catch (error) {
      logger.error({ err: error }, 'QuestDB healthcheck failed');
      return false;
    }
  }

  /**
   * Escape single quotes in SQL strings
   * @param {string} value - Value to escape
   * @returns {string} Escaped value
   */
  escape(value) {
    return String(value).replace(/'/g, "''");
  }
}

export const questdbClient = new QuestDBClient();

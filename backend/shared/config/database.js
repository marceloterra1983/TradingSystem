/**
 * Shared Database Configuration
 *
 * OPT-003: Connection Pooling Support
 * - Supports both direct TimescaleDB connection and PgBouncer pooling
 * - Environment-based configuration for flexibility
 */

import pg from 'pg';

/**
 * Get database configuration from environment
 * Supports both direct connection and PgBouncer pooling
 *
 * @param {Object} options - Configuration options
 * @param {string} options.database - Database name (APPS-WORKSPACE, APPS-TPCAPITAL, etc.)
 * @param {string} options.schema - Database schema (workspace, tp-capital, etc.)
 * @param {number} options.max - Max pool size (default: 20)
 * @param {number} options.idleTimeoutMillis - Idle timeout (default: 30000)
 * @param {number} options.connectionTimeoutMillis - Connection timeout (default: 5000)
 * @returns {Object} Pool configuration
 */
export function getDatabaseConfig(options = {}) {
  const {
    database,
    schema,
    max = 20,
    idleTimeoutMillis = 30000,
    connectionTimeoutMillis = 5000
  } = options;

  // Check if PgBouncer is enabled
  const usePgBouncer = process.env.USE_PGBOUNCER === 'true';
  const pgbouncerHost = process.env.PGBOUNCER_HOST || 'localhost';
  const pgbouncerPort = parseInt(process.env.PGBOUNCER_PORT || '6432');

  // TimescaleDB direct connection settings
  const timescaleHost = process.env.TIMESCALE_HOST || 'localhost';
  const timescalePort = parseInt(process.env.TIMESCALE_PORT || '5433');
  const timescaleUser = process.env.TIMESCALE_USER || 'timescale';
  const timescalePassword = process.env.TIMESCALE_PASSWORD || 'timescale';

  // Build pool configuration
  const poolConfig = {
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    ssl: process.env.TIMESCALE_SSL === 'true' ? { rejectUnauthorized: false } : false
  };

  // Use PgBouncer or direct connection
  if (usePgBouncer) {
    // PgBouncer connection (transaction pooling mode)
    poolConfig.host = pgbouncerHost;
    poolConfig.port = pgbouncerPort;
    poolConfig.database = database;
    poolConfig.user = timescaleUser;
    poolConfig.password = timescalePassword;

    // PgBouncer-specific optimizations
    poolConfig.max = Math.min(max, 10); // Lower max for PgBouncer (it handles pooling)
    poolConfig.statement_timeout = 0; // No statement timeout (PgBouncer handles this)
    poolConfig.query_timeout = 0; // No query timeout
  } else {
    // Direct TimescaleDB connection
    poolConfig.host = timescaleHost;
    poolConfig.port = timescalePort;
    poolConfig.database = database;
    poolConfig.user = timescaleUser;
    poolConfig.password = timescalePassword;
  }

  // Set search path if schema is provided
  if (schema) {
    poolConfig.options = `-c search_path=${schema},public`;
  }

  return poolConfig;
}

/**
 * Create a new database pool
 *
 * @param {Object} options - Configuration options
 * @returns {pg.Pool} Database pool
 */
export function createDatabasePool(options = {}) {
  const config = getDatabaseConfig(options);
  const pool = new pg.Pool(config);

  // Set search path for connections
  if (options.schema) {
    pool.on('connect', async (client) => {
      try {
        await client.query(`SET search_path TO ${options.schema}, public`);
      } catch (err) {
        console.error(`Failed to set search path to ${options.schema}:`, err);
      }
    });
  }

  // Log pool errors
  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });

  return pool;
}

/**
 * Test database connection
 *
 * @param {pg.Pool} pool - Database pool
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testDatabaseConnection(pool) {
  try {
    const result = await pool.query('SELECT 1 AS alive');
    return result.rows[0]?.alive === 1;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Get pool statistics
 *
 * @param {pg.Pool} pool - Database pool
 * @returns {Object} Pool statistics
 */
export function getPoolStats(pool) {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
}

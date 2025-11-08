/**
 * PostgreSQL connection pool
 */

import pg from 'pg';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  database: env.DB.NAME,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  max: env.DB.POOL_MAX,
  idleTimeoutMillis: env.DB.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: 10000,
  searchPath: [env.DB.SCHEMA, 'public'],
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL connection established');
});

// Test connection on startup
pool.query('SELECT NOW()').then(() => {
  logger.info('PostgreSQL connection pool initialized', {
    host: env.DB.HOST,
    port: env.DB.PORT,
    database: env.DB.NAME,
    schema: env.DB.SCHEMA,
  });
}).catch((err) => {
  logger.error('Failed to initialize PostgreSQL connection pool', { error: err.message });
  process.exit(1);
});

export default pool;


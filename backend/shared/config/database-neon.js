/**
 * Neon Database Connection Configuration
 * 
 * @module backend/shared/config/database-neon
 * @description Provides connection configuration for Neon self-hosted PostgreSQL
 */

/**
 * Get Neon database connection configuration
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.env - Environment (development, production, test)
 * @param {string} options.schema - Database schema (default: 'rag')
 * @returns {Object} Connection configuration
 */
export function getNeonConfig(options = {}) {
  const env = options.env || process.env.NODE_ENV || 'development';
  const schema = options.schema || 'rag';
  
  // Neon connection string (prioritize NEON_DATABASE_URL)
  const connectionString = process.env.NEON_DATABASE_URL || buildConnectionString();
  
  return {
    // Connection
    connectionString,
    
    // Pool configuration
    max: parseInt(process.env.NEON_POOL_MAX) || 20,
    min: parseInt(process.env.NEON_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.NEON_POOL_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.NEON_POOL_CONNECT_TIMEOUT) || 10000,
    
    // Schema
    searchPath: [schema, 'public'],
    
    // SSL (Neon self-hosted typically doesn't use SSL for local connections)
    ssl: env === 'production' ? { rejectUnauthorized: true } : false,
    
    // Statement timeout (30 seconds)
    statement_timeout: parseInt(process.env.NEON_STATEMENT_TIMEOUT) || 30000,
    
    // Application name (for monitoring)
    application_name: process.env.APP_NAME || 'rag-service',
  };
}

/**
 * Build connection string from individual components
 * Fallback if NEON_DATABASE_URL is not set
 */
function buildConnectionString() {
  const user = process.env.NEON_POSTGRES_USER || 'postgres';
  const password = process.env.NEON_POSTGRES_PASSWORD || 'neon_password';
  const host = process.env.NEON_HOST || 'neon-compute';
  const port = process.env.NEON_COMPUTE_PORT || 5432;
  const database = process.env.NEON_POSTGRES_DB || 'rag';
  
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

/**
 * Get connection string for external access (from host machine)
 */
export function getNeonExternalUrl() {
  const user = process.env.NEON_POSTGRES_USER || 'postgres';
  const password = process.env.NEON_POSTGRES_PASSWORD || 'neon_password';
  const host = process.env.NEON_HOST || 'localhost';
  const port = process.env.NEON_COMPUTE_PORT || 5435;  // External port
  const database = process.env.NEON_POSTGRES_DB || 'rag';
  
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

/**
 * Test Neon connection
 * 
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testNeonConnection() {
  const { Client } = await import('pg');
  const config = getNeonConfig();
  const client = new Client(config);
  
  try {
    await client.connect();
    const result = await client.query('SELECT version(), current_database(), current_schema()');
    console.log('✅ Neon connection successful');
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   Schema: ${result.rows[0].current_schema}`);
    console.log(`   Version: ${result.rows[0].version.split(' ')[0]}`);
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Neon connection failed:', error.message);
    return false;
  }
}

/**
 * Create Neon client instance (pg.Pool)
 * 
 * @param {Object} options - Configuration options
 * @returns {import('pg').Pool} PostgreSQL connection pool
 */
export async function createNeonPool(options = {}) {
  const { Pool } = await import('pg');
  const config = getNeonConfig(options);
  
  const pool = new Pool(config);
  
  // Error handler
  pool.on('error', (err) => {
    console.error('Unexpected error on Neon client', err);
  });
  
  // Connection event
  pool.on('connect', (client) => {
    console.log('New Neon connection established');
  });
  
  return pool;
}

/**
 * Migration helper: Check if using Neon or TimescaleDB
 * 
 * @returns {string} 'neon' or 'timescaledb'
 */
export function getDatabaseType() {
  if (process.env.NEON_DATABASE_URL || process.env.USE_NEON === 'true') {
    return 'neon';
  }
  return 'timescaledb';
}

export default {
  getNeonConfig,
  getNeonExternalUrl,
  testNeonConnection,
  createNeonPool,
  getDatabaseType,
};


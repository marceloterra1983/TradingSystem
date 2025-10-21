import './load-env-wrapper.js';

const defaultStrategy = process.env.NODE_ENV === 'test' ? 'questdb' : 'questdb';
const rawStrategy = (process.env.DOCUMENTATION_DB_STRATEGY || defaultStrategy).toLowerCase();
const normalizedStrategy = rawStrategy === 'postgresql' ? 'postgres' : rawStrategy;

export const config = {
  server: {
    port: Number(process.env.PORT || 3400)
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3103,http://localhost:3004',
    disable: process.env.DISABLE_CORS === 'true'
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 200)
  },
  database: {
    strategy: normalizedStrategy
  },
  questdb: {
    host: process.env.QUESTDB_HOST || 'localhost',
    port: Number(process.env.QUESTDB_PORT || 9000),
    user: process.env.QUESTDB_USER || 'admin',
    password: process.env.QUESTDB_PASSWORD || 'quest',
    database: process.env.QUESTDB_DATABASE || 'questdb'
  },
  postgres: {
    url: process.env.DOCUMENTATION_DATABASE_URL || '',
    schema: process.env.DOCUMENTATION_DATABASE_SCHEMA || 'public',
    ssl: process.env.DOCUMENTATION_DATABASE_SSL === 'true',
    connectionLimit: Number(process.env.DOCUMENTATION_DATABASE_POOL_MAX || 10),
    connectionTimeoutMs: Number(process.env.DOCUMENTATION_DATABASE_TIMEOUT_MS || 5000)
  },
  prometheus: {
    url: process.env.PROMETHEUS_URL || 'http://localhost:9090'
  }
};

export function isPostgresStrategy() {
  return config.database.strategy === 'postgres';
}

export function isQuestDbStrategy() {
  return config.database.strategy === 'questdb';
}

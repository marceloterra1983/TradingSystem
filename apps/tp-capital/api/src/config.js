import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });

export const config = {
  server: {
    port: Number(process.env.PORT || 4005),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  timescale: {
    host: process.env.TIMESCALEDB_HOST || 'timescaledb',
    port: Number(process.env.TIMESCALEDB_PORT || 5432),
    database: process.env.TIMESCALEDB_DATABASE || 'APPS-TPCAPITAL',
    schema: process.env.TIMESCALEDB_SCHEMA || 'tp_capital',
    user: process.env.TIMESCALEDB_USER || 'timescale',
    password: process.env.TIMESCALEDB_PASSWORD || '',

    // Connection pool settings
    maxConnections: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMs: Number(process.env.DB_POOL_IDLE_TIMEOUT || 30000),
    connectionTimeoutMs: Number(process.env.DB_POOL_CONNECTION_TIMEOUT || 2000),
  },

  gateway: {
    secretToken: process.env.GATEWAY_SECRET_TOKEN || '',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3103',
  },

  metrics: {
    port: Number(process.env.METRICS_PORT || 4005),
    path: process.env.METRICS_PATH || '/metrics',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  },
};

export function validateConfig(logger) {
  const errors = [];

  if (!config.timescale.host) {
    errors.push('TIMESCALEDB_HOST must be provided');
  }

  if (!config.timescale.password) {
    errors.push('TIMESCALEDB_PASSWORD must be provided');
  }

  if (!config.gateway.secretToken) {
    errors.push('GATEWAY_SECRET_TOKEN must be provided for Gateway authentication');
  }

  if (errors.length > 0) {
    logger.error({ errors }, 'Configuration validation failed');
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }

  logger.info({
    timescale: {
      host: config.timescale.host,
      port: config.timescale.port,
      database: config.timescale.database,
      schema: config.timescale.schema,
    },
    server: {
      port: config.server.port,
      nodeEnv: config.server.nodeEnv,
    },
  }, 'Configuration loaded successfully');
}

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });

const resolveTimescaleConfig = () => {
  const defaultHost =
    process.env.TP_CAPITAL_DB_HOST ||
    process.env.TP_CAPITAL_DATABASE_HOST ||
    process.env.TIMESCALEDB_HOST ||
    'localhost';

  const defaultPort = Number(
    process.env.TP_CAPITAL_DB_PORT ||
      process.env.TP_CAPITAL_DATABASE_PORT ||
      process.env.TIMESCALEDB_PORT ||
      5440,
  );

  const defaultDatabase =
    process.env.TP_CAPITAL_DB_NAME ||
    process.env.TP_CAPITAL_DATABASE ||
    process.env.TIMESCALEDB_DATABASE ||
    'tp_capital_db';

  const defaultSchema =
    process.env.TP_CAPITAL_DB_SCHEMA ||
    process.env.TP_CAPITAL_DATABASE_SCHEMA ||
    process.env.TIMESCALEDB_SCHEMA ||
    'signals';

  const defaultUser =
    process.env.TP_CAPITAL_DB_USER ||
    process.env.TP_CAPITAL_DATABASE_USER ||
    process.env.TIMESCALEDB_USER ||
    'tp_capital';

  const defaultPassword =
    process.env.TP_CAPITAL_DB_PASSWORD ||
    process.env.TP_CAPITAL_DATABASE_PASSWORD ||
    process.env.TIMESCALEDB_PASSWORD ||
    'tp_capital_secure_pass_2024';

  return {
    host: defaultHost,
    port: defaultPort,
    database: defaultDatabase,
    schema: defaultSchema,
    user: defaultUser,
    password: defaultPassword,
    maxConnections: Number(process.env.DB_POOL_MAX || process.env.TP_CAPITAL_POOL_MAX || 10),
    idleTimeoutMs: Number(process.env.DB_POOL_IDLE_TIMEOUT || process.env.TP_CAPITAL_IDLE_TIMEOUT || 30000),
    connectionTimeoutMs: Number(process.env.DB_POOL_CONNECTION_TIMEOUT || process.env.TP_CAPITAL_CONNECTION_TIMEOUT || 2000),
  };
};

export const config = {
  server: {
    port: Number(process.env.PORT || 4005),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  timescale: resolveTimescaleConfig(),

  gateway: {
    secretToken: process.env.GATEWAY_SECRET_TOKEN || '',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:9080',
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
    errors.push('TP_CAPITAL_DB_HOST (or TIMESCALEDB_HOST) must be provided');
  }

  if (!config.timescale.password) {
    errors.push('TP_CAPITAL_DB_PASSWORD (or TIMESCALEDB_PASSWORD) must be provided');
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

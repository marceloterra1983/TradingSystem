import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load shared env files from project root
const projectRoot = path.join(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env.shared') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim());
};

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const legacyDbHost = process.env.PORT_GOVERNANCE_DEFAULT_HOST || 'localhost';
const defaultDbUrl =
  process.env.TELEGRAM_GATEWAY_DB_URL ||
  process.env.TELEGRAM_TIMESCALE_URL ||
  process.env.TIMESCALEDB_URL ||
  process.env.DATABASE_URL ||
  `postgresql://timescale:pass_timescale@${legacyDbHost}:5433/tradingsystem`;

export const config = {
  gateway: {
    port: toInteger(process.env.GATEWAY_PORT, 4007),
  },

  telegram: {
    apiId: toInteger(process.env.TELEGRAM_API_ID, NaN),
    apiHash: process.env.TELEGRAM_API_HASH || '',
    phoneNumber: process.env.TELEGRAM_PHONE_NUMBER || '',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    sessionPath: path.join(__dirname, '..', '.session'),
  },

  api: {
    // Disabled: TP Capital integration separated - process later
    enabled: parseBoolean(process.env.API_ENDPOINTS_ENABLED, false),
    endpoints: (process.env.API_ENDPOINTS || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean),
    secretToken: process.env.API_SECRET_TOKEN || '',
    timeout: toInteger(process.env.API_TIMEOUT_MS, 10000),
  },

  retry: {
    maxRetries: toInteger(process.env.MAX_RETRIES, 3),
    baseDelayMs: toInteger(process.env.BASE_RETRY_DELAY_MS, 5000),
  },

  database: {
    url: defaultDbUrl,
    schema: process.env.TELEGRAM_GATEWAY_DB_SCHEMA || 'telegram_gateway',
    table: process.env.TELEGRAM_GATEWAY_DB_TABLE || 'messages',
    ssl: parseBoolean(process.env.TELEGRAM_GATEWAY_DB_SSL),
    pool: {
      max: toInteger(process.env.TELEGRAM_GATEWAY_DB_POOL_MAX, 10),
      idleTimeoutMs: toInteger(process.env.TELEGRAM_GATEWAY_DB_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMs: toInteger(
        process.env.TELEGRAM_GATEWAY_DB_CONNECTION_TIMEOUT_MS,
        5000,
      ),
    },
  },

  failureQueue: {
    path:
      process.env.FAILURE_QUEUE_PATH ||
      path.join(__dirname, '..', 'data', 'failure-queue.jsonl'),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export function validateConfig(logger) {
  const errors = [];

  if (!Number.isFinite(config.telegram.apiId) || config.telegram.apiId <= 0) {
    errors.push('TELEGRAM_API_ID is required');
  }

  if (!config.telegram.apiHash) {
    errors.push('TELEGRAM_API_HASH is required');
  }

  if (!config.telegram.phoneNumber && !config.telegram.botToken) {
    errors.push('Either TELEGRAM_PHONE_NUMBER or TELEGRAM_BOT_TOKEN is required');
  }

  if (!config.api.secretToken) {
    errors.push('API_SECRET_TOKEN is required');
  }

  if (!config.database.url) {
    errors.push('TELEGRAM_GATEWAY_DB_URL (or TIMESCALEDB_URL) is required');
  }

  if (errors.length > 0) {
    logger.error({ errors }, 'Configuration validation failed');
    process.exit(1);
  }

  logger.info(
    {
      gatewayPort: config.gateway.port,
      apiEndpoints: config.api.endpoints,
      tokenPrefix: `${config.api.secretToken.substring(0, 8)}...`,
      maxRetries: config.retry.maxRetries,
      dbUrl:
        config.database.url?.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@') || 'undefined',
      dbSchema: config.database.schema,
      dbPoolMax: config.database.pool.max,
    },
    'Configuration loaded successfully',
  );
}

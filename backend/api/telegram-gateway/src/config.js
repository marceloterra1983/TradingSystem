import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../../shared/config/load-env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim());
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultDbUrl =
  process.env.TELEGRAM_GATEWAY_DB_URL ||
  process.env.TIMESCALEDB_URL ||
  'postgresql://timescale:changeme@localhost:5433/APPS-TELEGRAM-GATEWAY';

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: toInt(process.env.TELEGRAM_GATEWAY_API_PORT ?? process.env.PORT, 4010),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  apiToken:
    process.env.TELEGRAM_GATEWAY_API_TOKEN ||
    process.env.API_SECRET_TOKEN ||
    process.env.GATEWAY_API_TOKEN ||
    '',
  database: {
    url: defaultDbUrl,
    schema: process.env.TELEGRAM_GATEWAY_DB_SCHEMA || 'telegram_gateway',
    table: process.env.TELEGRAM_GATEWAY_DB_TABLE || 'messages',
    ssl: parseBoolean(process.env.TELEGRAM_GATEWAY_DB_SSL),
    pool: {
      max: toInt(process.env.TELEGRAM_GATEWAY_DB_POOL_MAX, 10),
      idleTimeoutMs: toInt(process.env.TELEGRAM_GATEWAY_DB_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMs: toInt(
        process.env.TELEGRAM_GATEWAY_DB_CONNECTION_TIMEOUT_MS,
        5000,
      ),
    },
  },
  pagination: {
    defaultLimit: toInt(process.env.TELEGRAM_GATEWAY_DEFAULT_PAGE_SIZE, 50),
    maxLimit: toInt(process.env.TELEGRAM_GATEWAY_MAX_PAGE_SIZE, 200),
  },
  assets: {
    sqlMigrationsDir: path.join(projectRoot, 'backend', 'data', 'timescaledb', 'telegram-gateway'),
  },
};

export const validateConfig = (logger) => {
  const errors = [];

  if (!config.database.url) {
    errors.push('TELEGRAM_GATEWAY_DB_URL (or TIMESCALEDB_URL) is required');
  }

  if (!config.apiToken) {
    errors.push('TELEGRAM_GATEWAY_API_TOKEN or API_SECRET_TOKEN is required');
  }

  if (errors.length > 0) {
    logger.error({ errors }, 'Telegram Gateway API configuration invalid');
    throw new Error('Configuration validation failed');
  }

  logger.info(
    {
      port: config.port,
      dbSchema: config.database.schema,
      dbPoolMax: config.database.pool.max,
      pagination: config.pagination,
    },
    'Telegram Gateway API configuration loaded',
  );
};

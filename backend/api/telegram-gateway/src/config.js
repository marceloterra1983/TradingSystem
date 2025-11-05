import path from 'node:path';
import { fileURLToPath } from 'node:url';
await import('../../../shared/config/load-env.js').catch((error) => {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') {
    throw error;
  }
});

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

const parseDbUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || undefined,
      port: parsed.port ? Number(parsed.port) : undefined,
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined,
      user: parsed.username || undefined,
      password: parsed.password || undefined,
      schema: parsed.searchParams.get('schema') || undefined,
      ssl: parsed.searchParams.get('ssl') || undefined,
    };
  } catch {
    return null;
  }
};

const defaultDbUrl =
  process.env.TELEGRAM_GATEWAY_DB_URL ||
  process.env.TELEGRAM_GATEWAY_DATABASE_URL ||
  process.env.TIMESCALEDB_DATABASE_URL ||
  process.env.TIMESCALEDB_URL ||
  null;

const parsedUrl = parseDbUrl(defaultDbUrl);

const dbHost =
  process.env.TELEGRAM_GATEWAY_DB_HOST ||
  process.env.TIMESCALEDB_HOST ||
  parsedUrl?.host ||
  'localhost';

const dbPort = toInt(
  process.env.TELEGRAM_GATEWAY_DB_PORT ||
    process.env.TIMESCALEDB_PORT ||
    parsedUrl?.port,
  5433,
);

// Default to shared TimescaleDB database used across local dev
const dbName =
  process.env.TELEGRAM_GATEWAY_DB_NAME ||
  process.env.TIMESCALEDB_DATABASE ||
  parsedUrl?.database ||
  'tradingsystem';

const dbUser =
  process.env.TELEGRAM_GATEWAY_DB_USER ||
  process.env.TIMESCALEDB_USER ||
  parsedUrl?.user ||
  'timescale';

const dbPassword =
  process.env.TELEGRAM_GATEWAY_DB_PASSWORD ||
  process.env.TIMESCALEDB_PASSWORD ||
  parsedUrl?.password ||
  'pass_timescale';

const dbSchema =
  process.env.TELEGRAM_GATEWAY_DB_SCHEMA ||
  parsedUrl?.schema ||
  'telegram_gateway';

const fallbackDbUrl =
  defaultDbUrl ||
  `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(
    dbPassword,
  )}@${dbHost}:${dbPort}/${dbName}?schema=${dbSchema}`;

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  // Do NOT fall back to generic PORT to avoid collisions with other services.
  // Use explicit TELEGRAM_GATEWAY_API_PORT only.
  port: toInt(process.env.TELEGRAM_GATEWAY_API_PORT, 4010),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  apiToken:
    process.env.TELEGRAM_GATEWAY_API_TOKEN ||
    process.env.API_SECRET_TOKEN ||
    process.env.GATEWAY_API_TOKEN ||
    '',
  database: {
    url: fallbackDbUrl,
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    schema: dbSchema,
    table: process.env.TELEGRAM_GATEWAY_DB_TABLE || 'messages',
    ssl: parseBoolean(process.env.TELEGRAM_GATEWAY_DB_SSL ?? parsedUrl?.ssl),
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
    maxLimit: toInt(process.env.TELEGRAM_GATEWAY_MAX_PAGE_SIZE, 10000),
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
      dbName: config.database.database,
      dbHost: config.database.host,
      dbPort: config.database.port,
      dbPoolMax: config.database.pool.max,
      pagination: config.pagination,
    },
    'Telegram Gateway API configuration loaded',
  );
};

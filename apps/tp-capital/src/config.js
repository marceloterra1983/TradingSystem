import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import('../../../backend/shared/config/load-env.js').catch((error) => {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') {
    throw error;
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env file first (higher priority)
const localEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: localEnvPath, override: true });

const customEnvPath = process.env.TP_CAPITAL_ENV_PATH;
if (customEnvPath) {
  const resolvedPath = path.isAbsolute(customEnvPath)
    ? customEnvPath
    : path.resolve(process.cwd(), customEnvPath);
  dotenv.config({ path: resolvedPath, override: true });
}

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const toInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
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
  } catch (_error) {
    return null;
  }
};

const resolveTimescaleConfig = () => {
  // Prioritize TP_CAPITAL_DB_* when using dedicated stack
  const connectionString =
    process.env.TP_CAPITAL_DATABASE_URL ||
    process.env.TP_CAPITAL_DB_URL ||
    process.env.TIMESCALEDB_DATABASE_URL ||
    process.env.TIMESCALEDB_URL ||
    process.env.FRONTEND_APPS_DATABASE_URL ||
    null;

  const parsed = parseDbUrl(connectionString);

  const host =
    process.env.TP_CAPITAL_DB_HOST ||
    process.env.TP_CAPITAL_DATABASE_HOST ||
    process.env.TIMESCALEDB_HOST ||
    parsed?.host ||
    'localhost';

  const port = toInt(
    process.env.TP_CAPITAL_DB_PORT ||
      process.env.TP_CAPITAL_DATABASE_PORT ||
      process.env.TIMESCALEDB_PORT ||
      parsed?.port,
    5433,
  );

  const database =
    process.env.TP_CAPITAL_DB_NAME ||
    process.env.TP_CAPITAL_DATABASE ||
    process.env.TIMESCALEDB_DATABASE ||
    parsed?.database ||
    'APPS-TPCAPITAL';

  const schema =
    process.env.TP_CAPITAL_DB_SCHEMA ||
    process.env.TP_CAPITAL_DATABASE_SCHEMA ||
    process.env.TIMESCALEDB_SCHEMA ||
    parsed?.schema ||
    'tp_capital';

  const user =
    process.env.TP_CAPITAL_DB_USER ||
    process.env.TP_CAPITAL_DB_USER ||
    process.env.TIMESCALEDB_USER ||
    parsed?.user ||
    'timescale';

  const password =
    process.env.TP_CAPITAL_DB_PASSWORD ||
    process.env.TP_CAPITAL_DB_PASSWORD ||
    process.env.TIMESCALEDB_PASSWORD ||
    parsed?.password ||
    'pass_timescale';

  const ssl = parseBoolean(
    process.env.TIMESCALEDB_SSL ?? parsed?.ssl,
    false,
  )
    ? { rejectUnauthorized: false }
    : false;

  return {
    connectionString,
    host,
    port,
    database,
    schema,
    user,
    password,
    ssl,
    pool: {
      max: toInt(process.env.TP_CAPITAL_POOL_MAX || process.env.TIMESCALEDB_POOL_MAX, 10),
      idleTimeoutMs: toInt(process.env.TP_CAPITAL_IDLE_TIMEOUT || process.env.TIMESCALEDB_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMs: toInt(process.env.TP_CAPITAL_CONNECTION_TIMEOUT || process.env.TIMESCALEDB_CONN_TIMEOUT_MS, 30000), // Aumentado de 5000ms para 30000ms (30s) - PgBouncer pode demorar na primeira conexão
    },
  };
};

/**
 * Resolve Neon PostgreSQL configuration
 * Used when TP_CAPITAL_DB_STRATEGY=neon
 */
const resolveNeonConfig = () => {
  // Neon connection (via PgBouncer in dedicated stack)
  const host =
    process.env.TP_CAPITAL_DB_HOST ||
    process.env.NEON_HOST ||
    'tp-capital-pgbouncer'; // Container name in stack
  
  const port = toInt(
    process.env.TP_CAPITAL_DB_PORT ||
      process.env.NEON_PORT,
    6432, // PgBouncer port
  );
  
  const database =
    process.env.TP_CAPITAL_DB_NAME ||
    process.env.NEON_DATABASE ||
    'tp_capital_db';
  
  const schema =
    process.env.TP_CAPITAL_DB_SCHEMA ||
    process.env.NEON_SCHEMA ||
    'signals';
  
  const user =
    process.env.TP_CAPITAL_DB_USER ||
    process.env.NEON_USER ||
    'postgres';
  
  const password =
    process.env.TP_CAPITAL_DB_PASSWORD ||
    process.env.NEON_PASSWORD ||
    '';
  
  const connectionString =
    process.env.TP_CAPITAL_DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  
  return {
    connectionString,
    host,
    port,
    database,
    schema,
    user,
    password,
    ssl: false, // Neon local doesn't use SSL
    pool: {
      max: toInt(process.env.TP_CAPITAL_POOL_MAX, 25),
      idleTimeoutMs: toInt(process.env.TP_CAPITAL_IDLE_TIMEOUT, 30000),
      connectionTimeoutMs: toInt(process.env.TP_CAPITAL_CONNECTION_TIMEOUT, 30000), // Aumentado de 5000ms para 30000ms (30s) - PgBouncer pode demorar na primeira conexão
    },
  };
};

// Database strategy: 'neon' (dedicated stack) or 'timescale' (shared/legacy)
const dbStrategy = process.env.TP_CAPITAL_DB_STRATEGY || 'timescale';
const timescaleConfig = dbStrategy === 'neon' ? resolveNeonConfig() : resolveTimescaleConfig();

const resolveGatewayDbConfig = (defaultTimescaleConfig) => {
  const connectionString =
    process.env.GATEWAY_DATABASE_URL ||
    process.env.GATEWAY_DB_URL ||
    process.env.TELEGRAM_GATEWAY_DB_URL ||
    null;

  const parsed = parseDbUrl(connectionString);

  const host =
    process.env.GATEWAY_DATABASE_HOST ||
    process.env.GATEWAY_DB_HOST ||
    parsed?.host ||
    defaultTimescaleConfig.host;

  const port = toInt(
    process.env.GATEWAY_DATABASE_PORT ||
      process.env.GATEWAY_DB_PORT ||
      parsed?.port,
    defaultTimescaleConfig.port,
  );

  const database =
    process.env.GATEWAY_DATABASE_NAME ||
    process.env.GATEWAY_DB_NAME ||
    parsed?.database ||
    defaultTimescaleConfig.database;

  const schema =
    process.env.GATEWAY_DATABASE_SCHEMA ||
    process.env.GATEWAY_DB_SCHEMA ||
    parsed?.schema ||
    'telegram_gateway';

  const user =
    process.env.GATEWAY_DATABASE_USER ||
    process.env.GATEWAY_DB_USER ||
    parsed?.user ||
    defaultTimescaleConfig.user;

  const password =
    process.env.GATEWAY_DATABASE_PASSWORD ||
    process.env.GATEWAY_DB_PASSWORD ||
    parsed?.password ||
    defaultTimescaleConfig.password;

  const ssl = parseBoolean(
    process.env.GATEWAY_DATABASE_SSL ?? process.env.GATEWAY_DB_SSL ?? parsed?.ssl,
    false,
  )
    ? { rejectUnauthorized: false }
    : false;

  return {
    connectionString,
    host,
    port,
    database,
    schema,
    user,
    password,
    ssl,
    pool: {
      max: toInt(process.env.GATEWAY_DATABASE_POOL_MAX, 5),
      idleTimeoutMs: toInt(process.env.GATEWAY_DATABASE_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMs: toInt(
        process.env.GATEWAY_DATABASE_CONN_TIMEOUT_MS,
        30000, // Aumentado de 5000ms para 30000ms (30s) - Conectar ao Telegram TimescaleDB pode demorar
      ),
    },
  };
};

const gatewayDbConfig = resolveGatewayDbConfig(timescaleConfig);

export const config = {
  // Database strategy
  dbStrategy,
  
  telegram: {
    ingestionBotToken: process.env.TELEGRAM_INGESTION_BOT_TOKEN || '',
    forwarderBotToken: process.env.TELEGRAM_FORWARDER_BOT_TOKEN || '',
    forwarderSourceChannels: (process.env.TELEGRAM_SOURCE_CHANNEL_IDS || '')
      .split(',')
      .map((id) => Number(id.trim()))
      .filter(Boolean),
    destinationChannelId: Number(process.env.TELEGRAM_DESTINATION_CHANNEL_ID || 0),
    mode: process.env.TELEGRAM_MODE === 'webhook' ? 'webhook' : 'polling',
    webhook: {
      url: process.env.TELEGRAM_WEBHOOK_URL || '',
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET || ''
    },
    // User Account credentials (MTProto)
    apiId: Number(process.env.TELEGRAM_API_ID || 0),
    apiHash: process.env.TELEGRAM_API_HASH || '',
    phoneNumber: process.env.TELEGRAM_PHONE_NUMBER || '',
    session: process.env.TELEGRAM_SESSION || ''
  },
  timescale: timescaleConfig,
  gateway: {
    // HTTP API configuration (primary method - replaces direct database access)
    url: process.env.TELEGRAM_GATEWAY_URL || 'http://localhost:4010',
    apiKey: process.env.TELEGRAM_GATEWAY_API_KEY || process.env.API_SECRET_TOKEN || '',
    
    // Database configuration (legacy - kept for backward compatibility)
    database: gatewayDbConfig.database,
    schema: gatewayDbConfig.schema,
    host: gatewayDbConfig.host,
    port: gatewayDbConfig.port,
    user: gatewayDbConfig.user,
    password: gatewayDbConfig.password,
    connectionString: gatewayDbConfig.connectionString,
    ssl: gatewayDbConfig.ssl,
    pool: gatewayDbConfig.pool,
    
    // HYBRID Architecture: Polling agora é fallback (60s)
    // Primary method: Redis Pub/Sub (real-time)
    pollingIntervalMs: Number(
      process.env.TP_CAPITAL_GATEWAY_POLLING_INTERVAL_MS || 
      process.env.GATEWAY_POLLING_INTERVAL_MS || 
      60000  // 60 segundos (era 5s) - agora é fallback, não primário
    ),
    signalsChannelId: 
      process.env.TP_CAPITAL_SIGNALS_CHANNEL_ID ||
      process.env.SIGNALS_CHANNEL_ID || 
      '-1001649127710',
    batchSize: Number(
      process.env.TP_CAPITAL_GATEWAY_BATCH_SIZE ||
      process.env.GATEWAY_BATCH_SIZE || 
      100
    ),
    // Filtros adicionais para processamento seletivo
    filters: {
      messageTypes: (
        process.env.TP_CAPITAL_GATEWAY_FILTER_MESSAGE_TYPES || 
        process.env.GATEWAY_FILTER_MESSAGE_TYPES || 
        ''
      )
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      sources: (
        process.env.TP_CAPITAL_GATEWAY_FILTER_SOURCES ||
        process.env.GATEWAY_FILTER_SOURCES || 
        ''
      )
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      // Regex para detectar sinais de trading
      // DESABILITADO: Importar TODAS as mensagens do canal (sem filtro de texto)
      // Motivo: Mensagens têm formatos variados (estruturado e narrativo)
      textContains: 
        process.env.TP_CAPITAL_GATEWAY_FILTER_TEXT_CONTAINS ||
        process.env.GATEWAY_FILTER_TEXT_CONTAINS || 
        '', // ✅ VAZIO = Sem filtro (importa tudo)
      textNotContains: 
        process.env.TP_CAPITAL_GATEWAY_FILTER_TEXT_NOT_CONTAINS ||
        process.env.GATEWAY_FILTER_TEXT_NOT_CONTAINS || 
        '', // ✅ VAZIO = Sem exclusão (importa tudo)
    }
  },
  server: {
    port: Number(process.env.PORT || 4005)
  }
};

export function validateConfig(logger) {
  // Telegram bot token is now optional (Gateway polling replaces it)
  if (!config.telegram.ingestionBotToken) {
    logger.info('TELEGRAM_INGESTION_BOT_TOKEN not set - using Gateway HTTP API for signal ingestion');
  }

  // Database required (Neon or TimescaleDB)
  if (!config.timescale.connectionString && !config.timescale.host) {
    throw new Error('Database connection details are required (Neon or TimescaleDB)');
  }

  // Gateway API required
  if (!config.gateway.url) {
    throw new Error('TELEGRAM_GATEWAY_URL must be provided');
  }
  
  if (!config.gateway.apiKey) {
    logger.warn('TELEGRAM_GATEWAY_API_KEY not set - API calls may fail');
  }

  logger.info({
    dbStrategy: config.dbStrategy,
    database: {
      type: config.dbStrategy,
      host: config.timescale.host,
      port: config.timescale.port,
      database: config.timescale.database,
      schema: config.timescale.schema,
    },
    gateway: {
      mode: 'http-api',
      url: config.gateway.url,
      hasApiKey: !!config.gateway.apiKey,
      pollingIntervalMs: config.gateway.pollingIntervalMs,
      signalsChannelId: config.gateway.signalsChannelId
    }
  }, 'TP-Capital configuration loaded');
}

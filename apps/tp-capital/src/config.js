import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../../backend/shared/config/load-env.js';

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

export const config = {
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
    }
  },
  timescale: {
    host: process.env.TIMESCALEDB_HOST || 'localhost',
    port: Number(process.env.TIMESCALEDB_PORT || 5433),
    database: process.env.TIMESCALEDB_DATABASE || 'APPS-TPCAPITAL',
    schema: process.env.TIMESCALEDB_SCHEMA || 'tp_capital',
    user: process.env.TIMESCALEDB_USER || 'timescale',
    password: process.env.TIMESCALEDB_PASSWORD || 'change_me_timescale'
  },
  server: {
    port: Number(process.env.PORT || 4005)
  }
};

export function validateConfig(logger) {
  if (!config.telegram.ingestionBotToken) {
    logger.warn('TELEGRAM_INGESTION_BOT_TOKEN is not defined. Telegram ingestion disabled.');
  }
  if (!config.timescale.host) {
    throw new Error('TIMESCALEDB_HOST must be provided');
  }
  logger.info({ timescale: { host: config.timescale.host, port: config.timescale.port, database: config.timescale.database } }, 'TimescaleDB configuration loaded');
}

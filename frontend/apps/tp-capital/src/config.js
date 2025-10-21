import dotenv from 'dotenv';
import path from 'node:path';
import '../../../../backend/shared/config/load-env.js';

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
  questdb: {
    host: process.env.QUESTDB_HOST || 'localhost',
    httpPort: Number(process.env.QUESTDB_HTTP_PORT || 9000),
    ilpPort: Number(process.env.QUESTDB_ILP_PORT || 9009),
    user: process.env.QUESTDB_USER || 'admin',
    password: process.env.QUESTDB_PASSWORD || 'quest'
  },
  server: {
    port: Number(process.env.PORT || 4005)
  }
};

export function validateConfig(logger) {
  if (!config.telegram.ingestionBotToken) {
    logger.warn('TELEGRAM_INGESTION_BOT_TOKEN is not defined. Telegram ingestion disabled.');
  }
  if (!config.questdb.host) {
    throw new Error('QUESTDB_HOST must be provided');
  }
}

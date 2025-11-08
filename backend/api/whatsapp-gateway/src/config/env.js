/**
 * Environment configuration for WhatsApp Gateway API
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../../..');

dotenv.config({ path: join(projectRoot, '.env') });

const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.WHATSAPP_GATEWAY_API_PORT || '4011', 10),
  
  // API Authentication
  API_TOKEN: process.env.WHATSAPP_GATEWAY_API_TOKEN,
  WEBHOOK_TOKEN: process.env.WHATSAPP_WEBHOOK_TOKEN || 'whatsapp-webhook-dev-token',
  
  // Database (TimescaleDB via PgBouncer)
  DB: {
    HOST: process.env.WHATSAPP_GATEWAY_DB_HOST || 'whatsapp-pgbouncer',
    PORT: parseInt(process.env.WHATSAPP_GATEWAY_DB_PORT || '6432', 10),
    NAME: process.env.WHATSAPP_GATEWAY_DB_NAME || 'whatsapp_gateway',
    USER: process.env.WHATSAPP_GATEWAY_DB_USER || 'whatsapp',
    PASSWORD: process.env.WHATSAPP_GATEWAY_DB_PASSWORD,
    SCHEMA: process.env.WHATSAPP_GATEWAY_DB_SCHEMA || 'whatsapp_gateway',
    POOL_MAX: parseInt(process.env.WHATSAPP_GATEWAY_DB_POOL_MAX || '20', 10),
    IDLE_TIMEOUT_MS: parseInt(process.env.WHATSAPP_GATEWAY_DB_IDLE_TIMEOUT_MS || '30000', 10),
  },
  
  // Redis
  REDIS: {
    HOST: process.env.WHATSAPP_REDIS_HOST || 'whatsapp-redis',
    PORT: parseInt(process.env.WHATSAPP_REDIS_PORT || '6379', 10),
    ENABLED: process.env.WHATSAPP_REDIS_ENABLED === 'true',
  },
  
  // MinIO (S3)
  MINIO: {
    ENDPOINT: process.env.WHATSAPP_MINIO_ENDPOINT || 'http://whatsapp-minio:9000',
    ACCESS_KEY: process.env.WHATSAPP_MINIO_ACCESS_KEY || 'whatsappadmin',
    SECRET_KEY: process.env.WHATSAPP_MINIO_SECRET_KEY || 'whatsappsecret',
    BUCKET: process.env.WHATSAPP_MINIO_BUCKET || 'whatsapp-media',
    REGION: process.env.WHATSAPP_MINIO_REGION || 'us-east-1',
  },
  
  // WhatsApp Core Service (WAHA/Evolution)
  WHATSAPP_CORE: {
    URL: process.env.WHATSAPP_CORE_URL || 'http://whatsapp-gateway-core:3000',
    API_KEY: process.env.WHATSAPP_CORE_API_KEY || 'changeme-whatsapp-api-key',
  },
  
  // Sync Settings
  SYNC: {
    ENABLED: process.env.WHATSAPP_SYNC_ENABLED !== 'false',
    INTERVAL_MS: parseInt(process.env.WHATSAPP_SYNC_INTERVAL_MS || '300000', 10), // 5 minutes
    BATCH_SIZE: parseInt(process.env.WHATSAPP_SYNC_BATCH_SIZE || '100', 10),
    MAX_RETRIES: parseInt(process.env.WHATSAPP_SYNC_MAX_RETRIES || '3', 10),
  },
};

// Validate required env vars
const required = [
  'API_TOKEN',
  'DB.PASSWORD',
];

for (const key of required) {
  const keys = key.split('.');
  let value = env;
  for (const k of keys) {
    value = value[k];
  }
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export default env;


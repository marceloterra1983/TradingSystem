import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../../shared/config/load-env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.WORKSPACE_PORT ?? process.env.PORT ?? 3200),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  dbStrategy: (process.env.LIBRARY_DB_STRATEGY ?? 'lowdb').toLowerCase(),
  lowdbPath:
    process.env.DB_PATH ??
    path.join(projectRoot, 'backend', 'data', 'workspace', 'library.json'),
};



const resolveBoolean = (value) => {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const timescaledbConfig = {
  host:
    process.env.WORKSPACE_DATABASE_HOST ??
    process.env.FRONTEND_APPS_DB_HOST ??
    process.env.TIMESCALEDB_HOST ??
    'localhost',
  port: Number(
    process.env.WORKSPACE_DATABASE_PORT ??
      process.env.FRONTEND_APPS_DB_PORT ??
      process.env.TIMESCALEDB_PORT ??
      5444,
  ),
  database:
    process.env.WORKSPACE_DATABASE_NAME ??
    process.env.FRONTEND_APPS_DB_NAME ??
    process.env.TIMESCALEDB_DATABASE ??
    'frontend_apps',
  user:
    process.env.WORKSPACE_DATABASE_USER ??
    process.env.APP_WORKSPACE_DB_USER ??
    process.env.TIMESCALEDB_USER ??
    'app_workspace',
  password:
    process.env.WORKSPACE_DATABASE_PASSWORD ??
    process.env.APP_WORKSPACE_DB_PASSWORD ??
    process.env.TIMESCALEDB_PASSWORD ??
    'password',
  ssl:
    resolveBoolean(process.env.WORKSPACE_DATABASE_SSL) ||
    resolveBoolean(process.env.TIMESCALEDB_SSL),
  max: Number(
    process.env.WORKSPACE_DATABASE_POOL_MAX ??
      process.env.TIMESCALEDB_POOL_MAX ??
      20,
  ),
  idleTimeoutMillis: Number(
    process.env.WORKSPACE_DATABASE_IDLE_TIMEOUT ??
      process.env.TIMESCALEDB_IDLE_TIMEOUT ??
      30000,
  ),
  connectionTimeoutMillis: Number(
    process.env.WORKSPACE_DATABASE_CONNECTION_TIMEOUT ??
      process.env.TIMESCALEDB_CONNECTION_TIMEOUT ??
      2000,
  ),
  schema: process.env.WORKSPACE_DATABASE_SCHEMA ?? 'workspace',
  table: process.env.WORKSPACE_TABLE_NAME ?? 'workspace_items',
};

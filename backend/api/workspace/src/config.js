import path from 'node:path';
import { fileURLToPath } from 'node:url';
// import '../../../shared/config/load-env.js'; // Not needed in Docker - env vars passed directly

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.WORKSPACE_PORT ?? process.env.PORT ?? 3200),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  // Database strategy: neon, postgresql, timescaledb, or lowdb
  dbStrategy:
    (process.env.LIBRARY_DB_STRATEGY ?? 'postgresql').toLowerCase(),
  lowdbPath:
    process.env.DB_PATH ??
    path.join(projectRoot, 'backend', 'data', 'workspace', 'library.json'),
};

const resolveBoolean = (value) => {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const timescaledbConfig = {
  connectionString:
    process.env.WORKSPACE_DATABASE_URL ??
    process.env.FRONTEND_APPS_DATABASE_URL,
  host:
    process.env.WORKSPACE_DATABASE_HOST ??
    process.env.FRONTEND_APPS_DB_HOST ??
    'localhost',
  port: Number(
    process.env.WORKSPACE_DATABASE_PORT ??
      process.env.FRONTEND_APPS_DB_PORT ??
      5450,
  ),
  database:
    process.env.WORKSPACE_DATABASE_NAME ??
    process.env.WORKSPACE_DATABASE ??
    process.env.FRONTEND_APPS_DB_NAME ??
    'workspace',
  user:
    process.env.WORKSPACE_DATABASE_USER ??
    process.env.APP_WORKSPACE_DB_USER ??
    process.env.FRONTEND_APPS_DB_USER ??
    'postgres',
  password:
    process.env.WORKSPACE_DATABASE_PASSWORD ??
    process.env.APP_WORKSPACE_DB_PASSWORD ??
    process.env.FRONTEND_APPS_DB_PASSWORD ??
    'workspace_secure_pass',
  ssl: resolveBoolean(process.env.WORKSPACE_DATABASE_SSL ?? 'false')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  schema:
    process.env.WORKSPACE_DATABASE_SCHEMA ??
    process.env.FRONTEND_APPS_DB_SCHEMA ??
    'workspace',
  table: process.env.WORKSPACE_TABLE_NAME ?? 'workspace_items',
};

export const neonConfig = {
  connectionString:
    process.env.NEON_DATABASE_URL ??
    process.env.NEON_CONNECTION_STRING,
  host: process.env.NEON_HOST ?? 'localhost',
  port: Number(process.env.NEON_PORT ?? 5433),
  database: process.env.NEON_DATABASE ?? 'workspace',
  user: process.env.NEON_USER ?? 'postgres',
  password: process.env.NEON_PASSWORD ?? 'neon_secure_pass',
  ssl: resolveBoolean(process.env.NEON_SSL ?? 'false')
    ? { rejectUnauthorized: false }
    : false,
  max: Number(process.env.NEON_POOL_MAX ?? 20),
  min: Number(process.env.NEON_POOL_MIN ?? 2),
  idleTimeoutMillis: Number(process.env.NEON_IDLE_TIMEOUT ?? 30000),
  connectionTimeoutMillis: Number(process.env.NEON_CONNECTION_TIMEOUT ?? 5000),
  statementTimeout: Number(process.env.NEON_STATEMENT_TIMEOUT ?? 30000),
  queryTimeout: Number(process.env.NEON_QUERY_TIMEOUT ?? 30000),
  schema: process.env.NEON_SCHEMA ?? 'workspace',
  table: process.env.NEON_TABLE_NAME ?? 'workspace_items',
};

export const postgresqlConfig = {
  connectionString: process.env.POSTGRES_DATABASE_URL,
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DATABASE ?? 'workspace',
  user: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'workspace_secure_pass',
  ssl: resolveBoolean(process.env.POSTGRES_SSL ?? 'false')
    ? { rejectUnauthorized: false }
    : false,
  max: Number(process.env.POSTGRES_POOL_MAX ?? 50),
  min: Number(process.env.POSTGRES_POOL_MIN ?? 2),
  idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT ?? 30000),
  connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT ?? 5000),
  schema: process.env.POSTGRES_SCHEMA ?? 'workspace',
  table: process.env.POSTGRES_TABLE_NAME ?? 'workspace_items',
};

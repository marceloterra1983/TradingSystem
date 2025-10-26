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
  // Always use TimescaleDB (remove LowDB dependency)
  dbStrategy: 'timescaledb',
  lowdbPath:
    process.env.DB_PATH ??
    path.join(projectRoot, 'backend', 'data', 'workspace', 'library.json'),
};



const resolveBoolean = (value) => {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const timescaledbConfig = {
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: Number(process.env.TIMESCALEDB_PORT || 5433),
  database: process.env.WORKSPACE_DATABASE || 'APPS-WORKSPACE',
  user: process.env.TIMESCALEDB_USER || 'timescale',
  password: process.env.TIMESCALEDB_PASSWORD || 'pass_timescale',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  schema: process.env.WORKSPACE_DATABASE_SCHEMA || 'workspace',
  table: process.env.WORKSPACE_TABLE_NAME || 'workspace_items',
};

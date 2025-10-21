import axios from 'axios';
import logger from '../config/logger.js';

const questdbEnabled = process.env.WEBSCRAPER_QUESTDB_ENABLED === 'true';
const questdbHost = process.env.WEBSCRAPER_QUESTDB_HOST || 'localhost';
const questdbPort = process.env.WEBSCRAPER_QUESTDB_HTTP_PORT || '9000';
const questdbUser = process.env.WEBSCRAPER_QUESTDB_USER;
const questdbPassword = process.env.WEBSCRAPER_QUESTDB_PASSWORD;

const httpClient = axios.create({
  baseURL: `http://${questdbHost}:${questdbPort}`,
  timeout: 5_000,
  headers: {
    Accept: 'application/json'
  },
  auth:
    questdbUser && questdbPassword
      ? { username: questdbUser, password: questdbPassword }
      : undefined
});

async function execute(query) {
  if (!questdbEnabled) {
    return null;
  }
  try {
    await httpClient.get('/exec', { params: { query } });
  } catch (error) {
    logger.error({ err: error, query }, 'QuestDB query failed');
  }
}

export async function ensureQuestDBSchema() {
  if (!questdbEnabled) {
    return;
  }
  await execute(
    `CREATE TABLE IF NOT EXISTS webscraper_job_stats (
      day TIMESTAMP,
      type SYMBOL,
      status SYMBOL,
      job_count INT,
      avg_duration DOUBLE
    ) TIMESTAMP(day) PARTITION BY DAY`
  );

  await execute(
    `CREATE TABLE IF NOT EXISTS webscraper_exports (
      export_id UUID,
      export_type SYMBOL,
      formats STRING,
      row_count INT,
      file_size_bytes LONG,
      created_at TIMESTAMP
    ) TIMESTAMP(created_at) PARTITION BY DAY`
  );
}

export async function writeExportMetadata(exportJob) {
  if (!questdbEnabled || !exportJob) {
    return;
  }
  const formats = Array.isArray(exportJob.formats) ? exportJob.formats.join(',') : '';
  const rowCount = exportJob.rowCount ?? 0;
  const fileSize = exportJob.fileSizeBytes ?? 0;
  const createdAt = exportJob.createdAt?.toISOString?.() ?? new Date().toISOString();
  const query = `INSERT INTO webscraper_exports
    (export_id, export_type, formats, row_count, file_size_bytes, created_at)
    VALUES ('${exportJob.id}', '${exportJob.exportType}', '${formats}', ${rowCount}, ${fileSize}, '${createdAt}')`;
  await execute(query);
}

export async function writeJobStatistics({ day, type, status, count, avgDuration }) {
  if (!questdbEnabled) {
    return;
  }
  const query = `INSERT INTO webscraper_job_stats
    (day, type, status, job_count, avg_duration)
    VALUES ('${day}', '${type}', '${status}', ${count}, ${avgDuration ?? 0})`;
  await execute(query);
}

export async function questdbHealthCheck() {
  if (!questdbEnabled) {
    return true;
  }
  try {
    await httpClient.get('/exec', { params: { query: 'SELECT 1' } });
    return true;
  } catch (error) {
    logger.error({ err: error }, 'QuestDB health check failed');
    return false;
  }
}

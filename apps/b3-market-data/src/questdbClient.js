import axios from 'axios';

import { config } from './config.js';
import { logger } from './logger.js';

const http = axios.create({
  baseURL: config.questdb.httpUrl,
  timeout: config.questdb.timeoutMs,
});

const normalizeDataset = (columns, dataset) => {
  if (!Array.isArray(columns) || !Array.isArray(dataset)) {
    return [];
  }
  const colNames = columns.map((col) => col.name);
  return dataset.map((row) => {
    const obj = {};
    row.forEach((value, idx) => {
      obj[colNames[idx]] = value;
    });
    return obj;
  });
};

// Input validation helpers
const ALLOWED_INSTRUMENTS = new Set(['DI1', 'DDI', 'DOL']);
const CONTRACT_PATTERN = /^[A-Z][0-9]{2}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function validateInstrument(instrument) {
  if (!instrument) return undefined;
  const upper = String(instrument).toUpperCase();
  if (!ALLOWED_INSTRUMENTS.has(upper)) {
    throw new Error(`Invalid instrument: ${instrument}. Allowed: ${Array.from(ALLOWED_INSTRUMENTS).join(', ')}`);
  }
  return upper;
}

function validateContract(contract) {
  if (!contract) return undefined;
  const upper = String(contract).toUpperCase();
  if (!CONTRACT_PATTERN.test(upper)) {
    throw new Error(`Invalid contract format: ${contract}. Expected pattern: [A-Z][0-9]{2} (e.g., X25)`);
  }
  return upper;
}

function validateTimestamp(timestamp) {
  if (!timestamp) return undefined;
  const ts = String(timestamp);
  if (!ISO_TIMESTAMP_PATTERN.test(ts)) {
    throw new Error(`Invalid timestamp format: ${timestamp}. Expected ISO 8601 UTC format`);
  }
  return ts;
}

const escapeValue = (value) => String(value).replace(/'/g, "''");

async function execWithRetry(query, maxAttempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data } = await http.get('/exec', { params: { query } });
      return normalizeDataset(data.columns, data.dataset);
    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const questError = error.response?.data?.error ?? '';

      if (status === 400 && /table does not exist/i.test(questError)) {
        logger.warn({ tableError: questError, query }, 'QuestDB table missing – returning empty dataset');
        return [];
      }

      if (status === 400) {
        logger.error({ err: error, query }, 'QuestDB query failed with invalid SQL');
        throw error;
      }

      if (attempt < maxAttempts) {
        const backoffMs = 100 + Math.random() * 200;
        logger.warn({ attempt, maxAttempts, backoffMs, query }, 'QuestDB query failed, retrying');
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  logger.error({ err: lastError, query, attempts: maxAttempts }, 'QuestDB query failed after retries');
  return [];
}

// Deprecated - kept for compatibility, use execWithRetry
async function exec(query) {
  return execWithRetry(query, 1); // No retry for backward compatibility
}

export async function checkHealth() {
  try {
    const { status } = await http.get('/ping');
    return status === 200;
  } catch (error) {
    logger.warn({ err: error }, 'QuestDB healthcheck failed');
    return false;
  }
}

async function checkTableHealth(tableName) {
  try {
    const rows = await execWithRetry(`
      SELECT count() as cnt, max(ts) as last_ts FROM ${tableName}
    `, 1); // No retry for health checks
    
    if (rows.length === 0) {
      return { ok: false, count: 0, lastTs: null };
    }
    
    return {
      ok: true,
      count: rows[0].cnt,
      lastTs: rows[0].last_ts,
    };
  } catch (error) {
    logger.warn({ err: error, tableName }, 'Table health check failed');
    return { ok: false, error: error.message };
  }
}

export async function checkDetailedHealth() {
  const tables = [
    'b3_snapshots',
    'b3_indicators',
    'b3_gamma_levels',
    'b3_dxy_ticks',
    'b3_adjustments',
    'b3_vol_surface',
    'b3_indicators_daily',
  ];
  
  const [pingOk, ...tableResults] = await Promise.all([
    checkHealth(),
    ...tables.map((table) => checkTableHealth(table)),
  ]);
  
  const tableHealth = {};
  tables.forEach((table, idx) => {
    tableHealth[table] = tableResults[idx];
  });
  
  return {
    questdb: pingOk,
    tables: tableHealth,
  };
}

export async function fetchLatestSnapshots() {
  const rows = await execWithRetry(`
    SELECT * FROM b3_snapshots
    LATEST ON ts
    PARTITION BY instrument
  `);
  return rows.map((row) => ({
    instrument: row.instrument,
    contractMonth: row.contract_month,
    priceSettlement: row.price_settlement,
    priceSettlementPrev: row.price_settlement_prev,
    status: row.status,
    source: row.source,
    timestamp: row.ts,
  }));
}

export async function fetchLatestIndicators() {
  const rows = await execWithRetry(`
    SELECT * FROM b3_indicators
    LATEST ON ts
    PARTITION BY name
  `);
  return rows.map((row) => ({
    name: row.name,
    value: row.value,
    displayValue: row.display_value,
    updatedAt: row.updated_at,
    timestamp: row.ts,
  }));
}

export async function fetchLatestGammaLevels() {
  const rows = await execWithRetry(`
    SELECT * FROM b3_gamma_levels
    LATEST ON ts
    PARTITION BY instrument
  `);
  return rows.map((row) => ({
    instrument: row.instrument,
    callWall: row.call_wall,
    putWall: row.put_wall,
    gammaFlip: row.gamma_flip,
    status: row.status,
    timestamp: row.ts,
  }));
}

export async function fetchLatestDxy() {
  const rows = await execWithRetry(`
    SELECT * FROM b3_dxy_ticks
    LATEST ON ts
    PARTITION BY bucket
  `);
  return rows.map((row) => ({
    bucket: row.bucket,
    value: row.value,
    timestamp: row.ts,
  }));
}

export async function fetchAdjustments({
  limit = 60,
  instrument,
  contract,
  from,
  to,
} = {}) {
  // Validate inputs
  const validatedInstrument = validateInstrument(instrument);
  const validatedContract = validateContract(contract);
  validateTimestamp(from);
  validateTimestamp(to);
  
  const where = [];
  if (validatedInstrument && validatedInstrument !== 'ALL') {
    where.push(`instrument='${escapeValue(validatedInstrument)}'`);
  }
  if (validatedContract) {
    where.push(`contract_month='${escapeValue(validatedContract)}'`);
  }
  if (from) {
    where.push(`ts >= to_timestamp('${escapeValue(from)}', 'yyyy-MM-dd"T"HH:mm:ss.SSSZ')`);
  }
  if (to) {
    where.push(`ts <= to_timestamp('${escapeValue(to)}', 'yyyy-MM-dd"T"HH:mm:ss.SSSZ')`);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await execWithRetry(`
    SELECT * FROM b3_adjustments
    ${whereClause}
    ORDER BY ts DESC
    LIMIT ${Number(limit)}
  `);
  return rows.map((row) => ({
    timestamp: row.ts,
    instrument: row.instrument,
    contractMonth: row.contract_month,
    priceSettlement: row.price_settlement,
    pricePrev: row.price_prev,
    status: row.status,
  }));
}

export async function fetchVolSurface({ contractMonth, limit = 60 } = {}) {
  const validatedContract = validateContract(contractMonth);
  const whereClause = validatedContract ? `WHERE contract_month='${escapeValue(validatedContract)}'` : '';
  const rows = await execWithRetry(`
    SELECT * FROM b3_vol_surface
    ${whereClause}
    ORDER BY ts DESC, delta_bucket
    LIMIT ${Number(limit)}
  `);
  return rows.map((row) => ({
    timestamp: row.ts,
    contractMonth: row.contract_month,
    deltaBucket: row.delta_bucket,
    volatility: row.volatility,
    updatedAt: row.updated_at,
  }));
}

export async function fetchIndicatorsDaily(limit = 90) {
  const rows = await execWithRetry(`
    SELECT * FROM b3_indicators_daily
    ORDER BY ts DESC
    LIMIT ${Number(limit)}
  `);
  return rows.map((row) => ({
    timestamp: row.ts,
    indicator: row.indicator,
    value: row.value,
  }));
}

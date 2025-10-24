import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { logger } from './logger.js';

const insertTemplate = `INSERT INTO tp_capital_signals (
  ts, channel, signal_type, asset, buy_min, buy_max,
  target_1, target_2, target_final, stop, raw_message, source, ingested_at
) VALUES`;

class QuestDBClient {
  constructor() {
    this.http = axios.create({
      baseURL: `http://${config.questdb.host}:${config.questdb.httpPort}`,
      timeout: 5000,
      auth:
        config.questdb.user || config.questdb.password
          ? { username: config.questdb.user, password: config.questdb.password }
          : undefined
    });
    this.deletedTableInitialized = false;
    this.schemaInitialized = false;
    this.schemaPromise = null;
  }

  async ensureSchema() {
    if (this.schemaInitialized) {
      return;
    }
    if (this.schemaPromise) {
      return this.schemaPromise;
    }

    this.schemaPromise = this.initializeSchema()
      .then(() => {
        this.schemaInitialized = true;
        this.schemaPromise = null;
      })
      .catch((error) => {
        // Reset promise so we can retry on next call
        this.schemaPromise = null;
        throw error;
      });

    return this.schemaPromise;
  }

  async initializeSchema() {
    await this.ensureMainTableColumns();
    await this.ensureDeletedTable();
  }

  async ensureMainTableColumns() {
    const alterStatements = [
      "ALTER TABLE tp_capital_signals ADD COLUMN ingested_at TIMESTAMP"
    ];

    for (const statement of alterStatements) {
      try {
        await this.http.get('/exec', { params: { query: statement } });
      } catch (error) {
        const alreadyExists = error?.response?.data?.error?.includes('exists');
        if (!alreadyExists) {
          throw error;
        }
      }
    }
  }

  async ensureDeletedTable() {
    if (this.deletedTableInitialized) {
      return;
    }
    const query = `CREATE TABLE IF NOT EXISTS tp_capital_signals_deleted (
      ts TIMESTAMP,
      channel SYMBOL,
      signal_type SYMBOL,
      asset SYMBOL,
      buy_min DOUBLE,
      buy_max DOUBLE,
      target_1 DOUBLE,
      target_2 DOUBLE,
      target_final DOUBLE,
      stop DOUBLE,
      raw_message STRING,
      source SYMBOL,
      ingested_at TIMESTAMP,
      deleted_at TIMESTAMP
    ) TIMESTAMP(ts) PARTITION BY DAY`;
    await this.http.get('/exec', { params: { query } });

    const alterStatements = [
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN ts TIMESTAMP",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN channel SYMBOL",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN signal_type SYMBOL",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN asset SYMBOL",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN buy_min DOUBLE",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN buy_max DOUBLE",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN target_1 DOUBLE",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN target_2 DOUBLE",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN target_final DOUBLE",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN stop DOUBLE",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN raw_message STRING",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN source SYMBOL",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN ingested_at TIMESTAMP",
      "ALTER TABLE tp_capital_signals_deleted ADD COLUMN deleted_at TIMESTAMP"
    ];

    for (const statement of alterStatements) {
      try {
        await this.http.get('/exec', { params: { query: statement } });
      } catch (error) {
        const alreadyExists = error?.response?.data?.error?.includes('exists');
        if (!alreadyExists) {
          throw error;
        }
      }
    }

    this.deletedTableInitialized = true;
  }

  async writeSignal(signal) {
    await this.ensureSchema();

    const isoTimestamp = signal.timestamp
      ? new Date(Number(signal.timestamp)).toISOString()
      : new Date().toISOString();
    const tsValue = `to_timestamp('${this.escape(isoTimestamp)}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')`;
    const values = [
      tsValue,
      `'${this.escape(signal.channel || 'Desconhecido')}'`,
      `'${this.escape(signal.signalType || 'Swing Trade')}'`,
      `'${this.escape(signal.asset || 'UNKNOWN')}'`,
      this.orNull(signal.buyMin),
      this.orNull(signal.buyMax),
      this.orNull(signal.target1),
      this.orNull(signal.target2),
      this.orNull(signal.targetFinal),
      this.orNull(signal.stop),
      `'${this.escape(signal.rawMessage || '')}'`,
      `'${this.escape(signal.source || 'forwarder')}'`,
      'now()'
    ].join(', ');

    const query = `${insertTemplate} (${values});`;
    await this.http.get('/exec', { params: { query } });
  }

  async healthcheck() {
    try {
      // QuestDB doesn't have /ping, use /exec with simple query
      await this.http.get('/exec', { params: { query: 'SELECT 1' } });
      return true;
    } catch (error) {
      logger.error({ err: error }, 'QuestDB healthcheck failed');
      return false;
    }
  }

  async fetchSignals({ limit = 500, channel, signalType, fromTs, toTs } = {}) {
    try {
      await this.ensureSchema();
    } catch (schemaError) {
      logger.warn({ err: schemaError }, 'QuestDB schema unavailable, using sample TP Capital signals');
      return this.loadSampleSignals(Math.min(Math.max(Number(limit) || 100, 1), 1000), {
        channel,
        signalType,
        fromTs,
        toTs,
      });
    }

    const clauses = [];
    if (channel) {
      clauses.push(`channel = '${this.escape(channel)}'`);
    }
    if (signalType) {
      clauses.push(`signal_type = '${this.escape(signalType)}'`);
    }
    if (fromTs) {
      clauses.push(`ts >= to_timestamp(${Number(fromTs)})`);
    }
    if (toTs) {
      clauses.push(`ts <= to_timestamp(${Number(toTs)})`);
    }

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const clampedLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    const query = `SELECT ts, channel, signal_type, asset, buy_min, buy_max, target_1, target_2, target_final, stop, raw_message, source, ingested_at FROM tp_capital_signals${where} ORDER BY ts DESC LIMIT ${clampedLimit}`;

    try {
      const { data } = await this.http.get('/exec', { params: { query } });
      const columns = data?.columns?.map((col) => col.name) || [];
      const rows = data?.dataset || [];

      return rows.map((row) => {
        const obj = {};
        columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });
    } catch (error) {
      logger.warn({ err: error }, 'QuestDB unavailable, serving sample TP Capital signals');
      return this.loadSampleSignals(clampedLimit, { channel, signalType, fromTs, toTs });
    }
  }

  async loadSampleSignals(limit, filters = {}) {
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const samplePath = path.join(currentDir, '..', 'samples', 'sample-signals.json');
      const content = await fs.readFile(samplePath, 'utf8');
      const parsed = JSON.parse(content);
      const filtered = parsed.filter((entry) => {
        if (filters.channel && entry.channel !== filters.channel) return false;
        if (filters.signalType && entry.signalType !== filters.signalType) return false;
        if (filters.fromTs) {
          const ts = Date.parse(entry.timestamp || entry.ts);
          if (!Number.isNaN(ts) && ts < Number(filters.fromTs)) return false;
        }
        if (filters.toTs) {
          const ts = Date.parse(entry.timestamp || entry.ts);
          if (!Number.isNaN(ts) && ts > Number(filters.toTs)) return false;
        }
        return true;
      });
      return filtered.slice(0, limit).map((entry) => ({
        ts: entry.timestamp || entry.ts,
        channel: entry.channel,
        signal_type: entry.signalType,
        asset: entry.asset,
        buy_min: entry.buyMin ?? null,
        buy_max: entry.buyMax ?? null,
        target_1: entry.target1 ?? null,
        target_2: entry.target2 ?? null,
        target_final: entry.targetFinal ?? null,
        stop: entry.stop ?? null,
        raw_message: entry.rawMessage ?? '',
        source: entry.source ?? 'sample',
        ingested_at: entry.timestamp || entry.ts,
      }));
    } catch (sampleError) {
      logger.error({ err: sampleError }, 'Failed to load TP Capital sample signals');
      return [];
    }
  }

  escape(value) {
    return String(value).replace(/'/g, "''");
  }

  orNull(value) {
    return value === null || value === undefined || Number.isNaN(Number(value))
      ? 'null'
      : Number(value);
  }

  async deleteSignalByIngestedAt(ingestedAt) {
    await this.ensureSchema();
    if (!ingestedAt) {
      throw new Error('ingestedAt is required to delete a signal');
    }
    await this.ensureDeletedTable();
    const pattern = 'yyyy-MM-ddTHH:mm:ss.SSSUUUZ';
    const escapedTs = this.escape(ingestedAt);

    const insertDeleted = `INSERT INTO tp_capital_signals_deleted (
        ts, channel, signal_type, asset, buy_min, buy_max,
        target_1, target_2, target_final, stop, raw_message, source, ingested_at, deleted_at
      )
      SELECT
        ts, channel, signal_type, asset, buy_min, buy_max,
        target_1, target_2, target_final, stop, raw_message, source, ingested_at, now()
      FROM tp_capital_signals
      WHERE ingested_at = to_timestamp('${escapedTs}', '${pattern}')`;
    await this.http.get('/exec', { params: { query: insertDeleted } });

    const dropTmp = 'DROP TABLE IF EXISTS tp_capital_signals_tmp_delete';
    await this.http.get('/exec', { params: { query: dropTmp } });

    const createTmp = `CREATE TABLE tp_capital_signals_tmp_delete AS (
      SELECT ts, channel, signal_type, asset, buy_min, buy_max,
             target_1, target_2, target_final, stop, raw_message, source, ingested_at
      FROM tp_capital_signals
      WHERE ingested_at != to_timestamp('${escapedTs}', '${pattern}')
    ) TIMESTAMP(ts) PARTITION BY DAY`;
    await this.http.get('/exec', { params: { query: createTmp } });

    const dropMain = 'DROP TABLE tp_capital_signals';
    await this.http.get('/exec', { params: { query: dropMain } });

    const renameTmp = 'RENAME TABLE tp_capital_signals_tmp_delete TO tp_capital_signals';
    await this.http.get('/exec', { params: { query: renameTmp } });
  }
}

export const questdbClient = new QuestDBClient();

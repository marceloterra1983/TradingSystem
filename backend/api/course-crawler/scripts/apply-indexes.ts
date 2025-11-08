#!/usr/bin/env tsx
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyIndexes() {
  console.log('[apply-indexes] Starting index application...');

  const sqlPath = path.join(
    __dirname,
    '../../../data/timescaledb/course-crawler/001_add_performance_indexes.sql'
  );

  console.log(`[apply-indexes] Reading SQL from: ${sqlPath}`);
  const sql = await fs.readFile(sqlPath, 'utf-8');

  const client = await pool.connect();
  try {
    console.log('[apply-indexes] Applying indexes...');
    await client.query(sql);
    console.log('[apply-indexes] ✅ Indexes applied successfully');
  } catch (error) {
    console.error('[apply-indexes] ❌ Failed to apply indexes:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyIndexes().catch((error) => {
  console.error(error);
  process.exit(1);
});

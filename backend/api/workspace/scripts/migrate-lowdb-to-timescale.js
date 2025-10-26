#!/usr/bin/env node
/**
 * Migration Script: LowDB → TimescaleDB
 *
 * Migrates workspace items from library.json (LowDB) to TimescaleDB workspace_items table.
 *
 * Usage:
 *   npm run migrate:lowdb
 *
 * Prerequisites:
 *   - TimescaleDB running and accessible
 *   - workspace_items table created
 *   - library.json file exists
 */

import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Configuration
const config = {
  lowdbPath: process.env.LOWDB_PATH || path.join(__dirname, '..', '..', '..', '..', 'backend', 'data', 'workspace', 'library.json'),

  timescale: {
    host: process.env.TIMESCALEDB_HOST || 'localhost',
    port: parseInt(process.env.TIMESCALEDB_PORT || '5433', 10),
    database: process.env.TIMESCALEDB_DATABASE || 'APPS-TPCAPITAL',
    user: process.env.TIMESCALEDB_USER || 'timescale',
    password: process.env.TIMESCALEDB_PASSWORD,
    schema: 'workspace',
  },
};

async function main() {
  console.log('='.repeat(60));
  console.log('LowDB → TimescaleDB Migration Script');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Check if LowDB file exists
  console.log(`[1/6] Checking LowDB file: ${config.lowdbPath}`);
  try {
    await fs.access(config.lowdbPath);
    console.log('✅ LowDB file found');
  } catch (error) {
    console.log('ℹ️  No LowDB file found - skipping migration');
    console.log('   This is normal if you are starting fresh or already migrated.');
    process.exit(0);
  }

  // Step 2: Read LowDB data
  console.log();
  console.log('[2/6] Reading LowDB data...');
  const fileContent = await fs.readFile(config.lowdbPath, 'utf8');
  const data = JSON.parse(fileContent);

  if (!data.items || !Array.isArray(data.items)) {
    console.error('❌ Invalid LowDB format - missing "items" array');
    process.exit(1);
  }

  const itemCount = data.items.length;
  console.log(`✅ Found ${itemCount} items in LowDB`);

  if (itemCount === 0) {
    console.log('ℹ️  No items to migrate - skipping');
    process.exit(0);
  }

  // Step 3: Connect to TimescaleDB
  console.log();
  console.log('[3/6] Connecting to TimescaleDB...');
  const pool = new Pool({
    host: config.timescale.host,
    port: config.timescale.port,
    database: config.timescale.database,
    user: config.timescale.user,
    password: config.timescale.password,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to TimescaleDB');
    client.release();
  } catch (error) {
    console.error('❌ Failed to connect to TimescaleDB:', error.message);
    console.error('   Check your TIMESCALEDB_* environment variables');
    process.exit(1);
  }

  // Step 4: Begin transaction and migrate
  console.log();
  console.log('[4/6] Migrating items to TimescaleDB...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let inserted = 0;
    let skipped = 0;

    for (const item of data.items) {
      const query = `
        INSERT INTO "${config.timescale.schema}".workspace_items (
          id, title, description, category, priority, status,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `;

      const values = [
        item.id,
        item.title || 'Untitled',
        item.description || '',
        item.category || 'idea',
        item.priority || 'medium',
        item.status || 'pending',
        item.createdAt || new Date().toISOString(),
        item.updatedAt || new Date().toISOString(),
      ];

      const result = await client.query(query, values);

      if (result.rowCount > 0) {
        inserted++;
        process.stdout.write(`\r   Inserted: ${inserted}/${itemCount} (Skipped: ${skipped})`);
      } else {
        skipped++;
        process.stdout.write(`\r   Inserted: ${inserted}/${itemCount} (Skipped: ${skipped})`);
      }
    }

    console.log(); // New line after progress

    await client.query('COMMIT');
    console.log('✅ Transaction committed');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error();
    console.error('❌ Migration failed - transaction rolled back');
    console.error('   Error:', error.message);
    client.release();
    await pool.end();
    process.exit(1);
  }

  client.release();

  // Step 5: Validate migration
  console.log();
  console.log('[5/6] Validating migration...');
  const result = await pool.query(`SELECT COUNT(*) as count FROM "${config.timescale.schema}".workspace_items`);
  const dbCount = parseInt(result.rows[0].count, 10);

  console.log(`   LowDB items: ${itemCount}`);
  console.log(`   TimescaleDB items: ${dbCount}`);

  if (dbCount >= itemCount) {
    console.log('✅ Validation passed (all items migrated)');
  } else {
    console.warn(`⚠️  Warning: Database has fewer items than expected`);
    console.warn(`   This might be normal if some items already existed.`);
  }

  await pool.end();

  // Step 6: Backup LowDB file
  console.log();
  console.log('[6/6] Backing up LowDB file...');
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = config.lowdbPath.replace('.json', `.migrated-${timestamp}.json`);

  await fs.rename(config.lowdbPath, backupPath);
  console.log(`✅ LowDB file renamed to: ${backupPath}`);

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('✅ Migration completed successfully!');
  console.log('='.repeat(60));
  console.log();
  console.log(`Summary:`);
  console.log(`  - Items migrated: ${inserted}`);
  console.log(`  - Items skipped (duplicates): ${skipped}`);
  console.log(`  - Total items: ${itemCount}`);
  console.log(`  - Backup file: ${backupPath}`);
  console.log();
  console.log('Next steps:');
  console.log('  1. Verify data in TimescaleDB: curl http://localhost:3200/api/items');
  console.log('  2. Update LIBRARY_DB_STRATEGY to "timescaledb" in .env');
  console.log('  3. Restart Workspace service');
  console.log();
}

main().catch((error) => {
  console.error();
  console.error('Fatal error:', error);
  process.exit(1);
});

m#!/usr/bin/env node

/**
 * Migration Script: LowDB to TimescaleDB
 * Migrates workspace items from LowDB JSON file to TimescaleDB
 *
 * Usage:
 *   node migrate-lowdb-to-timescaledb.js [options]
 *
 * Options:
 *   --dry-run              Preview migration without making changes
 *   --skip-existing        Skip items that already exist in TimescaleDB
 *   --incremental          Enable incremental migration mode
 *   --continue-on-error    Continue migration even if individual items fail
 *
 * Environment Variables:
 *   LOWDB_PATH                    Path to LowDB JSON file (default: data/workspace/library.json)
 *   TIMESCALEDB_HOST             TimescaleDB host (default: localhost)
 *   TIMESCALEDB_PORT             TimescaleDB port (default: 5444)
 *   TIMESCALEDB_DATABASE         Database name (default: frontend_apps)
 *   TIMESCALEDB_USER             Database user (default: app_workspace)
 *   TIMESCALEDB_PASSWORD         Database password
 *   WORKSPACE_DATABASE_SCHEMA    Schema name (default: workspace)
 *   WORKSPACE_TABLE_NAME         Target table name (default: workspace_items)
 *   MIGRATION_BATCH_SIZE         Batch size for processing (default: 100)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import '../../../shared/config/load-env.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../..');

// Configuration
const config = {
  lowdbPath: process.env.LOWDB_PATH || path.join(projectRoot, 'data', 'workspace', 'library.json'),
  timescaledb: {
    host: process.env.TIMESCALEDB_HOST || 'localhost',
    port: parseInt(process.env.TIMESCALEDB_PORT || '5444'),
    database: process.env.TIMESCALEDB_DATABASE || 'frontend_apps',
    user: process.env.TIMESCALEDB_USER || 'app_workspace',
    password: process.env.TIMESCALEDB_PASSWORD || 'password',
    ssl: process.env.TIMESCALEDB_SSL === 'true'
  },
  tableName: process.env.WORKSPACE_TABLE_NAME || 'workspace_items',
  schema: process.env.WORKSPACE_DATABASE_SCHEMA || 'workspace',
  dryRun: process.argv.includes('--dry-run'),
  skipExisting: process.argv.includes('--skip-existing'),
  incremental: process.argv.includes('--incremental'),
  batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE || '100'),
  continueOnError: process.argv.includes('--continue-on-error')
};

const sanitizeIdentifier = (value) =>
  typeof value === 'string' ? value.replace(/[^a-zA-Z0-9_]/g, '') : '';

class TimescaleDBMigrator {
  constructor() {
    this.client = null;
  }

  async connect() {
    try {
      this.client = new pg.Client(config.timescaledb);
      await this.client.connect();
      if (config.schema) {
        const sanitizedSchema = sanitizeIdentifier(config.schema) || 'public';
        await this.client.query(`SET search_path TO ${sanitizedSchema}, public`);
      }
      console.log('✅ Connected to TimescaleDB');
    } catch (error) {
      console.error('❌ Failed to connect to TimescaleDB:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('✅ Disconnected from TimescaleDB');
    }
  }

  async loadLowDBData() {
    try {
      if (!fs.existsSync(config.lowdbPath)) {
        console.warn(`⚠️  LowDB file not found: ${config.lowdbPath}`);
        console.log('ℹ️  This might be expected if no data has been created yet');
        return [];
      }

      const data = JSON.parse(fs.readFileSync(config.lowdbPath, 'utf8'));
      const items = data.items || data || []; // Handle both {items: []} and direct array formats

      console.log(`📁 Loaded ${items.length} items from LowDB`);
      return items;
    } catch (error) {
      console.error('❌ Failed to load LowDB data:', error.message);
      throw error;
    }
  }

  transformItem(item) {
    // Validate required fields
    if (!item.id) {
      throw new Error(`Item missing required field 'id': ${JSON.stringify(item)}`);
    }
    if (!item.title) {
      throw new Error(`Item missing required field 'title': ${JSON.stringify(item)}`);
    }

    // Data type conversions and validation
    const transformed = {
      id: this.generateUUID(item.id), // Convert string IDs to UUID format
      title: item.title,
      description: item.description || null,
      category: this.validateCategory(item.category),
      priority: this.validatePriority(item.priority || 'medium'),
      status: this.validateStatus(item.status || 'new'),
      tags: Array.isArray(item.tags) ? item.tags : [],
      created_at: this.parseDate(item.createdAt || item.created_at),
      updated_at: this.parseDate(item.updatedAt || item.updated_at),
      created_by: item.createdBy || item.created_by || null,
      updated_by: item.updatedBy || item.updated_by || null,
      metadata: item.metadata || {}
    };

    return transformed;
  }

  validateCategory(category) {
    const validCategories = ['documentacao', 'coleta-dados', 'banco-dados', 'analise-dados', 'gestao-riscos', 'dashboard'];
    if (!category || !validCategories.includes(category)) {
      console.warn(`⚠️  Invalid category '${category}', defaulting to 'documentacao'`);
      return 'documentacao';
    }
    return category;
  }

  validatePriority(priority) {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      console.warn(`⚠️  Invalid priority '${priority}', defaulting to 'medium'`);
      return 'medium';
    }
    return priority;
  }

  validateStatus(status) {
    const validStatuses = ['new', 'review', 'in-progress', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      console.warn(`⚠️  Invalid status '${status}', defaulting to 'new'`);
      return 'new';
    }
    return status;
  }

  parseDate(dateValue) {
    if (!dateValue) return new Date();

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn(`⚠️  Invalid date '${dateValue}', using current timestamp`);
        return new Date();
      }
      return date;
    } catch (error) {
      console.warn(`⚠️  Failed to parse date '${dateValue}', using current timestamp`);
      return new Date();
    }
  }

  generateUUID(id) {
    // If it's already a valid UUID, return it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return id;
    }

    // For string IDs like "test-1", generate a deterministic UUID
    // Use a simple hash of the string to create a UUID-like format
    const hash = this.simpleHash(id);
    const uuid = [
      hash.slice(0, 8),
      hash.slice(8, 12),
      '4' + hash.slice(12, 15), // Version 4
      '8' + hash.slice(15, 18), // Variant 8, 9, a, or b
      hash.slice(18, 30)
    ].join('-');

    return uuid.toLowerCase();
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to hex and pad to ensure we have enough characters
    const hex = Math.abs(hash).toString(16).padStart(32, '0');
    return hex;
  }

  async checkExistingItem(itemId) {
    try {
      const query = `SELECT id FROM ${config.tableName} WHERE id = $1`;
      const result = await this.client.query(query, [itemId]);
      return result.rows.length > 0;
    } catch (error) {
      // If table doesn't exist, assume no duplicates
      if (error.code === '42P01') { // undefined_table
        return false;
      }
      throw error;
    }
  }

  async insertItem(item) {
    const query = `
      INSERT INTO ${config.tableName}
      (id, title, description, category, priority, status, tags, created_at, updated_at, created_by, updated_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `;

    const values = [
      item.id,
      item.title,
      item.description,
      item.category,
      item.priority,
      item.status,
      item.tags,
      item.created_at,
      item.updated_at,
      item.created_by,
      item.updated_by,
      JSON.stringify(item.metadata)
    ];

    const result = await this.client.query(query, values);
    return result.rowCount > 0; // Returns true if inserted, false if skipped due to conflict
  }

  async migrate() {
    try {
      console.log('🚀 Starting LowDB to TimescaleDB migration');
      console.log(`📊 Dry run: ${config.dryRun ? 'YES' : 'NO'}`);
      console.log(`⏭️  Skip existing: ${config.skipExisting ? 'YES' : 'NO'}`);
      console.log(`🔄 Incremental: ${config.incremental ? 'YES' : 'NO'}`);
      console.log(`📦 Batch size: ${config.batchSize}`);
      console.log(`⚠️  Continue on error: ${config.continueOnError ? 'YES' : 'NO'}`);
      console.log('');

      // Load data
      const lowdbItems = await this.loadLowDBData();
      if (lowdbItems.length === 0) {
        console.log('ℹ️  No items to migrate');
        return;
      }

      if (!config.dryRun) {
        await this.connect();
      }

      let migrated = 0;
      let skipped = 0;
      let errors = 0;
      let duplicates = 0;

      // Process items in batches for better performance
      for (let i = 0; i < lowdbItems.length; i += config.batchSize) {
        const batch = lowdbItems.slice(i, i + config.batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / config.batchSize) + 1}/${Math.ceil(lowdbItems.length / config.batchSize)} (${batch.length} items)`);

        for (const lowdbItem of batch) {
          try {
            const item = this.transformItem(lowdbItem);

            // Check if item already exists (only if skipExisting is enabled)
            if (config.skipExisting && !config.dryRun) {
              const exists = await this.checkExistingItem(item.id);
              if (exists) {
                console.log(`⏭️  Skipped existing item: ${item.title}`);
                skipped++;
                continue;
              }
            }

            if (!config.dryRun) {
              const inserted = await this.insertItem(item);
              if (!inserted) {
                console.log(`🔄 Duplicate item (already exists): ${item.title}`);
                duplicates++;
                continue;
              }
            }

            console.log(`✅ ${config.dryRun ? 'Would migrate' : 'Migrated'}: ${item.title}`);
            migrated++;

          } catch (error) {
            console.error(`❌ Failed to migrate item ${lowdbItem.id}:`, error.message);
            errors++;
            if (!config.continueOnError) {
              throw error;
            }
          }
        }
      }

      console.log('');
      console.log('📊 Migration Summary:');
      console.log(`   Migrated: ${migrated}`);
      console.log(`   Skipped (existing): ${skipped}`);
      console.log(`   Duplicates (ON CONFLICT): ${duplicates}`);
      console.log(`   Errors: ${errors}`);
      console.log(`   Total: ${lowdbItems.length}`);

      if (errors > 0) {
        console.log('');
        console.log('⚠️  Migration completed with errors. Review the error messages above.');
      }

      if (config.dryRun) {
        console.log('');
        console.log('💡 This was a dry run. Run without --dry-run to perform actual migration.');
      } else {
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log('💡 You can now switch the Workspace API to use TimescaleDB by setting:');
        console.log('   LIBRARY_DB_STRATEGY=timescaledb');
      }

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      if (!config.dryRun) {
        await this.disconnect();
      }
    }
  }
}

// Main execution
async function main() {
  const migrator = new TimescaleDBMigrator();

  try {
    await migrator.migrate();
    console.log('');
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('💥 Migration failed!');
    process.exit(1);
  }
}

main();

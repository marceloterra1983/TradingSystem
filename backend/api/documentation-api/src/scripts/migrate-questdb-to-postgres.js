#!/usr/bin/env node
/**
 * Migrate Documentation data from QuestDB to PostgreSQL (Prisma).
 *
 * Usage:
 *   node migrate-questdb-to-postgres.js [--dry-run] [--skip-existing] [--truncate]
 *
 * Environment variables (loaded from project root .env):
 *   DOCUMENTATION_DATABASE_URL   PostgreSQL connection string (required for non dry-run)
 *   QUESTDB_HOST / QUESTDB_PORT  QuestDB connectivity (optional overrides)
 */

import { fileURLToPath } from 'url';
import path from 'path';
import '../../../../shared/config/load-env.js';
import process from 'process';
import { PrismaClient } from '@prisma/client';
import questdbClient from '../utils/questDBClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _projectRoot = path.resolve(__dirname, '../../../../');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const TRUNCATE_FIRST = process.argv.includes('--truncate');

const DATABASE_URL = process.env.DOCUMENTATION_DATABASE_URL;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseJsonSafe(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeTags(value) {
  const parsed = parseJsonSafe(value, []);
  return Array.isArray(parsed) ? Array.from(new Set(parsed)) : [];
}

function normalizeMetadata(value) {
  const parsed = parseJsonSafe(value, null);
  return parsed && typeof parsed === 'object' ? parsed : null;
}

function parseDate(value, fallback = null) {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function parseIntSafe(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseBigIntSafe(value) {
  if (value === null || value === undefined) {
    return BigInt(0);
  }
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function ensureDatabaseUrl() {
  if (DRY_RUN) {
    return;
  }
  if (!DATABASE_URL) {
    log('✗ DOCUMENTATION_DATABASE_URL is not defined. Aborting migration.', 'red');
    process.exit(1);
  }
}

async function truncateTables(prisma) {
  if (DRY_RUN) {
    log('[DRY RUN] Would truncate documentation tables before migration', 'yellow');
    return;
  }

  log('⚠️  Truncating PostgreSQL tables (documentation_files, documentation_ideas, documentation_systems)', 'yellow');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "documentation_files" RESTART IDENTITY CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "documentation_ideas" RESTART IDENTITY CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "documentation_systems" RESTART IDENTITY CASCADE');
  log('✓ Tables truncated', 'green');
}

async function migrateSystems(prisma) {
  log('\n📡 Migrating documentation systems...', 'blue');
  const rows = await questdbClient.executeSelect('SELECT * FROM documentation_systems');
  log(`• Found ${rows.length} systems in QuestDB`, 'cyan');

  const summary = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const payload = {
      id: row.id,
      name: row.name,
      description: row.description || null,
      type: row.type || 'unknown',
      url: row.url || null,
      status: row.status || 'unknown',
      lastChecked: parseDate(row.last_checked),
      responseTimeMs: parseIntSafe(row.response_time_ms),
      version: row.version || null,
      owner: row.owner || null,
      tags: normalizeTags(row.tags),
      metadata: normalizeMetadata(row.metadata),
      icon: row.icon || null,
      color: row.color || null,
      host: row.host || null,
      port: parseIntSafe(row.port),
      createdBy: row.created_by || null,
      designatedTimestamp: parseDate(row.designated_timestamp),
      createdAt: parseDate(row.created_at) ?? new Date(),
      updatedAt: parseDate(row.updated_at) ?? new Date()
    };

    if (DRY_RUN) {
      log(`  [DRY RUN] Would upsert system "${payload.name}" (${payload.id})`, 'cyan');
      continue;
    }

    try {
      if (SKIP_EXISTING) {
        const existing = await prisma.documentationSystem.findUnique({ where: { id: payload.id } });
        if (existing) {
          summary.skipped += 1;
          continue;
        }
      }

      await prisma.documentationSystem.upsert({
        where: { id: payload.id },
        create: payload,
        update: payload
      });

      summary.created += 1;
    } catch (error) {
      summary.errors.push({ id: payload.id, name: payload.name, reason: error.message });
      log(`  ✗ Failed to migrate system "${payload.name}": ${error.message}`, 'red');
    }
  }

  if (!DRY_RUN) {
    log(`✓ Systems migrated: ${summary.created} created/updated, ${summary.skipped} skipped`, 'green');
    if (summary.errors.length > 0) {
      log(`✗ Systems with errors: ${summary.errors.length}`, 'red');
    }
  }

  return summary;
}

async function migrateIdeas(prisma) {
  log('\n🧠 Migrating documentation ideas...', 'blue');
  const rows = await questdbClient.executeSelect('SELECT * FROM documentation_ideas');
  log(`• Found ${rows.length} ideas in QuestDB`, 'cyan');

  const summary = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const payload = {
      id: row.id,
      title: row.title,
      description: row.description || null,
      status: row.status || 'backlog',
      category: row.category || 'uncategorized',
      priority: row.priority || 'medium',
      assignedTo: row.assigned_to || null,
      createdBy: row.created_by || 'system',
      systemId: row.system_id || null,
      tags: normalizeTags(row.tags),
      estimatedHours: parseIntSafe(row.estimated_hours),
      actualHours: parseIntSafe(row.actual_hours),
      dueDate: parseDate(row.due_date),
      completedAt: parseDate(row.completed_at),
      designatedTimestamp: parseDate(row.designated_timestamp),
      createdAt: parseDate(row.created_at) ?? new Date(),
      updatedAt: parseDate(row.updated_at) ?? new Date()
    };

    if (DRY_RUN) {
      log(`  [DRY RUN] Would upsert idea "${payload.title}" (${payload.id})`, 'cyan');
      continue;
    }

    try {
      if (SKIP_EXISTING) {
        const existing = await prisma.documentationIdea.findUnique({ where: { id: payload.id } });
        if (existing) {
          summary.skipped += 1;
          continue;
        }
      }

      await prisma.documentationIdea.upsert({
        where: { id: payload.id },
        create: payload,
        update: payload
      });

      summary.created += 1;
    } catch (error) {
      summary.errors.push({ id: payload.id, title: payload.title, reason: error.message });
      log(`  ✗ Failed to migrate idea "${payload.title}": ${error.message}`, 'red');
    }
  }

  if (!DRY_RUN) {
    log(`✓ Ideas migrated: ${summary.created} created/updated, ${summary.skipped} skipped`, 'green');
    if (summary.errors.length > 0) {
      log(`✗ Ideas with errors: ${summary.errors.length}`, 'red');
    }
  }

  return summary;
}

async function migrateFiles(prisma) {
  log('\n📎 Migrating documentation files metadata...', 'blue');
  const rows = await questdbClient.executeSelect('SELECT * FROM documentation_files');
  log(`• Found ${rows.length} file records in QuestDB`, 'cyan');

  const summary = { total: rows.length, created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const payload = {
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: parseBigIntSafe(row.size_bytes),
      filePath: row.file_path,
      description: row.description || null,
      ideaId: row.idea_id || null,
      systemId: row.system_id || null,
      uploadedBy: row.uploaded_by || null,
      isPublic: row.is_public === true || row.is_public === 'true',
      downloadCount: parseIntSafe(row.download_count) ?? 0,
      checksum: row.checksum || null,
      createdAt: parseDate(row.created_at) ?? new Date(),
      updatedAt: parseDate(row.updated_at) ?? new Date(),
      designatedTimestamp: parseDate(row.designated_timestamp)
    };

    if (DRY_RUN) {
      log(`  [DRY RUN] Would upsert file "${payload.originalName}" (${payload.id})`, 'cyan');
      continue;
    }

    try {
      if (SKIP_EXISTING) {
        const existing = await prisma.documentationFile.findUnique({ where: { id: payload.id } });
        if (existing) {
          summary.skipped += 1;
          continue;
        }
      }

      await prisma.documentationFile.upsert({
        where: { id: payload.id },
        create: payload,
        update: payload
      });

      summary.created += 1;
    } catch (error) {
      summary.errors.push({ id: payload.id, filename: payload.originalName, reason: error.message });
      log(`  ✗ Failed to migrate file "${payload.originalName}": ${error.message}`, 'red');
    }
  }

  if (!DRY_RUN) {
    log(`✓ Files migrated: ${summary.created} created/updated, ${summary.skipped} skipped`, 'green');
    if (summary.errors.length > 0) {
      log(`✗ Files with errors: ${summary.errors.length}`, 'red');
    }
  }

  return summary;
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  QuestDB → PostgreSQL Migration (Documentation Data)       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  if (DRY_RUN) {
    log('⚠️  DRY RUN MODE - No changes will be made to PostgreSQL', 'yellow');
  }

  if (SKIP_EXISTING) {
    log('ℹ️  Existing records will be preserved (skip-existing)', 'yellow');
  }

  ensureDatabaseUrl();

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });

  try {
    if (!DRY_RUN) {
      await prisma.$connect();
      log('✓ Connected to PostgreSQL via Prisma', 'green');
    }

    await questdbClient.initialize();
    log('✓ Connected to QuestDB', 'green');

    if (TRUNCATE_FIRST) {
      await truncateTables(prisma);
    }

    const results = {
      systems: await migrateSystems(prisma),
      ideas: await migrateIdeas(prisma),
      files: await migrateFiles(prisma)
    };

    if (!DRY_RUN) {
      log('\n✅ Migration completed successfully', 'green');
    } else {
      log('\nℹ️  Dry run finished', 'cyan');
    }

    log('\nSummary:', 'blue');
    for (const [entity, summary] of Object.entries(results)) {
      log(`• ${entity}: total=${summary.total}, migrated=${summary.created}, skipped=${summary.skipped}, errors=${summary.errors.length}`);
    }
  } finally {
    if (!DRY_RUN) {
      await prisma.$disconnect();
    }
    if (questdbClient.pool) {
      await questdbClient.pool.drain().catch(() => {});
      await questdbClient.pool.clear().catch(() => {});
    }
  }
}

main().catch((error) => {
  log('\n✗ Migration failed', 'red');
  log(error.stack || error.message, 'red');
  process.exit(1);
});

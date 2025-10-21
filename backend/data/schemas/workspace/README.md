# Workspace Schemas for TimescaleDB

This directory contains PostgreSQL/TimescaleDB schema definitions for the Workspace API service.

## 📋 Overview

The Workspace API manages workspace items (ideas, documentation entries) with time-series capabilities for efficient historical analysis and querying.

## 🗂️ Schema Files

1. **[01_workspace_items.sql](01_workspace_items.sql)** - Main workspace items table with TimescaleDB hypertable
2. **[02_workspace_audit_log.sql](02_workspace_audit_log.sql)** - Audit trail for all workspace item changes
3. **[migrate-lowdb-to-timescaledb.js](migrate-lowdb-to-timescaledb.js)** - Migration script from LowDB to TimescaleDB
4. **[package.json](package.json)** - Node.js dependencies for migration script

## 🏗️ Architecture

### TimescaleDB Hypertables

Both tables are configured as TimescaleDB hypertables for optimal time-series performance:

- **workspace_items**: Partitioned by month on `created_at`
- **workspace_audit_log**: Partitioned by day on `created_at` (higher frequency)

### Data Model

Based on the current LowDB structure with enhancements:

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "category": "enum",
  "priority": "enum",
  "status": "enum",
  "tags": ["array"],
  "created_at": "timestamptz",
  "updated_at": "timestamptz",
  "created_by": "string",
  "updated_by": "string",
  "metadata": "jsonb"
}
```

## 📊 Indexes & Performance

### Primary Indexes
- B-tree indexes on frequently queried columns (category, priority, status)
- GIN indexes for array and JSONB fields (tags, metadata)
- Composite indexes for common query patterns

### Time-Series Optimizations
- Hypertable partitioning for efficient time-range queries
- Partial indexes for active/high-priority items
- Descending indexes on timestamps for latest-first ordering

## 🔄 Migration Strategy

### From LowDB to TimescaleDB

The migration script handles:

1. **Data Transformation**: Converts LowDB JSON structure to PostgreSQL schema
2. **Type Mapping**: JSON strings → PostgreSQL types (arrays, timestamps)
3. **Data Validation**: Validates categories, priorities, statuses with defaults
4. **Dry Run Support**: Preview migration without making changes
5. **Skip Existing**: Avoid duplicate imports (pre-check)
6. **Duplicate Prevention**: Uses `ON CONFLICT DO NOTHING` for safe re-runs
7. **Batch Processing**: Configurable batch sizes for performance
8. **Error Handling**: Robust error handling with continue-on-error option
9. **Incremental Migration**: Support for partial migrations

### Usage

```bash
# Install dependencies (one time)
npm install

# Dry run (preview)
node migrate-lowdb-to-timescaledb.js --dry-run

# Full migration
node migrate-lowdb-to-timescaledb.js

# Skip existing items
node migrate-lowdb-to-timescaledb.js --skip-existing

# Continue on errors (don't stop on individual item failures)
node migrate-lowdb-to-timescaledb.js --continue-on-error

# Combine options
node migrate-lowdb-to-timescaledb.js --dry-run --skip-existing --continue-on-error
```

## 🔍 Query Examples

### Recent High-Priority Items
```sql
SELECT * FROM workspace_items
WHERE priority IN ('high', 'critical')
  AND status NOT IN ('completed', 'rejected')
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Items by Category with Time Aggregation
```sql
SELECT
  time_bucket('1 day', created_at) AS day,
  category,
  COUNT(*) as item_count
FROM workspace_items
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY day, category
ORDER BY day DESC;
```

### Audit Trail for Specific Item
```sql
SELECT * FROM workspace_audit_log
WHERE item_id = 'uuid-here'
ORDER BY created_at DESC;
```

## 🏷️ Enums & Constraints

### Categories
- `documentacao`
- `coleta-dados`
- `banco-dados`
- `analise-dados`
- `gestao-riscos`
- `dashboard`

### Priorities
- `low`
- `medium`
- `high`
- `critical`

### Statuses
- `new`
- `review`
- `in-progress`
- `completed`
- `rejected`

## 🔐 Security & Permissions

- Row-level security can be implemented for multi-tenant scenarios
- Audit logging captures all changes with user context
- IP address and user agent tracking for security monitoring

## 📈 Monitoring & Analytics

### Time-Series Analytics
- Item creation trends over time
- Status transition analysis
- Category distribution metrics
- User activity patterns

### Performance Metrics
- Query execution times
- Index usage statistics
- Chunk compression ratios

## 🚀 Deployment

### Prerequisites
- TimescaleDB extension installed
- PostgreSQL 13+ with TimescaleDB 2.0+

### Setup
```sql
-- Run schemas in order
\i 01_workspace_items.sql
\i 02_workspace_audit_log.sql
```

### Environment Variables
```env
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5444
TIMESCALEDB_DATABASE=frontend_apps
TIMESCALEDB_USER=app_workspace
TIMESCALEDB_PASSWORD=password
WORKSPACE_DATABASE_SCHEMA=workspace
WORKSPACE_TABLE_NAME=workspace_items
LOWDB_PATH=../db/items.json
```

## 🔄 Future Enhancements

- Full-text search capabilities
- Advanced time-series aggregations
- Automated retention policies
- Real-time change streams
- Integration with analytics dashboards

# Database Agent

## Role
Database Engineer - Schema Design & Optimization

## Specialization
- TimescaleDB (hypertables, compression, continuous aggregates)
- PostgreSQL administration
- Prisma migrations
- Query optimization (EXPLAIN ANALYZE)
- Data modeling (ER diagrams)

## Focus Areas
- Schema design for new features
- Migration scripts (SQL + Prisma)
- Index optimization
- Retention policies (TimescaleDB chunks)
- Backup strategies

## Active Databases

### 1. data-timescaledb (Port 5433)
```
Container: data-timescaledb
Version: PostgreSQL 16 + TimescaleDB
Network: tradingsystem_backend

Databases:
├── APPS-WORKSPACE (schema: workspace)
│   ├── workspace_items (hypertable, monthly chunks)
│   └── workspace_audit_log (hypertable, monthly chunks)
│
├── APPS-TPCAPITAL (schema: tp_capital)
│   ├── tp_capital_signals (hypertable, daily chunks)
│   ├── telegram_bots
│   └── telegram_channels
│
└── APPS-TELEGRAM-GATEWAY (schema: telegram_gateway)
    ├── messages
    └── channels
```

### 2. documentation-api (Port 5434)
```
Container: documentation-api-postgres
Version: PostgreSQL 16 + Prisma
Database: documentation-api

Tables:
├── documentation_systems
├── documentation_ideas
├── documentation_files
└── documentation_audit_log
```

### 3. QuestDB (Port 9000)
```
Container: questdb
Version: QuestDB 7.x
Purpose: Time-series data (legacy)

Tables:
└── tp_capital_signals (partitioned by day)
```

## Development Workflow

### 1. Receive Task
```markdown
Example from tasks.md:
## 1. Database (Database Agent)
- [ ] 1.1 Create order_history table (hypertable)
- [ ] 1.2 Add indexes for common queries
- [ ] 1.3 Create audit trigger
- [ ] 1.4 Write migration script
- [ ] 1.5 Test rollback procedure

Context: openspec/changes/add-order-history/
Schema doc: docs/content/database/schema.mdx
Estimated: 3-4 hours
```

### 2. Design Process
```bash
# 1. Read requirements
cat openspec/changes/add-order-history/specs/order-manager/spec.md

# 2. Design schema (ER diagram)
# - Define tables, columns, types
# - Identify relationships (FK constraints)
# - Plan indexes
# - Consider partitioning strategy

# 3. Review existing schema
cat docs/content/database/schema.mdx

# 4. Create migration
# File: backend/api/workspace/migrations/XXX_add_order_history.sql
```

### 3. Migration Checklist
- [ ] Create git branch: `claude/add-schema-{session-id}`
- [ ] Design schema (normalize, choose types)
- [ ] Write UP migration (CREATE TABLE, indexes, triggers)
- [ ] Write DOWN migration (DROP in reverse order)
- [ ] Test migration on dev database
- [ ] Test rollback
- [ ] Document in docs/content/database/schema.mdx
- [ ] Update ER diagram (if needed)
- [ ] Create PR

## Schema Design Principles

### 1. Normalization
```sql
-- ✅ GOOD: Normalized (3NF)
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_fills (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    fill_price DECIMAL(18,8) NOT NULL,
    fill_quantity INTEGER NOT NULL,
    filled_at TIMESTAMPTZ NOT NULL
);

-- ❌ BAD: Denormalized (repeating groups)
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    symbol VARCHAR(50),
    fill_1_price DECIMAL, -- Bad: repeating columns
    fill_1_quantity INTEGER,
    fill_2_price DECIMAL,
    fill_2_quantity INTEGER
);
```

### 2. TimescaleDB Hypertables
```sql
-- Use hypertables for time-series data (>100K rows)

-- ✅ GOOD: Hypertable with appropriate chunk interval
CREATE TABLE market_trades (
    id UUID DEFAULT gen_random_uuid(),
    symbol VARCHAR(50) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    volume INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, timestamp) -- MUST include time column
);

-- Convert to hypertable
SELECT create_hypertable(
    'market_trades',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day' -- Adjust based on data volume
);

-- Enable compression (after data stabilizes)
ALTER TABLE market_trades SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol'
);

SELECT add_compression_policy('market_trades', INTERVAL '7 days');
```

### 3. Indexing Strategy
```sql
-- Primary key index (automatic)
PRIMARY KEY (id, timestamp)

-- Frequently queried columns
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_status ON orders(status);

-- Time-series DESC index
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Composite index (for common query patterns)
CREATE INDEX idx_orders_user_status_created
    ON orders(user_id, status, created_at DESC);

-- Partial index (for active records only)
CREATE INDEX idx_orders_active
    ON orders(created_at DESC)
    WHERE status NOT IN ('FILLED', 'CANCELED', 'REJECTED');

-- GIN index for arrays/JSONB
CREATE INDEX idx_workspace_tags ON workspace_items USING GIN(tags);
CREATE INDEX idx_workspace_metadata ON workspace_items USING GIN(metadata);

-- Full-text search
CREATE INDEX idx_ideas_fulltext
    ON documentation_ideas USING GIN(to_tsvector('english', title || ' ' || description));
```

### 4. Constraints & Validation
```sql
-- NOT NULL constraints
symbol VARCHAR(50) NOT NULL

-- CHECK constraints
quantity INTEGER NOT NULL CHECK (quantity > 0)
status VARCHAR(20) CHECK (status IN ('PENDING', 'SUBMITTED', 'FILLED', 'CANCELED'))
price DECIMAL(18,8) CHECK (price > 0)

-- UNIQUE constraints
UNIQUE (user_id, idempotency_key)

-- Foreign keys (with cascade rules)
order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE

-- Partial unique constraint
CREATE UNIQUE INDEX idx_unique_active_order
    ON orders(user_id, symbol)
    WHERE status IN ('PENDING', 'SUBMITTED');
```

## Migration Template

### TimescaleDB Migration
```sql
-- File: backend/api/workspace/migrations/003_add_order_history.sql

-- ==========================================
-- UP MIGRATION
-- ==========================================

BEGIN;

-- 1. Create main table
CREATE TABLE IF NOT EXISTS workspace.order_history (
    id UUID DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL
        CHECK (event_type IN ('CREATED', 'SUBMITTED', 'FILLED', 'PARTIALLY_FILLED', 'CANCELED', 'REJECTED', 'FAILED')),
    event_data JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    PRIMARY KEY (id, timestamp)
);

-- 2. Convert to hypertable
SELECT create_hypertable(
    'workspace.order_history',
    'timestamp',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_order_history_order_id
    ON workspace.order_history(order_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_order_history_event_type
    ON workspace.order_history(event_type);

CREATE INDEX IF NOT EXISTS idx_order_history_timestamp
    ON workspace.order_history(timestamp DESC);

-- GIN index for JSONB
CREATE INDEX IF NOT EXISTS idx_order_history_event_data
    ON workspace.order_history USING GIN(event_data);

-- 4. Create trigger for auto-updated_at (if needed)
-- (Not needed for this table as we only INSERT)

-- 5. Add comments
COMMENT ON TABLE workspace.order_history IS 'Order lifecycle events and state transitions';
COMMENT ON COLUMN workspace.order_history.event_type IS 'Type of order event';
COMMENT ON COLUMN workspace.order_history.event_data IS 'Event payload (prices, quantities, etc.)';

COMMIT;

-- ==========================================
-- DOWN MIGRATION (Rollback)
-- ==========================================

BEGIN;

-- Drop in reverse order
DROP INDEX IF EXISTS workspace.idx_order_history_event_data;
DROP INDEX IF EXISTS workspace.idx_order_history_timestamp;
DROP INDEX IF EXISTS workspace.idx_order_history_event_type;
DROP INDEX IF EXISTS workspace.idx_order_history_order_id;

DROP TABLE IF EXISTS workspace.order_history CASCADE;

COMMIT;
```

### Prisma Migration
```prisma
// File: backend/api/documentation-api/prisma/migrations/XXX_add_tags_table/migration.sql

-- CreateTable
CREATE TABLE "documentation_tags" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "color" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentation_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documentation_tags_name_key" ON "documentation_tags"("name");

-- CreateIndex
CREATE INDEX "documentation_tags_category_idx" ON "documentation_tags"("category");

-- CreateTable (junction table for many-to-many)
CREATE TABLE "documentation_idea_tags" (
    "idea_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentation_idea_tags_pkey" PRIMARY KEY ("idea_id","tag_id")
);

-- AddForeignKey
ALTER TABLE "documentation_idea_tags" ADD CONSTRAINT "documentation_idea_tags_idea_id_fkey"
    FOREIGN KEY ("idea_id") REFERENCES "documentation_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documentation_idea_tags" ADD CONSTRAINT "documentation_idea_tags_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "documentation_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Query Optimization

### Using EXPLAIN ANALYZE
```sql
-- 1. Identify slow queries from logs
-- 2. Run EXPLAIN ANALYZE

EXPLAIN ANALYZE
SELECT o.*, u.username
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'PENDING'
  AND o.created_at >= NOW() - INTERVAL '1 day'
ORDER BY o.created_at DESC
LIMIT 100;

-- Look for:
-- - Seq Scan (bad for large tables) → Add index
-- - High execution time → Optimize query or add index
-- - Nested Loop with high cost → Check join conditions
```

### Optimization Techniques
```sql
-- 1. Add covering index
CREATE INDEX idx_orders_pending_covering
    ON orders(created_at DESC)
    INCLUDE (user_id, symbol, quantity, price)
    WHERE status = 'PENDING';

-- 2. Use materialized views for complex queries
CREATE MATERIALIZED VIEW daily_order_stats AS
SELECT
    DATE(created_at) AS date,
    symbol,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN status = 'FILLED' THEN 1 ELSE 0 END) AS filled_orders,
    AVG(price) AS avg_price
FROM orders
GROUP BY DATE(created_at), symbol;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_stats;

-- 3. Use TimescaleDB continuous aggregates (for time-series)
CREATE MATERIALIZED VIEW hourly_trade_volume
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    symbol,
    COUNT(*) AS trade_count,
    SUM(volume) AS total_volume,
    AVG(price) AS avg_price
FROM market_trades
GROUP BY hour, symbol;
```

## Testing Migrations

### Local Testing
```bash
# 1. Backup current database
docker exec data-timescaledb pg_dump -U timescale APPS-WORKSPACE > backup.sql

# 2. Apply migration
docker exec -i data-timescaledb psql -U timescale -d APPS-WORKSPACE < migrations/003_add_order_history.sql

# 3. Verify schema
docker exec data-timescaledb psql -U timescale -d APPS-WORKSPACE -c "\d workspace.order_history"

# 4. Test queries
docker exec data-timescaledb psql -U timescale -d APPS-WORKSPACE -c "
    INSERT INTO workspace.order_history (order_id, event_type, event_data)
    VALUES ('123e4567-e89b-12d3-a456-426614174000', 'CREATED', '{\"symbol\": \"PETR4\"}');
"

# 5. Test rollback (DOWN migration)
docker exec -i data-timescaledb psql -U timescale -d APPS-WORKSPACE < migrations/003_add_order_history_rollback.sql

# 6. Restore if needed
docker exec -i data-timescaledb psql -U timescale -d APPS-WORKSPACE < backup.sql
```

## Documentation Updates

After creating migration, MUST update:

### 1. Schema Documentation
```mdx
File: docs/content/database/schema.mdx

## Order History Table (APPS-WORKSPACE)

**Database**: `APPS-WORKSPACE`
**Schema**: `workspace`
**Table**: `order_history` (Hypertable)

Track order lifecycle events.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | UUID | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| `order_id` | UUID | Reference to order | NOT NULL |
| `event_type` | VARCHAR(50) | Event type | NOT NULL, CHECK IN (...) |
| `event_data` | JSONB | Event payload | NOT NULL, DEFAULT '{}' |
| `timestamp` | TIMESTAMPTZ | Event timestamp | NOT NULL, DEFAULT NOW() |

**Hypertable**: Monthly partitioning
**Indexes**: order_id, event_type, timestamp DESC, GIN(event_data)
```

### 2. ER Diagram (if relationships changed)
Use PlantUML or dbdiagram.io

## Pull Request Template
```markdown
## Description
Added order_history table to track order lifecycle events

## Schema Changes
- Created `workspace.order_history` hypertable (monthly chunks)
- Added indexes: order_id, event_type, timestamp, event_data (GIN)
- Partitioning: Monthly based on timestamp

## Migration Files
- `migrations/003_add_order_history.sql` (UP)
- `migrations/003_add_order_history_rollback.sql` (DOWN)

## Testing
- [x] Migration tested on local dev database
- [x] Rollback tested successfully
- [x] Insert/query performance verified
- [x] EXPLAIN ANALYZE shows index usage

## Documentation
- [x] Updated docs/content/database/schema.mdx
- [x] Added table comments

## Checklist
- [x] Migration is idempotent (IF NOT EXISTS)
- [x] Rollback script provided
- [x] Indexes optimized for common queries
- [x] Constraints enforce data integrity
- [x] Backup created before testing
```

## Anti-Patterns to Avoid
❌ Creating tables without PRIMARY KEY
❌ Using VARCHAR without length limit
❌ Missing indexes on foreign keys
❌ Using TEXT for enum-like values (use CHECK)
❌ Not testing rollback migrations
❌ Missing NOT NULL on required columns
❌ Denormalization without justification
❌ Creating indexes on low-cardinality columns
❌ Not documenting schema changes

# Database Schema Design - DDL Scripts

**Created:** 2025-11-01  
**Purpose:** Production-ready DDL scripts for TradingSystem databases

---

## 📁 Contents

```
database-schema-design-2025-11-ddl/
├── README.md                  # This file
├── order-manager.sql         # Order Management schema (APPS-ORDER-MANAGER)
├── data-capture.sql          # Data Capture schema (APPS-DATA-CAPTURE)
└── migrations/               # Migration scripts
    ├── 001_optimize_tpcapital.sql
    ├── 002_optimize_workspace.sql
    └── 003_optimize_documentation.sql
```

---

## 🎯 Deployment Order

### 1. Order Management (APPS-ORDER-MANAGER)

**Purpose:** Core trading operations - orders, trades, positions, risk.

```bash
# Create database and schema
psql -h localhost -p 5435 -U timescale -f order-manager.sql

# Verify deployment
psql -h localhost -p 5435 -U timescale -d APPS-ORDER-MANAGER -c "
  SELECT * FROM timescaledb_information.hypertables WHERE schema_name = 'order_manager';
"
```

**Expected Hypertables:**
- `orders` (daily partitioning)
- `trades` (hourly partitioning)
- `position_history` (daily partitioning)
- `order_audit_log` (daily partitioning)

### 2. Data Capture (APPS-DATA-CAPTURE)

**Purpose:** Market data ingestion from ProfitDLL, tick storage.

```bash
# Create database and schema
psql -h localhost -p 5436 -U timescale -f data-capture.sql

# Verify deployment
psql -h localhost -p 5436 -U timescale -d APPS-DATA-CAPTURE -c "
  SELECT * FROM timescaledb_information.hypertables WHERE schema_name = 'data_capture';
"
```

**Expected Hypertables:**
- `market_ticks` (5-minute partitioning)
- `order_book_snapshots` (15-minute partitioning)
- `profitdll_callbacks` (hourly partitioning)
- `ohlcv_bars` (daily partitioning)

### 3. Existing Schema Optimizations

**Purpose:** Apply performance improvements to production databases.

```bash
# TP Capital optimizations
psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -f migrations/001_optimize_tpcapital.sql

# Workspace optimizations
psql -h localhost -p 5433 -U timescale -d APPS-WORKSPACE -f migrations/002_optimize_workspace.sql

# Documentation API optimizations
psql -h localhost -p 5434 -U postgres -d documentation-api -f migrations/003_optimize_documentation.sql
```

---

## ✅ Validation

### Check Hypertables

```sql
-- List all hypertables
SELECT 
  ht.schema_name,
  ht.table_name,
  d.column_name as time_column,
  d.interval_length
FROM timescaledb_information.hypertables ht
JOIN timescaledb_information.dimensions d ON ht.hypertable_schema = d.hypertable_schema 
  AND ht.hypertable_name = d.hypertable_name
ORDER BY schema_name, table_name;
```

### Check Indexes

```sql
-- List indexes by schema
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname IN ('order_manager', 'data_capture')
ORDER BY schemaname, tablename, indexname;
```

### Check Compression Policies

```sql
SELECT 
  hypertable_name,
  compression_enabled,
  compress_segmentby,
  compress_orderby
FROM timescaledb_information.compression_settings
WHERE hypertable_schema IN ('order_manager', 'data_capture');
```

### Check Retention Policies

```sql
SELECT 
  hypertable_name,
  job_id,
  schedule_interval,
  config
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention'
  AND hypertable_schema IN ('order_manager', 'data_capture');
```

---

## 🔧 Troubleshooting

### Extension Not Found

```sql
-- Install TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';
```

### Permission Issues

```sql
-- Grant necessary permissions
GRANT USAGE ON SCHEMA order_manager TO timescale;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA order_manager TO timescale;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA order_manager TO timescale;
```

### Hypertable Creation Fails

```bash
# Check if table already exists
psql -c "SELECT * FROM order_manager.orders LIMIT 1;"

# If table exists but is not a hypertable, drop and recreate
psql -c "DROP TABLE IF EXISTS order_manager.orders CASCADE;"
psql -f order-manager.sql
```

---

## 📊 Performance Testing

### Load Test: Insert 10,000 Orders

```sql
DO $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..10000 LOOP
    INSERT INTO order_manager.orders (
      order_ref, symbol, exchange, asset_class, side, order_type, 
      quantity, price, strategy_id, account_id, position_type, created_by
    ) VALUES (
      'TEST-' || i,
      'PETR4',
      'B3',
      'stock',
      'BUY',
      'LIMIT',
      100,
      30.50,
      gen_random_uuid(),
      gen_random_uuid(),
      'DAY_TRADE',
      'test_user'
    );
  END LOOP;
END $$;
```

### Benchmark Query Performance

```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM order_manager.orders 
WHERE symbol = 'PETR4' 
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC 
LIMIT 100;
```

**Expected:** < 50ms for 10K rows

---

## 🔐 Security Checklist

- [ ] Enable SSL connections (`ssl=on` in `postgresql.conf`)
- [ ] Rotate database passwords monthly
- [ ] Restrict network access (firewall rules)
- [ ] Enable audit logging (`pgaudit` extension)
- [ ] Encrypt sensitive columns (`pgcrypto`)
- [ ] Row-Level Security for multi-tenant scenarios
- [ ] Regular security audits

---

## 📚 References

- **Main Documentation:** [database-schema-design-2025-11.md](../database-schema-design-2025-11.md)
- **TimescaleDB Docs:** https://docs.timescale.com/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## 🚀 Next Steps

1. **Review** the main design document: `database-schema-design-2025-11.md`
2. **Test** DDL scripts in development environment
3. **Validate** schema with application code
4. **Deploy** to production following the migration plan
5. **Monitor** performance and adjust as needed

---

**Status:** ✅ Ready for Review  
**Deployment Target:** Q1 2026  
**Owner:** DataOps Team










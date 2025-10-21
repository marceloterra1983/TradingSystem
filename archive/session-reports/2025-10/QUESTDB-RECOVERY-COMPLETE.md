# QuestDB Table Recovery - Complete

**Date:** 2025-10-12
**Status:** SUCCESS

## Summary

Successfully restored all QuestDB tables for the Trading System. The `tradingsystem-questdb-1` container now has all necessary tables for:
- TP Capital Signals ingestion
- B3 Market Data integration
- Trading Core operations (trades, positions)
- Telegram bot/channel configuration

## Container Status

- **Container:** `tradingsystem-questdb-1`
- **Image:** `questdb/questdb:7.3.3`
- **Status:** Running
- **Ports:**
  - HTTP: 9000 (REST API)
  - PostgreSQL: 8812
  - InfluxDB Line Protocol: 9009

## Tables Created (14 tables)

### TP Capital Signals (4 tables)
1. **tp_capital_signals** - Main signals table (TIMESTAMP partitioned by DAY)
2. **tp_capital_signals_deleted** - Soft deletion archive
3. **telegram_bots** - Bot configuration and credentials
4. **telegram_channels** - Monitored channel metadata

### B3 Market Data (7 tables)
5. **b3_snapshots** - Daily settlement data (partitioned by DAY)
6. **b3_indicators** - Market indicators (partitioned by DAY)
7. **b3_vol_surface** - Volatility surface (partitioned by MONTH)
8. **b3_gamma_levels** - GEX levels (partitioned by DAY)
9. **b3_adjustments** - Settlement adjustments (partitioned by MONTH)
10. **b3_indicators_daily** - Daily indicator snapshots (partitioned by MONTH)
11. **b3_dxy_ticks** - Dollar Index ticks (partitioned by MONTH)

### Trading Core (2 tables)
12. **trades** - Execution log (partitioned by DAY)
13. **positions** - Position snapshots (partitioned by DAY)

### System (1 table)
14. **ingestion_logs** - Service logs (partitioned by DAY)

## Files Created

1. **[infrastructure/scripts/questdb-restore-tables.sql](infrastructure/scripts/questdb-restore-tables.sql)**
   - Comprehensive SQL script with all CREATE TABLE statements
   - Includes inline documentation and table grouping
   - Can be used for future recoveries

2. **[infrastructure/scripts/restore-questdb.sh](infrastructure/scripts/restore-questdb.sh)**
   - Bash script to automate table creation
   - Includes verification step
   - Note: Contains Windows line endings, use `dos2unix` if needed

## Verification

All tables verified with correct schemas:
- Column types match specifications
- Designated timestamps configured correctly
- Partitioning strategies applied (DAY/MONTH)
- SYMBOL types used for categorical data (efficient storage)

## Next Steps

### 1. Start Related Services

```bash
# TP Capital Signals Ingestion
cd frontend/apps/tp-capital
npm install && npm run dev

# B3 Market Data API
cd frontend/apps/b3-market-data
npm install && npm run dev
```

### 2. Populate Initial Data

```bash
# Telegram bots (if not already configured)
# POST to http://localhost:3200/telegram/bots

# Telegram channels (if not already configured)
# POST to http://localhost:3200/telegram/channels
```

### 3. Monitor QuestDB

- Web Console: http://localhost:9000
- Check table sizes: `SELECT count(*) FROM <table_name>`
- Monitor partitions: Check `/root/.questdb` volume

## Documentation References

- **Schema Specs:** [docs/context/backend/data/schemas/trading-core/tables/](docs/context/backend/data/schemas/trading-core/tables/)
- **TP Capital Signals:** [tp-capital-signals.md](docs/context/backend/data/schemas/trading-core/tables/tp-capital-signals.md)
- **B3 Market Data:** [b3-market-data.md](docs/context/backend/data/schemas/trading-core/tables/b3-market-data.md)
- **API Documentation:** [frontend/apps/tp-capital/README.md](frontend/apps/tp-capital/README.md)

## Quick Health Check

```bash
# Check QuestDB is responding
curl "http://localhost:9000/exec?query=SHOW+TABLES"

# Check table count
curl "http://localhost:9000/exec?query=SELECT+COUNT(*)+FROM+tp_capital_signals"

# View recent signals (if any)
curl "http://localhost:9000/exec?query=SELECT+*+FROM+tp_capital_signals+LIMIT+10"
```

## Troubleshooting

### Issue: Container not running
```bash
docker compose -f compose.dev.yml --profile tp-capital up -d questdb
```

### Issue: Tables missing
```bash
# Re-run individual CREATE TABLE statements from:
# infrastructure/scripts/questdb-restore-tables.sql
```

### Issue: Data not persisting
```bash
# Check volume
docker volume inspect tradingsystem_questdb-data

# Verify mount
docker inspect tradingsystem-questdb-1 | grep Mounts -A 10
```

## Maintenance

- **Backup:** QuestDB data stored in volume `questdb-data`
- **Partitions:** Automatically managed by QuestDB based on timestamp
- **Cleanup:** Old partitions can be dropped manually if needed
- **Monitoring:** Add to Prometheus/Grafana monitoring stack

## Success Criteria - ALL MET ✓

- [x] QuestDB container running
- [x] All 14 tables created
- [x] Schemas match documentation
- [x] Tables queryable via HTTP API
- [x] Partitioning configured correctly
- [x] Ready for service integration

---

**Recovery completed successfully!**
All tables are ready for data ingestion from TP Capital Signals and B3 Market Data services.

---
title: "ADR-008: Centralized Database Architecture"
sidebar_position: 8
tags: [adr, database, architecture, timescaledb]
domain: infrastructure
type: decision-record
summary: Migration from multiple isolated TimescaleDB containers to a single centralized instance for all applications
status: accepted
date: 2025-10-28
deciders: [System Architect]
---

# ADR-008: Centralized Database Architecture

## Status
**Accepted** - Implemented on 2025-10-28

## Context

The TradingSystem initially evolved with multiple TimescaleDB containers:
- `data-timescaledb` (PostgreSQL 16, port 5433) - Main database
- `tradingsystem-timescaledb` (PostgreSQL 15, port 5444) - Secondary instance
- `tp-capital-timescaledb` (port 5445) - App-specific instance

This led to:
1. **Operational complexity** - Multiple backups, configurations, monitoring
2. **Resource waste** - 3+ PostgreSQL processes consuming RAM/CPU unnecessarily
3. **Confusion** - Services connecting to different instances, inconsistent data
4. **Network sprawl** - Two networks (`tradingsystem-network`, `tradingsystem_backend`)

### Problem Statement
**How should we organize database infrastructure to balance isolation, simplicity, and resource efficiency?**

## Decision

**Migrate to a single centralized TimescaleDB instance (`data-timescaledb`) using PostgreSQL's multi-database pattern.**

### Architecture

```
data-timescaledb (Single Container)
├── Port: 5433 (external), 5432 (internal)
├── Network: tradingsystem_backend
├── Version: PostgreSQL 16 + TimescaleDB
│
├── Database: APPS-WORKSPACE
│   └── Schema: public
│       └── Table: workspace_items
│
├── Database: APPS-TPCAPITAL
│   ├── Schema: tp_capital
│   │   ├── Table: tp_capital_signals (22 rows)
│   │   ├── Table: telegram_bots
│   │   └── Table: forwarded_messages
│   └── Schema: telegram_gateway (shared)
│
└── Database: APPS-TELEGRAM-GATEWAY
    └── Schema: telegram_gateway
        ├── Table: messages
        └── Table: channels
```

### Naming Standards

| Component | Pattern | Examples |
|-----------|---------|----------|
| **Container** | `data-{service}-{variant}` | `data-timescaledb`, `data-timescaledb-backup` |
| **Database** | `APPS-{APPNAME}` (uppercase) | `APPS-WORKSPACE`, `APPS-TPCAPITAL` |
| **Schema** | `{appname}` (lowercase) | `tp_capital`, `telegram_gateway`, `public` |
| **Table** | `{entity}_{descriptive}` | `workspace_items`, `tp_capital_signals` |
| **Network** | `tradingsystem_{tier}` | `tradingsystem_backend`, `tradingsystem_frontend` |
| **Volume** | `{service}-{purpose}` | `timescaledb-data`, `timescaledb-backups` |

### Isolation Strategy

**Database-level isolation** provides:
- ✅ Logical separation (each app has dedicated database)
- ✅ Schema isolation (schemas within databases for sub-modules)
- ✅ Connection pool isolation (services use separate pools)
- ✅ Permission boundaries (PostgreSQL roles per database)
- ✅ Backup granularity (can backup/restore individual databases)

## Consequences

### Positive

1. **Simplified Operations**
   - Single backup process (all databases in one dump)
   - One monitoring endpoint
   - Unified configuration
   - Single upgrade path

2. **Resource Efficiency**
   - ~70% reduction in memory usage (1 PostgreSQL vs 3)
   - Better CPU utilization (shared buffer pool)
   - Reduced disk overhead

3. **Developer Experience**
   - Consistent connection patterns
   - Easier local development
   - Clearer documentation
   - Unified admin tools (pgAdmin, pgweb on single port)

4. **Network Simplification**
   - Single network: `tradingsystem_backend`
   - Removed: `tradingsystem-network` (obsolete)
   - Easier service discovery

### Negative

1. **Shared Resource Contention** (mitigated)
   - Risk: Heavy queries in one database slow others
   - Mitigation: Connection pool limits, query timeouts, monitoring

2. **Blast Radius** (mitigated)
   - Risk: Database corruption affects all apps
   - Mitigation: Regular backups, WAL archiving, replication (future)

3. **Version Lock-in** (acceptable)
   - All apps must use same PostgreSQL/TimescaleDB version
   - Current: All apps compatible with PostgreSQL 16

## Implementation

### Migration Steps (Completed)

1. ✅ **Backup** - Created full backup of `data-timescaledb`
2. ✅ **Workspace Migration** - Updated to use `data-timescaledb`
3. ✅ **Container Removal** - Removed `tradingsystem-timescaledb`
4. ✅ **Network Consolidation** - Migrated to `tradingsystem_backend`
5. ✅ **Verification** - Tested all services (Workspace, TP Capital)

### Configuration Changes

**docker-compose.apps.yml** (Workspace):
```yaml
environment:
  - TIMESCALEDB_HOST=data-timescaledb  # Changed from: timescaledb
  - TIMESCALEDB_DATABASE=APPS-WORKSPACE
networks:
  - tradingsystem_backend
```

**apps/tp-capital/docker-compose.yml**:
```yaml
environment:
  - TIMESCALEDB_HOST=data-timescaledb
  - TIMESCALEDB_DATABASE=APPS-TPCAPITAL
networks:
  - tradingsystem_backend  # Removed: tradingsystem-network
```

### Verification Results

| Service | Status | Database | Records | Network |
|---------|--------|----------|---------|---------|
| Workspace | ✅ Healthy | APPS-WORKSPACE | 0 items | tradingsystem_backend |
| TP Capital | ✅ Healthy | APPS-TPCAPITAL | 22 signals | tradingsystem_backend |
| data-timescaledb | ✅ Healthy | 3 databases | 2.2MB | tradingsystem_backend |

## Alternatives Considered

### Alternative 1: Keep Isolated Containers
- **Pro**: Complete isolation, independent versioning
- **Con**: High resource cost, operational complexity
- **Rejected**: Overhead not justified for current scale

### Alternative 2: Shared Database, Single Schema
- **Pro**: Simplest possible setup
- **Con**: No logical isolation, permission complexity
- **Rejected**: Insufficient isolation between apps

### Alternative 3: Kubernetes with Database-per-Pod
- **Pro**: Cloud-native, auto-scaling
- **Con**: Massive overkill for on-premise system
- **Rejected**: Not aligned with project requirements

## Compliance & Security

- **Isolation**: PostgreSQL database-level isolation meets requirements
- **Backup**: Single backup covers all apps (simpler compliance)
- **Audit**: Per-database audit logging available if needed
- **Access Control**: Role-based access per database

## Future Considerations

1. **Read Replicas** - Add read-only replica for heavy analytics
2. **Connection Pooler** - PgBouncer for connection management
3. **Monitoring** - Per-database metrics in Grafana
4. **High Availability** - TimescaleDB replication for failover

## References

- [PostgreSQL Multi-Database Pattern](https://www.postgresql.org/docs/current/managing-databases.html)
- [TimescaleDB Best Practices](https://docs.timescale.com/use-timescale/latest/schema-management/)
- Migration Plan: `/tmp/migration-plan.md`
- Backup Location: `/tmp/db-backup-20251028-230146/`

## Notes

- No data loss during migration ✅
- All 22 TP Capital signals preserved ✅
- Zero downtime possible with blue-green deployment (not required for this migration)
- `tradingsystem-network` deprecated but not removed (harmless, can be cleaned up later)

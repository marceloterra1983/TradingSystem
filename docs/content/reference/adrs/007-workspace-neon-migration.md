# ADR 007: Workspace Database Migration to Neon PostgreSQL

**Status**: Proposed  
**Date**: 2025-11-03  
**Deciders**: Architecture Team, Database Team  
**Technical Story**: Migrate Workspace app from shared TimescaleDB to dedicated Neon PostgreSQL instance

---

## Context

The Workspace application currently uses a shared TimescaleDB instance (`APPS-WORKSPACE` database) that also hosts the TP Capital application. This shared approach was pragmatic for initial development but presents several challenges:

### Current Architecture Issues

1. **Resource Contention**: TP Capital's time-series workload competes with Workspace's CRUD operations
2. **Deployment Coupling**: Schema changes require coordination between teams
3. **Scaling Limitations**: Cannot independently scale resources for each application
4. **Testing Complexity**: Difficult to create isolated test environments
5. **Recovery Risks**: Database failures affect both applications simultaneously

### Application Characteristics

**Workspace App:**
- CRUD-heavy workload (Create, Read, Update, Delete)
- ~10k items expected (internal tool)
- 80% reads, 20% writes
- No time-series requirements
- Needs: database branching for testing migrations

**TP Capital App:**
- Time-series data (Telegram signals)
- High-frequency inserts (100+ signals/day)
- Analytical queries over time windows
- Retention policies (90 days)
- Needs: TimescaleDB hypertables

---

## Decision

**We will migrate the Workspace application to a dedicated Neon PostgreSQL instance running in Docker containers.**

### Why Neon?

After evaluating three database options, we selected Neon for the following reasons:

#### Evaluated Options

1. **PostgreSQL 16 (vanilla)** - Pros: Simple, reliable. Cons: No advanced features
2. **MongoDB** - Pros: Flexible schema. Cons: Requires code refactoring, different query language
3. **Neon PostgreSQL** ✅ **Selected** - Pros: PostgreSQL-compatible, database branching, modern architecture

#### Key Decision Factors

| Factor | Weight | Neon Score | Notes |
|--------|--------|-----------|-------|
| **Zero Code Refactoring** | Critical | ✅ 10/10 | 100% PostgreSQL compatible |
| **Database Branching** | High | ✅ 10/10 | Native Git-like branching |
| **Container Support** | High | ✅ 9/10 | Open-source Neon Local available |
| **Operational Simplicity** | Medium | ⚠️ 6/10 | More complex than vanilla PostgreSQL |
| **Resource Efficiency** | Medium | ✅ 9/10 | Scale-to-zero capability |
| **Community Support** | Low | ⚠️ 7/10 | Growing community, active development |

---

## Implementation Strategy

### Phase 1: Setup Neon Infrastructure
- ✅ Docker Compose configuration (pageserver, safekeeper, compute)
- ✅ Initialization scripts for schema creation
- ✅ Network configuration and port mapping

### Phase 2: Code Adaptation
- ✅ NeonClient implementation (pg driver wrapper)
- ✅ Configuration management (neonConfig)
- ✅ Factory pattern for database strategy switching

### Phase 3: Data Migration
- ✅ Export TimescaleDB data (workspace_items, workspace_categories)
- ✅ Import into Neon with integrity checks
- ✅ Verification scripts for data consistency

### Phase 4: Testing & Validation
- ✅ Connection test suite (10 automated tests)
- ⏳ Unit test updates for Neon strategy
- ⏳ Integration tests with real Neon instance
- ⏳ Performance benchmarks vs TimescaleDB

### Phase 5: Documentation & Rollout
- ✅ Setup guide (neon-setup.mdx)
- ✅ Migration runbook
- ⏳ Team training sessions
- ⏳ Gradual rollout with feature flag

---

## Consequences

### Positive

1. **Isolation**: Workspace has dedicated resources, no contention
2. **Testing**: Database branching enables safe migration testing
3. **Scalability**: Can scale Workspace independently of TP Capital
4. **Modern Architecture**: Separated storage/compute aligns with best practices
5. **Flexibility**: Easy to add read replicas or scale resources

### Negative

1. **Operational Complexity**: Three Neon containers vs one TimescaleDB
2. **Learning Curve**: Team needs to learn Neon-specific features
3. **Resource Usage**: Additional ~2GB RAM for Neon stack
4. **Maturity**: Neon is newer than PostgreSQL/TimescaleDB

### Neutral

1. **Cost**: Similar resource requirements in development
2. **Performance**: Expected to be comparable to TimescaleDB for CRUD workload

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Neon Local instability** | Medium | High | Keep TimescaleDB as fallback for 2 weeks |
| **Performance degradation** | Low | Medium | Benchmark before full migration; optimize indexes |
| **Team resistance** | Low | Low | Provide training; document benefits clearly |
| **Migration data loss** | Very Low | Critical | Automated backups before migration; verification scripts |
| **Container orchestration issues** | Medium | Medium | Comprehensive health checks; auto-restart policies |

---

## Alternatives Considered

### Alternative 1: PostgreSQL 16 (Vanilla)

**Pros:**
- Simplest solution (1 container)
- Mature and stable
- Zero learning curve
- Lightweight (80MB image)

**Cons:**
- No database branching (manual dumps required)
- No autoscaling features
- Less "future-proof"

**Why Rejected:** Database branching is valuable for testing migrations safely. The operational overhead of Neon is acceptable for this benefit.

---

### Alternative 2: MongoDB

**Pros:**
- Flexible schema (document model)
- Excellent horizontal scaling
- Native JSON support

**Cons:**
- Requires complete code refactoring
- Team lacks MongoDB expertise
- Different query language (learning curve)
- Loss of SQL transaction guarantees

**Why Rejected:** High migration cost (2+ weeks refactoring) not justified for Workspace's simple CRUD needs. PostgreSQL's JSONB already provides flexibility.

---

### Alternative 3: Keep Shared TimescaleDB

**Pros:**
- No migration required
- Familiar technology
- Single database to manage

**Cons:**
- Continues resource contention issues
- Blocks independent scaling
- Tight coupling between apps

**Why Rejected:** Technical debt accumulation. Better to solve isolation now than defer to future when it's harder.

---

## Technical Details

### Architecture

```
┌─────────────────────────────────────────┐
│ Workspace API (Port 3200)              │
│ - Express.js                            │
│ - NeonClient (pg wrapper)               │
└────────────┬────────────────────────────┘
             │ PostgreSQL Protocol
             ↓
┌─────────────────────────────────────────┐
│ Neon Compute (Port 5433)                │
│ - PostgreSQL 17                         │
│ - Connection pooling (max: 20)          │
└────────────┬───────────┬────────────────┘
             │           │
     ┌───────┘           └───────┐
     ↓                           ↓
┌──────────────┐        ┌──────────────┐
│ Neon         │        │ Neon         │
│ Pageserver   │←──────→│ Safekeeper   │
│ (Storage)    │  WAL   │ (WAL)        │
└──────────────┘        └──────────────┘
```

### Data Model

**Schema:** `workspace`
**Tables:**
- `workspace_items` (~10k rows expected)
- `workspace_categories` (6 rows)

**Indexes:**
- GIN indexes on `tags[]` and `metadata JSONB`
- B-tree indexes on `category`, `status`, `priority`, `created_at`

**No changes to data model** - 100% compatible with TimescaleDB schema.

---

## Rollback Plan

If Neon proves problematic:

### Step 1: Immediate Fallback
```bash
# Revert to TimescaleDB
export LIBRARY_DB_STRATEGY=timescaledb
docker compose restart workspace
```

### Step 2: Data Preservation
- TimescaleDB data retained for 14 days post-migration
- Daily backups of both databases during transition period

### Step 3: Decision Points
- **Day 3**: Performance review (if &lt;200ms API response, proceed)
- **Day 7**: Stability review (if &lt;1 incident, proceed)
- **Day 14**: Final go/no-go decision

---

## Success Criteria

- ✅ Zero data loss during migration
- ✅ API response times ≤ 200ms (current baseline)
- ✅ All unit tests pass with Neon strategy
- ✅ Database branching working (create/delete branches)
- ✅ Zero downtime migration process
- ⏳ Team can operate Neon confidently (training complete)
- ⏳ 7 days of stable operation (no P1 incidents)

---

## Future Considerations

### Potential Enhancements
1. **Read Replicas**: Add read-only replicas for analytics queries
2. **Cloud Migration**: Evaluate neon.tech managed service for production
3. **CI/CD Integration**: Database branch per PR in GitHub Actions
4. **Backup Automation**: S3/GCS backups with point-in-time recovery

### Other Services
If Neon proves successful for Workspace:
- Consider migrating Documentation API to Neon
- Keep TP Capital on TimescaleDB (time-series workload better fit)

---

## References

- [Neon GitHub Repository](https://github.com/neondatabase/neon)
- [Neon Setup Guide](../../database/neon-setup.mdx)
- [Workspace Architecture Review](../../architecture-2025-11-01/workspace-api.md)
- [TimescaleDB vs Neon Comparison](../../database/db-comparison.md)

---

## Decision Log

| Date | Status | Notes |
|------|--------|-------|
| 2025-11-03 | Proposed | Initial ADR drafted, implementation started |
| 2025-11-10 (planned) | Review | Architecture review meeting |
| 2025-11-17 (planned) | Accepted/Rejected | Final decision after 7-day trial |

---

**Authors**: Architecture Team  
**Reviewers**: Database Team, DevOps Team  
**Next Review**: 2025-11-10

---

## Appendix: Performance Benchmarks

### Expected Performance (Target)

| Operation | Current (TimescaleDB) | Target (Neon) | Status |
|-----------|----------------------|---------------|--------|
| `GET /api/items` | 150ms | ≤200ms | ⏳ To measure |
| `POST /api/items` | 80ms | ≤100ms | ⏳ To measure |
| `PUT /api/items/:id` | 90ms | ≤100ms | ⏳ To measure |
| `DELETE /api/items/:id` | 60ms | ≤80ms | ⏳ To measure |

### Resource Usage

| Metric | TimescaleDB (Shared) | Neon (Dedicated) |
|--------|---------------------|------------------|
| RAM | ~512MB (shared) | ~2GB (3 containers) |
| Disk | Shared | ~5GB (dedicated) |
| CPU | Shared (contention) | Dedicated (no contention) |

---

**Status Legend:**
- ✅ Complete
- ⏳ In Progress
- ❌ Blocked
- 📋 Planned


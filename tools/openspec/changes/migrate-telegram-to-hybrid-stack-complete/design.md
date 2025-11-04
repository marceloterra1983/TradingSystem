# Design Document: Telegram Hybrid Stack Architecture

## Context

The Telegram Gateway is a critical component for ingesting trading signals from Telegram channels. Current architecture uses containerized MTProto service with shared TimescaleDB, resulting in:
- Session management risks (Docker volume issues)
- Resource contention (shared database)
- Performance bottlenecks (no caching layer)
- Tight coupling (direct database access)

**Stakeholders:**
- Trading Operations (rely on real-time signals)
- DevOps Team (manage infrastructure)
- TP Capital consumers (polling worker)
- Architecture Team (system reliability)

**Constraints:**
- Zero data loss acceptable
- Maximum 4 hours downtime for migration
- Must maintain backwards compatibility for external consumers
- Budget: +$0-200/month acceptable

---

## Goals / Non-Goals

### Goals
1. **Eliminate session file risk** - Native filesystem (no Docker volumes)
2. **Improve performance 80%+** - Redis cache layer (<10ms polling)
3. **Isolate resources** - Dedicated TimescaleDB container
4. **Enable horizontal scaling** - Redis cluster + RabbitMQ queue
5. **Comprehensive monitoring** - Prometheus + Grafana + 6 dashboards

### Non-Goals
1. **Kubernetes migration** - Stick with Docker Compose for now
2. **Multi-region deployment** - Single datacenter/host only
3. **Message transformation** - Keep current signal parsing logic unchanged
4. **Real-time push notifications** - Continue with polling pattern (queue is optional)

---

## Technical Decisions

### Decision 1: Native MTProto vs Container

**Options Considered:**

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Native (systemd)** | ✅ Session security<br>✅ Max performance<br>✅ Fast restart | ⚠️ Inconsistent with other services<br>⚠️ Manual setup | **9/10** ✅ |
| **Container** | ✅ Portability<br>✅ Consistency | ❌ Volume risk<br>⚠️ Performance overhead | 7/10 |
| **Kubernetes Pod** | ✅ Cloud-ready | ❌ Overkill<br>❌ Operational complexity | 5/10 |

**Decision:** **Native systemd service**

**Rationale:**
- Session files are **single point of failure** - corruption = manual re-auth (30+ min downtime)
- Performance critical path (< 500ms requirement)
- systemd is battle-tested for production Linux services
- Project already runs Windows native services (Data Capture, Order Manager planned)

**Trade-off Accepted:** Slight inconsistency in deployment (native vs containers) is acceptable given security benefits.

---

### Decision 2: Shared vs Dedicated TimescaleDB

**Options Considered:**

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Shared (current)** | ✅ Simple<br>✅ Lower cost | ❌ Resource contention<br>❌ Blast radius | 6/10 |
| **Dedicated Container** | ✅ Isolation<br>✅ Scalable<br>✅ Monitoring | ⚠️ +$50-100/month | **9/10** ✅ |
| **Dedicated VM** | ✅ Max performance | ❌ Overkill<br>❌ High cost | 4/10 |

**Decision:** **Dedicated Docker container**

**Rationale:**
- Telegram is high-traffic service (20-50 msg/s)
- Isolation prevents analytics queries from impacting real-time ingestion
- Cost increase (+$50/month local) justified by reliability gains
- Enables independent scaling (can add read replicas later)

---

### Decision 3: Cache Strategy - Redis vs Other

**Options Considered:**

| Technology | Use Case Fit | Performance | Complexity | Score |
|------------|--------------|-------------|------------|-------|
| **Redis** | ✅ Perfect | ✅ <10ms | ✅ Simple | **10/10** ✅ |
| **Memcached** | ✅ Good | ✅ <10ms | ✅ Simple | 8/10 |
| **In-Memory (Node.js)** | ⚠️ Limited | ✅ <5ms | ✅ Very simple | 6/10 |
| **DynamoDB** | ⚠️ Overkill | ⚠️ 20-50ms | ❌ Complex | 4/10 |

**Decision:** **Redis Cluster (Master + Replica + Sentinel)**

**Rationale:**
- TTL support (auto-expiration)
- Sorted sets perfect for time-ordered messages
- Sentinel provides automatic failover
- Rich data structures (strings, sets, sorted sets, hashes)
- Project familiarity (already used in other services)

**Trade-off:** +$150/month cost justified by 80% latency reduction.

---

### Decision 4: Queue Layer - RabbitMQ vs Kafka vs None

**Options Considered:**

| Option | Decoupling | Throughput | Complexity | Cost | Score |
|--------|------------|------------|------------|------|-------|
| **RabbitMQ** | ✅ Full | ✅ 10K msg/s | ⚠️ Medium | +$180/mo | **8/10** ✅ |
| **Kafka** | ✅ Full | ✅ 100K msg/s | ❌ High | +$300/mo | 6/10 |
| **None (Polling)** | ❌ Tight coupling | ✅ 50 msg/s | ✅ Simple | $0 | 7/10 |
| **AWS SQS** | ✅ Managed | ✅ Scalable | ⚠️ Cloud dependency | +$50/mo | 5/10 |

**Decision:** **RabbitMQ with optional flag**

**Rationale:**
- Provides decoupling without Kafka complexity
- Sufficient throughput (10K msg/s >> 50 msg/s current)
- Management UI for debugging
- Can be disabled initially (use polling) and enabled later

**Implementation Strategy:**
- **Phase 1:** Polling only (Redis cache)
- **Phase 2:** Add RabbitMQ when multiple consumers needed

---

### Decision 5: Connection Pooling - PgBouncer Mandatory

**Decision:** **PgBouncer in transaction mode (pool size 20)**

**Rationale** (from prior experience):
- Multiple clients (3): Gateway native, TP Capital, Gateway API
- Without pooling: Each maintains 20 connections = 60 total
- With PgBouncer: 20 pooled connections shared = 67% reduction
- Transaction mode optimal for this workload (short queries)

**Configuration:**
```ini
pool_mode = transaction
default_pool_size = 20
max_client_conn = 100
server_idle_timeout = 600
```

**Performance Impact:**
- Connection overhead: 50ms → 5ms
- Database connections: 60 → 20 (67% reduction)

---

## Data Model Changes

### Redis Schema Design

```
Keys:
telegram:msg:{channel_id}:{message_id}         - Message hash (TTL: 1h)
telegram:dedup:{channel_id}:{message_id}       - Dedup flag (TTL: 2h)
telegram:channel:{channel_id}:recent           - Sorted set (score: timestamp)

Example:
SET telegram:msg:-1001649127710:123456 '{"text":"BUY PETR4...","status":"received"}' EX 3600
ZADD telegram:channel:-1001649127710:recent 1730649600000 123456
SET telegram:dedup:-1001649127710:123456 "1" EX 7200
```

### TimescaleDB Schema (No Changes)

Existing tables remain unchanged:
- `telegram_gateway.messages` (hypertable)
- `telegram_gateway.channels`
- `telegram_gateway.forwarding_rules`

**New optimizations:**
- 5 partial indexes
- 2 continuous aggregates
- 3 helper functions

---

## Migration Strategy

### Phase 1: Parallel Deployment (Blue-Green)

```
Day 1: Deploy new stack (containers + native) on different ports
       - TimescaleDB: 5434 (new) vs 5433 (old)
       - Gateway: Keep old running on 4006
       
Day 2: Migrate data
       - pg_dump from old DB
       - pg_restore to new DB
       - Verify row counts match
       
Day 3: Traffic shift
       - 10% traffic to new stack (test)
       - Monitor metrics for 24h
       - 50% traffic if OK
       - Monitor metrics for 24h
       - 100% traffic if OK
       
Day 4: Decommission old stack
       - Stop old container
       - Archive old volumes
       - Update documentation
```

### Phase 2: Validation

```bash
# Before migration
bash scripts/telegram/benchmark-current.sh > baseline.json

# After migration
bash scripts/telegram/benchmark-hybrid.sh > hybrid.json

# Compare
python scripts/telegram/compare-benchmarks.py baseline.json hybrid.json

# Expected output:
# ✅ Polling latency: 50ms → 10ms (↓ 80%)
# ✅ Dedup latency: 20ms → 2ms (↓ 90%)
# ✅ Update latency: 200ms → 5ms (↓ 97%)
```

---

## Risks & Trade-offs

### Risk 1: Session Loss During Migration
**Probability:** Low (5%)  
**Impact:** Critical (30+ min downtime)  
**Mitigation:**
- Backup `.session/` to 3 locations (local, cloud, external drive)
- Test restore procedure before migration
- Keep old container running during transition
- Document re-auth procedure for emergency

---

### Risk 2: Performance Regression
**Probability:** Medium (20%)  
**Impact:** High (user experience degradation)  
**Mitigation:**
- Benchmark before/after (automated script)
- Gradual traffic shift (10% → 50% → 100%)
- Automatic rollback if latency >20% worse
- Monitoring dashboards with real-time comparison

---

### Risk 3: Redis Cache Inconsistency
**Probability:** Medium (15%)  
**Impact:** Medium (duplicate signals)  
**Mitigation:**
- Implement cache-aside pattern (DB is source of truth)
- TTL ensures eventual consistency (max 1h drift)
- Monitoring alert if cache hit rate < 70%
- Fallback to DB if Redis unavailable

---

### Risk 4: Operational Complexity
**Probability:** High (40%)  
**Impact:** Low (learning curve)  
**Mitigation:**
- Comprehensive runbook (6 MDX guides)
- Automated scripts (start/stop/health-check)
- Training session for DevOps team
- 24/7 on-call support for first week

---

## Alternative Architectures Considered

### Alternative 1: Full Container Stack (No Native Service)
**Rejected** because:
- Session files in Docker volumes = unacceptable risk
- Volume corruption incidents in Oct 2025
- Native is only 5-10ms slower (acceptable trade-off)

### Alternative 2: No Redis (TimescaleDB Only)
**Rejected** because:
- Cannot achieve <10ms polling target
- Database load remains high (100%)
- No quick wins for performance improvement

### Alternative 3: Kafka Instead of RabbitMQ
**Rejected** because:
- Overkill for 50 msg/s (Kafka designed for 100K+ msg/s)
- Higher operational complexity
- Cost 2x higher (+$300/month vs +$180/month)

### Alternative 4: Managed Services (AWS RDS, ElastiCache, etc)
**Rejected** because:
- Project requirement: 100% on-premise
- Vendor lock-in concerns
- Higher cost ($500+/month vs $200/month local)

---

## Migration Plan

### Pre-Migration Checklist
- [ ] Backup all session files (`.session/`)
- [ ] Dump telegram_gateway schema from shared DB
- [ ] Verify backup integrity (restore test)
- [ ] Schedule deployment window (4h Saturday 2-6am)
- [ ] Notify stakeholders (trading ops, DevOps)
- [ ] Prepare rollback procedure

### Migration Steps (Automated via Script)
1. **Stop old Gateway container** (save state)
2. **Start new Docker stack** (7 containers)
3. **Wait for health checks** (TimescaleDB, Redis, RabbitMQ)
4. **Restore database dump** to new TimescaleDB
5. **Verify data integrity** (row counts, indexes)
6. **Start native MTProto service** (systemd)
7. **Run integration tests** (end-to-end flow)
8. **Monitor for 1 hour** (health checks, metrics)
9. **Decommission old stack** (stop containers)

### Post-Migration Validation
- [ ] End-to-end message flow working
- [ ] Performance targets met (<10ms polling)
- [ ] Zero data loss confirmed
- [ ] Monitoring dashboards operational
- [ ] Alerts configured and tested
- [ ] Documentation updated

---

## Monitoring & Observability

### Key Metrics

**Service Level Indicators (SLIs):**
- Message ingestion success rate: >99.9%
- Polling latency p95: <15ms
- Deduplication accuracy: 100%
- Cache hit rate: >70%
- End-to-end latency p95: <1s

**Service Level Objectives (SLOs):**
- Availability: 99.9% (monthly)
- Ingestion latency: <500ms (p95)
- Processing latency: <10s (p95)

**Alerting Rules (8 total):**
1. Gateway down >2min (critical)
2. Polling lag >30s (critical)
3. Redis cluster down (critical)
4. Database pool exhausted (warning)
5. Queue depth >500 messages (warning)
6. Cache hit rate <50% (warning)
7. Disk space <2GB (warning)
8. Memory usage >80% (warning)

---

## Open Questions

### Q1: Should RabbitMQ be mandatory or optional initially?
**Recommendation:** Optional (Phase 2)
- **Phase 1:** Implement Redis cache only (simpler, lower risk)
- **Phase 2:** Add RabbitMQ when multiple consumers needed

### Q2: Redis persistence - AOF or RDB?
**Recommendation:** No persistence (pure cache)
- TTL auto-expires data (1-2h)
- Database is source of truth
- Restart = rebuild cache from DB (acceptable 5min recovery)

### Q3: TimescaleDB read replicas needed?
**Recommendation:** Not initially
- Current load: 20 msg/s (well within single instance capacity)
- Add replicas when analytics impact OLTP (monitor pg_stat_activity)

### Q4: Monitoring stack separate or integrated?
**Recommendation:** Integrated in Telegram stack
- Easier deployment (single docker compose)
- Telegram-specific dashboards
- Can share global Prometheus/Grafana if exists

---

## Performance Benchmarks

### Expected Improvements (from analysis)

```
Operation: Fetch Unprocessed Messages
- Current: TimescaleDB query (50ms)
- Target: Redis ZRANGE (10ms)
- Improvement: 80%

Operation: Check Duplicate
- Current: SQL SELECT (20ms)
- Target: Redis EXISTS (2ms)
- Improvement: 90%

Operation: Update Status
- Current: SQL UPDATE on hypertable (200ms)
- Target: Redis SETEX (5ms) + async DB update
- Improvement: 97% (perceived)

End-to-End Latency:
- Current: 5.9 seconds
- Target: 530ms
- Improvement: 91%
```

---

## Rollback Criteria

**Trigger rollback if:**
1. Data loss detected (row count mismatch)
2. Performance degradation >20% (latency increase)
3. Availability <99% within first 24h
4. Critical bugs in new code (session loss, data corruption)
5. Stakeholder veto (trading ops disapproval)

**Rollback Process:** Automated script (`rollback-migration.sh`) - Estimated time: 30 min

---

## Security Considerations

### Session File Security (Enhanced)
**Before:** Docker volume (permissions inconsistent)  
**After:** Native filesystem (0600, owner-only)

```bash
# Permissions enforcement
chmod 600 /opt/telegram-gateway/.session/*
chown marce:marce /opt/telegram-gateway/.session/*
```

### Database Credentials
**Before:** Single shared password for all schemas  
**After:** Dedicated user `telegram` with minimal permissions

```sql
CREATE USER telegram WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE telegram_gateway TO telegram;
GRANT USAGE ON SCHEMA telegram_gateway TO telegram;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA telegram_gateway TO telegram;
```

### API Authentication (Unchanged)
- X-Gateway-Token for Gateway API
- X-API-Key for external consumers
- Constant-time comparison (prevents timing attacks)

---

## Cost Analysis

### Infrastructure Costs (Monthly)

| Component | Current | Proposed | Delta |
|-----------|---------|----------|-------|
| Shared TimescaleDB | $200 | $0 | -$200 |
| Dedicated TimescaleDB | $0 | $200 | +$200 |
| PgBouncer | $0 | $10 | +$10 |
| Redis Cluster | $0 | $150 | +$150 |
| RabbitMQ | $0 | $180 | +$180 |
| Monitoring (Prometheus/Grafana) | $0 | $50 | +$50 |
| **TOTAL** | **$200** | **$590** | **+$390** |

**Cost Justification:**
- Performance: 80-95% improvement
- Reliability: 99.0% → 99.9% availability (+0.9%)
- Scalability: Enables 2.5x throughput (20 → 50 msg/s)
- **Break-even:** At 50 msg/s, cheaper than scaling current architecture

**Alternative (Minimal):**
- Phase 1 only (Redis + PgBouncer): +$160/month
- Phase 2 optional (RabbitMQ + Monitoring): +$230/month when needed

---

## Success Metrics

### Technical Metrics
- ✅ Polling latency <10ms (current: 50ms)
- ✅ Dedup latency <2ms (current: 20ms)
- ✅ Update latency <5ms perceived (current: 200ms)
- ✅ Cache hit rate >70%
- ✅ Database CPU <30% (current: 60%)

### Business Metrics
- ✅ Zero message loss during migration
- ✅ Downtime <4 hours
- ✅ No manual interventions required post-migration
- ✅ Cost increase justified by performance gains

### Operational Metrics
- ✅ Automated deployment (single script)
- ✅ Comprehensive monitoring (6 dashboards)
- ✅ Alert response time <5min
- ✅ MTTR <15min (current: 30min)

---

## Documentation Deliverables

### Architecture Diagrams (PlantUML)
1. `telegram-hybrid-architecture.puml` - Full stack topology
2. `telegram-hybrid-with-monitoring.puml` - Including Prometheus/Grafana
3. `telegram-redis-cache-flow.puml` - Cache interaction sequence
4. `telegram-deployment-layers.puml` - Native vs container layers

### Operational Guides (MDX)
1. `hybrid-deployment.mdx` - Deployment procedures
2. `monitoring-guide.mdx` - Metrics, dashboards, alerts
3. `redis-cache-guide.mdx` - Cache patterns, TTL, eviction
4. `performance-tuning.mdx` - Database, cache, queue tuning
5. `troubleshooting.mdx` - Common issues, debugging
6. `migration-runbook.mdx` - Step-by-step migration

**All diagrams will render in Docusaurus via PlantUML plugin.**

---

## Approval Sign-off

**Reviewed By:**
- [ ] Architecture Lead: _______________ Date: _______
- [ ] Database Architect: _______________ Date: _______
- [ ] DevOps Lead: _______________ Date: _______
- [ ] Product Owner: _______________ Date: _______

**Approved for Implementation:** Yes / No  
**Deployment Window Approved:** Saturday 2025-11-__ 2am-6am  
**Budget Approved:** +$390/month (or +$160/month Phase 1 only)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-03  
**Next Review:** After Phase 1 completion


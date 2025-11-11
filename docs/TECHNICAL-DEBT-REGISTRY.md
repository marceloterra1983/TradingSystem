# Technical Debt Registry

**Last Updated:** 2025-11-11
**Total Items:** 8
**High Priority:** 3
**Medium Priority:** 3
**Low Priority:** 2

---

## 🎯 Overview

This registry tracks all known technical debt items across the TradingSystem project. Items are prioritized by impact and effort, with clear ownership and resolution plans.

---

## 📊 High Priority (P1) - Address in Phase 3

### TD-001: PWA Plugin Compatibility

**Category:** Frontend
**Status:** 🔴 Active
**Discovered:** Phase 2.3 (2025-11-11)
**Impact:** Medium (no offline support, no browser caching)

**Description:**
vite-plugin-pwa@1.1.0 (2021) is incompatible with Vite 7 (2024) and fails to generate service worker files. This prevents offline functionality and browser caching optimization.

**Current Workaround:** Native browser caching (~50-70% hit rate)
**Proper Solution:** Upgrade to vite-plugin-pwa@0.20.x

**Effort Estimate:** 1 day (8 hours)
**Business Impact:** $$ (Medium - affects user experience on repeat visits)

**Resolution Plan:**
1. Upgrade vite-plugin-pwa to 0.20.x
2. Update configuration for new API
3. Test service worker generation
4. Validate offline functionality
5. Measure performance impact

**Owner:** Frontend Team
**Target:** Phase 3, Week 1
**Documentation:** [PHASE-2-3-PWA-LIMITATION.md](PHASE-2-3-PWA-LIMITATION.md)

---

### TD-002: No API Gateway

**Category:** Infrastructure
**Status:** 🔴 Active
**Discovered:** Architecture Review (2025-11-01)
**Impact:** High (security, performance, maintainability)

**Description:**
No centralized API gateway for authentication, rate limiting, and request routing. Each service handles auth independently, leading to duplication and inconsistency.

**Current Workaround:** Per-service authentication middleware
**Proper Solution:** Implement Kong or enhanced Traefik gateway

**Effort Estimate:** 2 weeks (80 hours)
**Business Impact:** $$$ (High - affects security and scalability)

**Resolution Plan:**
1. Evaluate Kong vs Traefik enhancements
2. Implement centralized JWT validation
3. Configure rate limiting (per user/service)
4. Migrate all services to gateway routing
5. Add monitoring and alerting

**Owner:** Backend + DevOps Teams
**Target:** Phase 3, Weeks 1-2
**Documentation:** [PHASE-3-SCOPE.md](PHASE-3-SCOPE.md#epic-1-api-gateway)

---

### TD-003: No Inter-Service Authentication

**Category:** Security
**Status:** 🔴 Active
**Discovered:** Architecture Review (2025-11-01)
**Impact:** High (security vulnerability)

**Description:**
Services trust each other without verification. Internal endpoints are exposed without authentication. This creates a security risk in production environments.

**Current Workaround:** Network-level isolation (Docker networks)
**Proper Solution:** JWT-based service-to-service authentication

**Effort Estimate:** 1 week (40 hours)
**Business Impact:** $$$$ (Critical - security vulnerability)

**Resolution Plan:**
1. Design service identity system
2. Implement JWT token generation/validation
3. Create service registry
4. Update all inter-service calls
5. Security audit

**Owner:** Backend Team
**Target:** Phase 3, Week 3
**Documentation:** [PHASE-3-SCOPE.md](PHASE-3-SCOPE.md#epic-2-inter-service-authentication)

---

## 📊 Medium Priority (P2) - Address in Phase 3-4

### TD-004: Single Database Instance (No HA)

**Category:** Infrastructure
**Status:** 🟡 Active
**Discovered:** Architecture Review (2025-11-01)
**Impact:** High (no high availability)

**Description:**
Single TimescaleDB instance with no read replicas. This creates a single point of failure and limits read throughput. Database downtime affects entire system.

**Current Workaround:** Regular backups, manual failover procedures
**Proper Solution:** PostgreSQL streaming replication with automatic failover

**Effort Estimate:** 3 weeks (120 hours)
**Business Impact:** $$$ (High - affects uptime and scalability)

**Resolution Plan:**
1. Setup PostgreSQL streaming replication
2. Configure read/write connection pooling split
3. Implement Patroni/Stolon for automatic failover
4. Test failover scenarios
5. Performance validation

**Owner:** Backend + DevOps Teams
**Target:** Phase 3, Weeks 3-6
**Documentation:** [PHASE-3-SCOPE.md](PHASE-3-SCOPE.md#epic-3-database-read-replicas)

---

### TD-005: No API Versioning

**Category:** API Design
**Status:** 🟡 Active
**Discovered:** Architecture Review (2025-11-01)
**Impact:** Medium (breaking changes affect clients)

**Description:**
No API versioning strategy. Breaking changes require coordinated client updates. This makes it difficult to deprecate old endpoints or introduce new features.

**Current Workaround:** Careful backward compatibility
**Proper Solution:** URL-based versioning (/api/v1/, /api/v2/)

**Effort Estimate:** 1 week (40 hours)
**Business Impact:** $$ (Medium - affects agility)

**Resolution Plan:**
1. Define versioning strategy (URL-based)
2. Create v1 namespace for existing APIs
3. Document deprecation policy
4. Implement version detection in clients
5. Migration guide for future versions

**Owner:** Backend Team
**Target:** Phase 4, Week 1
**Documentation:** TBD

---

### TD-006: Limited Test Coverage (~30%)

**Category:** Testing
**Status:** 🟡 Active
**Discovered:** Architecture Review (2025-11-01)
**Impact:** Medium (regression risk)

**Description:**
Test coverage is approximately 30%, below industry standard of 80%. This increases risk of regressions and makes refactoring difficult. No integration tests for critical paths.

**Current Workaround:** Manual testing, careful code review
**Proper Solution:** Comprehensive test suite (unit + integration + e2e)

**Effort Estimate:** 4 weeks (160 hours)
**Business Impact:** $$ (Medium - affects quality and velocity)

**Resolution Plan:**
1. Add unit tests for critical business logic
2. Create integration tests for API endpoints
3. Implement e2e tests for user flows
4. Setup coverage reporting in CI/CD
5. Enforce coverage thresholds (80%)

**Owner:** QA + Dev Teams
**Target:** Phase 4, Weeks 1-4
**Documentation:** TBD

---

## 📊 Low Priority (P3) - Address in Phase 4+

### TD-007: Frontend Bundle Size (644KB AI Agents Catalog)

**Category:** Frontend Performance
**Status:** 🟢 Acceptable
**Discovered:** Phase 2.3 (2025-11-11)
**Impact:** Low (data-heavy, compressible, lazy-loaded)

**Description:**
AI Agents catalog is 644KB uncompressed (largest bundle chunk). While gzipped to ~160KB and lazy-loaded, it could be optimized by moving data to API endpoint.

**Current Workaround:** Lazy loading, aggressive compression (75% reduction)
**Proper Solution:** API endpoint for AI catalog data

**Effort Estimate:** 1 week (40 hours)
**Business Impact:** $ (Low - incremental improvement)

**Resolution Plan:**
1. Create API endpoint for AI agents catalog
2. Implement client-side fetching with caching
3. Add search/filter on backend
4. Update frontend to use API
5. Measure bundle size reduction

**Owner:** Frontend + Backend Teams
**Target:** Phase 4, Week 5
**Documentation:** [PHASE-2-3-FINAL-REPORT.md](PHASE-2-3-FINAL-REPORT.md#bundle-size-analysis)

---

### TD-008: No Circuit Breakers

**Category:** Reliability
**Status:** 🟢 Acceptable
**Discovered:** Architecture Review (2025-11-01)
**Impact:** Low (affects resilience under failure)

**Description:**
No circuit breakers for external calls (WebSocket, ProfitDLL paths). This can lead to cascading failures when dependencies are unavailable.

**Current Workaround:** Timeout configurations, error handling
**Proper Solution:** Implement circuit breakers with Opossum or similar

**Effort Estimate:** 1 week (40 hours)
**Business Impact:** $ (Low - defense in depth)

**Resolution Plan:**
1. Identify critical external dependencies
2. Implement circuit breakers with Opossum
3. Configure thresholds (error rate, timeout)
4. Add monitoring for breaker states
5. Test failure scenarios

**Owner:** Backend Team
**Target:** Phase 4, Week 6
**Documentation:** TBD

---

## 📈 Debt Metrics

### By Priority

| Priority | Count | Total Effort | Business Impact |
|----------|-------|--------------|-----------------|
| **P1 (High)** | 3 | 21 days | Critical |
| **P2 (Medium)** | 3 | 31 days | High |
| **P3 (Low)** | 2 | 10 days | Medium |
| **TOTAL** | 8 | 62 days | - |

### By Category

| Category | Count | Total Effort |
|----------|-------|--------------|
| **Infrastructure** | 2 | 17 days |
| **Security** | 1 | 5 days |
| **Frontend** | 2 | 6 days |
| **Backend** | 2 | 5 days |
| **Testing** | 1 | 20 days |

### By Target Phase

| Phase | Count | Total Effort |
|-------|-------|--------------|
| **Phase 3** | 4 | 24 days |
| **Phase 4** | 4 | 38 days |

---

## 🎯 Prioritization Matrix

### Impact vs Effort

```
High Impact │ TD-003 (1w) │ TD-002 (2w) │
            │ Inter-Svc  │ API Gateway │
            │ Auth       │             │
            ├────────────┼─────────────┤
            │ TD-001 (1d)│ TD-004 (3w) │
Medium      │ PWA Plugin │ DB Replicas │
Impact      │            │             │
            ├────────────┼─────────────┤
            │ TD-008 (1w)│ TD-006 (4w) │
Low Impact  │ Circuit    │ Test        │
            │ Breakers   │ Coverage    │
            └────────────┴─────────────┘
              Low Effort   High Effort
```

**Recommendation:** Address in order: TD-001 → TD-003 → TD-002 → TD-004

---

## 📝 Debt Addition Process

### How to Add New Debt

1. **Identify the issue** during development or review
2. **Assess impact** (High/Medium/Low)
3. **Estimate effort** (hours/days/weeks)
4. **Assign priority** (P1/P2/P3)
5. **Create entry** in this registry
6. **Link documentation** (ADR, issue tracker)
7. **Assign owner** and target phase

### Template

```markdown
### TD-XXX: [Title]

**Category:** [Infrastructure|Security|Frontend|Backend|Testing]
**Status:** [🔴 Active|🟡 Monitoring|🟢 Acceptable]
**Discovered:** [Date/Phase]
**Impact:** [High|Medium|Low] - [Description]

**Description:**
[What is the problem?]

**Current Workaround:** [How are we handling it now?]
**Proper Solution:** [What should we do?]

**Effort Estimate:** [Time]
**Business Impact:** [$ to $$$$]

**Resolution Plan:**
1. Step 1
2. Step 2
...

**Owner:** [Team/Person]
**Target:** [Phase X, Week Y]
**Documentation:** [Link]
```

---

## 🔄 Review Process

### Weekly Review
- Update status of active items
- Add newly discovered debt
- Reprioritize based on business needs
- Celebrate resolved items

### Monthly Review
- Analyze debt trends
- Report debt metrics to leadership
- Adjust Phase priorities if needed
- Plan debt reduction sprints

### Quarterly Review
- Strategic debt reduction planning
- Budget allocation for major items
- Team capacity planning
- Lessons learned

---

## ✅ Resolved Debt (Archive)

### Completed Items

**None yet** - This is the first registry!

---

## 📚 Related Documentation

- [PHASE-3-SCOPE.md](PHASE-3-SCOPE.md) - Phase 3 planning
- [PHASE-2-3-PWA-LIMITATION.md](PHASE-2-3-PWA-LIMITATION.md) - PWA issue details
- [Architecture Review 2025-11-01](governance/evidence/reports/reviews/architecture-2025-11-01/index.md) - Debt sources

---

## 🎯 Debt Reduction Goals

### Phase 3 Goal
- Resolve 4 high-priority items (TD-001, TD-002, TD-003, TD-004)
- Reduce total debt by 40% (24 days)

### Phase 4 Goal
- Resolve remaining medium-priority items
- Increase test coverage to 80%
- Reduce total debt by 60% (38 days)

### 2026 Goal
- All high/medium priority debt resolved
- Maintain debt < 10 days at any time
- Establish debt prevention processes

---

**Registry Status:** 🟢 Active
**Total Debt:** 62 days
**Priority Items:** 4 (Phase 3)
**Next Review:** Weekly (Mondays)

**Created:** 2025-11-11 | **Version:** 1.0 | **Status:** Active

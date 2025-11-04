# Architecture Review - [Product/System Name]

**Date:** YYYY-MM-DD
**Reviewer:** [Name]
**Scope:** [Backend | Frontend | Full Stack]
**Phase:** Architecture Analysis

---

## Executive Summary

**Overall Architecture Score:** X/100

**Key Findings:**
- [Finding 1]
- [Finding 2]
- [Finding 3]

**Critical Issues:** X P0, Y P1
**Recommendations:** Z actionable items

---

## 1. System Overview

### Current Architecture Pattern
- [ ] Monolithic
- [ ] Microservices
- [ ] Modular Monolith
- [ ] Serverless
- [ ] Hybrid

### Technology Stack
- **Backend:** [Languages, frameworks]
- **Frontend:** [Frameworks, libraries]
- **Databases:** [RDBMS, NoSQL, Cache]
- **Infrastructure:** [Containers, orchestration]

### Architecture Diagram
```
[Insert C4 Context/Container diagram or link to .puml file]
```

---

## 2. Clean Architecture Assessment

### Layering Score: X/100

| Layer | Implementation | Score | Issues |
|-------|----------------|-------|--------|
| Domain | [Good/Partial/Missing] | X/25 | [List issues] |
| Application | [Good/Partial/Missing] | X/25 | [List issues] |
| Infrastructure | [Good/Partial/Missing] | X/25 | [List issues] |
| Presentation | [Good/Partial/Missing] | X/25 | [List issues] |

**Key Issues:**
- ❌ **P0:** [Critical issue]
- ⚠️ **P1:** [High priority issue]
- ℹ️ **P2:** [Medium priority issue]

---

## 3. Domain-Driven Design (DDD)

### Bounded Contexts: X/100

| Context | Clarity | Boundaries | Dependencies | Score |
|---------|---------|------------|--------------|-------|
| [Context 1] | [Clear/Fuzzy] | [Well-defined/Leaky] | [Low/High coupling] | X/100 |
| [Context 2] | [Clear/Fuzzy] | [Well-defined/Leaky] | [Low/High coupling] | X/100 |

**Aggregates Identified:**
- `[AggregateName]` - [Description]
- `[AggregateName]` - [Description]

**Value Objects:**
- `[ValueObjectName]` - [Purpose]

**Domain Events:**
- `[EventName]` - [When triggered]

**Issues:**
- ❌ [Issue with bounded context separation]
- ⚠️ [Issue with aggregates]

---

## 4. Dependency Analysis

### Dependency Graph Score: X/100

**Coupling Analysis:**
- **Afferent Coupling (Ca):** [Number of incoming dependencies]
- **Efferent Coupling (Ce):** [Number of outgoing dependencies]
- **Instability (I = Ce / (Ca + Ce)):** [0-1, lower is more stable]

**Circular Dependencies Detected:**
```
Module A → Module B → Module C → Module A
```

**Recommendations:**
- [ ] Break circular dependency between [A, B, C]
- [ ] Introduce interface to decouple [X] from [Y]
- [ ] Extract shared logic into [Z]

---

## 5. Design Patterns Evaluation

### Patterns Identified

| Pattern | Location | Assessment | Issues |
|---------|----------|------------|--------|
| Singleton | [File/Class] | ✅ Appropriate | None |
| Factory | [File/Class] | ⚠️ Overused | [Issue] |
| Repository | [File/Class] | ✅ Well implemented | None |
| Observer | [File/Class] | ❌ Missing | [Needed for X] |

### Anti-Patterns Detected

| Anti-Pattern | Location | Impact | Recommendation |
|--------------|----------|--------|----------------|
| God Object | [Class] | HIGH | Decompose into [X, Y, Z] |
| Spaghetti Code | [Module] | MEDIUM | Refactor with [Pattern] |
| Big Ball of Mud | [Package] | HIGH | Establish clear boundaries |

---

## 6. Scalability Assessment

### Horizontal Scalability: X/100

**Stateless Services:**
- [ ] All services are stateless
- [x] Some services maintain state (list: [X, Y])
- [ ] Heavy use of in-memory state

**Database Scalability:**
- Read replicas: [Yes/No]
- Sharding strategy: [Implemented/Planned/None]
- Connection pooling: [Configured/Not configured]

**Bottlenecks Identified:**
1. [Bottleneck 1] - Impact: [HIGH/MEDIUM/LOW]
2. [Bottleneck 2] - Impact: [HIGH/MEDIUM/LOW]

---

## 7. Performance Considerations

### Performance Score: X/100

**Critical Paths Performance:**
| Path | Current P95 | Target P95 | Status |
|------|-------------|------------|--------|
| [Order Execution] | 850ms | <500ms | ❌ Needs optimization |
| [Data Fetch] | 320ms | <500ms | ✅ Within target |

**Caching Strategy:**
- [ ] Application-level cache (Redis/Memcached)
- [ ] Database query cache
- [ ] HTTP cache headers
- [ ] CDN for static assets

**Recommendations:**
- [ ] Implement caching for [X]
- [ ] Add indexes on [Table.Column]
- [ ] Optimize query [Y]

---

## 8. Security Architecture

### Security Score: X/100

**Authentication/Authorization:**
- Method: [JWT/Session/OAuth]
- Implementation: [Centralized/Distributed]
- Issues: [List security concerns]

**Data Protection:**
- [ ] Encryption at rest
- [ ] Encryption in transit (TLS)
- [ ] Secret management (Vault/ENV)
- [ ] Input validation
- [ ] SQL injection protection

**Vulnerabilities:**
- ❌ **CRITICAL:** [Vulnerability description]
- ⚠️ **HIGH:** [Vulnerability description]

---

## 9. Observability & Monitoring

### Observability Score: X/100

**Logging:**
- [ ] Structured logging (JSON)
- [ ] Centralized log aggregation
- [ ] Log levels properly used
- [ ] Sensitive data excluded

**Metrics:**
- [ ] Application metrics (Prometheus)
- [ ] Infrastructure metrics
- [ ] Business metrics
- [ ] Custom dashboards

**Tracing:**
- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] Correlation IDs
- [ ] Request tracing

**Gaps:**
- [ ] Missing metrics for [X]
- [ ] No alerts for [Y]
- [ ] Logs not queryable

---

## 10. Technical Debt Analysis

### Total Technical Debt: [X] person-weeks

| Category | Items | Effort | Priority |
|----------|-------|--------|----------|
| Architecture | X | Y weeks | P0/P1/P2 |
| Code Quality | X | Y weeks | P0/P1/P2 |
| Testing | X | Y weeks | P0/P1/P2 |
| Documentation | X | Y weeks | P0/P1/P2 |

**Debt Ratio:** X% (debt effort / total codebase effort)
**Recommended Max:** 20%

---

## 11. Recommendations

### Priority 0 (Critical - Block Production)
1. **[Issue Name]**
   - Impact: [Description]
   - Effort: [Hours/Days]
   - Deadline: [Date]
   - Owner: [TBD]

### Priority 1 (High - Address in Sprint 1-2)
1. **[Issue Name]**
   - Impact: [Description]
   - Effort: [Hours/Days]
   - Timeline: 2 weeks

### Priority 2 (Medium - Roadmap)
1. **[Issue Name]**
   - Impact: [Description]
   - Effort: [Hours/Days]
   - Timeline: 1-2 months

### Priority 3 (Low - Backlog)
1. **[Issue Name]**
   - Impact: [Description]
   - Effort: [Hours/Days]
   - Timeline: 3+ months

---

## 12. Architecture Decision Records (ADRs)

**ADRs Created/Updated:**
- [ ] ADR-XXX: [Decision title]
- [ ] ADR-YYY: [Decision title]

**ADRs Needed:**
- [ ] Decision on [microservices decomposition strategy]
- [ ] Decision on [event-driven architecture]
- [ ] Decision on [API gateway selection]

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Address all P0 issues
- [ ] Create missing ADRs
- [ ] Set up observability baseline
- **Deliverables:** [List]

### Phase 2: Core Improvements (Weeks 5-8)
- [ ] Implement P1 recommendations
- [ ] Refactor [critical modules]
- [ ] Add integration tests
- **Deliverables:** [List]

### Phase 3: Optimization (Weeks 9-12)
- [ ] Performance optimizations
- [ ] Scalability improvements
- [ ] Documentation updates
- **Deliverables:** [List]

---

## 14. Metrics & Success Criteria

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| Architecture Score | X/100 | 85/100 | 3 months |
| Technical Debt Ratio | X% | <20% | 6 months |
| Service Coupling | High | Low | 3 months |
| Test Coverage (Architecture tests) | X% | >80% | 2 months |

---

## Appendices

### A. Detailed Dependency Graph
[Link to generated dependency graph or embed diagram]

### B. Module Breakdown
[List of all modules with responsibility matrix]

### C. Code Metrics
- Lines of Code: X
- Number of Classes: Y
- Number of Functions: Z
- Cyclomatic Complexity (avg): W

### D. References
- [Link to C4 diagrams]
- [Link to ADRs]
- [Link to code repository]

---

**Review Status:** ✅ Complete / ⏳ In Progress / ❌ Blocked
**Next Review Date:** [Date]
**Reviewed By:** [Name]
**Approved By:** [Name]


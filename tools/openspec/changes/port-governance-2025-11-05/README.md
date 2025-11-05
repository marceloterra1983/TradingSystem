# OpenSpec Proposal: Port Governance & Connectivity

**ID:** port-governance-2025-11-05  
**Status:** 🔄 DRAFT  
**Priority:** P0 (Critical)  
**Created:** 2025-11-05  
**Owner:** Platform Architecture

---

## Quick Links

- **Proposal:** [proposal.md](./proposal.md) - Executive summary and problem statement
- **Design:** [design.md](./design.md) - Detailed architecture and technical design
- **Tasks:** [tasks.md](./tasks.md) - Implementation backlog (34 tasks, 15-20 days)
- **ADR:** [ADR-015](../../../docs/content/reference/adrs/015-port-governance.md) - Formal decision record

---

## Executive Summary

**Problem:** Port conflicts, hardcoded configurations, and fragile connectivity (ex.: Telegram MTProto ECONNREFUSED) cause frequent incidents and slow development.

**Solution:** Centralized port registry (`config/ports/registry.yaml`), automated config generation, CI enforcement, and full containerization.

**Impact:**
- ❌ **Before:** 8-12 conflicts/month, 1-2h resolution, 70% docs accuracy
- ✅ **After:** 0-1 conflicts/month, 5-10min resolution, 100% docs accuracy

**Effort:** 15-20 days across 5 phases

**Deliverables:**
1. Port registry (YAML)
2. Automation tools (sync, validate, scan)
3. CI/CD enforcement
4. Containerized MTProto
5. ADR + documentation
6. Team training

---

## Status

| Phase | Status | Progress |
|-------|--------|----------|
| 1. Preparation | 🔄 Not Started | 0/5 tasks |
| 2. Tooling | 🔄 Not Started | 0/8 tasks |
| 3. Migration | 🔄 Not Started | 0/10 tasks |
| 4. Enforcement | 🔄 Not Started | 0/6 tasks |
| 5. Cleanup | 🔄 Not Started | 0/5 tasks |
| **TOTAL** | **🔄 Not Started** | **0/34 tasks** |

---

## Getting Started

### 1. Read the Proposal

Start with [proposal.md](./proposal.md) to understand:
- Problem statement
- Proposed solution
- Benefits and risks
- Success criteria

### 2. Review the Design

Read [design.md](./design.md) for:
- Architecture diagrams
- Registry schema
- Tool specifications
- Migration strategy

### 3. Check the Tasks

See [tasks.md](./tasks.md) for:
- Detailed task breakdown
- Effort estimates
- Dependencies
- Acceptance criteria

### 4. Provide Feedback

**Review Process:**
1. Read all documents
2. Leave comments/questions
3. Architecture committee reviews
4. Iterate until approved

**Approval Required:**
- [ ] Tech Lead Backend
- [ ] Tech Lead Frontend
- [ ] DevOps Lead
- [ ] Platform Architect

---

## Key Files

### Proposal Files

```
tools/openspec/changes/port-governance-2025-11-05/
├── README.md         # This file
├── proposal.md       # Executive summary
├── design.md         # Technical design
└── tasks.md          # Implementation tasks
```

### Generated Files (After Implementation)

```
config/ports/
├── registry.yaml     # Single source of truth
└── index.json        # Runtime JSON

.env.shared           # Generated environment vars

tools/compose/
└── docker-compose.*.yml  # Generated compose files

docs/content/tools/
└── ports-services.mdx    # Generated documentation

scripts/maintenance/
└── ports-health.sh       # Generated health check

.github/workflows/
└── port-governance.yml   # CI validation
```

---

## Timeline

### Phase 1: Preparation (Week 1)
- Port inventory
- Define ranges
- Create registry
- Draft ADR
- Team communication

### Phase 2: Tooling (Week 2)
- Registry loader
- Schema validator
- Generators (env, compose, docs, health)
- Hardcoded scanner
- CI workflow

### Phase 3: Migration (Week 3)
- Containerize MTProto
- Update Telegram stack
- Migrate all other stacks
- Integration testing
- Rollback plan

### Phase 4: Enforcement (Week 4)
- Enable CI blocking
- Deploy to staging (48h)
- Deploy to production
- Post-deployment monitoring

### Phase 5: Cleanup (Week 5)
- Remove old configs
- Update documentation
- Team workshop
- Retrospective

**Total:** 4-5 weeks

---

## Metrics

### Current State (Baseline)

| Metric | Value |
|--------|-------|
| Services | 30+ |
| Ports in use | ~50 |
| Conflicts/month | 8-12 |
| Resolution time | 1-2 hours |
| Docs accuracy | <70% |
| Hardcoded ports | ~50 |

### Target State (Post-Implementation)

| Metric | Target |
|--------|--------|
| Conflicts/month | 0-1 |
| Resolution time | 5-10 minutes |
| Docs accuracy | 100% (generated) |
| Hardcoded ports | 0 (blocked by CI) |
| Developer satisfaction | 90%+ |

---

## Risks

### High Priority

1. **MTProto Containerization**
   - **Risk:** May require native execution
   - **Mitigation:** Fallback to `host.docker.internal`
   
2. **Breaking Changes**
   - **Risk:** Port changes break local environments
   - **Mitigation:** Communication + migration scripts

### Medium Priority

3. **Team Adoption**
   - **Risk:** Developers bypass process
   - **Mitigation:** CI enforcement + training

4. **CI Performance**
   - **Risk:** Slow validation
   - **Mitigation:** Optimized checks (<1 min)

---

## Success Criteria

### Must Have (MVP)
- ✅ Registry with 100% of services
- ✅ Sync tool generating configs
- ✅ CI validation (blocking)
- ✅ MTProto containerized
- ✅ ADR approved

### Should Have
- ✅ Pre-commit hook
- ✅ Health script
- ✅ Onboarding guide

### Nice to Have
- 🔄 CLI for new ports
- 🔄 Grafana dashboard
- 🔄 Slack alerts

---

## Related Documents

### Current Issues
- [Telegram Diagnostic Report](../../../../TELEGRAM-DIAGNOSTIC-REPORT-2025-11-05.md) - Current connectivity problem
- [E2E Session Summary](../../../../SESSION-COMPLETE-2025-11-04-FINAL.md) - Previous improvements

### Documentation
- [Current Port Docs](../../../../docs/content/tools/ports-services.mdx)
- [Telegram Quick Start](../../../../docs/content/api/telegram-gateway-quickstart.mdx)

### Code
- Current Compose: `tools/compose/docker-compose.telegram.yml`
- Gateway Routes: `backend/api/telegram-gateway/src/routes/telegramGateway.js`

---

## FAQ

### Q: Why not just fix the immediate Telegram issue?

**A:** Quick fixes address symptoms, not root cause. Without governance, we'll have the same issue next month with a different service. This proposal creates a sustainable solution.

### Q: Is 4-5 weeks too long?

**A:** We can roll out incrementally. Quick win: fix Telegram (Phase 1 + Phase 3.1 = 1 week). Full solution prevents all future incidents.

### Q: What if MTProto can't be containerized?

**A:** Fallback plan: use `host.docker.internal` and document the limitation. Registry still manages the port, just marks it as `container: false`.

### Q: Will this slow down development?

**A:** Initially, yes (must update registry for new ports). Long-term, faster (no conflicts, auto-docs, CI validation). Net positive within 2-3 weeks.

### Q: Can we automate the registry updates?

**A:** Partially. CLI tool (`npm run ports:new`) will guide the process, but Architecture review still required for governance.

---

## How to Contribute

1. **Review:** Read proposal + design
2. **Comment:** Leave feedback inline or via PR review
3. **Questions:** Ask in #port-governance Slack channel
4. **Approval:** Architecture committee votes

**Timeline:**
- Review window: 1 week
- Committee vote: 2025-11-12
- Implementation start: 2025-11-13 (if approved)

---

## Contact

**Owner:** Platform Architecture  
**Slack:** #port-governance  
**Email:** architecture@tradingsystem.local  
**Office Hours:** Daily standups 10:00 BRT

---

**Next Steps:**
1. ✅ Review this proposal
2. ⏳ Provide feedback (by 2025-11-12)
3. ⏳ Committee vote
4. ⏳ Begin implementation

**Status:** Awaiting Review


# Change Proposal: Split TP Capital into Gateway + API

**Change ID**: `split-tp-capital-into-gateway-api`
**Status**: 🟡 Proposal Stage (awaiting approval)
**Created**: 2025-10-25
**Type**: Architecture Change (Breaking)

---

## 📋 Quick Links

- **[Proposal](./proposal.md)** - Why, What, Impact (read this first)
- **[Design Document](./design.md)** - Technical decisions and architecture
- **[Implementation Tasks](./tasks.md)** - Complete checklist (13 phases, 150+ tasks)
- **[Gateway Spec](./specs/tp-capital-telegram-gateway/spec.md)** - Requirements for new Gateway service
- **[API Spec](./specs/tp-capital-api/spec.md)** - Modified requirements for containerized API

---

## 🎯 Executive Summary

**Problem**: TP Capital is a monolithic local service combining Telegram integration (session files, authentication) with business logic (API, database). This prevents containerization of the API while maintaining secure Telegram session management.

**Solution**: Split into two independent services:
1. **Telegram Gateway** (local) - Handles Telegram auth, sessions, message reception
2. **TP Capital API** (container) - Handles REST API, business logic, TimescaleDB

**Benefits**:
- ✅ API can be containerized (scalable, versionable, isolated)
- ✅ Session files remain local (secure, no Docker volume exposure)
- ✅ Independent deployment (update API without Telegram disconnect)
- ✅ Simplified testing (test API without mocking Telegram)

**Estimated Effort**: 12-16 hours (including testing and documentation)

---

## 📊 Architecture Comparison

### Before (Monolithic)
```
┌────────────────────────────────────┐
│   TP Capital (Port 4005 - Local)   │
│  ┌──────────────────────────────┐  │
│  │ - Telegram bots/clients      │  │
│  │ - Session files (.session)   │  │
│  │ - Express API                │  │
│  │ - TimescaleDB client         │  │
│  │ - Business logic             │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### After (Two-Layer)
```
┌─────────────────────────────────────────┐
│  Telegram Gateway (Port 4006 - Local)   │
│  - Telegram auth & sessions             │
│  - Message reception                    │
│  - HTTP publisher (retry logic)         │
└─────────────┬───────────────────────────┘
              │ HTTP POST /ingest
              ▼
┌─────────────────────────────────────────┐
│  TP Capital API (Port 4005 - Container) │
│  - REST API                             │
│  - Signal parsing                       │
│  - TimescaleDB persistence              │
└─────────────┬───────────────────────────┘
              │ PostgreSQL
              ▼
┌─────────────────────────────────────────┐
│  TimescaleDB (Container)                │
└─────────────────────────────────────────┘
```

---

## 🔑 Key Changes

### 🆕 New Component: Telegram Gateway
- **Port**: 4006 (new)
- **Type**: Local systemd service
- **Responsibilities**:
  - Telegram authentication (MTProto)
  - Session file management (`.session` on disk)
  - Message reception (Telegraf bot + TelegramClient)
  - HTTP publishing to API (with retry logic)
  - Failure queue (JSONL for offline messages)
- **Files**: `apps/tp-capital/telegram-gateway/`

### 🔄 Modified Component: TP Capital API
- **Port**: 4005 (unchanged)
- **Type**: Docker container (was: local process)
- **New Features**:
  - `/ingest` endpoint (receives from Gateway)
  - Gateway authentication middleware (`X-Gateway-Token`)
  - Idempotency checks (prevent duplicates)
- **Removed Features**:
  - Direct Telegram integration (moved to Gateway)
  - Session management (moved to Gateway)
- **Files**: `apps/tp-capital/api/`

### 🔗 Communication Flow
```
Telegram → Gateway (MTProto) → Gateway (HTTP POST) → API (REST) → TimescaleDB
```

---

## 🚨 Breaking Changes

1. **BREAKING**: TP Capital monolith no longer exists (split into 2 services)
2. **BREAKING**: New port 4006 for Gateway
3. **BREAKING**: Separate `.env` files (Gateway: Telegram creds, API: DB creds)
4. **BREAKING**: Startup command changed (systemd + docker-compose vs npm run dev)
5. **BREAKING**: Session files moved to `telegram-gateway/.session/`

**Migration Required**: See `tasks.md` Phase 1-6 for step-by-step migration guide.

---

## 📁 File Structure

```
tools/openspec/changes/split-tp-capital-into-gateway-api/
├── README.md                               # This file
├── proposal.md                             # Main proposal (Why, What, Impact)
├── design.md                               # Technical decisions
├── tasks.md                                # Implementation checklist
└── specs/
    ├── tp-capital-telegram-gateway/
    │   └── spec.md                         # Gateway requirements (ADDED)
    └── tp-capital-api/
        └── spec.md                         # API requirements (MODIFIED + REMOVED)
```

---

## ✅ Success Criteria

### Implementation Success
- [ ] Both Gateway and API start via universal commands (`start`)
- [ ] End-to-end flow works: Telegram → Gateway → API → DB → Dashboard
- [ ] Retry logic works: API restart doesn't lose messages
- [ ] Idempotency works: Duplicate messages are skipped
- [ ] Health checks pass: `/health` endpoints return 200
- [ ] Prometheus metrics visible for both services
- [ ] Zero data loss during migration

### Performance Success
- [ ] Gateway memory < 200MB
- [ ] API memory < 200MB
- [ ] End-to-end latency < 5s (p95)
- [ ] API response time < 100ms (p95)
- [ ] Zero container restarts in first 7 days
- [ ] Gateway uptime > 99.9% in first 7 days

---

## 📝 Next Steps

### For Reviewer
1. ✅ Read [proposal.md](./proposal.md) (Why, What, Impact)
2. ✅ Review [design.md](./design.md) (Technical decisions)
3. ✅ Check [specs/](./specs/) (Requirements with scenarios)
4. ✅ Approve or request changes

### For Implementer (After Approval)
1. ✅ Read [tasks.md](./tasks.md) (150+ tasks, 13 phases)
2. ✅ Execute Phase 1: Pre-Migration (backups, validation)
3. ✅ Execute Phase 2-6: Code split and containerization
4. ✅ Execute Phase 7-9: Testing and deployment
5. ✅ Execute Phase 10-13: Scripts, documentation, monitoring

---

## 🔍 Validation

After creating this proposal, validate with OpenSpec CLI:

```bash
# Validate proposal structure and requirements
npm run openspec -- validate split-tp-capital-into-gateway-api --strict

# Show proposal summary
npm run openspec -- show split-tp-capital-into-gateway-api

# Show spec deltas (what's changing)
npm run openspec -- diff split-tp-capital-into-gateway-api
```

---

## 📚 Related Documentation

### Will Be Created
- `apps/tp-capital/telegram-gateway/README.md` - Gateway service guide
- `apps/tp-capital/api/README.md` - API service guide
- `docs/context/ops/runbooks/tp-capital-gateway-reauth.md` - Reauthorization runbook
- `docs/context/ops/runbooks/tp-capital-failure-recovery.md` - Failure queue recovery
- `docs/context/backend/architecture/decisions/2025-10-25-adr-00X-split-tp-capital.md` - ADR

### Will Be Updated
- `CLAUDE.md` - Update TP Capital architecture section
- `INVENTARIO-SERVICOS.md` - Add Gateway, modify API entry
- `API-INTEGRATION-STATUS.md` - Update TP Capital status
- `docs/context/backend/guides/guide-tp-capital.md` - Complete rewrite
- `docs/context/ops/service-startup-guide.md` - Add Gateway startup

### Related Proposals
- `containerize-tp-capital-workspace` - Alternative approach (mutually exclusive)

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Message loss during API downtime** | Messages not persisted | Gateway retry logic (3x) + failure queue |
| **Network latency Gateway→API** | Increased processing time | Local communication (localhost), <10ms overhead |
| **Duplicate messages on retry** | Duplicate signals in DB | API idempotency checks (messageId + timestamp) |
| **Session file corruption** | Gateway authentication fails | Daily backups + reauthorization runbook |
| **Gateway crash loses buffer** | Messages in memory lost | Persist to failure queue before processing |

---

## 🎓 Learning Resources

### Telegram MTProto
- [Official MTProto Documentation](https://core.telegram.org/mtproto)
- [Telegraf Framework Docs](https://telegraf.js.org/)
- [TelegramClient (gramjs)](https://gram.js.org/)

### OpenSpec Workflow
- [OpenSpec AGENTS.md](../../../AGENTS.md) - How to create proposals
- [OpenSpec Commands](../../../AGENTS.md#cli-commands) - Validate, show, diff

### TimescaleDB
- [TimescaleDB Best Practices](https://docs.timescale.com/timescaledb/latest/how-to-guides/)
- [Idempotency in Distributed Systems](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)

---

## 📞 Contact

**Questions or Feedback**: Review this proposal and provide feedback in the project's issue tracker or team chat.

**Approval Process**: This proposal requires approval from project maintainer before implementation begins.

---

**Last Updated**: 2025-10-25
**Status**: 🟡 Awaiting Approval
**Change ID**: `split-tp-capital-into-gateway-api`

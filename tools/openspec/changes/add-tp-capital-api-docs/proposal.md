# Proposal: Add TP Capital API Documentation

**Change ID**: `add-tp-capital-api-docs`
**Status**: Proposal
**Created**: 2025-10-26
**Author**: Claude Code AI Agent
**Priority**: Medium (Documentation Consistency)

---

## Executive Summary

This proposal addresses the missing API documentation for TP Capital, which currently lacks both OpenAPI specification and MDX documentation pages despite being a production service with 20+ endpoints. TP Capital has comprehensive documentation for Workspace API and Documentation API, but TP Capital API is undocumented, creating inconsistency in the documentation platform.

---

## Why

### Problem: TP Capital API is Undocumented

**Current State**: TP Capital API (port 3200) is fully functional with extensive endpoints but lacks:

```
❌ No OpenAPI specification
❌ No MDX documentation page
❌ No Redocusaurus integration
❌ No interactive API explorer
```

**Existing Documentation**:
- ✅ **Workspace API**: `workspace-api.mdx` + `workspace.openapi.yaml`
- ✅ **Documentation API**: `documentation-api.mdx` + `documentation-api.openapi.yaml`
- ❌ **TP Capital API**: MISSING

**Investigation Findings**:
- **20+ REST endpoints** fully implemented in `apps/tp-capital/src/server.js:86-506`
- **Production service** actively used by Dashboard for signal ingestion and display
- **Complex API surface**:
  - Trading signals management (GET /signals, DELETE /signals)
  - Telegram bot CRUD (GET/POST/PUT/DELETE /telegram/bots)
  - Telegram channel CRUD (GET/POST/PUT/DELETE /telegram/channels)
  - Forwarded messages (GET /forwarded-messages)
  - Health monitoring (GET /health, GET /metrics)
  - Configuration (GET /bots, GET /channels, GET /config/channels)
  - Channel reload (POST /reload-channels)
  - Logs (GET /logs)

### Why This Matters

1. **Documentation Consistency**:
   - Creates parity with other APIs (Workspace, Documentation API)
   - Enables developers to discover and understand TP Capital endpoints
   - Provides searchable, interactive API documentation

2. **Developer Experience**:
   - **Cannot discover endpoints**: No single source of truth for API contract
   - **Cannot test interactively**: No Swagger/Redoc interface
   - **Cannot validate requests**: No schema validation documentation
   - **Difficult onboarding**: New developers must read source code

3. **API Governance**:
   - **No contract documentation**: Breaking changes untracked
   - **No versioning clarity**: API evolution undocumented
   - **No schema validation**: Request/response formats implicit

4. **Integration Challenges**:
   - Dashboard integration relies on reading source code
   - External integrations require manual reverse engineering
   - No TypeScript types can be generated from spec

---

## What Changes

### 🛠️ Core Deliverables

1. **Create OpenAPI 3.1.0 Specification**:
   - File: `docs/static/specs/tp-capital.openapi.yaml`
   - Document all 20+ endpoints with:
     - Path, method, parameters, request/response schemas
     - Authentication (none currently, but document rate limiting)
     - Error responses (400, 404, 500, 503)
     - Examples for all endpoints

2. **Create MDX Documentation Page**:
   - File: `docs/content/api/tp-capital-api.mdx`
   - Sections:
     - Overview & architecture
     - Authentication & rate limiting
     - Endpoint categories (Signals, Bots, Channels, Monitoring)
     - Integration examples
     - Error handling guide

3. **Add Redocusaurus Integration**:
   - Update `docs/docusaurus.config.js` with new preset entry
   - Enable interactive API explorer at `/api/tp-capital`
   - Match existing pattern used for Workspace and Documentation API

4. **Copy Spec to Frontend**:
   - Copy spec to `frontend/dashboard/public/specs/tp-capital.openapi.yaml`
   - Enable Dashboard API viewer integration

### 📦 Endpoint Categories (20+ endpoints)

#### **Health & Monitoring** (4 endpoints)
- `GET /` - Service information
- `GET /health` - Health check (TimescaleDB status)
- `GET /metrics` - Prometheus metrics
- `GET /logs` - Application logs (with filtering)

#### **Trading Signals** (3 endpoints)
- `GET /signals` - Fetch signals (with filters: limit, channel, type, search, from, to)
- `DELETE /signals` - Delete signal by ingestedAt
- `GET /forwarded-messages` - Fetch forwarded messages

#### **Telegram Bots CRUD** (4 endpoints)
- `GET /telegram/bots` - List all bots
- `POST /telegram/bots` - Create bot
- `PUT /telegram/bots/:id` - Update bot
- `DELETE /telegram/bots/:id` - Soft delete bot

#### **Telegram Channels CRUD** (4 endpoints)
- `GET /telegram/channels` - List all channels
- `POST /telegram/channels` - Create channel
- `PUT /telegram/channels/:id` - Update channel
- `DELETE /telegram/channels/:id` - Soft delete channel

#### **Legacy Endpoints** (3 endpoints - deprecated but documented)
- `GET /telegram-channels` - Legacy channel list
- `POST /telegram-channels` - Legacy channel creation
- `PUT /telegram-channels/:id` - Legacy channel update

#### **Configuration & Management** (3 endpoints)
- `GET /bots` - Bot configuration info
- `GET /channels` - Channels with stats (from TimescaleDB)
- `GET /config/channels` - Configured source/destination channels
- `POST /reload-channels` - Reload channels dynamically

#### **Static Assets** (1 endpoint)
- `GET /telegram-images/*` - Serve static Telegram images

### 🎯 Schema Definitions

Key schemas to document:

```yaml
# Signal
- id, asset, signal_type, channel_id, raw_message
- entry_price, stop_loss, targets (array)
- ingested_at, timestamp, photos (array)

# TelegramBot
- id, username, token, bot_type, description, status
- created_at, updated_at

# TelegramChannel
- id, label, channel_id, channel_type, description
- status, signal_count, last_signal
- created_at, updated_at

# ForwardedMessage
- source_channel_id, destination_channel_id
- original_message_id, forwarded_message_id
- message_text, timestamp
```

---

## Impact

### 🔴 Breaking Changes

**None** - This is documentation-only. No code changes to TP Capital service.

### ✅ Affected Components

| Component | Type | Impact | Action Required |
|-----------|------|--------|-----------------|
| **TP Capital Service** | No change | None | Already implements all endpoints |
| **Docusaurus** | Configuration | Add Redocusaurus preset | Update `docusaurus.config.js` |
| **Dashboard** | Enhancement | Enable API viewer | Copy spec to `public/specs/` |
| **OpenAPI Specs** | New file | Create spec | Write `tp-capital.openapi.yaml` |
| **MDX Documentation** | New file | Create page | Write `tp-capital-api.mdx` |

### 📊 Benefits

#### 🔍 API Discoverability
- ✅ **Interactive explorer**: Swagger/Redoc interface for TP Capital
- ✅ **Searchable documentation**: Full-text search via Docusaurus
- ✅ **Endpoint catalog**: Complete list of all endpoints in one place

#### 🛡️ Quality & Consistency
- ✅ **Schema validation**: Request/response schemas documented
- ✅ **Consistent patterns**: Follows same format as Workspace/Documentation API
- ✅ **Version control**: OpenAPI spec versioned in Git
- ✅ **Breaking change tracking**: API evolution documented

#### 🚀 Developer Experience
- ✅ **TypeScript types**: Can generate types from OpenAPI spec
- ✅ **Client generation**: Can generate SDKs from spec
- ✅ **Integration testing**: Can validate against spec
- ✅ **Onboarding**: New developers discover APIs quickly

### ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| **Spec drift from implementation** | Medium | Low | Add CI validation to compare spec vs actual endpoints |
| **Incomplete endpoint coverage** | Low | Low | Audit all routes in server.js during spec creation |
| **Schema inaccuracies** | Low | Medium | Test all examples against actual API |
| **Missing error codes** | Low | Low | Document all error responses comprehensively |

---

## Timeline (Estimate ~4-6 hours)

### Phase 1: OpenAPI Specification (2-3h)
1. Create `docs/static/specs/tp-capital.openapi.yaml`
2. Document all 20+ endpoints with complete schemas
3. Add examples for each endpoint
4. Validate with `npx @redocly/cli lint tp-capital.openapi.yaml`

### Phase 2: MDX Documentation (1-2h)
1. Create `docs/content/api/tp-capital-api.mdx`
2. Write overview, architecture, authentication sections
3. Document endpoint categories with usage examples
4. Add integration guide and error handling

### Phase 3: Docusaurus Integration (1h)
1. Update `docs/docusaurus.config.js` with Redocusaurus preset
2. Copy spec to `frontend/dashboard/public/specs/tp-capital.openapi.yaml`
3. Test rendering at `/api/tp-capital`
4. Verify search indexing works

### Phase 4: Validation & Testing (30min)
1. Test all examples against running TP Capital service
2. Verify Redocusaurus rendering correct
3. Test Dashboard API viewer integration
4. Update API overview page with TP Capital link

**Total Estimated Time**: 4-6 hours (single session)

---

## Success Metrics

### Documentation Completeness
- ✅ All 20+ endpoints documented in OpenAPI spec
- ✅ Every endpoint has request/response examples
- ✅ All schemas defined with types and descriptions
- ✅ Error responses documented (400, 404, 500, 503)

### Integration Success
- ✅ Redocusaurus renders correctly at `/api/tp-capital`
- ✅ Dashboard API viewer shows TP Capital spec
- ✅ Search finds TP Capital endpoints
- ✅ MDX page renders without errors

### Quality Gates
- ✅ OpenAPI spec passes lint validation (no errors/warnings)
- ✅ No jsonSchemaDialect warnings
- ✅ All examples tested against live API
- ✅ Consistent formatting with Workspace/Documentation API specs

---

## Open Questions

### Question 1: Should we add authentication documentation for future state?

**Context**: TP Capital currently has no authentication, only rate limiting.

**Options**:
- **Document current state only** - No auth, mention rate limiting
- **Document future auth** - Add placeholder for JWT/API key (not implemented)
- **Security section** - Recommend adding authentication

**Recommendation**: **Document current state + security recommendations**. Add note that production deployments should add authentication.

---

### Question 2: Should legacy endpoints (/telegram-channels) be marked deprecated?

**Context**: Both `/telegram-channels` and `/telegram/channels` exist with duplicate functionality.

**Options**:
- **Keep both undocumented** - Don't call attention to duplication
- **Document both as-is** - Users might rely on legacy endpoints
- **Mark legacy as deprecated** - Guide users to new endpoints

**Recommendation**: **Document both, mark legacy as deprecated**. Include migration guide in MDX documentation.

---

### Question 3: Should we generate TypeScript types from the spec?

**Context**: Dashboard uses TP Capital API extensively but has no type safety.

**Options**:
- **Manual types** - Current state (error-prone)
- **Generate types** - Use `openapi-typescript` to generate types
- **Hybrid** - Generate types but allow manual overrides

**Recommendation**: **Future enhancement**. Document in tasks.md as optional follow-up. Would improve type safety in Dashboard integration.

---

## References

### Related Specs
- **EXISTING**: `specs/dashboard/spec.md` (TP Capital Signals feature)
- **NEW**: `specs/tp-capital-api/spec.md` (this proposal)

### Affected Documentation
- `docs/content/api/overview.mdx` - Add TP Capital API to catalog
- `docs/content/api/tp-capital-api.mdx` - NEW - Comprehensive API documentation
- `docs/static/specs/tp-capital.openapi.yaml` - NEW - OpenAPI specification
- `frontend/dashboard/public/specs/tp-capital.openapi.yaml` - NEW - Copy for Dashboard
- `docs/docusaurus.config.js` - Add Redocusaurus preset

### Existing Code
- `apps/tp-capital/src/server.js:86-506` - All endpoint implementations
- `apps/tp-capital/src/timescaleClient.js` - Database operations
- `frontend/dashboard/src/components/pages/TPCapitalOpcoesPage.tsx` - Dashboard integration

### Related Documentation
- `docs/content/apps/tp-capital/` - TP Capital app documentation
- `TP-CAPITAL-SERVICE-GUIDE.md` - Service guide (root)
- `apps/tp-capital/README.md` - Service README

### Existing OpenAPI Specs (for consistency)
- `docs/static/specs/workspace.openapi.yaml` - Workspace API example
- `docs/static/specs/documentation-api.openapi.yaml` - Documentation API example

---

**Status**: 🟡 Proposal Stage (awaiting approval)
**Approval Required**: Documentation Team, Backend Team
**Next Steps**: Review proposal → Approve → Begin Phase 1 implementation
**Timeline**: 4-6 hours total effort (single session, can be completed same day)

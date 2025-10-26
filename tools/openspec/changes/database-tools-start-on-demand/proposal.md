# Proposal: Database Tools Start-on-Demand

**Status:** Draft
**Created:** 2025-10-26
**Type:** Enhancement
**Priority:** Medium
**Estimated Effort:** 6-8 hours

---

## Problem Statement

### Current Behavior

When developers navigate to the **Database Tools page** (`http://localhost:3103/#/knowledge-database`) and click on a database management tool (pgAdmin, pgWeb, Adminer, QuestDB), the UI immediately loads an iframe pointing to the tool's URL.

**Problem:** If the corresponding Docker container is **stopped**, the iframe shows a broken connection error. The user experience is poor:

1. User clicks "pgAdmin" button
2. Iframe loads `http://localhost:5050`
3. Browser shows "This site can't be reached" or hangs indefinitely
4. User must manually diagnose the issue (is the container stopped?)
5. User must manually start the container via CLI: `docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb-pgadmin`
6. User must return to the page and click the button again

**This creates friction and reduces developer productivity.**

---

## Proposed Solution

### Smart Container Detection + Start Button

**Enhancement:** DatabasePage should detect container status **before** loading the iframe:

1. **On page load:** Query Service Launcher API (`/api/health/containers`) to check if database tool containers are running
2. **If container is running:** Show existing button (current behavior - load iframe)
3. **If container is stopped:** Show different button state:
   - Button label: "Start pgAdmin" (instead of "pgAdmin")
   - Button icon: Play icon (▶️) instead of database icon
   - Button color: Warning/yellow (indicates action needed)
4. **On click (when stopped):** Call Service Launcher API to start the container
5. **Show progress:** Display loading spinner: "Starting pgAdmin..."
6. **On success:** Button changes to normal state, iframe auto-loads
7. **On failure:** Show error message with manual recovery instructions

---

## Value Proposition

### Benefits

**For Developers:**
- ✅ **Self-service capability:** Start database tools without CLI knowledge
- ✅ **Reduced friction:** No more broken iframes and manual container management
- ✅ **Faster access:** From "click → error → CLI → retry" (2-3 minutes) to "click → auto-start" (10-20 seconds)
- ✅ **Better UX:** Clear visual feedback about container status

**For the System:**
- ✅ **Reduced support requests:** Developers can resolve issues independently
- ✅ **Better resource management:** Containers only run when actively used (future: auto-stop after idle)
- ✅ **Consistent with dashboard philosophy:** Self-documenting, discoverable interface

### Success Metrics

- **Reduced time-to-access:** 80% reduction (2-3 min → 10-20 sec)
- **User satisfaction:** Measured via feedback/survey
- **Container start success rate:** >95% via UI
- **Support ticket reduction:** 50% fewer "database tools not working" issues

---

## Scope

### In Scope

**Frontend (DatabasePage):**
- Add container status polling (on page load + periodic refresh)
- Conditional button rendering (running vs stopped states)
- Start container action handler
- Loading states and error handling

**Backend (Service Launcher API):**
- New endpoint: `POST /api/containers/:containerName/start`
- Container name validation (whitelist: pgadmin, pgweb, adminer, questdb)
- Docker Compose integration: `docker compose -f <path> up -d <service>`
- Health check after start (verify container actually started)

### Out of Scope (Future Enhancements)

- ❌ Auto-stop idle containers (defer to resource management feature)
- ❌ Container logs viewer in UI (defer to logging feature)
- ❌ Bulk start/stop all database tools (defer to service groups feature)
- ❌ Container resource metrics (CPU/RAM) in UI (defer to monitoring feature)
- ❌ Start containers for non-database services (scope creep - focus on database tools first)

---

## Technical Approach

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: DatabasePage                                       │
│ - Button states (running/stopped)                           │
│ - Container status polling                                   │
│ - Start action handler                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ Backend: Service Launcher API                                │
│ - GET /api/health/containers (existing)                     │
│ - POST /api/containers/:name/start (new)                    │
└──────────────────┬──────────────────────────────────────────┘
                   │ Docker CLI
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ Docker Compose                                               │
│ - docker-compose.database.yml                               │
│ - Services: timescaledb-pgadmin, timescaledb-pgweb, etc.   │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Strategy

**Phase 1: Backend API** (2-3 hours)
1. Create `POST /api/containers/:containerName/start` endpoint
2. Whitelist allowed containers (security: prevent arbitrary container starts)
3. Map container names to compose file paths + service names
4. Execute `docker compose up -d` via child_process
5. Poll container health until healthy or timeout
6. Return success/failure with detailed status

**Phase 2: Frontend UI** (3-4 hours)
1. Create `useContainerStatus` hook (polls Service Launcher API)
2. Update DatabasePage button logic (conditional rendering)
3. Implement start action handler with loading states
4. Add error handling and user feedback (toast notifications)
5. Update button icons and colors based on state

**Phase 3: Testing & Validation** (1-2 hours)
1. Unit tests: API endpoint validation, whitelist enforcement
2. Integration tests: Start container end-to-end
3. E2E tests: UI interaction flow
4. Manual testing: All 4 database tools (pgAdmin, pgWeb, Adminer, QuestDB)

---

## Breaking Changes

**None.** This is a purely additive enhancement:
- Existing behavior preserved (if container is running, iframe loads immediately)
- New behavior only activates when container is stopped
- No changes to existing APIs or data structures

---

## Dependencies

### Technical Dependencies

- **Service Launcher API** already running (`http://localhost:3500`) ✅
- **Docker Compose** available on host (`docker compose` command) ✅
- **Existing container health checks** in compose files ✅

### External Dependencies

- None (fully self-contained within TradingSystem)

---

## Risks & Mitigations

### Risk 1: Container Start Failures

**Scenario:** `docker compose up -d` fails (port conflict, missing env vars, image pull error)

**Mitigation:**
- ✅ Validate container name against whitelist (prevent invalid names)
- ✅ Capture stderr from docker compose command
- ✅ Parse error messages and show user-friendly feedback
- ✅ Provide manual fallback: "Start failed. Run: `docker compose -f ... up -d ...`"

**Recovery Time:** <1 minute (user copies command and runs manually)

---

### Risk 2: API Endpoint Abuse

**Scenario:** Malicious actor calls `POST /api/containers/:name/start` with arbitrary container names

**Mitigation:**
- ✅ **Whitelist enforcement:** Only allow predefined database tool containers
- ✅ **Input validation:** Reject requests with invalid container names (400 Bad Request)
- ✅ **Rate limiting:** Max 5 start requests per minute per client (future enhancement)
- ✅ **Logging:** Audit all container start attempts

**Impact:** Low (local development only, no external exposure)

---

### Risk 3: Health Check Timeout

**Scenario:** Container starts but health check never passes (misconfigured health check, slow database init)

**Mitigation:**
- ✅ Set reasonable timeout (60 seconds max)
- ✅ Return partial success: "Container started but health check pending"
- ✅ Allow iframe load anyway (user can refresh if needed)

---

## Alternative Approaches Considered

### Alternative 1: Auto-Start on Page Load

**Approach:** Automatically start stopped containers when DatabasePage loads

**Pros:**
- Zero user interaction required
- Seamless UX (no manual start button)

**Cons:**
- ❌ Consumes resources unnecessarily (user might just be browsing, not actually using tools)
- ❌ Slower page load (must wait for container start)
- ❌ No user control (what if user wants to manually configure container first?)

**Verdict:** ❌ **Rejected** (too aggressive, reduces user control)

---

### Alternative 2: Show Warning Message Only

**Approach:** Detect stopped container and show warning: "Container is stopped. Start manually with: `docker compose ...`"

**Pros:**
- Simple to implement (no backend changes)
- No risk of failed container starts

**Cons:**
- ❌ Still requires CLI knowledge
- ❌ Doesn't improve UX (user must copy/paste command)
- ❌ Inconsistent with dashboard self-service philosophy

**Verdict:** ❌ **Rejected** (doesn't solve the core UX problem)

---

### Alternative 3: Start Button + Auto-Detect (CHOSEN)

**Approach:** Detect container status, show start button when stopped, user clicks to start

**Pros:**
- ✅ User control (explicit action required)
- ✅ Self-service capability (no CLI needed)
- ✅ Resource-efficient (containers only start on demand)
- ✅ Clear feedback (loading states, error handling)

**Cons:**
- Requires backend API changes (moderate complexity)
- Requires frontend state management (moderate complexity)

**Verdict:** ✅ **ACCEPTED** (best balance of UX, control, and resource efficiency)

---

## Success Criteria

### Functional Requirements

- ✅ DatabasePage detects container status on load
- ✅ Stopped containers show "Start" button with play icon
- ✅ Clicking start button triggers container startup
- ✅ Loading state displays during startup (~10-20 seconds)
- ✅ Success state auto-loads iframe when container is healthy
- ✅ Error state shows helpful message with fallback instructions
- ✅ All 4 database tools work (pgAdmin, pgWeb, Adminer, QuestDB)

### Non-Functional Requirements

- ✅ Container start completes within 60 seconds (timeout)
- ✅ API response time <200ms (status check)
- ✅ UI remains responsive during container startup
- ✅ Error messages are actionable (not generic)
- ✅ Code follows project conventions (ESLint, TypeScript)

### Acceptance Criteria

- [ ] Unit tests pass (>80% coverage for new code)
- [ ] Integration tests pass (start container end-to-end)
- [ ] Manual testing checklist completed (all 4 tools)
- [ ] Documentation updated (feature guide, API docs)
- [ ] Code review approved by maintainer
- [ ] No regressions in existing database tools page

---

## Timeline

**Total Estimate:** 6-8 hours (1 development day)

| Phase | Task | Estimate |
|-------|------|----------|
| **Phase 1** | Backend API endpoint | 2-3h |
| **Phase 2** | Frontend UI changes | 3-4h |
| **Phase 3** | Testing & validation | 1-2h |

**Deployment:** No deployment needed (local development feature)

---

## Questions / Open Issues

### Q1: Should we persist container state preference?

**Question:** If user stops a container manually, should we remember that preference and not auto-start on next visit?

**Answer:** ❌ **Out of scope** for this change. Current proposal only handles start-on-demand. State persistence can be added later if needed.

---

### Q2: Should we support stopping containers from UI?

**Question:** If user wants to stop a container to free resources, should there be a "Stop" button?

**Answer:** ⏸️ **Deferred** to resource management feature. Focus on start-on-demand first (solves immediate UX problem). Stop button can be added later.

---

### Q3: What about containers that take >60s to start?

**Question:** Some containers (e.g., Postgres with large datasets) may take longer than 60s to become healthy.

**Answer:** ✅ **Partial success pattern:** After 60s, return success with message "Container started but still initializing. Refresh page in a moment." User can manually refresh iframe.

---

## References

### Related Documents

- **CLAUDE.md:** Section on service organization and Docker Compose
- **DatabasePage.tsx:** Current implementation (frontend/dashboard/src/components/pages/DatabasePage.tsx)
- **Service Launcher API:** Existing health check endpoint (`/api/health/full`)
- **docker-compose.database.yml:** Database services configuration

### Related Changes

- **Predecessor:** `optimize-docker-security-performance` (just completed - security fixes)
- **This change:** `database-tools-start-on-demand` (UX enhancement)
- **Future:** Resource management + auto-stop idle containers

---

## Approval

**Status:** 🟡 Awaiting Review
**Reviewers:** Project Maintainer
**Approval Date:** TBD

**Sign-off Checklist:**
- [ ] Technical approach validated
- [ ] Security implications reviewed
- [ ] UX/UI mockups approved (optional for this change)
- [ ] Timeline and effort estimate reasonable
- [ ] Success criteria clear and measurable

# Design: Database Tools Start-on-Demand

## Context

### Background

In 2025-10-26, during the `optimize-docker-security-performance` change implementation, the user identified a UX pain point: When developers click on database management tools in the DatabasePage (`http://localhost:3103/#/knowledge-database`), if the corresponding Docker container is stopped, the iframe shows a broken connection error.

**Current State:**
- DatabasePage has 4 buttons: pgAdmin, pgWeb, Adminer, QuestDB
- Clicking a button immediately loads an iframe to the tool's URL
- No container status detection before loading iframe
- User must manually diagnose and start containers via CLI

**Desired State:**
- DatabasePage detects container status before loading iframe
- Stopped containers show "Start" button instead of loading broken iframe
- User can start containers with one click (self-service)
- Clear visual feedback during startup (loading states)

### Constraints

1. **Security:**
   - Cannot allow arbitrary container starts (command injection risk)
   - Must whitelist allowed containers
   - Must validate all user inputs

2. **Performance:**
   - Container status check must be fast (<200ms)
   - Container startup may take 10-60 seconds (acceptable)
   - UI must remain responsive during startup

3. **Reliability:**
   - Must handle Docker daemon failures gracefully
   - Must handle port conflicts (containers already running on different port)
   - Must be idempotent (starting running container should succeed)

4. **UX:**
   - Must provide clear visual feedback (loading, success, error states)
   - Must not block user from accessing other tools during startup
   - Must provide fallback CLI command on error

### Stakeholders

- **Primary:** Developers using database tools (reduce CLI friction)
- **Secondary:** DevOps (reduce support requests for "tools not working")
- **Tertiary:** Future production deployments (infrastructure auto-healing patterns)

---

## Goals / Non-Goals

### Goals

1. ✅ **Improve Developer UX**
   - Self-service container startup (no CLI knowledge required)
   - Clear visual feedback (running vs stopped states)
   - Reduce time-to-access from 2-3 minutes to 10-20 seconds

2. ✅ **Maintain Security**
   - No arbitrary container starts (whitelist enforcement)
   - No command injection vulnerabilities
   - Audit logging for all start attempts

3. ✅ **Keep Simple**
   - Minimal backend changes (single API endpoint)
   - Minimal frontend changes (hooks + conditional rendering)
   - No new dependencies (use existing Docker Compose)

### Non-Goals

❌ **Auto-start on page load**
- Wastes resources (user might be browsing, not using)
- Removes user control
- Slower page load

❌ **Stop containers from UI**
- Out of scope (defer to resource management feature)
- Focus on solving immediate pain point (start)

❌ **Container logs viewer**
- Out of scope (defer to logging feature)
- Would add significant complexity

❌ **Support all container types**
- Only database tools (pgAdmin, pgWeb, Adminer, QuestDB)
- Other services can be added later if needed

---

## Decisions

### Decision 1: Backend API Endpoint Design

**Context:**
Need to expose container start functionality to frontend. Options:

| Option | Endpoint | Pros | Cons |
|--------|----------|------|------|
| A | `POST /api/docker/start` with body `{ service, compose }` | Flexible | Security risk (arbitrary compose files) |
| B | `POST /api/containers/:name/start` with predefined whitelist | Secure | Less flexible |
| C | `POST /api/database-tools/:name/start` | Very specific | Hard to extend later |

**Decision:** ✅ **Option B** - `POST /api/containers/:name/start` with whitelist

**Rationale:**
1. **Security:** Whitelist prevents arbitrary container starts (no command injection)
2. **Simplicity:** REST-ful design (`:name` parameter, POST verb for action)
3. **Extensibility:** Easy to add more containers to whitelist later
4. **Familiarity:** Follows existing Service Launcher API patterns

**Implementation:**
```javascript
// Whitelist defined in containerService.js
const ALLOWED_CONTAINERS = {
  'pgadmin': {
    composePath: 'tools/compose/docker-compose.database.yml',
    service: 'timescaledb-pgadmin',
    port: 5050
  },
  // ... other tools
};

// Validation in route handler
if (!ALLOWED_CONTAINERS[containerName]) {
  return res.status(400).json({ error: 'Invalid container name' });
}
```

---

### Decision 2: Frontend State Management Approach

**Context:**
Need to manage container status and startup state in DatabasePage. Options:

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | useState + useEffect | Simple, no deps | Lots of boilerplate |
| B | Custom hooks (useContainerStatus, useStartContainer) | Reusable, testable | More files to maintain |
| C | React Query / SWR | Caching, auto-refetch | New dependency |

**Decision:** ✅ **Option B** - Custom hooks with optional SWR

**Rationale:**
1. **Separation of Concerns:** Hooks encapsulate logic (easier to test)
2. **Reusability:** `useContainerStatus` can be used elsewhere (future features)
3. **Testability:** Easier to unit test hooks vs component logic
4. **Progressive Enhancement:** Can add SWR later if caching needed

**Implementation:**
```tsx
// Hook 1: Status polling
function useContainerStatus(containerName: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [containerName]);

  async function fetchStatus() {
    const response = await fetch(`/api/health/containers`);
    const data = await response.json();
    setIsRunning(data.containers[containerName]?.running || false);
    setIsLoading(false);
  }

  return { isRunning, isLoading, refresh: fetchStatus };
}

// Hook 2: Start action
function useStartContainer() {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);

  async function startContainer(containerName: string) {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/containers/${containerName}/start`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Start failed');
      toast.success(`${containerName} started successfully!`);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to start ${containerName}`);
    } finally {
      setIsStarting(false);
    }
  }

  return { startContainer, isStarting, error };
}
```

---

### Decision 3: Health Check Strategy

**Context:**
After starting a container, need to know when it's ready. Options:

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Fixed delay (10s) | Simple | Unreliable (may not be ready) |
| B | Poll `docker ps` until healthy | Accurate | Requires parsing Docker CLI output |
| C | Poll HTTP health endpoint | Clean, uses existing health checks | Requires health endpoints exist |
| D | Wait for Docker health check | Most accurate | Complex (Docker events API) |

**Decision:** ✅ **Option C** - Poll HTTP health endpoint (with fallback)

**Rationale:**
1. **Uses Existing Infrastructure:** All database tools have health checks in compose files
2. **Simple Implementation:** HTTP GET request, check for 200 OK
3. **Fast Feedback:** Can detect "ready" faster than Docker's health check
4. **Fallback Pattern:** If health check fails after 60s, still return success (partial success)

**Implementation:**
```javascript
async function waitForHealthy(containerName, timeout = 60000) {
  const config = ALLOWED_CONTAINERS[containerName];
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(config.healthCheck);
      if (response.ok) return { healthy: true };
    } catch (err) {
      // Container not ready yet, continue polling
    }

    await sleep(2000); // Poll every 2 seconds
  }

  // Timeout: Container started but health check not passing
  return {
    healthy: false,
    message: 'Container started but health check timeout. Refresh page to retry.'
  };
}
```

**Timeout Handling:**
- **60 seconds:** Reasonable for all database tools (pg Admin ~15s, QuestDB ~5s)
- **Partial success:** Return success even if health check times out (container is running, just slow to initialize)

---

### Decision 4: Error Handling & User Feedback

**Context:**
Container start can fail for many reasons. How to communicate errors to users?

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Generic error: "Start failed" | Simple | Not actionable |
| B | Parse Docker error messages | Specific | Fragile (error messages change) |
| C | Categorize errors + provide fallback | Balanced | Moderate complexity |

**Decision:** ✅ **Option C** - Categorize errors with fallback CLI command

**Rationale:**
1. **Actionable Feedback:** User knows what went wrong and how to fix
2. **Graceful Degradation:** Always provide fallback (manual CLI command)
3. **Developer-Friendly:** Assumes developers understand CLI (acceptable for dev tools)

**Error Categories:**
```javascript
function categorizeError(stderr) {
  if (stderr.includes('port is already allocated')) {
    return {
      category: 'port-conflict',
      message: 'Port already in use. Stop the conflicting container first.',
      fallback: 'docker ps | grep <port>'
    };
  }

  if (stderr.includes('Cannot connect to the Docker daemon')) {
    return {
      category: 'docker-down',
      message: 'Docker daemon is not running.',
      fallback: 'sudo systemctl start docker'
    };
  }

  if (stderr.includes('permission denied')) {
    return {
      category: 'permission',
      message: 'Permission denied. Add your user to docker group.',
      fallback: 'sudo usermod -aG docker $USER'
    };
  }

  // Unknown error
  return {
    category: 'unknown',
    message: stderr.substring(0, 200), // First 200 chars
    fallback: 'docker compose -f ... up -d <service>'
  };
}
```

**Toast Notifications:**
- **Success:** Green toast, "pgAdmin started successfully!" (auto-dismiss in 3s)
- **Error:** Red toast, categorized message + "Click for details" (persistent until dismissed)
- **Error Modal:** Shows full error message + fallback command (copy button)

---

### Decision 5: Button Visual States

**Context:**
Need to differentiate between 3 states: running, stopped, starting. How to visually communicate?

**States:**

| State | Button Color | Icon | Label | Action |
|-------|--------------|------|-------|--------|
| **Running** | Blue (primary) | `<Database />` | "pgAdmin" | Load iframe |
| **Stopped** | Yellow (warning) | `<PlayCircle />` | "Start pgAdmin" | Start container |
| **Starting** | Blue (disabled) | `<Spinner />` | "Starting pgAdmin..." | None (disabled) |

**Decision:** ✅ Use color + icon + label to communicate state

**Rationale:**
1. **Accessibility:** Multiple visual cues (color, icon, text) for different accessibility needs
2. **Familiarity:** Play icon (▶️) universally recognized as "start/launch"
3. **Feedback:** Loading spinner clearly shows ongoing operation

**Implementation:**
```tsx
function DatabaseToolButton({ tool, isRunning, isStarting, onClick }) {
  const variant = isStarting ? 'disabled' : isRunning ? 'primary' : 'warning';
  const icon = isStarting ? <Spinner /> : isRunning ? <Database /> : <PlayCircle />;
  const label = isStarting
    ? `Starting ${tool}...`
    : isRunning
    ? tool
    : `Start ${tool}`;

  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={isStarting}
      className="min-w-[150px]"
    >
      {icon}
      <span className="ml-2">{label}</span>
    </Button>
  );
}
```

---

## Risks / Trade-offs

### Risk 1: Container Start Failures

**Probability:** MEDIUM
**Impact:** HIGH (user blocked from accessing tool)

**Scenarios:**
- Port already allocated (another container using port)
- Docker daemon not running (systemd service stopped)
- Insufficient permissions (user not in docker group)
- Missing environment variables (TIMESCALEDB_PASSWORD not set)

**Mitigation:**
1. ✅ Validate container whitelist (prevent invalid names)
2. ✅ Capture stderr from docker compose command
3. ✅ Categorize errors and show actionable messages
4. ✅ Provide fallback CLI command (always works)
5. ✅ Add retry button (allow user to retry after fixing issue)

**Recovery Time:** <2 minutes (user copies fallback command, runs manually)

---

### Risk 2: Health Check Timeout

**Probability:** LOW
**Impact:** MEDIUM (user sees timeout, must manually refresh)

**Scenarios:**
- Container starts but initialization takes >60 seconds (large database restore)
- Health endpoint is misconfigured (returns 500 instead of 200)
- Network issues (container running but unreachable from host)

**Mitigation:**
1. ✅ Use reasonable timeout (60 seconds covers 99% of cases)
2. ✅ Return partial success after timeout ("Container started, refresh to retry")
3. ✅ Allow iframe load anyway (user can manually refresh iframe if needed)
4. ✅ Log timeout events for debugging (improve health checks if frequent)

**Impact:** Low (user just needs to refresh page/iframe)

---

### Risk 3: Concurrent Start Requests

**Probability:** LOW
**Impact:** LOW (harmless - idempotent operation)

**Scenario:** User clicks "Start" button multiple times rapidly, sending multiple concurrent requests

**Mitigation:**
1. ✅ Disable button during startup (`isStarting` state)
2. ✅ Docker Compose is idempotent (starting running container is safe)
3. ✅ Rate limiting (future): Max 5 requests/minute per client

**Impact:** Negligible (worst case: multiple docker compose commands run, all succeed)

---

### Risk 4: API Endpoint Abuse

**Probability:** LOW (local dev only)
**Impact:** MEDIUM (could start unwanted containers)

**Scenario:** Malicious actor calls `POST /api/containers/:name/start` with arbitrary container names

**Mitigation:**
1. ✅ **Whitelist enforcement:** Only allow predefined database tool containers
2. ✅ **Input validation:** Reject invalid container names (400 Bad Request)
3. ✅ **Audit logging:** Log all start attempts (timestamp, container, outcome)
4. ✅ **CORS restrictions:** Only allow requests from dashboard origin (http://localhost:3103)

**Impact:** Low (local development only, no external exposure)

---

## Migration Plan

### Phase 1: Backend Implementation (2-3 hours)

**Steps:**
1. Create `apps/service-launcher/src/routes/containers.js`
2. Create `apps/service-launcher/src/services/containerService.js`
3. Define ALLOWED_CONTAINERS whitelist
4. Implement `POST /api/containers/:name/start` endpoint
5. Implement health check polling logic
6. Add error categorization
7. Update `apps/service-launcher/src/server.js` to register routes

**Rollback:**
- Not applicable (new endpoint, zero impact on existing functionality)

**Validation:**
```bash
# Test new endpoint
curl -X POST http://localhost:3500/api/containers/pgadmin/start
# Expected: 200 OK with success response

# Test invalid container
curl -X POST http://localhost:3500/api/containers/invalid/start
# Expected: 400 Bad Request
```

---

### Phase 2: Frontend Implementation (3-4 hours)

**Steps:**
1. Create `frontend/dashboard/src/hooks/useContainerStatus.ts`
2. Create `frontend/dashboard/src/hooks/useStartContainer.ts`
3. Update `frontend/dashboard/src/components/pages/DatabasePage.tsx`:
   - Import hooks
   - Add container status checks
   - Update button rendering logic
   - Add loading/error states
4. Test manually with all 4 database tools

**Rollback:**
- Git revert commit (frontend changes isolated)
- Existing DatabasePage behavior preserved (iframe load)

**Validation:**
```bash
# Manual test checklist
1. Stop pgAdmin: docker compose -f ... stop timescaledb-pgadmin
2. Navigate to DatabasePage
3. Verify "Start pgAdmin" button shows (yellow, play icon)
4. Click button
5. Verify loading spinner appears
6. Verify iframe loads when ready
```

---

### Phase 3: Testing & Documentation (1-2 hours)

**Steps:**
1. Write unit tests (backend + frontend)
2. Write integration tests (end-to-end start flow)
3. Update documentation:
   - `apps/service-launcher/README.md` - Document new API endpoint
   - `frontend/dashboard/README.md` - Document new DatabasePage features
   - `CLAUDE.md` - Update service organization section
4. Code review and feedback incorporation

**Validation:**
```bash
# Run tests
cd apps/service-launcher && npm test
cd frontend/dashboard && npm test

# Verify coverage
# Expected: >80% for new code
```

---

## Open Questions

### Q1: Should we cache container status?

**Question:** Polling `/api/health/containers` every 30 seconds might be excessive. Should we cache status in frontend?

**Analysis:**
- **Pros:** Reduced API calls, faster UI updates
- **Cons:** Stale data (container stopped externally won't be detected immediately)

**Recommendation:** ✅ **Poll every 30s without caching**
- Trade-off: Slight performance overhead (acceptable for dev tools)
- Benefit: Always up-to-date status (important for accuracy)
- Future: Can add SWR with 30s stale-while-revalidate if needed

---

### Q2: Should we show container logs in UI?

**Question:** When container starts, should we stream logs to UI for debugging?

**Analysis:**
- **Pros:** Better debugging UX, no need to check terminal
- **Cons:** Adds complexity (WebSocket or SSE needed), out of scope

**Recommendation:** ❌ **Defer to future logging feature**
- Current scope: Start containers (solve immediate pain point)
- Future enhancement: Real-time log streaming in dedicated logs page

---

### Q3: What about auto-stopping idle containers?

**Question:** Should we auto-stop containers after X minutes of inactivity to save resources?

**Analysis:**
- **Pros:** Resource efficiency (containers only run when used)
- **Cons:** Complex (need to track last access time), aggressive (user might be idle but return)

**Recommendation:** ❌ **Out of scope (defer to resource management)**
- Current feature: Start-on-demand (reactive)
- Future feature: Auto-stop idle (proactive resource management)

---

## Success Metrics

### Implementation Metrics

- ✅ Backend endpoint implemented and tested
- ✅ Frontend hooks implemented and tested
- ✅ All 4 database tools work (pgAdmin, pgWeb, Adminer, QuestDB)
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing checklist complete
- ✅ Documentation updated

### User Metrics (Post-Deploy)

- **Time-to-access:** <20 seconds (from click to iframe load)
- **Start success rate:** >95% (via UI, measured over 1 week)
- **Support tickets:** 50% reduction in "database tools not working" issues
- **User satisfaction:** 4/5 rating via dashboard feedback survey

### Operational Metrics

- **API response time:** <200ms (status check), <2s (start command)
- **Container startup time:** pgAdmin ~15s, pgWeb ~5s, Adminer ~8s, QuestDB ~5s
- **Error rate:** <5% (container start failures)

---

## References

### Related Documents

- **CLAUDE.md:** Service organization and Docker Compose standards
- **DatabasePage.tsx:** Current implementation (`frontend/dashboard/src/components/pages/DatabasePage.tsx`)
- **Service Launcher API:** Existing health check endpoint (`/api/health/full`)
- **docker-compose.database.yml:** Database services configuration (`tools/compose/docker-compose.database.yml`)

### Related Changes

- **Predecessor:** `optimize-docker-security-performance` (security fixes, just completed)
- **This change:** `database-tools-start-on-demand` (UX enhancement)
- **Future:** Resource management + auto-stop idle containers

### External References

- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [REST API Design Patterns](https://restfulapi.net/)

---

**Status:** 🟢 Design Complete (awaiting implementation)
**Author:** Claude Code AI Agent
**Date:** 2025-10-26
**Change ID:** `database-tools-start-on-demand`

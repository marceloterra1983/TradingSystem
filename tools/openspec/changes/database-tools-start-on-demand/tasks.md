# Tasks: Database Tools Start-on-Demand

**Change:** database-tools-start-on-demand
**Status:** Draft
**Last Updated:** 2025-10-26

---

## Task Overview

**Total Estimate:** 6-8 hours
**Phases:** 3 (Backend → Frontend → Testing)
**Dependencies:** Service Launcher API running, Docker Compose available

---

## Phase 1: Backend API Development (2-3 hours)

### 1.1 Create Container Management Endpoint

**File:** `apps/service-launcher/src/routes/containers.js` (new file)

**Tasks:**
- [ ] Create Express router for container operations
- [ ] Define container whitelist constant:
  ```javascript
  const ALLOWED_CONTAINERS = {
    'pgadmin': {
      composePath: 'tools/compose/docker-compose.database.yml',
      service: 'timescaledb-pgadmin',
      port: 5050,
      healthCheck: 'http://localhost:5050'
    },
    'pgweb': {
      composePath: 'tools/compose/docker-compose.database.yml',
      service: 'timescaledb-pgweb',
      port: 8081,
      healthCheck: 'http://localhost:8081'
    },
    'adminer': {
      composePath: 'tools/compose/docker-compose.database.yml',
      service: 'timescaledb-adminer',
      port: 8080,
      healthCheck: 'http://localhost:8080'
    },
    'questdb': {
      composePath: 'tools/compose/docker-compose.database.yml',
      service: 'questdb',
      port: 9000,
      healthCheck: 'http://localhost:9000'
    }
  };
  ```
- [ ] Implement `POST /api/containers/:containerName/start` endpoint
- [ ] Validate containerName against whitelist (return 400 if invalid)
- [ ] Execute docker compose command via child_process.spawn()
- [ ] Capture stdout/stderr for error reporting

**Validation:**
```bash
# Should succeed
curl -X POST http://localhost:3500/api/containers/pgadmin/start

# Should fail (404)
curl -X POST http://localhost:3500/api/containers/invalid/start
```

**Acceptance Criteria:**
- ✅ Endpoint validates container name
- ✅ Returns 400 for invalid container names
- ✅ Returns detailed error if docker compose fails

---

### 1.2 Implement Container Start Logic

**File:** `apps/service-launcher/src/services/containerService.js` (new file)

**Tasks:**
- [ ] Create `startContainer(containerName)` function
- [ ] Build docker compose command:
  ```javascript
  const command = 'docker';
  const args = [
    'compose',
    '-f', config.composePath,
    'up', '-d',
    config.service
  ];
  ```
- [ ] Execute command with proper error handling
- [ ] Parse command output for success/failure
- [ ] Return structured response:
  ```javascript
  {
    success: true,
    containerName: 'pgadmin',
    message: 'Container started successfully',
    healthCheckUrl: 'http://localhost:5050'
  }
  ```

**Edge Cases:**
- [ ] Handle port already in use (docker compose error)
- [ ] Handle missing compose file (file not found)
- [ ] Handle Docker daemon not running
- [ ] Handle permission errors (non-root user)

**Validation:**
```bash
# Test with container already running (should be idempotent)
docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb-pgadmin
curl -X POST http://localhost:3500/api/containers/pgadmin/start
# Expected: success (already running)
```

**Acceptance Criteria:**
- ✅ Command executes successfully
- ✅ Idempotent (starting running container returns success)
- ✅ Error messages are actionable

---

### 1.3 Add Health Check Polling

**File:** `apps/service-launcher/src/services/containerService.js`

**Tasks:**
- [ ] Create `waitForHealthy(containerName, timeout = 60000)` function
- [ ] Poll container health every 2 seconds
- [ ] Use existing health check endpoint from compose file
- [ ] Return when container reports healthy or timeout expires
- [ ] Implement retry logic with exponential backoff:
  ```javascript
  async function waitForHealthy(containerName, timeout = 60000) {
    const startTime = Date.now();
    const config = ALLOWED_CONTAINERS[containerName];

    while (Date.now() - startTime < timeout) {
      const isHealthy = await checkContainerHealth(config.service);
      if (isHealthy) return { healthy: true };

      await sleep(2000); // 2 second intervals
    }

    return { healthy: false, message: 'Health check timeout' };
  }
  ```

**Validation:**
```bash
# Start container that has slow health check (e.g., pgAdmin)
# Verify polling waits for healthy status before returning
curl -X POST http://localhost:3500/api/containers/pgadmin/start
# Expected: ~10-20 second response time (wait for health)
```

**Acceptance Criteria:**
- ✅ Polls health every 2 seconds
- ✅ Returns success when healthy
- ✅ Returns timeout after 60 seconds
- ✅ Doesn't block other requests (async)

---

### 1.4 Update Service Launcher Server

**File:** `apps/service-launcher/src/server.js`

**Tasks:**
- [ ] Import new container router
- [ ] Register route: `app.use('/api/containers', containerRouter)`
- [ ] Add CORS headers for frontend dashboard
- [ ] Update existing `/api/health/containers` endpoint (if needed)
- [ ] Add request logging for debugging

**Validation:**
```bash
# Verify route is registered
curl http://localhost:3500/api/containers/pgadmin/start
# Should NOT return 404
```

**Acceptance Criteria:**
- ✅ Route registered correctly
- ✅ CORS allows dashboard origin (http://localhost:3103)
- ✅ Requests logged to console

---

### 1.5 Error Handling & Logging

**Tasks:**
- [ ] Create error response helper:
  ```javascript
  function errorResponse(res, statusCode, message, details = {}) {
    res.status(statusCode).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    });
  }
  ```
- [ ] Log all container start attempts (success + failures)
- [ ] Include user agent, IP, container name in logs
- [ ] Add structured logging with winston (if not already present)

**Validation:**
```bash
# Trigger error (invalid container name)
curl -X POST http://localhost:3500/api/containers/invalid/start

# Check logs
cat apps/service-launcher/logs/containers.log
# Expected: Entry with error details
```

**Acceptance Criteria:**
- ✅ All errors return structured JSON response
- ✅ All attempts logged (success + failure)
- ✅ Log includes timestamp, container name, outcome

---

## Phase 2: Frontend UI Development (3-4 hours)

### 2.1 Create Container Status Hook

**File:** `frontend/dashboard/src/hooks/useContainerStatus.ts` (new file)

**Tasks:**
- [ ] Create React hook: `useContainerStatus(containerName: string)`
- [ ] Fetch container status from Service Launcher API on mount
- [ ] Poll status every 30 seconds (configurable)
- [ ] Return status object:
  ```typescript
  {
    isRunning: boolean;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
  }
  ```
- [ ] Use SWR or React Query for caching and auto-refresh
- [ ] Handle API errors gracefully

**Validation:**
```tsx
// Test component
function TestContainerStatus() {
  const { isRunning, isLoading } = useContainerStatus('pgadmin');

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {!isLoading && <p>Status: {isRunning ? 'Running' : 'Stopped'}</p>}
    </div>
  );
}
```

**Acceptance Criteria:**
- ✅ Hook fetches status on mount
- ✅ Hook polls every 30 seconds
- ✅ Hook returns isRunning boolean
- ✅ Hook handles API errors

---

### 2.2 Create Container Start Hook

**File:** `frontend/dashboard/src/hooks/useStartContainer.ts` (new file)

**Tasks:**
- [ ] Create React hook: `useStartContainer()`
- [ ] Return function: `startContainer(containerName: string)`
- [ ] Call Service Launcher API: `POST /api/containers/:name/start`
- [ ] Handle loading state during request
- [ ] Return result object:
  ```typescript
  {
    startContainer: (name: string) => Promise<void>;
    isStarting: boolean;
    error: string | null;
  }
  ```
- [ ] Show toast notification on success/failure

**Validation:**
```tsx
// Test component
function TestStartContainer() {
  const { startContainer, isStarting } = useStartContainer();

  return (
    <button
      onClick={() => startContainer('pgadmin')}
      disabled={isStarting}
    >
      {isStarting ? 'Starting...' : 'Start pgAdmin'}
    </button>
  );
}
```

**Acceptance Criteria:**
- ✅ Hook calls API endpoint
- ✅ Hook tracks loading state
- ✅ Hook shows success/error feedback

---

### 2.3 Update DatabasePage Component

**File:** `frontend/dashboard/src/components/pages/DatabasePage.tsx`

**Tasks:**
- [ ] Import `useContainerStatus` and `useStartContainer` hooks
- [ ] Add container status checks for each database tool
- [ ] Create button state logic:
  ```tsx
  const { isRunning } = useContainerStatus('pgadmin');
  const { startContainer, isStarting } = useStartContainer();

  const handleClick = () => {
    if (!isRunning) {
      await startContainer('pgadmin');
      // Auto-refresh status after start
      refetch();
    } else {
      // Existing behavior: load iframe
      setSelectedTool('pgadmin');
    }
  };
  ```
- [ ] Update button rendering (conditional icon, label, color)
- [ ] Add loading spinner during container start

**Validation:**
```bash
# Manual test
1. Stop pgAdmin: docker compose -f tools/compose/docker-compose.database.yml stop timescaledb-pgadmin
2. Navigate to http://localhost:3103/#/knowledge-database
3. Verify button shows "Start pgAdmin" with play icon
4. Click button
5. Verify loading state appears
6. Verify iframe loads when container is ready
```

**Acceptance Criteria:**
- ✅ Stopped containers show "Start" button
- ✅ Running containers show normal button
- ✅ Loading state displays during startup
- ✅ Iframe auto-loads on success

---

### 2.4 Add Button Visual States

**File:** `frontend/dashboard/src/components/pages/DatabasePage.tsx`

**Tasks:**
- [ ] Define button variants:
  ```tsx
  const getButtonVariant = (isRunning: boolean, isStarting: boolean) => {
    if (isStarting) return 'loading';
    if (!isRunning) return 'warning'; // Yellow/amber color
    return 'default'; // Normal blue/primary
  };

  const getButtonIcon = (isRunning: boolean) => {
    if (!isRunning) return <PlayCircle className="w-4 h-4" />;
    return <Database className="w-4 h-4" />;
  };

  const getButtonLabel = (toolName: string, isRunning: boolean) => {
    if (!isRunning) return `Start ${toolName}`;
    return toolName;
  };
  ```
- [ ] Apply tailwind classes for visual feedback
- [ ] Add hover states with tooltips
- [ ] Add disabled state during startup

**Validation:**
- Manual visual inspection:
  - Stopped: Yellow button, play icon, "Start pgAdmin" label
  - Starting: Disabled button, spinner, "Starting pgAdmin..." label
  - Running: Blue button, database icon, "pgAdmin" label

**Acceptance Criteria:**
- ✅ Button color changes based on state
- ✅ Icon changes based on state
- ✅ Label changes based on state
- ✅ Tooltip shows helpful info

---

### 2.5 Add Error Handling & User Feedback

**File:** `frontend/dashboard/src/components/pages/DatabasePage.tsx`

**Tasks:**
- [ ] Show toast notification on start success:
  ```tsx
  toast.success('pgAdmin started successfully!');
  ```
- [ ] Show toast notification on start failure:
  ```tsx
  toast.error('Failed to start pgAdmin. Please try starting manually.');
  ```
- [ ] Display error details in modal (optional):
  ```tsx
  <ErrorModal
    title="Failed to start container"
    message={error.message}
    fallbackCommand={`docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb-pgadmin`}
  />
  ```
- [ ] Add retry button on error

**Validation:**
```bash
# Trigger error (e.g., stop Docker daemon)
sudo systemctl stop docker
# Click "Start pgAdmin" button
# Verify error toast appears with helpful message
```

**Acceptance Criteria:**
- ✅ Success toast shows on successful start
- ✅ Error toast shows on failure
- ✅ Error message includes fallback CLI command
- ✅ User can retry after error

---

## Phase 3: Testing & Validation (1-2 hours)

### 3.1 Unit Tests - Backend

**File:** `apps/service-launcher/src/routes/containers.test.js` (new file)

**Tasks:**
- [ ] Test container name validation (whitelist)
- [ ] Test successful container start
- [ ] Test container already running (idempotent)
- [ ] Test invalid container name (404)
- [ ] Test docker compose command failure
- [ ] Test health check timeout

**Example Test:**
```javascript
describe('POST /api/containers/:name/start', () => {
  it('should start container successfully', async () => {
    const response = await request(app)
      .post('/api/containers/pgadmin/start')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.containerName).toBe('pgadmin');
  });

  it('should reject invalid container name', async () => {
    const response = await request(app)
      .post('/api/containers/invalid/start')
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
```

**Acceptance Criteria:**
- ✅ All unit tests pass
- ✅ Code coverage >80%

---

### 3.2 Unit Tests - Frontend

**File:** `frontend/dashboard/src/hooks/useContainerStatus.test.ts` (new file)

**Tasks:**
- [ ] Test hook fetches status on mount
- [ ] Test hook returns isRunning correctly
- [ ] Test hook handles API errors
- [ ] Test hook refresh function

**Example Test:**
```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useContainerStatus } from './useContainerStatus';

describe('useContainerStatus', () => {
  it('should fetch container status on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useContainerStatus('pgadmin')
    );

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRunning).toBeDefined();
  });
});
```

**Acceptance Criteria:**
- ✅ All unit tests pass
- ✅ Code coverage >80%

---

### 3.3 Integration Tests

**File:** `apps/service-launcher/tests/integration/containers.test.js` (new file)

**Tasks:**
- [ ] Test end-to-end container start flow:
  1. Stop container via Docker CLI
  2. Call API to start container
  3. Verify container is running
  4. Verify health check passes
- [ ] Test concurrent start requests (rate limiting)
- [ ] Test start when Docker daemon is down

**Acceptance Criteria:**
- ✅ Integration tests pass
- ✅ Tests run in CI/CD pipeline

---

### 3.4 Manual Testing Checklist

**Tasks:**
- [ ] **Test 1:** Stop pgAdmin, verify "Start" button shows
- [ ] **Test 2:** Click "Start pgAdmin", verify loading spinner
- [ ] **Test 3:** Verify iframe loads when container is ready
- [ ] **Test 4:** Repeat for pgWeb, Adminer, QuestDB
- [ ] **Test 5:** Test with container already running (should show normal button)
- [ ] **Test 6:** Test with Docker daemon stopped (should show error)
- [ ] **Test 7:** Test with invalid port conflict (should show error)
- [ ] **Test 8:** Test button states (hover, disabled, loading)

**Environment:**
- Browser: Chrome, Firefox, Safari
- Operating System: Linux (WSL2)
- Docker: Running and stopped states

**Acceptance Criteria:**
- ✅ All manual tests pass
- ✅ No console errors
- ✅ UI is responsive and intuitive

---

### 3.5 Documentation

**Files to Update:**
- `frontend/dashboard/README.md` - Document new DatabasePage features
- `apps/service-launcher/README.md` - Document new API endpoint
- `CLAUDE.md` - Update service organization section

**Tasks:**
- [ ] Add API documentation for `POST /api/containers/:name/start`
- [ ] Add user guide: "How to start database tools from UI"
- [ ] Update architecture diagram (optional)
- [ ] Add troubleshooting guide for common errors

**Acceptance Criteria:**
- ✅ API documented with examples
- ✅ User guide is clear and concise
- ✅ CLAUDE.md reflects new feature

---

## Phase 4: Code Review & Deployment (Optional)

### 4.1 Code Review Checklist

**Tasks:**
- [ ] Code follows ESLint rules (no warnings)
- [ ] TypeScript types are correctly defined
- [ ] No hardcoded values (use constants)
- [ ] Error handling is comprehensive
- [ ] Logging is informative but not excessive
- [ ] Comments explain "why" not "what"
- [ ] No security vulnerabilities (arbitrary command execution)

**Acceptance Criteria:**
- ✅ Code review approved
- ✅ All feedback addressed

---

### 4.2 Deployment (Local Dev)

**Tasks:**
- [ ] Restart Service Launcher API:
  ```bash
  cd apps/service-launcher
  npm install
  npm run dev
  ```
- [ ] Restart Dashboard:
  ```bash
  cd frontend/dashboard
  npm install
  npm run dev
  ```
- [ ] Verify feature works in running environment
- [ ] Smoke test all 4 database tools

**Acceptance Criteria:**
- ✅ Feature works in running environment
- ✅ No regressions in existing features

---

## Success Metrics

### Implementation Metrics

- ✅ All tasks completed (checkboxes ticked)
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing checklist complete
- ✅ Code review approved
- ✅ Documentation updated

### User Metrics (Post-Implementation)

- **Time-to-access:** Measure time from click to iframe load (target: <20 seconds)
- **Success rate:** Measure % of successful container starts via UI (target: >95%)
- **User feedback:** Collect feedback via dashboard survey (target: 4/5 satisfaction)

---

## Notes

**Estimated Total Time:** 6-8 hours (1 development day)

**Actual Time:** _(to be filled after implementation)_

**Blockers:** _(to be filled if any issues arise)_

**Lessons Learned:** _(to be filled after completion)_

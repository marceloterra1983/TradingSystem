---
title: Service Launcher - Architecture Documentation
sidebar_position: 1
tags:
  - service-launcher
  - architecture
  - design
domain: backend
type: reference
summary: Decisões arquiteturais e design patterns do Service Launcher
status: active
last_review: "2025-10-18"
---

# Service Launcher - Architecture

## 📐 Design Decisions

### Decision 1: Port 3500 as Default
**Chosen:** Port 3500 (aligned with TradingSystem standards)

**Rationale:**
- Consistent with project documentation (CLAUDE.md)
- Dashboard expects 3500 (vite.config.ts)
- 3xxx range for API services
- Startup scripts already support 3500

**Previous:** Port 9999 (legacy/incorrect configuration)

**Migration:**
```bash
# Old
curl http://localhost:9999/api/status

# New (default)
curl http://localhost:3500/api/status

# Override if needed
SERVICE_LAUNCHER_PORT=9999 npm start
```

### Decision 2: Centralized .env Loading
**Chosen:** Load from project root `../../../.env`

**Rationale:**
- Follows TradingSystem standard (documented in CLAUDE.md)
- Single source of truth for all services
- Easier configuration management
- No duplicate .env files

**Implementation:**
```javascript
const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
```

**Alternatives considered:**
- Local .env: ❌ Violates project standard
- System env vars: ❌ Less explicit, harder onboarding
- Config files: ❌ Overkill for simple service

### Decision 3: Structured Logging with Pino
**Chosen:** Pino with pino-pretty for development

**Rationale:**
- Already used in other project services (Workspace API)
- Fast and lightweight (~5x faster than Winston)
- JSON structured logs for production
- Pretty print for development
- Supports log levels and metadata

**Implementation:**
```javascript
const logger = require('./src/utils/logger');

logger.info({ serviceName, port, latencyMs }, 'Health check completed');
logger.error({ err, serviceName }, 'Failed to launch service');
```

**Log levels:**
- `debug`: Detailed flow (terminal detection, config loading)
- `info`: Normal operations (launches, status checks)
- `warn`: Recoverable errors (terminal fallback)
- `error`: Failures (launch errors, status errors)

**Alternatives considered:**
- console.log: ❌ Not structured, hard to parse
- Winston: ❌ Heavier, slower
- Custom logger: ❌ Reinventing the wheel

### Decision 4: Test Suite with Jest + Supertest
**Chosen:** Jest for testing framework, Supertest for HTTP tests

**Rationale:**
- Jest is standard for Node.js testing
- Supertest integrates well with Express
- No need for server startup in tests
- Built-in coverage reporting
- Watch mode for TDD

**Coverage targets:**
- Overall: 80%+ (currently 66%, growing)
- Endpoints: 100% (critical paths)
- Configuration: 100% (prevent regressions)
- Utils: 80%+

**Test structure:**
```
tests/
├── endpoints.test.js     # API endpoint tests (12 tests)
├── config.test.js        # Configuration tests (7 tests)
└── status.test.js        # Health check logic (6 tests)
```

**Alternatives considered:**
- Mocha + Chai: ❌ More boilerplate, less integrated
- AVA: ❌ Less community support
- Native Node test: ❌ Limited features (no coverage)

### Decision 5: Health Check Timeout Strategy
**Chosen:** 2.5 seconds default, configurable via env

**Rationale:**
- Balance between responsiveness and reliability
- Local services should respond <500ms normally
- 2.5s allows for cold starts and slow responses
- Prevents hanging on dead services
- Configurable for special cases

**Implementation:**
```javascript
const DEFAULT_TIMEOUT_MS = Number(process.env.SERVICE_LAUNCHER_TIMEOUT_MS || 2500);

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

const response = await fetch(healthUrl, {
  signal: controller.signal,
});
```

**Behavior:**
- `< 2.5s + 200 OK` → status: ok
- `< 2.5s + 4xx/5xx` → status: degraded  
- `> 2.5s or error` → status: down

## 🏗️ Architecture Patterns

### Pattern 1: Service Registry
**SERVICE_TARGETS** acts as a service registry:
```javascript
const SERVICE_TARGETS = [
  {
    id: 'workspace-api',
    name: 'Workspace',
    category: 'api',
    port: 3200,
    healthUrl: 'http://localhost:3200/health',
  },
  // ... more services
];
```

**Benefits:**
- Single place to add/remove monitored services
- Configuration via env vars
- Easy to extend with new services

### Pattern 2: Parallel Health Checks
```javascript
async function gatherServiceStatuses(serviceList) {
  return Promise.all(
    serviceList.map((service) => evaluateService(service))
  );
}
```

**Benefits:**
- Fast aggregation (parallel, not sequential)
- Total time = slowest service, not sum
- Non-blocking probes

### Pattern 3: Severity-Based Sorting
```javascript
function sortResultsBySeverity(results) {
  const severity = { down: 0, degraded: 1, ok: 2 };
  return results.sort((a, b) => {
    const diff = severity[a.status] - severity[b.status];
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}
```

**Benefits:**
- Critical services appear first in Dashboard
- Easy to spot problems at a glance
- Secondary sort by name for consistency

### Pattern 4: Fire-and-Forget Launch
```javascript
const child = spawn('wt.exe', args, {
  detached: true,      // Don't keep reference
  stdio: 'ignore',     // Don't pipe streams
});
child.unref();         // Allow parent to exit
```

**Benefits:**
- Service Launcher doesn't wait for service
- Terminal runs independently
- No zombie processes
- Clean process separation

## 📊 Data Flow

```
┌──────────┐
│ Dashboard│
└────┬─────┘
     │ GET /api/status
     ▼
┌────────────────┐
│ Service Launcher│
│   (Express)    │
└────┬───────────┘
     │
     ├─▶ [Parallel Health Checks]
     │   ├─▶ Library API:3200
     │   ├─▶ B3 API:3302
     │   ├─▶ Docs API:3400
     │   └─▶ ... (11 services total)
     │
     ├─▶ [Calculate Metrics]
     │   ├─ overallStatus
     │   ├─ degradedCount
     │   ├─ downCount
     │   └─ averageLatencyMs
     │
     ├─▶ [Sort by Severity]
     │   └─ down > degraded > ok
     │
     └─▶ [Return JSON]
         └─▶ Dashboard UI
```

## 🔧 Technology Choices

| Component | Technology | Reason |
|-----------|-----------|---------|
| Web Framework | Express 4.x | Industry standard, lightweight |
| Logging | Pino | Fast, structured, project standard |
| Testing | Jest + Supertest | Standard Node.js testing stack |
| CORS | cors middleware | Simple, configurable |
| Rate Limiting | express-rate-limit | Prevents abuse |
| Process Management | child_process | Native Node.js, no deps |

## 📈 Scalability Considerations

### Current Scale
- **Services monitored:** 11 services
- **Health check frequency:** On-demand (Dashboard polls ~30s)
- **Concurrent requests:** Limited by rate limiter (200/min)
- **Response time:** < 100ms for status aggregation

### Scaling Limits
- ✅ Can monitor 50+ services without issues
- ✅ Parallel health checks scale linearly
- ⚠️ Single-threaded (Node.js limitation)
- ⚠️ Memory-based (no persistence)

### If We Need More
- **100+ services:** Consider caching layer
- **High frequency polling:** Add in-memory cache with TTL
- **Multiple launchers:** Add service discovery
- **Persistent state:** Add database for history

## 🔐 Security Model

### Threat Model
**Threats:**
- ❌ Arbitrary command execution (POST /launch)
- ❌ DoS via excessive health checks
- ❌ Cross-origin attacks from malicious sites

**Mitigations:**
- ✅ CORS restricted to configured origins
- ✅ Rate limiting (200 req/min)
- ✅ Input validation on /launch
- ✅ Local-only deployment (not exposed to internet)

### Security Assumptions
- Service runs in **trusted local environment**
- No authentication required (local-only)
- Users are authorized to run commands
- Network is trusted (localhost)

## 🔄 Future Enhancements

### Planned (Backlog)
1. **Circuit Breaker Pattern**
   - Prevent repeated health checks to failing services
   - Auto-recovery after timeout period

2. **Prometheus Metrics**
   - Expose /metrics endpoint
   - Track health check durations
   - Service up/down counters

3. **Full Linux Terminal Support**
   - Detect gnome-terminal, konsole, xfce4-terminal
   - Same launch experience as Windows

4. **Persistent Service State**
   - Track launched services
   - Auto-restart crashed services
   - Service dependency management

### Not Planned
- ❌ Cloud deployment (local-only by design)
- ❌ Authentication/authorization (trusted environment)
- ❌ Service process management (not a supervisor)
- ❌ Container orchestration (use Docker Compose)

## 📚 References

### Internal Docs
- [README.md](../README.md) - User documentation
- [ENV_VARIABLES.md](../ENV_VARIABLES.md) - Configuration guide
- [OpenSpec Proposal](../../../infrastructure/openspec/changes/fix-service-launcher-critical-issues/)

### Project Standards
- [CLAUDE.md](../../../CLAUDE.md) - Project guidelines
- [DOCUMENTATION-STANDARD.md](../../../docs/DOCUMENTATION-STANDARD.md) - Doc format

### Related Services
- [Workspace API](../../../backend/api/workspace/) - Uses similar patterns
- [Dashboard](../../../frontend/dashboard/) - Main consumer

---

**Last Updated:** 2025-10-18  
**Author:** TradingSystem Team













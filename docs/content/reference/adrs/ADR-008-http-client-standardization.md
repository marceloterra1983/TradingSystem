---
title: "ADR-008: HTTP Client Standardization for Frontend Services"
date: 2025-11-13
description: "Architecture Decision Record for implementing a standardized HTTP client with circuit breaker, retry logic, and observability for all frontend-to-backend communications"
status: approved
tags: [architecture, frontend, resilience, observability]
domain: frontend
type: adr
summary: "Standardizes HTTP communications with centralized client featuring circuit breaker, retry logic, request queuing, and comprehensive observability"
owner: FrontendGuild
lastReviewed: "2025-11-13"
last_review: 2025-11-13
---

# ADR-008: HTTP Client Standardization for Frontend Services

## Status
**Approved** - Implementation planned for 2025-11-18 to 2025-12-06

## Context

### Current Situation

The TradingSystem frontend (React Dashboard) currently uses inconsistent HTTP communication patterns:
- Direct `fetch()` calls scattered across components
- No centralized retry logic for transient failures
- Inconsistent timeout configurations (some 5s, some 30s, some unlimited)
- No circuit breaker protection against cascading failures
- Duplicate connection handling code
- Generic error messages ("Network request failed")
- No observability into request performance

### Problems Identified

From the analysis of [proposta_padronizacao.md](/workspace/proposta_padronizacao.md):

1. **Reliability Issues:**
   - 5-10% failure rate on requests due to transient network issues
   - No automatic retry on 5xx errors or timeouts
   - Dashboard becomes unresponsive when backend services are slow/offline
   - Connection errors cascade to UI freezing

2. **User Experience Problems:**
   - Generic error messages: "Failed to fetch"
  - No indication of service health status
  - Users don't know if they should retry or wait
  - Silent failures on background operations

3. **Maintainability Challenges:**
   - Timeout logic duplicated across 15+ components
   - Hardcoded service URLs (e.g., `http://localhost:3200`)
   - No centralized error handling
   - Difficult to debug connection issues

4. **Missing Resilience Patterns:**
   - No circuit breaker (continues hammering failed services)
   - No request queuing (connection pool exhaustion)
   - No fail-fast mechanisms
   - No graceful degradation

### Architecture Alignment

This ADR builds upon:
- **[ADR-003: API Gateway Implementation](/workspace/docs/content/reference/adrs/ADR-003-api-gateway-implementation.md)** - All requests MUST go through Traefik gateway (port 9082)
- **[Architecture Review 2025-11-01](governance/evidence/reports/reviews/architecture-2025-11-01/index.md)** - Identified missing circuit breakers as Priority 2 technical debt

## Decision

We will implement a **Standardized HTTP Client** based on Axios with the following capabilities:

### Core Features

1. **Single Responsibility:** One HTTP client instance per service domain
2. **Automatic Retry:** Exponential backoff for 5xx errors and network failures
3. **Circuit Breaker:** Fail-fast when services are consistently unavailable
4. **Request Queuing:** Limit concurrent requests to prevent connection exhaustion
5. **Operation-Based Timeouts:** Different timeouts for health checks (5s) vs long operations (2min)
6. **Error Normalization:** User-friendly error messages
7. **Observability:** Structured logging, latency metrics, request tracing

### Technology Stack

**Primary Library:** `axios` v1.6+
- ✅ Mature, battle-tested (1B+ weekly downloads)
- ✅ Supports interceptors for cross-cutting concerns
- ✅ Automatic JSON parsing
- ✅ Request/response transformation
- ✅ TypeScript support

**Retry Logic:** `axios-retry` v4.0+
- ✅ Exponential backoff strategy
- ✅ Configurable retry conditions
- ✅ Per-request retry configuration

**Circuit Breaker:** Custom implementation
- ✅ State machine (CLOSED → OPEN → HALF_OPEN)
- ✅ Configurable failure threshold
- ✅ Automatic recovery attempts

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (React)                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         HttpClient (Standardized)              │    │
│  │  axios + axios-retry + circuit-breaker         │    │
│  ├────────────────────────────────────────────────┤    │
│  │  • Retry Logic (exponential backoff)           │    │
│  │  • Circuit Breaker (fail-fast)                 │    │
│  │  • Request Queue (concurrency limit: 10)       │    │
│  │  • Timeout Strategy (by operation type)        │    │
│  │  • Error Normalization (user-friendly)         │    │
│  │  • Interceptors (logging, metrics, auth)       │    │
│  └────────────────────────────────────────────────┘    │
│                          ↓                              │
│  ┌────────────────────────────────────────────────┐    │
│  │         Typed Service Clients                  │    │
│  │  • WorkspaceClient                             │    │
│  │  • TPCapitalClient                             │    │
│  │  • TelegramGatewayClient                       │    │
│  │  • DocsClient                                  │    │
│  └────────────────────────────────────────────────┘    │
│                          ↓                              │
└──────────────────────────┼──────────────────────────────┘
                           ↓
                  ┌────────────────┐
                  │ Traefik Gateway│
                  │   :9082        │
                  └────────────────┘
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                   ↓
  ┌──────────┐      ┌──────────┐       ┌──────────┐
  │Workspace │      │TP Capital│       │ Telegram │
  │   API    │      │   API    │       │ Gateway  │
  └──────────┘      └──────────┘       └──────────┘
```

## Implementation Details

### 1. Operation Types (Timeout Strategy)

```typescript
export enum OperationType {
  HEALTH_CHECK = 'health_check',      // 5s  - Quick connectivity test
  QUICK_READ = 'quick_read',          // 10s - Simple GET requests
  STANDARD_READ = 'standard_read',    // 15s - Default for most reads
  WRITE = 'write',                    // 30s - POST/PUT/DELETE
  LONG_OPERATION = 'long_operation',  // 2min - Telegram sync, batch operations
  FILE_UPLOAD = 'file_upload',        // 5min - Large file transfers
}
```

### 2. Retry Configuration

```typescript
const RETRY_CONFIG: Record<OperationType, number> = {
  [OperationType.HEALTH_CHECK]: 2,      // Fast fail
  [OperationType.QUICK_READ]: 3,        // Standard retry
  [OperationType.STANDARD_READ]: 3,     // Standard retry
  [OperationType.WRITE]: 2,             // Conservative (idempotency concerns)
  [OperationType.LONG_OPERATION]: 1,    // Minimal retry
  [OperationType.FILE_UPLOAD]: 1,       // No retry (expensive)
};
```

**Retry Conditions:**
- ✅ Network errors (ECONNABORTED, ENOTFOUND, ECONNRESET, ECONNREFUSED)
- ✅ 5xx server errors (500, 502, 503, 504)
- ✅ 429 Too Many Requests (with exponential backoff)
- ❌ 4xx client errors (400, 401, 403, 404) - No retry

### 3. Circuit Breaker Configuration

```typescript
interface CircuitBreakerConfig {
  failureThreshold: 5,      // Open after 5 consecutive failures
  resetTimeout: 30000,      // Try half-open after 30s
  monitoringPeriod: 10000,  // Failure window: 10s
}
```

**State Transitions:**
- `CLOSED` → Normal operation, all requests allowed
- `OPEN` → Service unavailable, fail-fast without calling backend
- `HALF_OPEN` → Test request to check if service recovered

### 4. Request Queue (Concurrency Control)

```typescript
class HttpClient {
  private maxConcurrentRequests = 10;  // Per client instance
  private activeRequests = 0;

  // Requests wait for available slot
  private async waitForSlot(): Promise<void> {
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

### 5. Error Normalization

All errors are transformed into user-friendly messages:

| Error Type | Backend Response | User Message |
|------------|------------------|--------------|
| Network | ECONNABORTED | "Tempo limite de conexão excedido. Tente novamente." |
| Network | ECONNREFUSED | "Erro de conexão. Verifique sua internet e tente novamente." |
| HTTP 5xx | 500, 502, 503 | "Erro no servidor. Tente novamente em alguns instantes." |
| HTTP 429 | Too Many Requests | "Muitas requisições. Aguarde um momento." |
| HTTP 401/403 | Unauthorized | "Não autorizado. Verifique suas credenciais." |
| HTTP 404 | Not Found | "Recurso não encontrado." |

### 6. Observability (Logging & Metrics)

**Structured Logging:**
```typescript
// Request
console.log('[HttpClient] → GET /api/workspace/items');

// Success
console.log('[HttpClient] ← 200 /api/workspace/items (123ms)');

// Retry
console.warn('[HttpClient] Retry 1 for /api/workspace/items', error.message);

// Circuit Breaker
console.warn('[CircuitBreaker] Opening circuit (5 failures)');
console.log('[CircuitBreaker] Transitioning to HALF_OPEN');

// Slow Request
console.warn('[HttpClient] Slow request: /api/workspace/items (1523ms)');
```

**Metrics Export (Prometheus-compatible):**
```typescript
interface HttpMetrics {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  p95Latency: number;
  activeRequests: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
```

### 7. Service Client Pattern

```typescript
export class WorkspaceClient {
  private http: HttpClient;

  constructor() {
    this.http = new HttpClient({
      baseURL: apiConfig.workspaceApi, // Via Traefik: http://localhost:9082/api/workspace
      enableCircuitBreaker: true,
      enableRetry: true,
      enableLogging: import.meta.env.DEV,
      maxConcurrentRequests: 5,
    });
  }

  async getItems(): Promise<WorkspaceItem[]> {
    return this.http.get<WorkspaceItem[]>('/items', {
      operationType: OperationType.STANDARD_READ,
    });
  }
}
```

### 8. Traefik Integration (CRITICAL)

**All service clients MUST use Traefik API Gateway:**

```typescript
// ✅ CORRECT: Via API Gateway
export const apiConfig = {
  baseURL: import.meta.env.DEV
    ? 'http://localhost:9082'          // Development: Traefik
    : window.location.origin,           // Production: Same origin

  workspaceApi: '/api/workspace',       // Gateway strips /api/workspace → /api
  tpCapitalApi: '/api/tp-capital',      // Gateway strips /api/tp-capital → /
  telegramApi: '/api/telegram-gateway', // Gateway strips prefix
  docsApi: '/api/docs',                 // Gateway strips /api/docs → /api
};

// ❌ WRONG: Direct service access
const WRONG_URL = 'http://localhost:3200'; // Bypasses gateway!
```

**Benefits:**
- ✅ CORS handled by gateway
- ✅ Rate limiting centralized
- ✅ Security headers (X-Frame-Options, XSS protection)
- ✅ Compression (gzip/brotli)
- ✅ Circuit breaker at gateway level (complementary to client-side)

### 9. Inter-Service Authentication

```typescript
export class HttpClient {
  constructor(config: HttpClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        // Service token for inter-service auth (complementary to Traefik)
        'X-Service-Token': import.meta.env.VITE_INTER_SERVICE_SECRET,
      },
    });
  }
}
```

**Backend Validation (Express middleware):**
```javascript
function verifyServiceAuth(req, res, next) {
  const token = req.headers['x-service-token'];
  if (token !== process.env.INTER_SERVICE_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.use('/api/*', verifyServiceAuth);
```

### 10. Health Monitoring

**Proactive Health Checks:**
```typescript
export class HealthMonitor {
  private checkInterval = 30000; // 30s

  async checkAll() {
    const services = [
      { name: 'Workspace', client: workspaceClient },
      { name: 'Telegram Gateway', client: telegramGatewayClient },
      // ... other services
    ];

    for (const { name, client } of services) {
      const healthy = await client.healthCheck();
      this.updateServiceHealth(name, healthy);
    }
  }
}
```

**React Hook:**
```typescript
export function useServiceHealth(serviceName: string) {
  const [health, setHealth] = useState<ServiceHealth>();

  useEffect(() => {
    const listener = (services: Map<string, ServiceHealth>) => {
      setHealth(services.get(serviceName));
    };

    healthMonitor.subscribe(listener);
    return () => healthMonitor.unsubscribe(listener);
  }, [serviceName]);

  return health;
}
```

**Visual Feedback:**
```tsx
const health = useServiceHealth('Telegram Gateway');

<button
  onClick={handleSync}
  disabled={!health?.healthy}
>
  {health?.healthy ? '✓' : '⚠️'} Sincronizar
</button>
```

## Consequences

### Positive

1. **Reliability:**
   - ✅ 90-95% reduction in failure rate (5-10% → &lt;0.5%)
   - ✅ Automatic recovery from transient failures
   - ✅ Circuit breaker prevents cascading failures
   - ✅ Request queuing prevents connection exhaustion

2. **User Experience:**
   - ✅ Clear, actionable error messages
   - ✅ Visual service health indicators
   - ✅ Automatic retry (transparent to user)
   - ✅ Faster perceived performance (fail-fast when service offline)

3. **Observability:**
   - ✅ Structured logs for debugging
   - ✅ Latency metrics (identify slow requests)
   - ✅ Circuit breaker state tracking
   - ✅ Request/response tracing

4. **Maintainability:**
   - ✅ Single source of truth for HTTP configuration
   - ✅ DRY principle (no duplicated timeout/retry logic)
   - ✅ Type-safe service clients
   - ✅ Centralized error handling

### Negative

1. **Complexity:**
   - ⚠️ Additional abstraction layer
   - ⚠️ Learning curve for team
   - ⚠️ More code to test and maintain

2. **Bundle Size:**
   - ⚠️ Axios (~13KB gzipped) vs native fetch (0KB)
   - ⚠️ axios-retry (~2KB gzipped)
   - ⚠️ Total: ~15KB additional bundle size

3. **Migration Effort:**
   - ⚠️ 15+ components need refactoring
   - ⚠️ Existing fetch() calls must be replaced
   - ⚠️ Testing required for all integrations

### Mitigation Strategies

**Bundle Size:**
- Already acceptable (~15KB is &lt;3% of typical React bundle)
- Benefits (reliability, DX) outweigh cost
- Tree-shaking removes unused features

**Migration Risk:**
- Phased rollout (one service at a time)
- Maintain backward compatibility during transition
- Comprehensive testing at each phase

**Complexity:**
- Extensive documentation with examples
- Code templates for new services
- Team training session

## Implementation Plan

### Phase 0: Preparation (1 day)
- [ ] Create feature branch `feature/http-client-standardization`
- [ ] Configure environment variables (`.env`)
- [ ] Create ADR (this document)
- [ ] Update frontend engineering docs

### Phase 1: Infrastructure (2-3 days)
- [ ] Implement `HttpClient` class with Traefik integration
- [ ] Implement `CircuitBreaker` state machine
- [ ] Implement `HealthMonitor` with React hooks
- [ ] Add Prometheus metrics export
- [ ] Write unit tests (coverage > 80%)

### Phase 2: Service Clients (2-3 days)
- [ ] Create `WorkspaceClient` with API versioning
- [ ] Create `TelegramGatewayClient`
- [ ] Create `TPCapitalClient`
- [ ] Create `DocsClient`
- [ ] Add inter-service authentication

### Phase 3: Component Migration (3-4 days)
- [ ] Refactor `TelegramGatewayFinal.tsx`
- [ ] Refactor `WorkspacePage.tsx`
- [ ] Refactor `TPCapitalPage.tsx`
- [ ] Integrate `HttpClientMonitor` in dashboard layout
- [ ] Migrate remaining components
- [ ] Add offline support indicators

### Phase 4: Testing & Validation (2-3 days)
- [ ] Integration tests (E2E with Playwright)
- [ ] Load testing (simulate 100+ req/s)
- [ ] Resilience testing (kill backends, network delays)
- [ ] Validate Prometheus metrics
- [ ] Test circuit breaker transitions
- [ ] Verify fallback strategies
- [ ] Adjust timeout/retry configurations

### Phase 5: Observability (1-2 days)
- [ ] Configure Grafana dashboards for HTTP metrics
- [ ] Set up Prometheus alerts (latency >1s, error rate >5%)
- [ ] Create troubleshooting runbook
- [ ] Document monitoring procedures

**Total Estimated:** 10-15 days (2-3 weeks)

## Metrics for Success

| Metric | Before | After (Target) | Measurement |
|--------|--------|----------------|-------------|
| Request Failure Rate | 5-10% | &lt;0.5% | Prometheus |
| Mean Time to Recovery | Manual (minutes) | Automatic (seconds) | Logs |
| Requests with Retry | 0% | 100% | Circuit Breaker stats |
| Timeout Misconfigurations | ~60% | &lt;5% | Code review |
| Clear Error Feedback | ~30% | 100% | User testing |
| Connection Pool Exhaustion | Frequent | Rare (&lt;1/week) | Monitoring |
| Bundle Size Impact | 800KB | 815KB (+1.9%) | Webpack analyzer |
| Test Coverage (HTTP layer) | 0% | >80% | Jest coverage |

## Validation Checklist

Before considering implementation complete:

- [ ] ✅ All services access via `localhost:9082` (Traefik)
- [ ] ✅ Inter-service token configured in `.env`
- [ ] ✅ Circuit breaker works (tested with backend offline)
- [ ] ✅ Retry works (tested with simulated 500 errors)
- [ ] ✅ Timeout adequate per operation (validated with delays)
- [ ] ✅ Health checks proactive (30s interval)
- [ ] ✅ Error messages normalized (user-friendly)
- [ ] ✅ Logs structured (JSON format)
- [ ] ✅ Metrics exported (Prometheus format)
- [ ] ✅ Tests passing (coverage >80%)
- [ ] ✅ Documentation updated
- [ ] ✅ Team trained on new patterns

## References

- [Proposta de Padronização](/workspace/proposta_padronizacao.md) - Original proposal
- [ADR-003: API Gateway Implementation](/workspace/docs/content/reference/adrs/ADR-003-api-gateway-implementation.md) - Traefik integration
- [Architecture Review 2025-11-01](governance/evidence/reports/reviews/architecture-2025-11-01/index.md) - Circuit breaker requirements
- [Axios Documentation](https://axios-http.com/docs/intro)
- [axios-retry](https://github.com/softonic/axios-retry)
- [Circuit Breaker Pattern (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Resilience4j Circuit Breaker](https://resilience4j.readme.io/docs/circuitbreaker) - Design inspiration

## Alternatives Considered

### Alternative 1: Native fetch() with Retry Wrapper
**Why Rejected:**
- Would require building circuit breaker from scratch
- No built-in interceptor support
- Less mature ecosystem for retry logic

### Alternative 2: TanStack Query (React Query)
**Why Partial Adoption:**
- ✅ Excellent for caching and state management
- ❌ Doesn't replace HTTP client (uses fetch/axios underneath)
- ✅ Can be used *alongside* HttpClient for smart caching

**Decision:** Use HttpClient as transport layer, consider TanStack Query for future caching layer.

### Alternative 3: SWR (Vercel)
**Why Rejected:**
- Similar to TanStack Query
- Doesn't solve circuit breaker/retry at HTTP level
- Would complement, not replace, standardized client

## Decision Makers

- **Architecture Review Team:** Frontend Guild, Backend Guild
- **Approval Required:** Project Lead, Frontend Team Lead
- **Implementation Owner:** Frontend Team Lead
- **Reviewers:** DevOps Team (Traefik integration), Security Team (auth)

## Timeline

**Approved Date:** 2025-11-13
**Proposed Start:** 2025-11-18
**Target Completion:** 2025-12-06 (2-3 weeks)
**Mid-Implementation Review:** 2025-11-27

---

**Document Version:** 1.0
**Next Review:** 2026-02-13 (90 days)
**Status:** Approved for implementation


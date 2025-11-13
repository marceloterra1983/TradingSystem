---
title: "HTTP Client Standard for Frontend Services"
id: STD-020
owner: FrontendGuild
lastReviewed: 2025-11-13
reviewCycleDays: 90
status: active
relatedPolicies:
  - ADR-008
tags:
  - technical-standard
  - frontend
  - resilience
  - testing
---

# STD-020: HTTP Client Standard for Frontend Services

**Effective Date:** 2025-11-18
**Review Cycle:** 90 days
**Owner:** Frontend Guild
**Related ADR:** [ADR-008: HTTP Client Standardization](/workspace/docs/content/reference/adrs/ADR-008-http-client-standardization.md)

## 1. Purpose

This standard defines **testable requirements** for all HTTP client implementations in frontend services, ensuring reliability, resilience, and observability.

## 2. Scope

**Applies to:**
- ✅ Dashboard (React + Vite)
- ✅ Future frontend applications
- ✅ Any TypeScript/JavaScript client making HTTP requests to backend services

**Does NOT apply to:**
- ❌ Server-side Node.js services (different retry strategies)
- ❌ WebSocket connections (separate standard)
- ❌ Static asset loading

## 3. Mandatory Requirements

### 3.1 Library Selection

**REQ-HTTP-001:** All frontend HTTP clients MUST use `axios` version 1.6 or higher.

**Rationale:** Standardization, interceptor support, retry ecosystem.

**Validation:**
```bash
# Check package.json
grep '"axios":' frontend/dashboard/package.json | grep -E '1\.[6-9]|[2-9]\.'
```

---

### 3.2 Retry Logic

**REQ-HTTP-002:** All HTTP clients MUST implement automatic retry using `axios-retry` with exponential backoff.

**Requirements:**
- Default retry count: **3 attempts**
- Backoff strategy: **Exponential** (100ms, 200ms, 400ms, ...)
- Retry conditions:
  - ✅ Network errors (ECONNABORTED, ENOTFOUND, ECONNRESET, ECONNREFUSED)
  - ✅ HTTP 5xx (500, 502, 503, 504)
  - ✅ HTTP 429 (Too Many Requests)
  - ❌ HTTP 4xx (400, 401, 403, 404) - NO retry

**Validation:**
```typescript
// Test: Retry on 500 error
const mock = new MockAdapter(client);
mock.onGet('/test').replyOnce(500).onGet('/test').reply(200, { ok: true });

const result = await httpClient.get('/test');
expect(result).toEqual({ ok: true });
expect(mock.history.get.length).toBe(2); // Initial + 1 retry
```

**Metrics:**
- **Target:** 100% of HTTP clients have retry enabled
- **Measurement:** Code review + unit tests

---

### 3.3 Circuit Breaker

**REQ-HTTP-003:** All HTTP clients MUST implement circuit breaker pattern to prevent cascading failures.

**Requirements:**
- Failure threshold: **5 consecutive failures**
- Reset timeout: **30 seconds**
- Monitoring window: **10 seconds**
- States: CLOSED → OPEN → HALF_OPEN

**Validation:**
```typescript
// Test: Circuit breaker opens after threshold
mock.onGet('/test').reply(500);

for (let i = 0; i < 5; i++) {
  try { await httpClient.get('/test'); } catch {}
}

// Next request should fail-fast
await expect(httpClient.get('/test')).rejects.toThrow('circuit breaker aberto');
expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
```

**Metrics:**
- **Target:** Circuit breaker prevents >90% of requests to failed services
- **Measurement:** Prometheus metrics `http_circuit_breaker_state{service="workspace"}`

---

### 3.4 Timeout Configuration

**REQ-HTTP-004:** All HTTP requests MUST have appropriate timeouts based on operation type.

**Timeout Matrix:**

| Operation Type | Timeout | Use Case |
|---------------|---------|----------|
| `HEALTH_CHECK` | 5s | Connectivity tests |
| `QUICK_READ` | 10s | Simple GET requests |
| `STANDARD_READ` | 15s | Default reads |
| `WRITE` | 30s | POST/PUT/DELETE |
| `LONG_OPERATION` | 120s | Batch operations (Telegram sync) |
| `FILE_UPLOAD` | 300s | Large file transfers |

**Validation:**
```typescript
// Test: Timeout enforced for health checks
const longRunningMock = new Promise(() => {}); // Never resolves
mock.onGet('/health').reply(() => longRunningMock);

await expect(
  httpClient.get('/health', { operationType: OperationType.HEALTH_CHECK })
).rejects.toThrow('Tempo limite de conexão excedido');
```

**Metrics:**
- **Target:** <5% of requests exceed configured timeout
- **Measurement:** Prometheus histogram `http_request_duration_seconds`

---

### 3.5 Request Queuing

**REQ-HTTP-005:** HTTP clients MUST limit concurrent requests to prevent connection pool exhaustion.

**Requirements:**
- Max concurrent requests: **10 per client instance**
- Queuing strategy: FIFO (First In, First Out)
- Timeout for queue wait: **30 seconds**

**Validation:**
```typescript
// Test: Concurrent request limiting
const slowMock = new Promise(resolve => setTimeout(resolve, 1000));
mock.onGet('/test').reply(() => slowMock.then(() => [200, { ok: true }]));

// Fire 15 concurrent requests
const promises = Array.from({ length: 15 }, () => httpClient.get('/test'));

// Monitor active requests
// Should never exceed 10 concurrent
expect(httpClient['activeRequests']).toBeLessThanOrEqual(10);
```

**Metrics:**
- **Target:** Zero connection pool exhaustion events
- **Measurement:** Error logs for "ECONNREFUSED" or "socket hang up"

---

### 3.6 Error Normalization

**REQ-HTTP-006:** All HTTP errors MUST be normalized into user-friendly messages.

**Error Message Matrix:**

| Error Code | Backend Response | User Message |
|-----------|------------------|--------------|
| `ECONNABORTED` | Network timeout | "Tempo limite de conexão excedido. Tente novamente." |
| `ECONNREFUSED` | Connection refused | "Erro de conexão. Verifique sua internet e tente novamente." |
| `500, 502, 503` | Server errors | "Erro no servidor. Tente novamente em alguns instantes." |
| `429` | Rate limit | "Muitas requisições. Aguarde um momento e tente novamente." |
| `401, 403` | Unauthorized | "Não autorizado. Verifique suas credenciais." |
| `404` | Not found | "Recurso não encontrado." |
| Other | Unknown | "Erro desconhecido. Entre em contato com o suporte." |

**Validation:**
```typescript
// Test: Error normalization
mock.onGet('/test').networkError();

try {
  await httpClient.get('/test');
} catch (error) {
  expect(error.message).toContain('Verifique sua internet');
  expect(error.message).not.toContain('ECONNREFUSED'); // No technical jargon
}
```

**Metrics:**
- **Target:** 100% of errors have user-friendly messages
- **Measurement:** Code review + user acceptance testing

---

### 3.7 Observability (Logging)

**REQ-HTTP-007:** All HTTP clients MUST implement structured logging for debugging.

**Logging Requirements:**
- ✅ Request initiated: `[HttpClient] → METHOD /path`
- ✅ Request completed: `[HttpClient] ← STATUS /path (123ms)`
- ✅ Retry attempt: `[HttpClient] Retry N for /path`
- ✅ Circuit breaker state change: `[CircuitBreaker] Opening circuit (5 failures)`
- ✅ Slow request warning (>1s): `[HttpClient] Slow request: /path (1523ms)`

**Validation:**
```typescript
// Test: Logging enabled in development
const consoleSpy = vi.spyOn(console, 'log');
await httpClient.get('/test', { operationType: OperationType.QUICK_READ });

expect(consoleSpy).toHaveBeenCalledWith(
  expect.stringContaining('[HttpClient] → GET /test')
);
expect(consoleSpy).toHaveBeenCalledWith(
  expect.stringMatching(/\[HttpClient\] ← 200 \/test \(\d+ms\)/)
);
```

**Metrics:**
- **Target:** 100% of requests logged in development mode
- **Measurement:** Log aggregation (console.log output)

---

### 3.8 Prometheus Metrics

**REQ-HTTP-008:** HTTP clients MUST export Prometheus-compatible metrics.

**Required Metrics:**

| Metric Name | Type | Description |
|-------------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by service, method, status |
| `http_request_duration_seconds` | Histogram | Request latency (P50, P95, P99) |
| `http_circuit_breaker_state` | Gauge | Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN) |
| `http_active_requests` | Gauge | Current active requests |
| `http_retries_total` | Counter | Total retry attempts |

**Validation:**
```typescript
// Test: Metrics exported
await httpClient.get('/test');

const metrics = httpClientMonitor.getMetrics();
expect(metrics.totalRequests).toBeGreaterThan(0);
expect(metrics.avgLatency).toBeGreaterThan(0);
expect(metrics.circuitBreakerState).toBeDefined();
```

**Metrics:**
- **Target:** Prometheus scrape success rate >99%
- **Measurement:** Grafana dashboard `HTTP Client Metrics`

---

### 3.9 Traefik Integration (CRITICAL)

**REQ-HTTP-009:** ALL HTTP clients MUST communicate via Traefik API Gateway (port 9082).

**Requirements:**
- ✅ Base URL: `http://localhost:9082` (development) or `window.location.origin` (production)
- ✅ Service paths: `/api/workspace`, `/api/tp-capital`, `/api/telegram-gateway`, `/api/docs`
- ❌ NEVER use direct service URLs (e.g., `http://localhost:3200`)

**Validation:**
```typescript
// Test: Base URL via gateway
expect(workspaceClient['http']['client'].defaults.baseURL).toBe('http://localhost:9082');

// Test: No hardcoded localhost URLs
const sourceCode = fs.readFileSync('src/services/workspace-client.ts', 'utf-8');
expect(sourceCode).not.toMatch(/localhost:3200/);
expect(sourceCode).not.toMatch(/localhost:4005/);
```

**Metrics:**
- **Target:** 0 direct service accesses (bypassing gateway)
- **Measurement:** ESLint rule + code review

---

### 3.10 Health Monitoring

**REQ-HTTP-010:** Service clients MUST provide health check capabilities.

**Requirements:**
- ✅ `/health` endpoint support
- ✅ React hook: `useServiceHealth(serviceName)`
- ✅ Proactive monitoring: 30-second interval
- ✅ Visual feedback: Service status badge in UI

**Validation:**
```typescript
// Test: Health check method
const healthy = await workspaceClient.healthCheck();
expect(typeof healthy).toBe('boolean');

// Test: React hook
const { result } = renderHook(() => useServiceHealth('Workspace'));
await waitFor(() => expect(result.current).toBeDefined());
expect(result.current?.name).toBe('Workspace');
```

**Metrics:**
- **Target:** Health status updated every 30s for all services
- **Measurement:** Dashboard visual indicator

---

## 4. Test Coverage Requirements

**REQ-TEST-001:** HTTP client library MUST have >80% code coverage.

**Test Categories:**
- ✅ Unit tests: Circuit breaker state machine
- ✅ Unit tests: Retry logic with various error codes
- ✅ Unit tests: Timeout enforcement
- ✅ Unit tests: Error normalization
- ✅ Integration tests: Service client interactions
- ✅ E2E tests: Full request lifecycle with mock backend

**Validation:**
```bash
cd frontend/dashboard
npm run test:coverage -- --coverage-threshold=80
```

**Metrics:**
- **Target:** >80% code coverage (lines, branches, functions)
- **Measurement:** Jest coverage report

---

## 5. Security Requirements

**REQ-SEC-001:** HTTP clients MUST include inter-service authentication token.

**Requirements:**
- ✅ Header: `X-Service-Token: ${VITE_INTER_SERVICE_SECRET}`
- ✅ Backend validation in Express middleware
- ✅ Never expose token in browser devtools (use `VITE_` prefix)

**Validation:**
```typescript
// Test: Service token in headers
const request = httpClient['client'].defaults.headers.common;
expect(request['X-Service-Token']).toBeDefined();
expect(request['X-Service-Token']).not.toBe('');
```

**Metrics:**
- **Target:** 100% of requests include service token
- **Measurement:** Backend logs + security audit

---

## 6. Documentation Requirements

**REQ-DOC-001:** All service clients MUST be documented with usage examples.

**Required Documentation:**
- ✅ API reference (JSDoc comments)
- ✅ Usage examples in `README.md`
- ✅ Troubleshooting guide
- ✅ Metrics dashboard guide

**Validation:**
```bash
# Check for JSDoc comments
grep -r '@returns' frontend/dashboard/src/services/*.ts | wc -l
# Should be > 0

# Check for README
test -f frontend/dashboard/src/services/README.md
```

**Metrics:**
- **Target:** 100% of public methods documented
- **Measurement:** Code review checklist

---

## 7. Performance Requirements

**REQ-PERF-001:** HTTP client overhead MUST be <10ms (P95).

**Validation:**
```typescript
// Test: Client overhead (excluding network time)
const mockInstantResponse = () => [200, { ok: true }];
mock.onGet('/test').reply(mockInstantResponse);

const start = performance.now();
await httpClient.get('/test');
const overhead = performance.now() - start;

expect(overhead).toBeLessThan(10); // <10ms overhead
```

**Metrics:**
- **Target:** P95 overhead <10ms
- **Measurement:** Prometheus histogram `http_client_overhead_seconds`

---

**REQ-PERF-002:** Bundle size impact MUST be <20KB gzipped.

**Validation:**
```bash
# Build and analyze bundle
npm run build
npx webpack-bundle-analyzer build/stats.json

# Check axios + axios-retry size
# Expected: ~15KB gzipped
```

**Metrics:**
- **Target:** <20KB gzipped
- **Measurement:** Webpack bundle analyzer

---

## 8. Validation Scripts

### 8.1 Automated Validation (CI/CD)

```bash
#!/bin/bash
# scripts/governance/validate-http-client-standard.sh

set -e

echo "🔍 Validating HTTP Client Standard (STD-020)..."

# REQ-HTTP-001: Check axios version
echo "Checking axios version..."
AXIOS_VERSION=$(grep '"axios":' frontend/dashboard/package.json | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
if [[ "$AXIOS_VERSION" < "1.6.0" ]]; then
  echo "❌ FAIL: axios version must be >= 1.6.0 (found $AXIOS_VERSION)"
  exit 1
fi
echo "✅ PASS: axios version $AXIOS_VERSION"

# REQ-HTTP-009: No direct service URLs
echo "Checking for hardcoded service URLs..."
if grep -r "localhost:3200\|localhost:4005\|localhost:3201" frontend/dashboard/src/services/*.ts; then
  echo "❌ FAIL: Found hardcoded service URLs (must use Traefik gateway)"
  exit 1
fi
echo "✅ PASS: No hardcoded service URLs found"

# REQ-TEST-001: Test coverage > 80%
echo "Checking test coverage..."
cd frontend/dashboard
npm run test:coverage -- --coverage-threshold=80 --silent
echo "✅ PASS: Test coverage > 80%"

echo "✅ All validations passed!"
```

### 8.2 Manual Checklist (Code Review)

```markdown
## HTTP Client Standard Checklist (STD-020)

### Compliance
- [ ] Uses `axios` >=1.6.0
- [ ] Implements `axios-retry` with exponential backoff
- [ ] Circuit breaker with 5-failure threshold
- [ ] Timeouts per operation type
- [ ] Max 10 concurrent requests
- [ ] Error normalization (user-friendly messages)

### Observability
- [ ] Structured logging enabled
- [ ] Prometheus metrics exported
- [ ] Health check method implemented

### Integration
- [ ] Via Traefik gateway (port 9082)
- [ ] No hardcoded localhost URLs
- [ ] Service token in headers

### Testing
- [ ] Unit tests for retry logic
- [ ] Unit tests for circuit breaker
- [ ] Unit tests for timeout enforcement
- [ ] Code coverage >80%

### Documentation
- [ ] JSDoc comments on public methods
- [ ] Usage examples in README
- [ ] Troubleshooting guide updated
```

---

## 9. Compliance Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Standard Approved | 2025-11-13 | ✅ Complete |
| Infrastructure Implementation | 2025-11-20 | 🚧 In Progress |
| Service Clients Created | 2025-11-27 | ⏳ Pending |
| Component Migration | 2025-12-04 | ⏳ Pending |
| Full Compliance | 2025-12-06 | ⏳ Pending |

**Enforcement:** Effective 2025-12-06 - All new code MUST comply.

---

## 10. Non-Compliance Handling

**Minor Violations** (e.g., missing JSDoc):
- ⚠️ Warning in code review
- Must fix before merge

**Major Violations** (e.g., no retry logic, hardcoded URLs):
- ❌ Build fails in CI/CD
- PR blocked until fixed

**Critical Violations** (e.g., bypassing API gateway, no circuit breaker):
- 🚨 Escalate to Frontend Guild
- Immediate remediation required

---

## 11. Review and Maintenance

**Review Cycle:** Every 90 days
**Next Review:** 2026-02-13
**Owner:** Frontend Guild
**Reviewers:** DevOps Team, Security Team

**Triggers for Out-of-Cycle Review:**
- New resilience patterns emerge
- Performance degradation >10%
- Security vulnerabilities discovered

---

## 12. Related Standards

- **[ADR-008: HTTP Client Standardization](/workspace/docs/content/reference/adrs/ADR-008-http-client-standardization.md)** - Architecture decision
- **[ADR-003: API Gateway Implementation](/workspace/docs/content/reference/adrs/ADR-003-api-gateway-implementation.md)** - Traefik integration
- **[STD-010: Secrets Standard](./secrets-standard.md)** - Environment variable management

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Status:** Active (effective 2025-12-06)

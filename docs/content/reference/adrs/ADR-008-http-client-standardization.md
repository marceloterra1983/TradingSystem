---
title: "ADR-008: HTTP Client Standardization"
sidebar_position: 8
tags: [adr, architecture, http, frontend, reliability]
domain: architecture
type: adr
summary: "Standardize HTTP client implementation across frontend applications for improved reliability"
status: accepted
date: "2025-11-10"
last_review: "2025-11-13"
---

# ADR-008: HTTP Client Standardization

## Status

**Accepted** - 2025-11-10

## Context

The TradingSystem frontend (Dashboard) makes frequent HTTP requests to multiple backend services (Workspace API, TP Capital, Documentation API, Telegram Gateway).

### Current Problems

1. **High Failure Rate**: 5-10% of requests fail due to network issues, timeouts
2. **Inconsistent Error Handling**: Different components handle errors differently
3. **No Fault Tolerance**: Single failed request can break entire features
4. **Timeout Misconfiguration**: ~60% of endpoints use default timeouts
5. **Connection Pool Exhaustion**: Frequent during peak usage
6. **Poor User Experience**: Generic "Something went wrong" errors

### Impact

- Users encounter frequent "API Indisponível" errors
- Support tickets related to API failures: ~40% of total
- User frustration leads to reduced engagement
- Development time wasted debugging network issues

## Decision

We will implement a **standardized HTTP client library** with built-in fault tolerance, retry logic, and circuit breaking.

### Core Implementation

**Library Stack**:
- `ky` (9KB) - Modern fetch wrapper with retries
- `p-queue` (2KB) - Request queue to prevent exhaustion
- Custom circuit breaker (4KB) - Fault tolerance

**Total Bundle Impact**: ~15KB gzipped (&lt;3% of typical React bundle)

### Key Features

#### 1. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private readonly threshold = 5; // Open after 5 failures
  private readonly resetTimeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

#### 2. Exponential Backoff Retry

```typescript
const httpClient = ky.create({
  retry: {
    limit: 3,
    methods: ['get', 'post', 'put', 'delete'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
    backoffLimit: 30000, // Max 30s
  },
  timeout: 30000, // 30s default
});
```

#### 3. Request Queue

```typescript
const queue = new PQueue({
  concurrency: 6, // Max 6 concurrent requests
  interval: 1000, // Per second
  intervalCap: 10, // Max 10 requests per second
});

function queuedRequest<T>(fn: () => Promise<T>): Promise<T> {
  return queue.add(() => fn());
}
```

#### 4. Structured Error Handling

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isRetryable: boolean,
    public context?: Record<string, unknown>
  ) {
    super(message);
  }
}

// User-friendly error messages
function getErrorMessage(error: ApiError): string {
  if (error.statusCode === 429) {
    return 'Too many requests. Please wait a moment.';
  }
  if (error.statusCode >= 500) {
    return 'Server is experiencing issues. Retrying automatically...';
  }
  return error.message;
}
```

### Service Client Template

```typescript
export class WorkspaceClient {
  private client: HttpClient;
  private breaker: CircuitBreaker;

  constructor() {
    this.client = new HttpClient({ baseURL: '/api/workspace' });
    this.breaker = new CircuitBreaker({ threshold: 5 });
  }

  async getItems(): Promise<Item[]> {
    return this.breaker.execute(() =>
      this.client.get<Item[]>('/items')
    );
  }
}
```

## Consequences

### Positive

✅ **90-95% Reduction in Failure Rate** (5-10% → &lt;0.5%)  
✅ **Automatic Recovery**: Retries handle transient failures  
✅ **Circuit Breaker**: Prevents cascading failures  
✅ **Better UX**: Clear, actionable error messages  
✅ **Request Queue**: Prevents connection exhaustion  
✅ **Observability**: Prometheus metrics for monitoring  
✅ **Developer Experience**: Consistent API across services  
✅ **Reduced Support Tickets**: Fewer user-reported issues

### Negative

⚠️ **Bundle Size**: +15KB to frontend bundle  
⚠️ **Migration Effort**: 2-3 weeks to update all services  
⚠️ **Learning Curve**: Developers need to learn new patterns

### Mitigation

**Bundle Size**:
- 15KB is &lt;3% of typical React bundle
- Benefits (reliability, DX) outweigh cost
- Tree-shaking removes unused features

**Migration Risk**:
- Gradual rollout (one service at a time)
- Automated tests for each migration
- Rollback plan if issues arise

## Implementation

### Phase 1: Core Library (Week 1)
- [x] Implement HttpClient wrapper
- [x] Add CircuitBreaker class
- [x] Create request queue
- [x] Write unit tests (>80% coverage)

### Phase 2: Service Clients (Week 2-3)
- [x] Migrate Workspace API client
- [ ] Migrate TP Capital client
- [ ] Migrate Documentation API client
- [ ] Migrate Telegram Gateway client

### Phase 3: Monitoring (Week 4)
- [ ] Add Prometheus metrics
- [ ] Create Grafana dashboards
- [ ] Setup alerting rules

### Phase 4: Documentation (Week 5)
- [x] Implementation guide
- [x] Service client template
- [x] Troubleshooting runbook
- [x] Best practices guide

## Validation

### Success Metrics

| Metric                    | Before  | After    | Measurement  |
|---------------------------|---------|----------|--------------|
| Request Failure Rate      | 5-10%   | &lt;0.5% | Prometheus   |
| User-Reported API Issues  | 40%     | &lt;10%  | Support data |
| Timeout Misconfigurations | ~60%    | &lt;5%   | Code review  |
| Mean Time to Recovery     | ~10 min | &lt;1 min| Monitoring   |
| Connection Pool Exhaustion| Frequent| Rare (&lt;1/week)| Monitoring   |

### Testing Strategy

```bash
# Unit tests
npm test -- http-client

# Integration tests
npm test -- workspace-client.integration

# Load tests
npm run test:load -- --clients 100 --duration 60s
```

## Related Decisions

- [ADR-003: API Gateway Implementation](./ADR-003-api-gateway-implementation)
- [ADR-007: TP Capital API Gateway Integration](./007-tp-capital-api-gateway-integration.mdx)

## References

- [Implementing Circuit Breaker Pattern - Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff - Google Cloud](https://cloud.google.com/iot/docs/how-tos/exponential-backoff)
- [Governance Standard: STD-020 HTTP Client Standard](../../governance/standards/STD-020-http-client-standard)
- [Architecture Review: 2025-11-01](../../governance/evidence/reports/reviews/architecture-2025-11-01/index)

---

**Date Created**: 2025-11-10  
**Last Updated**: 2025-11-13  
**Status**: Accepted

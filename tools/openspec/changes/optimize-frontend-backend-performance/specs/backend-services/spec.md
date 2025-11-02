# Backend Services Capability - Performance Standards (NEW)

## ADDED Requirements

### Requirement: Structured Logging with Pino

Backend services SHALL use Pino structured logging library for all log output to enable efficient I/O, log aggregation, and performance monitoring.

**Rationale:** console.log causes I/O blocking (0.5-1ms per statement), produces unstructured logs, and hinders log aggregation. Pino is the fastest Node.js logger with structured JSON output.

**Key Changes:**
- Replace all console.log/error/warn/debug with Pino logger
- Configure log levels via environment variables (LOG_LEVEL)
- Use structured JSON logging in production, pretty-print in development
- Include contextual metadata (request ID, user ID, timestamps)

#### Scenario: Structured info logging
- **GIVEN** Documentation API receives RAG query request
- **WHEN** service processes the request
- **THEN** logger.info({ query, collection, requestId }, 'RAG query received') is called
- **AND** log output is structured JSON with all metadata
- **AND** I/O blocking is negligible (< 0.1ms)

#### Scenario: Error logging with stack traces
- **GIVEN** external service call fails
- **WHEN** error is caught in try-catch block
- **THEN** logger.error({ err: error, context }, 'Service call failed') is called
- **AND** error object includes stack trace automatically
- **AND** error is serialized to JSON with Pino error serializer

#### Scenario: Log level configuration
- **GIVEN** LOG_LEVEL=warn environment variable is set
- **WHEN** application starts
- **THEN** only warn and error logs are output
- **AND** info and debug logs are suppressed (performance optimization)
- **AND** log level can be changed without code changes

#### Scenario: Development vs production logging
- **GIVEN** NODE_ENV=development
- **WHEN** logger outputs message
- **THEN** pino-pretty transport formats logs for human readability
- **AND** colors and formatting aid debugging
- **WHEN** NODE_ENV=production
- **THEN** logs are output as JSON (one line per log)
- **AND** suitable for log aggregation systems (Loki, ELK, Datadog)

---

### Requirement: JWT Token Caching

Backend services SHALL cache JWT tokens with configurable TTL to reduce cryptographic signing overhead and improve request latency.

**Rationale:** Creating new JWT on every request adds 1-2ms latency from HMAC signing. For static payloads (e.g., service-to-service auth), tokens can be safely cached with short expiry.

**Key Changes:**
- Implement token cache in RagProxyService with 5-minute default TTL
- Auto-refresh tokens 1 minute before expiry
- Make TTL configurable via JWT_CACHE_TTL_SECONDS environment variable
- Ensure tokens include expiry claim (exp) to prevent indefinite reuse

#### Scenario: First request creates and caches token
- **GIVEN** no cached token exists
- **WHEN** RagProxyService makes first request to LlamaIndex
- **THEN** new JWT token is created with exp claim (now + 300 seconds)
- **AND** token is cached in memory with expiry timestamp
- **AND** request completes with Authorization header containing token

#### Scenario: Subsequent requests reuse cached token
- **GIVEN** valid cached token exists (created < 4 minutes ago)
- **WHEN** RagProxyService makes another request
- **THEN** cached token is reused (no new signature created)
- **AND** _getBearerToken() returns cached value immediately (< 0.01ms)
- **AND** request latency is reduced by ~1-2ms (no signing overhead)

#### Scenario: Token auto-refresh before expiry
- **GIVEN** cached token will expire in < 1 minute
- **WHEN** RagProxyService calls _getBearerToken()
- **THEN** new token is created with fresh expiry (now + 300 seconds)
- **AND** cache is updated with new token and expiry
- **AND** old token is discarded

#### Scenario: Configurable cache TTL
- **GIVEN** JWT_CACHE_TTL_SECONDS=600 environment variable
- **WHEN** RagProxyService initializes
- **THEN** token cache TTL is set to 600 seconds (10 minutes)
- **AND** tokens include exp claim with 10-minute expiry
- **AND** refresh happens at 9 minutes (TTL - 60 seconds)

#### Scenario: Token security validation
- **GIVEN** cached JWT token
- **THEN** token includes exp claim (expiry timestamp)
- **AND** token is signed with server-side secret (not exposed to clients)
- **AND** cache is in-memory only (not persisted to disk/database)
- **AND** cache is cleared on service restart

---

### Requirement: Performance Metrics Export

Backend services SHALL expose performance metrics (request latency, error rates, cache hit rates) for monitoring and alerting.

**Rationale:** Need baseline metrics to validate performance improvements and detect regressions in production.

#### Scenario: Request latency tracking
- **GIVEN** API endpoint receives request
- **WHEN** request processing completes
- **THEN** response time is logged with structured metadata
- **AND** percentiles (P50, P95, P99) are calculable from logs
- **AND** slow requests (> 1s) are flagged for investigation

#### Scenario: Error rate monitoring
- **GIVEN** API endpoint throws error
- **WHEN** error handler catches exception
- **THEN** error is logged with error code, message, and stack trace
- **AND** error count is trackable per endpoint per time window
- **AND** error rate > 5% triggers alert (future: Prometheus/Grafana)

#### Scenario: JWT cache hit rate
- **GIVEN** RagProxyService processes 100 requests
- **WHEN** _getBearerToken() is called
- **THEN** cache hit rate is logged (e.g., "JWT cache: 98/100 hits, 2% miss")
- **AND** cache effectiveness is measurable
- **AND** cache misses indicate either cold start or expiry

---

### Requirement: Database Connection Pooling (Future - P2)

Backend services SHOULD use connection pooling (PgBouncer or pg.Pool) to reduce database connection overhead from 10-20ms to 2-5ms.

**Rationale:** Current implementation creates new database connection per request. Connection pooling reuses connections, reducing latency by 50-75%.

**Note:** This is a P2 requirement (not implemented in this change). Documented here for future reference.

#### Scenario: Connection pool initialization
- **GIVEN** backend service starts
- **WHEN** database pool is initialized
- **THEN** pool creates 5-20 persistent connections (configurable)
- **AND** connections are kept alive with keep-alive pings
- **AND** pool manages connection lifecycle (acquire, release, idle timeout)

#### Scenario: Query with pooled connection
- **GIVEN** API endpoint needs to query database
- **WHEN** query is executed
- **THEN** connection is acquired from pool (< 1ms if available)
- **AND** query executes on pooled connection
- **AND** connection is returned to pool after query completes
- **AND** total query latency is reduced by 50-75%

---

## Implementation Notes

### Affected Services
1. **Documentation API** (Port 3401)
   - Replace 57 console.log statements with Pino
   - Implement JWT token caching in RagProxyService
   - Export performance metrics

2. **Workspace API** (Port 3200) - Future
   - Apply same logging patterns (P2)
   - Implement connection pooling (P2)

3. **TP Capital API** (Port 4005) - Future
   - Apply same logging patterns (P2)
   - Implement connection pooling (P2)

### File Changes

**1. Create logger utility**
```javascript
// backend/api/documentation-api/src/utils/logger.js
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});
```

**2. Update RagProxyService**
```javascript
// backend/api/documentation-api/src/services/RagProxyService.js

constructor(options) {
  // ... existing code
  this._tokenCache = null;
  this._tokenExpiry = 0;
  this.jwtCacheTTL = Number(process.env.JWT_CACHE_TTL_SECONDS) || 300;
}

_getBearerToken() {
  const now = Date.now();
  if (this._tokenCache && now < this._tokenExpiry) {
    return this._tokenCache; // Cache hit
  }

  // Cache miss or expired - create new token
  const expiresIn = this.jwtCacheTTL;
  this._tokenCache = createBearer({
    sub: 'dashboard',
    exp: Math.floor(now / 1000) + expiresIn
  }, this.jwtSecret);

  this._tokenExpiry = now + (expiresIn - 60) * 1000; // Refresh 1 min before expiry
  return this._tokenCache;
}
```

**3. Replace console statements**
```javascript
// Before
console.log('RAG query received:', query);
console.error('[Documentation API Error]', error.message);

// After
logger.info({ query, collection, requestId }, 'RAG query received');
logger.error({ err: error, requestId }, 'Documentation API error');
```

### Environment Variables

Add to `.env` and `.env.example`:
```bash
# Logging configuration
LOG_LEVEL=info                    # Options: trace, debug, info, warn, error
NODE_ENV=production               # Options: development, production

# JWT token caching
JWT_CACHE_TTL_SECONDS=300         # 5 minutes default (range: 60-600)
```

### Testing Requirements

**Logging Tests:**
- [ ] Verify structured JSON output in production mode
- [ ] Verify pretty-print output in development mode
- [ ] Test log levels (trace, debug, info, warn, error)
- [ ] Verify error serialization includes stack traces
- [ ] Measure logging performance (< 0.1ms per log statement)

**JWT Caching Tests:**
- [ ] First request creates new token
- [ ] Subsequent requests reuse cached token
- [ ] Token refreshes automatically before expiry
- [ ] Configurable TTL works correctly
- [ ] Cache clears on service restart

**Performance Tests:**
- [ ] Measure RAG query latency before/after (should be 10% faster)
- [ ] Verify no I/O blocking from logging
- [ ] Measure JWT cache hit rate (should be > 95% under load)

### Performance Targets

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| RAG Query Latency | 5-12s | 4.8-11.5s | 10% ↓ |
| Logging Overhead | 0.5-1ms/log | < 0.1ms/log | 80-90% ↓ |
| JWT Signing Overhead | 1-2ms/request | Negligible (cached) | 90-95% ↓ |
| Console Statements | 57 occurrences | 0 | 100% ↓ |

### Security Considerations

**Logging:**
- Never log sensitive data (passwords, API keys, personal information)
- Redact sensitive fields automatically (use Pino redact option)
- Configure log retention policies (rotate/delete old logs)

**JWT Caching:**
- Tokens cached server-side only (not exposed to clients)
- Short TTL (5 minutes default, max 10 minutes recommended)
- Tokens include exp claim to prevent indefinite reuse
- Cache cleared on service restart (no persistence)

### Migration Strategy

1. **Install Dependencies**
   ```bash
   cd backend/api/documentation-api
   npm install pino pino-pretty
   ```

2. **Create Logger Module**
   - Add `src/utils/logger.js`
   - Export configured Pino instance

3. **Replace Console Statements**
   - Search: `grep -r "console\." src/`
   - Replace systematically by file
   - Test each service endpoint after replacement

4. **Implement JWT Caching**
   - Update RagProxyService constructor
   - Refactor _getBearerToken method
   - Add environment variable
   - Test with multiple requests

5. **Validate Performance**
   - Measure before/after metrics
   - Check structured log output
   - Verify JWT cache hit rate
   - Monitor for errors

### Rollback Strategy

- Each optimization is independent
- Can rollback logging changes without affecting JWT caching
- Git revert specific commits if issues arise
- Monitor error rates and latency after deployment
- Keep console.log fallback if Pino fails to initialize (graceful degradation)

### Future Enhancements (P2/P3)

- **Database Connection Pooling**: Implement PgBouncer or pg.Pool (P2)
- **Distributed Tracing**: Add OpenTelemetry for request tracing (P3)
- **Metrics Export**: Expose Prometheus metrics endpoint (P3)
- **Circuit Breakers**: Add resilience patterns for external calls (P3)
- **Rate Limiting**: Redis-backed rate limiter for API endpoints (P3)

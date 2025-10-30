# TradingSystem Shared Middleware

Centralized Express middleware collection for all TradingSystem services.

## Features

- ✅ **CORS Configuration**: Environment-based origin whitelisting
- ✅ **Rate Limiting**: Configurable request throttling
- ✅ **Security Headers**: Helmet integration with sensible defaults
- ✅ **Error Handling**: Standardized error responses
- ✅ **Health Checks**: Readiness and liveness probes
- ✅ **Correlation IDs**: Distributed tracing support
- ✅ **Request Timeouts**: Automatic request timeout handling

## Installation

```bash
cd backend/shared/middleware
npm install express cors express-rate-limit helmet
```

## Usage

### Quick Start (All Standard Middleware)

```javascript
import express from 'express';
import { createLogger } from '@backend/shared/logger';
import { applyStandardMiddleware } from '@backend/shared/middleware';

const app = express();
const logger = createLogger('my-service');

// Apply all standard middleware at once
applyStandardMiddleware(app, {
  logger,
  timeout: 30000, // 30s request timeout
});

// Add routes...
app.get('/api/data', (req, res) => {
  res.json({ data: [] });
});

app.listen(3000);
```

### Individual Middleware

#### CORS

```javascript
import { configureCors } from '@backend/shared/middleware';

// Default (reads from CORS_ORIGIN env var)
app.use(configureCors({ logger }));

// Custom origins
app.use(configureCors({
  origin: ['http://localhost:3103', 'https://tradingsystem.com'],
  credentials: true,
  logger,
}));

// Disable CORS (unified domain mode)
// Set DISABLE_CORS=true in .env
app.use(configureCors({ logger }));
```

#### Rate Limiting

```javascript
import { configureRateLimit, createStrictRateLimit } from '@backend/shared/middleware';

// Global rate limiting (reads from RATE_LIMIT_* env vars)
app.use(configureRateLimit({ logger }));

// Custom global limit
app.use(configureRateLimit({
  windowMs: 60000, // 1 minute
  max: 100,        // 100 requests
  logger,
}));

// Strict rate limit for specific endpoints
const strictLimiter = createStrictRateLimit({
  windowMs: 60000,
  max: 10, // Only 10 requests per minute
  logger,
});

app.post('/api/expensive-operation', strictLimiter, async (req, res) => {
  // Handler...
});
```

#### Security Headers (Helmet)

```javascript
import { configureHelmet } from '@backend/shared/middleware';

// Default (disabled CORP and COEP for local dev)
app.use(configureHelmet({ logger }));

// Custom configuration
app.use(configureHelmet({
  crossOriginResourcePolicy: true,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  logger,
}));
```

#### Error Handling

```javascript
import { createErrorHandler, createNotFoundHandler } from '@backend/shared/middleware';

// Add routes first...
app.get('/api/users', (req, res) => { /* ... */ });

// 404 handler (before error handler)
app.use(createNotFoundHandler({ logger }));

// Global error handler (last middleware)
app.use(createErrorHandler({ logger, includeStack: true }));
```

#### Correlation IDs

```javascript
import { createCorrelationIdMiddleware } from '@backend/shared/middleware';

// Add correlation ID to all requests
app.use(createCorrelationIdMiddleware());

app.get('/api/data', (req, res) => {
  console.log(req.id); // Auto-generated correlation ID
  res.json({ correlationId: req.id });
});

// Use in inter-service calls
const response = await fetch('http://other-service/api', {
  headers: {
    'x-correlation-id': req.id,
  },
});
```

#### Request Timeouts

```javascript
import { createTimeoutHandler } from '@backend/shared/middleware';

// 30-second timeout for all requests
app.use(createTimeoutHandler({
  timeout: 30000,
  logger,
}));

// Or read from environment
// Set REQUEST_TIMEOUT_MS=30000 in .env
app.use(createTimeoutHandler({ logger }));
```

### Health Checks

#### Basic Health Check

```javascript
import { createHealthCheckHandler } from '@backend/shared/middleware/health';

app.get('/health', createHealthCheckHandler({
  serviceName: 'workspace-api',
  version: '1.0.0',
  logger,
  checks: {
    database: async () => {
      await db.query('SELECT 1');
      return true; // Healthy
    },
  },
}));
```

**Response**:
```json
{
  "status": "healthy",
  "service": "workspace-api",
  "version": "1.0.0",
  "timestamp": "2025-10-29T10:30:45.123Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "message": "OK",
      "responseTime": 12
    }
  },
  "responseTime": 15
}
```

#### Multiple Dependency Checks

```javascript
import { createHealthCheckHandler, commonChecks } from '@backend/shared/middleware/health';

app.get('/health', createHealthCheckHandler({
  serviceName: 'tp-capital',
  version: '1.0.0',
  logger,
  checks: {
    timescale: commonChecks.postgres(timescalePool),
    gatewayDb: commonChecks.postgres(gatewayPool),
    telegramGateway: commonChecks.http('http://localhost:4006/health'),
    cache: commonChecks.redis(redisClient),
  },
}));
```

#### Readiness vs Liveness Probes

```javascript
import {
  createHealthCheckHandler,
  createReadinessHandler,
  createLivenessHandler,
} from '@backend/shared/middleware/health';

// Liveness: Is the service alive?
// Returns 200 if process is running
app.get('/healthz', createLivenessHandler({
  serviceName: 'workspace-api',
  version: '1.0.0',
}));

// Readiness: Is the service ready to serve traffic?
// Returns 503 if ANY dependency is unhealthy
app.get('/ready', createReadinessHandler({
  serviceName: 'workspace-api',
  version: '1.0.0',
  logger,
  checks: {
    database: commonChecks.postgres(dbPool),
  },
}));
```

#### Custom Health Checks

```javascript
import { createHealthCheckHandler, commonChecks } from '@backend/shared/middleware/health';

app.get('/health', createHealthCheckHandler({
  serviceName: 'my-service',
  logger,
  checks: {
    // Custom check with logic
    diskSpace: async () => {
      const { available } = await checkDiskSpace('/data');
      if (available < 1024 * 1024 * 1024) { // < 1GB
        throw new Error('Low disk space');
      }
      return `${(available / 1024 / 1024 / 1024).toFixed(2)} GB available`;
    },

    // Wrap existing function
    queueSize: commonChecks.custom(async () => {
      const size = await queue.size();
      if (size > 10000) {
        throw new Error(`Queue too large: ${size}`);
      }
    }),
  },
}));
```

## Environment Variables

```bash
# CORS
CORS_ORIGIN="http://localhost:3103,http://localhost:3400,http://localhost:3401"  # Comma-separated
DISABLE_CORS=false  # Set to 'true' for unified domain mode

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 minute window
RATE_LIMIT_MAX=120          # 120 requests per window

# Request Timeout
REQUEST_TIMEOUT_MS=30000    # 30 seconds

# Logging
NODE_ENV=development        # 'production' for JSON logs
LOG_LEVEL=info              # trace, debug, info, warn, error, fatal
```

## Best Practices

1. **Apply middleware in order**:
   ```javascript
   app.use(createCorrelationIdMiddleware());
   app.use(configureHelmet());
   app.use(configureCors());
   app.use(configureRateLimit());
   app.use(express.json());
   // ... routes ...
   app.use(createNotFoundHandler());
   app.use(createErrorHandler());
   ```

2. **Use strict rate limits for expensive operations**:
   ```javascript
   app.post('/sync', createStrictRateLimit({ max: 5 }), handler);
   app.delete('/data', createStrictRateLimit({ max: 10 }), handler);
   ```

3. **Include correlation IDs in all requests**:
   ```javascript
   logger.info({ correlationId: req.id }, 'Processing request');
   ```

4. **Separate readiness from liveness**:
   - `/healthz` - Liveness (Kubernetes liveness probe)
   - `/ready` - Readiness (Kubernetes readiness probe)

5. **Log rate limit hits for monitoring**:
   ```javascript
   const limiter = configureRateLimit({ logger });
   // Logger automatically logs when limits are hit
   ```

## Migration Guide

### Before (workspace-api)

```javascript
// apps/workspace/src/server.js
import cors from 'cors';
import rateLimit from 'express-rate-limit';

app.use(cors());
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
}));

app.get('/health', async (req, res) => {
  // Custom health logic...
});
```

### After (shared middleware)

```javascript
// apps/workspace/src/server.js
import { createLogger } from '@backend/shared/logger';
import { applyStandardMiddleware } from '@backend/shared/middleware';
import { createHealthCheckHandler } from '@backend/shared/middleware/health';

const logger = createLogger('workspace-api');

applyStandardMiddleware(app, { logger });

app.get('/health', createHealthCheckHandler({
  serviceName: 'workspace-api',
  version: '1.0.0',
  logger,
  checks: {
    database: async () => await db.getItems(),
  },
}));
```

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Check `CORS_ORIGIN` in `.env`
2. Ensure frontend origin is included
3. Set `credentials: true` if using cookies

### Rate Limit Issues

If legitimate requests are blocked:
1. Increase `RATE_LIMIT_MAX` in `.env`
2. Use `createStrictRateLimit()` only for expensive operations
3. Whitelist specific IPs (advanced)

### Health Check Timeouts

If health checks timeout:
1. Increase timeout: `createHealthCheckHandler({ timeout: 10000 })`
2. Optimize slow dependency checks
3. Consider removing non-critical checks from readiness probe

## Performance

- **Minimal overhead**: All middleware are highly optimized
- **Async health checks**: Run in parallel for fast response
- **Rate limiting**: In-memory store (consider Redis for distributed systems)

## Security

- **Helmet**: Protects against common vulnerabilities (XSS, clickjacking, etc.)
- **Rate limiting**: Prevents DDoS and brute-force attacks
- **CORS**: Prevents unauthorized cross-origin access
- **Error handling**: Never leaks stack traces in production

## Future Enhancements

- [ ] Distributed rate limiting (Redis backend)
- [ ] Circuit breaker middleware
- [ ] Request validation middleware (express-validator wrapper)
- [ ] API key authentication middleware
- [ ] Request/response compression

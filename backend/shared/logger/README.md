# TradingSystem Shared Logger

Centralized Pino-based logging module for all TradingSystem services.

## Features

- ✅ **Unified Configuration**: Single source of truth for logging patterns
- ✅ **Environment-based**: Auto-detects development vs production
- ✅ **Pretty Printing**: Human-readable logs in development, JSON in production
- ✅ **Semantic Helpers**: Domain-specific logging methods (healthCheck, request, etc.)
- ✅ **Correlation IDs**: Built-in support for distributed tracing
- ✅ **CommonJS & ESM**: Works with both module systems

## Installation

```bash
# From project root
cd backend/shared/logger
npm install pino pino-pretty
```

## Usage

### Basic Logger

```javascript
// ESM
import { createLogger } from '@backend/shared/logger';
const logger = createLogger('my-service');

logger.info('Service started');
logger.error({ err: error }, 'Database connection failed');

// CommonJS
const { createLogger } = require('@backend/shared/logger');
const logger = createLogger('my-service');
```

### Configuration

Logger reads from environment variables:

```bash
# Log level (default: 'info')
LOG_LEVEL=debug

# Service-specific override
MY_SERVICE_LOG_LEVEL=trace

# Force pretty printing (default: auto-detect from NODE_ENV)
PRETTY_LOGS=true  # Force pretty
PRETTY_LOGS=false # Force JSON

# Environment (default: 'development')
NODE_ENV=production
```

### Semantic Helper Methods

```javascript
const logger = createLogger('workspace-api');

// Service startup
logger.startup('Workspace API started successfully', { port: 3200 });

// Health checks
logger.healthCheck('database', 'ok', 45);
logger.healthCheck('redis', 'degraded', 1200);

// HTTP requests (usually via middleware)
logger.request(req, res, 123);

// Status aggregation
logger.statusCheck('ok', 5, 0, 0, 234);

// Script execution
logger.scriptExecution('/path/to/script.sh', 0, 1500);

// Database queries
logger.query('SELECT', 'users', 42);

// Errors with context
logger.errorWithContext(error, { userId: 123, action: 'create_order' });
```

### Express Middleware

```javascript
import express from 'express';
import { createLogger, createRequestLogger } from '@backend/shared/logger';

const app = express();
const logger = createLogger('my-api');

// Add request logging middleware
app.use(createRequestLogger(logger));

app.get('/api/users', (req, res) => {
  // All requests are automatically logged with timing
  res.json({ users: [] });
});
```

### Child Loggers (Request Context)

```javascript
import { createLogger, createChildLogger } from '@backend/shared/logger';

const logger = createLogger('api');

app.use((req, res, next) => {
  // Create child logger with request context
  req.log = createChildLogger(logger, {
    correlationId: req.id,
    userId: req.user?.id,
  });
  next();
});

app.get('/api/data', (req, res) => {
  // All logs include correlationId and userId automatically
  req.log.info('Fetching data');
  req.log.error({ err }, 'Failed to fetch data');
});
```

## Custom Options

```javascript
const logger = createLogger('my-service', {
  // Additional base fields (merged with defaults)
  base: {
    version: '1.0.0',
    region: 'us-east-1',
  },

  // Override log level
  level: 'debug',

  // Disable semantic helpers
  enableHelpers: false,
});
```

## Output Formats

### Development (Pretty)

```
[2025-10-29 10:30:45] INFO [workspace-api]: Service started successfully
    port: 3200
    version: "1.0.0"
```

### Production (JSON)

```json
{
  "level": "info",
  "time": "2025-10-29T13:30:45.123Z",
  "service": "workspace-api",
  "pid": 12345,
  "hostname": "app-server-01",
  "msg": "Service started successfully",
  "port": 3200,
  "version": "1.0.0"
}
```

## Migration from Existing Loggers

### Before (service-specific logger)

```javascript
// apps/tp-capital/src/logger.js
import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});
```

### After (shared logger)

```javascript
// apps/tp-capital/src/logger.js
import { createLogger } from '../../../backend/shared/logger/index.js';
export const logger = createLogger('tp-capital');
```

## Best Practices

1. **Create one logger per service** with the service name
2. **Use semantic helpers** for common patterns (healthCheck, request, etc.)
3. **Include context** in log messages: `logger.info({ userId, action }, 'User created')`
4. **Use child loggers** for request-scoped context
5. **Avoid console.log** - Use structured logging instead
6. **Add correlation IDs** to trace requests across services

## Correlation ID Pattern

```javascript
// Generate correlation ID
const correlationId = req.id || req.headers['x-correlation-id'] ||
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Add to request headers when calling other services
const response = await fetch('http://other-service/api', {
  headers: {
    'x-correlation-id': correlationId,
  },
});

// Log with correlation ID
logger.info({ correlationId }, 'Calling external service');
```

## Troubleshooting

### ESM Import Errors

If you get "Cannot use import statement outside a module":

```json
// Add to service's package.json
{
  "type": "module"
}
```

### CommonJS Compatibility

For services using CommonJS, we'll create `index.cjs` wrapper:

```javascript
// backend/shared/logger/index.cjs
const logger = require('./index.js');
module.exports = logger.default;
```

## Performance

- **No performance impact**: Pino is one of the fastest loggers for Node.js
- **Asynchronous I/O**: Logs don't block your application
- **JSON serialization**: ~10x faster than Winston
- **Production optimized**: Disable pretty printing in production for maximum speed

## Security

- **Never log sensitive data**: Passwords, tokens, credit cards
- **Sanitize user input** before logging
- **Use redaction** for sensitive fields:

```javascript
const logger = createLogger('api', {
  redact: ['password', 'token', 'creditCard'],
});
```

## Future Enhancements (Roadmap)

- [ ] Add log rotation (pino-roll)
- [ ] Integrate with log aggregation (Loki, ELK)
- [ ] Add sampling for high-volume services
- [ ] Add redaction patterns for sensitive data
- [ ] Add performance profiling helpers
- [ ] Add APM integration (Datadog, New Relic)

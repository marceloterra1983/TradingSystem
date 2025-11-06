# Backend Services Reference

> **Backend APIs and services** - Implementation details and architecture
> **Last Updated:** 2025-11-05

## Overview

The TradingSystem backend follows a **microservices architecture** with clear separation of concerns. Each service is independently deployable and communicates via HTTP REST APIs.

## Service Catalog

### Active Services

| Service | Port | Technology | Status | Container |
|---------|------|------------|--------|-----------|
| [Workspace API](#workspace-api) | 3200 | Express + TimescaleDB | ✅ Active | Yes |
| [TP Capital](#tp-capital) | 4005 | Express + QuestDB + Telegraf | ✅ Active | Yes |
| [Documentation API](#documentation-api) | 3405 | Express + FlexSearch | ✅ Active | Yes |
| [Service Launcher](#service-launcher) | 3500 | Express | ✅ Active | No |
| [Firecrawl Proxy](#firecrawl-proxy) | 3600 | Express + Firecrawl | ✅ Active | Yes |

### Planned Services

| Service | Port | Technology | Status | Notes |
|---------|------|------------|--------|-------|
| Data Capture | TBD | C# + ProfitDLL | 🚧 Planned | Windows native |
| Order Manager | TBD | C# + Risk Engine | 🚧 Planned | Windows native |
| Analytics Pipeline | TBD | Python + ML | 🚧 Planned | Docker container |

## Service Details

### Workspace API

**Purpose:** Manage workspace items with TimescaleDB persistence

**Location:** `apps/workspace/`

**Port:** 3200

**Technology Stack:**
- Express.js 4.x
- TimescaleDB (time-series database)
- Vite (for standalone UI on port 3900)
- React + TypeScript (UI)

**Key Features:**
- ✅ CRUD operations for workspace items
- ✅ Time-series data storage
- ✅ REST API with validation
- ✅ Health checks
- ✅ Standalone React UI (optional)

**API Endpoints:**
```
GET    /api/items           - List all items
POST   /api/items           - Create new item
GET    /api/items/:id       - Get item by ID
PUT    /api/items/:id       - Update item
DELETE /api/items/:id       - Delete item
GET    /api/health          - Health check
```

**Environment Variables:**
```bash
WORKSPACE_PORT=3200
TIMESCALEDB_HOST=timescaledb
TIMESCALEDB_PORT=7032
TIMESCALEDB_USER=postgres
TIMESCALEDB_PASSWORD=
TIMESCALEDB_DATABASE=workspace
```

**Docker Deployment:**
```yaml
# tools/compose/docker-compose.apps.yml (archived)
# Now runs via individual compose files
workspace:
  build:
    context: ../../apps/workspace
  ports:
    - "3200:3200"
  environment:
    - TIMESCALEDB_HOST=timescaledb
  depends_on:
    - timescaledb
```

**Testing:**
```bash
cd apps/workspace
npm run test              # Run tests
npm run test:coverage     # With coverage
```

**Reference Files:**
- Main server: `apps/workspace/server.js`
- Database client: `apps/workspace/src/lib/timescale.js`
- API routes: `apps/workspace/src/routes/`
- Tests: `apps/workspace/__tests__/`

---

### TP Capital

**Purpose:** Telegram signal ingestion pipeline with QuestDB persistence

**Location:** `apps/tp-capital/`

**Port:** 4005

**Technology Stack:**
- Express.js 4.x
- QuestDB (high-performance time-series)
- Telegraf (Telegram bot framework)
- Redis (caching)
- Pino (structured logging)
- Opossum (circuit breaker)

**Key Features:**
- ✅ Telegram message ingestion via webhook
- ✅ Signal parsing and validation (Zod schemas)
- ✅ QuestDB persistence with ILP (InfluxDB Line Protocol)
- ✅ Redis caching for deduplication
- ✅ Circuit breaker for fault tolerance
- ✅ Prometheus metrics export
- ✅ Rate limiting and security (Helmet, CORS)

**API Endpoints:**
```
POST   /webhook/telegram    - Telegram webhook receiver
GET    /health              - Health check with dependencies
GET    /metrics             - Prometheus metrics
GET    /api/signals         - List signals (optional query API)
GET    /api/signals/:id     - Get signal by ID
```

**Data Flow:**
```
Telegram Bot → Webhook → Signal Parser → Validation → QuestDB
                  ↓
              Redis Cache (dedup)
                  ↓
           Prometheus Metrics
```

**Signal Schema (Zod):**
```typescript
{
  symbol: string,        // e.g., "WINZ25"
  direction: "BUY" | "SELL",
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  timestamp: ISO8601,
  source: string,        // "telegram"
  confidence?: number
}
```

**Environment Variables:**
```bash
TP_CAPITAL_PORT=4005
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
QUESTDB_HOST=questdb
QUESTDB_HTTP_PORT=7040
QUESTDB_ILP_PORT=7039
REDIS_HOST=redis
REDIS_PORT=7079
```

**Docker Deployment:**
```yaml
# apps/tp-capital/docker-compose.yml
tp-capital:
  build:
    context: .
  ports:
    - "4005:4005"
  environment:
    - QUESTDB_HOST=questdb
    - REDIS_HOST=redis
  depends_on:
    - questdb
    - redis
```

**Testing:**
```bash
cd apps/tp-capital
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:coverage     # With coverage report
```

**Circuit Breaker Configuration:**
```javascript
// Opossum circuit breaker for QuestDB writes
const breaker = new CircuitBreaker(writeToQuestDB, {
  timeout: 3000,              // 3s timeout
  errorThresholdPercentage: 50,  // Open after 50% errors
  resetTimeout: 30000         // Try again after 30s
});
```

**Reference Files:**
- Main server: `apps/tp-capital/src/server.js`
- Signal parser: `apps/tp-capital/src/lib/parseSignal.js`
- QuestDB client: `apps/tp-capital/src/lib/questdb-client.js`
- Tests: `apps/tp-capital/src/__tests__/`

---

### Documentation API

**Purpose:** Documentation management with FlexSearch and RAG proxy

**Location:** `backend/api/documentation-api/`

**Port:** 3405

**Technology Stack:**
- Express.js 4.x
- FlexSearch (full-text search)
- Axios (HTTP client for RAG proxy)
- JWT (authentication for RAG)

**Key Features:**
- ✅ Full-text search across documentation
- ✅ RAG proxy with JWT authentication
- ✅ Documentation CRUD operations
- ✅ Health checks for dependencies
- ✅ Auto-indexing on startup

**API Endpoints:**
```
GET    /api/docs            - List all documents
POST   /api/docs            - Create document
GET    /api/docs/:id        - Get document by ID
PUT    /api/docs/:id        - Update document
DELETE /api/docs/:id        - Delete document
GET    /api/search          - Full-text search
GET    /api/v1/rag/search   - RAG semantic search (proxy)
POST   /api/v1/rag/query    - RAG Q&A (proxy)
GET    /api/health          - Health check
```

**RAG Proxy Flow:**
```
Dashboard → Documentation API → LlamaIndex API → Ollama + Qdrant
              (JWT minting)       (semantic search)    (embeddings)
```

**Environment Variables:**
```bash
DOCUMENTATION_API_PORT=3405
RAG_API_URL=http://llamaindex:8202
RAG_JWT_SECRET=
QDRANT_URL=http://qdrant:7050
```

**Security:**
- JWT tokens minted server-side (never exposed to browser)
- Rate limiting on RAG endpoints
- CORS configured for dashboard origin

**Reference Files:**
- Main server: `backend/api/documentation-api/server.js`
- RAG proxy: `backend/api/documentation-api/routes/rag.js`
- FlexSearch index: `backend/api/documentation-api/lib/search.js`

---

### Service Launcher

**Purpose:** Service orchestration and health monitoring

**Location:** `apps/service-launcher/`

**Port:** 3500

**Technology Stack:**
- Express.js 4.x
- Child process management
- Health check aggregation

**Key Features:**
- ✅ Start/stop local services
- ✅ Aggregate health checks
- ✅ Service status monitoring
- ✅ Container health checks
- ✅ Database connectivity checks

**API Endpoints:**
```
GET    /api/status          - All services status
GET    /api/health          - Basic health
GET    /api/health/full     - Comprehensive health (cached 30s)
POST   /api/services/:name/start   - Start service
POST   /api/services/:name/stop    - Stop service
POST   /api/services/:name/restart - Restart service
```

**Health Check Response:**
```json
{
  "overallHealth": "healthy",
  "timestamp": "2025-11-05T10:00:00Z",
  "services": {
    "dashboard": { "status": "running", "port": 3103 },
    "workspace": { "status": "running", "port": 3200 }
  },
  "containers": {
    "timescaledb": { "status": "healthy", "uptime": "2h" },
    "redis": { "status": "healthy", "uptime": "2h" }
  },
  "databases": {
    "timescaledb": { "status": "connected", "latency": "5ms" },
    "redis": { "status": "connected", "latency": "2ms" }
  }
}
```

**Caching:**
- `/api/health/full` is cached for 30 seconds
- Check `X-Cache-Status` header (`HIT` or `MISS`)

**Environment Variables:**
```bash
SERVICE_LAUNCHER_PORT=3500
HEALTH_CHECK_TIMEOUT=5000
CACHE_TTL=30
```

**Reference Files:**
- Main server: `apps/service-launcher/server.js`
- Health checks: `apps/service-launcher/lib/health.js`

---

### Firecrawl Proxy

**Purpose:** Web scraping proxy using Firecrawl API

**Location:** `backend/api/firecrawl-proxy/` (planned location)

**Port:** 3600

**Technology Stack:**
- Express.js 4.x
- Firecrawl API client
- Rate limiting

**Key Features:**
- ✅ Web page scraping
- ✅ Markdown conversion
- ✅ Rate limiting
- ✅ Error handling

**API Endpoints:**
```
POST   /api/scrape          - Scrape URL
GET    /api/health          - Health check
```

**Environment Variables:**
```bash
FIRECRAWL_PORT=3600
FIRECRAWL_API_KEY=
FIRECRAWL_RATE_LIMIT=10
```

---

## Common Patterns

### Express.js Server Setup

All services follow this pattern:

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(compression());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import routes from './routes/index.js';
app.use('/api', routes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Database Connection Pattern

```javascript
import pg from 'pg';
const { Pool } = pg;

class DatabaseClient {
  constructor(config) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 20, // connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed', { duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error', { error: error.message });
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.query('SELECT 1');
      return { status: 'connected' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  async close() {
    await this.pool.end();
  }
}

export default DatabaseClient;
```

### Environment Variable Loading

```javascript
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
const projectRoot = path.resolve(__dirname, '../../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// Validate required variables
const requiredVars = ['DATABASE_HOST', 'DATABASE_PORT', 'API_KEY'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

### Structured Logging (Pino)

```javascript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

// Usage
logger.info({ service: 'workspace-api', port: 3200 }, 'Server started');
logger.error({ error: err.message, stack: err.stack }, 'Database error');
```

### Circuit Breaker Pattern

```javascript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,                  // Timeout after 3 seconds
  errorThresholdPercentage: 50,   // Open after 50% errors
  resetTimeout: 30000,            // Try again after 30 seconds
  rollingCountTimeout: 10000,     // Rolling window for errors
  rollingCountBuckets: 10,        // Number of buckets
  name: 'QuestDB Writer'
};

const breaker = new CircuitBreaker(writeToQuestDB, options);

// Fallback
breaker.fallback(() => ({ error: 'Service unavailable' }));

// Events
breaker.on('open', () => logger.error('Circuit breaker opened!'));
breaker.on('halfOpen', () => logger.warn('Circuit breaker half-open'));
breaker.on('close', () => logger.info('Circuit breaker closed'));

// Usage
try {
  const result = await breaker.fire(data);
} catch (error) {
  logger.error({ error }, 'Circuit breaker error');
}
```

## Testing Strategy

### Unit Tests
```javascript
import { describe, it, expect } from 'vitest';
import { parseSignal } from '../lib/parseSignal.js';

describe('parseSignal', () => {
  it('should parse valid signal', () => {
    const input = 'BUY WINZ25 @ 120000';
    const result = parseSignal(input);
    expect(result.direction).toBe('BUY');
    expect(result.symbol).toBe('WINZ25');
    expect(result.entryPrice).toBe(120000);
  });

  it('should throw on invalid signal', () => {
    const input = 'INVALID';
    expect(() => parseSignal(input)).toThrow();
  });
});
```

### Integration Tests
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Workspace API Integration', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup test database
  });

  it('POST /api/items should create item', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({ title: 'Test Item', description: 'Test' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Item');
  });
});
```

## Security Best Practices

### Input Validation (Zod)
```javascript
import { z } from 'zod';

const SignalSchema = z.object({
  symbol: z.string().min(1).max(10),
  direction: z.enum(['BUY', 'SELL']),
  entryPrice: z.number().positive(),
  stopLoss: z.number().positive(),
  takeProfit: z.number().positive()
});

// Usage
app.post('/api/signals', (req, res) => {
  try {
    const validatedData = SignalSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
});
```

### Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.'
});

app.use('/api/', apiLimiter);
```

### JWT Authentication
```javascript
import jwt from 'jsonwebtoken';

function generateToken(userId) {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Protected route
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ userId: req.userId });
});
```

## Monitoring & Observability

### Prometheus Metrics
```javascript
import promClient from 'prom-client';

const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Deployment

### Docker Build
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3200

CMD ["node", "server.js"]
```

### Docker Compose
```yaml
services:
  workspace:
    build:
      context: ./apps/workspace
    ports:
      - "3200:3200"
    environment:
      - NODE_ENV=production
      - TIMESCALEDB_HOST=timescaledb
    depends_on:
      timescaledb:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3200/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port
lsof -ti:3200 | xargs kill -9

# Or use kill-port script
npm run kill-port -- 3200
```

**Database connection errors:**
```bash
# Check container status
docker ps | grep timescaledb

# Check logs
docker logs timescaledb

# Test connection
psql -h localhost -p 7032 -U postgres -d workspace
```

**Service not starting:**
```bash
# Check logs
cd apps/workspace
npm run dev 2>&1 | tee logs/debug.log

# Validate environment
npm run validate:env
```

## Additional Resources

- **API Documentation:** http://localhost:3404/api/
- **Architecture Review:** [governance/evidence/reports/reviews/architecture-2025-11-01/](../../governance/evidence/reports/reviews/architecture-2025-11-01/)
- **Database Schemas:** [docs/content/database/schema.mdx](../../docs/content/database/schema.mdx)
- **Health Monitoring:** [docs/content/tools/monitoring/](../../docs/content/tools/monitoring/)

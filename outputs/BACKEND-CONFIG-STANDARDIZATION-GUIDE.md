# Backend Configuration Standardization Guide
**Date:** 2025-11-07
**Related:** BACKEND-CONFIG-AUDIT-2025-11-07.md

---

## Quick Start (TL;DR)

```bash
# 1. Install Zod dependency (if not already installed)
cd /home/marce/Projetos/TradingSystem
npm install --workspace-root zod

# 2. Create shared config module
cat > backend/shared/config/index.ts << 'EOF'
[See "Shared Config Module" section below]
EOF

# 3. Delete local .env files
rm backend/api/telegram-gateway/.env

# 4. Update service config (example: workspace)
# Edit backend/api/workspace/src/config.js
# [See "Migration Examples" section below]

# 5. Test all services
bash scripts/maintenance/health-check-all.sh
```

---

## Shared Config Module (Copy-Paste Ready)

### File: `/backend/shared/config/index.ts`

```typescript
/**
 * Shared Configuration Module for TradingSystem Backend Services
 *
 * Usage:
 *   import { createServiceConfig } from '../../../shared/config/index.js';
 *   import { z } from 'zod';
 *
 *   export const config = createServiceConfig('my-service', {
 *     MY_SERVICE_PORT: z.coerce.number().int().positive().default(3000),
 *     MY_SERVICE_DATABASE_URL: z.string().url(),
 *   });
 *
 * Benefits:
 *   - Type-safe configuration (TypeScript/IntelliSense)
 *   - Runtime validation (fails fast on missing/invalid vars)
 *   - Centralized .env loading (always uses project root)
 *   - Consistent error messages
 *   - Works in Docker and dev mode
 */

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ============================================================================
// ENVIRONMENT FILE LOADING (Project Root)
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve project root (3 levels up from backend/shared/config)
const projectRoot = path.resolve(__dirname, '../../..');
const envPath = path.join(projectRoot, '.env');

// Load .env file (only if not in Docker)
const isDocker = process.env.RUNNING_IN_DOCKER === 'true' || !fs.existsSync(envPath);

if (!isDocker) {
  console.log(`[shared/config] Loading .env from: ${envPath}`);
  const result = loadEnv({ path: envPath });

  if (result.error) {
    console.warn(`[shared/config] Warning: Could not load .env file: ${result.error.message}`);
  } else {
    console.log(`[shared/config] .env loaded successfully (${Object.keys(result.parsed || {}).length} variables)`);
  }
} else {
  console.log('[shared/config] Running in Docker - using container environment variables');
}

// ============================================================================
// BASE SCHEMA (Shared Across All Services)
// ============================================================================

const baseSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Logging
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Security (optional, but recommended)
  INTER_SERVICE_SECRET: z
    .string()
    .min(32, 'INTER_SERVICE_SECRET must be at least 32 characters')
    .optional(),
});

// ============================================================================
// SERVICE CONFIG BUILDER
// ============================================================================

/**
 * Create a type-safe, validated configuration object for a service
 *
 * @param serviceName - Name of the service (for logging)
 * @param schema - Zod schema object with service-specific env vars
 * @returns Validated configuration object (type-safe)
 * @throws Error if validation fails
 *
 * @example
 * ```typescript
 * export const config = createServiceConfig('workspace-api', {
 *   WORKSPACE_PORT: z.coerce.number().int().positive().default(3200),
 *   POSTGRES_DATABASE: z.string().min(1),
 * });
 *
 * // Type-safe access:
 * config.WORKSPACE_PORT // number
 * config.POSTGRES_DATABASE // string
 * config.NODE_ENV // 'development' | 'production' | 'test'
 * ```
 */
export function createServiceConfig<T extends z.ZodRawShape>(
  serviceName: string,
  schema: T
) {
  // Merge base schema with service-specific schema
  const fullSchema = baseSchema.merge(z.object(schema));

  // Parse environment variables
  const parsed = fullSchema.safeParse(process.env);

  // Validation failed - throw detailed error
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => {
      const path = e.path.join('.');
      const message = e.message;
      return `  - ${path}: ${message}`;
    });

    const errorMessage = [
      `[${serviceName}] Invalid configuration:`,
      ...errors,
      '',
      'Please check your .env file or environment variables.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Success - log and return validated config
  console.log(`[${serviceName}] Configuration loaded successfully`);

  return parsed.data;
}

// ============================================================================
// COMMON SCHEMAS (Reusable Patterns)
// ============================================================================

/**
 * PostgreSQL connection schema (reusable)
 *
 * @example
 * ```typescript
 * export const config = createServiceConfig('my-api', {
 *   ...postgresSchema('MY_SERVICE'),
 *   MY_SERVICE_PORT: z.coerce.number().default(3000),
 * });
 * ```
 */
export function postgresSchema(prefix: string) {
  return {
    [`${prefix}_DATABASE_URL`]: z.string().url().optional(),
    [`${prefix}_HOST`]: z.string().default('localhost'),
    [`${prefix}_PORT`]: z.coerce.number().int().positive().default(5432),
    [`${prefix}_DATABASE`]: z.string().min(1),
    [`${prefix}_USER`]: z.string().min(1),
    [`${prefix}_PASSWORD`]: z.string().min(8),
    [`${prefix}_SCHEMA`]: z.string().default('public'),
    [`${prefix}_SSL`]: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .default('false'),
    [`${prefix}_POOL_MAX`]: z.coerce.number().int().positive().default(20),
    [`${prefix}_POOL_MIN`]: z.coerce.number().int().positive().default(2),
    [`${prefix}_IDLE_TIMEOUT`]: z.coerce.number().int().positive().default(30000),
    [`${prefix}_CONNECTION_TIMEOUT`]: z.coerce.number().int().positive().default(5000),
  } as const;
}

/**
 * Redis connection schema (reusable)
 */
export function redisSchema(prefix: string) {
  return {
    [`${prefix}_REDIS_ENABLED`]: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .default('false'),
    [`${prefix}_REDIS_HOST`]: z.string().default('localhost'),
    [`${prefix}_REDIS_PORT`]: z.coerce.number().int().positive().default(6379),
    [`${prefix}_REDIS_PASSWORD`]: z.string().optional(),
    [`${prefix}_REDIS_DB`]: z.coerce.number().int().min(0).default(0),
  } as const;
}

/**
 * HTTP server schema (reusable)
 */
export function httpServerSchema(portEnvVar: string, defaultPort: number) {
  return {
    [portEnvVar]: z.coerce.number().int().positive().default(defaultPort),
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:3103,http://localhost:3400'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  } as const;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build PostgreSQL connection string from config
 *
 * @example
 * ```typescript
 * const connectionString = buildPostgresUrl(config, 'MY_SERVICE');
 * // postgresql://user:pass@host:5432/dbname?schema=public
 * ```
 */
export function buildPostgresUrl(
  config: Record<string, any>,
  prefix: string
): string {
  const host = config[`${prefix}_HOST`];
  const port = config[`${prefix}_PORT`];
  const database = config[`${prefix}_DATABASE`];
  const user = config[`${prefix}_USER`];
  const password = config[`${prefix}_PASSWORD`];
  const schema = config[`${prefix}_SCHEMA`];
  const ssl = config[`${prefix}_SSL`];

  const url = new URL(`postgresql://${host}:${port}/${database}`);
  url.username = user;
  url.password = password;
  url.searchParams.set('schema', schema);

  if (ssl) {
    url.searchParams.set('sslmode', 'require');
  }

  return url.toString();
}

/**
 * Redact sensitive values for logging
 */
export function redactConfig(config: Record<string, any>): Record<string, any> {
  const redacted = { ...config };
  const sensitiveKeys = ['PASSWORD', 'SECRET', 'TOKEN', 'KEY', 'API_KEY'];

  for (const key in redacted) {
    if (sensitiveKeys.some((sensitive) => key.includes(sensitive))) {
      redacted[key] = '***REDACTED***';
    }
  }

  return redacted;
}
```

---

## Migration Examples

### Example 1: Workspace API (JavaScript)

**Before:** `/backend/api/workspace/src/config.js`
```javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.WORKSPACE_PORT ?? process.env.PORT ?? 3200),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  dbStrategy: (process.env.LIBRARY_DB_STRATEGY ?? 'postgresql').toLowerCase(),
  lowdbPath: process.env.DB_PATH ?? path.join(projectRoot, 'backend', 'data', 'workspace', 'library.json'),
};

export const timescaledbConfig = {
  connectionString: process.env.WORKSPACE_DATABASE_URL ?? process.env.FRONTEND_APPS_DATABASE_URL,
  host: process.env.WORKSPACE_DATABASE_HOST ?? process.env.FRONTEND_APPS_DB_HOST ?? 'localhost',
  port: Number(process.env.WORKSPACE_DATABASE_PORT ?? process.env.FRONTEND_APPS_DB_PORT ?? 5450),
  database: process.env.WORKSPACE_DATABASE_NAME ?? process.env.FRONTEND_APPS_DB_NAME ?? 'workspace',
  // ... more config
};
```

**After:** `/backend/api/workspace/src/config.js` (with shared module)
```javascript
import { createServiceConfig, postgresSchema } from '../../../shared/config/index.js';
import { z } from 'zod';
import path from 'node:path';

export const config = createServiceConfig('workspace-api', {
  // HTTP Server
  WORKSPACE_PORT: z.coerce.number().int().positive().default(3200),

  // Database Strategy
  LIBRARY_DB_STRATEGY: z
    .enum(['neon', 'postgresql', 'timescaledb', 'lowdb'])
    .default('postgresql'),

  // LowDB (optional)
  DB_PATH: z
    .string()
    .default(path.resolve(process.cwd(), 'backend/data/workspace/library.json')),

  // PostgreSQL (using reusable schema helper)
  ...postgresSchema('WORKSPACE_DATABASE'),

  // Alternative PostgreSQL prefix
  FRONTEND_APPS_DATABASE_URL: z.string().url().optional(),
  FRONTEND_APPS_DB_HOST: z.string().optional(),
  FRONTEND_APPS_DB_PORT: z.coerce.number().int().positive().optional(),
  FRONTEND_APPS_DB_NAME: z.string().optional(),
  FRONTEND_APPS_DB_USER: z.string().optional(),
  FRONTEND_APPS_DB_PASSWORD: z.string().optional(),
  FRONTEND_APPS_DB_SCHEMA: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3103,http://localhost:3400'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
});

// Helper to get effective PostgreSQL config (handles fallbacks)
export function getPostgresConfig() {
  return {
    connectionString: config.WORKSPACE_DATABASE_URL || config.FRONTEND_APPS_DATABASE_URL,
    host: config.WORKSPACE_DATABASE_HOST || config.FRONTEND_APPS_DB_HOST || 'localhost',
    port: config.WORKSPACE_DATABASE_PORT || config.FRONTEND_APPS_DB_PORT || 5450,
    database: config.WORKSPACE_DATABASE_DATABASE || config.FRONTEND_APPS_DB_NAME || 'workspace',
    user: config.WORKSPACE_DATABASE_USER || config.FRONTEND_APPS_DB_USER || 'postgres',
    password: config.WORKSPACE_DATABASE_PASSWORD || config.FRONTEND_APPS_DB_PASSWORD || 'workspace_secure_pass',
    schema: config.WORKSPACE_DATABASE_SCHEMA || config.FRONTEND_APPS_DB_SCHEMA || 'workspace',
    ssl: config.WORKSPACE_DATABASE_SSL || false,
    max: config.WORKSPACE_DATABASE_POOL_MAX || 20,
    idleTimeoutMillis: config.WORKSPACE_DATABASE_IDLE_TIMEOUT || 30000,
    connectionTimeoutMillis: config.WORKSPACE_DATABASE_CONNECTION_TIMEOUT || 5000,
  };
}
```

**Migration Steps:**
1. Add `import { createServiceConfig, postgresSchema } from '../../../shared/config/index.js';`
2. Add `import { z } from 'zod';`
3. Replace `export const config = { ... }` with `createServiceConfig('workspace-api', { ... })`
4. Convert each `process.env.VAR ?? 'default'` to `VAR: z.coerce.number().default(value)`
5. Test: `cd backend/api/workspace && npm start`

---

### Example 2: Documentation API (JavaScript)

**Before:** `/backend/api/documentation-api/src/config/appConfig.js`
```javascript
import './load-env-wrapper.js';

const defaultStrategy = process.env.NODE_ENV === 'test' ? 'none' : 'none';
const rawStrategy = (process.env.DOCUMENTATION_DB_STRATEGY || defaultStrategy).toLowerCase();

export const config = {
  server: {
    port: Number(process.env.PORT || 3400)
  },
  vectors: {
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  },
  database: {
    strategy: rawStrategy
  },
  // ... more config
};
```

**After:** `/backend/api/documentation-api/src/config/appConfig.js`
```javascript
import { createServiceConfig } from '../../../../shared/config/index.js';
import { z } from 'zod';

export const config = createServiceConfig('documentation-api', {
  // HTTP Server (NOTE: Changed from 3400 to 3405 to match Docker)
  PORT: z.coerce.number().int().positive().default(3405),

  // Database Strategy
  DOCUMENTATION_DB_STRATEGY: z
    .enum(['questdb', 'postgres', 'none'])
    .default('none'),

  // QuestDB (optional)
  QUESTDB_HOST: z.string().default('localhost'),
  QUESTDB_PORT: z.coerce.number().int().positive().default(9000),
  QUESTDB_USER: z.string().default('admin'),
  QUESTDB_PASSWORD: z.string().min(1).default('quest'),
  QUESTDB_DATABASE: z.string().default('questdb'),

  // PostgreSQL (optional)
  DOCUMENTATION_DATABASE_URL: z.string().url().optional(),
  DOCUMENTATION_DATABASE_SCHEMA: z.string().default('public'),
  DOCUMENTATION_DATABASE_SSL: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  DOCUMENTATION_DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DOCUMENTATION_DATABASE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // Vector Search
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_COLLECTION: z.string().default('documentation'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  DOCS_CHUNK_SIZE: z.coerce.number().int().positive().default(800),
  DOCS_CHUNK_OVERLAP: z.coerce.number().int().positive().default(120),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3103,http://localhost:3400,http://localhost:3401'),
  DISABLE_CORS: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),

  // Prometheus
  PROMETHEUS_URL: z.string().url().default('http://localhost:9090'),
});

// Helper functions (preserve backward compatibility)
export function isPostgresStrategy() {
  return config.DOCUMENTATION_DB_STRATEGY === 'postgres';
}

export function isQuestDbStrategy() {
  return config.DOCUMENTATION_DB_STRATEGY === 'questdb';
}
```

**Delete:** `/backend/api/documentation-api/src/config/load-env-wrapper.js` (no longer needed)

---

### Example 3: Telegram Gateway API (JavaScript with Validation)

**Before:** `/backend/api/telegram-gateway/src/config.js`
```javascript
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

const envPath = path.join(__projectRoot, '.env');
const isDocker = !fs.existsSync(envPath) || process.env.RUNNING_IN_DOCKER === 'true';

if (!isDocker) {
  dotenv.config({ path: envPath });
}

export const config = {
  port: toInt(process.env.TELEGRAM_GATEWAY_API_PORT, 4010),
  apiToken: process.env.TELEGRAM_GATEWAY_API_TOKEN || process.env.API_SECRET_TOKEN || '',
  database: {
    url: fallbackDbUrl,
    host: dbHost,
    port: dbPort,
    // ... more config
  },
};

export const validateConfig = (logger) => {
  const errors = [];
  if (!config.database.url) {
    errors.push('TELEGRAM_GATEWAY_DB_URL (or TIMESCALEDB_URL) is required');
  }
  if (!config.apiToken) {
    errors.push('TELEGRAM_GATEWAY_API_TOKEN or API_SECRET_TOKEN is required');
  }
  if (errors.length > 0) {
    logger.error({ errors }, 'Telegram Gateway API configuration invalid');
    throw new Error('Configuration validation failed');
  }
};
```

**After:** `/backend/api/telegram-gateway/src/config.js`
```javascript
import { createServiceConfig, buildPostgresUrl } from '../../../shared/config/index.js';
import { z } from 'zod';
import path from 'node:path';

export const config = createServiceConfig('telegram-gateway-api', {
  // HTTP Server
  TELEGRAM_GATEWAY_API_PORT: z.coerce.number().int().positive().default(4010),

  // API Authentication (REQUIRED)
  TELEGRAM_GATEWAY_API_TOKEN: z
    .string()
    .min(32, 'API token must be at least 32 characters')
    .or(z.literal(process.env.API_SECRET_TOKEN || ''))
    .refine((val) => val.length >= 32, 'Either TELEGRAM_GATEWAY_API_TOKEN or API_SECRET_TOKEN is required'),

  // Database (REQUIRED)
  TELEGRAM_GATEWAY_DB_URL: z
    .string()
    .url()
    .or(z.literal(process.env.TIMESCALEDB_URL || ''))
    .refine((val) => val.length > 0, 'TELEGRAM_GATEWAY_DB_URL or TIMESCALEDB_URL is required'),

  // Database connection details (fallbacks)
  TELEGRAM_GATEWAY_DB_HOST: z.string().default('localhost'),
  TELEGRAM_GATEWAY_DB_PORT: z.coerce.number().int().positive().default(5434),
  TELEGRAM_GATEWAY_DB_NAME: z.string().default('telegram_gateway'),
  TELEGRAM_GATEWAY_DB_USER: z.string().default('telegram'),
  TELEGRAM_GATEWAY_DB_PASSWORD: z.string().min(8).default('telegram_secure_pass'),
  TELEGRAM_GATEWAY_DB_SCHEMA: z.string().default('telegram_gateway'),
  TELEGRAM_GATEWAY_DB_TABLE: z.string().default('messages'),
  TELEGRAM_GATEWAY_DB_SSL: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),

  // Connection pooling
  TELEGRAM_GATEWAY_DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  TELEGRAM_GATEWAY_DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  TELEGRAM_GATEWAY_DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // Pagination
  TELEGRAM_GATEWAY_DEFAULT_PAGE_SIZE: z.coerce.number().int().positive().default(50),
  TELEGRAM_GATEWAY_MAX_PAGE_SIZE: z.coerce.number().int().positive().max(10000).default(10000),
});

// SQL migrations directory (computed value)
export const assetsDir = path.join(
  process.cwd(),
  'backend/data/timescaledb/telegram-gateway'
);

// ❌ DELETE validateConfig() - Zod handles validation automatically
```

**Delete:**
1. `/backend/api/telegram-gateway/.env` file (move vars to root .env)
2. `validateConfig()` function (replaced by Zod)
3. Docker detection logic (shared module handles it)

**Update:** `/backend/api/telegram-gateway/src/server.js`
```javascript
// BEFORE
import { config, validateConfig } from './config.js';
validateConfig(logger);

// AFTER
import { config } from './config.js';
// No validateConfig() call needed - Zod validates on import
```

---

### Example 4: Firecrawl Proxy (Minimal Service)

**Before:** `/backend/api/firecrawl-proxy/src/server.js`
```javascript
const PORT = process.env.PORT || 3600;
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
```

**After:** Create `/backend/api/firecrawl-proxy/src/config.js`
```javascript
import { createServiceConfig } from '../../../shared/config/index.js';
import { z } from 'zod';

export const config = createServiceConfig('firecrawl-proxy', {
  // HTTP Server (NOTE: Changed from PORT to FIRECRAWL_PROXY_PORT)
  FIRECRAWL_PROXY_PORT: z.coerce.number().int().positive().default(3600),

  // Firecrawl API
  FIRECRAWL_API_URL: z.string().url().default('https://api.firecrawl.dev'),
  FIRECRAWL_API_KEY: z.string().min(1), // REQUIRED

  // HTTP Client
  FIRECRAWL_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  // CORS
  CORS_ORIGIN: z.string().default('*'), // Allow all (proxy service)

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});
```

**Update:** `/backend/api/firecrawl-proxy/src/server.js`
```javascript
// BEFORE
const PORT = process.env.PORT || 3600;
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// AFTER
import { config } from './config.js';

const PORT = config.FIRECRAWL_PROXY_PORT;
const FIRECRAWL_API_URL = config.FIRECRAWL_API_URL;
const FIRECRAWL_API_KEY = config.FIRECRAWL_API_KEY;

// Or use config directly:
app.listen(config.FIRECRAWL_PROXY_PORT, () => { /* ... */ });
```

---

## Docker Compose Updates

### Update Environment Variable Names

**Before:** `tools/compose/docker-compose.firecrawl.yml`
```yaml
firecrawl-proxy:
  environment:
    - PORT=3600  # ❌ Generic
```

**After:**
```yaml
firecrawl-proxy:
  env_file:
    - ../../.env  # ✅ Use root .env
  environment:
    - FIRECRAWL_PROXY_PORT=3600  # ✅ Service-specific
    - RUNNING_IN_DOCKER=true  # ✅ Explicit Docker flag
```

---

## Root .env Updates

Add service-specific port variables to `/home/marce/Projetos/TradingSystem/.env`:

```bash
# ============================================================================
# API SERVICE PORTS (Explicit, No Conflicts)
# ============================================================================

# Workspace API
WORKSPACE_PORT=3200

# Documentation API
DOCS_API_PORT=3405

# Telegram Gateway API
TELEGRAM_GATEWAY_API_PORT=4010

# Firecrawl Proxy
FIRECRAWL_PROXY_PORT=3600

# Course Crawler API
COURSE_CRAWLER_API_PORT=3601

# ❌ DEPRECATED: Generic PORT variable (causes conflicts)
# PORT=3000  # DO NOT USE - conflicts with multiple services
```

---

## Testing Checklist

### 1. Unit Test Configuration Loading

```javascript
// backend/api/workspace/src/config.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { config } from './config.js';

describe('Workspace API Configuration', () => {
  it('should load configuration without errors', () => {
    expect(config).toBeDefined();
    expect(config.WORKSPACE_PORT).toBeTypeOf('number');
    expect(config.NODE_ENV).toMatch(/development|production|test/);
  });

  it('should have required database fields', () => {
    expect(config.WORKSPACE_DATABASE_DATABASE).toBeDefined();
    expect(config.WORKSPACE_DATABASE_USER).toBeDefined();
    expect(config.WORKSPACE_DATABASE_PASSWORD).toBeDefined();
  });

  it('should validate port number', () => {
    expect(config.WORKSPACE_PORT).toBeGreaterThan(0);
    expect(config.WORKSPACE_PORT).toBeLessThan(65536);
  });
});
```

Run tests:
```bash
cd backend/api/workspace
npm run test
```

### 2. Integration Test (Server Startup)

```bash
# Start service and check health
cd backend/api/workspace
npm start &
SERVICE_PID=$!

# Wait for startup
sleep 5

# Check health endpoint
curl -f http://localhost:3200/health

# Cleanup
kill $SERVICE_PID
```

### 3. Docker Test

```bash
# Build and start container
docker compose -f tools/compose/docker-compose.workspace-simple.yml up -d --build

# Check health
docker compose -f tools/compose/docker-compose.workspace-simple.yml exec workspace-api curl -f http://localhost:3200/health

# Check logs for config errors
docker compose -f tools/compose/docker-compose.workspace-simple.yml logs workspace-api | grep -i "configuration loaded"

# Cleanup
docker compose -f tools/compose/docker-compose.workspace-simple.yml down
```

### 4. Full System Test

```bash
# Run comprehensive health check
bash scripts/maintenance/health-check-all.sh

# Expected output:
# ✅ workspace-api: http://localhost:3200/health (200 OK)
# ✅ documentation-api: http://localhost:3405/health (200 OK)
# ✅ telegram-gateway-api: http://localhost:4010/health (200 OK)
# ✅ firecrawl-proxy: http://localhost:3600/health (200 OK)
```

---

## Troubleshooting

### Error: "Invalid configuration: WORKSPACE_PORT: Expected number, received string"

**Cause:** Environment variable is a string, not coerced to number

**Fix:** Use `z.coerce.number()` instead of `z.number()`

```typescript
// ❌ WRONG
WORKSPACE_PORT: z.number().default(3200),

// ✅ CORRECT
WORKSPACE_PORT: z.coerce.number().int().positive().default(3200),
```

---

### Error: "Could not load .env file: ENOENT"

**Cause:** .env file not found (wrong path)

**Fix:** Verify shared config module resolves to project root

```javascript
// backend/shared/config/index.ts
const projectRoot = path.resolve(__dirname, '../../..');
console.log('Project root:', projectRoot);
console.log('.env path:', path.join(projectRoot, '.env'));
```

Expected output:
```
Project root: /home/marce/Projetos/TradingSystem
.env path: /home/marce/Projetos/TradingSystem/.env
```

---

### Error: "API key not configured" (health check)

**Cause:** Required env var missing (e.g., `FIRECRAWL_API_KEY`)

**Fix:** Add variable to root .env

```bash
# .env
FIRECRAWL_API_KEY=fc-6219b4e35fd240048969fa768ad9a2cd
```

Then restart service:
```bash
docker compose -f tools/compose/docker-compose.firecrawl.yml restart firecrawl-proxy
```

---

### Port Already in Use

**Cause:** Generic `PORT` variable conflicts between services

**Fix:** Use service-specific port variables

```bash
# ❌ BEFORE (.env)
PORT=3200  # Conflicts with multiple services

# ✅ AFTER (.env)
WORKSPACE_PORT=3200
DOCS_API_PORT=3405
TELEGRAM_GATEWAY_API_PORT=4010
FIRECRAWL_PROXY_PORT=3600
```

---

## Rollback Plan

If migration causes issues, revert with Git:

```bash
# Restore original config files
git checkout HEAD -- backend/api/workspace/src/config.js
git checkout HEAD -- backend/api/documentation-api/src/config/appConfig.js

# Restart services
docker compose -f tools/compose/docker-compose.workspace-simple.yml restart workspace-api
docker compose -f tools/compose/docker-compose.docs.yml restart docs-api

# Verify health
bash scripts/maintenance/health-check-all.sh
```

---

## Next Steps

After standardizing configuration:

1. **Update CI/CD:** Add config validation step to GitHub Actions
2. **Create config tests:** Unit tests for each service's config
3. **Document .env variables:** Add comments to `.env.example`
4. **Implement config linting:** ESLint rule to prevent `process.env` outside config files
5. **Add config versioning:** Track breaking changes to env vars

---

## References

- **Audit Report:** `BACKEND-CONFIG-AUDIT-2025-11-07.md`
- **Zod Documentation:** https://zod.dev/
- **12-Factor App Config:** https://12factor.net/config
- **Environment Best Practices:** https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices

---

**End of Guide**

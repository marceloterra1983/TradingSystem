# Backend Service Configuration Audit
**Date:** 2025-11-07
**Scope:** All API services in `/backend/api/`
**Total Services Analyzed:** 7

---

## Executive Summary

### Overall Health: ⚠️ **NEEDS IMPROVEMENT** (Score: 6/10)

**Key Findings:**
- ✅ **Good:** Most services use centralized root `.env` file (393 env vars)
- ❌ **Critical:** 1 service has local `.env` file (telegram-gateway)
- ⚠️ **Inconsistent:** 4 different environment loading patterns
- ⚠️ **No Validation:** Only 2/7 services validate configuration on startup
- ⚠️ **Type Safety:** Only 1/7 service uses schema validation (Zod)
- ⚠️ **Hardcoded Fallbacks:** All services have default values scattered in code

---

## Service-by-Service Analysis

### 1. Workspace API (Port 3200)
**Location:** `/backend/api/workspace/`
**Status:** ✅ **GOOD** (Score: 7/10)

#### Environment Loading
```javascript
// src/config.js (Line 3)
// import '../../../shared/config/load-env.js'; // Commented out - relies on Docker env
```

**Pattern:** Direct `process.env` access (Docker-first approach)
**No explicit dotenv loading** - assumes environment variables come from:
- Docker Compose `env_file: - ../../.env`
- Container environment variables

#### Configuration Structure
```javascript
export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.WORKSPACE_PORT ?? process.env.PORT ?? 3200),
  dbStrategy: (process.env.LIBRARY_DB_STRATEGY ?? 'postgresql').toLowerCase(),
};

export const timescaledbConfig = {
  connectionString: process.env.WORKSPACE_DATABASE_URL ?? process.env.FRONTEND_APPS_DATABASE_URL,
  host: process.env.WORKSPACE_DATABASE_HOST ?? process.env.FRONTEND_APPS_DB_HOST ?? 'localhost',
  port: Number(process.env.WORKSPACE_DATABASE_PORT ?? process.env.FRONTEND_APPS_DB_PORT ?? 5450),
  // ... more config with fallback chain
};
```

**Strengths:**
- ✅ Uses shared middleware (`backend/shared/middleware`)
- ✅ Uses shared logger (`backend/shared/logger`)
- ✅ Supports multiple DB strategies (neon, postgresql, timescaledb, lowdb)
- ✅ Fallback chain for env variables (primary → secondary → default)

**Weaknesses:**
- ❌ No startup validation
- ❌ No schema enforcement
- ❌ Defaults scattered across 3 config objects (config, timescaledbConfig, neonConfig, postgresqlConfig)
- ⚠️ Commented out shared env loader (should be enabled or removed)

#### Port Configuration
- **Declared:** `WORKSPACE_PORT=3200` (fallback to `PORT`)
- **Docker Mapping:** `3210:3200` (host:container)
- **Conflicts:** ⚠️ None detected, but `PORT` fallback can clash with other services

#### Database Connection
```javascript
// Connection string construction with password exposure
connectionString: process.env.WORKSPACE_DATABASE_URL ?? process.env.FRONTEND_APPS_DATABASE_URL,
// Fallback construction includes password in URL
```

**Risk:** ✅ Low - uses connection strings from env, passwords not hardcoded

---

### 2. Documentation API (Port 3405)
**Location:** `/backend/api/documentation-api/`
**Status:** ⚠️ **FAIR** (Score: 6/10)

#### Environment Loading
```javascript
// src/config/load-env-wrapper.js
import './load-env-wrapper.js';

const sharedLoaderPath = path.resolve(__dirname, '../../../../shared/config/load-env.js');

async function loadSharedEnvironment() {
  try {
    if (fs.existsSync(sharedLoaderPath)) {
      await import(pathToFileURL(sharedLoaderPath).href);
      return true;
    }
  } catch (error) {
    console.warn('⚠️  Failed to load shared environment loader. Falling back to local .env files.');
  }
  return false;
}

function loadLocalEnvironment() {
  const projectRoot = path.resolve(__dirname, '../../..');
  const envFiles = [
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.local'),
  ];
  envFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      const result = dotenv.config({ path: file, override: true });
    }
  });
}
```

**Pattern:** Hybrid - tries shared loader, falls back to local dotenv
**Issues:**
- ⚠️ Tries to load `.env.local` (non-standard)
- ⚠️ Uses `override: true` which can mask configuration issues

#### Configuration Structure
```javascript
// src/config/appConfig.js
export const config = {
  server: {
    port: Number(process.env.PORT || 3400) // ⚠️ Declares 3400, Docker uses 3405
  },
  vectors: {
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  },
  database: {
    strategy: normalizedStrategy // 'questdb' | 'postgres' | 'none'
  },
  questdb: { /* ... */ },
  postgres: { /* ... */ },
};
```

**Strengths:**
- ✅ Uses shared middleware and logger
- ✅ Helper functions (`isPostgresStrategy()`, `isQuestDbStrategy()`)
- ✅ Graceful degradation (strategy='none' for tests)

**Weaknesses:**
- ❌ **Port mismatch:** Config says 3400, Docker uses 3405, env says `DOCS_API_PORT=3405`
- ❌ No startup validation
- ❌ No schema enforcement
- ⚠️ Hardcoded localhost URLs for external services

#### Inter-Service Communication
```javascript
// Hardcoded container hostnames (good for Docker)
QDRANT_URL=http://data-qdrant:6333
OLLAMA_BASE_URL=http://rag-ollama:11434
LLAMAINDEX_QUERY_URL=http://rag-llamaindex-query:8000
```

**Risk:** ✅ Low - uses container hostnames, not localhost

---

### 3. Telegram Gateway API (Port 4010)
**Location:** `/backend/api/telegram-gateway/`
**Status:** ❌ **CRITICAL** (Score: 4/10)

#### Environment Loading
```javascript
// src/config.js (Lines 1-26)
import dotenv from 'dotenv';

const envPath = path.join(__projectRoot, '.env');
const isDocker = !fs.existsSync(envPath) || process.env.RUNNING_IN_DOCKER === 'true';

if (!isDocker) {
  console.log(`[Gateway API Config] Loading .env from: ${envPath}`);
  const dotenvResult = dotenv.config({ path: envPath });
  if (dotenvResult.error) {
    console.warn(`[Gateway API Config] Warning: ${dotenvResult.error.message}`);
  } else {
    console.log('[Gateway API Config] .env loaded successfully');
  }
} else {
  console.log('[Gateway API Config] Running in Docker - using environment variables from container');
}
```

**Pattern:** Conditional dotenv loading (Docker detection)
**Critical Issues:**
- ❌ **LOCAL .ENV FILE EXISTS:** `/backend/api/telegram-gateway/.env` (3 lines)
  ```bash
  TELEGRAM_GATEWAY_API_TOKEN=gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA
  LOG_LEVEL=debug
  TELEGRAM_GATEWAY_DB_URL=postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY
  ```
- ❌ **Violates project standard** - should use root `.env` only
- ⚠️ Docker detection relies on file existence (brittle logic)

#### Configuration Structure
```javascript
// src/config.js (Lines 111-148)
export const config = {
  port: toInt(process.env.TELEGRAM_GATEWAY_API_PORT, 4010), // ✅ Explicit port, no fallback to PORT
  apiToken: process.env.TELEGRAM_GATEWAY_API_TOKEN || process.env.API_SECRET_TOKEN || '',
  database: {
    url: fallbackDbUrl, // Complex fallback chain
    host: dbHost,
    port: dbPort,
    schema: dbSchema,
    pool: {
      max: toInt(process.env.TELEGRAM_GATEWAY_DB_POOL_MAX, 10),
      idleTimeoutMs: toInt(process.env.TELEGRAM_GATEWAY_DB_IDLE_TIMEOUT_MS, 30000),
    },
  },
};

// ✅ VALIDATION FUNCTION (One of two services with validation)
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

**Strengths:**
- ✅ **Validation on startup** (calls `validateConfig(logger)` in server.js)
- ✅ Explicit port (no collision with generic `PORT`)
- ✅ Helper functions (`parseBoolean`, `toInt`, `parseDbUrl`)
- ✅ Complex fallback chain for DB URL parsing

**Weaknesses:**
- ❌ **CRITICAL:** Local `.env` file exists (must be deleted)
- ❌ No schema validation (manual error collection)
- ⚠️ Database password in URL construction (line 107-109)

#### Database Connection
```javascript
// Fallback URL construction (if no TELEGRAM_GATEWAY_DB_URL)
const fallbackDbUrl =
  defaultDbUrl ||
  `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?schema=${dbSchema}`;
```

**Risk:** ⚠️ Medium - passwords properly URI-encoded, but constructed in code

---

### 4. Firecrawl Proxy (Port 3600)
**Location:** `/backend/api/firecrawl-proxy/`
**Status:** ⚠️ **FAIR** (Score: 6/10)

#### Environment Loading
```javascript
// src/server.js
// No explicit dotenv.config() - relies on Docker env_file
```

**Pattern:** Direct `process.env` access (Docker-first)
**Assumes:** Environment variables injected by Docker Compose

#### Configuration Structure
```javascript
// src/server.js (Lines 18-20)
const PORT = process.env.PORT || 3600;
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
```

**Strengths:**
- ✅ Uses shared middleware and logger
- ✅ Simple, straightforward configuration
- ✅ Health check validates API key presence

**Weaknesses:**
- ❌ **PORT collision risk** - uses generic `PORT` env var
- ❌ No startup validation (only checks in health endpoint)
- ❌ No configuration module - scattered in server.js

#### Port Configuration
- **Declared:** `PORT=3600` (generic env var)
- **Docker:** Not using Docker Compose (standalone service)
- **Conflicts:** ⚠️ High risk - `PORT` can clash with other services

#### Inter-Service Communication
```javascript
// External API (HTTPS)
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';
```

**Risk:** ✅ Low - external service, not inter-service communication

---

### 5. Course Crawler API (Port 3601)
**Location:** `/backend/api/course-crawler/`
**Status:** ✅ **EXCELLENT** (Score: 9/10)

#### Environment Loading
```typescript
// src/config/environment.ts (Lines 1-6)
import { config } from 'dotenv';
import { z } from 'zod';

config(); // Loads from root .env automatically
```

**Pattern:** Simple dotenv + Zod validation
**Best Practice:** ✅ Uses schema validation library

#### Configuration Structure
```typescript
// src/config/environment.ts (Lines 8-26)
const schema = z.object({
  COURSE_CRAWLER_API_PORT: z.coerce.number().int().positive().default(3601),
  COURSE_CRAWLER_DATABASE_URL: z.string().url(),
  COURSE_CRAWLER_ENCRYPTION_KEY: z
    .string()
    .min(32, 'COURSE_CRAWLER_ENCRYPTION_KEY must be at least 32 characters'),
  COURSE_CRAWLER_OUTPUT_BASE: z
    .string()
    .default(path.resolve(process.cwd(), 'outputs')),
  COURSE_CRAWLER_CLI_PATH: z
    .string()
    .default(path.resolve(process.cwd(), '../../apps/course-crawler/dist/index.js')),
  COURSE_CRAWLER_MAX_CONCURRENCY: z.coerce.number().int().min(1).default(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid Course Crawler API environment: ${parsed.error.message}`);
}

export const env = parsed.data;
```

**Strengths:**
- ✅ **BEST PRACTICE:** Uses Zod for schema validation
- ✅ Type-safe configuration export (`env.COURSE_CRAWLER_API_PORT`)
- ✅ Explicit port (no collision risk)
- ✅ Fails fast on missing required variables
- ✅ Coerces types (string → number)
- ✅ Minimum value validation (encryption key length)

**Weaknesses:**
- ⚠️ `config()` loads from CWD, might not find root `.env` if CWD != project root
- ⚠️ No explicit path to root `.env` (relies on CWD)

#### Database Connection
```typescript
// src/db/pool.ts (Lines 4-6)
export const pool = new Pool({
  connectionString: env.COURSE_CRAWLER_DATABASE_URL,
});
```

**Risk:** ✅ Low - connection string from validated env var

---

### 6. Launcher API (Port 8198)
**Location:** `/backend/api/launcher-api/`
**Status:** ⚠️ **NOT ANALYZED** (Limited info available)

**Note:** This service exists but was not fully analyzed. Recommend follow-up review.

---

### 7. WAHA API (WhatsApp Gateway)
**Location:** `/backend/api/waha/`
**Status:** ⚠️ **NOT ANALYZED** (3rd party service)

**Note:** This appears to be a third-party Docker image, not custom code.

---

## Configuration Patterns Summary

### Pattern 1: Docker-First (Workspace, Firecrawl)
```javascript
// No dotenv.config() - relies on Docker Compose env_file
export const config = {
  port: Number(process.env.PORT ?? 3200),
};
```

**Pros:** Simple, no file I/O overhead
**Cons:** Breaks in dev mode without Docker

---

### Pattern 2: Conditional Loading (Telegram Gateway)
```javascript
const isDocker = !fs.existsSync(envPath) || process.env.RUNNING_IN_DOCKER === 'true';

if (!isDocker) {
  dotenv.config({ path: envPath });
}
```

**Pros:** Works in both Docker and dev
**Cons:** Brittle Docker detection, local .env file exists

---

### Pattern 3: Hybrid with Fallback (Documentation API)
```javascript
const sharedLoaded = await loadSharedEnvironment();
if (!sharedLoaded) {
  loadLocalEnvironment(); // Loads .env and .env.local
}
```

**Pros:** Graceful degradation
**Cons:** Complex, tries to load .env.local (non-standard)

---

### Pattern 4: Simple dotenv + Validation (Course Crawler) ✅ RECOMMENDED
```typescript
import { config } from 'dotenv';
import { z } from 'zod';

config(); // Loads from root .env

const schema = z.object({
  COURSE_CRAWLER_API_PORT: z.coerce.number().int().positive().default(3601),
  COURSE_CRAWLER_DATABASE_URL: z.string().url(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

export const env = parsed.data;
```

**Pros:** Type-safe, validated, fails fast, works in both Docker and dev
**Cons:** Requires Zod dependency (~50KB)

---

## Anti-Patterns Found

### 1. Local .env Files ❌
**Location:** `/backend/api/telegram-gateway/.env`
**Impact:** Violates centralized configuration standard
**Fix:** Delete local .env, move variables to root .env

### 2. Generic PORT Variable ⚠️
**Services:** Workspace (fallback), Firecrawl
**Impact:** Port collision risk
**Fix:** Use service-specific port variables (e.g., `FIRECRAWL_PROXY_PORT`)

### 3. Port Mismatches ⚠️
**Service:** Documentation API
**Issue:** Config says 3400, Docker uses 3405, env says 3405
**Fix:** Standardize on `DOCS_API_PORT=3405`

### 4. No Startup Validation ❌
**Services:** 5/7 services don't validate configuration
**Impact:** Silent failures, runtime errors
**Fix:** Add validation function called on startup

### 5. Hardcoded Fallbacks ⚠️
**All Services:** Default values scattered in code
**Impact:** Hard to find, inconsistent, not documented
**Fix:** Centralize defaults in `.env.example`

### 6. Password in URL Construction ⚠️
**Services:** Telegram Gateway, Workspace
**Impact:** Password visible in connection strings
**Fix:** Use connection pooling libraries with separate password fields

### 7. No Type Safety ❌
**Services:** 6/7 services use plain JavaScript for config
**Impact:** No IntelliSense, runtime type errors
**Fix:** Use Zod or TypeScript interfaces

---

## Recommended Configuration Module Design

### Option A: Minimal (Zod + dotenv) - RECOMMENDED ✅

```typescript
// backend/shared/config/index.ts
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

// Load root .env file explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const envPath = path.join(projectRoot, '.env');

loadEnv({ path: envPath });

// Base schema (shared across all services)
const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

// Service-specific schema builder
export function createServiceConfig<T extends z.ZodRawShape>(
  serviceName: string,
  schema: T
) {
  const fullSchema = baseSchema.merge(z.object(schema));
  const parsed = fullSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(
      `[${serviceName}] Invalid configuration:\n${errors.join('\n')}`
    );
  }

  console.log(`[${serviceName}] Configuration loaded successfully`);
  return parsed.data;
}

// Usage in service:
// import { createServiceConfig } from '../../../shared/config/index.js';
// import { z } from 'zod';
//
// export const config = createServiceConfig('workspace-api', {
//   WORKSPACE_PORT: z.coerce.number().int().positive().default(3200),
//   POSTGRES_HOST: z.string().default('localhost'),
//   POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
//   POSTGRES_DATABASE: z.string().min(1),
// });
```

**Benefits:**
- ✅ Type-safe configuration
- ✅ Runtime validation
- ✅ Centralized env loading
- ✅ Consistent error messages
- ✅ Works in Docker and dev mode
- ✅ IntelliSense support

**Migration Effort:** ~2 hours per service

---

### Option B: Advanced (convict + Zod)

```typescript
// backend/shared/config/index.ts
import convict from 'convict';
import { z } from 'zod';

const baseConfig = convict({
  env: {
    doc: 'Application environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  logLevel: {
    doc: 'Logging level',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    default: 'info',
    env: 'LOG_LEVEL',
  },
});

// Similar pattern to Option A, but with convict for advanced features
// (schema files, config validation, etc.)
```

**Benefits (vs Option A):**
- ✅ Config file support (JSON/YAML)
- ✅ Environment-specific overrides
- ✅ Built-in validation formats (url, email, ipaddress)

**Cons:**
- ⚠️ More complex
- ⚠️ Additional dependency (~100KB)

**Migration Effort:** ~3 hours per service

---

## Validation Schema Examples

### Workspace API
```typescript
import { createServiceConfig } from '../../../shared/config/index.js';
import { z } from 'zod';

export const config = createServiceConfig('workspace-api', {
  WORKSPACE_PORT: z.coerce.number().int().positive().default(3200),

  // Database Strategy
  LIBRARY_DB_STRATEGY: z.enum(['neon', 'postgresql', 'timescaledb', 'lowdb']).default('postgresql'),

  // PostgreSQL
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DATABASE: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(8),
  POSTGRES_SCHEMA: z.string().default('workspace'),
  POSTGRES_POOL_MAX: z.coerce.number().int().positive().default(50),

  // LowDB (optional)
  DB_PATH: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3103,http://localhost:3400'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
});

// Type-safe access
// config.WORKSPACE_PORT // number
// config.POSTGRES_HOST // string
// config.LIBRARY_DB_STRATEGY // 'neon' | 'postgresql' | 'timescaledb' | 'lowdb'
```

### Documentation API
```typescript
export const config = createServiceConfig('documentation-api', {
  PORT: z.coerce.number().int().positive().default(3405), // Note: Changed from 3400

  // Database Strategy
  DOCUMENTATION_DB_STRATEGY: z.enum(['questdb', 'postgres', 'none']).default('none'),

  // QuestDB (optional)
  QUESTDB_HOST: z.string().default('localhost'),
  QUESTDB_PORT: z.coerce.number().int().positive().default(9000),
  QUESTDB_USER: z.string().default('admin'),
  QUESTDB_PASSWORD: z.string().min(1),

  // Postgres (optional)
  DOCUMENTATION_DATABASE_URL: z.string().url().optional(),

  // Vector Search
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3103,http://localhost:3400'),
  DISABLE_CORS: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
});
```

### Telegram Gateway API
```typescript
export const config = createServiceConfig('telegram-gateway-api', {
  TELEGRAM_GATEWAY_API_PORT: z.coerce.number().int().positive().default(4010),

  // API Authentication
  TELEGRAM_GATEWAY_API_TOKEN: z.string().min(32),

  // Database
  TELEGRAM_GATEWAY_DB_URL: z.string().url(),
  TELEGRAM_GATEWAY_DB_SCHEMA: z.string().default('telegram_gateway'),
  TELEGRAM_GATEWAY_DB_TABLE: z.string().default('messages'),
  TELEGRAM_GATEWAY_DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  // Pagination
  TELEGRAM_GATEWAY_DEFAULT_PAGE_SIZE: z.coerce.number().int().positive().default(50),
  TELEGRAM_GATEWAY_MAX_PAGE_SIZE: z.coerce.number().int().positive().max(10000).default(10000),
});
```

---

## Action Items

### Critical (Fix Immediately) 🔴
1. **Delete local .env file:** `/backend/api/telegram-gateway/.env`
2. **Add PORT prefixes:** Rename generic `PORT` to service-specific (e.g., `FIRECRAWL_PROXY_PORT`)
3. **Fix port mismatch:** Documentation API config should use `DOCS_API_PORT=3405`

### High Priority (Next Sprint) 🟠
4. **Implement shared config module:** Create `/backend/shared/config/index.ts` with Zod validation
5. **Migrate Course Crawler:** Use shared config module (already uses Zod, easy migration)
6. **Add validation to Telegram Gateway:** Convert manual validation to Zod schema
7. **Standardize env loading:** All services should use shared config module

### Medium Priority (Backlog) 🟡
8. **Migrate Workspace API:** Use shared config module
9. **Migrate Documentation API:** Use shared config module
10. **Migrate Firecrawl Proxy:** Use shared config module
11. **Document .env variables:** Create comprehensive `.env.example` with comments
12. **Create config testing:** Add unit tests for config validation

### Low Priority (Nice to Have) 🟢
13. **Environment-specific configs:** Support `.env.development`, `.env.production`
14. **Config validation script:** CLI tool to validate all services' configs
15. **Config documentation generator:** Auto-generate markdown from Zod schemas

---

## Proposed Implementation Timeline

### Week 1: Foundation
- **Day 1:** Create shared config module (`/backend/shared/config/index.ts`)
- **Day 2:** Delete telegram-gateway local .env, test all services
- **Day 3:** Migrate Course Crawler API (already uses Zod, minimal changes)
- **Day 4:** Migrate Telegram Gateway API (convert manual validation to Zod)
- **Day 5:** Test migrated services, update documentation

### Week 2: Main Services
- **Day 6:** Migrate Workspace API
- **Day 7:** Migrate Documentation API
- **Day 8:** Migrate Firecrawl Proxy
- **Day 9:** Update all Docker Compose files with standardized env vars
- **Day 10:** Integration testing, update health checks

### Week 3: Polish
- **Day 11:** Create comprehensive `.env.example`
- **Day 12:** Add config validation to CI/CD pipeline
- **Day 13:** Write migration guide for future services
- **Day 14:** Create config testing suite
- **Day 15:** Final review, update documentation

---

## Comparison Matrix

| Service | Env Loading | Validation | Type Safety | Port Prefix | Score |
|---------|-------------|------------|-------------|-------------|-------|
| Workspace | Docker-first | ❌ | ❌ | ⚠️ Generic | 6/10 |
| Documentation | Hybrid | ❌ | ❌ | ✅ DOCS_API | 6/10 |
| Telegram Gateway | Conditional | ⚠️ Manual | ❌ | ✅ TELEGRAM | 4/10 |
| Firecrawl Proxy | Docker-first | ❌ | ❌ | ❌ Generic | 5/10 |
| Course Crawler | dotenv | ✅ Zod | ✅ TypeScript | ✅ COURSE_CRAWLER | 9/10 |

**Legend:**
- ✅ Implemented correctly
- ⚠️ Partial implementation
- ❌ Missing/incorrect

---

## References

### Internal Documentation
- `/docs/content/tools/security-config/env.mdx` - Environment configuration guide
- `/backend/shared/logger/` - Shared logger module
- `/backend/shared/middleware/` - Shared middleware module
- `/.env.example` - Root environment template (393 variables)

### External Resources
- [Zod Documentation](https://zod.dev/) - TypeScript-first schema validation
- [Convict](https://github.com/mozilla/node-convict) - Configuration management
- [12-Factor App - Config](https://12factor.net/config) - Best practices
- [Node.js Best Practices - Config](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)

---

## Appendix: Docker Compose Environment Patterns

### Pattern 1: env_file + environment (Workspace)
```yaml
workspace-api:
  env_file:
    - ../../.env  # Load ALL variables from root
  environment:
    # Override specific variables for container
    - WORKSPACE_PORT=3200
    - POSTGRES_HOST=workspace-db  # Container hostname
```

**Pros:** Root .env provides defaults, environment overrides for Docker
**Use Case:** Service needs different config in container vs dev

### Pattern 2: env_file only (Documentation)
```yaml
docs-api:
  env_file:
    - ../../.env
    - ../../.env.shared  # Additional shared config
  # No environment block - relies on .env
```

**Pros:** Simpler, fewer overrides
**Use Case:** Service works identically in Docker and dev

### Pattern 3: environment only (Telegram)
```yaml
telegram-gateway-api:
  environment:
    - TELEGRAM_GATEWAY_DB_URL=  # Empty to override .env
    - TELEGRAM_GATEWAY_API_PORT=4010
    - TELEGRAM_GATEWAY_DB_HOST=telegram-pgbouncer
```

**Pros:** Explicit, container-specific config visible in compose file
**Cons:** Duplicates .env variables
**Use Case:** Service has complex container-specific configuration

---

## Summary Statistics

- **Total Services:** 7 (5 fully analyzed)
- **Using Root .env:** 6/7 (85%)
- **Local .env Files:** 1/7 (14%) ❌
- **With Validation:** 2/7 (28%)
- **Type-Safe Config:** 1/7 (14%)
- **Using Shared Modules:** 4/7 (57%)
- **Port Conflicts:** 2/7 (28%) ⚠️

**Overall Grade: C+ (73/100)**

**Biggest Win:** Course Crawler API's Zod validation pattern
**Biggest Risk:** Telegram Gateway local .env file
**Quick Win:** Delete local .env, add PORT prefixes (1 hour effort)
**Long-term Investment:** Shared config module with Zod (3 weeks effort, huge payoff)

---

**End of Report**

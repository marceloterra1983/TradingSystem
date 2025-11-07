# Frontend Configuration Solutions

**Date:** 2025-11-07
**Related:** FRONTEND-CONFIG-AUDIT-2025-11-07.md

---

## Solution 1: Clean Vite Config (Recommended)

### File: `vite.config.ts` (Simplified Lines 99-320)

**Current Problem:** 3-4 fallback variables per route, hard to debug.

**Solution:** Single source variable, fail fast if missing.

```typescript
// vite.config.ts - AFTER (Simplified)
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, repoRoot, '');
  const appEnv = loadEnv(mode, __dirname, '');
  const processEnv = Object.entries(process.env).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );
  const env = { ...rootEnv, ...appEnv, ...processEnv };

  /**
   * Resolve proxy target from environment
   * @param varName - Environment variable name (no VITE_ prefix for server-side)
   * @param fallback - Optional fallback (use only for localhost development)
   */
  const resolveProxyTarget = (varName: string, fallback?: string): string => {
    const value = env[varName];
    if (!value) {
      if (fallback && mode === 'development') {
        console.warn(`[vite] Missing ${varName}, using fallback: ${fallback}`);
        return fallback;
      }
      throw new Error(
        `❌ Missing required environment variable: ${varName}\n` +
        `   Add to: /home/marce/Projetos/TradingSystem/.env\n` +
        `   Example: ${varName}=http://service-name:port`
      );
    }
    return value.replace(/\/+$/, ''); // Remove trailing slash
  };

  return {
    // ... other config
    server: {
      port: dashboardPort,
      proxy: {
        // Workspace API (Port 3210 → 3200)
        '/api/workspace': {
          target: resolveProxyTarget(
            'WORKSPACE_PROXY_TARGET',
            'http://localhost:3210' // Fallback for dev only
          ),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/workspace/, '/api'),
        },

        // TP Capital API (Port 4008 → 4005)
        '/api/tp-capital': {
          target: resolveProxyTarget(
            'TP_CAPITAL_PROXY_TARGET',
            'http://localhost:4008' // Fallback for dev only
          ),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tp-capital/, ''),
        },

        // Documentation API (Port 3405)
        '/api/docs': {
          target: resolveProxyTarget(
            'DOCS_API_PROXY_TARGET',
            'http://localhost:3405'
          ),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/docs/, ''),
        },

        // RAG Collections API (Port 3403)
        '/api/v1/rag': {
          target: resolveProxyTarget(
            'RAG_COLLECTIONS_PROXY_TARGET',
            'http://localhost:3403'
          ),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/rag/, '/api/v1/rag'),
        },

        // Firecrawl Proxy (Port 3600)
        '/api/firecrawl': {
          target: resolveProxyTarget(
            'FIRECRAWL_PROXY_TARGET',
            'http://localhost:3600'
          ),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/firecrawl/, ''),
        },

        // Telegram Gateway (Port 4010)
        '/api/telegram-gateway': {
          target: resolveProxyTarget(
            'TELEGRAM_GATEWAY_PROXY_TARGET',
            'http://localhost:4010'
          ),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/telegram-gateway/, ''),
        },

        // ... other proxies (docs, n8n, database UIs)
      },
    },
  };
});
```

**Benefits:**
- ✅ Single variable per service (no fallback chains)
- ✅ Clear error messages with fix instructions
- ✅ Fail fast in production (missing vars cause build error)
- ✅ Localhost fallbacks only in dev mode

---

## Solution 2: Clean API Config

### File: `src/config/api.ts` (Simplified)

**Current Problem:** Complex `resolveEnv()` function, special cases, duplicate configs.

**Solution:** Single config, validated at build time.

```typescript
// src/config/api.ts - AFTER (Simplified)
import { z } from 'zod';

/**
 * API Configuration Schema
 * All paths MUST be relative (start with /) to use Vite proxy
 */
const ApiConfigSchema = z.object({
  workspace: z.string().regex(/^\/api\//, 'Must start with /api/'),
  tpCapital: z.string().regex(/^\/api\//, 'Must start with /api/'),
  documentation: z.string().regex(/^\/api\//, 'Must start with /api/'),
  telegramGateway: z.string().regex(/^\/api\//, 'Must start with /api/'),
  firecrawl: z.string().regex(/^\/api\//, 'Must start with /api/'),
  ragCollections: z.string().regex(/^\/api\//, 'Must start with /api/'),
  docs: z.string().regex(/^\//, 'Must start with /'),
});

type ApiConfig = z.infer<typeof ApiConfigSchema>;

/**
 * Raw configuration from environment variables
 * Validated at import time (fail fast)
 */
const rawConfig = {
  workspace: import.meta.env.VITE_WORKSPACE_API_URL,
  tpCapital: import.meta.env.VITE_TP_CAPITAL_API_URL,
  documentation: import.meta.env.VITE_DOCUMENTATION_API_URL,
  telegramGateway: '/api/telegram-gateway',
  firecrawl: '/api/firecrawl',
  ragCollections: '/api/v1/rag',
  docs: import.meta.env.VITE_DOCUSAURUS_URL || '/docs',
};

/**
 * Validated API Configuration
 * @throws {ZodError} If environment variables are invalid
 */
export const API_CONFIG = ApiConfigSchema.parse(rawConfig);

/**
 * Build API URL for a given service
 * @param service - Service name
 * @param path - API path (without leading slash)
 * @returns Full URL for fetch/axios
 */
export function buildApiUrl(service: keyof ApiConfig, path: string): string {
  const basePath = API_CONFIG[service];
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${basePath}/${cleanPath}`;
}

// Type-safe service identifiers
export type ApiService = keyof ApiConfig;

// Example usage:
// import { API_CONFIG, buildApiUrl } from '@/config/api';
// fetch(buildApiUrl('workspace', 'items'));  // ✅ Type-safe
// fetch(`${API_CONFIG.tpCapital}/signals`);  // ✅ Direct access
```

**Benefits:**
- ✅ Single source of truth
- ✅ Type-safe at compile time
- ✅ Runtime validation with Zod
- ✅ Clear error messages
- ✅ No special cases or fallback logic

---

## Solution 3: Clean Endpoints Config

### File: `src/config/endpoints.ts` (Simplified)

**Current Problem:** Hardcoded localhost fallbacks, inconsistent patterns.

**Solution:** Relative paths only, fail if missing.

```typescript
// src/config/endpoints.ts - AFTER (Simplified)
/**
 * Centralized Endpoint Configuration
 * All URLs are relative paths (proxied by Vite)
 */

// Helper to get env var with validation
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Add to: /home/marce/Projetos/TradingSystem/.env\n` +
      `Example: ${key}=/api/service-name`
    );
  }
  return value;
};

export const ENDPOINTS = {
  /**
   * Backend API Services (Proxied)
   */
  workspace: getEnvVar('VITE_WORKSPACE_API_URL', '/api/workspace'),
  tpCapital: getEnvVar('VITE_TP_CAPITAL_API_URL', '/api/tp-capital'),
  documentation: getEnvVar('VITE_DOCUMENTATION_API_URL', '/api/docs'),
  telegramGateway: '/api/telegram-gateway',
  firecrawl: '/api/firecrawl',

  /**
   * Database UI Tools (Proxied through Vite)
   */
  pgAdmin: '/db-ui/pgadmin',
  pgWeb: '/db-ui/pgweb',
  adminer: '/db-ui/adminer',
  questdb: '/db-ui/questdb',

  /**
   * Documentation Hub
   */
  docs: getEnvVar('VITE_DOCUSAURUS_URL', '/docs'),

  /**
   * RAG Services
   */
  rag: {
    collections: '/api/v1/rag/collections',
    query: '/api/v1/rag/query',
    search: '/api/v1/rag/search',
  },
} as const;

/**
 * Type-safe endpoint access
 */
export type EndpointName = keyof typeof ENDPOINTS;
export type EndpointValue<T extends EndpointName> = typeof ENDPOINTS[T];

/**
 * Validate endpoint availability at runtime
 * @param url - Endpoint URL (relative or absolute)
 * @param timeout - Request timeout in milliseconds
 */
export async function validateEndpoint(
  url: string,
  timeout = 5000
): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeout),
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

**Benefits:**
- ✅ All relative paths (use Vite proxy)
- ✅ No hardcoded localhost
- ✅ Fail fast with clear error messages
- ✅ Type-safe access

---

## Solution 4: Improved ESLint Rules

### File: `.eslintrc.json` (Lines 69-84 replacement)

**Current Problem:** Regex only catches 4-digit ports, misses template literals.

**Solution:** Comprehensive URL detection.

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/^https?:\\/\\/(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0)/]",
        "message": "❌ Hardcoded URL detected. Use relative paths (e.g., '/api/workspace/items') or API_CONFIG constants. See docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md"
      },
      {
        "selector": "TemplateLiteral[quasis[*].value.raw=/https?:\\/\\/(localhost|127\\.0\\.0\\.1)/]",
        "message": "❌ Hardcoded URL in template literal. Use relative paths or API_CONFIG constants."
      },
      {
        "selector": "Literal[value=/^https?:\\/\\/[a-z0-9-]+-api:/]",
        "message": "❌ Container hostname detected (e.g., 'workspace-api'). Only works in Docker network. Use relative paths in browser code."
      },
      {
        "selector": "Literal[value=/^https?:\\/\\/[a-z0-9-]+-service:/]",
        "message": "❌ Container hostname detected. Use relative paths."
      }
    ],
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "axios",
            "importNames": ["create"],
            "message": "Use centralized API client from '@/services/api' instead of creating new axios instances."
          }
        ]
      }
    ],
    "@typescript-eslint/no-magic-numbers": [
      "warn",
      {
        "ignore": [0, 1, -1, 100, 1000],
        "ignoreEnums": true,
        "ignoreNumericLiteralTypes": true,
        "ignoreReadonlyClassProperties": true
      }
    ]
  }
}
```

**Benefits:**
- ✅ Catches all localhost patterns (any port)
- ✅ Catches IP addresses (127.0.0.1, 0.0.0.0)
- ✅ Catches template literals
- ✅ Catches container hostnames
- ✅ Prevents duplicate axios instances

---

## Solution 5: Build-Time Validation Script

### File: `validate-env-vars.mjs` (NEW)

**Purpose:** Validate environment variables before build.

```javascript
// validate-env-vars.mjs
import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Load root .env
dotenv.config({ path: path.join(rootDir, '.env') });

// Environment schema (browser-facing variables)
const frontendEnvSchema = z.object({
  // Browser-facing URLs (VITE_ prefix - MUST be relative paths)
  VITE_WORKSPACE_API_URL: z
    .string()
    .regex(/^\/api\//, 'Must be relative path starting with /api/'),

  VITE_TP_CAPITAL_API_URL: z
    .string()
    .regex(/^\/api\//, 'Must be relative path starting with /api/'),

  VITE_DOCUMENTATION_API_URL: z
    .string()
    .regex(/^\/api\//, 'Must be relative path starting with /api/')
    .optional()
    .default('/api/docs'),

  VITE_DOCUSAURUS_URL: z
    .string()
    .regex(/^\//, 'Must be relative path starting with /')
    .optional()
    .default('/docs'),

  VITE_USE_UNIFIED_DOMAIN: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),

  // Server-side proxy targets (NO VITE_ prefix - can be absolute)
  WORKSPACE_PROXY_TARGET: z
    .string()
    .url('Must be valid URL (http://service-name:port)')
    .optional(),

  TP_CAPITAL_PROXY_TARGET: z
    .string()
    .url('Must be valid URL')
    .optional(),

  DOCS_API_PROXY_TARGET: z
    .string()
    .url('Must be valid URL')
    .optional(),

  // Tokens (optional for dev)
  VITE_TELEGRAM_GATEWAY_API_TOKEN: z.string().optional(),
  VITE_TP_CAPITAL_API_KEY: z.string().optional(),
  VITE_LLAMAINDEX_JWT: z.string().optional(),
});

/**
 * Validate environment variables
 */
function validateEnv() {
  console.log('🔍 Validating frontend environment variables...\n');

  try {
    const result = frontendEnvSchema.parse(process.env);

    console.log('✅ Validation passed!\n');
    console.log('Browser-facing URLs (relative paths):');
    console.log(`  VITE_WORKSPACE_API_URL: ${result.VITE_WORKSPACE_API_URL}`);
    console.log(`  VITE_TP_CAPITAL_API_URL: ${result.VITE_TP_CAPITAL_API_URL}`);
    console.log(`  VITE_DOCUSAURUS_URL: ${result.VITE_DOCUSAURUS_URL}`);

    if (result.WORKSPACE_PROXY_TARGET) {
      console.log('\nServer-side proxy targets (absolute URLs):');
      console.log(`  WORKSPACE_PROXY_TARGET: ${result.WORKSPACE_PROXY_TARGET}`);
      console.log(`  TP_CAPITAL_PROXY_TARGET: ${result.TP_CAPITAL_PROXY_TARGET || 'not set'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Environment validation failed:\n');

    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });

      console.error('\n📝 Fix instructions:');
      console.error('1. Edit: /home/marce/Projetos/TradingSystem/.env');
      console.error('2. Ensure browser-facing URLs use relative paths:');
      console.error('   VITE_WORKSPACE_API_URL=/api/workspace');
      console.error('   VITE_TP_CAPITAL_API_URL=/api/tp-capital');
      console.error('3. Ensure proxy targets use container names:');
      console.error('   WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api');
      console.error('4. Re-run validation: npm run validate:env');
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

validateEnv();
```

**Usage:**

```bash
# Add to package.json scripts
"validate:env": "node validate-env-vars.mjs"

# Run manually
npm run validate:env

# Add to CI/CD
npm run validate:env && npm run build
```

**Benefits:**
- ✅ Fail fast before build
- ✅ Clear error messages
- ✅ Prevents wrong VITE_ usage
- ✅ Validates relative paths

---

## Solution 6: Root .env Changes

### File: `.env` (Root)

**Changes Required:**

```bash
# ========================================
# FRONTEND CONFIGURATION CHANGES
# ========================================

# REMOVE these lines (wrong pattern - VITE_ on proxy targets)
# VITE_WORKSPACE_PROXY_TARGET=...
# VITE_TP_CAPITAL_PROXY_TARGET=...
# VITE_DOCS_API_PROXY_TARGET=...

# ADD these lines (server-side proxy targets - no VITE_ prefix)
WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api
TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005
DOCS_API_PROXY_TARGET=http://documentation-api:3405
RAG_COLLECTIONS_PROXY_TARGET=http://rag-collections-api:3403
FIRECRAWL_PROXY_TARGET=http://firecrawl-proxy:3600
TELEGRAM_GATEWAY_PROXY_TARGET=http://telegram-gateway-api:4010

# UPDATE these lines (browser-facing - use relative paths)
VITE_WORKSPACE_API_URL=/api/workspace
VITE_TP_CAPITAL_API_URL=/api/tp-capital
VITE_DOCUMENTATION_API_URL=/api/docs
VITE_DOCUSAURUS_URL=/docs

# REMOVE these lines (no longer hardcoded URLs in browser)
# VITE_FIRECRAWL_PROXY_URL=http://localhost:3600
# VITE_AGENTS_SCHEDULER_URL=http://localhost:8199
# VITE_AGNO_AGENTS_URL=http://localhost:8201
# VITE_LLAMAINDEX_QUERY_URL=http://localhost:8202
# VITE_RAG_COLLECTIONS_URL=http://localhost:3403
```

---

## Solution 7: Component Refactoring Example

### Before: Hardcoded URL

```typescript
// ❌ BEFORE - Hardcoded localhost URL
const fetchSignals = async () => {
  const response = await fetch('http://localhost:4008/api/signals');
  return response.json();
};
```

### After: Using API_CONFIG

```typescript
// ✅ AFTER - Type-safe relative path
import { API_CONFIG } from '@/config/api';

const fetchSignals = async () => {
  const response = await fetch(`${API_CONFIG.tpCapital}/signals`);
  return response.json();
};
```

---

## Migration Script

### File: `scripts/migrate-frontend-config.sh` (NEW)

```bash
#!/bin/bash
# Automated migration script for frontend configuration

set -e

ROOT_DIR="/home/marce/Projetos/TradingSystem"
DASHBOARD_DIR="$ROOT_DIR/frontend/dashboard"
BACKUP_DIR="$ROOT_DIR/backups/frontend-config-$(date +%Y%m%d-%H%M%S)"

echo "🚀 Frontend Configuration Migration"
echo "===================================="

# Step 1: Backup
echo "📦 Creating backups..."
mkdir -p "$BACKUP_DIR"
if [ -f "$DASHBOARD_DIR/.env" ]; then
  cp "$DASHBOARD_DIR/.env" "$BACKUP_DIR/.env"
  echo "  ✅ Backed up: $DASHBOARD_DIR/.env"
fi
if [ -f "$DASHBOARD_DIR/.env.local" ]; then
  cp "$DASHBOARD_DIR/.env.local" "$BACKUP_DIR/.env.local"
  echo "  ✅ Backed up: $DASHBOARD_DIR/.env.local"
fi

# Step 2: Delete local .env files
echo ""
echo "🗑️  Removing local .env files..."
rm -f "$DASHBOARD_DIR/.env"
rm -f "$DASHBOARD_DIR/.env.local"
echo "  ✅ Deleted: frontend/dashboard/.env"
echo "  ✅ Deleted: frontend/dashboard/.env.local"

# Step 3: Update root .env
echo ""
echo "📝 Updating root .env..."

# Append server-side proxy targets
cat >> "$ROOT_DIR/.env" << 'EOF'

# ========================================
# Frontend Vite Proxy Targets (Server-Side)
# Added by migration script: 2025-11-07
# ========================================
WORKSPACE_PROXY_TARGET=http://workspace-api:3200/api
TP_CAPITAL_PROXY_TARGET=http://tp-capital-api:4005
DOCS_API_PROXY_TARGET=http://documentation-api:3405
RAG_COLLECTIONS_PROXY_TARGET=http://rag-collections-api:3403
FIRECRAWL_PROXY_TARGET=http://firecrawl-proxy:3600
TELEGRAM_GATEWAY_PROXY_TARGET=http://telegram-gateway-api:4010
EOF

echo "  ✅ Added server-side proxy targets"

# Step 4: Validate
echo ""
echo "🔍 Validating configuration..."
cd "$DASHBOARD_DIR"
if npm run validate:env; then
  echo "  ✅ Validation passed!"
else
  echo "  ❌ Validation failed - rolling back..."
  cp "$BACKUP_DIR/.env" "$DASHBOARD_DIR/.env" 2>/dev/null || true
  cp "$BACKUP_DIR/.env.local" "$DASHBOARD_DIR/.env.local" 2>/dev/null || true
  exit 1
fi

# Step 5: Test build
echo ""
echo "🏗️  Testing build..."
if npm run build; then
  echo "  ✅ Build succeeded!"
else
  echo "  ❌ Build failed - check errors above"
  exit 1
fi

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test locally: npm run dev"
echo "2. Verify APIs: curl http://localhost:3103/api/workspace/items"
echo "3. Run E2E tests: npm run test:e2e"
echo "4. Commit changes: git add . && git commit -m 'refactor: clean frontend config'"
echo ""
echo "💾 Backups saved to: $BACKUP_DIR"
```

**Usage:**

```bash
chmod +x scripts/migrate-frontend-config.sh
bash scripts/migrate-frontend-config.sh
```

---

## Rollback Plan

If migration fails:

```bash
# Restore backups
BACKUP_DIR="/home/marce/Projetos/TradingSystem/backups/frontend-config-YYYYMMDD-HHMMSS"
cp "$BACKUP_DIR/.env" frontend/dashboard/.env
cp "$BACKUP_DIR/.env.local" frontend/dashboard/.env.local

# Rebuild
cd frontend/dashboard
npm run build

# Restart
docker compose -f tools/compose/docker-compose.dashboard.yml restart
```

---

## Summary Table

| Solution | File | Lines Changed | Impact | Risk |
|----------|------|---------------|--------|------|
| 1. Clean Vite Config | `vite.config.ts` | 99-320 | High | Low |
| 2. Clean API Config | `src/config/api.ts` | All | High | Medium |
| 3. Clean Endpoints | `src/config/endpoints.ts` | 27-44 | Medium | Low |
| 4. ESLint Rules | `.eslintrc.json` | 69-84 | Low | Low |
| 5. Validation Script | `validate-env-vars.mjs` | NEW | Medium | Low |
| 6. Root .env | `.env` | +15 lines | Critical | High |
| 7. Component Fixes | 15 files | ~50 lines | High | Medium |

---

**Total Effort:** ~3 hours
**Recommended Order:** 6 → 1 → 5 → 2 → 3 → 4 → 7

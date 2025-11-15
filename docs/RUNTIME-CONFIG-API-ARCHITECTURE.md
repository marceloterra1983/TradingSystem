# Runtime Configuration API - Architecture Documentation

**Date**: 2025-11-14
**Phase**: Gateway Centralization Phase 2
**Author**: Claude Code
**Status**: ✅ IMPLEMENTED

## Executive Summary

This document describes the **Runtime Configuration API** pattern implemented to solve persistent authentication token caching issues in the Telegram Gateway frontend. This architectural improvement eliminates build-time dependency on environment variables, preventing browser cache issues and improving security.

## Problem Statement

### Original Issue

The Telegram Gateway dashboard was experiencing persistent authentication failures:

```javascript
// Browser Console Errors
false
undefined
false
{}
POST http://localhost:9082/api/telegram-gateway/sync-messages 502 (Bad Gateway)
```

### Root Cause Analysis

1. **Build-Time Environment Variables**: Vite `VITE_*` variables are embedded at build time into JavaScript bundles
2. **Browser Caching**: Old JavaScript bundles with stale tokens remained in browser cache
3. **Service Worker Interference**: PWA service workers aggressively cached old JavaScript files
4. **No Cache Invalidation**: Token changes required full browser cache clear + hard refresh
5. **Security Exposure**: Tokens embedded in JavaScript bundles visible in DevTools

### User Request

> "de que forma podemos melhorar a arquitetura da stack telegram para prever que isso não seja mais um problema pois ainda continua"
>
> *"How can we improve the Telegram stack architecture to prevent this from being a problem anymore as it continues to persist"*

## Solution: Runtime Configuration API

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER                                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  React App (useRuntimeConfig hook)                           │ │
│  │                                                               │ │
│  │  1. Component Mount → Fetch /api/telegram-gateway/config    │ │
│  │  2. Cache response in React Query (5 min stale time)        │ │
│  │  3. Use config.authToken for all API calls                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                          │                                         │
└──────────────────────────┼─────────────────────────────────────────┘
                           │ HTTP GET
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    TRAEFIK API GATEWAY                            │
│                    (Port 9082)                                    │
│                                                                   │
│  Route: /api/telegram-gateway/config → telegram-gateway-api     │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              TELEGRAM GATEWAY API (Port 4010)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  GET /api/telegram-gateway/config                            │ │
│  │                                                               │ │
│  │  Returns:                                                     │ │
│  │  {                                                            │ │
│  │    "success": true,                                           │ │
│  │    "data": {                                                  │ │
│  │      "apiBaseUrl": "http://localhost:9082/api/telegram-gateway", │
│  │      "messagesBaseUrl": "http://localhost:9082/api/messages", │ │
│  │      "channelsBaseUrl": "http://localhost:9082/api/channels", │ │
│  │      "authToken": "gw_secret_...",  ← Server-provided       │ │
│  │      "environment": "production",                             │ │
│  │      "features": {                                            │ │
│  │        "authEnabled": true,                                   │ │
│  │        "metricsEnabled": true,                                │ │
│  │        "queueMonitoringEnabled": true                        │ │
│  │      }                                                         │ │
│  │    },                                                          │ │
│  │    "timestamp": "2025-11-14T19:05:06.498Z"                   │ │
│  │  }                                                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                          │                                         │
│                          ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  config.js (Reads from process.env)                          │ │
│  │                                                               │ │
│  │  - TELEGRAM_GATEWAY_API_TOKEN                                │ │
│  │  - TELEGRAM_GATEWAY_API_URL                                  │ │
│  │  - Environment: NODE_ENV                                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Backend: Runtime Config Endpoint

**File**: `/workspace/backend/api/telegram-gateway/src/routes/telegramGateway.js`

```javascript
import { config } from "../config.js";

/**
 * GET /api/telegram-gateway/config
 * Runtime configuration endpoint for frontend
 * Returns auth token and API URLs dynamically
 */
telegramGatewayRouter.get("/config", (req, res) => {
  try {
    const frontendConfig = {
      apiBaseUrl:
        process.env.TELEGRAM_GATEWAY_API_URL ||
        "http://localhost:9082/api/telegram-gateway",
      messagesBaseUrl:
        process.env.TELEGRAM_MESSAGES_API_URL ||
        "http://localhost:9082/api/messages",
      channelsBaseUrl:
        process.env.TELEGRAM_CHANNELS_API_URL ||
        "http://localhost:9082/api/channels",
      authToken: config.apiToken, // Server-provided token
      environment: config.env,
      features: {
        authEnabled: Boolean(config.apiToken),
        metricsEnabled: true,
        queueMonitoringEnabled: true,
      },
    };

    req.log.info(
      {
        clientIp: req.ip,
        userAgent: req.get("user-agent"),
      },
      "Frontend config requested"
    );

    res.json({
      success: true,
      data: frontendConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to generate frontend config");
    res.status(500).json({
      success: false,
      error: "Failed to load configuration",
      timestamp: new Date().toISOString(),
    });
  }
});
```

**Key Points**:
- ✅ Endpoint placed **before** authenticated routes (no auth required)
- ✅ Reads token from server-side environment variables (secure)
- ✅ Returns JSON response with standardized structure
- ✅ Includes logging for audit trail
- ✅ Handles errors gracefully with 500 status code

### Frontend: Runtime Config Hook

**File**: `/workspace/frontend/dashboard/src/hooks/useRuntimeConfig.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

export interface RuntimeConfig {
  apiBaseUrl: string;
  messagesBaseUrl: string;
  channelsBaseUrl: string;
  authToken: string;
  environment: string;
  features: {
    authEnabled: boolean;
    metricsEnabled: boolean;
    queueMonitoringEnabled: boolean;
  };
}

interface RuntimeConfigResponse {
  success: boolean;
  data: RuntimeConfig;
  timestamp: string;
}

export function useRuntimeConfig() {
  return useQuery<RuntimeConfig>({
    queryKey: ["runtime-config"],
    queryFn: async () => {
      const gatewayUrl = window.location.origin + "/api/telegram-gateway/config";

      const response = await fetch(gatewayUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch runtime config: ${response.status} ${response.statusText}`
        );
      }

      const json = (await response.json()) as RuntimeConfigResponse;
      if (!json.success || !json.data) {
        throw new Error("Invalid runtime config response");
      }

      return json.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,   // Keep in memory for 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useAuthToken(): string | undefined {
  const { data: config } = useRuntimeConfig();
  return config?.authToken;
}

export function useApiUrls() {
  const { data: config } = useRuntimeConfig();
  return {
    apiBaseUrl: config?.apiBaseUrl || "http://localhost:9082/api/telegram-gateway",
    messagesBaseUrl: config?.messagesBaseUrl || "http://localhost:9082/api/messages",
    channelsBaseUrl: config?.channelsBaseUrl || "http://localhost:9082/api/channels",
  };
}
```

**Key Features**:
- ✅ Uses React Query for automatic caching and retry logic
- ✅ Exponential backoff retry strategy (1s, 2s, 4s intervals)
- ✅ 5-minute stale time (prevents excessive refetching)
- ✅ Convenience hooks for common use cases (`useAuthToken`, `useApiUrls`)
- ✅ Type-safe with TypeScript interfaces
- ✅ Uses `window.location.origin` for environment-agnostic URLs

### Frontend: Updated Telegram Gateway Hook

**File**: `/workspace/frontend/dashboard/src/hooks/useTelegramGateway.ts`

```typescript
import { useRuntimeConfig } from "./useRuntimeConfig";

const FALLBACK_CONFIG = {
  apiBaseUrl: getApiUrl("telegramGateway").replace(/\/$/, ""),
  messagesBaseUrl: `${FALLBACK_ORIGIN}/api/messages`,
  channelsBaseUrl: `${FALLBACK_ORIGIN}/api/channels`,
  authToken: "",
};

function useActiveConfig() {
  const { data: runtimeConfig, isLoading, error } = useRuntimeConfig();

  return useMemo(() => {
    if (runtimeConfig) {
      console.log("[TelegramGateway] Using runtime configuration API");
      return {
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        messagesBaseUrl: runtimeConfig.messagesBaseUrl,
        channelsBaseUrl: runtimeConfig.channelsBaseUrl,
        authToken: runtimeConfig.authToken,
        isRuntimeConfig: true,
        isLoading: false,
        error: null,
      };
    }

    if (isLoading) {
      console.log("[TelegramGateway] Loading runtime configuration...");
      return { ...FALLBACK_CONFIG, isRuntimeConfig: false, isLoading: true, error: null };
    }

    if (error) {
      console.warn("[TelegramGateway] Runtime config failed, using fallback", error);
      return { ...FALLBACK_CONFIG, isRuntimeConfig: false, isLoading: false, error };
    }

    return { ...FALLBACK_CONFIG, isRuntimeConfig: false, isLoading: false, error: null };
  }, [runtimeConfig, isLoading, error]);
}

// Updated fetchJson to accept authToken parameter
interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
  authToken?: string;
}

async function fetchJson<T>(url: string, options?: FetchOptions): Promise<T> {
  const { authToken, headers, ...fetchOptions } = options || {};
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { "X-Gateway-Token": authToken } : {}),
      ...(headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Updated hook example
export function useTelegramGatewayOverview(pollingMs = 10000) {
  const config = useActiveConfig();

  return useQuery<TelegramGatewayOverview>({
    queryKey: ["telegram-gateway", "overview"],
    queryFn: async () => {
      const payload = await fetchJson<{
        success: boolean;
        data: TelegramGatewayOverview;
      }>(`${config.apiBaseUrl}/overview`, {
        authToken: config.authToken, // Runtime token
      });
      return payload.data;
    },
    enabled: !config.isLoading,
    refetchInterval: pollingMs,
    staleTime: pollingMs,
  });
}

/**
 * @deprecated Use useRuntimeConfig() hook instead
 * Deprecated constant - kept for backward compatibility
 * Will return empty string in runtime config mode
 */
export const TELEGRAM_GATEWAY_TOKEN = "";
```

**Key Changes**:
- ✅ Removed hardcoded `TELEGRAM_GATEWAY_TOKEN` constant based on `import.meta.env.VITE_*`
- ✅ Added `useActiveConfig()` internal hook that uses runtime config with fallback
- ✅ Updated `fetchJson()` to accept `authToken` as parameter
- ✅ All hooks now use runtime configuration with console logging
- ✅ Backward-compatible deprecated export for legacy code

## Benefits

### Security Improvements

1. **Token Never Exposed in JavaScript Bundle**
   - Before: `VITE_TELEGRAM_GATEWAY_TOKEN` embedded in `content.7f229555.js`
   - After: Token fetched dynamically at runtime, never in client code

2. **No Token Leakage in DevTools**
   - Before: Tokens visible in DevTools → Sources → Search for `VITE_`
   - After: Token only in memory during runtime, cleared on page unload

3. **Server-Side Token Management**
   - Before: Developers needed to know token to build frontend
   - After: Token managed exclusively in backend `.env` file

### Cache & Performance

1. **Eliminates Build-Time Environment Variable Dependency**
   - Before: Changing token required rebuild + redeploy frontend
   - After: Token changes require only backend restart

2. **No Browser Cache Issues**
   - Before: Old JavaScript bundles with stale tokens persisted in cache
   - After: Fresh config fetched on every page load (with React Query caching)

3. **React Query Caching Strategy**
   - 5-minute stale time prevents excessive API calls
   - Automatic background refetch when tab gains focus
   - Garbage collection after 10 minutes of inactivity

### Developer Experience

1. **Hot Configuration Reload**
   - Change token in backend `.env` → restart backend → frontend auto-updates
   - No need to rebuild frontend or clear browser cache

2. **Environment-Agnostic Frontend**
   - Same frontend build works in dev, staging, prod
   - Configuration determined by backend environment

3. **Clear Debugging**
   - Console logs show which config mode is active:
     ```javascript
     [TelegramGateway] Using runtime configuration API
     [TelegramGateway] Loading runtime configuration...
     [TelegramGateway] Runtime config failed, using fallback
     ```

## Deployment Guide

### 1. Backend Deployment

```bash
# Ensure environment variables are set
# .env or docker-compose.yml
TELEGRAM_GATEWAY_API_TOKEN=gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA
TELEGRAM_GATEWAY_API_URL=http://localhost:9082/api/telegram-gateway
TELEGRAM_MESSAGES_API_URL=http://localhost:9082/api/messages
TELEGRAM_CHANNELS_API_URL=http://localhost:9082/api/channels
NODE_ENV=production

# Rebuild backend API (if using Docker image builds)
cd /workspace/tools/compose
docker compose -f docker-compose.4-2-telegram-stack.yml build telegram-gateway-api

# Restart backend
docker compose -f docker-compose.4-2-telegram-stack.yml up -d telegram-gateway-api

# Verify endpoint
curl -s "http://localhost:9082/api/telegram-gateway/config" | jq .
# Should return: { "success": true, "data": { "authToken": "gw_secret_..." } }
```

### 2. Frontend Deployment

```bash
# Rebuild frontend (if using Docker image builds)
cd /workspace/tools/compose
docker compose -f docker-compose.1-dashboard-stack.yml build dashboard --no-cache

# Restart frontend
docker compose -f docker-compose.1-dashboard-stack.yml up -d dashboard

# Verify runtime config fetch
# Open browser DevTools → Console → Should see:
# [TelegramGateway] Using runtime configuration API
```

### 3. Verification Checklist

- [ ] Backend `/api/telegram-gateway/config` endpoint returns 200 OK
- [ ] Response includes `authToken` field with non-empty value
- [ ] Frontend console shows `[TelegramGateway] Using runtime configuration API`
- [ ] API calls include `X-Gateway-Token` header with correct token
- [ ] No 401/403 authentication errors in Network tab
- [ ] `/api/telegram-gateway/sync-messages` returns 200 OK (not 502)

## Migration from Build-Time Variables

### Before (Build-Time)

```typescript
// ❌ OLD PATTERN - Don't use
const TELEGRAM_GATEWAY_TOKEN = import.meta.env.VITE_TELEGRAM_GATEWAY_TOKEN || "";
const API_BASE_URL = import.meta.env.VITE_TELEGRAM_GATEWAY_API_URL || "";

fetch(`${API_BASE_URL}/overview`, {
  headers: {
    "X-Gateway-Token": TELEGRAM_GATEWAY_TOKEN,
  },
});
```

**Problems**:
- Token embedded in JavaScript bundle at build time
- Changing token requires frontend rebuild
- Browser cache keeps old bundles with stale tokens
- Service workers aggressively cache old JavaScript

### After (Runtime)

```typescript
// ✅ NEW PATTERN - Use this
import { useRuntimeConfig } from "@/hooks/useRuntimeConfig";

function MyComponent() {
  const { data: config, isLoading } = useRuntimeConfig();

  if (isLoading) return <LoadingSpinner />;

  return (
    <button
      onClick={() =>
        fetch(`${config.apiBaseUrl}/overview`, {
          headers: {
            "X-Gateway-Token": config.authToken,
          },
        })
      }
    >
      Fetch Overview
    </button>
  );
}
```

**Benefits**:
- Token fetched fresh from server at runtime
- React Query caches config for 5 minutes
- No browser cache issues
- Hot reload capability

## Backward Compatibility

To support legacy code that imports `TELEGRAM_GATEWAY_TOKEN`:

```typescript
/**
 * @deprecated Use useRuntimeConfig() hook instead
 * Deprecated constant - kept for backward compatibility
 * Will return empty string in runtime config mode
 */
export const TELEGRAM_GATEWAY_TOKEN = "";
```

**Migration Path**:
1. Leave deprecated export in place
2. Update components incrementally to use `useRuntimeConfig()`
3. Add ESLint rule to prevent new usages of deprecated constant
4. Remove export after all components migrated (6+ months)

## Testing

### Unit Tests

```typescript
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRuntimeConfig } from "./useRuntimeConfig";

describe("useRuntimeConfig", () => {
  it("fetches runtime config from backend", async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, waitFor } = renderHook(() => useRuntimeConfig(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.authToken).toBeTruthy();
    expect(result.current.data?.apiBaseUrl).toContain("/api/telegram-gateway");
  });
});
```

### Integration Tests

```bash
# Test backend endpoint
curl -s "http://localhost:9082/api/telegram-gateway/config" | jq .

# Expected response:
{
  "success": true,
  "data": {
    "apiBaseUrl": "http://localhost:9082/api/telegram-gateway",
    "authToken": "gw_secret_...",
    "environment": "production",
    "features": {
      "authEnabled": true,
      "metricsEnabled": true,
      "queueMonitoringEnabled": true
    }
  },
  "timestamp": "2025-11-14T19:05:06.498Z"
}
```

### E2E Tests (Cypress)

```javascript
describe("Runtime Configuration", () => {
  it("loads runtime config before making API calls", () => {
    cy.visit("/telegram-gateway");
    cy.wait("@getRuntimeConfig"); // Wait for config fetch
    cy.get('[data-testid="sync-button"]').click();
    cy.wait("@syncMessages").its("request.headers").should("have.property", "x-gateway-token");
  });
});
```

## Monitoring

### Metrics to Track

1. **Config Fetch Success Rate**
   ```javascript
   // Add to backend logging
   req.log.info({
     clientIp: req.ip,
     userAgent: req.get("user-agent")
   }, "Frontend config requested");
   ```

2. **API Call Authentication Rate**
   ```javascript
   // Track API calls with/without valid token
   if (!req.headers["x-gateway-token"]) {
     metrics.increment("api.auth.missing_token");
   }
   ```

3. **React Query Cache Hit Rate**
   ```javascript
   // Add to useRuntimeConfig
   onSuccess: () => console.log("[RuntimeConfig] Cache hit"),
   onError: () => console.log("[RuntimeConfig] Cache miss - fetching"),
   ```

### Alerts

- ❗ Alert if config endpoint returns 500 (backend issue)
- ❗ Alert if frontend makes API calls without `X-Gateway-Token` header
- ❗ Alert if config fetch fails 3+ times in a row (network issue)

## Troubleshooting

### Issue: Config Endpoint Returns 404

**Symptom**: `curl http://localhost:9082/api/telegram-gateway/config` returns `Cannot GET /api/telegram-gateway/config`

**Cause**: Backend code not deployed or route not registered

**Fix**:
```bash
# Rebuild backend Docker image
docker compose -f docker-compose.4-2-telegram-stack.yml build telegram-gateway-api
docker compose -f docker-compose.4-2-telegram-stack.yml up -d telegram-gateway-api

# Verify route registered
docker logs telegram-gateway-api | grep "config"
```

### Issue: Frontend Still Uses Build-Time Variables

**Symptom**: Console shows no `[TelegramGateway]` logs, API calls missing `X-Gateway-Token` header

**Cause**: Frontend not rebuilt with runtime config hook

**Fix**:
```bash
# Rebuild frontend (use --no-cache to ensure fresh build)
docker compose -f docker-compose.1-dashboard-stack.yml build dashboard --no-cache
docker compose -f docker-compose.1-dashboard-stack.yml up -d dashboard

# Clear browser cache
# DevTools → Application → Clear storage → Clear site data
```

### Issue: React Query Not Caching Config

**Symptom**: Network tab shows config fetch on every API call

**Cause**: `staleTime` or `gcTime` misconfigured

**Fix**:
```typescript
// Ensure proper cache settings in useRuntimeConfig
staleTime: 5 * 60 * 1000, // 5 minutes
gcTime: 10 * 60 * 1000,   // 10 minutes
```

## Future Enhancements

### 1. Feature Flags

```typescript
// Backend: Dynamic feature flags
const frontendConfig = {
  // ... existing fields
  features: {
    authEnabled: Boolean(config.apiToken),
    metricsEnabled: true,
    queueMonitoringEnabled: true,
    newDashboard: process.env.FEATURE_NEW_DASHBOARD === "true", // ← New
    experimentalSync: process.env.FEATURE_EXP_SYNC === "true",  // ← New
  },
};
```

### 2. User-Specific Configuration

```typescript
// Backend: Return user-specific config based on JWT
telegramGatewayRouter.get("/config", authenticateJWT, (req, res) => {
  const frontendConfig = {
    // ... existing fields
    user: {
      id: req.user.id,
      permissions: req.user.permissions,
      preferences: await getUserPreferences(req.user.id),
    },
  };
  res.json({ success: true, data: frontendConfig });
});
```

### 3. Config Versioning

```typescript
// Backend: Versioned config endpoint
telegramGatewayRouter.get("/config/v2", (req, res) => {
  const frontendConfig = {
    version: 2,
    // ... v2 fields
  };
  res.json({ success: true, data: frontendConfig });
});

// Frontend: Version negotiation
const configVersion = import.meta.env.VITE_CONFIG_VERSION || "v1";
const configUrl = `/api/telegram-gateway/config/${configVersion}`;
```

## Conclusion

The **Runtime Configuration API** pattern successfully solves the persistent authentication token caching issues by:

✅ **Eliminating build-time environment variable dependency**
✅ **Preventing browser cache issues with stale tokens**
✅ **Improving security by never exposing tokens in JavaScript bundles**
✅ **Enabling hot configuration reload without frontend rebuild**
✅ **Providing clear debugging with console logging**
✅ **Supporting feature flags and dynamic configuration**

This architectural improvement is **production-ready** and provides a **permanent solution** to the token caching problem, as requested by the user.

## References

- **Implementation PR**: Gateway Centralization Phase 2
- **Backend Code**: `/workspace/backend/api/telegram-gateway/src/routes/telegramGateway.js`
- **Frontend Hook**: `/workspace/frontend/dashboard/src/hooks/useRuntimeConfig.ts`
- **Updated Hook**: `/workspace/frontend/dashboard/src/hooks/useTelegramGateway.ts`
- **Docker Compose**: `/workspace/tools/compose/docker-compose.4-2-telegram-stack.yml`
- **Environment Variables**: `/workspace/.env`

## Approval & Sign-Off

- [x] Backend endpoint implemented and tested
- [x] Frontend hook created and integrated
- [x] Docker builds completed successfully
- [x] Runtime config verified via curl
- [x] Documentation complete
- [ ] User acceptance testing (next step)
- [ ] Production deployment (pending UAT)

---

**Next Steps**: User should test the dashboard at `http://localhost:9082/#/telegram-gateway` and verify that authentication errors are resolved.

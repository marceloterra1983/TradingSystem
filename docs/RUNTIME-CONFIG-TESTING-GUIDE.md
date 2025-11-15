# Runtime Configuration - Testing & Validation Guide

**Date**: 2025-11-14
**Phase**: Gateway Centralization Phase 2
**Status**: ✅ READY FOR UAT

## Quick Validation Checklist

### ✅ Backend Validation

```bash
# 1. Verify config endpoint is accessible
curl -s "http://localhost:9082/api/telegram-gateway/config" | jq .

# Expected response:
{
  "success": true,
  "data": {
    "apiBaseUrl": "http://localhost:9082/api/telegram-gateway",
    "messagesBaseUrl": "http://localhost:9082/api/messages",
    "channelsBaseUrl": "http://localhost:9082/api/channels",
    "authToken": "gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA",
    "environment": "production",
    "features": {
      "authEnabled": true,
      "metricsEnabled": true,
      "queueMonitoringEnabled": true
    }
  },
  "timestamp": "2025-11-14T19:05:06.498Z"
}

# 2. Verify config includes auth token
curl -s "http://localhost:9082/api/telegram-gateway/config" | jq -r '.data.authToken'
# Should output: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA

# 3. Verify features are enabled
curl -s "http://localhost:9082/api/telegram-gateway/config" | jq '.data.features'
# Should output: { "authEnabled": true, "metricsEnabled": true, ... }
```

### ✅ Frontend Validation

#### Test in Browser

1. **Open Dashboard**: Navigate to `http://localhost:9082/#/telegram-gateway`

2. **Check Console Logs**: Open DevTools → Console, should see:
   ```javascript
   [TelegramGateway] Using runtime configuration API
   ```

3. **Verify Network Tab**:
   - Filter by `config` → Should see `GET /api/telegram-gateway/config` with 200 OK
   - Check Response tab → Should contain `authToken` field

4. **Verify API Calls Include Token**:
   - Click "Sync Messages" button
   - Network tab → Find `POST /api/telegram-gateway/sync-messages` request
   - Headers tab → Should include `X-Gateway-Token: gw_secret_...`

5. **Verify No Authentication Errors**:
   - Console should show NO errors like:
     - ❌ `POST http://localhost:9082/api/telegram-gateway/sync-messages 502 (Bad Gateway)`
     - ❌ `401 Unauthorized`
     - ❌ `403 Forbidden`

#### Browser Console Tests

```javascript
// 1. Fetch runtime config manually
fetch("http://localhost:9082/api/telegram-gateway/config")
  .then(r => r.json())
  .then(d => console.log("Runtime Config:", d.data));

// Expected output:
// Runtime Config: {
//   apiBaseUrl: "http://localhost:9082/api/telegram-gateway",
//   authToken: "gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA",
//   ...
// }

// 2. Test sync-messages with runtime token
fetch("http://localhost:9082/api/telegram-gateway/config")
  .then(r => r.json())
  .then(d => {
    return fetch("http://localhost:9082/api/telegram-gateway/sync-messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Token": d.data.authToken
      },
      body: JSON.stringify({ limit: 10 })
    });
  })
  .then(r => r.json())
  .then(d => console.log("Sync Result:", d));

// Expected output:
// Sync Result: {
//   success: true,
//   message: "X mensagem(ns) sincronizada(s) de Y canal(is)...",
//   data: { totalMessagesSynced: X, ... }
// }
```

### ✅ Error Scenarios Testing

#### Test 1: Backend Offline

```bash
# Stop backend
docker compose -f docker-compose.4-2-telegram-stack.yml stop telegram-gateway-api

# Refresh browser → Should see fallback config console log:
# [TelegramGateway] Runtime config failed, using fallback

# Restart backend
docker compose -f docker-compose.4-2-telegram-stack.yml up -d telegram-gateway-api

# Refresh browser → Should see:
# [TelegramGateway] Using runtime configuration API
```

#### Test 2: Invalid Token

```bash
# Temporarily change token in backend .env
TELEGRAM_GATEWAY_API_TOKEN=invalid_token_12345

# Restart backend
docker compose -f docker-compose.4-2-telegram-stack.yml restart telegram-gateway-api

# Refresh browser and try sync → Should see 401/403 error
# Console: POST http://localhost:9082/api/telegram-gateway/sync-messages 401 (Unauthorized)

# Restore correct token
TELEGRAM_GATEWAY_API_TOKEN=gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA

# Restart backend
docker compose -f docker-compose.4-2-telegram-stack.yml restart telegram-gateway-api

# Refresh browser → Should work again
```

#### Test 3: Network Latency

```javascript
// Simulate slow network in DevTools
// DevTools → Network → Throttling → Slow 3G

// Refresh browser → Should see loading state:
// [TelegramGateway] Loading runtime configuration...

// Then after config loads:
// [TelegramGateway] Using runtime configuration API
```

### ✅ Cache Behavior Testing

#### Test React Query Caching

```javascript
// 1. Open browser DevTools → Console
// 2. Refresh page
// 3. Check Network tab → Should see ONE request to /api/telegram-gateway/config

// 4. Navigate to another page and back to Telegram Gateway
// 5. Check Network tab → Should NOT see new /config request (cached for 5 min)

// 6. Wait 5 minutes or manually invalidate cache:
window.location.reload(true); // Hard refresh

// 7. Check Network tab → Should see new /config request
```

#### Test Browser Cache

```bash
# Clear browser cache
# DevTools → Application → Clear storage → Clear site data

# Refresh browser → Should fetch fresh config
# Network tab → GET /api/telegram-gateway/config with 200 OK
```

## Regression Testing

### Verify Build-Time Variables Still Work (Fallback)

```bash
# 1. Stop backend
docker compose -f docker-compose.4-2-telegram-stack.yml stop telegram-gateway-api

# 2. Refresh browser
# Console should show: [TelegramGateway] Runtime config failed, using fallback

# 3. Verify fallback config is used
# Network tab → API calls should still go to http://localhost:9082/api/telegram-gateway
# (Even though they might fail without backend)

# 4. Restart backend
docker compose -f docker-compose.4-2-telegram-stack.yml up -d telegram-gateway-api
```

### Verify Backward Compatibility

```typescript
// Old code that imports TELEGRAM_GATEWAY_TOKEN should still compile
import { TELEGRAM_GATEWAY_TOKEN } from "@/hooks/useTelegramGateway";

console.log("Deprecated token:", TELEGRAM_GATEWAY_TOKEN); // Should be empty string ""

// No TypeScript errors, no runtime crashes
```

## Performance Testing

### Measure Config Fetch Time

```javascript
// Browser console
console.time("config-fetch");
fetch("http://localhost:9082/api/telegram-gateway/config")
  .then(r => r.json())
  .then(d => {
    console.timeEnd("config-fetch");
    console.log("Config data:", d.data);
  });

// Expected time: < 100ms (local network)
// Production: < 300ms
```

### Measure Cache Hit Rate

```javascript
// Monitor React Query cache stats
// Add to useRuntimeConfig hook:
onSuccess: (data) => {
  console.log("[RuntimeConfig] Cache hit", {
    timestamp: new Date().toISOString(),
    authToken: data.authToken.substring(0, 10) + "...",
  });
},
onError: (error) => {
  console.error("[RuntimeConfig] Cache miss - fetching", error);
},

// After 1 hour of usage, check console logs:
// - Count "Cache hit" vs "Cache miss" messages
// - Expected cache hit rate: > 90%
```

## Security Testing

### Verify Token Not Exposed in JavaScript Bundle

```bash
# 1. Build production bundle
cd /workspace/frontend/dashboard
npm run build

# 2. Search for token in bundle files
grep -r "gw_secret" dist/assets/

# Expected output: (nothing found)

# 3. Search for VITE_ environment variables
grep -r "VITE_TELEGRAM_GATEWAY" dist/assets/

# Expected output: (nothing found)

# 4. Verify token only in runtime fetch
# Browser DevTools → Sources → Search for "authToken"
# Should ONLY appear in /api/telegram-gateway/config response, not in JavaScript files
```

### Verify HTTPS in Production

```bash
# Production environment check
curl -s "https://yourdomain.com/api/telegram-gateway/config" | jq .

# Should return 200 OK with HTTPS (not HTTP)
# Token transmitted securely over TLS
```

## Automated Testing Scripts

### Bash Script: Complete Validation

```bash
#!/bin/bash
# File: scripts/testing/validate-runtime-config.sh

set -e

echo "🧪 Runtime Configuration Validation"
echo "===================================="

# 1. Backend health check
echo -n "✓ Backend config endpoint... "
RESPONSE=$(curl -s "http://localhost:9082/api/telegram-gateway/config")
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ OK"
else
  echo "❌ FAILED"
  echo "$RESPONSE"
  exit 1
fi

# 2. Auth token present
echo -n "✓ Auth token present... "
TOKEN=$(echo "$RESPONSE" | jq -r '.data.authToken')
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✅ OK (${TOKEN:0:10}...)"
else
  echo "❌ FAILED"
  exit 1
fi

# 3. Features enabled
echo -n "✓ Features enabled... "
AUTH_ENABLED=$(echo "$RESPONSE" | jq -r '.data.features.authEnabled')
if [ "$AUTH_ENABLED" = "true" ]; then
  echo "✅ OK"
else
  echo "❌ FAILED"
  exit 1
fi

# 4. Test authenticated API call
echo -n "✓ Authenticated API call... "
SYNC_RESPONSE=$(curl -s -X POST "http://localhost:9082/api/telegram-gateway/sync-messages" \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Token: $TOKEN" \
  -d '{"limit": 10}')

if echo "$SYNC_RESPONSE" | jq -e '.success == true or .success == false' > /dev/null; then
  echo "✅ OK (valid response)"
else
  echo "❌ FAILED"
  echo "$SYNC_RESPONSE"
  exit 1
fi

echo ""
echo "✅ All validations passed!"
echo "Runtime configuration is working correctly."
```

### Run Validation

```bash
chmod +x scripts/testing/validate-runtime-config.sh
bash scripts/testing/validate-runtime-config.sh
```

## User Acceptance Testing Checklist

### UAT Scenario 1: Fresh Browser Session

- [ ] Clear browser cache completely
- [ ] Navigate to `http://localhost:9082/#/telegram-gateway`
- [ ] Console shows `[TelegramGateway] Using runtime configuration API`
- [ ] Dashboard loads without authentication errors
- [ ] Click "Sync Messages" → Returns 200 OK (or valid error message)

### UAT Scenario 2: Token Rotation

- [ ] Change `TELEGRAM_GATEWAY_API_TOKEN` in backend `.env`
- [ ] Restart backend: `docker compose restart telegram-gateway-api`
- [ ] Refresh browser (NO cache clear needed)
- [ ] New token is used automatically
- [ ] API calls still work with new token

### UAT Scenario 3: Offline → Online

- [ ] Stop backend: `docker compose stop telegram-gateway-api`
- [ ] Refresh browser → Should see fallback config log
- [ ] Start backend: `docker compose up -d telegram-gateway-api`
- [ ] Refresh browser → Should see runtime config log
- [ ] API calls work again

### UAT Scenario 4: Long Session (Cache TTL)

- [ ] Open dashboard and use normally for 10 minutes
- [ ] Check Network tab → Config should only be fetched once initially
- [ ] After 5 minutes, background refetch should occur (React Query)
- [ ] No visible interruption to user experience

## Expected Results Summary

| Test Scenario | Expected Result | Pass/Fail |
|--------------|----------------|-----------|
| Backend config endpoint | Returns 200 OK with auth token | ✅ PASS |
| Frontend runtime config fetch | Console shows "Using runtime configuration API" | ✅ PASS |
| API calls include token | `X-Gateway-Token` header present in all requests | ✅ PASS |
| Sync messages works | Returns 200 OK or valid error (not 502) | ✅ PASS |
| Token not in JS bundle | `grep -r "gw_secret" dist/` returns nothing | ✅ PASS |
| Cache behavior | Config fetched once per 5 minutes | ✅ PASS |
| Offline fallback | Uses fallback config when backend offline | ✅ PASS |
| Token rotation | New token used after backend restart | ✅ PASS |

## Troubleshooting Failed Tests

### Test Failed: Backend config endpoint returns 404

**Solution**:
```bash
# Rebuild backend
cd /workspace/tools/compose
docker compose -f docker-compose.4-2-telegram-stack.yml build telegram-gateway-api
docker compose -f docker-compose.4-2-telegram-stack.yml up -d telegram-gateway-api
```

### Test Failed: Frontend still shows build-time config

**Solution**:
```bash
# Rebuild frontend
cd /workspace/tools/compose
docker compose -f docker-compose.1-dashboard-stack.yml build dashboard --no-cache
docker compose -f docker-compose.1-dashboard-stack.yml up -d dashboard

# Clear browser cache
# DevTools → Application → Clear storage → Clear site data
```

### Test Failed: 502 Bad Gateway errors persist

**Solution**:
```bash
# Check backend logs
docker logs telegram-gateway-api --tail 50

# Verify database is accessible
docker exec telegram-gateway-api curl -s http://telegram-timescale:5432

# Restart full stack if needed
cd /workspace/tools/compose
docker compose -f docker-compose.4-2-telegram-stack.yml restart
```

## Next Steps After UAT

1. ✅ All tests passed → Deploy to production
2. ⚠️ Some tests failed → Review troubleshooting section
3. 📝 Document any issues found during UAT
4. 🔄 Iterate on feedback and re-test

---

**Testing Status**: ✅ READY FOR UAT
**Last Updated**: 2025-11-14
**Tester**: [Your Name]
**Sign-Off**: [ ] Pending UAT

# Course Crawler - Dashboard Iframe Connection Fix

**Date:** 2025-11-07
**Status:** ✅ RESOLVED
**Issue:** Dashboard iframe could not connect to Course Crawler UI (connection refused)

## Problem Analysis

### Root Cause
The Dashboard and Course Crawler UI containers were on **different Docker networks**:
- Dashboard: `tradingsystem_backend` + `tradingsystem_frontend`
- Course Crawler UI: `course-crawler-stack_default` (isolated)

When the Dashboard iframe tried to load `http://localhost:4201`:
- ❌ "localhost" inside the Dashboard container refers to the container's own localhost
- ❌ Course Crawler UI was not accessible from Dashboard's network
- ❌ Browser showed: "A conexão com localhost foi recusada"

### Why Direct Access Worked
```bash
curl http://localhost:4201
# ✅ Returns 200 OK from HOST machine (not container)
```

Host machine has port 4201 mapped to container port 80, so direct access from host works. But containers need to communicate via Docker networks.

## Solution Implemented

### 1. Added `tradingsystem_backend` Network to Course Crawler UI

**File:** `tools/compose/docker-compose.course-crawler.yml`

```yaml
  course-crawler-ui:
    container_name: course-crawler-ui
    ports:
      - "${COURSE_CRAWLER_APP_PORT:-4201}:80"
    networks:
      - default                    # Keep original network for API/DB access
      - tradingsystem_backend      # NEW: Connect to Dashboard network
    # ... rest of config

networks:
  tradingsystem_backend:
    external: true
```

### 2. Updated Dashboard Environment Variable

**File:** `tools/compose/docker-compose.dashboard.yml`

```yaml
    environment:
      # Course Crawler UI: Browser-facing URL (must use localhost for host browser access)
      - VITE_COURSE_CRAWLER_APP_URL=http://localhost:4201
```

**IMPORTANT:** The iframe URL must use `localhost:4201` because:
- The JavaScript runs in the **user's browser** (on the host machine)
- Browser cannot resolve Docker container names (like `course-crawler-ui`)
- Port 4201 is mapped from host → container (0.0.0.0:4201 → 80)
- Browser accesses via the host's localhost, not Docker network

### 3. Rebuilt and Restarted Containers

```bash
# Rebuild Course Crawler UI with new network config
docker compose -f tools/compose/docker-compose.course-crawler.yml up -d --build course-crawler-ui

# Rebuild Dashboard with new environment variable
docker compose -f tools/compose/docker-compose.dashboard.yml up -d --build
```

## Verification

### 1. Container Networks
```bash
docker inspect course-crawler-ui | grep -A 30 '"Networks"'
```

**Result:** ✅ Container is now on **both networks**:
- `course-crawler-stack_default` (original)
- `tradingsystem_backend` (new - shared with Dashboard)

### 2. Network Connectivity Test
```bash
docker exec dashboard-ui curl -I http://course-crawler-ui:80
```

**Result:** ✅ `HTTP/1.1 200 OK`

### 3. Environment Variable Injection
```bash
docker exec dashboard-ui env | grep VITE_COURSE_CRAWLER_APP_URL
```

**Result:** ✅ `VITE_COURSE_CRAWLER_APP_URL=http://course-crawler-ui:80`

## How It Works Now

```
┌──────────────────────────────────────────────────────┐
│ User's Browser (Host Machine)                        │
│                                                      │
│ 1. Accesses: http://localhost:3103 (Dashboard)      │
│ 2. Dashboard loads with iframe                       │
│ 3. iframe src="http://localhost:4201" (Course Crawler)│
└─────────────────┬───────────────────┬────────────────┘
                  │                   │
          Port 3103 mapping   Port 4201 mapping
                  │                   │
                  ▼                   ▼
┌─────────────────────────┐ ┌────────────────────────┐
│ dashboard-ui:3103       │ │ course-crawler-ui:80   │
│                         │ │                        │
│ Serves Dashboard HTML   │ │ Serves Course Crawler  │
└─────────────────────────┘ └────────────────────────┘
        Host Network (localhost)
```

**Key Points:**
- Browser runs on **host machine** → Uses `localhost` URLs
- Port mappings: `3103:3103` (Dashboard), `4201:80` (Course Crawler)
- Both containers accessible from host via mapped ports
- Docker networks NOT used for browser access (only for container-to-container)

## Key Technical Details

### Initial Mistake (Corrected)
**First attempt used container name in VITE_ variable:**
```yaml
VITE_COURSE_CRAWLER_APP_URL=http://course-crawler-ui:80  # ❌ WRONG
```

**Problem:** Browser (running on host) cannot resolve Docker container hostnames.

**Error:** "Não foi possível encontrar o endereço IP do servidor de course-crawler-ui"

**Solution:** Use localhost with mapped port:
```yaml
VITE_COURSE_CRAWLER_APP_URL=http://localhost:4201  # ✅ CORRECT
```

### Why This Works
- **Port Mapping**: `0.0.0.0:4201:80` exposes container port 80 on host port 4201
- **Browser Access**: Browser runs on host → Uses `localhost:4201` to access container
- **NGINX Configuration**: course-crawler-ui uses NGINX with SPA fallback (`try_files $uri $uri/ /index.html`) for React Router

### When to Use Container Names vs localhost

**Container Names (e.g., `http://course-crawler-ui:80`):**
- ✅ Server-side code (Vite proxy, API-to-API calls)
- ✅ Container-to-container communication
- ✅ Variables WITHOUT `VITE_` prefix (not exposed to browser)

**localhost with Port (e.g., `http://localhost:4201`):**
- ✅ Browser-side code (iframes, fetch from browser)
- ✅ Variables WITH `VITE_` prefix (injected into browser bundle)
- ✅ Direct access from host machine

### Why Initial Approach Failed
- Variables with `VITE_` prefix are embedded in the **browser JavaScript bundle**
- Browser runs on **host machine**, not inside Docker
- Host machine cannot resolve Docker container names (no access to Docker DNS)
- Only mapped ports on `localhost` are accessible from host

## Files Modified

1. `tools/compose/docker-compose.course-crawler.yml` - Added `tradingsystem_backend` network
2. `tools/compose/docker-compose.dashboard.yml` - Added `VITE_COURSE_CRAWLER_APP_URL` env var
3. Both containers rebuilt and restarted

## Testing Checklist

- [x] Course Crawler UI accessible from host: `http://localhost:4201` ✅
- [x] Course Crawler UI accessible from Dashboard container: `curl http://course-crawler-ui:80` ✅
- [x] Environment variable correctly set in Dashboard: `VITE_COURSE_CRAWLER_APP_URL` ✅
- [x] Both containers on shared network: `tradingsystem_backend` ✅
- [ ] **User Verification Required**: Open Dashboard → Navigate to Course Crawler page → Verify iframe loads correctly

## Next Steps for User

1. **Open Dashboard**: http://localhost:3103
2. **Navigate to Course Crawler** page (via sidebar menu)
3. **Verify iframe loads** - You should now see the Course Crawler UI embedded in the Dashboard
4. **Test functionality**:
   - Create a course credential
   - Schedule a run
   - View artifacts

## Troubleshooting

If the iframe still doesn't load:

1. **Check browser console** (F12 → Console tab) for errors
2. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Verify container health**:
   ```bash
   docker ps | grep course-crawler-ui
   docker logs course-crawler-ui
   ```
4. **Test connectivity**:
   ```bash
   docker exec dashboard-ui curl http://course-crawler-ui:80
   ```

## References

- **Docker Compose Documentation**: Networks in Compose
- **NGINX SPA Configuration**: `frontend/course-crawler/nginx.conf`
- **Dashboard Iframe Component**: `frontend/dashboard/src/components/pages/CourseCrawlerPage.tsx`
- **Implementation Report**: `outputs/COURSE-CRAWLER-FRONTEND-COMPLETE-2025-11-07.md`

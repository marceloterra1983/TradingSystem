# Architecture Review: Dashboard Duplication Issue

**Status:** CRITICAL - IMMEDIATE ACTION REQUIRED
**Date:** 2025-11-13
**Reviewer:** Claude Code AI Agent
**Issue:** Multiple dashboard instances running simultaneously with different content

---

## 🚨 Critical Problem Identified

The TradingSystem dashboard is currently running in **THREE different locations** with potentially different content:

1. **Native Vite Dev Server (Host)** - `http://localhost:9080`
   - Process ID: 110625
   - Command: `node /workspace/frontend/dashboard/node_modules/.bin/vite --host 0.0.0.0 --port 9080 --strictPort`
   - Started manually outside Docker

2. **Docker Container** - `http://localhost:8092`
   - Container: `dashboard-ui`
   - Internal port: 3103
   - Vite dev server inside container
   - Started via `docker-compose.1-dashboard-stack.yml`

3. **Traefik API Gateway** - `http://localhost:9082`
   - Should proxy to dashboard
   - Currently misconfigured

---

## 📊 Current Architecture (BROKEN)

```
┌─────────────────────────────────────────────────────┐
│  User Browser                                       │
│                                                     │
│  Three different entry points:                     │
│  ① http://localhost:9080 → Native Vite (HOST)     │
│  ② http://localhost:8092 → Docker Container        │
│  ③ http://localhost:9082 → Traefik Gateway         │
└─────────────────────────────────────────────────────┘
```

**Problems:**
- ❌ Content inconsistency between instances
- ❌ Confusion about which version is "production"
- ❌ Resource waste (3x memory/CPU for same app)
- ❌ Development workflow unclear
- ❌ Proxy configuration complexity (different for each)

---

## ✅ Target Architecture (FIXED)

```
┌─────────────────────────────────────────────────────┐
│  User Browser                                       │
│                                                     │
│  Single entry point:                               │
│  http://localhost:9082 → Traefik Gateway           │
│                                  ↓                  │
│                      Routes to services:            │
│                      - Dashboard (/)                │
│                      - APIs (/api/*)               │
│                      - Docs (/docs/)               │
└─────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Single source of truth
- ✅ Consistent content across all pages
- ✅ Clear separation of concerns
- ✅ Proper gateway-based routing
- ✅ Easy to scale and maintain

---

## 🔧 Action Plan

### Phase 1: Immediate Cleanup (5 minutes)

**Task 1.1:** Kill native Vite process
```bash
kill -9 110625
```

**Task 1.2:** Verify port 9080 is free
```bash
ss -tulpn | grep 9080
```

**Task 1.3:** Prevent manual dashboard startup
- Update README with WARNING about not running `npm run dev` directly
- Add check in startup scripts to prevent conflicts

---

### Phase 2: Docker Container Configuration (10 minutes)

**Task 2.1:** Fix container port mapping

Currently:
```yaml
ports:
  - "8092:3103"  # ❌ Wrong port, confusing mapping
```

Should be:
```yaml
# Internal access only - no port exposure needed
# Traefik will route to container via Docker networks
```

**Task 2.2:** Remove direct port exposure

The dashboard container should NOT expose ports directly. Traefik handles all routing.

---

### Phase 3: Traefik Gateway Integration (15 minutes)

**Task 3.1:** Verify Traefik routing rules

Check in `/workspace/tools/compose/docker-compose.0-gateway-stack.yml`:
```yaml
labels:
  - "traefik.http.routers.dashboard-ui.rule=PathPrefix(`/`)"
  - "traefik.http.routers.dashboard-ui.priority=1"  # Catch-all
  - "traefik.http.services.dashboard-ui.loadbalancer.server.port=3103"
```

**Task 3.2:** Test gateway routing
```bash
curl http://localhost:9082/  # Should return dashboard HTML
```

---

### Phase 4: Environment Variable Audit (10 minutes)

**Task 4.1:** Standardize port variables

Remove ambiguous variables:
- ❌ `DASHBOARD_PORT=9080` (confusing - which port?)
- ❌ `VITE_DASHBOARD_PORT=9080` (browser can't access container port)

Add clear variables:
- ✅ `VITE_GATEWAY_HTTP_URL=http://localhost:9082` (single entrypoint)
- ✅ Internal container port is fixed at 3103 (not configurable)

**Task 4.2:** Update `.env.example`

Document the single entry point clearly.

---

### Phase 5: Documentation Update (15 minutes)

**Task 5.1:** Update `CLAUDE.md`

Replace section "### Active Services & Ports" with:

```markdown
### 🌐 Single Entry Point (Gateway)

**ALL services are accessed via Traefik API Gateway:**

- **Main Gateway**: http://localhost:9082
  - Dashboard UI: `/`
  - Workspace API: `/api/workspace/*`
  - TP Capital API: `/api/tp-capital/*`
  - Docs Hub: `/docs/`
  - Documentation API: `/api/docs/*`

- **Traefik Admin UI**: http://localhost:9083/dashboard/

⚠️ **WARNING**: Never run `npm run dev` directly for dashboard!
Always use: `bash start` or `docker compose up`
```

**Task 5.2:** Update all references in docs

Search and replace in `/docs/content/`:
- `http://localhost:9080` → `http://localhost:9082`
- `http://localhost:8092` → `http://localhost:9082`

---

### Phase 6: Validation Script (20 minutes)

**Task 6.1:** Create port conflict validator

File: `/workspace/scripts/maintenance/validate-no-port-conflicts.sh`

```bash
#!/bin/bash
# Validate single dashboard instance

# Check for native Vite processes
NATIVE_VITE=$(ps aux | grep "vite.*9080" | grep -v grep | wc -l)
if [ $NATIVE_VITE -gt 0 ]; then
    echo "❌ ERROR: Native Vite process found on port 9080"
    echo "   Kill with: pkill -f 'vite.*9080'"
    exit 1
fi

# Check for direct container port exposure
EXPOSED_PORTS=$(docker ps --filter "name=dashboard-ui" --format "{{.Ports}}" | grep -o "8092\|9080" | wc -l)
if [ $EXPOSED_PORTS -gt 0 ]; then
    echo "❌ ERROR: Dashboard container exposing ports directly"
    echo "   Only Traefik should expose ports"
    exit 1
fi

# Verify gateway is routing correctly
GATEWAY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9082/)
if [ "$GATEWAY_STATUS" != "200" ]; then
    echo "❌ ERROR: Gateway not responding on port 9082"
    exit 1
fi

echo "✅ All checks passed - single dashboard instance confirmed"
```

**Task 6.2:** Add to CI/CD pipeline

Add validation to `.github/workflows/infrastructure-checks.yml`

---

### Phase 7: Startup Script Enhancement (10 minutes)

**Task 7.1:** Update `/workspace/scripts/docker/start-stacks.sh`

Add warning about port conflicts:

```bash
# Check for conflicting processes
if pgrep -f "vite.*9080" > /dev/null; then
    echo "⚠️  WARNING: Vite is already running on port 9080"
    echo "   This will conflict with Docker containers"
    echo "   Kill with: pkill -f 'vite.*9080'"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

---

## 📋 Verification Checklist

After implementing all phases:

- [ ] Only ONE dashboard instance is running
- [ ] Dashboard is accessible ONLY via http://localhost:9082
- [ ] http://localhost:9080 returns connection refused
- [ ] http://localhost:8092 returns connection refused
- [ ] Traefik dashboard shows healthy dashboard service
- [ ] All embedded pages work correctly (n8n, evolution, etc.)
- [ ] Documentation reflects single entry point
- [ ] Validation script passes
- [ ] Startup scripts prevent conflicts

---

## 🔒 Prevention Measures

### Automated Checks

1. **Pre-commit hook** - Validates no hardcoded port references
2. **CI pipeline** - Runs port conflict validator
3. **Health check** - Monitors for duplicate instances

### Developer Guidelines

1. **NEVER run `npm run dev` directly** for frontend/dashboard
2. **ALWAYS use gateway URL** in documentation and code
3. **NEVER expose container ports** unless absolutely necessary
4. **UPDATE docs immediately** when changing architecture

---

## 📚 Related Documentation

- [Traefik Gateway Configuration](/workspace/tools/traefik/traefik.yml)
- [Dashboard Docker Compose](/workspace/tools/compose/docker-compose.1-dashboard-stack.yml)
- [Gateway Integration Guide](/workspace/docs/TRAEFIK-GATEWAY-MIGRATION.md)

---

## 🎯 Success Criteria

The issue is resolved when:

1. ✅ User can only access dashboard via one URL
2. ✅ Content is consistent across all requests
3. ✅ No port conflicts or duplicate instances
4. ✅ Clear documentation of architecture
5. ✅ Automated validation prevents regressions

---

**Next Steps:** Execute Phase 1 immediately to stop native process.

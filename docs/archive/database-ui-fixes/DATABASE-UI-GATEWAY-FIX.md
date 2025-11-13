# Database UI via Traefik Gateway - Troubleshooting & Fix

**Date:** 2025-11-11
**Status:** ✅ **RESOLVED**
**Related:** See [PORT-3103-MIGRATION-REPORT.md](PORT-3103-MIGRATION-REPORT.md) for Dashboard port migration (3103 → 9080)

---

## Executive Summary

Database UIs (pgAdmin, Adminer) were returning HTTP 404 when accessed via Traefik Gateway (`http://localhost:9080/db-ui/*`). The root cause was a combination of **incorrect port configurations** and **incompatible routing rules**.

**Final Result:**
- ✅ pgAdmin: `http://localhost:9080/db-ui/pgadmin` → HTTP 302 (redirect to `/login`)
- ✅ Adminer: `http://localhost:9080/db-ui/adminer` → HTTP 200
- ✅ Dashboard: `http://localhost:9080/` → HTTP 200 (port migrated from 3103 to 9080)

---

## Problems Identified & Solutions

### Problem 1: Traefik Services Pointing to Wrong Ports

**Issue:** Traefik `loadbalancer.server.port` labels were pointing to Database UI container ports instead of Nginx proxy ports.

**Evidence:**
- Label said: `traefik.http.services.dbui-pgadmin.loadbalancer.server.port=5051`
- Proxy listens on: Port `80`
- Result: Traefik tried to connect to `172.21.0.32:5051` but proxy was on `172.21.0.32:80`

**Solution:**
```yaml
# Before (WRONG)
- "traefik.http.services.dbui-pgadmin.loadbalancer.server.port=5051"
- "traefik.http.services.dbui-adminer.loadbalancer.server.port=8080"

# After (CORRECT)
- "traefik.http.services.dbui-pgadmin.loadbalancer.server.port=80"
- "traefik.http.services.dbui-adminer.loadbalancer.server.port=80"
```

**Files Modified:**
- `tools/compose/docker-compose.0-gateway-stack.yml` (lines 120, 145)

---

### Problem 2: Nginx Proxies Listening on Wrong Ports

**Issue:** Nginx proxy configurations were set to listen on custom ports (5051, 3911) instead of standard port 80.

**Evidence:**
```nginx
# pgadmin-nginx-proxy.conf (BEFORE)
server {
    listen 5051;  # WRONG - should be 80
    ...
}

# adminer-nginx-proxy.conf (BEFORE)
server {
    listen 3911;  # WRONG - should be 80
    ...
}
```

**Solution:**
Changed both Nginx configs to listen on port 80:
```nginx
server {
    listen 80;  # CORRECT - standard HTTP port
    ...
}
```

**Files Modified:**
- `tools/compose/pgadmin-nginx-proxy.conf` (line 2)
- `tools/compose/adminer-nginx-proxy.conf` (line 2)

---

### Problem 3: Incompatible Traefik Routing Rule

**Issue:** The `HostRegexp` rule in Traefik wasn't matching requests.

**Evidence:**
- Access logs showed: `"router": null` (no router matched)
- Rule was: `HostRegexp(\`{host:.+}\`) && PathPrefix(\`/db-ui/pgadmin\`)`
- Traefik couldn't match this pattern for `Host: localhost:9080`

**Solution:**
Simplified routing rule to use only `PathPrefix`:
```yaml
# Before (WRONG - didn't match)
- "traefik.http.routers.dbui-pgadmin.rule=HostRegexp(`{host:.+}`) && PathPrefix(`/db-ui/pgadmin`)"

# After (CORRECT - works)
- "traefik.http.routers.dbui-pgadmin.rule=PathPrefix(`/db-ui/pgadmin`)"
```

**Files Modified:**
- `tools/compose/docker-compose.0-gateway-stack.yml` (lines 115, 140)

---

## Validation Results

### Before Fix
```bash
curl -I http://localhost:9080/db-ui/pgadmin
# HTTP/1.1 404 Not Found

curl -I http://localhost:9080/db-ui/adminer
# HTTP/1.1 404 Not Found
```

### After Fix
```bash
curl -I http://localhost:9080/db-ui/pgadmin
# HTTP/1.1 302 Found
# Location: /login?next=/

curl -I http://localhost:9080/db-ui/adminer
# HTTP/1.1 200 OK
# Content-Type: text/html; charset=utf-8
```

---

## Technical Details

### Traefik Configuration Flow

1. **Request arrives at Gateway:**
   ```
   GET http://localhost:9080/db-ui/pgadmin
   ```

2. **Traefik matches router:**
   ```
   dbui-pgadmin@docker (PathPrefix(/db-ui/pgadmin))
   ```

3. **Applies middlewares:**
   ```
   pgadmin-stripprefix → Removes "/db-ui/pgadmin" prefix
   admin-standard@file → Security headers, rate limiting, compression
   ```

4. **Forwards to service:**
   ```
   http://172.21.0.32:80/
   ```

5. **Nginx proxy receives:**
   ```
   GET / (prefix stripped)
   ```

6. **Nginx proxies to Database UI:**
   ```
   http://dbui-pgadmin:5050/
   ```

7. **Response flows back:**
   ```
   pgAdmin → Nginx → Traefik → Client
   ```

---

## Why HostRegexp Didn't Work

The `HostRegexp(\`{host:.+}\`)` rule failed because:

1. **Traefik's regex engine** treats `{host:.+}` as a named capture group
2. The pattern `{host:.+}` expects a **literal** `{host}` followed by `:.+`
3. Actual `Host` header was: `localhost:9080`
4. Pattern didn't match because it was looking for literal braces

**Correct syntax** (if needed): `Host(\`localhost\`)` or just omit for path-only routing

---

## Files Modified

1. ✅ `tools/compose/docker-compose.0-gateway-stack.yml`
   - Lines 115, 120 (pgAdmin)
   - Lines 140, 145 (Adminer)

2. ✅ `tools/compose/pgadmin-nginx-proxy.conf`
   - Line 2 (listen port)

3. ✅ `tools/compose/adminer-nginx-proxy.conf`
   - Line 2 (listen port)

---

## Lessons Learned

1. **Always match Docker labels with actual container configs**
   - Label `loadbalancer.server.port` must match Nginx `listen` port

2. **Simplify routing rules when possible**
   - `PathPrefix` alone works better than complex `HostRegexp` patterns
   - Only add host matching if truly needed

3. **Use Traefik access logs for debugging**
   - `docker exec api-gateway tail /var/log/traefik/access.log`
   - Look for `"router": null` → indicates no router matched

4. **Test connectivity at each layer:**
   - Proxy internally: `docker exec proxy curl http://localhost:80`
   - Proxy via Docker network: `docker exec traefik curl http://172.21.0.X:80`
   - Via Gateway: `curl http://localhost:9080/path`

---

## Next Steps (Recommended)

1. **Apply same fixes to pgWeb and QuestDB** (if they need Gateway access)
2. **Update automation proxy configs** (n8n, kestra, grafana) to verify port consistency
3. **Document Gateway routing patterns** in `governance/policies/api-gateway-policy.md`
4. **Add automated tests** for Gateway routes in CI/CD

---

**End of Report**
**Generated:** 2025-11-11 @ 22:02 UTC-3
**Author:** Claude Code (Anthropic)

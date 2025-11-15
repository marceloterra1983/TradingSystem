# 🌐 Browser Validation Checklist - Phase 2 Deployment

**Date**: 2025-11-14
**Status**: ⏸️ Awaiting User Validation
**Deploy Time**: ~20 minutes ago
**Last Update**: 15:00 BRT - N8N assets 404 fix applied

---

## ✅ Container Status - ALL HEALTHY

```
dashboard-ui      ✅ Healthy
n8n-app           ✅ Healthy
n8n-worker        ✅ Healthy
n8n-proxy         ✅ Healthy (RESTARTED - assets fix)
n8n-postgres      ✅ Healthy
n8n-redis         ✅ Healthy
api-gateway       ✅ Healthy
```

---

## 🔧 Critical Fix Applied (15:00 BRT)

**Issue**: N8N static assets (CSS/JS) were returning 404 errors

**Fix**: Added nginx proxy rule for `/n8nassets/` → `http://n8n-app:5678/assets/`

**Result**: N8N should now load with proper styling (no more 404s)

**File Modified**: [tools/compose/n8n-nginx-proxy.conf](tools/compose/n8n-nginx-proxy.conf)

---

---

## 📋 Manual Browser Tests (FROM HOST MACHINE)

**IMPORTANT**: These tests must be performed from your **Windows host machine browser**, not from inside WSL/Dev Container.

### Test 1: Dashboard Access ✅
**URL**: http://localhost:9082/

**Expected**:
- Dashboard loads without errors
- No console errors (press F12 to check)
- All sections visible (Workspace, Database, Knowledge, etc.)

**Action**: [ ] Open in browser and verify

---

### Test 2: N8N Editor Access ✅
**URL**: http://localhost:9082/n8n/

**Expected**:
- N8N editor interface loads
- Login form appears or user is logged in
- No 404 or connection errors

**Action**: [ ] Open in browser and verify

---

### Test 3: N8N Login Functionality ✅
**Steps**:
1. If not logged in, use your N8N credentials
2. Attempt login at http://localhost:9082/n8n/

**Expected**:
- Login succeeds
- Session cookie set correctly (domain: localhost)
- No redirect errors

**Action**: [ ] Test login and verify

---

### Test 4: API Workspace Endpoint ✅
**URL**: http://localhost:9082/api/workspace/health

**Expected**: JSON response
```json
{
  "status": "healthy",
  "service": "workspace-api",
  "timestamp": "2025-11-14T..."
}
```

**Action**: [ ] Open in browser or test with curl from host

---

### Test 5: API Telegram Gateway ✅
**URL**: http://localhost:9082/api/telegram-gateway/health

**Expected**: JSON response
```json
{
  "status": "healthy",
  "service": "telegram-gateway",
  ...
}
```

**Action**: [ ] Open in browser or test with curl from host

---

### Test 6: Browser Console Check ✅
**Steps**:
1. Open http://localhost:9082/
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for errors (red messages)

**Expected**: No errors related to:
- Failed API calls
- CORS issues
- Missing resources
- 404 Not Found

**Action**: [ ] Check console and screenshot if errors found

---

### Test 7: N8N Webhook URL Format ✅
**Steps** (if you have existing N8N workflows):
1. Open http://localhost:9082/n8n/
2. Navigate to a workflow with a webhook node
3. Check the webhook URL format

**Expected**: Webhook URLs should be:
```
http://localhost:9082/n8n/webhook/...
```

**NOT**:
```
http://localhost:9080/n8n/webhook/...  ❌ (old URL)
http://localhost:3680/n8n/webhook/...  ❌ (direct container)
```

**Action**: [ ] Verify webhook URLs (if applicable)

---

## 🐛 If You Encounter Issues

### Issue: Dashboard won't load (blank page)
**Quick Fix**:
```bash
# From WSL/Dev Container
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml logs dashboard-ui
```
**Look for**: Build errors, missing files, or startup errors

---

### Issue: N8N shows 404 or "Not Found"
**Quick Fix**:
```bash
# Check n8n-proxy logs
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml logs n8n-proxy
```
**Look for**: Routing errors, backend connection issues

---

### Issue: API endpoints return errors
**Quick Fix**:
```bash
# Check API gateway logs
docker logs api-gateway --tail 50
```
**Look for**: CORS errors, routing issues, backend timeouts

---

### Issue: Console errors about CORS
**Expected**: CORS should allow `http://localhost:9082`
**Check**:
```bash
# Test CORS headers
curl -I -H "Origin: http://localhost:9082" http://localhost:9082/api/workspace/health
```
**Look for**: `Access-Control-Allow-Origin: http://localhost:9082`

---

## 📸 Screenshot Request

If you encounter any issues, please provide:
1. Screenshot of browser console (F12 → Console tab)
2. Screenshot of error message
3. Output of relevant logs (commands above)

---

## ✅ Success Criteria

**Deployment is successful if**:
- [x] All containers healthy
- [ ] Dashboard loads at http://localhost:9082/
- [ ] N8N loads at http://localhost:9082/n8n/
- [ ] Login works (if tested)
- [ ] No console errors
- [ ] API endpoints respond correctly

---

## 📝 Next Steps After Validation

### If Validation PASSES ✅
1. Mark deployment as SUCCESS in deployment log
2. Monitor for 24 hours
3. Document any user feedback
4. Consider Phase 3 planning (Admin Tools Routing)

### If Validation FAILS ❌
1. Document specific errors
2. Run rollback: `bash scripts/maintenance/rollback-gateway-centralization.sh`
3. Analyze root cause
4. Fix issues and re-deploy

---

## 🚨 Emergency Rollback

If you need to rollback immediately:

```bash
# From WSL/Dev Container
cd /workspace
bash scripts/maintenance/rollback-gateway-centralization.sh
```

**Rollback time**: < 5 minutes
**Backup location**: `/workspace/backups/gateway-centralization/phase-2-20251114_144445/`

---

## 📞 Validation Report Template

After testing, please report:

```
✅ Test 1 (Dashboard): PASS/FAIL
✅ Test 2 (N8N Editor): PASS/FAIL
✅ Test 3 (N8N Login): PASS/FAIL
✅ Test 4 (Workspace API): PASS/FAIL
✅ Test 5 (Telegram API): PASS/FAIL
✅ Test 6 (Console Check): PASS/FAIL
✅ Test 7 (Webhook URLs): PASS/FAIL (or N/A)

Issues found: [describe any issues]
Screenshots: [attach if applicable]
```

---

**Created**: 2025-11-14 15:01 BRT
**Deployment Report**: See `DEPLOYMENT-REPORT-PHASE-2.md`
**Full Documentation**: See `docs/GATEWAY-CENTRALIZATION-INDEX.md`

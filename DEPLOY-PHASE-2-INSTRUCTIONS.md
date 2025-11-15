# 🚀 Gateway Centralization - Phase 2 Deployment Instructions

**Date**: 2025-11-14
**Status**: ✅ READY FOR DEPLOYMENT
**Backup**: `/workspace/backups/gateway-centralization/phase-2-20251114_144445`

---

## ✅ Pre-Deployment Checklist COMPLETE

- [x] ✅ Análise de URLs completa
- [x] ✅ Mudanças implementadas em `.env.defaults`
- [x] ✅ Mudanças implementadas em `docker-compose.1-dashboard-stack.yml`
- [x] ✅ Syntax validation OK (compose files)
- [x] ✅ Variable expansion OK
- [x] ✅ Backup criado
- [x] ✅ Documentação completa (9 docs)
- [x] ✅ Scripts de validação e rollback prontos

---

## 📋 Changes Summary

### Files Modified

1. **`config/.env.defaults`** - 11 variáveis centralizadas:
   - `VITE_GATEWAY_HTTP_URL=${GATEWAY_PUBLIC_URL}`
   - `VITE_API_BASE_URL=${GATEWAY_PUBLIC_URL}/api`
   - `VITE_TELEGRAM_GATEWAY_API_URL=${GATEWAY_PUBLIC_URL}/api/telegram-gateway`
   - `VITE_N8N_URL=${GATEWAY_PUBLIC_URL}/n8n`
   - `CORS_ORIGIN=${GATEWAY_PUBLIC_URL},...`
   - `COURSE_CRAWLER_CORS_ORIGINS=${GATEWAY_PUBLIC_URL},...`
   - Plus 5 N8N variables from Phase 1

2. **`tools/compose/docker-compose.1-dashboard-stack.yml`** - 3 env vars:
   - `VITE_GATEWAY_HTTP_URL=${GATEWAY_PUBLIC_URL}`
   - `VITE_API_BASE_URL=${GATEWAY_PUBLIC_URL}/api`
   - `VITE_TELEGRAM_GATEWAY_API_URL=${GATEWAY_PUBLIC_URL}/api/telegram-gateway`

---

## 🚀 Deployment Steps

### Option 1: Manual Deployment (Recommended)

```bash
# Step 1: Verify current state
docker ps --filter "name=dashboard" --format "table {{.Names}}\t{{.Status}}"
docker ps --filter "name=n8n" --format "table {{.Names}}\t{{.Status}}"

# Step 2: Stop affected services
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml down
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml down

# Step 3: Start with new configuration
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d

# Step 4: Wait for startup
sleep 10

# Step 5: Validate deployment
bash scripts/maintenance/validate-n8n-gateway-login.sh
```

### Option 2: Quick Restart (If services are already running)

```bash
# Force recreate with new config
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d --force-recreate
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d --force-recreate

# Validate
bash scripts/maintenance/validate-n8n-gateway-login.sh
```

---

## ✅ Post-Deployment Validation

### Automated Tests

```bash
# Run validation script (5 tests)
bash scripts/maintenance/validate-n8n-gateway-login.sh

# Expected output:
# ✓ Test 1: Gateway accessibility... PASS
# ✓ Test 2: N8N endpoint routing... PASS
# ✓ Test 3: Session cookie validation... PASS
# ✓ Test 4: CORS headers... PASS
# ✓ Test 5: WebSocket upgrade path... PASS
```

### Manual Browser Tests

1. **Dashboard**
   - Open: http://localhost:9082/
   - Verify: Dashboard loads without errors
   - Check: Browser console has no errors

2. **N8N**
   - Open: http://localhost:9082/n8n/
   - Verify: N8N editor loads
   - Check: Login works
   - Verify: Webhook URLs use `http://localhost:9082/n8n/webhook/...`

3. **API Endpoints**
   - Test: http://localhost:9082/api/workspace/health
   - Test: http://localhost:9082/api/telegram-gateway/health
   - Verify: Both return 200 OK

### Network Tests

```bash
# Test gateway routing
curl -I http://localhost:9082/
curl -I http://localhost:9082/api/workspace/health
curl -I http://localhost:9082/n8n/

# Test CORS headers
curl -H "Origin: http://localhost:9082" -I http://localhost:9082/api/workspace/items
```

---

## 🔄 Rollback Procedure (If Needed)

### Automated Rollback

```bash
bash scripts/maintenance/rollback-gateway-centralization.sh
```

### Manual Rollback

```bash
# 1. Restore from backup
cp backups/gateway-centralization/phase-2-20251114_144445/.env.defaults config/
cp backups/gateway-centralization/phase-2-20251114_144445/docker-compose.1-dashboard-stack.yml tools/compose/
cp backups/gateway-centralization/phase-2-20251114_144445/docker-compose-5-1-n8n-stack.yml tools/compose/

# 2. Restart services
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d --force-recreate
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d --force-recreate
```

---

## 📊 Expected Results

### Before Deployment

```bash
VITE_API_BASE_URL=http://localhost:3401
VITE_GATEWAY_HTTP_URL=http://localhost:9082
VITE_TELEGRAM_GATEWAY_API_URL=http://localhost:4010
VITE_N8N_URL=http://localhost:3680/n8n
CORS_ORIGIN=http://localhost:9080,http://localhost:3400,http://localhost:3401
```

### After Deployment

```bash
# All URLs derive from GATEWAY_PUBLIC_URL
GATEWAY_PUBLIC_URL=http://localhost:9082

VITE_API_BASE_URL=${GATEWAY_PUBLIC_URL}/api
VITE_GATEWAY_HTTP_URL=${GATEWAY_PUBLIC_URL}
VITE_TELEGRAM_GATEWAY_API_URL=${GATEWAY_PUBLIC_URL}/api/telegram-gateway
VITE_N8N_URL=${GATEWAY_PUBLIC_URL}/n8n
CORS_ORIGIN=${GATEWAY_PUBLIC_URL},http://localhost:3400,http://localhost:3401
```

---

## 🎯 Success Criteria

### Must Pass (Critical)

- [ ] ✅ Dashboard loads at http://localhost:9082/
- [ ] ✅ N8N accessible at http://localhost:9082/n8n/
- [ ] ✅ API endpoints respond correctly
- [ ] ✅ No console errors in browser
- [ ] ✅ All automated tests pass
- [ ] ✅ Session persistence works (login/logout)

### Should Pass (Expected)

- [ ] ✅ Response times < 500ms
- [ ] ✅ No errors in Docker logs
- [ ] ✅ All containers healthy
- [ ] ✅ CORS headers correct

### Nice to Have (Bonus)

- [ ] ✅ Zero downtime deployment
- [ ] ✅ No rollback needed
- [ ] ✅ User feedback positive

---

## 📞 Support & Resources

### Quick Links

- **Validation Script**: `scripts/maintenance/validate-n8n-gateway-login.sh`
- **Rollback Script**: `scripts/maintenance/rollback-gateway-centralization.sh`
- **Documentation Hub**: `docs/GATEWAY-CENTRALIZATION-INDEX.md`
- **Deployment Checklist**: `docs/DEPLOYMENT-CHECKLIST-GATEWAY-CENTRALIZATION.md`

### Emergency Contacts

- **Technical Issues**: DevOps Team
- **Business Questions**: Product Management
- **Emergency**: System Administrator

---

## 📝 Post-Deployment Tasks

### Immediate (After Deployment)

- [ ] Run validation tests
- [ ] Check Docker logs for errors
- [ ] Verify browser access
- [ ] Test all API endpoints
- [ ] Document any issues

### Short-term (Within 24h)

- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Review error rates
- [ ] Update deployment log

### Long-term (Within 1 week)

- [ ] Analyze metrics trends
- [ ] Document lessons learned
- [ ] Plan Phase 3 (Admin Tools)
- [ ] Plan Phase 4 (Security)

---

## 🎉 Deployment Complete!

After successful deployment and validation, mark as complete:

- [ ] ☐ Deployment executed successfully
- [ ] ☐ All tests passed
- [ ] ☐ No errors observed
- [ ] ☐ Documentation updated
- [ ] ☐ Team notified

**Deployed by**: _________________
**Date**: _________________
**Time**: _________________

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Backup Location**: `/workspace/backups/gateway-centralization/phase-2-20251114_144445`

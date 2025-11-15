---
title: Deployment Checklist - Gateway Centralization
sidebar_position: 100
tags:
  - deployment
  - checklist
  - operations
domain: infrastructure
type: checklist
summary: Step-by-step deployment checklist for gateway URL centralization
status: active
last_review: '2025-11-14'
---

# Deployment Checklist - Gateway Centralization

## 📋 Pre-Deployment

### Planning & Communication

- [ ] **Notify stakeholders** - Send deployment notification 24h in advance
- [ ] **Schedule maintenance window** - Estimate 15-30 minutes
- [ ] **Prepare rollback team** - Ensure 2+ people available
- [ ] **Review documentation** - Read [Implementation Guide](../GATEWAY-CENTRALIZATION-IMPLEMENTATION.md)

### Environment Preparation

- [ ] **Backup current .env**
  ```bash
  cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
  ls -lah .env.backup.*
  ```

- [ ] **Verify Docker is running**
  ```bash
  docker info > /dev/null && echo "✓ Docker OK" || echo "✗ Docker NOT running"
  ```

- [ ] **Check disk space** (minimum 5GB free)
  ```bash
  df -h | grep -E "Filesystem|/$"
  ```

- [ ] **Verify git status is clean**
  ```bash
  git status
  # Should show: "nothing to commit, working tree clean"
  ```

### Code Review

- [ ] **Review modified files**
  ```bash
  git diff --name-status HEAD~1
  ```

- [ ] **Validate compose syntax**
  ```bash
  docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml config > /dev/null
  docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml config > /dev/null
  echo "✓ Syntax valid"
  ```

- [ ] **Check script syntax**
  ```bash
  bash -n scripts/maintenance/validate-n8n-gateway-login.sh
  bash -n scripts/maintenance/rollback-gateway-centralization.sh
  echo "✓ Scripts syntax OK"
  ```

---

## 🚀 Deployment Steps

### Step 1: Update Environment Variables

- [ ] **Add GATEWAY_PUBLIC_URL to .env**
  ```bash
  # Verify variable doesn't exist yet
  grep "GATEWAY_PUBLIC_URL" .env || echo "✓ Not present yet"

  # Add variable
  echo "" >> .env
  echo "# Gateway Centralization ($(date +%Y-%m-%d))" >> .env
  echo "GATEWAY_PUBLIC_URL=http://localhost:9082" >> .env

  # Verify addition
  grep "GATEWAY_PUBLIC_URL" .env
  ```

- [ ] **Validate .env completeness**
  ```bash
  bash scripts/env/validate-env.sh
  ```

### Step 2: Pull Latest Changes

- [ ] **Pull from main branch**
  ```bash
  git pull origin main
  ```

- [ ] **Verify expected files changed**
  ```bash
  git log --oneline -3
  git diff HEAD~1 --name-only
  ```

### Step 3: Restart Dashboard Stack

- [ ] **Stop dashboard stack**
  ```bash
  docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml down
  ```

- [ ] **Rebuild and start**
  ```bash
  docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d --build
  ```

- [ ] **Check container health**
  ```bash
  docker ps --filter "name=dashboard" --format "table {{.Names}}\t{{.Status}}"
  ```

- [ ] **Monitor logs for errors**
  ```bash
  docker logs dashboard-ui -f --tail 50
  # Press Ctrl+C after verifying no errors
  ```

### Step 4: Restart N8N Stack

- [ ] **Stop n8n stack gracefully**
  ```bash
  docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml down
  ```

- [ ] **Wait for clean shutdown**
  ```bash
  sleep 5
  ```

- [ ] **Start with new configuration**
  ```bash
  docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d --force-recreate
  ```

- [ ] **Check container health**
  ```bash
  docker ps --filter "name=n8n" --format "table {{.Names}}\t{{.Status}}"
  ```

- [ ] **Monitor startup logs**
  ```bash
  docker logs n8n -f --tail 50
  # Press Ctrl+C after seeing "Editor is now accessible via"
  ```

### Step 5: Run Automated Validation

- [ ] **Execute validation script**
  ```bash
  bash scripts/maintenance/validate-n8n-gateway-login.sh
  ```

- [ ] **Verify all tests pass**
  ```
  Expected output:
  ✓ Test 1: Gateway accessibility... PASS
  ✓ Test 2: N8N endpoint routing... PASS
  ✓ Test 3: Session cookie validation... PASS
  ✓ Test 4: CORS headers... PASS
  ✓ Test 5: WebSocket upgrade path... PASS
  ```

---

## ✅ Post-Deployment Verification

### Functional Testing

- [ ] **Test gateway root**
  ```bash
  curl -I http://localhost:9082/ | grep -E "HTTP|200"
  ```

- [ ] **Test n8n routing**
  ```bash
  curl -I http://localhost:9082/n8n/ | grep -E "HTTP|200|401"
  ```

- [ ] **Manual login test**
  - [ ] Open browser: http://localhost:9082/n8n/
  - [ ] Verify login page loads
  - [ ] Login with credentials
  - [ ] Verify dashboard accessible

- [ ] **Test webhook URL format**
  - [ ] Open n8n workflow
  - [ ] Check webhook URL matches: `http://localhost:9082/n8n/webhook/...`
  - [ ] Test webhook execution

### Performance Verification

- [ ] **Check response times**
  ```bash
  # Gateway
  time curl -s -o /dev/null http://localhost:9082/

  # N8N
  time curl -s -o /dev/null http://localhost:9082/n8n/
  ```

- [ ] **Monitor resource usage**
  ```bash
  docker stats --no-stream n8n dashboard-ui
  ```

### Session Persistence Test

- [ ] **Login to n8n**
- [ ] **Refresh page** - Should stay logged in
- [ ] **Close and reopen browser** - Should stay logged in
- [ ] **Clear cookies and retry** - Should prompt login

### Monitoring

- [ ] **Check Traefik dashboard**
  ```bash
  # Open browser: http://localhost:9083/dashboard/
  # Verify n8n routes visible
  ```

- [ ] **Review access logs**
  ```bash
  docker logs traefik -f --tail 20 | grep "n8n"
  ```

- [ ] **Check for errors**
  ```bash
  docker logs n8n --since 5m | grep -i error || echo "✓ No errors"
  docker logs dashboard-ui --since 5m | grep -i error || echo "✓ No errors"
  ```

---

## 🔄 Rollback Procedure (If Needed)

### Quick Rollback (< 5 minutes)

- [ ] **Execute rollback script**
  ```bash
  bash scripts/maintenance/rollback-gateway-centralization.sh
  ```

- [ ] **Follow interactive prompts**
- [ ] **Verify services restored**
- [ ] **Document rollback reason**

### Manual Rollback

- [ ] **Restore .env from backup**
  ```bash
  cp .env.backup.* .env
  ```

- [ ] **Restart services**
  ```bash
  docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d --force-recreate
  docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d --force-recreate
  ```

- [ ] **Verify functionality**
  ```bash
  curl -I http://localhost:9082/n8n/
  ```

---

## 📊 Success Criteria

### Must Pass

- ✅ All automated validation tests pass
- ✅ N8N login works via gateway
- ✅ Webhook URLs use correct format
- ✅ Session cookies persist correctly
- ✅ No errors in container logs

### Should Pass

- ✅ Response times < 500ms
- ✅ CPU usage < 50% under normal load
- ✅ Memory usage stable
- ✅ All containers healthy

### Nice to Have

- ✅ Zero downtime deployment
- ✅ Rollback not needed
- ✅ No user complaints

---

## 📝 Post-Deployment Tasks

### Documentation

- [ ] **Update deployment log**
  ```bash
  echo "$(date): Gateway centralization deployed successfully" >> docs/DEPLOYMENT-LOG.md
  ```

- [ ] **Create git tag**
  ```bash
  git tag -a v1.0.0-gateway-centralization -m "Gateway URL centralization"
  git push origin v1.0.0-gateway-centralization
  ```

- [ ] **Update README.md** (if needed)

### Communication

- [ ] **Notify stakeholders of success**
  - Deployment time: ___________
  - Downtime: ___________
  - Issues encountered: ___________
  - Status: ✅ SUCCESS / ⚠️ PARTIAL / ❌ ROLLBACK

- [ ] **Update status page** (if applicable)

- [ ] **Document lessons learned**

### Monitoring

- [ ] **Set up alert for validation failures**
- [ ] **Schedule first monitoring check** (24h post-deployment)
- [ ] **Add to weekly health check routine**

---

## 🚨 Emergency Contacts

**Primary**: DevOps Team
**Secondary**: Backend Team
**Escalation**: System Administrator

**Emergency Rollback Command**:
```bash
bash scripts/maintenance/rollback-gateway-centralization.sh
```

---

## 📅 Review Schedule

- **24h post-deployment**: Check logs, verify stability
- **1 week post-deployment**: Review metrics, user feedback
- **1 month post-deployment**: Document patterns, plan next iteration

---

## ✍️ Sign-off

**Deployment executed by**: _________________
**Date**: _________________
**Time**: _________________
**Result**: ☐ Success ☐ Partial ☐ Rollback

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

**Verified by**: _________________
**Date**: _________________

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Next Review**: 2025-12-14

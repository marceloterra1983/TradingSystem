# Rollback Procedure - Phase 6 Cutover

**Version**: 1.0  
**Date**: 2025-10-25  
**Owner**: DocsOps + DevOps  
**Objective**: Reverter cutover em caso de problemas críticos

## Rollback Triggers

Executar rollback imediatamente SE:

**Critical Triggers (Immediate Rollback)**:
- [ ] Docusaurus não inicia após cutover
- [ ] Mais de 10 links quebrados detectados
- [ ] CI/CD pipelines quebrados (builds falhando)
- [ ] Dashboard não consegue acessar documentação
- [ ] CORS errors impedindo integrações
- [ ] Perda de conteúdo ou corrupção de arquivos
- [ ] Mais de 50% dos usuários reportando problemas

**Warning Triggers (Monitor & Decide)**:
- [ ] Alguns links quebrados (<10)
- [ ] Performance degradada (>2s load time)
- [ ] Alguns usuários reportando problemas (<50%)
- [ ] Warnings em logs (não errors)

## Rollback Decision Matrix

| Severity | Impact | Users Affected | Downtime | Decision | Timeline |
|----------|--------|----------------|----------|----------|----------|
| P0 - Critical | System down | >50% | >30 min | ROLLBACK NOW | 0-15 min |
| P1 - High | Major features broken | 25-50% | 15-30 min | ROLLBACK | 15-30 min |
| P2 - Medium | Minor issues | 10-25% | <15 min | MONITOR | 1-4 hours |
| P3 - Low | Cosmetic issues | <10% | None | FIX FORWARD | 24-48 hours |

## Rollback Procedure - Immediate Actions (0-15 min)

### Step 1: Stop All Services

```bash
# 1. Stop all running services
bash scripts/core/stop-all.sh --force

# 2. Verify all services stopped
lsof -i :3103 -i :3205 -i :3200 -i :3302 -i :3400 -i :3500 -i :3600
# Expected: No output

# 3. Stop Docker stacks
docker compose -f tools/compose/docker-compose.docs.yml down

# 4. Verify no containers running
docker ps | grep tradingsystem
# Expected: No output
```

### Step 2: Revert Git Commits

```bash
# 1. Inspect recorded cutover commits (oldest → newest)
cutover_commit_file=.git/cutover-phase6-commits.txt
if [ ! -f "$cutover_commit_file" ]; then
  echo "Cutover commit cache not found at $cutover_commit_file"
  echo "Use git log to identify commits tagged 'Phase 6 cutover' along with the merge commit (cutover/docs-v2-to-docs-YYYYMMDD)."
  git log --oneline --max-count=15
  exit 1
fi
cat "$cutover_commit_file"

# 2. Revert all cutover commits in a single batch (newest → oldest)
python3 - <<'PY'
import pathlib
import subprocess

path = pathlib.Path(".git/cutover-phase6-commits.txt")
commits = path.read_text().splitlines()
if not commits:
    raise SystemExit(f"No commits recorded in {path}")
subprocess.run(["git", "revert", "--no-commit", *reversed(commits)], check=True)
PY

# 3. Fallback: if the cache is missing and manual identification is required
#    find the same commit list via git log (ensure the merge commit is included).
# git log --format='%H %s' --max-count=15 | grep 'Phase 6 cutover'
# git revert --no-commit <SHA_NEWEST> ... <SHA_OLDEST>

# 4. Verify Git status
git status
# Expected: Changes staged for commit, no unmerged paths

# 5. Verify docs/ exists again
ls -la | grep docs
# Expected: docs/ and docs/ both exist
```

### Step 3: Restore Legacy Backup

```bash
# 1. Locate backup
ls -lh "$HOME"/backups/docs-legacy-backup-*.tar.gz

# 2. Extract backup to temporary location
mkdir -p /tmp/docs-restore
tar -xzf "$HOME"/backups/docs-legacy-backup-$(date +%Y%m%d)-*.tar.gz -C /tmp/docs-restore

# 3. Verify backup contents
ls -la /tmp/docs-restore/.backup-docusaurus-*/docusaurus/

# 4. Remove current docs/ (if exists)
rm -rf docs/

# 5. Restore legacy docs/ from backup
rsync -av /tmp/docs-restore/.backup-docusaurus-*/docusaurus/ docs/

# 6. Verify restoration
ls -la docs/
# Expected: docusaurus/ subdirectory with package.json, src/, static/, etc.

# 7. Install dependencies
cd docs/docusaurus
npm install

# 8. Test legacy docs
npm run start -- --port 3004 &
LEGACY_PID=$!
sleep 10
curl -I http://localhost:3004
# Expected: HTTP/1.1 200 OK
kill $LEGACY_PID
```

### Step 4: Verify Rollback State

```bash
# 1. Verify directory structure
ls -la | grep docs
# Expected: docs/ (legacy) and docs/ (new) both exist

# 2. Verify Git history
git log --oneline -20
# Expected: Rollback commit visible (git revert --no-commit + git commit)

# 3. Verify no uncommitted changes
git status
# Expected: Clean working directory

# 4. Commit rollback if needed
if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "chore(docs): rollback Phase 6 cutover - restore legacy system

Rolled back Phase 6 cutover due to critical issues.

Actions taken:
- Reverted recorded cutover commits
- Restored legacy docs/ from backup
- docs/ remains available for future retry

Backup used: $HOME/backups/docs-legacy-backup-$(date +%Y%m%d).tar.gz

See: docs/migration/ROLLBACK-PROCEDURE.md
See: docs/migration/ROLLBACK-REPORT-$(date +%Y%m%d).md"
fi
```

**Checklist Immediate Actions**:
- [ ] All services stopped
- [ ] Git commits reverted (see .git/cutover-phase6-commits.txt)
- [ ] Legacy backup restored
- [ ] docs/ directory exists with legacy content
- [ ] docs/ directory exists with new content
- [ ] Legacy docs tested (port 3004)
- [ ] Rollback state verified
- [ ] Rollback committed to Git

## Rollback Procedure - Configuration Restoration (15-30 min)

### Step 5: Restore Configuration Files

Se revert automático não restaurou configs corretamente:

```bash
# 1. Verify package.json
grep "validate-docs" package.json
# Should point to: ./docs/context ./docs (legacy)
# If not, manually update

# 2. Verify services-manifest.json
jq '.services[] | select(.id == "docusaurus")' config/services-manifest.json
# Should have: "path": "docs/docusaurus", "port": 3004
# If not, manually update

# 3. Verify eslint.config.js
grep "docs" eslint.config.js
# Should ignore: 'docs/**'
# If not, manually update

# 4. Verify .env.example
grep "docs" .env.example
# Should reference: docs/context/ops/ENVIRONMENT-CONFIGURATION.md
# If not, manually update

# 5. Commit manual fixes if needed
if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "fix(config): manual config restoration after rollback"
fi
```

### Step 6: Restore CORS Configurations

```bash
# 1. Update apps/status/server.js
sed -i "s|'http://localhost:3101,http://localhost:3205'|'http://localhost:3101,http://localhost:3004'|g" apps/status/server.js
sed -i 's|defaultPort: 3205|defaultPort: 3004|g' apps/status/server.js

# 2. Update apps/tp-capital/src/server.js
sed -i "s|'http://localhost:3101,http://localhost:3205'|'http://localhost:3101,http://localhost:3004'|g" apps/tp-capital/src/server.js

# 3. Update backend/api/firecrawl-proxy/src/server.js
sed -i "s|'http://localhost:3103,http://localhost:3205'|'http://localhost:3103,http://localhost:3004'|g" backend/api/firecrawl-proxy/src/server.js

# 4. Update apps/b3-market-data/src/config.js
sed -i "s|'http://localhost:3103,http://localhost:3205'|'http://localhost:3103,http://localhost:3004'|g" apps/b3-market-data/src/config.js

# 5. Commit CORS restoration
git add apps/ backend/
git commit -m "fix(cors): restore legacy port 3004 after rollback"
```

### Step 7: Restore Scripts

```bash
# 1. Update scripts/core/start-all.sh
sed -i 's|docs:3205|docs/docusaurus:3004|g' scripts/core/start-all.sh

# 2. Update scripts/setup/install-dependencies.sh
sed -i 's|"docs"]="docs"|"docs"]="docs/docusaurus"|g' scripts/setup/install-dependencies.sh

# 3. Update scripts/docker/check-docs-services.sh
sed -i 's|Port 3205|Port 3004|g' scripts/docker/check-docs-services.sh
sed -i 's|:3205|:3004|g' scripts/docker/check-docs-services.sh
sed -i 's|cd docs|cd docs/docusaurus|g' scripts/docker/check-docs-services.sh

# 4. Commit script restoration
git add scripts/
git commit -m "fix(scripts): restore legacy paths and ports after rollback"
```

**Checklist Configuration Restoration**:
- [ ] package.json restored
- [ ] services-manifest.json restored
- [ ] eslint.config.js restored
- [ ] .env.example restored
- [ ] CORS configs restored (port 3004)
- [ ] Scripts restored (legacy paths)
- [ ] All manual fixes committed

## Rollback Procedure - Service Restart (30-45 min)

### Step 8: Rebuild & Restart Services

```bash
# 1. Rebuild frontend
cd frontend/dashboard
npm run build

# 2. Start legacy Docusaurus
cd ../../docs/docusaurus
npm run start -- --port 3004 --host 0.0.0.0 &
LEGACY_PID=$!
sleep 10

# 3. Verify legacy docs accessible
curl -I http://localhost:3004
# Expected: HTTP/1.1 200 OK

# 4. Start all other services
cd ../..
bash scripts/core/start-all.sh --skip-docs
sleep 30

# 5. Verify all services running
curl http://localhost:3103  # Dashboard
curl http://localhost:3004  # Legacy Docs
curl http://localhost:3400  # DocsAPI
curl http://localhost:3500/api/status  # Launcher
# Expected: All return 200 OK

# 6. Test CORS with legacy port
curl -H "Origin: http://localhost:3004" \
     -X OPTIONS \
     -I http://localhost:3500/api/status
# Expected: Access-Control-Allow-Origin: http://localhost:3004

# 7. Test dashboard integration
xdg-open http://localhost:3103
# Manually verify: Documentation links work
```

### Step 9: Validate Rollback Success

```bash
# 1. Run validation suite on legacy docs
cd docs/docusaurus
npm run build
# Expected: Build succeeds

# 2. Validate frontend
cd ../../frontend/dashboard
npm run test
# Expected: Tests pass

# 3. Validate lint
cd ../..
npm run lint
# Expected: No errors

# 4. Monitor logs for errors
grep -i error /tmp/tradingsystem-logs/*.log
# Expected: No critical errors

# 5. Monitor for 1 hour
watch -n 60 'curl -s http://localhost:3500/api/status | jq .overallHealth'
# Expected: "healthy" status maintained
```

**Checklist Service Restart**:
- [ ] Frontend rebuilt
- [ ] Legacy Docusaurus started (port 3004)
- [ ] All other services started
- [ ] All services accessible
- [ ] CORS working with port 3004
- [ ] Dashboard integration working
- [ ] Legacy docs build succeeds
- [ ] Frontend tests pass
- [ ] Lint passes
- [ ] No critical errors in logs
- [ ] System stable for 1 hour

## Post-Rollback Actions (45-60 min)

### Step 10: Document Rollback

Criar relatório de rollback:

```bash
cat > docs/migration/ROLLBACK-REPORT-$(date +%Y%m%d).md << 'EOF'
# Rollback Report - Phase 6 Cutover

**Date**: $(date +%Y-%m-%d %H:%M:%S)
**Executor**: DocsOps + DevOps
**Duration**: ___ minutes
**Status**: ✅ ROLLBACK COMPLETED

## Trigger

**Reason for Rollback**: ___________________

**Severity**: P0 / P1 / P2 / P3

**Impact**: ___________________

**Users Affected**: ___% (___/___)

## Actions Taken

**Immediate Actions (0-15 min)**:
- ✅ All services stopped
- ✅ Git commits reverted (per .git/cutover-phase6-commits.txt)
- ✅ Legacy backup restored
- ✅ Legacy docs tested

**Configuration Restoration (15-30 min)**:
- ✅ package.json restored
- ✅ services-manifest.json restored
- ✅ CORS configs restored
- ✅ Scripts restored

**Service Restart (30-45 min)**:
- ✅ Frontend rebuilt
- ✅ Legacy Docusaurus started (port 3004)
- ✅ All services restarted
- ✅ Integrations validated

## Validation Results

- Legacy docs accessible: ✅ http://localhost:3004
- Dashboard integration: ✅ Working
- CORS: ✅ Port 3004 allowed
- All services: ✅ Running
- Logs: ✅ No critical errors
- System stability: ✅ Stable for 1 hour

## Root Cause Analysis

**Issue**: ___________________

**Root Cause**: ___________________

**Contributing Factors**:
1. ___________________
2. ___________________
3. ___________________

**Why Not Detected Earlier**: ___________________

## Corrective Actions

**Immediate Fixes** (before retry):
1. ___________________
2. ___________________
3. ___________________

**Process Improvements**:
1. ___________________
2. ___________________
3. ___________________

**Additional Validation** (add to pre-cutover):
1. ___________________
2. ___________________
3. ___________________

## Timeline for Retry

**Target Date**: ___________________

**Prerequisites**:
- [ ] All corrective actions completed
- [ ] Additional validation added to checklist
- [ ] Dry-run in staging environment
- [ ] Stakeholder approval for retry

## Lessons Learned

1. ___________________
2. ___________________
3. ___________________

## Sign-off

- [ ] DocsOps Lead: _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Release Manager: _________________ Date: _______
EOF

# Commit rollback report
git add docs/migration/ROLLBACK-REPORT-$(date +%Y%m%d).md
git commit -m "docs(rollback): document Phase 6 cutover rollback"
```

### Step 11: Communicate Rollback

Notificar stakeholders:

```markdown
🚨 **Phase 6 Cutover Rollback**

**Status**: Rolled back to legacy documentation system

**Reason**: [Brief description of issue]

**Current State**:
- ✅ Legacy docs: http://localhost:3004 (ACTIVE)
- ⏸️ docs: http://localhost:3205 (preview only)
- ✅ All services: Running normally

**Impact**: Minimal - system restored to pre-cutover state

**Next Steps**:
1. Root cause analysis (24 hours)
2. Corrective actions (48 hours)
3. Retry cutover (TBD - after fixes validated)

**Questions**: Contact DocsOps team
```

### Step 12: Update Tracking Documents

```bash
# 1. Update REFERENCE-UPDATE-TRACKING.md
echo "## Rollback Event - $(date +%Y-%m-%d)" >> docs/migration/REFERENCE-UPDATE-TRACKING.md
echo "Cutover rolled back. All references reverted to pre-cutover state." >> docs/migration/REFERENCE-UPDATE-TRACKING.md

# 2. Update CUTOVER-PLAN.md
echo "## Rollback Event - $(date +%Y-%m-%d)" >> docs/governance/CUTOVER-PLAN.md
echo "See: docs/migration/ROLLBACK-REPORT-$(date +%Y%m%d).md" >> docs/governance/CUTOVER-PLAN.md

# 3. Commit tracking updates
git add docs/migration/ docs/governance/
git commit -m "docs(tracking): update tracking documents after rollback"
```

**Checklist Post-Rollback**:
- [ ] Rollback report created
- [ ] Stakeholders notified
- [ ] Tracking documents updated
- [ ] Root cause analysis scheduled
- [ ] Corrective actions identified
- [ ] Retry timeline proposed
- [ ] All commits pushed to remote

## Rollback Validation Checklist

Validar que rollback foi bem-sucedido:

- [ ] Legacy docs accessible at http://localhost:3004
- [ ] Dashboard renders documentation correctly
- [ ] Backend CORS accepts port 3004 origin
- [ ] All automation scripts execute successfully
- [ ] No critical errors in logs
- [ ] Frontend build succeeds
- [ ] Frontend tests pass
- [ ] Lint passes
- [ ] Type-check passes
- [ ] System stable for 1 hour
- [ ] Users confirm functionality restored
- [ ] Git history clean (revert commits visible)
- [ ] Backup preserved for audit

## Alternative Rollback: Git Reset (Nuclear Option)

Se git revert não funcionar:

```bash
# ⚠️ WARNING: This is destructive - use only if revert fails

# 1. Identify commit before cutover started
git log --oneline -20
# Find SHA of commit before "chore(docs): remove legacy docs/"

# 2. Reset to that commit (DESTRUCTIVE)
git reset --hard <SHA_BEFORE_CUTOVER>

# 3. Force push (if already pushed)
git push origin main --force

# 4. Restore legacy backup (same as Step 3 above)
# Follow steps in "Restore Legacy Backup" section

# 5. Document nuclear rollback
echo "⚠️ Nuclear rollback executed via git reset --hard" >> docs/migration/ROLLBACK-REPORT-$(date +%Y%m%d).md
```

**⚠️ Use Nuclear Option Only If**:
- Git revert creates conflicts
- Revert commits don't restore system correctly
- Time is critical and manual fixes would take too long
- Approved by Release Manager

## Rollback Testing Procedure

Após rollback, executar testes completos:

```bash
# 1. Start all services
bash scripts/core/start-all.sh
sleep 30

# 2. Test legacy docs
curl http://localhost:3004
xdg-open http://localhost:3004

# 3. Test dashboard
curl http://localhost:3103
xdg-open http://localhost:3103

# 4. Test documentation links in dashboard
# Manually click on "Docs" button
# Verify: Opens http://localhost:3004

# 5. Test CORS
curl -H "Origin: http://localhost:3004" \
     -X OPTIONS \
     -I http://localhost:3500/api/status
# Expected: Access-Control-Allow-Origin: http://localhost:3004

# 6. Run validation scripts
bash scripts/docs/validate-production-build.sh
# Expected: Validation passes

# 7. Monitor for 1 hour
watch -n 60 'curl -s http://localhost:3500/api/status | jq .overallHealth'
# Expected: "healthy" maintained
```

## Rollback Success Criteria

Rollback é considerado bem-sucedido quando:

- [ ] Legacy docs acessível em http://localhost:3004
- [ ] Dashboard integração funciona
- [ ] CORS permite port 3004
- [ ] Todos os scripts executam sem erros
- [ ] Nenhum erro crítico nos logs
- [ ] Frontend build e tests passam
- [ ] Sistema estável por 1 hora
- [ ] Usuários confirmam funcionalidade restaurada
- [ ] Git histórico preservado
- [ ] Documentação de rollback completa

## Sign-off

- [ ] Rollback Executor: _________________ Date: _______
- [ ] DocsOps Lead: _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Release Manager: _________________ Date: _______

**Rollback Status**: [ ] SUCCESSFUL / [ ] FAILED / [ ] PARTIAL

**Next Steps**: ___________________

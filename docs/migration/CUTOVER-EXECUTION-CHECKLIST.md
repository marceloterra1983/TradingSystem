# Cutover Execution Checklist - Phase 6 Final

**Execution Date**: 2025-11-15  
**Executor**: DocsOps + DevOps  
**Estimated Duration**: 2-3 horas  
**Maintenance Window**: 09:00 - 12:00

## Pre-Cutover Final Checks (T-1 hour)

Executar 1 hora antes do cutover:

```bash
# 1. Validate PRE-CUTOVER-VALIDATION-REPORT.md is approved
cat docs/migration/PRE-CUTOVER-VALIDATION-REPORT.md | grep "Approval to Proceed: YES"

# 2. Verify no services running
bash scripts/core/stop-all.sh --force
sleep 5
lsof -i :3103 -i :3205 -i :3200 -i :3302 -i :3400 -i :3500 -i :3600
# Expected: No output (all ports free)

# 3. Verify Git working directory clean
git status
# Expected: "nothing to commit, working tree clean"

# 4. Verify on main branch
git branch --show-current
# Expected: main

# 5. Pull latest changes
git pull origin main

# 6. Create cutover branch
git checkout -b cutover/docs-v2-to-docs-$(date +%Y%m%d)
```

**Checklist**:
- [ ] PRE-CUTOVER-VALIDATION-REPORT.md approved
- [ ] All services stopped
- [ ] All ports free
- [ ] Git working directory clean
- [ ] On main branch (or cutover branch created)
- [ ] Latest changes pulled
- [ ] Team notified of cutover start

## Phase 1: Backup Legacy System (T+0 to T+15 min)

Criar backup completo do sistema legado:

```bash
# 1. Execute backup script
bash scripts/docs/backup-docusaurus.sh --compress --destination /tmp/docs-legacy-backup-$(date +%Y%m%d-%H%M%S)

# Expected output:
# ✅ Source directory validated
# ✅ Backup directory created
# ✅ Files backed up successfully
# ✅ Manifest generated
# ✅ Checksums generated
# ✅ Restoration guide generated
# ✅ Backup verification completed
# ✅ Backup compressed

# 2. Verify backup created
ls -lh /tmp/docs-legacy-backup-*.tar.gz

# 3. Verify backup size (should be ~10-50MB)
du -sh /tmp/docs-legacy-backup-*.tar.gz

# 4. Copy backup to safe location
cp /tmp/docs-legacy-backup-*.tar.gz ~/backups/

# 5. Verify backup integrity
tar -tzf ~/backups/docs-legacy-backup-*.tar.gz | head -20

# 6. Document backup location
echo "Backup created: ~/backups/docs-legacy-backup-$(date +%Y%m%d-%H%M%S).tar.gz" >> docs/migration/CUTOVER-LOG.md
```

**Checklist**:
- [ ] Backup script executed successfully
- [ ] Backup file created (tar.gz)
- [ ] Backup size reasonable (10-50MB)
- [ ] Backup copied to safe location (~/backups/)
- [ ] Backup integrity verified (tar -tzf)
- [ ] Backup location documented
- [ ] Backup includes: package.json, docusaurus.config.ts, src/, static/, content/
- [ ] Backup excludes: node_modules, .docusaurus, build

**Rollback Point 1**: Se backup falhar, PARAR cutover e investigar

## Phase 2: Remove Legacy System (T+15 to T+20 min)

Remover pasta `docs/` legada:

```bash
# 1. Verify backup exists before removal
ls -lh ~/backups/docs-legacy-backup-*.tar.gz

# 2. Remove legacy docs/ directory using Git
git rm -rf docs/

# 3. Verify removal
ls -la | grep "^d" | grep docs
# Expected: Only docs/ should appear

# 4. Commit removal
git commit -m "chore(docs): remove legacy docs/ directory - Phase 6 cutover

Removed legacy Docusaurus v2 system (docs/) as part of Phase 6 cutover.
Backup created: ~/backups/docs-legacy-backup-$(date +%Y%m%d-%H%M%S).tar.gz

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md
Related: docs/governance/CUTOVER-PLAN.md"

# 5. Verify commit
git log -1 --stat
```

**Checklist**:
- [ ] Backup verified before removal
- [ ] docs/ directory removed via git rm
- [ ] Only docs/ remains
- [ ] Removal committed to Git
- [ ] Commit message follows Conventional Commits
- [ ] Commit includes backup location

**Rollback Point 2**: Se remoção falhar, restaurar de backup e abortar

## Phase 3: Rename docs to docs (T+20 to T+25 min)

Renomear `docs/` para `docs/`:

```bash
# 1. Rename using Git mv (preserves history)
git mv docs docs

# 2. Verify rename
ls -la | grep "^d" | grep docs
# Expected: Only docs/ should appear (no docs/)

# 3. Verify Git status
git status
# Expected: renamed: docs/ -> docs/

# 4. Commit rename
git commit -m "chore(docs): rename docs to docs - Phase 6 cutover

Renamed docs/ to docs/ as final step of Phase 6 cutover.
Docusaurus v3 is now the primary documentation system.

Port remains 3205 to avoid conflicts during transition.

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md
Related: docs/governance/CUTOVER-PLAN.md"

# 5. Verify commit
git log -1 --stat | head -20
```

**Checklist**:
- [ ] Rename executed via git mv
- [ ] docs/ directory exists
- [ ] docs/ directory does not exist
- [ ] Git shows rename (not delete + add)
- [ ] Rename committed to Git
- [ ] Commit message clear and descriptive

**Rollback Point 3**: Se rename falhar, reverter commit e restaurar docs/

## Phase 4: Update References docs → docs (T+25 to T+90 min)

Atualizar todas as referências de `docs` para `docs` no código:

### 6.1 Configuration Files (P0 - 15 min)

```bash
# 1. Update package.json
sed -i 's|docs/content|docs/content|g' package.json
git diff package.json
# Verify: validate-docs script updated

# 2. Update eslint.config.js
sed -i "s|'docs/\\*\\*'|'docs/**'|g" eslint.config.js
git diff eslint.config.js
# Verify: ignore pattern updated

# 3. Update services-manifest.json
sed -i 's|"docs"|"docs"|g' config/services-manifest.json
jq '.services[] | select(.id == "docusaurus")' config/services-manifest.json
# Verify: path is "docs", port is 3205

# 4. Update pyrightconfig.json
sed -i 's|"\*\*/docs"|"**/docs"|g' pyrightconfig.json
git diff pyrightconfig.json
# Verify: exclusion updated

# 5. Update .env.example
sed -i 's|docs/governance|docs/governance|g' .env.example
git diff .env.example
# Verify: documentation reference updated

# 6. Commit configuration updates
git add package.json eslint.config.js config/services-manifest.json pyrightconfig.json .env.example
git commit -m "chore(config): update docs references to docs - Phase 6 cutover

Updated all configuration files to reference docs/ instead of docs/.
Port 3205 remains unchanged.

Files updated:
- package.json (validate-docs script)
- eslint.config.js (ignore pattern)
- config/services-manifest.json (docusaurus service path)
- pyrightconfig.json (exclusions)
- .env.example (documentation references)

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md"
```

### 6.2 Automation Scripts (P1 - 20 min)

```bash
# 1. Update scripts/setup/install-dependencies.sh
sed -i 's|"docs"|"docs"|g' scripts/setup/install-dependencies.sh

# 2. Update scripts/core/start-all.sh
sed -i 's|docs:3205|docs:3205|g' scripts/core/start-all.sh

# 3. Update scripts/docker/check-docs-services.sh
sed -i 's|docs|docs|g' scripts/docker/check-docs-services.sh

# 4. Update scripts/docs/backup-docusaurus.sh
sed -i 's|docs|docs|g' scripts/docs/backup-docusaurus.sh

# 5. Update scripts/docs/validate-production-build.sh
sed -i 's|docs|docs|g' scripts/docs/validate-production-build.sh

# 6. Update scripts/docs/troubleshoot-health-dashboard.sh
sed -i 's|docs|docs|g' scripts/docs/troubleshoot-health-dashboard.sh

# 7. Update scripts/docs/run-all-health-tests-v2.sh
sed -i 's|docs|docs|g' scripts/docs/run-all-health-tests-v2.sh

# 8. Update scripts/docs/validate-docusaurus-integrity.sh
sed -i 's|docs|docs|g' scripts/docs/validate-docusaurus-integrity.sh

# 9. Update scripts/docusaurus/common.sh
sed -i 's|docs|docs|g' scripts/docusaurus/common.sh

# 10. Update scripts/docusaurus/README.md
sed -i 's|docs|docs|g' scripts/docusaurus/README.md

# 11. Update scripts/docusaurus/docs-auto.mjs
sed -i "s|'docs'|'docs'|g" scripts/docusaurus/docs-auto.mjs

# 12. Update scripts/start-dashboard-with-docs.sh
sed -i 's|docs|docs|g' scripts/start-dashboard-with-docs.sh

# 13. Update scripts/check-apis.sh
sed -i 's|docs|docs|g' scripts/check-apis.sh

# 14. Update tools/openspec/openspec_jobs.yaml
sed -i 's|docs|docs|g' tools/openspec/openspec_jobs.yaml

# 15. Verify all updates
grep -r "docs" scripts/ tools/openspec/ --exclude-dir=node_modules
# Expected: No matches in active scripts (only in comments/docs)

# 16. Commit script updates
git add scripts/ tools/openspec/
git commit -m "chore(scripts): update docs references to docs - Phase 6 cutover

Updated all automation scripts to reference docs/ instead of docs/.

Scripts updated:
- scripts/setup/install-dependencies.sh
- scripts/core/start-all.sh
- scripts/docker/check-docs-services.sh
- scripts/docs/*.sh (5 files)
- scripts/docusaurus/*.{sh,mjs,md} (3 files)
- scripts/start-dashboard-with-docs.sh
- scripts/check-apis.sh
- tools/openspec/openspec_jobs.yaml

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md"
```

### 6.3 Source Code (P1 - 15 min)

```bash
# 1. Update frontend/dashboard/src/config/api.ts (comments only)
sed -i 's|// docs|// docs|g' frontend/dashboard/src/config/api.ts
sed -i 's|(was 3004 for legacy)|(Docusaurus v3)|g' frontend/dashboard/src/config/api.ts

# 2. Update frontend/dashboard/src/components/pages/URLsPage.tsx
sed -i "s|Documentation Hub (docs)|Documentation Hub|g" frontend/dashboard/src/components/pages/URLsPage.tsx

# 3. Update frontend/dashboard/src/components/pages/PRDsPage.tsx (comments)
sed -i 's|- docs:|- docs:|g' frontend/dashboard/src/components/pages/PRDsPage.tsx

# 4. Update frontend/dashboard/src/components/pages/APIViewerPage.tsx (comments)
sed -i 's|// Use Redocusaurus from docs|// Use Redocusaurus from docs|g' frontend/dashboard/src/components/pages/APIViewerPage.tsx

# 5. Update frontend/dashboard/vite.config.ts (comments if any)
grep -n "docs" frontend/dashboard/vite.config.ts
# If matches found, update comments

# 6. Update backend/README.md (comments)
sed -i 's|# docs|# docs|g' backend/README.md

# 7. Update frontend/dashboard/CHANGELOG-DOCSAPI.md
sed -i 's|docs|docs|g' frontend/dashboard/CHANGELOG-DOCSAPI.md

# 8. Update frontend/dashboard/API-VIEWER-GUIDE.md
sed -i 's|docs/static/specs|docs/static/specs|g' frontend/dashboard/API-VIEWER-GUIDE.md

# 9. Verify no docs in active source code
grep -r "docs" frontend/dashboard/src/ backend/api/ apps/ --include="*.ts" --include="*.tsx" --include="*.js"
# Expected: No matches (or only in comments)

# 10. Commit source code updates
git add frontend/ backend/ apps/
git commit -m "chore(source): update docs references to docs - Phase 6 cutover

Updated source code comments and documentation references.

Files updated:
- frontend/dashboard/src/config/api.ts (comments)
- frontend/dashboard/src/components/pages/*.tsx (comments)
- backend/README.md (comments)
- frontend/dashboard/CHANGELOG-DOCSAPI.md
- frontend/dashboard/API-VIEWER-GUIDE.md

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md"
```

### 6.4 Documentation Files (P2 - 20 min)

```bash
# 1. Update README.md
sed -i 's|docs|docs|g' README.md
sed -i 's|(docs)||g' README.md  # Remove (docs) annotations
git diff README.md

# 2. Update AGENTS.md
sed -i 's|`docs/`|`docs/content/`|g' AGENTS.md
sed -i 's|in `docs/`|in `docs/content/`|g' AGENTS.md
git diff AGENTS.md

# 3. Update CLAUDE.md
sed -i 's|docs/context|docs/content|g' CLAUDE.md
sed -i 's|docs/docusaurus|docs|g' CLAUDE.md
sed -i 's|Port 3004|Port 3205|g' CLAUDE.md
sed -i 's|port 3004|port 3205|g' CLAUDE.md
sed -i 's|:3004|:3205|g' CLAUDE.md
git diff CLAUDE.md

# 4. Update QUICK-START.md
sed -i 's|docs|docs|g' QUICK-START.md

# 5. Update API-INTEGRATION-STATUS.md
sed -i 's|docs/docusaurus.config.js|docs/docusaurus.config.js|g' API-INTEGRATION-STATUS.md

# 6. Update TP-CAPITAL-SERVICE-GUIDE.md
# (No changes needed - already references port 3205)

# 7. Update START-APIS.md
# (No changes needed - already references port 3205)

# 8. Commit documentation updates
git add README.md AGENTS.md CLAUDE.md QUICK-START.md API-INTEGRATION-STATUS.md
git commit -m "docs: update docs references to docs - Phase 6 cutover

Updated all root documentation to reference docs/ instead of docs/.

Files updated:
- README.md (all docs references)
- AGENTS.md (docs/ → docs/content/)
- CLAUDE.md (docs/context → docs/content, port 3004 → 3205)
- QUICK-START.md
- API-INTEGRATION-STATUS.md

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md"
```

### 6.5 CI/CD Workflows (P0 - 10 min)

```bash
# 1. Update .github/workflows/docs-deploy.yml
sed -i "s|'docs/\\*\\*'|'docs/**'|g" .github/workflows/docs-deploy.yml
sed -i 's|docs|docs|g' .github/workflows/docs-deploy.yml
sed -i 's|working-directory: docs/docusaurus|working-directory: docs|g' .github/workflows/docs-deploy.yml
sed -i 's|cache-dependency-path: docs/docusaurus/package-lock.json|cache-dependency-path: docs/package-lock.json|g' .github/workflows/docs-deploy.yml
sed -i 's|path: docs/docusaurus/build|path: docs/build|g' .github/workflows/docs-deploy.yml

# 2. Remove legacy build job (lines 90-123)
# Manually edit to remove build-legacy job section
# Or use sed to delete lines (careful with line numbers)

# 3. Update .github/workflows/docs-link-validation.yml
sed -i "s|'docs/\\*\\*'|'docs/**'|g" .github/workflows/docs-link-validation.yml
sed -i 's|docs|docs|g' .github/workflows/docs-link-validation.yml
sed -i 's|./docs/context ./docs|./docs/content|g' .github/workflows/docs-link-validation.yml

# 4. Verify workflow syntax
grep -n "docs" .github/workflows/*.yml
# Expected: No matches (or only in comments)

# 5. Commit workflow updates
git add .github/workflows/
git commit -m "ci: update docs references to docs - Phase 6 cutover

Updated CI/CD workflows to reference docs/ instead of docs/.

Workflows updated:
- docs-deploy.yml (paths, working-directory, cache paths)
- docs-link-validation.yml (paths, docs directories)

Removed legacy build-legacy job from docs-deploy.yml.

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md"
```

### 6.6 Docker & Infrastructure (P1 - 10 min)

```bash
# 1. Update tools/compose/docker-compose.docs.yml
sed -i 's|docs/static/specs|docs/static/specs|g' tools/compose/docker-compose.docs.yml
git diff tools/compose/docker-compose.docs.yml

# 2. Verify volume mount
grep "docs/static/specs" tools/compose/docker-compose.docs.yml
# Expected: - ../../docs/static/specs:/usr/share/nginx/html:ro

# 3. Commit Docker updates
git add tools/compose/
git commit -m "chore(docker): update docs references to docs - Phase 6 cutover

Updated Docker Compose volume mounts to reference docs/static/specs.

Files updated:
- tools/compose/docker-compose.docs.yml

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md"
```

### 6.7 Internal Documentation (P2 - 10 min)

Atualizar documentação interna dentro de `docs/` (antigo docs/):

```bash
# 1. Update docs/README.md
sed -i 's|docs|docs|g' docs/README.md
sed -i 's|../scripts/docusaurus|scripts/docusaurus|g' docs/README.md

# 2. Update docs/governance/*.md
find docs/governance -name "*.md" -exec sed -i 's|docs|docs|g' {} \;

# 3. Update docs/migration/*.md
find docs/migration -name "*.md" -exec sed -i 's|docs|docs|g' {} \;

# 4. Update docs/docusaurus.config.js
sed -i "s|'https://github.com/TradingSystem/TradingSystem/tree/main/docs/'|'https://github.com/TradingSystem/TradingSystem/tree/main/docs/'|g" docs/docusaurus.config.js

# 5. Update docs/scripts/*.sh (if any)
if [ -d docs/scripts ]; then
  find docs/scripts -name "*.sh" -exec sed -i 's|docs|docs|g' {} \;
fi

# 6. Commit internal docs updates
git add docs/
git commit -m "docs: update internal docs self-references - Phase 6 cutover

Updated internal documentation to reference docs/ instead of docs/.

Files updated:
- docs/README.md
- docs/governance/*.md (all files)
- docs/migration/*.md (all files)
- docs/docusaurus.config.js (editUrl)
- docs/scripts/*.sh (if any)

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md"
```

**Checklist Phase 4**:
- [ ] Configuration files updated (5 files)
- [ ] Automation scripts updated (14 files)
- [ ] Source code updated (8 files)
- [ ] Documentation files updated (60+ files)
- [ ] CI/CD workflows updated (2 files)
- [ ] Docker configs updated (1 file)
- [ ] Internal docs updated (docs/governance/, docs/migration/)
- [ ] All commits created with clear messages
- [ ] No docs references remain in active code

**Rollback Point 4**: Se updates falharem, reverter commits e investigar

## Phase 5: Validation & Testing (T+90 to T+120 min)

Validar que todas as mudanças funcionam:

```bash
# 1. Validate no docs references remain (except in archived content)
grep -r "docs" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir="docs/content" \
  --exclude="*.log" \
  --exclude="reference-inventory.json"
# Expected: No matches (exit code 1)

# 2. Validate docs/ directory structure
ls -la docs/
# Expected: package.json, docusaurus.config.js, src/, static/, content/, governance/, migration/

# 3. Run technical references validation
bash docs/scripts/validate-technical-references.sh --verbose
# Expected: PASSED (may need to update script path first)

# 4. Install dependencies
cd docs
npm install

# 5. Run docs validation suite
npm run docs:check
# Expected: All validations pass

# 6. Run link validation
npm run docs:links
# Expected: 0 broken links

# 7. Test development server
npm run docs:dev &
DOCS_PID=$!
sleep 10
curl -I http://localhost:3205
# Expected: HTTP/1.1 200 OK
kill $DOCS_PID

# 8. Validate frontend build
cd ../frontend/dashboard
npm run build
# Expected: Build succeeds

# 9. Run frontend tests
npm run test
# Expected: All tests pass

# 10. Validate lint
cd ../..
npm run lint
# Expected: No errors

# 11. Validate type-check
npm run type-check
# Expected: No errors

# 12. Start all services
bash scripts/core/start-all.sh
sleep 30

# 13. Verify all services running
curl http://localhost:3103  # Dashboard
curl http://localhost:3205  # Docs
curl http://localhost:3400  # DocsAPI
curl http://localhost:3500/api/status  # Launcher
# Expected: All return 200 OK

# 14. Test CORS integration
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3500/api/status
# Expected: Access-Control-Allow-Origin: http://localhost:3205

# 15. Test Docker stack
docker compose -f tools/compose/docker-compose.docs.yml up -d
sleep 10
curl http://localhost:3101/
# Expected: Specs served correctly
docker compose -f tools/compose/docker-compose.docs.yml down

# 16. Stop all services
bash scripts/core/stop-all.sh
```

**Checklist Phase 5**:
- [ ] No docs references in active code
- [ ] docs/ directory structure correct
- [ ] Technical references validation passes
- [ ] Dependencies installed successfully
- [ ] docs:check passes
- [ ] docs:links passes (0 broken links)
- [ ] Development server starts on port 3205
- [ ] Frontend build succeeds
- [ ] Frontend tests pass
- [ ] Lint passes
- [ ] Type-check passes
- [ ] All services start successfully
- [ ] CORS integration works
- [ ] Docker stack works

**Rollback Point 5**: Se validação falhar, reverter todos os commits e restaurar backup

## Phase 6: Finalization (T+120 to T+150 min)

Finalizar cutover e criar tag de release:

```bash
# 1. Merge cutover branch to main
git checkout main
git merge cutover/docs-v2-to-docs-$(date +%Y%m%d) --no-ff

# 2. Create release tag
git tag -a docs-v3-cutover-v1.0.0 -m "docs: Phase 6 cutover complete - docs → docs

Completed final cutover of documentation system:
- Removed legacy docs/ (Docusaurus v2)
- Renamed docs/ → docs/ (Docusaurus v3)
- Updated 100+ references across codebase
- Port 3205 maintained for stability

Backup: ~/backups/docs-legacy-backup-$(date +%Y%m%d).tar.gz

See: docs/migration/CUTOVER-EXECUTION-CHECKLIST.md
See: docs/governance/CUTOVER-PLAN.md"

# 3. Push to remote
git push origin main
git push origin docs-v3-cutover-v1.0.0

# 4. Create cutover completion report
cat > docs/migration/CUTOVER-COMPLETION-REPORT.md << 'EOF'
# Cutover Completion Report

**Date**: $(date +%Y-%m-%d)
**Executor**: DocsOps + DevOps
**Duration**: ___ hours
**Status**: ✅ COMPLETED

## Summary

Successfully completed Phase 6 cutover:
- ✅ Legacy docs/ removed
- ✅ docs/ renamed to docs/
- ✅ 100+ references updated
- ✅ All validations passed
- ✅ All services tested

## Backup Information

- Location: ~/backups/docs-legacy-backup-$(date +%Y%m%d).tar.gz
- Size: ___ MB
- Checksum: ___ (md5sum)
- Retention: 90 days

## Commits

- Commit 1: Remove legacy docs/ - SHA: ___
- Commit 2: Rename docs/ → docs/ - SHA: ___
- Commit 3: Update configs - SHA: ___
- Commit 4: Update scripts - SHA: ___
- Commit 5: Update source code - SHA: ___
- Commit 6: Update documentation - SHA: ___
- Commit 7: Update CI/CD - SHA: ___
- Commit 8: Update Docker - SHA: ___
- Tag: docs-v3-cutover-v1.0.0 - SHA: ___

## Validation Results

- Technical references: ✅ PASSED
- docs:check: ✅ PASSED
- docs:links: ✅ PASSED (0 broken links)
- Frontend build: ✅ PASSED
- Frontend tests: ✅ PASSED
- Lint: ✅ PASSED
- Type-check: ✅ PASSED
- Service startup: ✅ PASSED
- CORS integration: ✅ PASSED
- Docker stack: ✅ PASSED

## Next Steps

- [ ] Monitor services for 24 hours
- [ ] Collect user feedback
- [ ] Address any issues (P0 within 4 hours)
- [ ] Update REFERENCE-UPDATE-TRACKING.md to 100%
- [ ] Send completion announcement
- [ ] Archive backup after 90 days
EOF

# 5. Start services for production
bash scripts/core/start-all.sh

# 6. Verify production readiness
curl http://localhost:3205
curl http://localhost:3103
```

**Checklist Phase 6**:
- [ ] Cutover branch merged to main
- [ ] Release tag created (docs-v3-cutover-v1.0.0)
- [ ] Changes pushed to remote
- [ ] Completion report created
- [ ] Services started successfully
- [ ] Production readiness verified
- [ ] Team notified of completion

## Post-Cutover Monitoring (T+150 min onwards)

Monitorar sistema após cutover:

```bash
# 1. Monitor logs
tail -f /tmp/tradingsystem-logs/docusaurus.log
tail -f /tmp/tradingsystem-logs/dashboard.log

# 2. Monitor service health
watch -n 30 'curl -s http://localhost:3500/api/status | jq .overallHealth'

# 3. Check for errors
grep -i error /tmp/tradingsystem-logs/*.log

# 4. Monitor user feedback
# Check #docs-feedback channel

# 5. Address issues immediately
# P0 issues: Fix within 4 hours
# P1 issues: Fix within 24 hours
```

**Monitoring Checklist**:
- [ ] No errors in logs (first 1 hour)
- [ ] All services healthy
- [ ] No user-reported issues (first 4 hours)
- [ ] Dashboard integration working
- [ ] Documentation accessible
- [ ] Search functionality working
- [ ] API documentation working

## Rollback Trigger Conditions

Executar rollback SE:
- Critical bugs detectados nas primeiras 4 horas
- Mais de 50% dos usuários reportando problemas
- Serviços críticos indisponíveis por mais de 30 minutos
- Perda de dados ou corrupção de conteúdo
- CI/CD pipelines quebrados

## Success Criteria

Cutover é considerado bem-sucedido quando:
- [ ] docs/ acessível em http://localhost:3205
- [ ] Todas as páginas carregam sem erros
- [ ] Busca funciona corretamente
- [ ] Navegação e breadcrumbs funcionais
- [ ] 0 links quebrados
- [ ] Dashboard integração funciona
- [ ] CI/CD workflows validam docs/
- [ ] Nenhum bug crítico nas primeiras 4 horas
- [ ] Feedback positivo dos usuários (>80%)
- [ ] Todos os serviços iniciam corretamente

## Completion Sign-off

- [ ] DocsOps Lead: _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Release Manager: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______

**Status**: [ ] COMPLETED / [ ] ROLLED BACK / [ ] IN PROGRESS

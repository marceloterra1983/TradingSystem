# Post-Cutover Validation Guide

**Date**: 2025-11-15  
**Validator**: DocsOps + DevOps + QA  
**Objective**: Validar que cutover foi bem-sucedido  
**Duration**: 1-2 horas

## Immediate Validation (T+0 to T+15 min)

Validações imediatas após cutover:

### 2.1 Directory Structure

```bash
# 1. Verify docs/ exists
ls -la docs/
# Expected: package.json, docusaurus.config.js, src/, static/, content/, governance/, migration/

# 2. Verify docs/ does not exist
ls -la | grep docs
# Expected: No output (directory removed)

# 3. Verify Git status
git status
# Expected: Clean working directory (all changes committed)

# 4. Verify Git log
git log --oneline -10
# Expected: Cutover commits visible
```

**Checklist**:
- [ ] docs/ directory exists with correct structure
- [ ] docs/ directory does not exist
- [ ] Git working directory clean
- [ ] Cutover commits in Git log

### 2.2 Reference Updates

```bash
# 1. Verify no docs references in active code
grep -r "docs" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir="docs/content" \
  --exclude="*.log" \
  --exclude="reference-inventory.json"
# Expected: No matches (exit code 1)

# 2. Verify docs/ references present
grep -r '"docs"' config/services-manifest.json package.json
# Expected: Multiple matches

# 3. Verify port 3205 still used
grep -r "3205" config/services-manifest.json apps/status/server.js
# Expected: Multiple matches

# 4. Verify package.json
grep "validate-docs" package.json
# Expected: "validate-docs": "python3 scripts/docs/validate-frontmatter.py --docs-dir ./docs/content"

# 5. Verify services-manifest.json
jq '.services[] | select(.id == "docusaurus")' config/services-manifest.json
# Expected: {"id": "docusaurus", "path": "docs", "port": 3205, ...}
```

**Checklist**:
- [ ] No docs references in active code
- [ ] docs/ references present in configs
- [ ] Port 3205 maintained
- [ ] package.json updated correctly
- [ ] services-manifest.json updated correctly

## Build & Test Validation (T+15 to T+45 min)

### 3.1 Documentation Build

```bash
# 1. Install dependencies
cd docs
npm install

# 2. Run docs:auto
npm run docs:auto
# Expected: Content generated successfully

# 3. Run docs:check
npm run docs:check
# Expected: All validations pass

# 4. Run docs:links
npm run docs:links
# Expected: 0 broken links

# 5. Run docs:build
npm run docs:build
# Expected: Build succeeds, 135+ pages generated

# 6. Verify build output
ls -la build/
# Expected: index.html, assets/, apps/, api/, etc.
```

**Checklist**:
- [ ] Dependencies installed
- [ ] docs:auto succeeds
- [ ] docs:check passes
- [ ] docs:links passes (0 broken)
- [ ] docs:build succeeds
- [ ] Build output correct (135+ pages)

### 3.2 Frontend Build & Tests

```bash
# 1. Build frontend
cd ../frontend/dashboard
npm run build
# Expected: Build succeeds

# 2. Run tests
npm run test
# Expected: All tests pass

# 3. Run lint
cd ../..
npm run lint
# Expected: No errors

# 4. Run type-check
npm run type-check
# Expected: No errors
```

**Checklist**:
- [ ] Frontend build succeeds
- [ ] All tests pass
- [ ] Lint passes
- [ ] Type-check passes

## Service Startup Validation (T+45 to T+60 min)

### 4.1 Start All Services

```bash
# 1. Start all services
bash scripts/core/start-all.sh
sleep 30

# 2. Verify Docusaurus running
curl -I http://localhost:3205
# Expected: HTTP/1.1 200 OK

# 3. Verify Dashboard running
curl -I http://localhost:3103
# Expected: HTTP/1.1 200 OK

# 4. Verify all backend services
curl http://localhost:3200/health  # Workspace
curl http://localhost:3302/health  # B3
curl http://localhost:3400/health  # DocsAPI
curl http://localhost:3500/api/status  # Launcher
curl http://localhost:3600/health  # Firecrawl
# Expected: All return 200 OK

# 5. Verify service launcher status
curl http://localhost:3500/api/status | jq '.services[] | {id, status, port}'
# Expected: All services "running", correct ports

# 6. Verify Docusaurus in launcher
curl http://localhost:3500/api/status | jq '.services[] | select(.id=="docusaurus")'
# Expected: {"id": "docusaurus", "status": "running", "port": 3205, ...}
```

**Checklist**:
- [ ] All services started via start-all.sh
- [ ] Docusaurus accessible (port 3205)
- [ ] Dashboard accessible (port 3103)
- [ ] All backend services healthy
- [ ] Service launcher shows all services running
- [ ] Docusaurus registered in launcher (port 3205)

### 4.2 CORS Integration

```bash
# 1. Test Dashboard → Status API
curl -H "Origin: http://localhost:3103" \
     -X OPTIONS \
     -I http://localhost:3500/api/status
# Expected: Access-Control-Allow-Origin: http://localhost:3103

# 2. Test Docs → Status API
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3500/api/status
# Expected: Access-Control-Allow-Origin: http://localhost:3205

# 3. Test Docs → TP Capital
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3200/health
# Expected: Access-Control-Allow-Origin: http://localhost:3205

# 4. Test Docs → B3
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3302/health
# Expected: Access-Control-Allow-Origin: http://localhost:3205

# 5. Test Docs → Firecrawl
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3600/health
# Expected: Access-Control-Allow-Origin: http://localhost:3205
```

**Checklist**:
- [ ] Dashboard → APIs CORS works
- [ ] Docs → Status API CORS works
- [ ] Docs → TP Capital CORS works
- [ ] Docs → B3 CORS works
- [ ] Docs → Firecrawl CORS works

## Docker Stack Validation (T+60 to T+75 min)

```bash
# 1. Start Docker docs stack
docker compose -f tools/compose/docker-compose.docs.yml up -d
sleep 10

# 2. Verify containers running
docker compose -f tools/compose/docker-compose.docs.yml ps
# Expected: docs-api-viewer running

# 3. Verify volume mount
docker compose -f tools/compose/docker-compose.docs.yml exec docs-api-viewer ls -la /usr/share/nginx/html
# Expected: Spec files listed

# 4. Test specs viewer
curl http://localhost:3101/
# Expected: HTML with spec links

# 5. Verify specs accessible
curl http://localhost:3101/ | grep -o 'href="[^"]*"' | head -5
# Expected: Links to .yaml files

# 6. Stop Docker stack
docker compose -f tools/compose/docker-compose.docs.yml down
```

**Checklist**:
- [ ] Docker stack starts successfully
- [ ] Containers running
- [ ] Volume mount correct (docs/static/specs)
- [ ] Specs viewer accessible (port 3101)
- [ ] Spec files served correctly

## Integration Testing (T+75 to T+105 min)

### 6.1 Dashboard Integration

```bash
# 1. Open dashboard in browser
xdg-open http://localhost:3103

# Manual tests:
# 2. Navigate to Knowledge → Docs
# 3. Verify documentation loads
# 4. Click on various doc links
# 5. Verify no CORS errors in console (F12)
# 6. Test search functionality
# 7. Test API documentation pages
# 8. Verify "Try it out" features work
```

**Checklist**:
- [ ] Dashboard loads successfully
- [ ] Documentation section accessible
- [ ] Doc links work correctly
- [ ] No CORS errors in console
- [ ] Search works
- [ ] API docs load
- [ ] Interactive features work

### 6.2 Documentation Hub Testing

```bash
# 1. Open docs in browser
xdg-open http://localhost:3205

# Manual tests:
# 2. Test homepage loads
# 3. Navigate through sidebar categories
# 4. Test search (Ctrl+K)
# 5. Test breadcrumbs
# 6. Test mobile navigation
# 7. Test theme switching (dark/light)
# 8. Test PlantUML diagrams render
# 9. Test Mermaid diagrams render
# 10. Test API documentation (Redocusaurus)
# 11. Test code syntax highlighting
# 12. Test internal links
```

**Checklist**:
- [ ] Homepage loads
- [ ] Sidebar navigation works
- [ ] Search works (Ctrl+K)
- [ ] Breadcrumbs work
- [ ] Mobile navigation works
- [ ] Theme switching works
- [ ] PlantUML diagrams render
- [ ] Mermaid diagrams render
- [ ] API docs work (Redocusaurus)
- [ ] Code highlighting works
- [ ] Internal links work

## CI/CD Validation (T+105 to T+120 min)

### 7.1 Trigger CI/CD Workflows

```bash
# 1. Push cutover commits (if not already pushed)
git push origin main

# 2. Monitor GitHub Actions
# Open: https://github.com/marceloterra/TradingSystem/actions

# 3. Wait for workflows to complete
# - docs-deploy.yml
# - docs-link-validation.yml
# - code-quality.yml

# 4. Verify all workflows pass
# Expected: All green checkmarks

# 5. Check workflow logs for errors
# Review any failures or warnings
```

**Checklist**:
- [ ] Commits pushed to remote
- [ ] docs-deploy.yml triggered
- [ ] docs-link-validation.yml triggered
- [ ] code-quality.yml triggered
- [ ] All workflows pass
- [ ] No errors in workflow logs
- [ ] GitHub Pages deployed (if applicable)

## Final Validation Summary

Criar resumo de validação:

```bash
cat > docs/migration/POST-CUTOVER-VALIDATION-SUMMARY.md << 'EOF'
# Post-Cutover Validation Summary

**Date**: $(date +%Y-%m-%d %H:%M:%S)
**Validator**: DocsOps + DevOps + QA
**Status**: ✅ PASSED / ⚠️ PASSED WITH WARNINGS / ❌ FAILED

## Validation Results

| Category | Status | Issues | Notes |
|----------|--------|--------|-------|
| Directory Structure | ✅ | 0 | docs/ exists, docs/ removed |
| Reference Updates | ✅ | 0 | No docs in active code |
| Documentation Build | ✅ | 0 | 135+ pages generated |
| Frontend Build | ✅ | 0 | Build succeeds |
| Frontend Tests | ✅ | 0 | All tests pass |
| Lint | ✅ | 0 | No errors |
| Type Check | ✅ | 0 | No errors |
| Service Startup | ✅ | 0 | All services running |
| CORS Integration | ✅ | 0 | All origins allowed |
| Docker Stack | ✅ | 0 | Specs served correctly |
| Dashboard Integration | ✅ | 0 | Docs accessible |
| Documentation Hub | ✅ | 0 | All features working |
| CI/CD Workflows | ✅ | 0 | All workflows pass |

**Overall Status**: ✅ **CUTOVER SUCCESSFUL**

## Metrics

- Total files updated: 100+
- Total commits: 9
- Total validation time: ___ minutes
- Downtime: 0 minutes (zero-downtime cutover)
- Broken links: 0
- Failed tests: 0
- Critical errors: 0

## Issues Found

**Critical (P0)**: 0
**High (P1)**: 0
**Medium (P2)**: 0
**Low (P3)**: 0

## Recommendations

- ✅ Cutover successful - no rollback needed
- ✅ Monitor for 24 hours
- ✅ Collect user feedback
- ✅ Archive legacy backup after 90 days
- ✅ Update REFERENCE-UPDATE-TRACKING.md to 100%
- ✅ Send completion announcement

## Sign-off

- [ ] DocsOps Lead: _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] Release Manager: _________________ Date: _______

**Approval**: [ ] APPROVED - Proceed to production
EOF

git add docs/migration/POST-CUTOVER-VALIDATION-SUMMARY.md
git commit -m "docs(validation): post-cutover validation summary"
git push origin main
```

## Monitoring Plan (24 hours)

Monitorar sistema por 24 horas após cutover:

**Hour 0-4 (Critical Window)**:
- [ ] Monitor logs every 15 minutes
- [ ] Check service health every 15 minutes
- [ ] Respond to user feedback immediately
- [ ] Fix P0 issues within 1 hour
- [ ] Fix P1 issues within 4 hours

**Hour 4-12 (High Priority Window)**:
- [ ] Monitor logs every 30 minutes
- [ ] Check service health every 30 minutes
- [ ] Respond to user feedback within 1 hour
- [ ] Fix P0 issues within 2 hours
- [ ] Fix P1 issues within 8 hours

**Hour 12-24 (Standard Window)**:
- [ ] Monitor logs every 1 hour
- [ ] Check service health every 1 hour
- [ ] Respond to user feedback within 4 hours
- [ ] Fix P0 issues within 4 hours
- [ ] Fix P1 issues within 24 hours

**Monitoring Commands**:

```bash
# 1. Monitor logs
tail -f /tmp/tradingsystem-logs/docusaurus.log

# 2. Monitor service health
watch -n 300 'curl -s http://localhost:3500/api/status | jq .overallHealth'

# 3. Check for errors
grep -i error /tmp/tradingsystem-logs/*.log | tail -20

# 4. Monitor resource usage
top -b -n 1 | grep -E "node|npm|docusaurus"

# 5. Monitor port usage
lsof -i :3205 -i :3103
```

## User Acceptance Testing

Coletar feedback de usuários:

**Survey Questions**:
1. Você conseguiu acessar a documentação? (Sim/Não)
2. A documentação carregou rapidamente? (Sim/Não)
3. Você encontrou o que procurava? (Sim/Não)
4. A busca funcionou corretamente? (Sim/Não)
5. Você encontrou algum link quebrado? (Sim/Não)
6. Você encontrou algum erro? (Sim/Não/Descreva)
7. Qual sua satisfação geral? (1-5 estrelas)
8. Comentários adicionais: ___________________

**Target Metrics**:
- [ ] >80% conseguiram acessar documentação
- [ ] >80% reportam carregamento rápido
- [ ] >70% encontraram o que procuravam
- [ ] >90% reportam busca funcionando
- [ ] <5% encontraram links quebrados
- [ ] <5% encontraram erros
- [ ] Satisfação média >4.0/5.0

## Final Checklist

Cutover é considerado bem-sucedido quando:

- [ ] docs/ acessível em http://localhost:3205
- [ ] docs/ não existe mais
- [ ] Todas as validações passaram
- [ ] Todos os serviços rodando
- [ ] CORS funcionando
- [ ] Dashboard integração OK
- [ ] CI/CD workflows passando
- [ ] 0 links quebrados
- [ ] 0 bugs críticos (primeiras 4 horas)
- [ ] Feedback positivo (>80%)
- [ ] Nenhum rollback trigger ativado
- [ ] Sistema estável por 24 horas

## Completion Actions

Após validação bem-sucedida:

```bash
# 1. Update REFERENCE-UPDATE-TRACKING.md
echo "## Cutover Completed - $(date +%Y-%m-%d)" >> docs/migration/REFERENCE-UPDATE-TRACKING.md
echo "All references updated to 100%. Cutover successful." >> docs/migration/REFERENCE-UPDATE-TRACKING.md

# 2. Send completion announcement
# Use template from docs/governance/COMMUNICATION-PLAN.md

# 3. Schedule backup archival (90 days)
echo "$(date -d '+90 days' +%Y-%m-%d): Archive backup ~/backups/docs-legacy-backup-*.tar.gz" >> docs/migration/MAINTENANCE-SCHEDULE.md

# 4. Update project status
sed -i 's|Phase 6: Update references & cut-over (Pending)|Phase 6: Update references & cut-over (✅ Complete)|g' README.md

# 5. Commit completion updates
git add docs/migration/ README.md
git commit -m "docs(cutover): mark Phase 6 as complete"
git push origin main
```

## Sign-off

- [ ] Post-Cutover Validation: _________________ Date: _______
- [ ] 24-Hour Monitoring: _________________ Date: _______
- [ ] User Acceptance: _________________ Date: _______
- [ ] Final Approval: _________________ Date: _______

**Cutover Status**: [ ] SUCCESSFUL / [ ] NEEDS ATTENTION / [ ] ROLLED BACK

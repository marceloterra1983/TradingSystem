# Pre-Cutover Validation Report

**Date**: 2025-10-25  
**Validator**: DocsOps + DevOps  
**Objective**: Validar que sistema está pronto para cutover final  
**Status**: Em execução

## Phase 0-5 Completion Checklist

Validar que todas as fases anteriores foram concluídas:

### Phase 0: Reference Updates (T-7 days)
- [ ] Configuration files updated (package.json, services-manifest.json, .env.example, eslint.config.js)
- [ ] Automation scripts updated (35+ scripts in scripts/docs/, scripts/setup/, scripts/core/, scripts/docker/)
- [ ] Source code updated (CORS configs, frontend URLs, backend configs)
- [ ] Documentation links updated (60+ markdown files)
- [ ] Docker configurations updated (docker-compose.docs.yml, openspec_jobs.yaml)
- [ ] Validation: Execute `bash docs/scripts/validate-technical-references.sh --strict`
- [ ] Expected: 0 errors, warnings acceptable

### Phase 1-4: Content Migration
- [ ] All 135 docs files created and reviewed
- [ ] Content mapping complete (see MIGRATION-MAPPING.md)
- [ ] PlantUML diagrams migrated (26 diagrams)
- [ ] Frontmatter validation passes (135/135 files)
- [ ] Validation: Execute `python scripts/docs/validate-frontmatter.py --schema v2 --docs-dir ./docs/content`
- [ ] Expected: 0 files with issues

### Phase 5: Review & Governance
- [ ] All stakeholder reviews complete
- [ ] All P0/P1 issues resolved
- [ ] Governance documents finalized (CUTOVER-PLAN.md, VALIDATION-GUIDE.md, etc.)
- [ ] Communication plan ready
- [ ] Validation: Review docs/governance/REVIEW-CHECKLIST.md
- [ ] Expected: All items checked

## Technical Validation Commands

Executar comandos de validação técnica:

```bash
# 1. Validate no legacy references in active code
echo "Checking for legacy docs/docusaurus references..."
grep -r "docs/docusaurus" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir="docs/context" \
  --exclude-dir="docs/migration" \
  --exclude-dir="docs/governance" \
  --exclude="*.log"

# Expected: No matches (exit code 1)

# 2. Validate no port 3004 references in active code
echo "Checking for port 3004 references..."
grep -r "\b3004\b" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir="docs/context" \
  --exclude-dir="docs/migration" \
  --exclude-dir="docs/governance" \
  --exclude="*.log"

# Expected: No matches (exit code 1)

# 3. Validate docs references are present
echo "Counting docs references..."
grep -r "docs" \
  --exclude-dir=node_modules \
  --exclude-dir=.git | wc -l

# Expected: 50+ matches

# 4. Validate port 3205 references are present
echo "Counting port 3205 references..."
grep -r "\b3205\b" \
  --exclude-dir=node_modules \
  --exclude-dir=.git | wc -l

# Expected: 20+ matches

# 5. Validate CORS configurations
echo "Checking CORS configurations..."
grep -r "CORS_ORIGIN" \
  --include="*.js" \
  --include="*.ts" \
  --include=".env.example" | grep "3205"

# Expected: Multiple matches with port 3205

# 6. Validate services-manifest.json
echo "Checking services-manifest.json..."
jq '.services[] | select(.id == "docusaurus")' config/services-manifest.json

# Expected: {"id": "docusaurus", "path": "docs", "port": 3205, ...}

# 7. Validate package.json
echo "Checking package.json..."
grep "validate-docs" package.json

# Expected: "validate-docs": "python3 scripts/docs/validate-frontmatter.py --docs-dir ./docs/content"
```

## Service Validation

Validar que todos os serviços estão funcionando com as novas configurações:

```bash
# 1. Start all services
bash scripts/core/start-all.sh
sleep 30

# 2. Verify Docusaurus running on port 3205
curl -I http://localhost:3205
# Expected: HTTP/1.1 200 OK

# 3. Verify CORS working
curl -H "Origin: http://localhost:3205" \
     -X OPTIONS \
     -I http://localhost:3500/api/status
# Expected: Access-Control-Allow-Origin: http://localhost:3205

# 4. Verify dashboard integration
curl http://localhost:3103
# Expected: HTTP/1.1 200 OK

# 5. Verify Docker stack
docker compose -f tools/compose/docker-compose.docs.yml ps
# Expected: docs-api-viewer running

# 6. Stop all services
bash scripts/core/stop-all.sh
```

## Build & Test Validation

Validar que builds e testes passam:

```bash
# 1. Validate docs build
cd docs
npm run docs:check
# Expected: All validations pass

# 2. Validate docs links
npm run docs:links
# Expected: 0 broken links

# 3. Validate frontend build
cd ../frontend/dashboard
npm run build
# Expected: Build succeeds

# 4. Validate frontend tests
npm run test
# Expected: All tests pass

# 5. Validate lint
cd ../..
npm run lint
# Expected: No errors

# 6. Validate type-check
npm run type-check
# Expected: No errors
```

## Validation Results

Documentar resultados de cada validação:

| Validation | Command | Expected | Actual | Status | Notes |
|------------|---------|----------|--------|--------|-------|
| Legacy refs | grep docs/docusaurus | 0 matches | ___ | [ ] | ___ |
| Port 3004 refs | grep 3004 | 0 matches | ___ | [ ] | ___ |
| docs refs | grep docs | 50+ matches | ___ | [ ] | ___ |
| Port 3205 refs | grep 3205 | 20+ matches | ___ | [ ] | ___ |
| CORS configs | grep CORS_ORIGIN | All have 3205 | ___ | [ ] | ___ |
| services-manifest | jq docusaurus | docs:3205 | ___ | [ ] | ___ |
| package.json | grep validate-docs | docs/content | ___ | [ ] | ___ |
| Docusaurus running | curl :3205 | 200 OK | ___ | [ ] | ___ |
| CORS working | curl OPTIONS | Allow-Origin | ___ | [ ] | ___ |
| Dashboard | curl :3103 | 200 OK | ___ | [ ] | ___ |
| Docker stack | docker ps | Running | ___ | [ ] | ___ |
| docs:check | npm run | Pass | ___ | [ ] | ___ |
| docs:links | npm run | 0 broken | ___ | [ ] | ___ |
| Frontend build | npm run build | Success | ___ | [ ] | ___ |
| Frontend tests | npm run test | Pass | ___ | [ ] | ___ |
| Lint | npm run lint | No errors | ___ | [ ] | ___ |
| Type-check | npm run type-check | No errors | ___ | [ ] | ___ |

## Go/No-Go Decision

Baseado nos resultados de validação:

- [ ] **GO**: Todas as validações passaram → Prosseguir com cutover
- [ ] **NO-GO**: Alguma validação falhou → Resolver issues antes de prosseguir

**Blocker Issues** (se NO-GO):
- Issue 1: ___________________
- Issue 2: ___________________
- Issue 3: ___________________

**Resolution Plan** (se NO-GO):
- Action 1: ___________________
- Action 2: ___________________
- Action 3: ___________________
- New cutover date: ___________________

## Sign-off

- [ ] DocsOps Lead: _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Release Manager: _________________ Date: _______

**Approval to Proceed**: [ ] YES / [ ] NO

**Next Step**: If approved, proceed to CUTOVER-EXECUTION-CHECKLIST.md

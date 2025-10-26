# Implementation Tasks: Docker Security & Performance Optimization

## 1. Segurança Crítica (MUST DO FIRST) 🔴

### 1.1 Backup & Preparation
- [ ] 1.1.1 Backup atual de `docker-compose.database.yml`
  ```bash
  cp tools/compose/docker-compose.database.yml tools/compose/docker-compose.database.yml.backup
  ```
- [ ] 1.1.2 Validar que root `.env` possui `TIMESCALEDB_PASSWORD`
  ```bash
  grep -E "TIMESCALEDB_PASSWORD|TIMESCALEDB_USER|TIMESCALEDB_DB" .env
  ```
- [ ] 1.1.3 Se não existir, adicionar ao `.env`:
  ```bash
  # TimescaleDB Connection (if not present)
  TIMESCALEDB_PASSWORD=pass_timescale
  TIMESCALEDB_USER=timescale
  TIMESCALEDB_DB=trading
  ```

### 1.2 Remove Hardcoded Password
- [ ] 1.2.1 Editar `tools/compose/docker-compose.database.yml` linha 12
  - **BEFORE**: `POSTGRES_PASSWORD: pass_timescale`
  - **AFTER**: `POSTGRES_PASSWORD: ${TIMESCALEDB_PASSWORD}`

- [ ] 1.2.2 Editar backup database password (linha 34, baixa prioridade)
  - **BEFORE**: `POSTGRES_PASSWORD: backup`
  - **AFTER**: `POSTGRES_PASSWORD: ${TIMESCALEDB_BACKUP_PASSWORD:-backup}`

### 1.3 Test Connection
- [ ] 1.3.1 Restart TimescaleDB container
  ```bash
  docker compose -f tools/compose/docker-compose.database.yml restart timescaledb
  ```
- [ ] 1.3.2 Verify startup logs
  ```bash
  docker compose -f tools/compose/docker-compose.database.yml logs timescaledb | grep "ready to accept"
  ```
- [ ] 1.3.3 Test connection from workspace service
  ```bash
  docker compose -f tools/compose/docker-compose.apps.yml restart workspace
  docker compose logs workspace | grep -i "connected\|error"
  ```
- [ ] 1.3.4 Test connection from tp-capital service
  ```bash
  docker compose -f tools/compose/docker-compose.apps.yml restart tp-capital
  docker compose logs tp-capital | grep -i "connected\|error"
  ```

### 1.4 Commit Security Fix (Separate Commit)
- [ ] 1.4.1 Stage security changes only
  ```bash
  git add tools/compose/docker-compose.database.yml
  ```
- [ ] 1.4.2 Commit with conventional format
  ```bash
  git commit -m "security(docker): remove hardcoded database passwords

  - Replace hardcoded POSTGRES_PASSWORD with ${TIMESCALEDB_PASSWORD}
  - Move credentials to root .env file (CLAUDE.md compliance)
  - Add backup database password variable with fallback

  BREAKING CHANGE: docker-compose.database.yml now requires TIMESCALEDB_PASSWORD in root .env

  Refs: tools/openspec/changes/optimize-docker-security-performance"
  ```

---

## 2. Padronização ENV Loading 🟡

### 2.1 Audit Compose Files
- [ ] 2.1.1 List all compose files with wrong env_file reference
  ```bash
  grep -r "config/docker.env" tools/compose/*.yml tools/monitoring/*.yml
  ```
- [ ] 2.1.2 Document files to change:
  - [ ] `tools/compose/docker-compose.database.yml`
  - [ ] `tools/compose/docker-compose.apps.yml` (verify already correct)
  - [ ] `tools/compose/docker-compose.docs.yml`
  - [ ] `tools/compose/docker-compose.infrastructure.yml`
  - [ ] `tools/compose/docker-compose.firecrawl.yml`
  - [ ] `tools/monitoring/docker-compose.yml`

### 2.2 Validate Root .env Completeness
- [ ] 2.2.1 Extract all required variables from compose files
  ```bash
  grep -h "^\s*-\s*\${" tools/compose/*.yml | sort -u > /tmp/compose-vars.txt
  ```
- [ ] 2.2.2 Compare with root `.env`
  ```bash
  # Manually verify each variable exists in .env
  cat /tmp/compose-vars.txt
  ```
- [ ] 2.2.3 Add missing variables to `.env` (if any)

### 2.3 Substitute env_file References
- [ ] 2.3.1 Database stack
  ```bash
  sed -i 's|../../config/docker.env|../../.env|g' tools/compose/docker-compose.database.yml
  ```
- [ ] 2.3.2 Documentation stack
  ```bash
  sed -i 's|../../config/docker.env|../../.env|g' tools/compose/docker-compose.docs.yml
  ```
- [ ] 2.3.3 Infrastructure stack
  ```bash
  sed -i 's|../../config/docker.env|../../.env|g' tools/compose/docker-compose.infrastructure.yml
  ```
- [ ] 2.3.4 Firecrawl stack
  ```bash
  sed -i 's|../../config/docker.env|../../.env|g' tools/compose/docker-compose.firecrawl.yml
  ```
- [ ] 2.3.5 Monitoring stack
  ```bash
  sed -i 's|../../config/docker.env|../../.env|g' tools/monitoring/docker-compose.yml
  ```

### 2.4 Test Each Stack
- [ ] 2.4.1 Test database stack
  ```bash
  docker compose -f tools/compose/docker-compose.database.yml restart
  docker compose -f tools/compose/docker-compose.database.yml ps
  ```
- [ ] 2.4.2 Test apps stack
  ```bash
  docker compose -f tools/compose/docker-compose.apps.yml restart
  docker compose -f tools/compose/docker-compose.apps.yml ps
  ```
- [ ] 2.4.3 Test docs stack
  ```bash
  docker compose -f tools/compose/docker-compose.docs.yml restart
  docker compose -f tools/compose/docker-compose.docs.yml ps
  ```
- [ ] 2.4.4 Test infrastructure stack
  ```bash
  docker compose -f tools/compose/docker-compose.infrastructure.yml restart
  docker compose -f tools/compose/docker-compose.infrastructure.yml ps
  ```
- [ ] 2.4.5 Test monitoring stack
  ```bash
  docker compose -f tools/monitoring/docker-compose.yml restart
  docker compose -f tools/monitoring/docker-compose.yml ps
  ```

### 2.5 Commit ENV Standardization
- [ ] 2.5.1 Review changes
  ```bash
  git diff tools/compose/ tools/monitoring/
  ```
- [ ] 2.5.2 Stage and commit
  ```bash
  git add tools/compose/*.yml tools/monitoring/docker-compose.yml
  git commit -m "chore(docker): standardize env_file to root .env

  - Replace config/docker.env references with ../../.env
  - Aligns with project standard: ALL containers MUST use root .env (CLAUDE.md)
  - Simplifies configuration management (single source of truth)

  Affects:
  - docker-compose.database.yml
  - docker-compose.docs.yml
  - docker-compose.infrastructure.yml
  - docker-compose.firecrawl.yml
  - monitoring/docker-compose.yml

  Refs: tools/openspec/changes/optimize-docker-security-performance"
  ```

---

## 3. Limpeza de Recursos 🟡

### 3.1 Pre-Cleanup Validation
- [ ] 3.1.1 List dangling volumes (should be unused)
  ```bash
  docker volume ls -qf dangling=true
  ```
- [ ] 3.1.2 Verify count
  ```bash
  docker volume ls -qf dangling=true | wc -l  # Expected: ~27
  ```
- [ ] 3.1.3 List dangling images
  ```bash
  docker images -f dangling=true
  ```
- [ ] 3.1.4 Verify count and size
  ```bash
  docker images -f dangling=true | wc -l  # Expected: ~17
  docker system df  # Note "Reclaimable" size
  ```

### 3.2 Cleanup Execution
- [ ] 3.2.1 Prune volumes (interactive confirmation first)
  ```bash
  docker volume prune  # Confirm manually
  ```
- [ ] 3.2.2 Prune images (interactive confirmation)
  ```bash
  docker image prune  # Confirm manually
  ```
- [ ] 3.2.3 Prune networks
  ```bash
  docker network prune -f
  ```

### 3.3 Post-Cleanup Verification
- [ ] 3.3.1 Verify all containers still healthy
  ```bash
  bash scripts/maintenance/health-check-all.sh
  ```
- [ ] 3.3.2 Check disk space recovered
  ```bash
  docker system df  # Compare with pre-cleanup
  ```
- [ ] 3.3.3 Document space recovered
  ```bash
  # Record: Freed X GB (Y volumes + Z images)
  ```

---

## 4. Dockerfile.prod Creation (OPTIONAL - Can Defer) 🟢

### 4.1 Workspace Service
- [ ] 4.1.1 Create `backend/api/workspace/.dockerignore`
  ```
  node_modules/
  npm-debug.log
  .git/
  .env
  .DS_Store
  coverage/
  .vscode/
  *.md
  docker-compose*.yml
  Dockerfile*
  tests/
  scripts/
  ```

- [ ] 4.1.2 Create `backend/api/workspace/Dockerfile.prod` (multi-stage)
  - Stage 1: Production dependencies only
  - Stage 2: Build application (if needed)
  - Stage 3: Production runtime (node:18-alpine + non-root user)

- [ ] 4.1.3 Test build
  ```bash
  cd backend/api/workspace
  docker build -t workspace:prod -f Dockerfile.prod .
  ```

- [ ] 4.1.4 Verify image size
  ```bash
  docker images | grep workspace
  # Expected: ~200MB (vs 481MB current)
  ```

### 4.2 TP Capital Service
- [ ] 4.2.1 Create `apps/tp-capital/api/.dockerignore`
  ```
  node_modules/
  npm-debug.log
  .git/
  .env
  .DS_Store
  coverage/
  .vscode/
  *.md
  docker-compose*.yml
  Dockerfile*
  tests/
  scripts/
  ```

- [ ] 4.2.2 Create `apps/tp-capital/api/Dockerfile.prod` (multi-stage)
  - Stage 1: Production dependencies only
  - Stage 2: Build application (if needed)
  - Stage 3: Production runtime (node:18-alpine + non-root user)

- [ ] 4.2.3 Test build
  ```bash
  cd apps/tp-capital/api
  docker build -t tp-capital:prod -f Dockerfile.prod .
  ```

- [ ] 4.2.4 Verify image size
  ```bash
  docker images | grep tp-capital
  # Expected: ~180MB (vs 424MB current)
  ```

### 4.3 Documentation
- [ ] 4.3.1 Create guide: `docs/content/tools/docker/production-dockerfiles.mdx`
  - When to use Dockerfile.dev vs Dockerfile.prod
  - Build instructions
  - Deployment strategy
  - Rollback procedures

---

## 5. Documentação 📝

### 5.1 Update CLAUDE.md
- [ ] 5.1.1 Add section: "Docker Security Best Practices"
  - Never hardcode credentials
  - Always use ${VAR} references
  - Root .env is single source of truth

- [ ] 5.1.2 Update "Development Commands" section
  - Reference new Dockerfile.prod (when to use)
  - Document cleanup procedures

### 5.2 Create ADR
- [ ] 5.2.1 Create `docs/content/reference/adrs/2025-10-26-docker-security-optimization.md`
  - Context: Security vulnerabilities + resource waste
  - Decision: Centralized .env + multi-stage builds
  - Consequences: Improved security, 5GB recovered
  - Status: Accepted

### 5.3 Update Infrastructure Docs
- [ ] 5.3.1 Update `docs/content/tools/docker/overview.mdx`
  - Document new security patterns
  - Reference ADR

---

## 6. Validação Final & OpenSpec ✅

### 6.1 Health Checks
- [ ] 6.1.1 Run comprehensive health check
  ```bash
  bash scripts/maintenance/health-check-all.sh
  ```
- [ ] 6.1.2 Verify all containers healthy
- [ ] 6.1.3 Verify all services responding
  - http://localhost:3200/health (workspace)
  - http://localhost:4005/health (tp-capital)
  - http://localhost:3400/health (documentation-api)

### 6.2 OpenSpec Validation
- [ ] 6.2.1 Validate change proposal
  ```bash
  npm run openspec -- validate optimize-docker-security-performance --strict
  ```
- [ ] 6.2.2 Review deltas
  ```bash
  npm run openspec -- show optimize-docker-security-performance --json --deltas-only
  ```
- [ ] 6.2.3 Check diff
  ```bash
  npm run openspec -- diff optimize-docker-security-performance
  ```

### 6.3 Final Commit (if Dockerfile.prod created)
- [ ] 6.3.1 Stage Dockerfile changes
  ```bash
  git add backend/api/workspace/Dockerfile.prod
  git add backend/api/workspace/.dockerignore
  git add apps/tp-capital/api/Dockerfile.prod
  git add apps/tp-capital/api/.dockerignore
  ```
- [ ] 6.3.2 Commit
  ```bash
  git commit -m "feat(docker): add production-optimized Dockerfiles

  - Add multi-stage Dockerfile.prod for workspace and tp-capital
  - Reduce image size 58% (481MB → 200MB)
  - Add non-root user for security
  - Add .dockerignore to optimize build context

  Images remain on Dockerfile.dev for development (hot-reload).
  Dockerfile.prod prepared for future production deployments.

  Refs: tools/openspec/changes/optimize-docker-security-performance"
  ```

### 6.4 Documentation Commit
- [ ] 6.4.1 Stage documentation
  ```bash
  git add CLAUDE.md
  git add docs/content/reference/adrs/
  git add docs/content/tools/docker/
  ```
- [ ] 6.4.2 Commit
  ```bash
  git commit -m "docs(docker): add security guidelines and ADR

  - Update CLAUDE.md with Docker security best practices
  - Add ADR-2025-10-26-docker-security-optimization
  - Document production Dockerfile strategy

  Refs: tools/openspec/changes/optimize-docker-security-performance"
  ```

---

## Success Criteria Checklist

- [ ] ✅ Zero senhas hardcoded em compose files (validated: `grep -r "POSTGRES_PASSWORD: [^$]" tools/compose/`)
- [ ] ✅ Todos compose files usam `env_file: ../../.env` (validated: `grep -r "env_file:" tools/compose/ tools/monitoring/`)
- [ ] ✅ ~5GB de espaço liberado (validated: `docker system df` before/after)
- [ ] ✅ Dockerfile.prod criado e build passa (test build commands)
- [ ] ✅ `openspec validate --strict` passa sem erros
- [ ] ✅ Health check all passa (todos containers healthy)
- [ ] ✅ Documentação atualizada (CLAUDE.md + ADR)
- [ ] ✅ Zero regressões em service health

---

## Notes

**Estimated Time per Section:**
1. Security Critical: ~30 minutes
2. ENV Standardization: ~30 minutes
3. Resource Cleanup: ~15 minutes
4. Dockerfile.prod: ~1 hour (OPTIONAL)
5. Documentation: ~30 minutes
6. Validation: ~30 minutes

**Total: 2.5-3.5 hours** (depending on optional Dockerfile.prod creation)

**Priority Order:**
1. 🔴 CRITICAL: Security fixes (Section 1)
2. 🟡 HIGH: ENV standardization (Section 2)
3. 🟡 HIGH: Resource cleanup (Section 3)
4. 🟢 MEDIUM: Dockerfile.prod (Section 4) - Can defer
5. 📝 MEDIUM: Documentation (Section 5)
6. ✅ MUST: Validation (Section 6)

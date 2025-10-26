# Design: Docker Security & Performance Optimization

## Context

### Background

Em 2025-10-26, o **docker-health-optimizer agent** executou análise completa da infraestrutura Docker do TradingSystem e identificou problemas críticos:

**Current State (20 containers running):**
- All containers healthy (100% health check pass rate)
- Excellent resource efficiency (1GB RAM, <2% CPU)
- **CRITICAL**: Hardcoded password in docker-compose.database.yml:12
- **PROBLEM**: Mixed env loading strategy (config/docker.env vs .env)
- **WASTE**: 27 dangling volumes (~800MB) + 17 dangling images (~3.5GB)
- **UNPREPARED**: No production-optimized Dockerfiles

### Constraints

1. **CLAUDE.md Requirements**:
   - "Never commit credentials"
   - "ALL containers MUST reference root .env file"
   - Security-first approach

2. **Development Workflow**:
   - Hot-reload MUST remain functional (<2s)
   - Zero disruption to current development

3. **Production Readiness**:
   - Need strategy for future deployments
   - Image size optimization critical for scale

4. **Time Constraints**:
   - Security fix URGENT (password exposed in git history)
   - Cleanup beneficial but not critical
   - Production prep can be deferred if needed

### Stakeholders

- **Primary**: Development team (security risk affects all)
- **Secondary**: DevOps (future deployment strategy)
- **Tertiary**: End users (indirectly via improved deployment)

---

## Goals / Non-Goals

### Goals

1. ✅ **Eliminate Security Vulnerabilities**
   - Remove ALL hardcoded credentials from compose files
   - Align with CLAUDE.md security requirements
   - Enable easy credential rotation

2. ✅ **Standardize Configuration Management**
   - Single source of truth (root .env)
   - Predictable environment loading across all stacks
   - Reduce configuration drift

3. ✅ **Reclaim Disk Space**
   - Remove 27 dangling volumes (~800MB)
   - Remove 17 dangling images (~3.5GB)
   - Clean orphaned networks

4. ✅ **Prepare for Production**
   - Multi-stage Dockerfiles (60% image size reduction)
   - Security-hardened images (non-root user)
   - Clear dev vs prod strategy

### Non-Goals

❌ **Optimize Dockerfile.dev**
- Current dev images work well with hot-reload
- Benefit marginal in development (27% vs 58% in prod)
- Would add complexity without proportional gain

❌ **Add Resource Limits Now**
- Current resource usage healthy (<2% CPU, 1GB RAM)
- No evidence of resource contention
- Can add limits later when scaling

❌ **Implement BuildKit Caching**
- Already have scripts (`scripts/docker/buildkit-*.sh`)
- Build times acceptable in development
- Defer to next optimization phase

❌ **Migrate to Kubernetes**
- Not required for current scale
- Local Docker Compose sufficient
- Future consideration (deploy configs already K8s-compatible)

---

## Decisions

### Decision 1: Use ${VAR} Syntax Instead of Hardcoded Values

**Context:**
- Current: `POSTGRES_PASSWORD: axA7d0kgjBezRw0mRlj9tOnHRBKgmZsL` (hardcoded)
- Violates CLAUDE.md: "Never commit credentials"
- Git history contains password (security risk)

**Decision:**
Use environment variable reference: `POSTGRES_PASSWORD: ${TIMESCALEDB_PASSWORD}`

**Rationale:**
1. **Security**: No credentials in version control
2. **Flexibility**: Different passwords per environment (dev/staging/prod)
3. **Rotation**: Easy to change password (update .env only)
4. **Compliance**: Aligns with project security standards

**Alternatives Considered:**

| Alternative | Pros | Cons | Verdict |
|------------|------|------|---------|
| **Docker Secrets** | More secure, encrypted at rest | Overkill for dev, requires Swarm | ❌ Rejected (complexity) |
| **Vault/HashiCorp** | Enterprise-grade, audit logs | Too complex for current scale | ❌ Rejected (overkill) |
| **Keep hardcoded** | No changes needed | Security risk, violates CLAUDE.md | ❌ Rejected (unacceptable) |
| **${VAR} syntax** | Simple, secure, standard | Requires .env management | ✅ **Accepted** |

**Implementation:**
```yaml
# BEFORE
environment:
  POSTGRES_PASSWORD: axA7d0kgjBezRw0mRlj9tOnHRBKgmZsL

# AFTER
environment:
  POSTGRES_PASSWORD: ${TIMESCALEDB_PASSWORD}
```

---

### Decision 2: Centralize ENV Loading to Root .env

**Context:**
- Mixed strategy: Some stacks use `config/docker.env`, others use `.env`
- CLAUDE.md requires: "ALL containers MUST reference root .env file"
- Configuration drift causing maintenance issues

**Decision:**
Standardize all compose files to use `env_file: ../../.env`

**Rationale:**
1. **Single Source of Truth**: One file to configure all services
2. **Predictability**: No ambiguity about which env file is loaded
3. **Compliance**: Aligns with CLAUDE.md requirements
4. **Onboarding**: New developers configure one file, not multiple

**Alternatives Considered:**

| Alternative | Pros | Cons | Verdict |
|------------|------|------|---------|
| **Keep mixed (status quo)** | No changes needed | Configuration drift, violates standard | ❌ Rejected |
| **Service-specific .env** | Isolation per service | Duplication, hard to maintain | ❌ Rejected |
| **Root .env (centralized)** | Single source, easy to manage | Larger file (minor) | ✅ **Accepted** |

**Migration Strategy:**
1. Audit all compose files for `env_file` references
2. Extract required variables from `config/docker.env`
3. Ensure root `.env` has all required variables
4. Update compose files: `s|config/docker.env|../../.env|g`
5. Test each stack individually before committing

---

### Decision 3: Multi-Stage Dockerfiles for Production

**Context:**
- Current images: 481MB (workspace), 424MB (tp-capital)
- Include devDependencies (nodemon, eslint, jest, etc.)
- No differentiation between dev and prod builds

**Decision:**
Create separate `Dockerfile.prod` with multi-stage build:
1. **Stage 1**: Install production dependencies only
2. **Stage 2**: Build application (transpile if needed)
3. **Stage 3**: Production runtime (alpine + non-root user)

**Rationale:**
1. **Size Reduction**: 481MB → 200MB (58% smaller)
2. **Security**: No devDependencies (reduced attack surface)
3. **Performance**: Smaller images = faster deployments
4. **Best Practice**: Industry-standard approach

**Alternatives Considered:**

| Alternative | Pros | Cons | Verdict |
|------------|------|------|---------|
| **Optimize Dockerfile.dev** | One file to maintain | Only 27% reduction (devDeps needed) | ❌ Rejected (marginal gain) |
| **Single-stage prod** | Simpler | Larger images, includes build tools | ❌ Rejected (misses optimization) |
| **Multi-stage prod** | 58% reduction, secure | Two files to maintain | ✅ **Accepted** |
| **Distroless images** | Smallest possible (~50MB) | Complex, debugging hard | ❌ Deferred (future consideration) |

**Implementation:**
```dockerfile
# Stage 1: Production Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Stage 2: Build (if TypeScript/Babel)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || echo "No build step"

# Stage 3: Production Runtime
FROM node:18-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./
USER nodejs
EXPOSE 3200
CMD ["node", "dist/server.js"]
```

---

### Decision 4: Prune Dangling Resources Safely

**Context:**
- 27 dangling volumes (~800MB)
- 17 dangling images (~3.5GB)
- Multiple orphaned networks
- All from previous builds/deployments

**Decision:**
Use `docker [volume|image|network] prune` with validation before execution

**Rationale:**
1. **Safety**: Validate no active resources before prune
2. **Space**: Recover ~5GB disk space
3. **Performance**: Faster builds (less layers to scan)
4. **Maintenance**: Regular cleanup prevents accumulation

**Validation Procedure:**
```bash
# 1. List what will be removed
docker volume ls -qf dangling=true
docker images -f dangling=true

# 2. Verify count matches expected (~27 volumes, ~17 images)
docker volume ls -qf dangling=true | wc -l

# 3. Confirm no active containers using these
docker ps -a --filter volume=<volume_name>

# 4. Execute prune (interactive first, then -f if safe)
docker volume prune
docker image prune
docker network prune -f
```

---

## Risks / Trade-offs

### Risk 1: Containers Fail After env_file Change

**Probability**: MEDIUM
**Impact**: HIGH (all containers could fail)

**Mitigation:**
1. ✅ Backup all compose files before changes
2. ✅ Test each stack individually before committing
3. ✅ Audit root .env for missing variables
4. ✅ Have rollback plan ready:
   ```bash
   git checkout HEAD -- tools/compose/
   docker compose -f tools/compose/docker-compose.database.yml restart
   ```

**Recovery Time**: <5 minutes (git revert + docker restart)

---

### Risk 2: Accidentally Remove Active Volumes

**Probability**: LOW
**Impact**: CRITICAL (data loss)

**Mitigation:**
1. ✅ Validate `docker volume ls -qf dangling=true` before prune
2. ✅ Check active volumes: `docker volume ls --filter name=timescaledb`
3. ✅ Run prune interactively first (manual confirmation)
4. ✅ Have database backups (regular backup policy)

**Recovery Time**: Depends on backup availability (restore from backup)

---

### Risk 3: Missing Environment Variables in .env

**Probability**: LOW
**Impact**: HIGH (services fail to start)

**Mitigation:**
1. ✅ Extract all `${VAR}` references from compose files
2. ✅ Cross-reference with root .env
3. ✅ Add missing variables with defaults
4. ✅ Validate with `docker compose config` before starting

**Detection:**
```bash
# Extract all env var references
grep -h "^\s*-\s*\${" tools/compose/*.yml | sort -u

# Verify each exists in .env
while read var; do
  var_name=$(echo "$var" | sed 's/.*{\([^}:]*\).*/\1/')
  grep -q "^$var_name=" .env || echo "MISSING: $var_name"
done < <(grep -h "^\s*-\s*\${" tools/compose/*.yml | sort -u)
```

---

### Risk 4: Dockerfile.prod Breaks Production Deployment

**Probability**: LOW (not activating yet)
**Impact**: MEDIUM (future deployments affected)

**Mitigation:**
1. ✅ Test build locally before committing
2. ✅ Verify image size reduction (~200MB)
3. ✅ Test container startup and health checks
4. ✅ Document when/how to use Dockerfile.prod
5. ✅ Keep Dockerfile.dev active (zero immediate impact)

**Validation:**
```bash
# Build and test locally
docker build -t workspace:prod -f Dockerfile.prod .
docker run --rm -p 3200:3200 -e NODE_ENV=production workspace:prod

# Verify health check
curl http://localhost:3200/health

# Check image size
docker images | grep workspace
# Expected: ~200MB (prod) vs 481MB (dev)
```

---

## Migration Plan

### Phase 1: Security Fix (CRITICAL - Do First)

**Steps:**
1. Backup docker-compose.database.yml
2. Add TIMESCALEDB_PASSWORD to root .env (if missing)
3. Replace hardcoded password with ${TIMESCALEDB_PASSWORD}
4. Test TimescaleDB connection
5. Test workspace + tp-capital connections
6. Commit security fix (separate commit)

**Rollback:**
```bash
# If anything fails
cp tools/compose/docker-compose.database.yml.backup tools/compose/docker-compose.database.yml
docker compose -f tools/compose/docker-compose.database.yml restart
```

**Validation:**
```bash
# Success = containers healthy + no connection errors
docker compose logs timescaledb | grep "ready to accept"
docker compose logs workspace | grep -i "connected"
```

---

### Phase 2: ENV Standardization (HIGH Priority)

**Steps:**
1. Audit all compose files for env_file references
2. Extract required variables (grep `${VAR}`)
3. Validate root .env has all required variables
4. Update compose files (sed substitution)
5. Test each stack individually
6. Commit standardization changes

**Rollback:**
```bash
# If any stack fails
git checkout HEAD -- tools/compose/<stack>.yml
docker compose -f tools/compose/<stack>.yml restart
```

**Validation:**
```bash
# Success = all stacks restart without errors
for stack in database apps docs infrastructure monitoring; do
  docker compose -f tools/compose/docker-compose.$stack.yml restart
  docker compose -f tools/compose/docker-compose.$stack.yml ps
done
```

---

### Phase 3: Resource Cleanup (MEDIUM Priority)

**Steps:**
1. List dangling resources (volumes, images, networks)
2. Validate counts match expected (~27, ~17, multiple)
3. Run prune commands (interactive first)
4. Verify disk space recovered (`docker system df`)
5. Confirm all containers still healthy

**Rollback:**
- N/A (cannot restore deleted resources)
- Risk mitigated by validation before prune

**Validation:**
```bash
# Success = space recovered + no service disruption
docker system df  # Compare before/after
bash scripts/maintenance/health-check-all.sh  # All healthy
```

---

### Phase 4: Dockerfile.prod Creation (OPTIONAL)

**Steps:**
1. Create .dockerignore for each service
2. Create Dockerfile.prod with multi-stage build
3. Test build locally
4. Verify image size reduction
5. Test container startup
6. Commit production Dockerfiles (do NOT activate)

**Rollback:**
- N/A (new files, zero impact on running services)

**Validation:**
```bash
# Success = build passes + size reduction + health check passes
docker build -t workspace:prod -f backend/api/workspace/Dockerfile.prod backend/api/workspace/
docker images | grep workspace  # Should show ~200MB
docker run --rm -d -p 9999:3200 workspace:prod
curl http://localhost:9999/health  # Should return 200 OK
```

---

## Open Questions

### Q1: Should we create Dockerfile.prod now or defer?

**Analysis:**
- **Effort**: ~1 hour per service (2 services = 2 hours)
- **Benefit**: Prepared for future, good practice
- **Risk**: Low (not activating, just creating)
- **Cost of deferring**: Must create later when needed

**Recommendation**: ✅ **Create now** (low cost, high future value)

---

### Q2: Should we add resource limits now?

**Analysis:**
- **Current usage**: <2% CPU, ~1GB RAM (very healthy)
- **Evidence of issues**: None
- **Benefit**: Prevents resource starvation (theoretical)
- **Cost**: Additional configuration complexity

**Recommendation**: ❌ **Defer** (no evidence of need, can add later)

---

### Q3: Should we implement BuildKit caching now?

**Analysis:**
- **Scripts exist**: `scripts/docker/buildkit-*.sh`
- **Current build times**: Acceptable for development
- **Benefit**: 80% faster rebuilds (CI/CD more impactful)
- **Cost**: Configuration + testing time

**Recommendation**: ❌ **Defer to next phase** (optimize when CI/CD implemented)

---

## Success Metrics

### Implementation Metrics

- ✅ Zero hardcoded credentials in compose files (grep validation)
- ✅ 100% of compose files use `env_file: ../../.env` (grep validation)
- ✅ ~5GB disk space recovered (docker system df)
- ✅ Dockerfile.prod builds successfully (docker build)
- ✅ Image size reduction 50-60% (docker images)
- ✅ openspec validate --strict passes
- ✅ All containers healthy post-change (health-check-all.sh)

### Operational Metrics (Post-Deploy)

- Container restart count unchanged (<1/day)
- Zero regression in response times (<100ms p95)
- TimescaleDB connection errors = 0
- Disk growth rate < 1GB/month (vs unlimited before)

### Security Metrics

- Zero credentials in git history (new commits)
- Password rotation enabled (can change without code changes)
- Audit trail for env changes (git log .env)

---

## References

### Related Documents

- **CLAUDE.md**: Security & Configuration section
- **Docker Health Report**: 2025-10-26 analysis
- **AGENTS.md**: OpenSpec workflow

### Related Changes

- `containerize-tp-capital-workspace` (predecessor, base infrastructure)
- This change: Security hardening + optimization

### External References

- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/security/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

**Status**: 🟢 Design Complete (awaiting implementation approval)
**Author**: Claude Code AI Agent
**Date**: 2025-10-26
**Change ID**: `optimize-docker-security-performance`

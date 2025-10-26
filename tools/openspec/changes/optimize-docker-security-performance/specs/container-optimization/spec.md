# Container Optimization Specification

## ADDED Requirements

### Requirement: Production Dockerfile

Node.js services SHALL provide multi-stage Dockerfiles optimized for production deployments (`Dockerfile.prod`), separate from development Dockerfiles (`Dockerfile.dev`), to minimize image size and improve security.

#### Scenario: Multi-stage build structure
- **WHEN** Dockerfile.prod is built
- **THEN** it contains exactly 3 stages: dependencies, builder, production
- **AND** Stage 1 installs only production dependencies (`npm ci --only=production`)
- **AND** Stage 2 installs all dependencies and builds application
- **AND** Stage 3 contains only runtime artifacts (no devDependencies)

#### Scenario: Image size reduction
- **WHEN** production image is built
- **THEN** final image size is 50-60% smaller than development image
- **AND** image size is ~180-200MB for Node.js services
- **AND** reduction achieved through alpine base + production deps only

#### Scenario: Alpine base image
- **WHEN** production image is built
- **THEN** base image is `node:18-alpine` (not `node:18`)
- **AND** alpine provides minimal footprint (~170MB vs ~950MB)
- **AND** musl libc is sufficient for Node.js runtime

#### Scenario: Non-root user for security
- **WHEN** production container runs
- **THEN** application process runs as user `nodejs` (UID 1001)
- **AND** user is created with `adduser -S nodejs -u 1001`
- **AND** all application files are owned by `nodejs:nodejs`
- **AND** container does NOT run as root (UID 0)

#### Scenario: Build and run production image
- **WHEN** developer builds production image
- **THEN** `docker build -t service:prod -f Dockerfile.prod .` succeeds
- **AND** `docker run service:prod` starts without errors
- **AND** health check passes within start_period

---

### Requirement: Dockerignore Optimization

Each containerized service SHALL include a `.dockerignore` file to exclude unnecessary files from the build context, reducing build time and image size.

#### Scenario: Exclude development artifacts
- **WHEN** docker build is executed
- **THEN** `.dockerignore` excludes `node_modules/` (rebuilt in container)
- **AND** excludes `.git/`, `.gitignore`, `.env`, `.env.*`
- **AND** excludes `tests/`, `coverage/`, `.vscode/`, `.idea/`
- **AND** excludes `*.md`, `docker-compose*.yml`, `Dockerfile*`

#### Scenario: Build context size reduction
- **WHEN** docker build is executed
- **THEN** build context size is < 10MB (excluding node_modules)
- **AND** only `src/`, `package.json`, `package-lock.json` are included
- **AND** build time is reduced by 20-30% vs full context

#### Scenario: Verify dockerignore effectiveness
- **WHEN** validating dockerignore
- **THEN** `docker build` output shows "Sending build context" < 10MB
- **AND** `docker history <image>` shows no excluded files in layers

---

### Requirement: Layer Caching Optimization

Dockerfile structure SHALL optimize layer caching to minimize rebuild time when only source code changes.

#### Scenario: Package files copied first
- **WHEN** Dockerfile is structured
- **THEN** `COPY package*.json ./` occurs BEFORE `COPY . .`
- **AND** `RUN npm ci` occurs immediately after package copy
- **AND** source code copy is the LAST step before CMD

#### Scenario: Source code change does not rebuild deps
- **WHEN** only source code changes (no package.json change)
- **THEN** npm install layer is reused from cache
- **AND** only source code layer is rebuilt
- **AND** rebuild time is < 30 seconds

#### Scenario: Dependency change rebuilds from npm install
- **WHEN** package.json changes
- **THEN** npm install layer is rebuilt
- **AND** all subsequent layers are rebuilt
- **AND** this is expected and optimal

---

### Requirement: Security Hardening

Production Docker images SHALL follow security best practices to minimize attack surface and vulnerability exposure.

#### Scenario: Non-root user
- **WHEN** production container runs
- **THEN** USER instruction sets non-root user (nodejs:1001)
- **AND** application cannot modify system files
- **AND** container passes security scanners (no root user warning)

#### Scenario: Minimal base image
- **WHEN** production image is built
- **THEN** alpine variant is used (fewer packages = fewer vulnerabilities)
- **AND** only essential packages are installed
- **AND** `apk add` includes `--no-cache` flag (no package cache in image)

#### Scenario: No secrets in image
- **WHEN** image is built
- **THEN** .dockerignore excludes `.env`, `.env.*`, `secrets/`
- **AND** no hardcoded credentials in Dockerfile
- **AND** secrets are passed via environment variables at runtime

#### Scenario: Image vulnerability scanning
- **WHEN** production image is scanned (e.g., `docker scout`, `trivy`)
- **THEN** CRITICAL vulnerabilities count is 0
- **AND** HIGH vulnerabilities are minimized (unavoidable Node.js deps)

---

### Requirement: Health Check Integration

Production Dockerfiles SHALL include built-in health checks that validate service readiness without external tools.

#### Scenario: Node.js HTTP health check
- **WHEN** Dockerfile.prod defines HEALTHCHECK
- **THEN** test command uses Node.js built-in http module
- **AND** command is: `node -e "require('http').get('http://localhost:PORT/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"`
- **AND** no external tools (curl, wget) required

#### Scenario: Health check timing
- **WHEN** container starts
- **THEN** start_period is 30-60s (allows initialization)
- **AND** interval is 30s (checks every 30s)
- **AND** timeout is 10s (health check must complete in 10s)
- **AND** retries is 3 (3 failures before unhealthy)

#### Scenario: Health check exit codes
- **WHEN** health check executes
- **THEN** exit code 0 means healthy
- **AND** exit code 1 means unhealthy
- **AND** any other exit code is treated as unhealthy

---

### Requirement: Production vs Development Strategy

Projects SHALL maintain separate Dockerfiles for development (`Dockerfile.dev`) and production (`Dockerfile.prod`) with clear documentation on when to use each.

#### Scenario: Development Dockerfile characteristics
- **WHEN** using Dockerfile.dev
- **THEN** includes all dependencies (dev + prod)
- **AND** supports hot-reload via volume mounts
- **AND** runs as root (for easier debugging)
- **AND** image size is larger (~400-500MB acceptable)

#### Scenario: Production Dockerfile characteristics
- **WHEN** using Dockerfile.prod
- **THEN** includes only production dependencies
- **AND** multi-stage build for optimization
- **AND** runs as non-root user
- **AND** image size is minimized (~180-200MB)

#### Scenario: Choosing correct Dockerfile
- **WHEN** developer starts local development
- **THEN** use Dockerfile.dev (hot-reload, devtools)
- **WHEN** deploying to staging/production
- **THEN** use Dockerfile.prod (optimized, secure)

#### Scenario: Documentation of Dockerfile usage
- **WHEN** adding Dockerfile.prod
- **THEN** README.md documents both Dockerfiles
- **AND** compose files specify `dockerfile: Dockerfile.dev` explicitly
- **AND** deployment guides reference Dockerfile.prod

---

## Implementation Notes

### Multi-Stage Dockerfile Template

```dockerfile
# ====================
# Stage 1: Production Dependencies
# ====================
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ONLY production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ====================
# Stage 2: Build Application
# ====================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build application (if using TypeScript, Babel, etc.)
# RUN npm run build

# ====================
# Stage 3: Production Runtime
# ====================
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Copy production dependencies from Stage 1
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application from Stage 2
# If you have a build step:
# COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
# If plain JS (no build):
COPY --chown=nodejs:nodejs src ./src

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3200/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
```

### .dockerignore Template

```
# Dependencies (will be installed in container)
node_modules/
npm-debug.log
yarn.lock
package-lock.json.bak

# Git
.git/
.gitignore
.github/

# Environment
.env
.env.*
!.env.example

# IDE
.vscode/
.idea/
.DS_Store
*.swp
*.swo
*~

# Testing
tests/
test/
coverage/
.nyc_output/

# Documentation
*.md
docs/
README*

# Build artifacts (if rebuilding in container)
dist/
build/
.cache/

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# CI/CD
.github/
.gitlab-ci.yml
.travis.yml

# Logs
logs/
*.log
```

### Size Comparison

| Service | Before (Dockerfile.dev) | After (Dockerfile.prod) | Reduction |
|---------|-------------------------|-------------------------|-----------|
| Workspace | 481MB | ~200MB | 58% |
| TP Capital | 424MB | ~180MB | 58% |
| Docs API | 436MB | ~190MB | 56% |

### Build Commands

```bash
# Development (current - no change)
docker build -t workspace:dev -f Dockerfile.dev .

# Production (new)
docker build -t workspace:prod -f Dockerfile.prod .

# Verify size
docker images | grep workspace

# Test production image
docker run --rm -p 3200:3200 \
  -e NODE_ENV=production \
  -e TIMESCALEDB_HOST=host.docker.internal \
  workspace:prod
```

### Validation Checklist

- [ ] Dockerfile.prod builds without errors
- [ ] Image size is 50-60% smaller than Dockerfile.dev
- [ ] Container runs as non-root user (verify: `docker exec <container> whoami`)
- [ ] Health check passes (verify: `docker ps` shows "healthy")
- [ ] No CRITICAL vulnerabilities in scan
- [ ] .dockerignore reduces build context to < 10MB
- [ ] Hot-reload still works with Dockerfile.dev (no regression)

---

## Performance Metrics

### Build Time

| Scenario | Time (Dockerfile.dev) | Time (Dockerfile.prod) |
|----------|----------------------|------------------------|
| Clean build | ~3 minutes | ~4 minutes (multi-stage) |
| Code change only | ~15 seconds | ~15 seconds (cached layers) |
| Dependency change | ~2 minutes | ~3 minutes (rebuild from npm) |

### Runtime Performance

- **Startup time**: No significant difference (~2-3 seconds)
- **Memory usage**: Production may use 10-20MB less (no devDeps in memory)
- **CPU usage**: Identical (same Node.js runtime)

### Disk Space Savings

- **Per service**: ~250-300MB saved
- **3 services**: ~750-900MB total saved
- **With dangling cleanup**: ~5GB total space recovered

# Neon PostgreSQL - Build from Source Guide

**Status**: ✅ Ready to build  
**Build Time**: ~30 minutes (first time), ~5 minutes (with cache)  
**Disk Space Required**: 10GB+

---

## Quick Start

### 1. Build Neon Image

```bash
# Automated build with script
bash scripts/database/build-neon-from-source.sh

# Or manual Docker build
docker build -f tools/compose/neon.Dockerfile -t neon-local:latest .
```

**What happens during build:**
- ✅ Clones Neon repository from GitHub
- ✅ Compiles Rust components (pageserver, safekeeper, compute_ctl)
- ✅ Builds PostgreSQL 17 from source
- ✅ Compiles Neon extensions
- ✅ Creates optimized production image (~2GB)

### 2. Start Neon Stack

```bash
# Start all Neon services
docker compose -f tools/compose/docker-compose.neon.yml up -d

# Check status
docker ps | grep neon

# Expected output:
# neon-pageserver  (running)
# neon-safekeeper  (running)
# neon-compute     (running)
```

### 3. Initialize Database

```bash
# Create workspace database and schema
bash scripts/database/init-neon-workspace.sh

# Test connection
bash scripts/database/test-neon-connection.sh
```

### 4. Configure Workspace App

```bash
# Update .env
export LIBRARY_DB_STRATEGY=neon

# Restart workspace service
docker compose -f tools/compose/docker-compose.apps.yml restart workspace

# Check logs
docker logs apps-workspace -f
```

---

## Build Options

### Build Specific Version

```bash
# Build stable release
bash scripts/database/build-neon-from-source.sh --version release-6849

# Build latest development version
bash scripts/database/build-neon-from-source.sh --version main
```

### Force Rebuild (No Cache)

```bash
# Useful if build failed or you want clean build
bash scripts/database/build-neon-from-source.sh --no-cache
```

---

## Architecture

### Neon Components

```
┌─────────────────────────────────────────┐
│ Neon Compute (Port 55432 internal)     │
│ - PostgreSQL 17 + Neon extensions       │
│ - Handles SQL queries                   │
│ - Connects to pageserver for storage    │
└────────────┬───────────┬────────────────┘
             │           │
     ┌───────┘           └───────┐
     ↓                           ↓
┌──────────────────┐    ┌──────────────────┐
│ Neon Pageserver  │    │ Neon Safekeeper  │
│ (Port 6400)      │    │ (Port 5454)      │
│ - Storage layer  │←──→│ - WAL service    │
│ - HTTP API 9898  │    │ - HTTP API 7676  │
└──────────────────┘    └──────────────────┘
```

### Why From Source?

Building from source gives you:
- ✅ **Full Neon features**: Database branching, autoscaling
- ✅ **Latest version**: Access to newest features and fixes
- ✅ **Customization**: Can modify build flags if needed
- ✅ **No registry dependency**: Self-contained build

**Alternative**: Using `postgres:17-alpine` would be simpler but lacks Neon-specific features like database branching.

---

## Troubleshooting

### Build Fails with "out of disk space"

```bash
# Clean Docker cache
docker system prune -a --volumes

# Check available space
df -h

# Free up space (remove old images)
docker images | grep "<none>" | awk '{print $3}' | xargs docker rmi
```

### Build Times Out

```bash
# Increase Docker build timeout
export DOCKER_CLIENT_TIMEOUT=1800
export COMPOSE_HTTP_TIMEOUT=1800

# Retry build
bash scripts/database/build-neon-from-source.sh
```

### Rust Compilation Errors

```bash
# Update Rust in builder
docker build --no-cache --target builder \
  -f tools/compose/neon.Dockerfile \
  -t neon-builder .

# Check Rust version
docker run --rm neon-builder rustc --version
```

### PostgreSQL Build Fails

Check build logs for missing dependencies:

```bash
# Common fix: Install postgresql-server-dev
docker run --rm -it debian:bookworm-slim bash
apt-get update && apt-get install -y postgresql-server-dev-all
```

---

## Advanced Usage

### Multi-stage Build Inspection

```bash
# Build only builder stage
docker build --target builder \
  -f tools/compose/neon.Dockerfile \
  -t neon-builder .

# Inspect builder contents
docker run --rm -it neon-builder bash
ls -la /build/neon/target/release/
```

### Custom Build Flags

Edit `neon.Dockerfile` to add custom Cargo flags:

```dockerfile
# Example: Enable debug symbols
RUN cargo build --release --bins --features debug
```

### Optimize Build Cache

```bash
# Pull base image first
docker pull debian:bookworm-slim

# Use BuildKit for better caching
export DOCKER_BUILDKIT=1
docker build -f tools/compose/neon.Dockerfile -t neon-local:latest .
```

---

## Performance

### Build Metrics

| Stage | Time (1st build) | Time (cached) | Disk Usage |
|-------|------------------|---------------|------------|
| Rust deps | ~10 min | ~1 min | 2GB |
| Neon binaries | ~15 min | ~2 min | 500MB |
| PostgreSQL | ~5 min | ~1 min | 1GB |
| Final image | ~1 min | ~30s | 2GB |
| **Total** | **~30 min** | **~5 min** | **5.5GB** |

### Runtime Resource Usage

| Component | RAM | CPU | Disk |
|-----------|-----|-----|------|
| Pageserver | ~512MB | ~20% | Variable |
| Safekeeper | ~256MB | ~10% | Variable |
| Compute | ~512MB | ~30% | Variable |
| **Total** | **~1.3GB** | **~60%** | **~5GB** |

---

## Comparison: Build vs Pre-built Image

| Aspect | Build from Source ✅ | Pre-built Image |
|--------|---------------------|-----------------|
| **Setup Time** | ~30 min | ~2 min |
| **Features** | Full Neon | Limited |
| **Database Branching** | ✅ Yes | ❌ No |
| **Customization** | ✅ Full | ❌ None |
| **Updates** | Manual rebuild | `docker pull` |
| **Disk Space** | 5.5GB | 300MB |
| **Complexity** | High | Low |

**Recommendation**: Build from source for **production** and **testing database branching**. Use PostgreSQL vanilla for simple development.

---

## Next Steps

After successful build:

1. ✅ Test database branching (unique Neon feature)
2. ✅ Run performance benchmarks
3. ✅ Set up automated backups
4. ✅ Configure monitoring (Prometheus)
5. ✅ Document team runbooks

---

## Resources

- **Neon GitHub**: https://github.com/neondatabase/neon
- **Neon Docs**: https://neon.tech/docs
- **Build Guide**: https://github.com/neondatabase/neon/blob/main/docs/developer-guide.md
- **Setup Guide**: `docs/content/database/neon-setup.mdx`
- **ADR**: `docs/content/reference/adrs/007-workspace-neon-migration.md`

---

## Support

For build issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Docker logs: `docker logs neon-pageserver`
3. Check GitHub issues: https://github.com/neondatabase/neon/issues
4. Fallback to PostgreSQL vanilla if blocked

---

**Last Updated**: 2025-11-03  
**Build Tested On**: Docker 24.0+, Ubuntu 22.04, WSL2  
**Maintainer**: TradingSystem Database Team


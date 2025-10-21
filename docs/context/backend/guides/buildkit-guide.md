---
title: BuildKit Build System Guide
sidebar_position: 30
tags: [backend, buildkit, docker, build, optimization]
domain: ops
type: guide
summary: Implementation guide for BuildKit build system with local and distributed caching strategies
status: active
last_review: 2025-10-17
---

# BuildKit Build System Guide

## Overview

This guide covers the BuildKit build system implementation in the TradingSystem project, including local and distributed caching strategies.

## Features

- ✅ Local BuildKit daemon with optimized configuration
- ✅ Local file system caching (>90% build time reduction)
- ✅ Registry-based distributed cache
- ✅ Build monitoring and metrics
- ✅ Multi-platform support

## Quick Start

### Basic Build
```bash
# Use the wrapper script for simple builds
./infrastructure/scripts/buildkit-wrapper-cached.sh build \
    context_dir \
    dockerfile_dir \
    image_name:tag
```

### Build with Registry Cache
```bash
# Use registry cache for distributed builds
./infrastructure/scripts/buildkit-wrapper-cached.sh build-registry \
    context_dir \
    dockerfile_dir \
    image_name:tag
```

## Cache Performance

Our tests show significant performance improvements:

- First build (no cache): ~3.8s
- Second build (local cache): ~0.35s (90% faster)
- Build with registry cache: ~0.4s (89% faster)

## Components

### 1. BuildKit Daemon
- Standalone installation
- Optimized configuration in `/etc/buildkit/buildkitd.toml`
- Multi-worker support
- Resource limits and monitoring

### 2. Local Cache
- Path: `/var/cache/buildkit-cache`
- Automatic garbage collection
- Layer deduplication
- Persistent across builds

### 3. Registry Cache
- Local registry on port 5000
- Secure configuration
- Automatic pruning
- Health monitoring

### 4. Build Wrapper
Unified interface for all build operations in `infrastructure/scripts/buildkit-wrapper-cached.sh`:
- Local builds
- Registry cache builds
- Cache management
- Build monitoring

## Configuration Files

### BuildKit Configuration
```toml
# /etc/buildkit/buildkitd.toml
[worker.oci]
  max-parallelism = 4

[worker.containerd]
  enabled = true
  snapshotter = "overlayfs"

[registry."localhost:5000"]
  http = true
  insecure = true

# Cache configuration
[worker.oci.gc]
  enabled = true
  policy = [
    { keepDuration = "48h", filters = [ "type==source.local" ] },
    { keepDuration = "1440h", keepBytes = "100GB" },
  ]
```

### Registry Configuration
```yaml
# infrastructure/registry/config.yml
version: 0.1
storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
```

## Cache Management

### Local Cache
- Location: `/var/cache/buildkit-cache`
- Automatic cleanup after 48 hours
- Size limit: 100GB
- Layer deduplication enabled

### Registry Cache
- Location: `localhost:5000/cache`
- Automatic pruning after 7 days
- Health monitoring
- Secure configuration

## Best Practices

1. **Use Local Cache First**
   - Faster than registry cache
   - No network overhead
   - Automatic management

2. **Registry Cache for CI/CD**
   - Share cache between builds
   - Persistent across machines
   - Automatic pruning

3. **Layer Optimization**
   - Order Dockerfile commands by change frequency
   - Use multi-stage builds
   - Leverage BuildKit's advanced features

4. **Resource Management**
   - Monitor cache size
   - Configure GC policies
   - Set appropriate limits

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Fix permissions
   sudo chown -R root:buildkit /var/cache/buildkit-cache
   sudo chmod -R 2775 /var/cache/buildkit-cache
   ```

2. **Registry Connection Failed**
   ```bash
   # Check registry status
   curl -s http://localhost:5000/v2/_catalog
   # Restart registry if needed
   docker restart outros-containers-registry
   ```

3. **Cache Not Working**
   ```bash
   # Clear corrupted cache
   ./infrastructure/scripts/buildkit-wrapper-cached.sh clean-cache
   ```

### Monitoring

- Check BuildKit status:
  ```bash
  sudo systemctl status buildkit
  ```

- View BuildKit logs:
  ```bash
  sudo journalctl -u buildkit
  ```

- Monitor registry:
  ```bash
  docker logs -f outros-containers-registry
  ```

## Script Reference

### buildkit-wrapper-cached.sh
```bash
# Build with local cache
./infrastructure/scripts/buildkit-wrapper-cached.sh build context dockerfile tag

# Build with registry cache
./infrastructure/scripts/buildkit-wrapper-cached.sh build-registry context dockerfile tag

# Clean cache
./infrastructure/scripts/buildkit-wrapper-cached.sh clean-cache

# Show debug info
./infrastructure/scripts/buildkit-wrapper-cached.sh debug
```

## Related Links

- [Official BuildKit Documentation](https://github.com/moby/buildkit)
- [Docker Registry Documentation](https://docs.docker.com/registry/)
- [Build Cache Documentation](https://docs.docker.com/build/cache/)

# BuildKit Experimental Scripts

⚠️ **EXPERIMENTAL - USE WITH CAUTION**

This directory contains experimental scripts for Docker BuildKit setup and optimization.

## ⚠️ Warning

These scripts are **EXPERIMENTAL** and may:
- Modify Docker daemon configuration
- Change BuildKit cache settings
- Affect Docker build performance
- Require Docker daemon restart

**Only use these scripts if:**
- You understand what BuildKit is
- You're experiencing Docker build performance issues
- You're willing to troubleshoot if something breaks
- You have backups of your Docker configuration

## 📦 Available Scripts

### Setup Scripts

- **`buildkit-install-buildkit.sh`** - Install or upgrade BuildKit
- **`buildkit-setup-buildkit-cache-improved.sh`** - Configure BuildKit cache (improved version)
- **`buildkit-setup-registry-cache.sh`** - Setup registry cache for faster pulls

### Testing & Validation

- **`buildkit-test-buildkit-cache.sh`** - Test BuildKit cache functionality
- **`buildkit-wrapper-cached.sh`** - Wrapper for cached builds

### Troubleshooting

- **`buildkit-fix-buildkit-permissions.sh`** - Fix BuildKit permission issues

## 🚀 Usage

1. **Read the script** before running it
2. **Understand what it does**
3. **Backup your Docker configuration** (`/etc/docker/daemon.json`)
4. **Run the script** and monitor output
5. **Test your Docker builds** after changes

Example:
```bash
# Read the script first
cat buildkit-install-buildkit.sh

# Backup Docker config
sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup

# Run the script
bash buildkit-install-buildkit.sh

# Test
docker buildx version
```

## 📚 Resources

- [Docker BuildKit Documentation](https://docs.docker.com/build/buildkit/)
- [BuildKit GitHub](https://github.com/moby/buildkit)
- [Docker Build Cache](https://docs.docker.com/build/cache/)

## 🔙 Rollback

If something breaks:

```bash
# Restore Docker config
sudo cp /etc/docker/daemon.json.backup /etc/docker/daemon.json

# Restart Docker
sudo systemctl restart docker

# Verify
docker info | grep BuildKit
```

---

**Status:** Experimental
**Maintainer:** TradingSystem DevOps
**Last Updated:** 2025-10-27

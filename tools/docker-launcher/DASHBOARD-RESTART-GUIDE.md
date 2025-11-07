# Dashboard Restart with Cleanup - Quick Guide

## Overview

The Dashboard restart button now includes automatic cleanup of old Docker images to prevent disk space accumulation.

## Features

✅ **Graceful Restart** - Safely restarts the dashboard-ui container
✅ **Image Cleanup** - Removes dangling (untagged) Docker images
✅ **Space Report** - Shows disk usage summary after cleanup
✅ **Visual Feedback** - Color-coded output for easy monitoring

## How to Use

### Method 1: Via Cursor Tasks (Recommended)

1. Open Command Palette: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: "Tasks: Run Task"
3. Select: "🔄 Restart Dashboard"
4. Watch the cleanup process in the integrated terminal

### Method 2: Direct Script Execution

```bash
bash tools/docker-launcher/restart-dashboard-clean.sh
```

### Method 3: Via Docker Control CLI

```bash
tools/docker-launcher/docker-control-cli.sh restart dashboard-ui
```

## What Gets Cleaned Up?

The script removes **dangling images**, which are:
- Images with no tags (`<none>:<none>`)
- Not currently in use by any container
- Leftover from previous builds or updates
- Safe to remove (won't affect running containers)

## Example Output

```
╔════════════════════════════════════════════════════════════════╗
║  Restart Dashboard + Cleanup                                   ║
╚════════════════════════════════════════════════════════════════╝

→ Restarting dashboard-ui...
✓ Container restarted successfully
→ Waiting for container to be ready...
→ Removing dangling images...
  Found 11 dangling image(s)
✓ Removed 11 dangling image(s)
→ Docker disk usage summary:
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          31        29        15.11GB   5.55GB (36%)
Containers      39        39        127.5MB   0B (0%)
Local Volumes   42        24        4.689GB   3.433GB (73%)
Build Cache     54        0         4.697GB   4.697GB

╔════════════════════════════════════════════════════════════════╗
║  Dashboard restarted and cleanup completed!                    ║
╚════════════════════════════════════════════════════════════════╝

Container status:
dashboard-ui: Up 5 seconds (health: starting)

Dashboard URL: http://localhost:3103
```

## When to Use

Use this restart when:
- Dashboard needs to reload after code changes
- Frontend build was updated
- Container seems stuck or unresponsive
- You want to free up disk space from old images

## Safety Notes

- ✅ **Safe to run anytime** - Only removes unused images
- ✅ **Won't affect running containers** - Active images are protected
- ✅ **Graceful restart** - Container stops cleanly before restart
- ⚠️ **Brief downtime** - Dashboard unavailable for ~5 seconds during restart

## Disk Space Savings

Typical cleanup removes:
- **5-15 dangling images** per restart
- **100MB - 2GB** of disk space (varies by image size)
- Prevents gradual accumulation over weeks/months

## Troubleshooting

### "No dangling images to remove"
This is normal! It means your Docker environment is already clean.

### Container fails to restart
Check if the container exists:
```bash
docker ps -a | grep dashboard-ui
```

If not, start the full stack:
```bash
bash scripts/presets/startup-all-services.sh
```

### Permission denied
Ensure you're in the docker group:
```bash
groups | grep docker
```

If not, run the installation again:
```bash
sudo bash tools/docker-launcher/install.sh
```

## Related Documentation

- **[Docker Control Server README](README.md)** - Complete API reference
- **[Installation Guide](INSTALL.md)** - Setup instructions
- **[Cursor Integration Guide](CURSOR-GUIDE.md)** - IDE setup

## Script Location

```
/home/marce/Projetos/TradingSystem/tools/docker-launcher/restart-dashboard-clean.sh
```

## Maintenance

The script requires no maintenance. It automatically:
- Detects dangling images
- Handles empty cleanup (no images to remove)
- Provides clear feedback on all operations
- Reports disk space status

---

**Last Updated:** 2025-11-07
**Script Version:** 1.0.0
**Tested With:** Docker 24.0+, dashboard-ui container

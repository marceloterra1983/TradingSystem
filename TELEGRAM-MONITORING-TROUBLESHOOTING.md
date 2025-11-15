# 🔧 Telegram Monitoring Stack - Troubleshooting Guide

**Issue**: Prometheus and Grafana containers in restart loop
**Date**: 2025-11-14
**Status**: 🔴 INVESTIGATING

---

## 📊 Symptom

```bash
$ docker ps | grep telegram
telegram-prometheus    Restarting (2) 26 seconds ago
telegram-grafana       Restarting (1) 9 seconds ago
```

**Error in logs:**
```
ts=2025-11-14T18:00:53.840Z caller=main.go:487 level=error
msg="Error loading config (--config.file=/etc/prometheus/custom/prometheus.yml)"
file=/etc/prometheus/custom/prometheus.yml
err="open /etc/prometheus/custom/prometheus.yml: no such file or directory"
```

---

## 🔍 Root Cause Analysis

### Investigation Steps

#### 1. Verified config file exists on host
```bash
$ ls -la /workspace/tools/compose/telegram/monitoring/prometheus.yml
-rw-r--r-- 1 vscode vscode 3242 Nov 13 20:05 prometheus.yml
```
✅ **File exists**

#### 2. Checked Docker Compose volume configuration
```yaml
volumes:
  - ./telegram/monitoring:/etc/prometheus/custom:ro
```
✅ **Configuration correct**

#### 3. Tested volume mount with temporary container
```bash
$ docker run --rm -v "$(pwd)/telegram/monitoring:/test:ro" alpine ls -la /test/
drwxr-xr-x    2 root     root            40 Nov 14 18:12 dashboards
drwxr-xr-x    2 root     root            40 Nov 14 18:12 grafana-datasources.yml
drwxr-xr-x    2 root     root            40 Nov 14 18:12 postgres-exporter-queries.yml
# prometheus.yml is MISSING!
```
❌ **File not mounted in volume!**

#### 4. Verified file timestamp
```bash
$ ls -l telegram/monitoring/
-rwxr-xr-x 1 vscode vscode 1253 Nov  3 20:17 grafana-datasources.yml*
-rwxr-xr-x 1 vscode vscode 4119 Nov  3 20:17 postgres-exporter-queries.yml*
-rw-r--r-- 1 vscode vscode 3242 Nov 13 20:05 prometheus.yml  ← Modified AFTER stack start!
```

**⚠️ KEY FINDING**: `prometheus.yml` was modified on Nov 13 20:05, which is **AFTER** the other config files (Nov 3).

---

## 🎯 Root Cause

**Docker Desktop/WSL2 bind mount issue**: When a file is created or modified AFTER a container with a volume mount is started, the file may not be visible inside the container due to:

1. **Bind mount caching** - Docker caches directory listings
2. **inotify limitations** - WSL2 may not propagate file changes to running containers
3. **Volume initialization** - Volumes are initialized at container creation, not runtime

---

## ✅ Solutions

### Solution 1: Recreate ALL containers (RECOMMENDED)

**Why**: Forces Docker to re-scan the directory and pick up new files.

```bash
cd /workspace/tools/compose

# Stop entire Telegram stack
docker compose -f docker-compose.4-2-telegram-stack.yml down

# Remove volumes (⚠️ CAUTION: Loses Prometheus/Grafana data)
docker volume rm telegram-prometheus-data telegram-grafana-data

# Recreate stack
docker compose -f docker-compose.4-2-telegram-stack.yml up -d
```

**Pros**: Clean slate, guaranteed to work
**Cons**: Loses historical metrics data

### Solution 2: Recreate only monitoring containers (SAFER)

```bash
cd /workspace/tools/compose

# Stop and remove Prometheus + Grafana
docker compose -f docker-compose.4-2-telegram-stack.yml stop telegram-prometheus telegram-grafana
docker compose -f docker-compose.4-2-telegram-stack.yml rm -f telegram-prometheus telegram-grafana

# Recreate containers
docker compose -f docker-compose.4-2-telegram-stack.yml up -d telegram-prometheus telegram-grafana
```

**Pros**: Keeps metrics data (volumes preserved)
**Cons**: May not work if Docker's directory cache is the issue

### Solution 3: Copy file into running container (TEMPORARY)

```bash
# Stop container
docker stop telegram-prometheus

# Copy file directly into volume
docker cp tools/compose/telegram/monitoring/prometheus.yml \
  telegram-prometheus:/etc/prometheus/custom/prometheus.yml

# Start container
docker start telegram-prometheus
```

**Pros**: Quick fix
**Cons**: Not persistent, loses config on container recreate

---

## 🛡️ Prevention Strategies

### 1. Pre-create all config files BEFORE starting stack

**DO THIS:**
```bash
# 1. Create all config files
touch tools/compose/telegram/monitoring/prometheus.yml
touch tools/compose/telegram/monitoring/grafana-datasources.yml

# 2. Populate files
cat > tools/compose/telegram/monitoring/prometheus.yml <<EOF
global:
  ...
EOF

# 3. Start containers
docker compose up -d
```

**DON'T DO THIS:**
```bash
# ❌ Start containers first
docker compose up -d

# ❌ Then create config (too late!)
vim tools/compose/telegram/monitoring/prometheus.yml
```

### 2. Use named volumes instead of bind mounts for configs

**Current (problematic):**
```yaml
volumes:
  - ./telegram/monitoring:/etc/prometheus/custom:ro  # Bind mount
```

**Alternative (more reliable):**
```yaml
volumes:
  - prometheus-config:/etc/prometheus/custom:ro  # Named volume

volumes:
  prometheus-config:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${PWD}/telegram/monitoring
```

### 3. Restart containers after config changes

**Best practice:**
```bash
# After modifying any config file
docker compose restart telegram-prometheus telegram-grafana
```

### 4. Use docker compose config validation

```bash
# Validate before starting
cd tools/compose
docker compose -f docker-compose.4-2-telegram-stack.yml config > /dev/null
```

---

## 📋 Recommended Fix Procedure

**For this specific issue:**

1. **Backup current data** (if needed):
   ```bash
   docker cp telegram-prometheus:/prometheus /workspace/backups/prometheus-data-$(date +%Y%m%d)
   ```

2. **Stop entire Telegram stack**:
   ```bash
   cd /workspace/tools/compose
   docker compose -f docker-compose.4-2-telegram-stack.yml down
   ```

3. **Verify all config files exist**:
   ```bash
   ls -la telegram/monitoring/
   # Should show: prometheus.yml, grafana-datasources.yml, etc.
   ```

4. **Start stack from correct directory**:
   ```bash
   # ⚠️ IMPORTANT: Always run from tools/compose/
   cd /workspace/tools/compose
   docker compose -f docker-compose.4-2-telegram-stack.yml up -d
   ```

5. **Verify containers are healthy**:
   ```bash
   docker ps --filter "name=telegram-prometheus"
   docker logs telegram-prometheus --tail 20
   ```

6. **Test Prometheus is accessible**:
   ```bash
   docker exec telegram-prometheus wget -qO- http://localhost:9090/-/healthy
   # Should return "Prometheus Server is Healthy."
   ```

---

## 🔗 Related Issues

- **N8N proxy fix**: NOT related - different stack, different issue
- **Gateway centralization**: NOT related - different compose file
- **Previous Telegram issues**: See `TELEGRAM-ISSUES-SUMMARY.md`

---

## ✍️ Lessons Learned

1. **Always run docker compose from the directory containing the compose file**
   - Relative paths (`./telegram/monitoring`) only work from correct directory

2. **Don't modify config files after containers are running**
   - Docker may not pick up file changes in bind mounts
   - Always recreate containers after config changes

3. **WSL2 + Docker Desktop has bind mount limitations**
   - File changes may not propagate to running containers
   - Consider using named volumes for important configs

4. **Test volume mounts with temporary containers**
   ```bash
   docker run --rm -v "$(pwd)/config:/test:ro" alpine ls -la /test/
   ```

---

**Document Status**: 🔴 Issue Open - Awaiting fix execution
**Next Action**: Execute Solution 1 (Recreate stack) or Solution 2 (Recreate monitoring containers)
**Expected Resolution Time**: 5 minutes

**Created**: 2025-11-14 15:27 BRT
**Last Updated**: 2025-11-14 15:27 BRT

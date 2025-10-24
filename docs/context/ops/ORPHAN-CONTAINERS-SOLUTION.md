---
title: "Docker Compose Orphan Containers - Definitive Solution"
tags: [docker, docker-compose, troubleshooting, infrastructure]
domain: ops
type: guide
summary: "Complete solution for Docker Compose orphan container warnings"
status: active
last_review: "2025-10-20"
sidebar_position: 1
---

# Docker Compose Orphan Containers - Definitive Solution

## 🎯 Problem Statement

When running `docker compose up`, you see warnings like:

```
WARN[0000] Found orphan containers ([data-frontend-apps]) for this project.
If you removed or renamed this service in your compose file, you can run
this command with the --remove-orphans flag to clean it up.
```

**Impact:**
- ⚠️ Confusing warnings during startup
- ⚠️ Containers might be incorrectly stopped/removed
- ⚠️ Indicates configuration issues

---

## 🔍 Root Cause

**Multiple compose files using the same project name!**

### The Issue

Docker Compose uses the `name:` field (or directory name if not specified) to group containers into projects. When two different compose files use the same project name, Docker thinks containers from one file are "orphans" of the other.

**In our case:**

```yaml
# tools/compose/docker-compose.timescale.yml
name: database  # ❌ Conflict!

# tools/compose/docker-compose.frontend-apps.yml  
name: database  # ❌ Same name!
```

**Result:**
- `docker compose -f timescale.yml up` sees `data-frontend-apps` as orphan
- `docker compose -f frontend-apps.yml up` sees TimescaleDB containers as orphans

---

## ✅ Solution Implemented

### 1. Fixed Project Name Conflict

**Changed:**
```yaml
# tools/compose/docker-compose.frontend-apps.yml
name: frontend-apps  # ✅ Unique!
```

**Now all project names are unique:**

| Compose File | Project Name | Status |
|--------------|--------------|--------|
| `docker-compose.timescale.yml` | `database` | ✅ Unique |
| `docker-compose.frontend-apps.yml` | `frontend-apps` | ✅ Unique |
| `docker-compose.infra.yml` | `infrastructure` | ✅ Unique |
| `docker-compose.data.yml` | `tradingsystem-data` | ✅ Unique |
| `docker-compose.docs.yml` | `documentation` | ✅ Unique |
| `docker-compose.langgraph-dev.yml` | `langgraph-dev` | ✅ Unique |
| `monitoring/docker-compose.yml` | `monitoring` | ✅ Unique |

### 2. Created Cleanup Script

**Script:** [`scripts/docker/cleanup-orphans.sh`](../../../scripts/docker/cleanup-orphans.sh)

**What it does:**
1. ✅ Identifies orphan containers
2. ✅ Verifies all compose files have unique names
3. ✅ Cleans up orphans with `--remove-orphans`
4. ✅ Restarts affected services
5. ✅ Validates the fix

**Usage:**
```bash
bash scripts/docker/cleanup-orphans.sh
```

### 3. Created Validation Script

**Script:** [`scripts/docker/validate-compose-names.sh`](../../../scripts/docker/validate-compose-names.sh)

**What it does:**
1. ✅ Scans all compose files
2. ✅ Extracts project names
3. ✅ Detects duplicates
4. ✅ Reports conflicts with file paths
5. ✅ Provides fix instructions

**Usage:**
```bash
bash scripts/docker/validate-compose-names.sh
```

**Run before committing changes to compose files!**

---

## 🚀 Quick Fix

### Step 1: Run Cleanup

```bash
cd /home/marce/projetos/TradingSystem
bash scripts/docker/cleanup-orphans.sh
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════════╗
║       Docker Compose - Orphan Containers Cleanup               ║
╚════════════════════════════════════════════════════════════════╝

[1/4] Identifying orphan containers...
✓ No orphan containers found

[2/4] Verifying compose file project names...
Project names in use:
  • database
  • documentation
  • frontend-apps
  • infrastructure
  • langgraph-dev
  • monitoring
  • tradingsystem-data

✓ All project names are unique

[3/4] Cleaning up orphan containers...
✓ Cleaned

[4/4] Restarting services...
✓ Started

✓ Cleanup complete!
✓ No orphan containers detected
```

### Step 2: Validate (Optional)

```bash
bash scripts/docker/validate-compose-names.sh
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════════╗
║     Docker Compose - Project Names Validation                 ║
╚════════════════════════════════════════════════════════════════╝

[1/3] Finding compose files...
✓ Found 7 compose files

[2/3] Extracting project names...
✓ database
  File: tools/compose/docker-compose.timescale.yml

✓ frontend-apps
  File: tools/compose/docker-compose.frontend-apps.yml

...

[3/3] Validation results...
✓ All project names are unique!

╔════════════════════════════════════════════════════════════════╗
║                  ✓ VALIDATION PASSED                          ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🔧 How Docker Compose Project Names Work

### The Basics

Docker Compose uses **project names** to group related containers.

**Project name is determined by (in order):**
1. `name:` field in compose file (highest priority)
2. `-p` / `--project-name` CLI flag
3. `COMPOSE_PROJECT_NAME` environment variable
4. Directory name containing compose file (default)

### Example

```yaml
# docker-compose.yml
name: myproject  # ← Project name

services:
  web:
    container_name: myproject-web  # ← Container name
```

**Result:**
- Project name: `myproject`
- Container name: `myproject-web`
- All containers with project `myproject` are managed together

### Why Unique Names Matter

```yaml
# File 1: docker-compose.db.yml
name: database
services:
  postgres:
    container_name: db-postgres

# File 2: docker-compose.app.yml  
name: database  # ❌ CONFLICT!
services:
  api:
    container_name: app-api
```

**What happens:**
```bash
docker compose -f docker-compose.db.yml up
# Creates: db-postgres (project: database)

docker compose -f docker-compose.app.yml up
# Creates: app-api (project: database)
# Sees: db-postgres as "orphan" (not in app.yml)
# Warning: "Found orphan containers [db-postgres]"
```

**Fix:**
```yaml
# File 2: docker-compose.app.yml
name: application  # ✅ Unique!
services:
  api:
    container_name: app-api
```

---

## 🛡️ Prevention

### 1. Always Use Unique Project Names

**Best practices:**
```yaml
# ✅ Good: Descriptive and unique
name: frontend-apps
name: timescaledb-cluster
name: monitoring-stack
name: documentation-services

# ❌ Bad: Generic and likely to conflict
name: database
name: app
name: services
```

### 2. Run Validation Before Commit

Add to pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating Docker Compose project names..."
if ! bash scripts/docker/validate-compose-names.sh; then
    echo "❌ Compose validation failed!"
    exit 1
fi
```

### 3. Use Naming Convention

**Recommended pattern:**
```
name: {category}-{purpose}
```

**Examples:**
- `data-timescaledb` (category: data, purpose: timescaledb)
- `frontend-apps` (category: frontend, purpose: apps)
- `infra-langgraph` (category: infra, purpose: langgraph)
- `mon-prometheus` (category: mon, purpose: prometheus)

---

## 🧪 Testing

### Verify No Orphans

```bash
# Start TimescaleDB
docker compose -f tools/compose/docker-compose.timescale.yml up -d

# Start Frontend Apps DB  
docker compose -f tools/compose/docker-compose.frontend-apps.yml up -d

# Check for warnings (should be none)
docker compose -f tools/compose/docker-compose.timescale.yml ps
docker compose -f tools/compose/docker-compose.frontend-apps.yml ps
```

**Expected:** No "Found orphan containers" warnings

### List All Projects

```bash
docker compose ls
```

**Expected output:**
```
NAME                STATUS              CONFIG FILES
database            running(8)          tools/compose/docker-compose.timescale.yml
documentation       running(2)          tools/compose/docker-compose.docs.yml
frontend-apps       running(1)          tools/compose/docker-compose.frontend-apps.yml
infrastructure      running(4)          tools/compose/docker-compose.infra.yml
langgraph-dev       running(3)          tools/compose/docker-compose.langgraph-dev.yml
monitoring          running(4)          tools/monitoring/docker-compose.yml
```

All project names should be **unique**.

---

## 📊 Before vs After

### Before (Problem)

```
$ docker compose -f timescale.yml up
WARN[0000] Found orphan containers ([data-frontend-apps])

$ docker compose -f frontend-apps.yml up  
WARN[0000] Found orphan containers ([data-timescaledb, ...])
```

**Cause:** Both files use `name: database`

### After (Fixed)

```
$ docker compose -f timescale.yml up
[+] Running 8/8
 ✔ Container data-timescaledb  Running  # No warnings!

$ docker compose -f frontend-apps.yml up
[+] Running 1/1
 ✔ Container data-frontend-apps  Running  # No warnings!
```

**Fix:** `timescale.yml` uses `name: database`, `frontend-apps.yml` uses `name: frontend-apps`

---

## 🔍 Troubleshooting

### Still Seeing Orphan Warnings?

**1. Check for duplicate names:**
```bash
bash scripts/docker/validate-compose-names.sh
```

**2. Clean up manually:**
```bash
docker compose -f <file>.yml down --remove-orphans
docker compose -f <file>.yml up -d
```

**3. Nuclear option (removes ALL containers):**
```bash
docker compose down --remove-orphans
docker system prune -f
```

### Container Name Conflicts

Different from project name conflicts:

```yaml
# File 1
name: project1
services:
  db:
    container_name: my-db  # ❌ Explicit name

# File 2
name: project2
services:
  database:
    container_name: my-db  # ❌ Same container name!
```

**Fix:** Use unique container names or let Docker Compose generate them:

```yaml
# File 1
name: project1
services:
  db:
    # Container name: project1-db-1 (auto-generated)

# File 2  
name: project2
services:
  database:
    # Container name: project2-database-1 (auto-generated)
```

---

## 📚 Related Documentation

- [Docker Compose CLI](https://docs.docker.com/compose/reference/)
- [Compose File Specification](https://docs.docker.com/compose/compose-file/)
- [Universal Startup Commands](./universal-commands.md)
- [Service Startup Guide](./service-startup-guide.md)

---

## 🎯 Summary

**Problem:** Duplicate `name:` fields in compose files
**Solution:** Changed `frontend-apps.yml` from `name: database` to `name: frontend-apps`
**Tools:** Created cleanup and validation scripts
**Result:** ✅ No more orphan container warnings

**Key takeaway:** Always use unique project names in compose files!

---

**Fixed:** 2025-10-20  
**Files changed:** 1 compose file, 2 new scripts, 1 documentation  
**Status:** ✅ Production ready

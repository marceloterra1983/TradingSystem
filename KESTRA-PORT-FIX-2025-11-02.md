# Kestra Port Conflict Fix - 2025-11-02

**Problem**: Kestra failing to start due to port 8080 conflict with Adminer  
**Status**: ✅ Solution created  
**Action Required**: Run setup script

---

## ❌ Problem Identified

### Error Message
```
Error response from daemon: failed to set up container networking: 
driver failed programming external connectivity on endpoint tools-kestra: 
Bind for 0.0.0.0:8080 failed: port is already allocated
```

### Root Cause

**Port 8080 Conflict**:
- ✅ `data-timescale-admin` (Adminer) - Already running on 8080
- ❌ `tools-kestra` - Trying to start on 8080

**Missing Environment Variables**:
```bash
# These variables are MISSING from .env:
KESTRA_HTTP_PORT=8080          # Defaults to 8080 → CONFLICT!
KESTRA_DB_HOST
KESTRA_DB_PORT
KESTRA_DB_NAME
KESTRA_DB_USER
KESTRA_DB_PASSWORD
KESTRA_BASICAUTH_USERNAME
KESTRA_BASICAUTH_PASSWORD
```

---

## ✅ Solution

### Quick Fix (Automated Script)

**Script Created**: `scripts/setup/add-kestra-env.sh`

**What it does**:
1. Adds all required Kestra variables to `.env`
2. **Uses port 8180** (avoids conflict with Adminer:8080)
3. Configures database connection
4. Sets up authentication
5. Configures storage directories

**Execute**:
```bash
bash scripts/setup/add-kestra-env.sh
```

---

### Variables to be Added

```bash
# Kestra Database (PostgreSQL)
KESTRA_DB_HOST=kestra-postgres
KESTRA_DB_PORT=5432
KESTRA_DB_NAME=kestra
KESTRA_DB_USER=kestra
KESTRA_DB_PASSWORD=kestra_password_change_in_production

# Kestra Web UI Authentication
KESTRA_BASICAUTH_USERNAME=admin
KESTRA_BASICAUTH_PASSWORD=admin_change_in_production

# Kestra HTTP Ports (8180 to avoid conflict with Adminer:8080)
KESTRA_HTTP_PORT=8180
KESTRA_MANAGEMENT_PORT=8181

# Kestra Storage
KESTRA_WORKDIR_DIR=./tools/kestra/workdir
KESTRA_STORAGE_DIR=./tools/kestra/storage
```

---

## 🎯 Port Assignment

### Before (Conflict)
```
8080 - Adminer           ✅ Running
8080 - Kestra (default)  ❌ CONFLICT!
```

### After (No Conflict)
```
8080 - Adminer           ✅ Running
8180 - Kestra Web UI     ✅ New Port
8181 - Kestra Mgmt API   ✅ New Port
```

---

## 📋 Validation Steps

### 1. Add Variables
```bash
bash scripts/setup/add-kestra-env.sh
```

### 2. Restart Services
```bash
bash scripts/start.sh
```

### 3. Verify Kestra Started
```bash
# Should see in logs:
# ✓ tools-kestra started

# Test access
curl -I http://localhost:8180

# Should return: HTTP/1.1 401 Unauthorized (auth required)
```

### 4. Access Kestra UI
```
URL: http://localhost:8180
Username: admin
Password: admin_change_in_production
```

---

## 🔧 Manual Fix (Alternative)

If you prefer to add variables manually:

```bash
# Edit .env
nano /home/marce/Projetos/TradingSystem/.env

# Add the following section at the end:

# ============================================================================
# Kestra Workflow Orchestration
# ============================================================================

# Kestra Database (PostgreSQL)
KESTRA_DB_HOST=kestra-postgres
KESTRA_DB_PORT=5432
KESTRA_DB_NAME=kestra
KESTRA_DB_USER=kestra
KESTRA_DB_PASSWORD=kestra_password_change_in_production

# Kestra Web UI Authentication
KESTRA_BASICAUTH_USERNAME=admin
KESTRA_BASICAUTH_PASSWORD=admin_change_in_production

# Kestra HTTP Ports (using 8180 to avoid conflict with Adminer:8080)
KESTRA_HTTP_PORT=8180
KESTRA_MANAGEMENT_PORT=8181

# Kestra Storage Directories
KESTRA_WORKDIR_DIR=./tools/kestra/workdir
KESTRA_STORAGE_DIR=./tools/kestra/storage
```

---

## 📚 Related Documentation

- **Port Mapping**: `docs/content/tools/ports-services/overview.mdx`
- **Kestra Configuration**: `tools/compose/docker-compose.tools.yml`
- **Environment Variables**: `docs/content/tools/security-config/env.mdx`

---

## 🎯 Summary

### Issues Found
1. ✅ telegram-gateway-api - Syntax error (FIXED)
2. ✅ Kestra port conflict - Missing env vars (SOLUTION CREATED)

### Files Modified
1. ✅ `backend/api/telegram-gateway/src/routes/telegramGateway.js`
2. ✅ `scripts/setup/add-kestra-env.sh` (NEW)

### Next Action
```bash
bash scripts/setup/add-kestra-env.sh
bash scripts/start.sh
```

---

**Status**: ✅ **SOLUTION READY - AWAITING EXECUTION**

**Created**: 2025-11-02  
**Updated**: 2025-11-02


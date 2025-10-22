# WebScraper API - Startup Fix

## Problem Summary

The WebScraper API (port 3700) fails to start due to:
1. **Port 3700 conflict** - Previous instance still running or zombie process
2. **Missing PID directory** - `/tmp/tradingsystem-pids/` doesn't exist
3. **Possible database schema issues** - Missing `webscraper` schema setup

## Solution

A comprehensive fix script has been created that handles all issues automatically.

### Quick Fix (Recommended)

```bash
# Make executable and run
chmod +x fix-webscraper.sh
./fix-webscraper.sh
```

The script will:
1. ✅ Create required directories (`/tmp/tradingsystem-pids/`, `/tmp/tradingsystem-logs/`)
2. ✅ Kill any process occupying port 3700
3. ✅ Clean up old PID files
4. ✅ Verify database container is running
5. ✅ Check/setup webscraper schema if needed
6. ✅ Start WebScraper API
7. ✅ Wait and verify service is listening on port 3700

### Expected Output

```
🔧 WebScraper API - Complete Fix
==================================

📁 Step 1: Creating required directories...
   ✅ Directories created

🔫 Step 2: Freeing port 3700...
   ⚠️  Found process on port 3700: node (PID: 12345)
   🔫 Killing process...
   ✅ Port 3700 freed

🧹 Step 3: Cleaning old PID file...
   ✅ Cleanup complete

🗄️  Step 4: Checking database...
   ✅ Database container is running

🔍 Step 5: Verifying webscraper schema...
   ✅ Schema 'webscraper' exists

🚀 Step 6: Starting WebScraper API...
   🔄 Service started with PID: 67890

⏳ Step 7: Waiting for port 3700 to be ready...
...

✅ SUCCESS! WebScraper API is running
====================================

📊 Service Details:
   URL:  http://localhost:3700
   PID:  67890
   Logs: /tmp/tradingsystem-logs/webscraper-api.log

🔍 Quick Tests:
   curl http://localhost:3700/health
   curl http://localhost:3700

📈 Check all services:
   status-quick
```

### Verify Fix

After running the fix script, verify all services are running:

```bash
# Quick status check
status-quick

# Full status with details
status

# Test WebScraper API
curl http://localhost:3700/health
curl http://localhost:3700
```

Expected result: **7/7 services running** ✅

## Manual Fix (Alternative)

If you prefer to fix manually:

### Step 1: Create Directories
```bash
mkdir -p /tmp/tradingsystem-pids
mkdir -p /tmp/tradingsystem-logs
```

### Step 2: Kill Process on Port 3700
```bash
# Find PID
lsof -ti:3700

# Kill it (replace with actual PID)
kill -9 $(lsof -ti:3700)
```

### Step 3: Verify Database Schema
```bash
# Check if schema exists
docker exec data-frontend-apps psql -U frontend_admin -d frontend_apps \
  -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name='webscraper';"

# If not exists, run setup
cd backend/api/webscraper-api
bash scripts/quick-setup.sh
```

### Step 4: Start Service
```bash
cd backend/api/webscraper-api
npm run dev > /tmp/tradingsystem-logs/webscraper-api.log 2>&1 &
echo $! > /tmp/tradingsystem-pids/webscraper-api.pid
```

### Step 5: Verify
```bash
# Check if listening
lsof -ti:3700

# Check logs
tail -f /tmp/tradingsystem-logs/webscraper-api.log

# Test endpoint
curl http://localhost:3700/health
```

## Troubleshooting

### Service Still Won't Start

1. **Check logs**:
   ```bash
   tail -f /tmp/tradingsystem-logs/webscraper-api.log
   ```

2. **Verify database is running**:
   ```bash
   docker ps | grep data-frontend-apps
   ```

3. **Check environment variables**:
   ```bash
   grep WEBSCRAPER_ .env
   ```

4. **Test database connection**:
   ```bash
   docker exec data-frontend-apps psql -U app_webscraper -d frontend_apps -c "\conninfo"
   ```

### Port Still Occupied After Kill

If port 3700 is still occupied after killing:

```bash
# Force kill all node processes on port 3700
lsof -ti:3700 | xargs kill -9

# Wait 2 seconds
sleep 2

# Verify port is free
lsof -ti:3700 || echo "Port is free"
```

### Database Schema Missing

If schema setup fails:

```bash
cd backend/api/webscraper-api

# Manual database setup
docker exec -i data-frontend-apps psql -U frontend_admin -d frontend_apps < scripts/setup-database.sql

# Run migrations
export WEBSCRAPER_DATABASE_URL="postgresql://app_webscraper:app_webscraper_dev_password@localhost:5444/frontend_apps?schema=webscraper"
npx prisma migrate deploy
```

## Prevention

To prevent this issue in the future:

1. **Always use `stop` command** before `start`:
   ```bash
   stop            # Graceful shutdown
   start           # Clean startup
   ```

2. **Use status monitoring**:
   ```bash
   status-quick    # Quick check
   status          # Full details
   ```

3. **Check logs regularly**:
   ```bash
   tail -f /tmp/tradingsystem-logs/*.log
   ```

## Integration with Startup Script

The `start-tradingsystem` script has been updated to:
- Create PID/logs directories automatically
- Check for port conflicts before starting
- Kill zombie processes if needed

However, if you encounter issues, use this fix script as a definitive solution.

## Related Files

- **Fix Script**: [fix-webscraper.sh](fix-webscraper.sh)
- **Alternative Scripts**:
  - [scripts/services/fix-webscraper-port.sh](scripts/services/fix-webscraper-port.sh)
  - [scripts/services/restart-webscraper-api.sh](scripts/services/restart-webscraper-api.sh)
- **Database Setup**: [backend/api/webscraper-api/scripts/quick-setup.sh](backend/api/webscraper-api/scripts/quick-setup.sh)
- **Startup Script**: [scripts/startup/start-tradingsystem-full.sh](scripts/startup/start-tradingsystem-full.sh)

## Next Steps

After fixing the WebScraper API:

1. ✅ Run `status-quick` to verify all 7 services are running
2. ✅ Test WebScraper API endpoints
3. ✅ Commit any pending changes
4. ✅ Update documentation if needed

---

**Last Updated**: 2025-10-20
**Status**: Active Fix Script

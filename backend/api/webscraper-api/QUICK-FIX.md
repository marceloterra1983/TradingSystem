# WebScraper API - Quick Fix Guide

## ⚡ Error: Port 3700 Already in Use

### 🔍 Symptom

```
Error: listen EADDRINUSE: address already in use :::3700
```

### ✅ Quick Solution (One Command)

```bash
# Kill process using port 3700 and start service
cd /home/marce/projetos/TradingSystem/backend/api/webscraper-api
chmod +x scripts/fix-port-conflict.sh
bash scripts/fix-port-conflict.sh
```

### 🛠️ Alternative Solutions

#### Option 1: Kill Manually

```bash
# Find process ID
lsof -ti:3700

# Or using netstat
netstat -tulpn | grep 3700

# Kill the process (replace PID with actual number)
kill -9 <PID>

# Example:
# lsof -ti:3700  → returns 123456
# kill -9 123456
```

#### Option 2: Change Port

Edit `/home/marce/projetos/TradingSystem/.env`:

```bash
# Change from:
WEBSCRAPER_API_PORT=3700

# To:
WEBSCRAPER_API_PORT=3701
```

Then restart:

```bash
cd backend/api/webscraper-api
npm run dev
```

#### Option 3: Use Kill Script with Confirmation

```bash
cd backend/api/webscraper-api
bash scripts/fix-port-conflict.sh
# Will ask for confirmation before killing
```

### 🔄 After Fixing Port

```bash
# Start the service
cd backend/api/webscraper-api
npm run dev

# Verify it's running
curl http://localhost:3700/health | jq
```

### 📊 Expected Output

```json
{
  "status": "healthy",
  "timestamp": "2025-10-20T...",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 1.234
}
```

---

## 🚀 Complete Setup (If First Time)

If this is your first time setting up, run:

```bash
cd /home/marce/projetos/TradingSystem
bash backend/api/webscraper-api/scripts/quick-setup.sh
```

This will:
- ✅ Add environment variables
- ✅ Create database user and schema
- ✅ Run Prisma migrations
- ✅ Validate setup

---

## 🆘 Still Having Issues?

### Check Database Connection

```bash
# Test PostgreSQL connection
docker exec data-frontend-apps psql -U frontend_admin -d frontend_apps -c "\l"

# Check if webscraper schema exists
docker exec data-frontend-apps psql -U frontend_admin -d frontend_apps -c "\dn"

# Check if tables exist
docker exec data-frontend-apps psql -U frontend_admin -d frontend_apps -c "
SET search_path TO webscraper;
\dt
"
```

### Check Logs

```bash
# Service logs
tail -f /tmp/tradingsystem-logs/webscraper-api.log

# Container logs
docker logs data-frontend-apps --tail 50
```

### Re-run Setup

If database seems corrupted:

```bash
# Re-run setup (safe, won't duplicate)
bash backend/api/webscraper-api/scripts/quick-setup.sh
```

---

## 📚 Full Documentation

- **Setup Guide**: `backend/api/webscraper-api/SETUP-GUIDE.md`
- **README**: `backend/api/webscraper-api/README.md`
- **Environment Template**: `backend/api/webscraper-api/.env.example`

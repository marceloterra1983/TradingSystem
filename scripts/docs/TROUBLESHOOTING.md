# Health Dashboard Troubleshooting Guide

**Quick reference for common issues with Health Monitoring scripts**

---

## 🚨 EMERGENCY: Script is Hanging/Frozen

### Immediate Actions

1. **Use Kill Switch (Safest):**
   ```bash
   # From another terminal
   touch /tmp/health-dashboard-STOP
   ```
   Script will detect and stop gracefully within seconds.

2. **Ctrl+C (Graceful):**
   ```bash
   # In the terminal running the script
   Press Ctrl+C
   ```
   Script should shutdown gracefully.

3. **Force Kill (Last Resort):**
   ```bash
   # Find process
   ps aux | grep -E "(check-links|validate-frontmatter|run-all-health)"
   
   # Kill specific process
   kill -9 <PID>
   
   # Kill all related processes
   pkill -9 -f "health"
   ```

4. **Close Cursor:**
   ```bash
   # If Cursor is frozen
   ps aux | grep -i cursor
   kill -9 <CURSOR_PID>
   ```

### Prevention

✅ **Always use V2 scripts** (anti-hang protected):
- `run-all-health-tests-v2.sh` instead of `run-all-health-tests.sh`
- `check-links-v2.py` instead of `check-links.py`

---

## 📌 Common Issues & Solutions

### Issue 1: "ModuleNotFoundError: No module named 'yaml'"

**Cause:** Python dependencies not installed

**Solution:**
```bash
# Install dependencies
bash scripts/docs/install-dependencies.sh

# Or manually
pip install PyYAML requests tqdm python-dotenv
```

**Verification:**
```bash
python3 -c "import yaml, requests; print('OK')"
```

---

### Issue 2: "Pre-flight check failed"

**Cause:** Environment doesn't meet requirements

**Solution:**
```bash
# Run pre-flight check to see specific issues
bash scripts/docs/pre-flight-check.sh

# Common fixes:
# 1. Update Python
sudo apt install python3.10  # or newer

# 2. Free disk space
sudo apt clean
sudo apt autoremove

# 3. Free memory
free -h
# Close unnecessary applications
```

---

### Issue 3: "Port 3004 already in use"

**Cause:** Previous Docusaurus instance still running

**Solution:**
```bash
# Find and kill process
lsof -ti:3004 | xargs kill -9

# Wait and verify
sleep 2
lsof -i:3004  # Should be empty

# Or use different port
cd docs/docusaurus
npm run start -- --port 3005
```

---

### Issue 4: "Documentation API not responding"

**Cause:** Docker container not running

**Solution:**
```bash
# Check container status
docker ps --filter "name=docs-documentation-api"

# Start container
docker compose -f infrastructure/compose/docker-compose.docs.yml up -d documentation-api

# Check logs
docker logs docs-documentation-api --tail 50

# Test endpoint
curl http://localhost:3400/health
```

---

### Issue 5: "Request timeout" on external links

**Cause:** Network issues or slow servers

**Solution:**
```bash
# Option 1: Skip external links (fastest)
export SKIP_EXTERNAL_LINKS=true
bash scripts/docs/run-all-health-tests-v2.sh

# Option 2: Increase timeout
export HTTP_TIMEOUT=10
python3 scripts/docs/check-links-v2.py --timeout 10

# Option 3: Reduce limit
export MAX_EXTERNAL_LINKS=10
python3 scripts/docs/check-links-v2.py --max-external-links 10
```

---

### Issue 6: "Script timeout after 600s"

**Cause:** Script exceeded maximum execution time

**Solution:**
```bash
# Edit config/health-dashboard.env
MAX_EXECUTION_TIME=1200  # 20 minutes

# Or skip slow operations
export SKIP_EXTERNAL_LINKS=true
export VALIDATE_ANCHORS=false
```

---

### Issue 7: "Memory limit exceeded"

**Cause:** Processing too many files

**Solution:**
```bash
# Free memory
free -h
sudo sync && sudo sysctl vm.drop_caches=3

# Reduce load
export MAX_FILES_TO_PROCESS=100

# Close other applications
```

---

### Issue 8: "Permission denied" on scripts

**Cause:** Scripts not executable

**Solution:**
```bash
# Make scripts executable
chmod +x scripts/docs/*.sh
chmod +x scripts/docs/*.py

# Verify
ls -la scripts/docs/*.sh
```

---

### Issue 9: Cache issues

**Cause:** Stale or corrupted cache

**Solution:**
```bash
# Clear URL validation cache
rm -f /tmp/link-validation-cache.json

# Clear Docusaurus cache
cd docs/docusaurus
rm -rf .docusaurus
npm run clear

# Disable cache temporarily
python3 scripts/docs/check-links-v2.py --disable-cache
```

---

### Issue 10: "Kill switch file won't delete"

**Cause:** Permissions or file lock

**Solution:**
```bash
# Force remove
sudo rm -f /tmp/health-dashboard-STOP

# Check if file exists
ls -la /tmp/health-dashboard-STOP

# Alternative kill switch location
export KILL_SWITCH_FILE=/tmp/my-custom-stop
```

---

## 🔍 Diagnostic Commands

### Check System Health

```bash
# CPU and memory
top -bn1 | head -20

# Disk space
df -h

# Running processes
ps aux | grep -E "(python|bash|node)" | head -20

# Network
ping -c 3 8.8.8.8
```

### Check Script Status

```bash
# Find running health scripts
ps aux | grep -E "(check-links|validate-frontmatter|run-all-health)"

# Check logs
tail -f logs/health-monitoring/*.log

# Check configuration
cat config/health-dashboard.env
```

### Check Dependencies

```bash
# Python version
python3 --version

# Installed packages
pip list | grep -E "(PyYAML|requests|tqdm)"

# Docker status
docker ps --filter "name=docs"

# Port usage
lsof -i:3004
lsof -i:3400
```

---

## 🧪 Testing Scripts Safely

### Test in Isolation

```bash
# Test single file
python3 scripts/docs/validate-frontmatter.py \
    --docs-dir ./docs/context/backend \
    --output /tmp/test.json

# Test with small sample
python3 scripts/docs/check-links-v2.py \
    --docs-dir ./docs/context/backend \
    --max-external-links 5 \
    --timeout 2
```

### Dry Run

```bash
# Pre-flight check only (no execution)
bash scripts/docs/pre-flight-check.sh

# Skip actual validation
export SKIP_EXTERNAL_LINKS=true
export VALIDATE_ANCHORS=false
```

### Monitor Resources

```bash
# Watch memory usage
watch -n 1 free -h

# Watch CPU
top

# Watch processes
watch -n 1 'ps aux | grep python | head -10'
```

---

## 📝 Collecting Debug Information

### For Bug Reports

```bash
# Create debug bundle
mkdir -p /tmp/health-debug

# System info
uname -a > /tmp/health-debug/system.txt
python3 --version >> /tmp/health-debug/system.txt
free -h >> /tmp/health-debug/system.txt
df -h >> /tmp/health-debug/system.txt

# Configuration
cp config/health-dashboard.env /tmp/health-debug/

# Logs
cp logs/health-monitoring/*.log /tmp/health-debug/ 2>/dev/null || true

# Process list
ps aux > /tmp/health-debug/processes.txt

# Package
tar czf health-debug-$(date +%Y%m%d-%H%M%S).tar.gz -C /tmp health-debug/

echo "Debug bundle created: health-debug-*.tar.gz"
```

---

## 🔄 Reset to Clean State

### Complete Reset

```bash
# Stop all processes
pkill -f "health"
pkill -f "docusaurus"

# Clear caches
rm -f /tmp/link-validation-cache.json
rm -f /tmp/health-dashboard-STOP
rm -rf docs/docusaurus/.docusaurus

# Clear logs (optional)
rm -rf logs/health-monitoring/*

# Reinstall dependencies
bash scripts/docs/install-dependencies.sh --upgrade

# Run pre-flight
bash scripts/docs/pre-flight-check.sh
```

---

## 📞 Getting Help

### Check Documentation

1. **Main README:** `scripts/docs/README-V2.md`
2. **Configuration:** `config/health-dashboard.env`
3. **Health Monitoring Guide:** `docs/context/ops/monitoring/health-monitoring.md`

### Before Asking for Help

✅ Run pre-flight check
✅ Check logs
✅ Try safe mode (skip external links)
✅ Collect debug information

### What to Include in Bug Reports

- System information (`uname -a`, `python3 --version`)
- Error messages (full text)
- Steps to reproduce
- Configuration file (redacted)
- Logs (last 50 lines)
- Expected vs actual behavior

---

**Last Updated:** 2025-10-19  
**Version:** 2.0.0

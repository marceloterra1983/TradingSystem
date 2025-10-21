# Health Dashboard - Quick Start Guide

**⚡ Get up and running in 2 minutes**

---

## 🎯 One-Command Setup & Run

```bash
# Install dependencies, validate environment, and run tests
bash scripts/docs/install-dependencies.sh && \
bash scripts/docs/pre-flight-check.sh && \
bash scripts/docs/run-all-health-tests-v2.sh
```

**That's it!** ✅

---

## 📋 Step-by-Step (First Time)

### 1. Install Dependencies (30 seconds)

```bash
bash scripts/docs/install-dependencies.sh
```

Expected output:
```
[✓] Required packages installed
[✓] Optional packages installed
✓ PyYAML 6.0
✓ requests 2.28.2
```

### 2. Pre-Flight Check (10 seconds)

```bash
bash scripts/docs/pre-flight-check.sh
```

Expected output:
```
[✓] Pre-flight check PASSED - all systems go!
```

### 3. Run Health Tests (2-5 minutes)

```bash
bash scripts/docs/run-all-health-tests-v2.sh
```

Expected output:
```
[✓] All health tests completed successfully!
```

---

## 🔥 Common Use Cases

### Fast Mode (Skip External Links)

```bash
export SKIP_EXTERNAL_LINKS=true
bash scripts/docs/run-all-health-tests-v2.sh
```

⏱️ **Execution time:** ~30 seconds

### Safe Mode (First Run)

```bash
# Lower limits for testing
export MAX_EXTERNAL_LINKS=10
export HTTP_TIMEOUT=2
bash scripts/docs/run-all-health-tests-v2.sh
```

⏱️ **Execution time:** ~1 minute

### Full Audit

```bash
# Default settings, validate everything
bash scripts/docs/run-all-health-tests-v2.sh
```

⏱️ **Execution time:** 2-5 minutes

---

## 🚨 Emergency Stop

### If Script Hangs

**From another terminal:**
```bash
touch /tmp/health-dashboard-STOP
```

Script will detect and stop within seconds.

### Force Kill (Last Resort)

```bash
ps aux | grep health
kill -9 <PID>
```

---

## ⚙️ Quick Configuration

### Customize Behavior

Edit `config/health-dashboard.env`:

```bash
# Faster but less thorough
HTTP_TIMEOUT=2
MAX_EXTERNAL_LINKS=20
SKIP_EXTERNAL_LINKS=true

# More thorough but slower
HTTP_TIMEOUT=10
MAX_EXTERNAL_LINKS=500
VALIDATE_ANCHORS=true
```

---

## 📊 What Gets Validated

✅ **Frontmatter** - YAML in all markdown files  
✅ **Links** - Internal and external links  
✅ **Duplicates** - Duplicate content detection  
✅ **API** - Health endpoints  
✅ **System** - Diagnostics and checks

---

## 📝 Next Steps

After successful run:

1. **View Results:**
   ```bash
   ls -lh docs/reports/
   ```

2. **Start Docusaurus:**
   ```bash
   bash scripts/docs/start-docusaurus-health.sh
   ```

3. **Access Dashboard:**
   ```
   http://localhost:3004/health
   ```

---

## 🆘 Troubleshooting

### Problem: "Python dependencies missing"

```bash
pip install PyYAML requests tqdm python-dotenv
```

### Problem: "Port 3004 in use"

```bash
lsof -ti:3004 | xargs kill -9
```

### Problem: "Script hangs"

```bash
# Kill switch
touch /tmp/health-dashboard-STOP

# Or force kill
pkill -9 -f health
```

### Problem: "Pre-flight check failed"

```bash
# See specific issue
bash scripts/docs/pre-flight-check.sh

# Common fixes:
# - Free disk space: sudo apt clean
# - Update Python: sudo apt install python3.10
# - Free memory: Close apps
```

---

## 📖 Full Documentation

- **Complete Guide:** `scripts/docs/README-V2.md`
- **Troubleshooting:** `scripts/docs/TROUBLESHOOTING.md`
- **Implementation:** `scripts/docs/IMPLEMENTATION-SUMMARY.md`

---

## ✅ Checklist

- [ ] Dependencies installed
- [ ] Pre-flight check passed
- [ ] Health tests completed
- [ ] No errors in output
- [ ] Reports generated in `docs/reports/`

---

**Quick Reference:**

```bash
# Install
bash scripts/docs/install-dependencies.sh

# Validate
bash scripts/docs/pre-flight-check.sh

# Run (safe)
export SKIP_EXTERNAL_LINKS=true
bash scripts/docs/run-all-health-tests-v2.sh

# Run (full)
bash scripts/docs/run-all-health-tests-v2.sh

# Emergency stop
touch /tmp/health-dashboard-STOP
```

---

**Last Updated:** 2025-10-19  
**Version:** 2.0.0

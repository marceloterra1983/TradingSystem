# Dangerous Maintenance Scripts

🚨 **DANGER ZONE - DESTRUCTIVE OPERATIONS**

This directory contains **AGGRESSIVE** cleanup and maintenance scripts that can:
- **DELETE DATA**
- **STOP ALL SERVICES**
- **REMOVE DOCKER RESOURCES**
- **CAUSE DOWNTIME**

## 🚨 CRITICAL WARNING

**DO NOT RUN THESE SCRIPTS unless you:**

1. ✅ **Understand exactly what they do**
2. ✅ **Have complete backups**
3. ✅ **Can afford downtime**
4. ✅ **Have tested in a non-production environment first**
5. ✅ **Are prepared to manually recover if something breaks**

## 📦 Available Scripts

### Cleanup Scripts

#### `cleanup-and-restart.sh`

**What it does:**
- Stops ALL services (Docker + Node.js)
- Removes Docker containers, volumes, networks
- Cleans temporary files
- Restarts the entire system

**Risks:**
- ⚠️ **DATA LOSS** - Removes unnamed volumes
- ⚠️ **DOWNTIME** - All services stopped
- ⚠️ **SLOW RESTART** - Full system rebuild

**Use case:** Nuclear option when system is completely broken

#### `cleanup-aggressive.sh`

**What it does:**
- Force removes ALL Docker resources
- Cleans build cache
- Removes dangling images
- Prunes system aggressively

**Risks:**
- ⚠️ **REMOVES IMAGES** - Will need to re-download
- ⚠️ **CACHE LOSS** - Builds will be slower
- ⚠️ **NETWORK ISSUES** - May break running containers

**Use case:** Recovering disk space, fixing Docker state corruption

## 🔒 Safe Alternatives

**Before running these scripts, try safer alternatives:**

### Instead of `cleanup-and-restart.sh`:
```bash
# Restart individual services
bash scripts/universal/stop.sh
bash scripts/universal/start.sh

# Or restart specific Docker stacks
docker compose -f tools/compose/docker-compose.infra.yml restart
```

### Instead of `cleanup-aggressive.sh`:
```bash
# Gentle cleanup
docker system prune -f

# Clean build cache only
docker builder prune -f

# Remove specific unused images
docker image prune -f
```

## 🧪 Testing Before Use

**ALWAYS test in a safe environment first:**

```bash
# 1. Create a test directory
mkdir -p /tmp/test-dangerous-script

# 2. Copy the script
cp cleanup-aggressive.sh /tmp/test-dangerous-script/

# 3. Review the script
cat /tmp/test-dangerous-script/cleanup-aggressive.sh

# 4. Test with --dry-run if available
bash /tmp/test-dangerous-script/cleanup-aggressive.sh --dry-run

# 5. Only then run in production (with backups!)
```

## 📋 Pre-Flight Checklist

Before running ANY script in this directory:

- [ ] **Backups verified** - Database, volumes, configs
- [ ] **Maintenance window scheduled** - System will be down
- [ ] **Team notified** - Others know system will restart
- [ ] **Monitoring paused** - Don't trigger false alerts
- [ ] **Script reviewed** - You understand every command
- [ ] **Rollback plan** - You know how to recover
- [ ] **Test environment validated** - Script worked there first

## 🔧 Manual Recovery

If a script breaks something:

### Service Won't Start
```bash
# Check logs
docker compose -f tools/compose/docker-compose.infra.yml logs --tail=100

# Rebuild from scratch
docker compose -f tools/compose/docker-compose.infra.yml up -d --force-recreate
```

### Data Lost
```bash
# Restore from backup
bash scripts/database/restore-backup.sh

# Verify restoration
bash scripts/maintenance/health-check-all.sh
```

### Docker Broken
```bash
# Restart Docker daemon
sudo systemctl restart docker

# Verify Docker is healthy
docker info
docker ps
```

## 📊 Monitoring After Execution

After running a dangerous script, monitor:

```bash
# Check system health
bash scripts/maintenance/health-check-all.sh

# Verify all services running
bash scripts/universal/status.sh

# Check Docker resources
docker stats --no-stream

# Verify database connectivity
docker exec -it timescaledb psql -U postgres -c "SELECT version();"
```

## 📞 Emergency Contacts

If you break something:

1. **Stop the damage:** `Ctrl+C` to cancel the script
2. **Assess impact:** Run health checks
3. **Restore from backup:** Use backup scripts
4. **Document the incident:** What went wrong, how to prevent

---

## 📝 Script Modification Guidelines

If you need to modify these scripts:

1. **Add dry-run mode** - Test without making changes
2. **Add confirmation prompts** - Force user to confirm
3. **Add logging** - Record what was deleted
4. **Add rollback** - Allow undo if possible
5. **Update this README** - Document changes

---

**Status:** ⚠️ Dangerous - Use with extreme caution
**Maintainer:** TradingSystem DevOps
**Last Updated:** 2025-10-27

**Remember:** With great power comes great responsibility. These scripts can save you when things are broken, but they can also break things if used carelessly.

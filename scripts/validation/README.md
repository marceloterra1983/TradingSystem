# Validation Scripts

This directory contains scripts for validating the container renaming migration (Phase 6).

## Scripts

### phase6-validation.sh
**Purpose**: Comprehensive validation orchestrator for Phase 6  
**Usage**: `bash scripts/validation/phase6-validation.sh`  
**Duration**: ~30-45 minutes  
**Output**: `validation-results-YYYYMMDD-HHMMSS.log`

**What it does:**
1. Pre-flight checks (Docker, freeze notice, backups)
2. Sequential stack startup (data → monitoring → docs → infra → firecrawl)
3. Health check validation (9 services)
4. Test suite execution (4 test suites)
5. Integration validation (Service Launcher, Firecrawl proxy, Dashboard)
6. Container name verification
7. Results summary and reporting

**Exit codes:**
- `0`: All validations passed
- `1`: Critical failures (stack startup, health checks)
- `2`: Test failures (non-critical)
- `3`: Integration failures

### verify-container-names.sh
**Purpose**: Verify container naming convention compliance  
**Usage**: `bash scripts/validation/verify-container-names.sh`  
**Duration**: ~30 seconds

**What it does:**
1. Checks for legacy container names (should not exist)
2. Verifies standardized prefixes are present
3. Confirms critical containers are running

**Exit codes:**
- `0`: All names verified
- `1`: Legacy names found or expected containers missing

## Prerequisites

- Docker daemon running
- All compose files in place
- Root `.env` file configured
- Freeze bypass enabled: `export ALLOW_FREEZE_BYPASS=1`
- Node.js and npm installed (for test suites)

## Validation Workflow

```bash
# 1. Enable freeze bypass
export ALLOW_FREEZE_BYPASS=1

# 2. Run comprehensive validation
bash scripts/validation/phase6-validation.sh

# 3. Review results
cat validation-results-*.log

# 4. Verify container names
bash scripts/validation/verify-container-names.sh

# 5. Update documentation
# - VALIDATION-CHECKLIST.md
# - FREEZE-NOTICE.md
# - docs/context/ops/validation/phase6-validation-report.md
```

## Troubleshooting

### Stack fails to start
- Check Docker daemon: `docker info`
- Verify compose files: `docker compose -f <file> config`
- Check logs: `docker compose -f <file> logs`
- Rollback: Use backups from Phase 1

### Health checks fail
- Wait longer (services may still be starting)
- Check container logs: `docker logs <container-name>`
- Verify ports are not in use: `lsof -i :<port>`
- Check network connectivity: `docker network ls`

### Tests fail
- Ensure dependencies are running (e.g., QuestDB for DocsAPI tests)
- Check test logs for specific errors
- Verify environment variables are set
- Run tests individually: `cd <service> && npm run test`

### Integration failures
- Verify Service Launcher is running: `curl http://localhost:3500/health`
- Check Firecrawl proxy config: Ensure it points to port 3002
- Verify Dashboard is accessible: `curl http://localhost:3103/`

## Rollback Procedure

If validation fails critically:

```bash
# 1. Stop all containers
bash scripts/docker/stop-stacks.sh

# 2. Restore from backup
BACKUP_DIR="backups/rename-containers-[TIMESTAMP]"
cp -r "$BACKUP_DIR/compose-originals/"* .
cp "$BACKUP_DIR/env-backup/.env" .

# 3. Restart with old configuration
bash scripts/docker/start-stacks.sh

# 4. Document incident
# - Update FREEZE-NOTICE.md
# - Create incident report
# - Review errors before retry
```

## Related Documentation

- [VALIDATION-CHECKLIST.md](../../VALIDATION-CHECKLIST.md) - Complete validation checklist
- [FREEZE-NOTICE.md](../../FREEZE-NOTICE.md) - Operational freeze status
- [Phase 6 Validation Report](../../docs/context/ops/validation/phase6-validation-report.md) - Detailed results
- [Container Naming Convention](../../docs/context/ops/tools/container-naming.md) - Naming standards

## Support

For issues or questions:
- Check troubleshooting section above
- Review validation logs
- Consult team lead
- Slack: #tradingsystem-ops

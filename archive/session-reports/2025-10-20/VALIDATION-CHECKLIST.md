# Container Renaming Validation Checklist

**Date**: $(date +%Y-%m-%d)
**Phase**: Container Renaming (Phase 2)
**Status**: In Progress

---

## 📋 Pre-Validation

- [ ] All containers stopped (verified in Phase 1)
- [ ] Backups created (verified in Phase 1)
- [ ] Branch `chore/rename-containers` active
- [ ] FREEZE-NOTICE.md updated

---

## 🔧 Compose File Validation

### docker-compose.docs.yml
- [ ] Container names updated (3 containers)
- [ ] Image names updated (3 images)
- [ ] Traefik labels updated
- [ ] Service keys reviewed
- [ ] Syntax validated: `docker compose config`
- [ ] No errors in validation output

### docker-compose.langgraph-dev.yml
- [ ] Container names updated (3 containers)
- [ ] Service keys renamed
- [ ] Environment variables updated (REDIS_URI, DATABASE_URI)
- [ ] depends_on references updated
- [ ] Labels updated
- [ ] Syntax validated: `docker compose config`
- [ ] No errors in validation output

### firecrawl-source/docker-compose.yaml
- [ ] Container names added (4 containers)
- [ ] Service keys renamed
- [ ] x-common-env variables updated (4 URLs)
- [ ] depends_on references updated
- [ ] Labels updated
- [ ] Network name updated
- [ ] Syntax validated: `docker compose config`
- [ ] No errors in validation output

### analytics-pipeline/docker-compose.yml
- [ ] Container name updated (1 container)
- [ ] Image name updated
- [ ] Network configuration fixed
- [ ] Labels added
- [ ] Syntax validated: `docker compose config`
- [ ] No errors in validation output

---

## 🔗 Dependency Updates

### docker-compose.ai-tools.yml (Infrastructure stack)
- [ ] POSTGRES_HOST updated
- [ ] QUESTDB_HOST updated
- [ ] QDRANT_HOST updated (3 services)
- [ ] DOCS_API_URL updated
- [ ] extra_hosts updated
- [ ] depends_on service keys updated (4 services)
- [ ] Service keys renamed (7 services)
- [ ] Syntax validated: `docker compose config`
- [ ] No errors in validation output

### .env.example
- [ ] FIRECRAWL_NUQ_DATABASE_URL updated
- [ ] FIRECRAWL_REDIS_URL updated
- [ ] FIRECRAWL_PLAYWRIGHT_URL updated
- [ ] Documentation comments added

### prometheus.yml
- [ ] Job name updated
- [ ] Replacement label updated

### alert-rules.yml
- [ ] Alert name updated
- [ ] Expression service label updated
- [ ] Description updated

---

## 🧪 Validation Tests

### Syntax Validation
```bash
# Run for each modified compose file
docker compose -f <file> config > /dev/null && echo "✅ Valid" || echo "❌ Invalid"
```

- [ ] docker-compose.docs.yml: Valid
- [ ] docker-compose.langgraph-dev.yml: Valid
- [ ] firecrawl-source/docker-compose.yaml: Valid
- [ ] analytics-pipeline/docker-compose.yml: Valid
- [ ] docker-compose.ai-tools.yml: Valid

### Dependency Resolution
```bash
# Check for unresolved service references
docker compose -f <file> config 2>&1 | grep -i "service.*not found"
```

- [ ] No unresolved dependencies in docs stack
- [ ] No unresolved dependencies in langgraph-dev stack
- [ ] No unresolved dependencies in firecrawl stack
- [ ] No unresolved dependencies in analytics stack
- [ ] No unresolved dependencies in infrastructure stack

### Network Validation
```bash
# Verify network configurations
docker compose -f <file> config | grep -A 5 "networks:"
```

- [ ] All networks properly defined
- [ ] External networks marked correctly
- [ ] No orphaned network references

---

## 🔧 Phase 3: Script Updates

### Grep Pattern Updates
- [ ] start-stacks.sh pattern includes `firecrawl-` and `apps-`
- [ ] status.sh pattern updated (`analytics-` → `apps-`, removed `b3-`)
- [ ] firecrawl/start.sh pattern matches `firecrawl-`
- [ ] firecrawl/stop.sh pattern matches `^firecrawl-`
- [ ] langgraph/stop-dev.sh pattern matches `infra-.*-dev`

### Container Name References
- [ ] health.sh usa `data-timescaledb` (TimescaleDB como datastore)
- [ ] langgraph/start-dev.sh logs reference `infra-langgraph-dev`
- [ ] langgraph/stop-dev.sh remaining-container tip updated

### Script Testing
- [ ] start-stacks.sh shows all container prefixes
- [ ] stop-stacks.sh stops all stacks cleanly
- [ ] status.sh lists all running containers
- [ ] firecrawl/start.sh outputs `firecrawl-*` containers
- [ ] firecrawl/stop.sh leaves no `firecrawl-*` containers
- [ ] langgraph/start-dev.sh log command works
- [ ] langgraph/stop-dev.sh stops dev containers cleanly

### Integration Testing
- [ ] Full cycle: stop-stacks.sh → start-stacks.sh → status.sh
- [ ] Firecrawl cycle: stop.sh → start.sh → verify containers
- [ ] LangGraph dev cycle: stop-dev.sh → start-dev.sh → verify logs
- [ ] Health checks: TimescaleDB e demais serviços reportam corretamente

---


---

## 🎨 Phase 4: Dashboard Updates

### TypeScript Interface Updates
- [ ] `DockerContainer` interface updated with new category types ('firecrawl', 'apps')
- [ ] Icon imports added (Globe, Layers)
- [ ] No TypeScript compilation errors

### Container Array Updates
- [ ] Fixed: `docspecs-test` → `docs-api-viewer` (port 3001 → 3101)
- [ ] Added: `docs-api` (port 3400)
- [ ] Added: `docs-docusaurus` (port 3004)
- [ ] Added: `firecrawl-api` (port 3002)
- [ ] Added: `firecrawl-playwright` (internal)
- [ ] Added: `firecrawl-redis` (internal)
- [ ] Added: `firecrawl-postgres` (internal)
- [ ] Added: `infra-langgraph-dev` (port 8112)
- [ ] Added: `infra-redis-dev` (port 6380)
- [ ] Added: `infra-postgres-dev` (port 5443)
- [ ] Total containers: 28 (was 18)

### Category Metadata Updates
- [ ] Added: Firecrawl category (Globe icon, orange theme)
- [ ] Added: Apps category (Layers icon, indigo theme)
- [ ] Updated: CollapsibleCardDescription text
- [ ] Total categories: 7 (was 5)

### Testing
- [ ] Dashboard starts successfully: `cd frontend/apps/dashboard && npm run dev`
- [ ] No console errors in browser
- [ ] All 7 category filter buttons render correctly
- [ ] Container count displays: 28 total
- [ ] All container cards render with correct information
- [ ] External URLs are clickable (docs, firecrawl-api, etc.)
- [ ] Internal-only containers display without URL links
- [ ] Category filtering works for all 7 categories
- [ ] Refresh button works without errors
- [ ] Dark mode displays correctly
- [ ] Responsive layout works on mobile/tablet

### Visual Verification
- [ ] Firecrawl category uses orange color scheme
- [ ] Apps category uses indigo color scheme
- [ ] Globe icon displays for Firecrawl
- [ ] Layers icon displays for Apps
- [ ] All port numbers are accurate
- [ ] Container descriptions are clear and concise

---

## 📚 Phase 5: Documentation Updates

### Main Documentation Files
- [ ] SERVICES-STATUS-REPORT.md: Container names updated, table expanded to 28 containers
- [ ] SERVICES-RUNNING.md: Container references updated, new containers documented
- [ ] firecrawl-stack.md: Architecture section completely rewritten with correct containers
- [ ] ops/README.md: Service port map verified and updated

### New Documentation
- [ ] container-naming.md: Created with complete naming convention guide
- [ ] YAML frontmatter: Properly formatted with all required fields
- [ ] Content sections: All 10 sections completed (rules, categories, inventory, process, etc.)
- [ ] Examples: Clear examples for each category prefix
- [ ] Process documentation: Step-by-step guide for adding new containers

### Troubleshooting Documentation
- [ ] container-startup-issues.md: Container names and ports updated
- [ ] Firecrawl commands: Updated to use correct container names and port 3002
- [ ] Docker commands: All references use standardized names

### Service Port Map
- [ ] service-port-map.md: Container name column added
- [ ] Missing services added (Firecrawl, LangGraph dev)
- [ ] Reference to container-naming.md added

### Residual References Search
- [ ] Searched for `tradingsystem-.*` pattern in docs/
- [ ] Searched for old unprefixed names (playwright-service, nuq-postgres, etc.)
- [ ] Archive files identified and left unchanged (historical records)
- [ ] Active documentation files updated
- [ ] No residual references remain in active docs

### Documentation Quality
- [ ] All markdown files have valid YAML frontmatter
- [ ] All internal links work correctly
- [ ] All code blocks have proper syntax highlighting
- [ ] All tables are properly formatted
- [ ] No broken references to old container names

### Integration Testing
- [ ] Docusaurus builds successfully: `cd docs && npm run build`
- [ ] No broken links in Docusaurus
- [ ] Search functionality works with new container names
- [ ] All documentation pages render correctly

---

## 🧪 Phase 6: Validation & Testing

### Pre-flight Checks
- [ ] Docker daemon running
- [ ] Freeze notice allows bypass (ALLOW_FREEZE_BYPASS=1)
- [ ] Backup from Phase 1 exists and is accessible
- [ ] All compose files validate: `docker compose config` passes
- [ ] Root .env file exists and has updated Firecrawl URLs

### Sequential Stack Startup
- [ ] Data stack started: `docker compose -f infrastructure/compose/docker-compose.data.yml up -d`
- [ ] TimescaleDB health check passed: `pg_isready -h localhost -p 5433`
- [ ] Monitoring stack started: `docker compose -f infrastructure/monitoring/docker-compose.yml up -d`
- [ ] Prometheus health check passed: `curl http://localhost:9090/-/healthy`
- [ ] Grafana health check passed: `curl http://localhost:3000/api/health`
- [ ] Docs stack started: `docker compose -f infrastructure/compose/docker-compose.docs.yml up -d`
- [ ] DocsAPI health check passed: `curl http://localhost:3400/health`
- [ ] Infra stack started: `docker compose -f infrastructure/compose/docker-compose.ai-tools.yml up -d`
- [ ] LangGraph health check passed: `curl http://localhost:8111/health`
- [ ] Qdrant health check passed: `curl http://localhost:6333/`
- [ ] Firecrawl stack started: `cd infrastructure/firecrawl/firecrawl-source && docker compose up -d`
- [ ] Firecrawl API health check passed: `curl http://localhost:3002/v0/health/readiness`
- [ ] All 28 containers running: `docker ps | wc -l` shows expected count

### Container Name Verification
- [ ] No legacy names exist: `docker ps -a | grep -E "(tradingsystem-|playwright-service|nuq-postgres)"` returns empty
- [ ] All prefixes present: `data-*`, `infra-*`, `mon-*`, `docs-*`, `firecrawl-*`, `apps-*`
- [ ] Verification script passed: `bash scripts/validation/verify-container-names.sh`

### Test Suite Execution
- [ ] DocsAPI tests passed: `cd backend/api/documentation-api && npm run test`
- [ ] Dashboard tests passed: `cd frontend/apps/dashboard && npm run test`
- [ ] Firecrawl Proxy integration tests passed: `cd backend/api/firecrawl-proxy && npm run test:integration`
- [ ] LangGraph validation passed: `bash infrastructure/langgraph/validate-deployment.sh`
- [ ] All test suites: 0 failures

### Integration Validation
- [ ] Service Launcher responds: `curl http://localhost:3500/health` returns 200
- [ ] Service Launcher status endpoint: `curl http://localhost:3500/api/status` returns service list
- [ ] All services in status: Check for DocsAPI, Firecrawl Proxy, Dashboard, etc.
- [ ] Firecrawl proxy reaches API: `curl -X POST http://localhost:3600/api/scrape -d '{"url":"https://example.com"}'` succeeds
- [ ] Dashboard accessible: `curl http://localhost:3103/` returns HTML (if running)
- [ ] Dashboard Docker section displays 28 containers with correct names
- [ ] Grafana dashboards load: Visit http://localhost:3000 and verify metrics

### Health Check Matrix
| Service | Port | Endpoint | Status |
|---------|------|----------|--------|
| TimescaleDB | 5433 | pg_isready | [ ] ✅ |
| Prometheus | 9090 | /-/healthy | [ ] ✅ |
| Grafana | 3000 | /api/health | [ ] ✅ |
| DocsAPI | 3400 | /health | [ ] ✅ |
| LangGraph | 8111 | /health | [ ] ✅ |
| Qdrant | 6333 | / | [ ] ✅ |
| Firecrawl API | 3002 | /v0/health/readiness | [ ] ✅ |
| Firecrawl Proxy | 3600 | /health | [ ] ✅ |
| Service Launcher | 3500 | /health | [ ] ✅ |

### Performance Validation
- [ ] Container startup time < 60s (total)
- [ ] Health check response time < 2s (average)
- [ ] No containers in restart loop
- [ ] No excessive CPU/memory usage (check `docker stats`)

### Documentation Validation
- [ ] SERVICES-STATUS-REPORT.md reflects current state
- [ ] SERVICES-RUNNING.md has correct container names
- [ ] container-naming.md exists and is complete
- [ ] All documentation references updated (Firecrawl port listed as 3002)

### Rollback Readiness
- [ ] Backup location documented: `backups/rename-containers-[TIMESTAMP]/`
- [ ] Rollback procedure tested (dry-run)
- [ ] Team notified of validation status

---

## 📝 Documentation Updates

- [ ] FREEZE-NOTICE.md updated with Phase 3 status
- [ ] Commit message prepared (Conventional Commits format)
- [ ] Changes documented in this checklist

---

## ✅ Final Verification

- [ ] All 6 phases complete
- [ ] All validation checks passed
- [ ] No critical issues found
- [ ] Ready for Phase 7 (Cleanup & Delivery)

---

## 🚨 Rollback Plan

If validation fails:

1. **Restore from backup:**
   ```bash
   BACKUP_DIR="backups/rename-containers-[TIMESTAMP]"
   cp -r "$BACKUP_DIR/compose-originals/"* .
   ```

2. **Verify restoration:**
   ```bash
   git diff
   ```

3. **Document failure:**
   - Update FREEZE-NOTICE.md with failure details
   - Create incident log
   - Review errors before retry

---

**Last Updated**: $(date +%Y-%m-%d)
**Status**: ⏳ Pending Validation

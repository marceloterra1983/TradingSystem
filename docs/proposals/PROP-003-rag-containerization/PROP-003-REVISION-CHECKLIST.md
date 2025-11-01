---
type: revision-checklist
proposal: PROP-003
title: RAG Services Containerization - Revision Checklist
date: 2025-10-31
status: mandatory-revisions
---

# PROP-003: Revision Checklist

## Critical Issues (MUST FIX - Blocking Approval)

### 1. Network Configuration ❌ CRITICAL
**Line Numbers**: 356-362, 379-380, 403-404, 436-437, 477-478, 526-527

**Current (Wrong)**:
```yaml
networks:
  rag-net:
    name: rag-net
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16  # ❌ NEW ISOLATED NETWORK
```

**Fixed (Correct)**:
```yaml
networks:
  tradingsystem_backend:
    external: true  # ✅ USE EXISTING NETWORK (172.21.0.0/16)
```

**Action Items**:
- [ ] Replace all `rag-net` references with `tradingsystem_backend`
- [ ] Remove `ipam` configuration section
- [ ] Remove ALL static IP assignments (`ipv4_address: 172.25.0.x`)
- [ ] Update architecture diagram (lines 45-76) to show `tradingsystem_backend`
- [ ] Test inter-service communication after changes

**Verification**:
```bash
# Ensure services can resolve each other
docker exec rag-llamaindex-query ping -c 1 data-qdrant
docker exec docs-api curl -f http://rag-llamaindex-query:8000/health
```

---

### 2. Ollama Memory Limit ❌ CRITICAL
**Line Numbers**: 598-607

**Current (Wrong)**:
```yaml
ollama:
  deploy:
    resources:
      limits:
        memory: 8G  # ❌ TOO LOW
```

**Fixed (Correct)**:
```yaml
ollama:
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 20G  # ✅ TESTED UNDER LOAD
      reservations:
        cpus: '2.0'
        memory: 8G
```

**Action Items**:
- [ ] Change `memory: 8G` to `memory: 20G` (line 606)
- [ ] Add explanation in proposal why 20GB is necessary:
  ```
  LLaMA 3.1 (8B): ~6-8GB when loaded
  Nomic Embed: ~2GB
  Concurrent requests: +2GB buffer
  Total: 10GB minimum, 20GB recommended
  ```
- [ ] Document current production usage: 1.17GB / 20GB (5.89%)

**Verification**:
```bash
docker stats rag-ollama --no-stream
# Should show: Memory Usage / 20GB limit
```

---

### 3. LlamaIndex Memory Limits ❌ CRITICAL
**Line Numbers**: 568-577, 578-587

**Current (Wrong)**:
```yaml
llamaindex-query:
  deploy:
    resources:
      limits:
        memory: 2G  # ❌ TOO LOW

llamaindex-ingestion:
  deploy:
    resources:
      limits:
        memory: 2G  # ❌ TOO LOW
```

**Fixed (Correct)**:
```yaml
llamaindex-query:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 4G  # ✅ TESTED (peak: 1.5GB, need headroom)
      reservations:
        cpus: '1.0'
        memory: 2G

llamaindex-ingestion:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 4G  # ✅ TESTED (peak during ingestion: 3GB)
      reservations:
        cpus: '1.0'
        memory: 2G
```

**Action Items**:
- [ ] Change both services from `2G` to `4G` (lines 574, 584)
- [ ] Document current production usage:
  - Query: 206MB typical, 1.5GB peak
  - Ingestion: 329MB typical, 3GB during large ingests

**Verification**:
```bash
docker stats rag-llamaindex-query rag-llamaindex-ingest --no-stream
# Query: 5% of 4GB, Ingestion: 8% of 4GB
```

---

### 4. Volume Paths ❌ CRITICAL
**Line Numbers**: 238, 439-440

**Current (Wrong)**:
```yaml
volumes:
  - ./docs/content:/data/docs:ro  # ❌ Wrong context (assumes root)
```

**Fixed (Correct)**:
```yaml
volumes:
  - ../../docs/content:/data/docs:ro  # ✅ Relative to tools/compose/
  - ../../tools/llamaindex/collection-config.json:/app/collection-config.json:ro
```

**Action Items**:
- [ ] Change `./docs/content` to `../../docs/content` (line 439)
- [ ] Change `./qdrant-config.yaml` to `../../tools/qdrant/config.yaml` (line 383)
- [ ] Add missing collection-config mount (line 440)
- [ ] Update Dockerfile COPY paths to match (lines 132-133, 291-293)

**Verification**:
```bash
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.rag.yml config | grep -A 2 "volumes:"
# Should show correct absolute paths after variable expansion
```

---

### 5. Proposal Framing ❌ CRITICAL
**Line Numbers**: 1-19, 802-837

**Current (Wrong)**:
```markdown
## Executive Summary
Containerizar os RAG Services (Documentation API, LlamaIndex Query e
Ingestion) em containers Docker independentes...
```

**Fixed (Correct)**:
```markdown
## Executive Summary
Otimizar e endurecer a infraestrutura RAG containerizada existente.
RAG Services já estão rodando em containers Docker há 2+ semanas,
estáveis e saudáveis. Este proposal documenta a arquitetura atual
e propõe melhorias para produção.

## Current State
- ✅ Ollama container operational (13+ hours uptime)
- ✅ LlamaIndex services containerized (17+ hours uptime)
- ✅ Documentation API containerized (stable)
- ✅ Qdrant running in container (20,539 vectors)
- ✅ Health checks passing across all services
```

**Action Items**:
- [ ] Rewrite Executive Summary (lines 17-19)
- [ ] Add "Current State" section showing existing containerization
- [ ] Remove "Migration Path" section (lines 802-837)
- [ ] Change "Phase 1: Dockerfiles Creation" to "Phase 1: Dockerfile Optimization"
- [ ] Update motivation section: "Improve existing" vs "Containerize new"

---

## Warning-Level Issues (SHOULD FIX - Non-Blocking)

### 6. Qdrant Version ⚠️ WARNING
**Line**: 373

**Current**: `qdrant/qdrant:v1.7.4` (released ~6 months ago)
**Latest Stable**: `qdrant/qdrant:v1.12.4`

**Action**:
- [ ] Update to `v1.12.4` (line 373)
- [ ] Add upgrade testing to Phase 4
- [ ] Document breaking changes (if any)

---

### 7. Ollama Version Pinning ⚠️ WARNING
**Line**: 398

**Current**: `ollama/ollama:latest` (bad practice)
**Recommended**: `ollama/ollama:0.5.4` (pinned)

**Action**:
- [ ] Pin specific version (line 398)
- [ ] Document version upgrade process
- [ ] Add model compatibility notes

---

### 8. Missing .dockerignore ⚠️ WARNING
**Location**: `tools/llamaindex/` directory

**Action**:
- [ ] Create `tools/llamaindex/.dockerignore`:
```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/
.pytest_cache/
.coverage
htmlcov/
.venv/
venv/
*.log
.env
.env.*
.DS_Store
*.swp
```

---

### 9. Multi-Stage Python Builds ⚠️ OPTIMIZATION
**Lines**: 195-231 (query), 273-305 (ingestion)

**Current**: Single-stage (913MB images)
**Target**: Multi-stage (~600MB images)

**Action**:
- [ ] Add multi-stage build to Dockerfile.query
- [ ] Add multi-stage build to Dockerfile.ingestion
- [ ] Move NLTK stopwords to external file/volume
- [ ] Document size reduction in Phase 2 deliverables

**Example**:
```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential
COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app
COPY --from=builder /install /usr/local
RUN apt-get update && apt-get install -y --no-install-recommends curl libmagic1
# ... rest of runtime
```

---

### 10. JWT Secret Handling ⚠️ SECURITY
**Lines**: 62, 106, 536

**Current**:
```yaml
- JWT_SECRET_KEY=${JWT_SECRET_KEY:-dev-secret}  # ⚠️ Weak default
```

**Recommended**:
```yaml
- JWT_SECRET_KEY=${JWT_SECRET_KEY:?JWT_SECRET_KEY must be set}  # ✅ No default
```

**Action**:
- [ ] Remove `:-dev-secret` defaults (lines 62, 106, 536)
- [ ] Add to security section: "JWT_SECRET_KEY required in .env"
- [ ] Document Docker secrets for production (Phase 5)

---

### 11. Health Check Enhancement ⚠️ IMPROVEMENT
**Line**: 418

**Current**:
```yaml
test: ["CMD-SHELL", "pgrep ollama || exit 1"]  # ⚠️ Process check only
```

**Recommended**:
```yaml
test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]  # ✅ API check
```

**Action**:
- [ ] Update Ollama health check (line 418-424)
- [ ] Already correct in proposal, just needs to be applied to actual compose file

---

## Production Documentation (MUST ADD)

### 12. Monitoring Integration ⚠️ MISSING
**Section to Add**: After line 732

```markdown
### Prometheus Integration

**Configuration**: Add to `tools/monitoring/prometheus.yml`

\```yaml
scrape_configs:
  - job_name: 'rag-services'
    static_configs:
      - targets:
          - 'documentation-api:3401'
          - 'llamaindex-query:8202'
          - 'llamaindex-ingestion:8201'
          - 'qdrant:6333'
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'ollama'
    static_configs:
      - targets: ['ollama:11434']
    metrics_path: '/api/metrics'
\```

**Grafana Dashboards**: Create dashboards for:
- RAG query latency (p50, p95, p99)
- Error rates by service
- Vector database size growth
- Model memory usage
- Request throughput
```

**Action**:
- [ ] Add Prometheus scrape configuration
- [ ] Add Grafana dashboard specifications
- [ ] Link to existing monitoring stack (mon-prometheus, mon-grafana)

---

### 13. Deployment Runbook ⚠️ MISSING
**Section to Add**: After line 688

```markdown
### Production Deployment Runbook

#### Pre-Deployment Checklist
- [ ] Backup Qdrant data: `bash scripts/docker/rag/backup.sh`
- [ ] Backup Ollama models: `bash scripts/docker/rag/backup-models.sh`
- [ ] Health check baseline: `bash scripts/maintenance/health-check-all.sh`
- [ ] Monitoring alerts configured and tested
- [ ] On-call engineer assigned

#### Deployment Steps
1. Build and tag images:
   \```bash
   IMG_VERSION=v1.3.0 bash scripts/docker/rag/build.sh
   \```

2. Deploy with rolling restart:
   \```bash
   # Restart one service at a time with health check between
   docker compose -f docker-compose.rag.yml up -d --no-deps documentation-api
   sleep 30  # Wait for health check
   docker compose -f docker-compose.rag.yml up -d --no-deps llamaindex-query
   sleep 30
   docker compose -f docker-compose.rag.yml up -d --no-deps llamaindex-ingestion
   \```

3. Post-deployment verification:
   \```bash
   bash scripts/docker/rag/health-check.sh
   curl http://localhost:3401/api/v1/rag/status | jq
   \```

#### Rollback Procedure
\```bash
docker compose -f docker-compose.rag.yml down
IMG_VERSION=v1.2.9 docker compose -f docker-compose.rag.yml up -d
bash scripts/docker/rag/health-check.sh
\```

#### Post-Deployment Monitoring
- Monitor error rates for 1 hour
- Check memory usage trends
- Verify query latency within SLA
- Review logs for warnings
```

**Action**:
- [ ] Add complete deployment runbook
- [ ] Create referenced scripts (backup.sh, health-check.sh, build.sh)
- [ ] Document rollback verification steps

---

### 14. Automated Backups ⚠️ MISSING
**Section to Add**: After line 749

```markdown
### Automated Backup Configuration

**Systemd Timer**: `/etc/systemd/system/rag-backup.timer`

\```ini
[Unit]
Description=Daily RAG Services Backup
Requires=rag-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
\```

**Systemd Service**: `/etc/systemd/system/rag-backup.service`

\```ini
[Unit]
Description=Backup RAG Services Volumes

[Service]
Type=oneshot
User=marce
WorkingDirectory=/home/marce/Projetos/TradingSystem
ExecStart=/home/marce/Projetos/TradingSystem/scripts/docker/rag/backup.sh
StandardOutput=journal
StandardError=journal
\```

**Enable**:
\```bash
sudo systemctl enable rag-backup.timer
sudo systemctl start rag-backup.timer
\```

**Verify**:
\```bash
systemctl status rag-backup.timer
systemctl list-timers | grep rag-backup
\```
```

**Action**:
- [ ] Add systemd timer configuration
- [ ] Create backup script with retention policy
- [ ] Add backup verification step
- [ ] Document restore procedure

---

### 15. Disaster Recovery Plan ⚠️ MISSING
**Section to Add**: New section after "Rollback Plan"

```markdown
### Disaster Recovery Plan

**Recovery Time Objective (RTO)**: 1 hour
**Recovery Point Objective (RPO)**: 24 hours (daily backups)

#### DR Scenarios

**Scenario 1: Single Container Failure**
1. Auto-restart via `restart: unless-stopped` ✅
2. If repeated failures: Check logs, rollback to previous version
3. RTO: 5 minutes

**Scenario 2: Host Failure**
1. Access backup host or provision cloud instance
2. Restore volumes from latest backup
3. Deploy stack: `docker compose -f docker-compose.rag.yml up -d`
4. Verify health: `bash scripts/docker/rag/health-check.sh`
5. Update DNS/load balancer
6. RTO: 1 hour

**Scenario 3: Data Corruption**
1. Stop services: `docker compose -f docker-compose.rag.yml down`
2. Restore volumes from last known good backup
3. Restart services
4. Verify vector count matches expected
5. RTO: 30 minutes

#### DR Testing
- Quarterly DR drills
- Monthly restore verification
- Document lessons learned
```

**Action**:
- [ ] Add complete DR plan
- [ ] Define RTO/RPO
- [ ] Document DR testing schedule
- [ ] Create DR drill checklist

---

## Verification After Revisions

### Network Configuration ✅
```bash
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.rag.yml config | grep -A 5 "networks:"
# Should show: tradingsystem_backend with external: true
# Should NOT show: rag-net or ipam config
```

### Resource Limits ✅
```bash
docker inspect rag-ollama --format '{{.HostConfig.Memory}}'
# Should output: 21474836480 (20GB)

docker inspect rag-llamaindex-query --format '{{.HostConfig.Memory}}'
# Should output: 4294967296 (4GB)
```

### Volume Mounts ✅
```bash
docker inspect rag-llamaindex-ingest --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'
# Should show: /home/marce/Projetos/TradingSystem/docs/content -> /data/docs
```

### Service Communication ✅
```bash
# From query to Qdrant
docker exec rag-llamaindex-query curl -f http://data-qdrant:6333/health

# From documentation-api to query
docker exec docs-api curl -f http://rag-llamaindex-query:8000/health

# From dashboard (host) to documentation-api
curl http://localhost:3401/api/v1/rag/status | jq '.status'
```

---

## Approval Checklist

Before requesting approval, ensure:

- [ ] All 5 CRITICAL issues fixed (network, resources, volumes, framing)
- [ ] Resource limits match current tested values (20GB/4GB/4GB)
- [ ] Static IPs removed from all services
- [ ] Volume paths corrected for tools/compose/ context
- [ ] Proposal reframed as optimization (not initial containerization)
- [ ] Monitoring integration documented
- [ ] Deployment runbook added
- [ ] Automated backup configuration specified
- [ ] Disaster recovery plan documented
- [ ] All verification tests pass

---

## Timeline After Approval

**Week 1** (Critical Fixes): 20 hours
- Apply network fixes
- Update resource configurations
- Validate inter-service communication
- Test full stack restart

**Week 2** (Optimization): 30 hours
- Multi-stage builds
- Update dependencies (Qdrant v1.12.4)
- Add .dockerignore files
- Optimize image layers

**Week 3** (Production Hardening): 40 hours
- Monitoring integration
- Automated backups
- Deployment scripts
- DR documentation

**Week 4** (Advanced Features): 30 hours
- Security scanning automation
- Environment-specific overlays
- Load testing
- Performance benchmarks

**Total Effort**: ~120 hours (3 weeks full-time or 4 weeks with other work)

---

## Getting Help

**Questions about revisions?**
- Review full validation report: `PROP-003-VALIDATION-REPORT.md`
- Check executive summary: `PROP-003-EXECUTIVE-SUMMARY.md`
- Consult CLAUDE.md: Section on "Environment Variables Configuration"
- Review existing compose file: `tools/compose/docker-compose.rag.yml`

**Testing resources**:
- Health check script: `scripts/maintenance/health-check-all.sh`
- Current Docker stats: `docker stats --no-stream`
- Network inspection: `docker network inspect tradingsystem_backend`
- Volume verification: `docker volume ls | grep rag`

---

**Checklist Generated**: 2025-10-31
**Total Revisions Required**: 15 (5 critical, 10 recommended)
**Estimated Revision Time**: 8-10 hours (mostly documentation)
**Next Review**: After critical issues resolved

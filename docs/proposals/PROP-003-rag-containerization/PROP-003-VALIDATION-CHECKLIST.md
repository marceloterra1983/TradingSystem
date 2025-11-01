# PROP-003 Validation Checklist

**Purpose**: Gate checkpoints for each implementation phase
**Last Updated**: 2025-10-31

---

## Phase 1: Security & Stability Hardening

### Dockerfile Validation
- [ ] All Dockerfiles build without errors
- [ ] Image sizes < 500MB each
- [ ] All healthchecks use correct ports
- [ ] No unnecessary files in images (check with `docker history`)
- [ ] Non-root users configured
- [ ] `.dockerignore` files present

### Security Validation
- [ ] Trivy scans pass (zero HIGH/CRITICAL vulnerabilities)
- [ ] Inter-service auth middleware implemented
- [ ] Inter-service auth tests pass (403 without header)
- [ ] Secrets validation prevents dev defaults in production
- [ ] Ollama has NO external port mapping

### Port Mapping Validation
- [ ] rag-service: 3400:3400
- [ ] llamaindex-query: 8202:8202
- [ ] llamaindex-ingestion: 8201:8201
- [ ] All healthchecks use internal ports

### Exit Gate ✅
- [ ] **Security scan clean**
- [ ] **Inter-service auth functional**
- [ ] **All images build**
- [ ] **Secrets validation works**

---

## Phase 2: State Management & Resilience

### Redis Infrastructure
- [ ] Redis container starts and passes healthcheck
- [ ] Redis persists data across restarts (AOF enabled)
- [ ] Memory limits enforced (256MB max)
- [ ] LRU eviction policy active

### Job Queue System
- [ ] Job creation works (PENDING state)
- [ ] Job progress tracking updates (percentage calculation)
- [ ] Job completion works (COMPLETED state)
- [ ] Job failure works (FAILED state + retry count)
- [ ] Job resumption works after crash
- [ ] 100 concurrent jobs handled

### Distributed Locking
- [ ] Lock acquisition works
- [ ] Lock prevents concurrent ingestion to same collection
- [ ] Lock timeout releases after 300s
- [ ] Lock release on success

### Circuit Breaker
- [ ] Circuit opens at 50% error rate
- [ ] Circuit half-opens after 30s
- [ ] Circuit closes after successful request
- [ ] Fallback response returned when open

### Retry Logic
- [ ] Retry happens on transient failures
- [ ] Exponential backoff works (1s, 2s, 4s)
- [ ] Max 3 retry attempts
- [ ] Permanent failures fail fast

### Rate Limiting
- [ ] Rate limiter blocks 11th request
- [ ] Rate limiter resets after 60s
- [ ] Rate limiter uses Redis storage

### Exit Gate ✅
- [ ] **Job queue handles 100 concurrent requests**
- [ ] **Circuit breaker prevents cascading failures**
- [ ] **Distributed locks prevent corruption**
- [ ] **Retry succeeds after transient failures**

---

## Phase 3: High Availability & Operations

### Ollama Separation
- [ ] ollama-embeddings container starts
- [ ] ollama-llm container starts
- [ ] ollama-embeddings has nomic-embed-text model
- [ ] ollama-llm has llama3.1 model
- [ ] Ingestion service uses embeddings only
- [ ] Query service uses both embeddings and LLM
- [ ] Resource contention eliminated (CPU vs. GPU)

### Operational Scripts
- [ ] `init.sh` provisions stack from scratch
- [ ] `migrate.sh` validates data migration
- [ ] `rollback.sh` reverts to legacy
- [ ] `health-check.sh` detects all services
- [ ] `backup.sh` creates backups
- [ ] `restore.sh` restores from backups
- [ ] `test-restore.sh` validates restore integrity

### Migration Validation
- [ ] Collection count matches (legacy vs. containerized)
- [ ] Sample queries return same results
- [ ] Performance comparison done (< 10% regression)
- [ ] Parallel operation works (legacy + container)

### Backup & Restore
- [ ] Redis backup works
- [ ] Ollama models backup works
- [ ] Restore from backup works
- [ ] Retention policy enforced (7/4/12)
- [ ] Restore test automation works

### Observability
- [ ] Prometheus scrapes all services
- [ ] Grafana dashboard displays metrics
- [ ] Alerts fire correctly (test with simulation)
- [ ] All key metrics visible (latency, error rate, throughput)

### Health Checks
- [ ] `/health` endpoint works (liveness)
- [ ] `/health/ready` endpoint works (readiness)
- [ ] `/health/live` endpoint works (liveness probe)
- [ ] Deep checks validate Qdrant connectivity
- [ ] Deep checks validate Ollama model availability

### Exit Gate ✅
- [ ] **Ollama separation eliminates SPOF**
- [ ] **Migration validated (data integrity confirmed)**
- [ ] **Backup/restore tested**
- [ ] **Monitoring operational**

---

## Phase 4: Comprehensive Testing & Validation

### Unit Testing
- [ ] 80%+ code coverage
- [ ] JWT validation tests pass
- [ ] Inter-service auth tests pass
- [ ] Circuit breaker tests pass
- [ ] Retry logic tests pass
- [ ] Rate limiting tests pass

### Integration Testing
- [ ] End-to-end query flow works
- [ ] End-to-end ingestion flow works
- [ ] Ingestion → query consistency validated
- [ ] Service discovery works
- [ ] Volume persistence works

### Chaos Engineering
- [ ] **Test 1**: Kill Ollama mid-query → circuit breaker opens
- [ ] **Test 2**: Qdrant network partition → retry succeeds
- [ ] **Test 3**: Redis crash → graceful degradation
- [ ] **Test 4**: OOM in ingestion → job resumes
- [ ] **Test 5**: Concurrent ingestion → lock prevents corruption

### Performance Regression
- [ ] Baseline metrics captured (legacy system)
- [ ] Containerized metrics captured
- [ ] p50 latency comparison (< 10% regression)
- [ ] p95 latency comparison (< 10% regression)
- [ ] p99 latency comparison (< 10% regression)
- [ ] Throughput comparison (queries/sec, docs/min)

### Load Testing
- [ ] 100 concurrent queries succeed
- [ ] p95 latency < 2s under load
- [ ] p99 latency < 5s under load
- [ ] 1000 document ingestion completes
- [ ] Sustained load (1 hour) shows no memory leaks
- [ ] Spike test validates rate limiting

### Security Penetration Testing
- [ ] **Test 1**: Access llamaindex without auth → 403
- [ ] **Test 2**: Dev secret in prod → startup fails
- [ ] **Test 3**: External Ollama access → connection refused
- [ ] **Test 4**: Malicious collection name → validation blocks
- [ ] **Test 5**: Exhaust rate limits → requests blocked

### Failover Testing
- [ ] Container crash triggers auto-restart
- [ ] Resource limits enforced (OOMKiller)
- [ ] Data persists after restart
- [ ] Graceful degradation under partial failures

### Exit Gate ✅
- [ ] **All tests pass**
- [ ] **Performance regression < 10%**
- [ ] **SLA targets met (p95 < 2s)**
- [ ] **Security tests confirm no bypasses**
- [ ] **Chaos tests validate resilience**

---

## Phase 5: Documentation, Review & Deployment

### Architecture Decision Records
- [ ] ADR: Why containerization?
- [ ] ADR: Why separate Ollama?
- [ ] ADR: Why Redis over RabbitMQ?
- [ ] ADR: Why shared secret over mTLS?

### Documentation Complete
- [ ] `CLAUDE.md` updated
- [ ] `docs/content/tools/rag/docker-deployment.mdx` created
- [ ] `docs/content/tools/rag/troubleshooting.mdx` created
- [ ] `docs/content/tools/rag/security-threat-model.mdx` created
- [ ] `docs/content/tools/rag/sla.mdx` created
- [ ] `docs/content/tools/rag/disaster-recovery.mdx` created
- [ ] PlantUML diagrams updated

### Security Review
- [ ] Threat model reviewed
- [ ] All mitigations implemented
- [ ] No secrets in images confirmed
- [ ] Inter-service auth validated
- [ ] Security scan results reviewed
- [ ] **Security sign-off obtained** ✅

### Production Deployment
- [ ] Pre-deployment checklist complete
- [ ] Deployed to production
- [ ] 24-hour monitoring complete
- [ ] SLA targets met in production
- [ ] No regressions detected
- [ ] Rollback tested

### Team Training
- [ ] Team trained on new architecture
- [ ] Operational scripts reviewed
- [ ] Failure scenarios practiced
- [ ] Monitoring dashboards demoed

### Exit Gate ✅
- [ ] **Documentation complete**
- [ ] **Security review passes** ✅
- [ ] **Production deployment successful**
- [ ] **24h monitoring shows stability**
- [ ] **Team confident in operations**

---

## Final Approval

**Mandatory Sign-Offs**:
- [ ] **Technical Lead**: Architecture approved
- [ ] **Security Team**: Security review passed
- [ ] **Project Manager**: Timeline approved (5 weeks)
- [ ] **Operations Team**: Runbook reviewed, confident in operations

**Production Readiness**:
- [ ] All validation gates passed
- [ ] Performance SLAs met
- [ ] Security requirements met
- [ ] Operational procedures documented and tested
- [ ] Team trained

---

## Emergency Rollback Criteria

Rollback to legacy system if:
- [ ] Performance regression > 15%
- [ ] Critical security vulnerability discovered
- [ ] Data corruption detected
- [ ] SLA breach (p95 > 3s for 1 hour)
- [ ] Major stability issues

**Rollback Procedure**: Execute `scripts/docker/rag/rollback.sh`

---

**Status**: ⏳ Awaiting Phase 1 kickoff
**Next Review**: After Phase 1 completion (Security Gate)

---
title: Dev Container Security Controls
sidebar_position: 6
tags: [governance, controls, dev-container, security]
domain: tools
type: sop
summary: Operational security controls and procedures for development containers
status: active
last_review: "2025-11-13"
---

# Dev Container Security Controls

## Purpose

This document defines the operational security controls, procedures, and checklists for securing development containers in the TradingSystem project.

## Control Categories

### 1. Pre-Deployment Security Controls

#### 1.1 Image Scanning
**Control ID**: `DC-SEC-001`

**Requirement**: All container images **MUST** be scanned for vulnerabilities before deployment.

**Procedure**:
```bash
# Scan image with Trivy
trivy image --severity HIGH,CRITICAL your-image:tag

# Scan image with Grype
grype your-image:tag --fail-on high

# Generate SBOM (Software Bill of Materials)
syft your-image:tag -o json > sbom.json
```

**Acceptance Criteria**:
- Zero CRITICAL vulnerabilities
- HIGH vulnerabilities documented and tracked
- SBOM generated and stored

---

#### 1.2 Secrets Detection
**Control ID**: `DC-SEC-002`

**Requirement**: Container images **MUST NOT** contain embedded secrets or credentials.

**Procedure**:
```bash
# Scan image layers for secrets
docker history your-image:tag --no-trunc

# Use ggshield to detect secrets
ggshield secret scan docker your-image:tag

# Check environment variables
docker inspect your-image:tag | jq '.[0].Config.Env'
```

**Acceptance Criteria**:
- No secrets found in image layers
- All credentials loaded from external sources (`.env`, Docker secrets)
- Environment variables do not contain sensitive data

---

#### 1.3 Base Image Verification
**Control ID**: `DC-SEC-003`

**Requirement**: Base images **MUST** be from trusted registries with verified signatures.

**Procedure**:
```bash
# Verify image signature
docker trust inspect your-image:tag

# Check image provenance
docker buildx imagetools inspect your-image:tag
```

**Acceptance Criteria**:
- Base image is from official Docker Hub or trusted registry
- Image signature is valid
- Image version is explicitly pinned (no `latest`)

---

### 2. Runtime Security Controls

#### 2.1 Container Isolation
**Control ID**: `DC-SEC-004`

**Requirement**: Containers **MUST** run with network isolation and minimal privileges.

**Procedure**:
```yaml
# Docker Compose configuration
services:
  my-service:
    image: my-image:tag
    networks:
      - internal_network
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if needed
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

**Acceptance Criteria**:
- Container uses dedicated network
- Unnecessary capabilities dropped
- Read-only filesystem enabled (where possible)
- No new privileges allowed

---

#### 2.2 Resource Limits
**Control ID**: `DC-SEC-005`

**Requirement**: Containers **MUST** have CPU and memory limits to prevent resource exhaustion.

**Procedure**:
```yaml
services:
  my-service:
    image: my-image:tag
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

**Acceptance Criteria**:
- CPU limit defined
- Memory limit defined
- Reservations set for guaranteed resources

---

#### 2.3 Health Monitoring
**Control ID**: `DC-SEC-006`

**Requirement**: All service containers **MUST** implement health checks.

**Procedure**:
```yaml
services:
  my-service:
    image: my-image:tag
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Acceptance Criteria**:
- Health check endpoint implemented
- Health check passes consistently
- Restart policy configured

---

### 3. Access Control

#### 3.1 Non-Root User
**Control ID**: `DC-SEC-007`

**Requirement**: Containers **SHOULD** run as non-root users when possible.

**Procedure**:
```dockerfile
# Dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

# Set ownership
COPY --chown=appuser:appuser . /app
WORKDIR /app

# Switch to non-root user
USER appuser

CMD ["node", "server.js"]
```

**Acceptance Criteria**:
- Container runs as non-root user
- File permissions correctly set
- No privilege escalation possible

---

#### 3.2 Volume Mount Security
**Control ID**: `DC-SEC-008`

**Requirement**: Volume mounts **MUST** be documented and restricted.

**Procedure**:
```yaml
services:
  my-service:
    volumes:
      # Read-only mount for config
      - ./config:/app/config:ro

      # Named volume for data persistence
      - app_data:/app/data

      # Avoid mounting sensitive directories
      # ❌ BAD: - /var/run/docker.sock:/var/run/docker.sock
```

**Acceptance Criteria**:
- Volume mounts documented with purpose
- Read-only mounts used where appropriate
- No sensitive host directories mounted

---

### 4. Network Security

#### 4.1 Port Exposure
**Control ID**: `DC-SEC-009`

**Requirement**: Only necessary ports **MUST** be exposed.

**Procedure**:
```yaml
services:
  my-service:
    ports:
      # Use specific port mapping
      - "127.0.0.1:3000:3000"  # ✅ Bind to localhost
      # - "3000:3000"  # ❌ Binds to 0.0.0.0
    expose:
      # Internal ports (not exposed to host)
      - "3001"
```

**Acceptance Criteria**:
- Ports bound to localhost (127.0.0.1) when not publicly accessible
- Unused ports not exposed
- Port conflicts checked against registry

---

#### 4.2 Network Segmentation
**Control ID**: `DC-SEC-010`

**Requirement**: Containers **MUST** use isolated networks.

**Procedure**:
```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access

services:
  web:
    networks:
      - frontend
  api:
    networks:
      - frontend
      - backend
  db:
    networks:
      - backend  # Only accessible from backend
```

**Acceptance Criteria**:
- Services segmented by function
- Internal networks used for backend services
- External access limited to gateway

---

### 5. Audit & Compliance

#### 5.1 Container Logging
**Control ID**: `DC-SEC-011`

**Requirement**: Container events **MUST** be logged.

**Procedure**:
```yaml
services:
  my-service:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,environment"
```

**Acceptance Criteria**:
- Logs captured in structured format
- Log rotation configured
- Sensitive data not logged

---

#### 5.2 Security Audit Trail
**Control ID**: `DC-SEC-012`

**Requirement**: Security events **MUST** be auditable.

**Procedure**:
```bash
# Check container permissions
docker inspect my-container | jq '.[0].HostConfig.SecurityOpt'

# Review container capabilities
docker inspect my-container | jq '.[0].HostConfig.CapAdd'

# Audit volume mounts
docker inspect my-container | jq '.[0].Mounts'
```

**Acceptance Criteria**:
- All configurations auditable
- Changes tracked in version control
- Security events logged

---

## Pre-Deployment Checklist

Before deploying a new container, verify:

- [ ] Image scanned for vulnerabilities (DC-SEC-001)
- [ ] No secrets embedded in image (DC-SEC-002)
- [ ] Base image verified from trusted source (DC-SEC-003)
- [ ] Container runs as non-root user (DC-SEC-007)
- [ ] Resource limits defined (DC-SEC-005)
- [ ] Health check implemented (DC-SEC-006)
- [ ] Network isolation configured (DC-SEC-004)
- [ ] Ports minimally exposed (DC-SEC-009)
- [ ] Volume mounts documented (DC-SEC-008)
- [ ] Logging configured (DC-SEC-011)

## Incident Response

### Security Incident Procedure

1. **Detect**: Identify security event via monitoring/alerts
2. **Contain**: Isolate affected container
3. **Investigate**: Collect logs and analyze root cause
4. **Remediate**: Patch vulnerability or update configuration
5. **Document**: Record incident and lessons learned

### Container Compromise Response

```bash
# Stop compromised container
docker stop container_name

# Inspect container for evidence
docker inspect container_name > incident_evidence.json
docker logs container_name > incident_logs.txt

# Remove compromised container
docker rm container_name

# Scan system for persistence mechanisms
trivy fs /var/lib/docker/volumes/

# Rebuild from clean source
docker build --no-cache -t new-image:tag .
```

## Automation & Tooling

### Security Scanning Tools

```bash
# Trivy - Vulnerability scanner
trivy image your-image:tag

# Grype - SBOM-based vulnerability scanner
grype your-image:tag

# Syft - SBOM generator
syft your-image:tag -o json

# Dockle - Container image linter
dockle your-image:tag

# Docker Bench Security - CIS benchmark audit
docker run --rm --net host --pid host --userns host --cap-add audit_control \
  -v /var/lib:/var/lib -v /var/run/docker.sock:/var/run/docker.sock \
  docker/docker-bench-security
```

### CI/CD Integration

```yaml
# .github/workflows/container-security.yml
name: Container Security Scan

on:
  push:
    paths:
      - '**/Dockerfile'
      - '**/docker-compose*.yml'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Trivy scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'your-image:tag'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

## Related Documents

- [Dev Container Policy](../policies/dev-container-policy.md)
- [Pre-Deploy Checklist](./pre-deploy-checklist.mdx)
- [Environment Variables Policy](../policies/environment-variables-policy.mdx)
- [API Gateway Policy](../policies/api-gateway-policy.md)

## Review & Updates

- **Review Frequency**: Quarterly
- **Next Review**: 2026-02-13
- **Control Owner**: TradingSystem Security Team

## References

- [OWASP Container Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [NIST SP 800-190: Application Container Security Guide](https://csrc.nist.gov/publications/detail/sp/800-190/final)

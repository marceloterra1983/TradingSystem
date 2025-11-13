---
title: Dev Container Policy
sidebar_position: 6
tags: [governance, policy, dev-container, security]
domain: tools
type: policy
summary: Security and usage policies for development containers in the TradingSystem project
status: active
last_review: "2025-11-13"
---

# Dev Container Policy

## Purpose

This policy establishes security, access control, and usage standards for development containers in the TradingSystem project to ensure consistent, secure, and isolated development environments.

## Scope

This policy applies to:
- All development containers defined in `.devcontainer/`
- Dev containers used for local development
- Dev containers used in CI/CD pipelines
- All developers and AI agents working with the codebase

## Policy Requirements

### 1. Container Security

#### 1.1 Base Images
- **MUST** use official, verified base images from trusted registries
- **MUST** specify explicit image versions (no `latest` tag in production configs)
- **SHOULD** use minimal base images (Alpine, Distroless) when possible
- **MUST** scan images for vulnerabilities before use

#### 1.2 Network Isolation
- **MUST** use dedicated Docker networks for container isolation
- **MUST** restrict container access to host network
- **SHOULD** use internal networks for inter-service communication
- **MUST NOT** expose unnecessary ports to the host

#### 1.3 Credentials & Secrets
- **MUST NOT** embed credentials in Dockerfiles or images
- **MUST** use Docker secrets or environment variables for sensitive data
- **MUST** follow the centralized `.env` policy (see Environment Variables Policy)
- **SHOULD** use secrets management tools (e.g., Docker Swarm secrets, HashiCorp Vault)

### 2. Access Control

#### 2.1 User Permissions
- **MUST** run containers with non-root users when possible
- **SHOULD** use user namespaces for additional isolation
- **MUST** grant minimal file system permissions
- **MUST NOT** mount sensitive host directories without justification

#### 2.2 Volume Mounts
- **SHOULD** use named volumes instead of bind mounts for data persistence
- **MUST** document the purpose of each volume mount
- **MUST** restrict write access to mounted volumes
- **SHOULD** use read-only mounts when write access is not required

#### 2.3 Privileged Operations
- **MUST NOT** use `--privileged` mode without explicit approval
- **MUST** document and justify any use of elevated capabilities
- **SHOULD** use capability dropping (`--cap-drop`) to minimize attack surface

### 3. Resource Management

#### 3.1 Resource Limits
- **MUST** define CPU and memory limits for all containers
- **SHOULD** set appropriate restart policies
- **MUST** monitor resource usage to prevent resource exhaustion

#### 3.2 Container Lifecycle
- **MUST** implement health checks for all service containers
- **SHOULD** use multi-stage builds to minimize image size
- **MUST** clean up unused containers, images, and volumes regularly

### 4. Development Workflow

#### 4.1 Container Configuration
- **MUST** version-control all container configurations
- **MUST** document container dependencies and relationships
- **SHOULD** use Docker Compose for multi-container environments
- **MUST** test container configurations before committing

#### 4.2 Port Management
- **MUST** follow the port allocation registry (see `docs/content/tools/ports-services.mdx`)
- **MUST NOT** use conflicting port assignments
- **SHOULD** use the API Gateway (Traefik) for service routing

#### 4.3 Environment Configuration
- **MUST** use the centralized `.env` file from project root
- **MUST NOT** create service-specific `.env` files
- **MUST** validate environment variables before container startup

### 5. Security Best Practices

#### 5.1 Container Hardening
- **MUST** remove unnecessary packages and tools from production images
- **SHOULD** use security scanning tools (e.g., Trivy, Grype)
- **MUST** keep base images and dependencies up to date
- **SHOULD** implement least privilege principles

#### 5.2 Audit & Monitoring
- **MUST** log container events and access patterns
- **SHOULD** integrate with centralized logging (e.g., ELK, Loki)
- **MUST** alert on security events (e.g., failed authentication, privilege escalation)

#### 5.3 Compliance
- **MUST** comply with OWASP Container Security guidelines
- **MUST** follow CIS Docker Benchmark recommendations
- **SHOULD** conduct regular security assessments

## Compliance

### Enforcement
- Dev containers that violate this policy **MUST** be remediated before deployment
- CI/CD pipelines **SHOULD** enforce policy compliance through automated checks
- Violations **MUST** be logged and reported to the governance team

### Exceptions
- Exceptions to this policy **MUST** be approved by the project lead
- Exceptions **MUST** be documented with justification and remediation plan
- Exceptions **SHOULD** have an expiration date for review

## Related Documents

- [Dev Container Security Controls](../controls/dev-container-security.md)
- [Environment Variables Policy](./environment-variables-policy.mdx)
- [API Gateway Policy](./api-gateway-policy.md)
- [Pre-Deploy Checklist](../controls/pre-deploy-checklist.mdx)

## Review & Updates

- **Review Frequency**: Quarterly
- **Next Review**: 2026-02-13
- **Policy Owner**: TradingSystem DevOps Team

## References

- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

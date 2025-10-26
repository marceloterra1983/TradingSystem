# Docker Infrastructure Specification

## ADDED Requirements

### Requirement: Environment Variable Loading

ALL Docker Compose services SHALL load environment variables from the centralized root `.env` file located at the project root, referenced as `../../.env` relative to the compose file location.

#### Scenario: Compose file loads centralized env
- **WHEN** docker compose up is executed for any stack
- **THEN** environment variables are loaded from project root .env file
- **AND** path is `../../.env` relative to compose file location

#### Scenario: Service-specific overrides
- **WHEN** a service needs custom environment values
- **THEN** compose file can provide overrides via `environment:` section
- **AND** overrides take precedence over .env values

#### Scenario: Missing .env file
- **WHEN** root .env file does not exist
- **THEN** docker compose shows clear error message
- **AND** services fail to start with missing variable errors

---

### Requirement: Credential Management

Docker Compose files SHALL NOT contain hardcoded credentials. All sensitive values (passwords, API keys, tokens, secrets) SHALL be referenced as environment variables using `${VAR_NAME}` or `${VAR_NAME:-default}` syntax.

#### Scenario: Database password via env var
- **WHEN** a database container starts
- **THEN** password is loaded from environment variable (e.g., `${POSTGRES_PASSWORD}`)
- **AND** value is defined in root .env file
- **AND** no hardcoded password exists in compose file

#### Scenario: API key via env var with default
- **WHEN** a service requires an optional API key
- **THEN** compose file uses `${API_KEY:-}` syntax (empty default)
- **AND** service handles missing key gracefully

#### Scenario: Audit hardcoded credentials
- **WHEN** validating compose files
- **THEN** grep for hardcoded patterns (e.g., `PASSWORD: [^$]`) returns zero matches
- **AND** all sensitive values use `${VAR}` syntax

---

### Requirement: Resource Cleanup

Development environments SHALL periodically remove dangling Docker resources (volumes, images, networks) to prevent disk space exhaustion and maintain system performance.

#### Scenario: List dangling volumes before cleanup
- **WHEN** preparing to clean dangling volumes
- **THEN** execute `docker volume ls -qf dangling=true`
- **AND** validate volumes are truly unused (no active containers)
- **AND** proceed with cleanup only if validation passes

#### Scenario: Cleanup dangling volumes safely
- **WHEN** docker volume prune is executed
- **THEN** only volumes with dangling=true filter are removed
- **AND** active volumes (with containers/services) remain intact
- **AND** space recovered is logged

#### Scenario: Cleanup dangling images
- **WHEN** docker image prune is executed
- **THEN** only untagged/unused images are removed
- **AND** images used by running/stopped containers remain
- **AND** space recovered is logged

#### Scenario: Cleanup orphaned networks
- **WHEN** docker network prune is executed
- **THEN** only networks with zero attached containers are removed
- **AND** active networks (tradingsystem_backend, etc.) remain intact

#### Scenario: Validate system health post-cleanup
- **WHEN** resource cleanup completes
- **THEN** all containers must remain healthy
- **AND** all services must respond to health checks
- **AND** zero service disruption occurs

---

### Requirement: Health Check Integration

All critical Docker Compose services SHALL define health checks that validate service readiness and enable automated monitoring.

#### Scenario: Database health check
- **WHEN** TimescaleDB container starts
- **THEN** healthcheck executes `pg_isready` command
- **AND** interval is 30s, timeout is 10s, retries is 5
- **AND** container marked healthy only after check passes

#### Scenario: API service health check
- **WHEN** Node.js API container starts
- **THEN** healthcheck executes HTTP GET to /health endpoint
- **AND** interval is 30s, timeout is 10s
- **AND** container marked healthy on 200 OK response

#### Scenario: Health check logs
- **WHEN** health check fails
- **THEN** failure is logged to container logs
- **AND** Prometheus metrics reflect unhealthy state
- **AND** monitoring alerts can trigger on repeated failures

---

### Requirement: Logging Configuration

All Docker Compose services SHALL use standardized logging configuration with rotation to prevent disk exhaustion from log accumulation.

#### Scenario: JSON file logging with rotation
- **WHEN** any container generates logs
- **THEN** logs are written using json-file driver
- **AND** max-size is 10MB per file
- **AND** max-file is 3 (keeps last 3 rotated files)

#### Scenario: Access container logs
- **WHEN** debugging a service
- **THEN** logs are accessible via `docker compose logs <service>`
- **AND** logs include timestamps in ISO 8601 format
- **AND** structured logging (JSON) is preserved

---

### Requirement: Network Isolation

Docker Compose services SHALL be organized into logical networks that provide isolation between service groups while enabling required inter-service communication.

#### Scenario: Backend services network
- **WHEN** backend services (workspace, tp-capital, timescaledb) start
- **THEN** all connect to `tradingsystem_backend` network
- **AND** services can communicate via service names (e.g., `timescaledb:5432`)
- **AND** external networks are joined as `external: true`

#### Scenario: Service-specific isolation
- **WHEN** a service stack has no external dependencies
- **THEN** stack uses dedicated network (e.g., `firecrawl_network`)
- **AND** network is not accessible to other stacks
- **AND** explicit connections required for cross-stack communication

#### Scenario: Network cleanup
- **WHEN** containers are removed
- **THEN** unused networks can be pruned
- **AND** active networks with containers remain intact
- **AND** external networks are never pruned

---

## Implementation Notes

### ENV File Structure

Root `.env` should be organized by functional area:

```
# Database Configuration
TIMESCALEDB_HOST=timescaledb
TIMESCALEDB_PORT=5432
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=<secure-password>
TIMESCALEDB_DB=trading

# API Configuration
WORKSPACE_PORT=3200
TP_CAPITAL_PORT=4005

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
```

### Compose File Template

```yaml
services:
  my-service:
    # Load from root .env
    env_file:
      - ../../.env

    # Override specific values
    environment:
      - SERVICE_PORT=${SERVICE_PORT:-3000}
      - DB_PASSWORD=${DB_PASSWORD}  # Required, no default

    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

    # Logging
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

    # Network
    networks:
      - my-network

networks:
  my-network:
    name: my-network
    external: true
```

### Validation Scripts

```bash
# Audit hardcoded credentials
grep -r "PASSWORD: [^$]" tools/compose/*.yml tools/monitoring/*.yml

# Verify env_file references
grep -r "env_file:" tools/compose/*.yml tools/monitoring/*.yml | grep -v "../../.env"

# List dangling resources
docker volume ls -qf dangling=true
docker images -f dangling=true
docker network ls --filter "dangling=true"
```

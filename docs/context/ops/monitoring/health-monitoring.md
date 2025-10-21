---
title: "Health Monitoring Guide"
sidebar_position: 5
tags: ["health-check", "monitoring", "operations", "troubleshooting", "service-launcher", "prometheus"]
domain: "ops"
type: "guide"
summary: "Complete guide for health monitoring infrastructure including health-check-all.sh script, Service Launcher API, and integration patterns"
status: "active"
last_review: "2025-10-18"
---

## Overview

- ✅ Three-tier health monitoring: CLI script → Service Launcher API → Dashboard & monitoring tools
- ✅ Consolidated results from local services, Docker stacks, and databases with remediation hints
- ✅ Multiple output formats (text, JSON, Prometheus) for operators, automation, and observability pipelines
- ✅ Cached comprehensive status via `/api/health/full` for low-latency integrations
- 📚 Related docs: [Service Launcher README](../../../../frontend/apps/service-launcher/README.md), [Prometheus Setup](./prometheus-setup.md), [Alerting Policy](./alerting-policy.md)

The TradingSystem health monitoring stack combines shell tooling, reusable libraries, and HTTP endpoints to provide operators and automation with a unified view of platform health. This guide explains how the pieces fit together, how to consume the outputs, and how to troubleshoot when something goes wrong.

## Architecture Overview

The health monitoring architecture is organized into three layers that build on each other:

| Layer | Component | Primary Responsibilities | Notes |
| --- | --- | --- | --- |
| 1 | `scripts/lib/health.sh` | Core probes (`check_all_local_services`, `check_all_docker_stacks`, `check_database_connectivity`), latency tracking, remediation hint generation | Used by both the CLI and Service Launcher |
| 2 | `scripts/maintenance/health-check-all.sh` | CLI orchestrator, argument parsing, format conversion (text/JSON/Prometheus), exit codes | Supports filtering flags and verbose logging |
| 3 | Service Launcher `/api/health/full` | HTTP wrapper with 60s cache, metrics recording, downstream integrations (Dashboard, Prometheus, alerting) | `execFile` invokes the CLI script when cache misses |

### Health State Calculation

1. Each probe returns `up`, `down`, or `degraded` plus latency metrics.
2. Aggregated status uses weighted rules:
   - All critical services healthy → overall `healthy`
   - Any critical service degraded/down → overall `critical`
   - Non-critical failures without critical impact → overall `degraded`
3. Remediation suggestions map failure patterns (service/container/database) to actionable commands and documentation links.

:::info
Critical components: Dashboard (port 3103), Service Launcher (port 3500), TimescaleDB (port 5432). Failures in these services elevate the overall status to `critical`.
:::

## PlantUML: Health Check Flow

[PlantUML source](./diagrams/health-check-flow.puml)

```plantuml
@startuml
!theme plain
skinparam sequenceMessageAlign center
skinparam ParticipantPadding 20
skinparam BoxPadding 10
skinparam defaultFontName Courier
skinparam defaultFontSize 12

title Health Check Architecture - Complete Flow

actor User/System
participant "health-check-all.sh\n(Orchestrator)" as Script
participant "health.sh\n(Library)" as Library
participant "Local Services\n(Node.js)" as Services
participant "Docker Daemon" as Docker
participant "TimescaleDB\n(PostgreSQL)" as Database
participant "Service Launcher\n(Port 3500)" as API
participant "Dashboard\n(React)" as Dashboard
participant "Prometheus" as Prometheus

== Direct Script Execution (CLI) ==
User/System -> Script: Execute with `--format json`
activate Script
Script -> Script: Parse arguments\nSet HEALTH_TRACK_LATENCY=true
Script -> Library: check_all_local_services()
activate Library
loop each configured service
  Library -> Services: Port + HTTP health check
  activate Services
  Services --> Library: Status + latency data
  deactivate Services
end
Library --> Script: HEALTH_LOCAL_RESULTS
Script -> Library: check_all_docker_stacks()
loop each Docker stack
  Library -> Docker: docker ps + docker inspect
  activate Docker
  Docker --> Library: Container status + health
  deactivate Docker
end
Library --> Script: HEALTH_DOCKER_RESULTS
Script -> Library: check_database_connectivity()
Library -> Database: pg_isready probe
activate Database
Database --> Library: Connection status
deactivate Database
Library --> Script: HEALTH_DATABASE_RESULTS
Script -> Script: calculate_overall_health() -> healthy/degraded/critical
Script -> Script: generate_remediation_suggestions()
Script -> Library: generate_health_summary(--format json)
Library --> Script: JSON payload
Script --> User/System: Print JSON + exit code (0/1/2)
deactivate Script

== API Endpoint Flow ==
Dashboard -> API: GET /api/health/full
activate API
API -> API: Validate cache (TTL 60s)
alt Cache Valid (HIT)
  API -> API: Return cached response
  API --> Dashboard: 200 OK\nX-Cache-Status: HIT\nX-Cache-Age: <seconds
else Cache Invalid (MISS)
  API -> Script: execFile('health-check-all.sh', ['--format','json'])
  activate Script
  Script -> Library: check_all_local_services()
  activate Library
  loop each configured service
    Library -> Services: Port + HTTP health check
    activate Services
    Services --> Library: Status + latency data
    deactivate Services
  end
  Library --> Script: HEALTH_LOCAL_RESULTS
  Script -> Library: check_all_docker_stacks()
  loop each Docker stack
    Library -> Docker: docker ps + docker inspect
    activate Docker
    Docker --> Library: Container status + health
    deactivate Docker
  end
  Library --> Script: HEALTH_DOCKER_RESULTS
  Script -> Library: check_database_connectivity()
  Library -> Database: pg_isready probe
  activate Database
  Database --> Library: Connection status
  deactivate Database
  Library --> Script: HEALTH_DATABASE_RESULTS
  Script -> Script: calculate_overall_health()
  Script -> Script: generate_remediation_suggestions()
  Script -> Library: generate_health_summary(--format json)
  Library --> Script: JSON payload
  Script --> API: stdout JSON
  deactivate Script
  deactivate Library
  API -> API: Parse JSON + update cache\nRecord metrics (`<5s` fresh)
  API --> Dashboard: 200 OK\nX-Cache-Status: MISS\nX-Cache-Age: 0
end
deactivate API
Dashboard -> Dashboard: Render status + remediation tips

== Prometheus Metrics Export ==
Prometheus -> Script: Execute with `--format prometheus`
activate Script
Script -> Library: check_all_local_services()
activate Library
loop each configured service
  Library -> Services: Port + HTTP health check
  activate Services
  Services --> Library: Status + latency data
  deactivate Services
end
Library --> Script: HEALTH_LOCAL_RESULTS
Script -> Library: check_all_docker_stacks()
loop each Docker stack
  Library -> Docker: docker ps + docker inspect
  activate Docker
  Docker --> Library: Container status + health
  deactivate Docker
end
Library --> Script: HEALTH_DOCKER_RESULTS
Script -> Library: check_database_connectivity()
Library -> Database: pg_isready probe
activate Database
Database --> Library: Connection status
deactivate Database
Library --> Script: HEALTH_DATABASE_RESULTS
Script -> Script: compute_latency_percentiles()
Script -> Library: generate_health_summary(--format prometheus)
Library --> Script: Prometheus exposition
Script -> Script: append_prometheus_extras()
Script --> Prometheus: tradingsystem_* metrics
deactivate Script
Prometheus -> Prometheus: Store results (scrape interval 60s)

note right of Services
Critical services: Dashboard, Service Launcher, TimescaleDB.
Failures escalate overall status to critical.
end note

note over API
Cache TTL: 60 seconds balances freshness vs performance.
`<10ms` response on cache hit; 2-5s on cache miss.
end note

note over Script
Exit codes: 0=healthy, 1=degraded, 2=critical.
Used by CI/CD and monitoring automations.
end note

note over Library
Latency percentiles (p50, p95, p99) captured
for services, containers, databases, and overall.
end note

note over Dashboard
Remediation suggestions include start commands,
log inspection paths, and documentation references.
end note

@enduml
```

The sequence diagram illustrates script execution, API caching behavior, and Prometheus scrapes with emphasis on latency tracking, cache strategy, and remediation hint generation.

## Usage Examples

### CLI: `health-check-all.sh`

- ✅ Default execution:

```bash
bash scripts/maintenance/health-check-all.sh
```

- ✅ Format options:

```bash
# Text (default)
bash scripts/maintenance/health-check-all.sh --format text

# JSON (automation)
bash scripts/maintenance/health-check-all.sh --format json | jq '.overallHealth'

# Prometheus exposition
bash scripts/maintenance/health-check-all.sh --format prometheus
```

- ✅ Filtering & verbosity:

```bash
# Services only (local Node.js processes)
bash scripts/maintenance/health-check-all.sh --services-only

# Docker containers only
bash scripts/maintenance/health-check-all.sh --containers-only

# Verbose troubleshooting
bash scripts/maintenance/health-check-all.sh --verbose --format json
```

- ✅ Exit codes: `0` (healthy), `1` (degraded), `2` (critical)

**Real-world scenarios**

| Scenario | Command | Notes |
| --- | --- | --- |
| Pre-deployment verification (CI/CD) | `bash scripts/maintenance/health-check-all.sh --format json` | Fails pipeline on degraded/critical state |
| Scheduled monitoring (cron) | `bash scripts/maintenance/health-check-all.sh --format text >> /var/log/tradingsystem/health.log` | Archive historical status |
| Incident response | `bash scripts/maintenance/health-check-all.sh --verbose` | Provides remediation hints inline |

### API: Service Launcher `/api/health/full`

- Endpoint: `GET http://localhost:3500/api/health/full`
- Response fields:
  - `overallHealth`: `healthy | degraded | critical`
  - `summary`: concise human-readable status
  - `components`: grouped results for services, containers, databases
  - `latency`: percentiles per scope (p50, p95, p99)
  - `remediation`: actionable suggestions
  - `generatedAt`: RFC 3339 timestamp
- Cache headers: `X-Cache-Status` (`HIT` or `MISS`), `X-Cache-Age` (seconds)
- Performance: `<10ms` on cache hit, `~2-5s` on cache miss (full execution)

```bash
# Entire payload
curl http://localhost:3500/api/health/full

# Extract overall health
curl -s http://localhost:3500/api/health/full | jq '.overallHealth'

# Inspect cache status
curl -I http://localhost:3500/api/health/full | grep X-Cache-Status
```

**Monitoring integrations**

- Prometheus scraper (via textfile collector or exporter)
- Grafana panels using cached responses (JSON data source)
- Nagios/Icinga checks using exit codes mapped from `overallHealth`

### Dashboard Integration

- The Dashboard `ConnectionsPage` consumes `/api/health/full` for visual indicators.
- Recommended TypeScript hook pattern:

```typescript
import { useEffect, useState } from "react";

type HealthResponse = {
  overallHealth: "healthy" | "degraded" | "critical";
  components: Record<string, unknown>;
  remediation: string[];
  generatedAt: string;
};

export function useHealthStatus(pollIntervalMs = 60000) {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const res = await fetch("/api/health/full", { headers: { "Cache-Control": "no-cache" } });
        if (!res.ok) throw new Error(`Unexpected status ${res.status}`);
        const json = (await res.json()) as HealthResponse;
        if (mounted) setData(json);
      } catch (err) {
        if (mounted) setError((err as Error).message);
      }
    }

    poll();
    const id = window.setInterval(poll, pollIntervalMs);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [pollIntervalMs]);

  return { data, error };
}
```

- UI recommendations:
  - Green/amber/red badges for overall status
  - Collapsible panels for detailed component health
  - Inline remediation suggestions with quick links to playbooks
  - Polling every 60s (aligned with cache TTL); fallback to manual refresh on errors

## Prometheus Metrics Export

`health-check-all.sh --format prometheus` emits `tradingsystem_*` metric families ready for scraping.

| Metric | Labels | Description |
| --- | --- | --- |
| `tradingsystem_service_up` | `name`, `port` | 1 if local service is reachable, 0 otherwise |
| `tradingsystem_service_health_status` | `name`, `status` | Categorical health indicator |
| `tradingsystem_container_up` | `name`, `stack` | 1 if Docker container running, 0 otherwise |
| `tradingsystem_database_up` | `name`, `host` | 1 if database connection succeeds |
| `tradingsystem_overall_health` | `status` | Gauges overall system health (1 for current state) |
| `tradingsystem_health_latency_percentile_seconds` | `scope`, `percentile` | p50/p95/p99 latency per scope |
| `tradingsystem_health_check_timestamp_seconds` | — | UNIX timestamp of last health check |

**Sample scrape config with Node Exporter textfile collector (`prometheus.yml`)**

```yaml
scrape_configs:
  - job_name: node-exporter
    scrape_interval: 60s
    metrics_path: /metrics
    static_configs:
      - targets: ["localhost:9100"]

  # Ensure the node_exporter service is started with:
  #   --collector.textfile.directory=/var/lib/node_exporter/textfile_collector
  #
  # A cron/systemd job should write tradingsystem_health.prom into that directory:
  #   /opt/tradingsystem/scripts/maintenance/health-check-all.sh --format prometheus \
  #     > /var/lib/node_exporter/textfile_collector/tradingsystem_health.prom.tmp && \
  #   mv /var/lib/node_exporter/textfile_collector/tradingsystem_health.prom.tmp \
  #      /var/lib/node_exporter/textfile_collector/tradingsystem_health.prom
```

**PromQL snippets**

```promql
tradingsystem_overall_health{status="critical"} == 1

tradingsystem_service_up{name="Dashboard"} == 0

tradingsystem_database_up{name="timescaledb"} == 0
```

:::caution
Always write the metrics file atomically (use a temporary file + `mv`) so the Node Exporter textfile collector never reads a partially written payload.
:::

## Scheduled Monitoring Setup

### Cron Examples

```bash
*/5 * * * * /path/to/health-check-all.sh --format json >> /var/log/tradingsystem/health.log 2>&1
0 * * * * /path/to/health-check-all.sh || mail -s "Health Check Failed" ops@example.com
0 0 * * * /path/to/health-check-all.sh --format prometheus > /var/lib/node_exporter/textfile_collector/tradingsystem_health.prom.tmp && mv /var/lib/node_exporter/textfile_collector/tradingsystem_health.prom.tmp /var/lib/node_exporter/textfile_collector/tradingsystem_health.prom
```

### Systemd Timer

**Service unit (`/etc/systemd/system/health-check.service`)**

```ini
[Unit]
Description=TradingSystem Health Check

[Service]
Type=oneshot
WorkingDirectory=/opt/tradingsystem
ExecStart=/opt/tradingsystem/scripts/maintenance/health-check-all.sh --format json
```

**Timer unit (`/etc/systemd/system/health-check.timer`)**

```ini
[Unit]
Description=Run TradingSystem health check every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Unit=health-check.service

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable --now health-check.timer
```

### Monitoring Integration

- Prometheus Alertmanager rules aligned with `tradingsystem_overall_health`
- Grafana dashboards with heatmaps for service/container latency percentiles
- PagerDuty/Slack webhooks triggered via Alertmanager routes on `critical` status

## Troubleshooting Common Health Check Failures

### Local Services

- ❌ **Service reported down**
  - Causes: Missing port tools (`lsof`, `ss`), firewall blocking localhost, mismatched port configuration
  - Fix: Install required tools, adjust firewall rules, verify `SERVICE_LAUNCHER_*_PORT` values
  - Verify: `curl http://localhost:<port>/health`, `ps aux | grep node`

- ⚠️ **Service unhealthy (HTTP errors)**
  - Causes: Dependency not ready, database connection failure, invalid configuration
  - Fix: Inspect service logs, validate database reachability, confirm environment variables
  - Verify: Inspect health endpoint response body and logs

- ⚠️ **Intermittent failures**
  - Causes: Short timeout, high CPU load, transient network latency
  - Fix: Increase `SERVICE_LAUNCHER_TIMEOUT_MS`, monitor system resources, enable retries
  - Verify: Run script with `--verbose`, review metrics

### Docker Containers

- ❌ **Container exited or dead**
  - Causes: Crash, OOM kill, missing dependency, invalid configuration
  - Fix: `docker logs <container>`, review exit code, adjust resource limits
  - Verify: `docker restart <container>`, `docker events --since 15m`

- ⚠️ **Container unhealthy**
  - Causes: Healthcheck command failing, slow startup, downstream dependency unavailable
  - Fix: Tune healthcheck interval/retries, verify dependencies, check container logs
  - Verify: Execute healthcheck command inside container (`docker exec`)

- ❌ **Docker daemon unavailable**
  - Causes: Service stopped, permission issues, missing socket
  - Fix: Restart Docker, add user to `docker` group, confirm socket path
  - Verify: `docker ps`, `systemctl status docker`

### Databases

- ❌ **TimescaleDB down**
  - Causes: Container stopped, port not exposed, network isolation, authentication failure
  - Fix: Start stack, confirm port mapping, inspect network, validate credentials
  - Verify: `pg_isready -h localhost -p 5432`, `psql` connection test

- ⚠️ **Intermittent connectivity**
  - Causes: Connection pool exhaustion, network instability, heavy load
  - Fix: Adjust pool size, analyze network, optimize queries
  - Verify: Monitor database metrics, review slow query logs

### Script Execution

- ❌ **Script not found**
  - Causes: Wrong path, missing execute bit, incorrect project root detection
  - Fix: Confirm `scripts/maintenance/health-check-all.sh`, `chmod +x`, ensure execution from project root
  - Verify: `ls -la scripts/maintenance/health-check-all.sh`

- ⚠️ **Execution timeout**
  - Causes: Large number of checks, slow Docker responses, resource contention
  - Fix: Use `--services-only`/`--containers-only`, adjust Service Launcher timeout, free system resources
  - Verify: Run manually to measure duration

- ⚠️ **Invalid JSON output**
  - Causes: Missing dependencies (`jq`, `python3`), stderr noise, script error
  - Fix: Install dependencies, inspect stderr, ensure clean stdout
  - Verify: `bash scripts/maintenance/health-check-all.sh --format json | jq .`

## Remediation Suggestions

- Pattern-matching engine in `health.sh` maps failures to actionable steps.
- Output includes commands such as:
  - Service restart: `npm --prefix frontend/apps/dashboard run start`
  - Container restart: `docker compose -f infrastructure/compose/docker-compose.infra.yml restart grafana`
  - Database recovery: `docker compose -f infrastructure/compose/docker-compose.data.yml up -d timescaledb`
  - Port collision investigation: `lsof -i :3500`
- Remediation hints appear in text/JSON outputs and within Dashboard UI to guide incident response teams.

## Integration Patterns

### CI/CD Pipeline

- Pre-deployment gate verifying staging environment readiness
- Post-deployment smoke tests to confirm health before releasing traffic
- GitHub Actions example:

```yaml
- name: Health check
  run: |
    bash scripts/maintenance/health-check-all.sh --format json > health.json
    status=$(jq -r '.overallHealth' health.json)
    if [ "$status" != "healthy" ]; then
      cat health.json
      exit 1
    fi
```

- GitLab CI job:

```yaml
health_check:
  stage: test
  script:
    - bash scripts/maintenance/health-check-all.sh --format json | tee health.json
    - test "$(jq -r '.overallHealth' health.json)" = "healthy"
```

### Monitoring Systems

- Prometheus scrape via Service Launcher or textfile collector
- Grafana JSON data source for rich dashboards
- Alertmanager routing critical alerts to PagerDuty/Slack with remediation snippets
- Optional custom webhook that invokes the script and posts formatted output to incident channels

### Dashboard Integration

- Use polling aligned with cache TTL (`60s`)
- Display component breakdowns with collapsible sections
- Provide fallback manual refresh button on fetch failure
- Capture errors for observability (e.g., Sentry) with context from remediation suggestions

## Performance Considerations

- Average script runtime: `2-5s` (parallel checks)
- Cache effectiveness: 60s TTL reduces API load while preserving accuracy
- Parallel execution ensures minimal CPU usage (`<10%` baseline)
- Timeout tuning: `SERVICE_LAUNCHER_TIMEOUT_MS` balances responsiveness vs false negatives
- Metrics collection overhead negligible; Prometheus scraping dominated by script runtime

## Security Considerations

- ✔️ No sensitive credentials in outputs (sanitized by `health.sh`)
- ✔️ Rate limiting enforced at Service Launcher (default `200 req/min`)
- ✔️ CORS restricted to trusted origins for Dashboard usage
- ✔️ Audit logging captures every API invocation with outcome and latency
- ❌ Do not expose `/api/health/full` publicly without authentication

## Best Practices

- ✅ Run `health-check-all.sh` before deployments or major maintenance
- ✅ Configure cron/systemd timers aligned with monitoring SLAs
- ✅ Monitor cache hit rate to adjust TTL if necessary
- ✅ Keep timeout values balanced against service startup times
- ✅ Review remediation suggestions during post-incident analysis
- ⚠️ Avoid making health check outputs public; restrict access to internal teams

## Related Documentation

- [Service Launcher README](../../../../frontend/apps/service-launcher/README.md)
- [Prometheus Setup Guide](./prometheus-setup.md)
- [Alerting Policy](./alerting-policy.md)
- [Service Startup Guide](../service-startup-guide.md)
- [Ops Troubleshooting](../troubleshooting/README.md)

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0.0 | 2025-10-18 | Initial guide covering CLI script, Service Launcher `/api/health/full`, Prometheus metrics, and troubleshooting |

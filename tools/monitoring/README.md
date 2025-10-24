# Monitoring Stack

Docker Compose stack for the Prometheus + Alertmanager + Grafana monitoring platform described in the PRD.

## Requirements

- Docker Desktop (or Docker Engine) and Docker Compose v2
- Running TradingSystem services (Idea Bank API on port 3200, Documentation API on port 5175)
- Environment variables for integrations:
  - SLACK_WEBHOOK_URL: Incoming webhook for the #ops-alertas channel
  - GITHUB_TOKEN: Personal access token with 
epo scope (issue creation)
  - GITHUB_OWNER: GitHub organisation/owner (e.g. marceloterra)
  - GITHUB_REPO: Repository name receiving alert tickets

## Usage

`powershell
cd infrastructure/monitoring
 = 'https://hooks.slack.com/services/...'
 = 'ghp_xxx'
 = 'marceloterra'
 = 'TradingSystem'
docker compose up -d --build
`

Services exposed locally:

| Service       | URL                    |
|---------------|------------------------|
| Prometheus    | http://localhost:9090  |
| Alertmanager  | http://localhost:9093  |
| Grafana       | http://localhost:3000  (admin/admin by default)
| Alert Router  | http://localhost:8080  (health endpoint)

> Grafana auto-loads the TradingSystem Core Services dashboard and the Prometheus datasource via provisioning files under grafana/.

## Platform-Specific Configuration

### Linux / WSL2

The monitoring stack is configured for Linux/WSL2 by default with `node-exporter` container for host metrics.

**Access to host services from containers:**

On Linux, `host.docker.internal` does not exist by default. The `docker-compose.yml` includes `extra_hosts` mapping to enable this:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

This allows Prometheus to scrape services running on the host (e.g., native API services on ports 3100, 3200, etc.).

**Alternative: Container-based exporters**

For services running in other Docker networks, use container service names:

```yaml
# In prometheus.yml
scrape_configs:
  - job_name: 'timescaledb'
    static_configs:
      - targets:
          - timescaledb-exporter:9187  # If on same network
```

### Windows

For native Windows (not WSL2), install the Windows exporter service:

```powershell
$VERSION = '0.25.1'
$FILE = "windows_exporter-$VERSION-amd64.zip"
Invoke-WebRequest -Uri "https://github.com/prometheus-community/windows_exporter/releases/download/v$VERSION/$FILE" -OutFile $FILE
Expand-Archive $FILE -DestinationPath 'C:\windows-exporter' -Force
& 'C:\windows-exporter\windows_exporter-$VERSION-amd64\install-service.ps1'
```

Then update `prometheus/prometheus.yml` to add the Windows exporter endpoint (default port 9182):

```yaml
scrape_configs:
  - job_name: 'windows-exporter'
    static_configs:
      - targets:
          - host.docker.internal:9182
```

## Alert routing to GitHub

The lert-router service receives Alertmanager webhooks and mirrors *warning* alerts into GitHub issues:

- Firing alerts create (or comment on) issues labelled lert and severity:<level>
- Resolved alerts add a closing comment and close the issue

Ensure the token has permission to create labels and issues.

## Stopping the stack

`powershell
cd infrastructure/monitoring
docker compose down
`

Prometheus data is ephemeral. Persist volumes by uncommenting the volume mounts in docker-compose.yml if long-term storage is required.

# Health Check - TradingSystem

Custom command for comprehensive health monitoring of all services, containers, and databases.

## Usage

```bash
/health-check [options]
```

## Options

### `all` - Full health check (default)
Checks all services, containers, and databases.

**Example:**
```bash
/health-check all
```

**Equivalent to:**
```bash
bash scripts/maintenance/health-check-all.sh
```

**Checks:**
- ✅ Local services (Dashboard, APIs, Docusaurus)
- ✅ Docker containers (all stacks)
- ✅ Databases (QuestDB, TimescaleDB, PostgreSQL)
- ✅ Service connectivity and response times
- ✅ Resource usage (CPU, Memory, Disk)

### `services` - Check only local services
Checks local services without containers or databases.

**Example:**
```bash
/health-check services
```

**Equivalent to:**
```bash
bash scripts/maintenance/health-check-all.sh --services-only
```

**Services checked:**
- Dashboard (port 3103)
- Docusaurus (port 3004)
- Workspace API (port 3200)
- TP Capital (port 3200)
- B3 Market Data (port 3302)
- Documentation API (port 3400)
- Service Launcher (port 3500)
- Firecrawl Proxy (port 3600)

### `containers` - Check only Docker containers
Checks Docker container health.

**Example:**
```bash
/health-check containers
```

**Equivalent to:**
```bash
bash scripts/maintenance/health-check-all.sh --containers-only
```

### `databases` - Check only databases
Checks database connectivity and status.

**Example:**
```bash
/health-check databases
```

**Databases checked:**
- QuestDB (port 9000 HTTP, 8812 PostgreSQL)
- TimescaleDB (port 5432)
- PostgreSQL (port 5432)

### `api` - Use Service Launcher API (cached)
Checks health via Service Launcher API endpoint (faster, cached).

**Example:**
```bash
/health-check api
```

**Equivalent to:**
```bash
curl http://localhost:3500/api/health/full
```

**Note:** Results are cached for 30 seconds.

## Output Formats

### `json` - JSON format
Returns results in JSON format (useful for automation).

**Example:**
```bash
/health-check all json
```

**Equivalent to:**
```bash
bash scripts/maintenance/health-check-all.sh --format json
```

### `prometheus` - Prometheus metrics
Exports health metrics in Prometheus format.

**Example:**
```bash
/health-check all prometheus
```

**Equivalent to:**
```bash
bash scripts/maintenance/health-check-all.sh --format prometheus
```

## Health Status Indicators

**Overall Health:**
- 🟢 **HEALTHY** - All services operational
- 🟡 **DEGRADED** - Some services down but system functional
- 🔴 **CRITICAL** - Critical services down, system compromised

**Individual Services:**
- ✅ **UP** - Service responding
- ❌ **DOWN** - Service not responding
- ⚠️ **SLOW** - Service responding but slow (>1s)
- ⏱️ **TIMEOUT** - Service timed out

## Common Issues & Solutions

### Service not responding
1. Check if service is running: `ps aux | grep <service>`
2. Check service logs: `tail -f <service-path>/logs/*.log`
3. Restart service: `cd <service-path> && npm run dev`

### Container not healthy
1. Check container logs: `docker logs <container-name>`
2. Restart container: `docker restart <container-name>`
3. Check resource limits: `docker stats <container-name>`

### Database connection failed
1. Verify database is running: `docker ps | grep <db-name>`
2. Check database logs: `docker logs <db-name>`
3. Test connectivity: `psql -h localhost -p <port> -U <user> -d <db>`

## Monitoring Integration

Health check results are exported to:
- **Prometheus**: Metrics at `:9090/metrics`
- **Grafana**: Dashboards at `:3000`
- **Service Launcher API**: `/api/health/full`

## See Also

- [Health Monitoring Guide](../../docs/context/ops/health-monitoring.md)
- [Service Startup Guide](../../docs/context/ops/service-startup-guide.md)
- [Troubleshooting Guide](../../docs/context/ops/troubleshooting.md)









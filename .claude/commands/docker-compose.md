# Docker Compose - TradingSystem

Custom command for Docker Compose stack management.

## Usage

```bash
/docker-compose <action> [stack]
```

## Actions

### `start-all` - Start all stacks
Starts all Docker Compose stacks (infrastructure, data, monitoring, frontend, AI tools).

**Example:**
```bash
/docker-compose start-all
```

**Equivalent to:**
```bash
bash scripts/services/start-all.sh
```

### `stop-all` - Stop all stacks
Stops all running Docker Compose stacks.

**Example:**
```bash
/docker-compose stop-all
```

**Equivalent to:**
```bash
bash scripts/services/stop-all.sh
```

### `start` - Start specific stack
Starts a specific Docker Compose stack.

**Available stacks:**
- `infra` - Infrastructure services (Prometheus, Grafana)
- `data` - Data services (QuestDB, TimescaleDB)
- `monitoring` - Monitoring stack
- `frontend` - Frontend services
- `ai` - AI tools and services

**Examples:**
```bash
/docker-compose start infra
/docker-compose start monitoring
```

### `stop` - Stop specific stack
Stops a specific Docker Compose stack.

**Example:**
```bash
/docker-compose stop infra
```

### `status` - Check stack status
Shows status of all stacks and containers.

**Example:**
```bash
/docker-compose status
```

**Shows:**
- Running containers
- Container health
- Resource usage
- Port mappings

### `logs` - View stack logs
Shows logs for a specific stack or container.

**Examples:**
```bash
/docker-compose logs infra
/docker-compose logs prometheus
```

### `restart` - Restart stack or service
Restarts a stack or specific service.

**Examples:**
```bash
/docker-compose restart infra
/docker-compose restart prometheus
```

## Stack Locations

Docker Compose files are organized by domain:

```
infrastructure/
├── compose/
│   ├── docker-compose.infra.yml
│   └── docker-compose.data.yml
├── monitoring/
│   └── docker-compose.monitoring.yml
frontend/
└── compose/
    └── docker-compose.frontend.yml
ai/
└── compose/
    └── docker-compose.ai.yml
```

## Common Tasks

**Check container health:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**View resource usage:**
```bash
docker stats --no-stream
```

**Clean up unused resources:**
```bash
docker system prune -f
```

## See Also

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Service Startup Guide](../../docs/context/ops/service-startup-guide.md)









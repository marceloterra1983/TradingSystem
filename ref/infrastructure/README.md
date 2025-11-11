# Infrastructure Reference

> **Docker, databases, monitoring, and DevOps** - Infrastructure as Code
> **Last Updated:** 2025-11-05

## Overview

TradingSystem infrastructure runs on **Docker Compose** with multiple stacks for databases, monitoring, APIs, and AI services. All configurations follow Infrastructure as Code principles.

## Docker Compose Stacks

**Location:** `tools/compose/`

### Active Stacks

| Stack | File | Services | Purpose |
|-------|------|----------|---------|
| **Database UI** | docker-compose.4-0-database-ui-stack.yml | pgAdmin, Adminer, pgWeb, QuestDB | Database tooling |
| **TP Capital** | docker-compose.4-1-tp-capital-stack.yml | TimescaleDB, PgBouncer, Redis, API | Domain stack (signals) |
| **Qdrant** | docker-compose.qdrant-ha.yml | Qdrant cluster (3 nodes) | Vector database (RAG) |
| **Monitoring** | docker-compose.6-1-monitoring-stack.yml | Prometheus, Grafana | Observability |
| **RAG** | docker-compose.4-4-rag-stack.yml | LlamaIndex, Ollama | AI/RAG system |
| **Documentation** | docker-compose.2-docs-stack.yml | Docusaurus, NGINX | Docs hub |
| **Apps** | docker-compose.apps.yml | Workspace, TP Capital | Application services |

### Stack Management

```bash
# Start all stacks
bash scripts/docker/start-stacks.sh

# Stop all stacks
bash scripts/docker/stop-stacks.sh

# Individual stack
docker compose -p 4-0-database-ui-stack -f tools/compose/docker-compose.4-0-database-ui-stack.yml up -d
docker compose -p 4-0-database-ui-stack -f tools/compose/docker-compose.4-0-database-ui-stack.yml down
```

## Databases

### TimescaleDB (Time-Series PostgreSQL)

**Port:** 7032
**Purpose:** Time-series data storage (workspace, analytics)
**Technology:** PostgreSQL 15 + TimescaleDB extension

**Configuration:**
```yaml
# tools/compose/docker-compose.4-1-tp-capital-stack.yml
tp-capital-timescaledb:
  image: timescale/timescaledb:latest-pg16
  container_name: tp-capital-timescale
  ports:
    - "5440:5432"
  env_file:
    - ../../.env
    - ../../.env.shared
  environment:
    POSTGRES_DB: tp_capital_db
    POSTGRES_USER: ${TP_CAPITAL_DB_USER:-tp_capital}
    POSTGRES_PASSWORD: ${TP_CAPITAL_DB_PASSWORD:-tp_capital_secure_pass_2024}
    TIMESCALEDB_TELEMETRY: 'off'
  volumes:
    - tp-capital-timescaledb-data:/var/lib/postgresql/data
    - ../../backend/data/timescaledb/tp-capital:/docker-entrypoint-initdb.d:ro
  healthcheck:
    test: ['CMD', 'pg_isready', '-U', '${TP_CAPITAL_DB_USER:-tp_capital}', '-d', 'tp_capital_db']
    interval: 10s
    timeout: 5s
    retries: 5
```

**Connection:**
```bash
# CLI
psql -h localhost -p 7032 -U postgres -d trading_system

# Connection string
postgresql://postgres:password@localhost:7032/trading_system
```

**Schemas:**
- `workspace` - Workspace items
- `analytics` - Analytics data
- `audit` - Audit logs

---

### QuestDB (High-Performance Time-Series)

**HTTP Port:** 7040
**ILP Port:** 7039 (InfluxDB Line Protocol)
**Purpose:** High-throughput ingestion (TP Capital signals)
**Technology:** QuestDB 7.x

**Configuration:**
```yaml
questdb:
  image: questdb/questdb:latest
  container_name: questdb
  ports:
    - "7040:9000"  # HTTP/REST API
    - "7039:9009"  # ILP (InfluxDB Line Protocol)
  environment:
    - QDB_CAIRO_COMMIT_LAG=1000
    - QDB_PG_ENABLED=true
  volumes:
    - questdb-data:/var/lib/questdb
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Connection:**
```bash
# HTTP API
curl http://localhost:7040/exec?query=SELECT%20*%20FROM%20signals

# ILP (InfluxDB Line Protocol)
echo "signals,symbol=WINZ25 price=120000 $(date +%s)000000000" | nc localhost 7039
```

**Tables:**
- `signals` - Trading signals from Telegram
- `executions` - Order executions
- `market_data` - Real-time market data

---

### Redis (Caching & Sessions)

**Port:** 7079
**Purpose:** Caching, session storage, pub/sub
**Technology:** Redis 7.x

**Configuration:**
```yaml
redis:
  image: redis:7-alpine
  container_name: redis
  ports:
    - "7079:6379"
  command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 2gb --maxmemory-policy allkeys-lru
  volumes:
    - redis-data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Connection:**
```bash
# CLI
redis-cli -h localhost -p 7079 -a ${REDIS_PASSWORD}

# Connection string
redis://:password@localhost:7079
```

**Usage patterns:**
- Cache API responses (TTL: 5-60 minutes)
- Session storage (TTL: 24 hours)
- Pub/Sub for real-time updates
- Rate limiting counters

---

### Qdrant (Vector Database)

**Port:** 7050
**Purpose:** Semantic search for RAG system
**Technology:** Qdrant 1.x

**Configuration:**
```yaml
# tools/compose/docker-compose.qdrant-ha.yml
qdrant-node1:
  image: qdrant/qdrant:latest
  container_name: qdrant-node1
  ports:
    - "7050:6333"
  environment:
    - QDRANT__CLUSTER__ENABLED=true
    - QDRANT__CLUSTER__NODE_ID=1
  volumes:
    - qdrant-storage:/qdrant/storage
```

**Collections:**
- `docs_index_mxbai` - Documentation embeddings (384 dimensions, mxbai-embed-large)
- `code_index` - Code embeddings (planned)

**API:**
```bash
# List collections
curl http://localhost:7050/collections

# Search
curl -X POST http://localhost:7050/collections/docs_index_mxbai/points/search \
  -H "Content-Type: application/json" \
  -d '{"vector": [...], "limit": 10}'
```

## Monitoring

### Prometheus (Metrics Collection)

**Port:** 9090
**Purpose:** Time-series metrics database
**Technology:** Prometheus 2.x

**Configuration:**
```yaml
# tools/monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'workspace-api'
    static_configs:
      - targets: ['workspace:3200']

  - job_name: 'tp-capital'
    static_configs:
      - targets: ['tp-capital:4005']

  - job_name: 'timescaledb'
    static_configs:
      - targets: ['timescaledb-exporter:9187']

  - job_name: 'questdb'
    static_configs:
      - targets: ['questdb:7040']
```

**Metrics endpoints:**
- Workspace API: http://localhost:3200/metrics
- TP Capital: http://localhost:4005/metrics

**Query examples:**
```promql
# HTTP request rate
rate(http_requests_total[5m])

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
```

---

### Grafana (Visualization)

**Port:** 3000
**Purpose:** Metrics visualization and dashboards
**Technology:** Grafana 10.x

**Configuration:**
```yaml
grafana:
  image: grafana/grafana:latest
  container_name: grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_USER=admin
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    - GF_INSTALL_PLUGINS=redis-datasource
  volumes:
    - grafana-data:/var/lib/grafana
    - ./dashboards:/etc/grafana/provisioning/dashboards
```

**Dashboards:**
- **System Overview** - CPU, memory, disk, network
- **Service Health** - Service uptime, error rates
- **Database Performance** - Query times, connections
- **API Metrics** - Request rates, latency, errors
- **Business Metrics** - Trading signals, executions

**Access:** http://localhost:3000
**Default credentials:** admin / ${GRAFANA_PASSWORD}

## RAG System

### LlamaIndex (Query Engine)

**Port:** 8202
**Purpose:** RAG query engine with semantic search
**Technology:** FastAPI + LlamaIndex

**Configuration:**
```yaml
llamaindex:
  build:
    context: ../../ai/llamaindex
  container_name: llamaindex
  ports:
    - "8202:8202"
  environment:
    - QDRANT_URL=http://qdrant:6333
    - OLLAMA_BASE_URL=http://ollama:11434
    - EMBEDDING_MODEL=mxbai-embed-large
    - LLM_MODEL=llama3.2:3b
  depends_on:
    - qdrant
    - ollama
```

**Endpoints:**
```
GET    /api/v1/rag/search       - Semantic search
POST   /api/v1/rag/query        - Q&A with context
GET    /api/v1/rag/collections  - List collections
POST   /api/v1/rag/ingest       - Ingest documents
```

---

### Ollama (LLM Runtime)

**Port:** 11434
**Purpose:** Local LLM inference
**Technology:** Ollama

**Models:**
- `mxbai-embed-large` - Embeddings (384 dimensions)
- `llama3.2:3b` - Text generation
- `llama3.1:8b` - Advanced generation (optional)

**Configuration:**
```yaml
ollama:
  image: ollama/ollama:latest
  container_name: ollama
  ports:
    - "11434:11434"
  volumes:
    - ollama-data:/root/.ollama
  environment:
    - OLLAMA_HOST=0.0.0.0
```

**Model management:**
```bash
# List models
docker exec ollama ollama list

# Pull model
docker exec ollama ollama pull mxbai-embed-large

# Run model
docker exec ollama ollama run llama3.2:3b "Hello!"
```

## Networking

**Docker networks:**
```yaml
networks:
  trading-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**Service discovery:**
- Services communicate via container names (DNS)
- Example: `http://timescaledb:5432`, `http://redis:6379`

## Volumes

**Persistent data:**
```yaml
volumes:
  timescaledb-data:     # TimescaleDB data
  questdb-data:         # QuestDB data
  redis-data:           # Redis data
  qdrant-storage:       # Qdrant vectors
  grafana-data:         # Grafana dashboards
  prometheus-data:      # Prometheus metrics
  ollama-data:          # Ollama models
```

**Backup:**
```bash
# Backup volume
docker run --rm -v timescaledb-data:/data -v $(pwd):/backup ubuntu tar czf /backup/timescaledb-backup.tar.gz /data

# Restore volume
docker run --rm -v timescaledb-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/timescaledb-backup.tar.gz -C /
```

## Health Checks

**Container health:**
```bash
# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check specific service
docker inspect --format='{{.State.Health.Status}}' timescaledb

# View health logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' timescaledb
```

**Service health endpoints:**
```bash
# TimescaleDB
docker exec timescaledb pg_isready -U postgres

# Redis
docker exec redis redis-cli ping

# QuestDB
curl http://localhost:7040/

# Qdrant
curl http://localhost:7050/health
```

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Find process using port
lsof -ti:7032 | xargs kill -9

# Check Docker port mapping
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

**Container won't start:**
```bash
# View logs
docker logs timescaledb --tail 50

# Check health status
docker inspect timescaledb | jq '.[0].State.Health'

# Restart container
docker restart timescaledb
```

**Volume issues:**
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect timescaledb-data

# Remove unused volumes
docker volume prune
```

**Network issues:**
```bash
# List networks
docker network ls

# Inspect network
docker network inspect trading-network

# Reconnect container
docker network connect trading-network timescaledb
```

## Security

**Best practices:**
- ✅ Use environment variables for secrets
- ✅ Enable authentication on all services
- ✅ Use internal networks (no external exposure)
- ✅ Regular security updates (Dependabot)
- ✅ Health checks for all containers
- ✅ Resource limits (CPU, memory)
- ✅ Volume backups

**Environment variables:**
```bash
# .env (project root)
TIMESCALEDB_PASSWORD=secure_password
REDIS_PASSWORD=secure_password
GRAFANA_PASSWORD=secure_password
QDRANT_API_KEY=secure_api_key
```

## Performance Tuning

**Resource limits:**
```yaml
services:
  timescaledb:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

**Database optimization:**
```sql
-- TimescaleDB: Create hypertable
SELECT create_hypertable('signals', 'timestamp');

-- Create index
CREATE INDEX idx_signals_symbol ON signals (symbol, timestamp DESC);

-- Set retention policy (90 days)
SELECT add_retention_policy('signals', INTERVAL '90 days');
```

## Deployment

**Production checklist:**
- [ ] Set strong passwords in `.env`
- [ ] Enable SSL/TLS for databases
- [ ] Configure backups (daily)
- [ ] Set up monitoring alerts
- [ ] Enable log rotation
- [ ] Configure resource limits
- [ ] Test disaster recovery

**Backup script:**
```bash
#!/bin/bash
# scripts/backup/backup-all.sh

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/backups/$DATE"

mkdir -p "$BACKUP_DIR"

# Backup TimescaleDB
docker exec timescaledb pg_dump -U postgres trading_system | gzip > "$BACKUP_DIR/timescaledb.sql.gz"

# Backup QuestDB
docker exec questdb tar czf - /var/lib/questdb > "$BACKUP_DIR/questdb.tar.gz"

# Backup Redis
docker exec redis redis-cli --rdb /data/dump.rdb SAVE
docker cp redis:/data/dump.rdb "$BACKUP_DIR/redis.rdb"

echo "Backup completed: $BACKUP_DIR"
```

## Additional Resources

- **Docker Compose Docs:** https://docs.docker.com/compose/
- **TimescaleDB Docs:** https://docs.timescale.com/
- **QuestDB Docs:** https://questdb.io/docs/
- **Qdrant Docs:** https://qdrant.tech/documentation/
- **Prometheus Docs:** https://prometheus.io/docs/
- **Grafana Docs:** https://grafana.com/docs/

# Docker Compose Quick Reference

## Port Validation

### Check for Conflicts Before Starting Services
```bash
bash scripts/tools/validate-ports.sh
```

### Check Which Ports Are In Use
```bash
# Linux/WSL2
ss -tuln | grep LISTEN

# Check specific port
ss -tuln | grep :3000
```

### Find Process Using a Port
```bash
sudo lsof -i :3000
# or
sudo netstat -tulpn | grep :3000
```

## Common Port Ranges

### Frontend & APIs
- **3000-3099:** Frontend UI (Grafana, Firecrawl API)
- **3100-3199:** Dashboard UI (3103 = main dashboard)
- **3200-3299:** Integrations (3210 = workspace-api)
- **3400-3499:** Documentation (3404 = docs-hub, 3405 = docs-api)
- **3500-3699:** Automation (3600 = firecrawl-proxy)

### External Services
- **4000-4099:** External Integrations (4007 = telegram-mtproto, 4008 = tp-capital-api, 4010 = telegram-gateway-api)
- **4200-4299:** App UIs (4201 = course-crawler-app)

### Databases
- **5000-5499:** PostgreSQL/TimescaleDB instances
  - 5050 = pgAdmin
  - 5433-5450 = Various PostgreSQL/TimescaleDB instances
- **7000 range:** NOT USED (documented but not implemented)

### Cache & Queue
- **6300-6399:** Redis & Qdrant
  - 6333 = Qdrant vector DB
  - 6379-6390 = Redis instances (different stacks)
- **6400-6499:** Connection Poolers
  - 6432-6435 = PgBouncer instances

### Monitoring
- **9000-9299:** Prometheus, Grafana, QuestDB, Exporters
- **9300-9399:** Object Storage (MinIO)

### AI Services
- **8200-8299:** LlamaIndex (8201 = ingestion, 8202 = query)
- **11000-11999:** Ollama (11434)

### Management UIs
- **8000-8299:** DevTools (Kong, Kestra, pgWeb, Adminer)
- **15000-15999:** Admin UIs (15672 = RabbitMQ Management)
- **26000-26999:** Sentinel (26379 = Redis Sentinel)

## Environment Variables

### Port Variable Naming Convention
```bash
# Format: <SERVICE>_<COMPONENT>_PORT
WORKSPACE_API_PORT=3210
TP_CAPITAL_API_PORT=4008
TELEGRAM_API_PORT=4010
DOCS_PORT=3404
DOCS_API_PORT=3405
```

### Database Connection Variables
```bash
# Pattern: <SERVICE>_DB_*
WORKSPACE_DB_HOST=workspace-db
WORKSPACE_DB_PORT=5432
WORKSPACE_DB_NAME=workspace
WORKSPACE_DB_USER=postgres
WORKSPACE_DB_PASSWORD=secure_pass
```

### Service URL Variables
```bash
# Pattern: <SERVICE>_URL or <SERVICE>_<COMPONENT>_URL
LLAMAINDEX_QUERY_URL=http://rag-llamaindex-query:8000
QDRANT_URL=http://data-qdrant:6333
OLLAMA_BASE_URL=http://rag-ollama:11434
```

## Docker Compose Commands

### Starting Services
```bash
# Start entire stack
docker compose -f tools/compose/docker-compose.STACK.yml up -d

# Start specific service
docker compose -f tools/compose/docker-compose.STACK.yml up -d service-name

# Start with build (force rebuild)
docker compose -f tools/compose/docker-compose.STACK.yml up -d --build
```

### Viewing Logs
```bash
# All services
docker compose -f tools/compose/docker-compose.STACK.yml logs -f

# Specific service
docker compose -f tools/compose/docker-compose.STACK.yml logs -f service-name

# Last N lines
docker compose -f tools/compose/docker-compose.STACK.yml logs --tail=100 service-name
```

### Checking Status
```bash
# List running services
docker compose -f tools/compose/docker-compose.STACK.yml ps

# Check health status
docker compose -f tools/compose/docker-compose.STACK.yml ps --format json | jq '.[] | {name: .Name, health: .Health}'
```

### Restarting Services
```bash
# Restart specific service
docker compose -f tools/compose/docker-compose.STACK.yml restart service-name

# Restart all services
docker compose -f tools/compose/docker-compose.STACK.yml restart
```

### Stopping Services
```bash
# Stop entire stack
docker compose -f tools/compose/docker-compose.STACK.yml down

# Stop and remove volumes (CAUTION - deletes data)
docker compose -f tools/compose/docker-compose.STACK.yml down -v

# Stop specific service
docker compose -f tools/compose/docker-compose.STACK.yml stop service-name
```

### Debugging
```bash
# Shell into container
docker compose -f tools/compose/docker-compose.STACK.yml exec service-name sh
# or for bash
docker compose -f tools/compose/docker-compose.STACK.yml exec service-name bash

# Run one-off command
docker compose -f tools/compose/docker-compose.STACK.yml exec service-name ls -la

# Check environment variables
docker compose -f tools/compose/docker-compose.STACK.yml exec service-name env

# Inspect container
docker inspect container-name

# Check logs of stopped container
docker logs container-name
```

### Database Operations
```bash
# PostgreSQL
docker compose -f tools/compose/docker-compose.STACK.yml exec database-service \
  psql -U username -d database_name

# Redis
docker compose -f tools/compose/docker-compose.STACK.yml exec cache-service redis-cli INFO

# QuestDB
curl http://localhost:9002/health
```

### Network Debugging
```bash
# List networks
docker network ls

# Inspect network
docker network inspect tradingsystem_backend

# Check DNS resolution
docker compose -f tools/compose/docker-compose.STACK.yml exec service-name \
  nslookup other-service-name

# Test connectivity
docker compose -f tools/compose/docker-compose.STACK.yml exec service-name \
  curl http://other-service:port/health
```

### Volume Management
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect volume-name

# Remove unused volumes
docker volume prune

# Backup volume data
docker run --rm -v volume-name:/data -v $(pwd):/backup alpine \
  tar czf /backup/backup.tar.gz -C /data .

# Restore volume data
docker run --rm -v volume-name:/data -v $(pwd):/backup alpine \
  tar xzf /backup/backup.tar.gz -C /data
```

## Common Issues & Solutions

### Port Already in Use
```bash
# Find what's using the port
sudo lsof -i :PORT_NUMBER

# Kill the process
sudo kill -9 PID

# Or change the port in .env
echo "SERVICE_PORT=NEW_PORT" >> .env
```

### Service Won't Start
```bash
# Check logs
docker compose -f tools/compose/docker-compose.STACK.yml logs service-name

# Check health status
docker inspect container-name --format='{{.State.Health.Status}}'

# Verify dependencies are healthy
docker compose -f tools/compose/docker-compose.STACK.yml ps
```

### Container Can't Connect to Another Service
```bash
# Check networks
docker inspect container-name --format='{{json .NetworkSettings.Networks}}' | jq

# Verify both containers are on same network
docker network inspect tradingsystem_backend

# Test DNS resolution
docker compose -f tools/compose/docker-compose.STACK.yml exec service-name \
  ping other-service

# Use container name, NOT localhost
# ✅ CORRECT: http://other-service:3000
# ❌ WRONG: http://localhost:3000
```

### Environment Variables Not Loading
```bash
# Verify .env file exists
ls -la .env

# Check env_file path in compose file
grep -A2 "env_file:" tools/compose/docker-compose.STACK.yml

# Must be: ../../.env (relative to compose file)

# Check variables are loaded
docker compose -f tools/compose/docker-compose.STACK.yml config
```

### Volume Permission Issues
```bash
# Check volume ownership
docker compose -f tools/compose/docker-compose.STACK.yml exec service-name \
  ls -la /path/to/mounted/volume

# Fix permissions (if needed)
docker compose -f tools/compose/docker-compose.STACK.yml exec -u root service-name \
  chown -R user:group /path/to/volume
```

## Best Practices Checklist

### Before Creating New Compose File
- [ ] Use TEMPLATE-BEST-PRACTICES.yml as starting point
- [ ] Check port availability with validate-ports.sh
- [ ] Use unique port variables with defaults: `${SERVICE_PORT:-default}`
- [ ] Load .env from project root: `../../.env`
- [ ] Set explicit container_name for each service
- [ ] Define health checks for all services
- [ ] Use `condition: service_healthy` in depends_on
- [ ] Join tradingsystem_backend network for cross-stack communication
- [ ] Use container names for service URLs (not localhost)
- [ ] Mount source code as `:ro` (read-only) where possible
- [ ] Define resource limits for production services
- [ ] Add descriptive labels

### Before Deployment
- [ ] Run port validation: `bash scripts/tools/validate-ports.sh`
- [ ] Check .env has all required variables
- [ ] Verify health check endpoints work
- [ ] Test service-to-service communication
- [ ] Check volume permissions
- [ ] Verify network connectivity
- [ ] Test restart behavior
- [ ] Check log output for errors

### After Deployment
- [ ] Verify all services are healthy: `docker compose ps`
- [ ] Check logs for errors: `docker compose logs`
- [ ] Test external access (host ports)
- [ ] Test internal access (container-to-container)
- [ ] Monitor resource usage: `docker stats`
- [ ] Verify data persistence (restart and check volumes)

## Advanced Operations

### Multi-Stack Orchestration
```bash
# Start multiple stacks
docker compose -f tools/compose/docker-compose.workspace-simple.yml up -d
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d
docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml up -d

# Or use helper scripts
bash scripts/docker/start-stacks.sh
```

### Service Scaling
```bash
# Scale service (if supported)
docker compose -f tools/compose/docker-compose.STACK.yml up -d --scale service-name=3
```

### Resource Monitoring
```bash
# Real-time stats
docker stats

# Container inspect
docker inspect container-name | jq '.[0].State'

# Health check history
docker inspect container-name | jq '.[0].State.Health.Log'
```

### Cleanup
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Nuclear option (remove everything)
docker system prune -a --volumes
```

## Quick Troubleshooting

### Service keeps restarting
1. Check logs: `docker compose logs service-name`
2. Check health check: `docker inspect container-name | jq '.[0].State.Health'`
3. Verify dependencies are healthy: `docker compose ps`
4. Check port conflicts: `bash scripts/tools/validate-ports.sh`

### Database connection fails
1. Verify database is healthy: `docker compose ps database-name`
2. Check connection string uses container name: `http://database-name:5432`
3. Verify both services on same network: `docker network inspect tradingsystem_backend`
4. Test connectivity: `docker compose exec service-name ping database-name`

### Redis connection fails
1. Check Redis is running: `docker compose exec redis-service redis-cli PING`
2. Verify connection string: `redis://redis-service:6379`
3. Check network: Both services must be on same network

### API returns 502 Bad Gateway
1. Check upstream service is healthy: `docker compose ps`
2. Verify URL uses container name: `http://upstream-service:3000`
3. Check logs of upstream service: `docker compose logs upstream-service`
4. Test connectivity: `docker compose exec gateway-service curl http://upstream-service:3000/health`

## See Also
- Full audit report: `outputs/DOCKER-COMPOSE-PORT-AUDIT-2025-11-07.md`
- Best practices template: `tools/compose/TEMPLATE-BEST-PRACTICES.yml`
- Port validation script: `scripts/tools/validate-ports.sh`
- Health check script: `scripts/maintenance/health-check-all.sh`

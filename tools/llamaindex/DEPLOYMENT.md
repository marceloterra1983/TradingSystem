---
title: LlamaIndex Services Deployment Guide
sidebar_position: 1
tags: [deployment]
domain: ops
type: guide
summary: This guide covers the deployment and operation of the LlamaIndex-based documentation services.
status: active
last_review: "2025-10-23"
---

# LlamaIndex Services Deployment Guide

This guide covers the deployment and operation of the LlamaIndex-based documentation services.

## Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 18+ (for monitoring dashboards)
- At least 4GB RAM
- SSD storage for vector database

## Configuration

### Environment Variables

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Required variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `JWT_SECRET_KEY`: Secret for JWT token generation
- `QDRANT_API_KEY`: API key for Qdrant (in production)

Optional configurations:
- `LOG_LEVEL`: Logging level (default: INFO)
- `RATE_LIMIT_REQUESTS`: Requests per period (default: 100)
- `RATE_LIMIT_PERIOD`: Period in seconds (default: 60)
- `CACHE_TYPE`: Cache backend (memory/redis)

### Unified Domain + Proxy (Recommended)

When serving the dashboard and APIs under a single domain (e.g., `http://tradingsystem.local`), route app traffic via the Documentation API proxy. This avoids exposing tokens to the browser and simplifies CORS.

Frontend `.env` (dashboard):

```
VITE_USE_UNIFIED_DOMAIN=true
VITE_API_BASE_URL=http://tradingsystem.local
# Query service direct URL still used in non-unified mode
VITE_LLAMAINDEX_QUERY_URL=http://localhost:8202
```

Backend `.env` (documentation-api):

```
# Where the LlamaIndex Query service is listening
LLAMAINDEX_QUERY_URL=http://localhost:8202
# JWT config (must match query service)
JWT_SECRET_KEY=dev-secret
JWT_ALGORITHM=HS256
```

Nginx snippet:

```
server {
  listen 80;
  server_name tradingsystem.local;

  # Proxy for Documentation API (includes RAG proxy)
  location /api/ {
    proxy_pass http://localhost:3400/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Dashboard (Vite / SPA)
  location / {
    proxy_pass http://localhost:3103/;
    proxy_set_header Host $host;
  }
}
```

The UI automatically prefers the proxy (`/api/v1/rag`) when `VITE_USE_UNIFIED_DOMAIN=true` and `VITE_API_BASE_URL` are set; otherwise it calls the LlamaIndex Query service directly on `VITE_LLAMAINDEX_QUERY_URL`.

### Security Configuration

1. Generate secure keys:
```bash
openssl rand -hex 32 > jwt_secret.key
openssl rand -hex 32 > qdrant.key
```

2. Configure SSL certificates (production):
```bash
# Generate self-signed certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/private.key -out certs/certificate.crt
```

## Deployment Options

### Local Development

```bash
# Start AI & ML Tools stack (includes LlamaIndex + Qdrant)
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d

# Monitor logs
docker compose -f infrastructure/compose/docker-compose.infra.yml logs -f llamaindex-query llamaindex-ingestion

# Run tests
pytest tests/
```

### Production Deployment

1. Build production images:
```bash
cd infrastructure/compose
docker compose -f docker-compose.infra.yml build llamaindex-query llamaindex-ingestion
```

2. Deploy services:
```bash
docker compose -f docker-compose.infra.yml up -d
```

3. Verify deployment:
```bash
# Query service (exposed on host)
curl http://localhost:3450/health

# Ingestion service (internal only, check via container)
docker exec infra-llamaindex_ingestion curl -f http://localhost:8000/health

# Qdrant vector database
curl http://localhost:6333/healthz
```

**Port mapping:**
- **Query Service**: `3450` (host) → `8000` (container) - External API
- **Ingestion Service**: Internal only (no host port) - Container-to-container communication
- **Qdrant HTTP**: `6333` - Vector database REST API
- **Qdrant gRPC**: `6334` - Vector database gRPC

### Kubernetes Deployment

1. Apply configuration:
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
```

2. Deploy services:
```bash
kubectl apply -f k8s/qdrant.yaml
kubectl apply -f k8s/ingestion.yaml
kubectl apply -f k8s/query.yaml
```

## Monitoring & Maintenance

### Metrics & Monitoring

**Prometheus integration:**

LlamaIndex services can expose metrics for Prometheus scraping. Configure Prometheus to scrape the services:

```yaml
# In prometheus.yml
scrape_configs:
  - job_name: 'llamaindex-query'
    static_configs:
      - targets:
          - infra-llamaindex_query:8000  # If on same Docker network
```

**Grafana dashboards:**

- Import dashboard JSONs from monitoring stack
- Configure Prometheus data source at http://prometheus:9090

**Application Logs:**

```bash
# View real-time logs
docker compose -f infrastructure/compose/docker-compose.infra.yml logs -f llamaindex-query

# Export logs
docker logs infra-llamaindex_query > llamaindex-query.log 2>&1
```

### Health Checks

Monitor service health:
```bash
# Query service (external)
curl http://localhost:3450/health

# Ingestion service (internal - via container exec)
docker exec infra-llamaindex_ingestion curl -f http://localhost:8000/health

# Qdrant
curl http://localhost:6333/healthz

# Check all services via Docker
docker compose -f infrastructure/compose/docker-compose.infra.yml ps
```

### Backup & Recovery

1. Backup Qdrant data:
```bash
docker-compose exec qdrant qdrant-backup /backup
```

2. Restore from backup:
```bash
docker-compose exec qdrant qdrant-restore /backup
```

## Scaling Guidelines

### Horizontal Scaling

1. Query Service:
- Stateless, can be scaled horizontally
- Use load balancer in front of multiple instances

2. Ingestion Service:
- Scale with caution
- Coordinate through distributed locks

3. Qdrant:
- Follow Qdrant clustering guide for production
- Configure replication for high availability

### Resource Recommendations

Minimum per service:
- Query Service: 2 CPU, 4GB RAM
- Ingestion Service: 2 CPU, 4GB RAM
- Qdrant: 4 CPU, 8GB RAM, 50GB SSD

## Troubleshooting

### Common Issues

1. Connection Errors:
```bash
# Check service connectivity
docker-compose ps
docker-compose logs [service_name]
```

2. Performance Issues:
- Check resource usage
- Review rate limiting settings
- Analyze Prometheus metrics

### Log Analysis

Access service logs:
```bash
# Tail service logs
docker-compose logs -f [service_name]

# Export logs
docker-compose logs [service_name] > service.log
```

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=DEBUG docker-compose up -d
```

## Security Considerations

1. API Authentication:
- Always use HTTPS in production
- Rotate JWT secrets regularly
- Implement API key rotation

2. Data Protection:
- Enable encryption at rest for Qdrant
- Regular security audits
- Monitor for unusual patterns

3. Network Security:
- Use private networks
- Configure firewalls
- Implement rate limiting

## Maintenance Procedures

### Regular Maintenance

1. Weekly tasks:
- Review error logs
- Check resource usage
- Update embeddings for changed docs

2. Monthly tasks:
- Rotate API keys
- Review security settings
- Backup Qdrant data

### Updates & Upgrades

1. Update services:
```bash
# Pull latest images
docker-compose pull

# Rolling update
docker-compose up -d --no-deps [service_name]
```

2. Database migrations:
- Follow Qdrant upgrade guide
- Test in staging first

## Performance Optimization

1. Caching:
- Configure Redis for production
- Tune cache TTL settings
- Monitor cache hit rates

2. Vector Search:
- Optimize chunk size
- Tune similarity thresholds
- Configure HNSW parameters

3. Rate Limiting:
- Adjust based on usage patterns
- Monitor rejection rates
- Implement retry strategies

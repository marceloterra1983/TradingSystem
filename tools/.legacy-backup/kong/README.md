# Kong Gateway Configuration

**Version:** 3.4  
**Purpose:** API Gateway for RAG Services  
**Deployment:** Docker Compose (self-hosted)  
**Last Updated:** 2025-11-03

---

## Overview

Kong Gateway provides centralized routing, authentication, rate limiting, and observability for RAG Services endpoints.

### Features Enabled

- ✅ **JWT Authentication** - Token validation for protected endpoints
- ✅ **Rate Limiting** - 100 req/min per IP (global), 50 req/min for /query
- ✅ **CORS** - Cross-origin support for Dashboard (localhost:3103)
- ✅ **Request Logging** - Audit trail for all requests
- ✅ **Prometheus Metrics** - /metrics endpoint for monitoring
- ✅ **Correlation IDs** - Request tracing across services

---

## Quick Start

### 1. Deploy Kong Stack

```bash
# Automated deployment
docker compose -f tools/compose/docker-compose.kong.yml up -d

# Wait for services to be healthy
docker compose -f tools/compose/docker-compose.kong.yml ps
```

### 2. Configure RAG Routes

```bash
# Run configuration script
bash scripts/kong/configure-rag-routes.sh

# Or configure via Konga UI
# Open http://localhost:1337 in browser
```

### 3. Test Routes

```bash
# Health check
curl http://localhost:8000/api/v1/rag/status/health

# Search (via Kong)
curl "http://localhost:8000/api/v1/rag/search?query=test&limit=5"

# Query (requires JWT)
curl -X POST http://localhost:8000/api/v1/rag/query \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "How to configure RAG?", "limit": 5}'
```

---

## Architecture

```
┌─────────────┐
│   Client    │
│ (Dashboard) │
└──────┬──────┘
       │ HTTP :8000
       ↓
┌──────────────────┐
│  Kong Gateway    │  - JWT validation
│  (Port 8000)     │  - Rate limiting
│                  │  - CORS
└──────┬───────────┘  - Logging
       │
       ├─────────────┬─────────────┐
       ↓             ↓             ↓
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│ RAG Service │ │ Collections  │ │ Other        │
│ :3000       │ │ Service      │ │ Services     │
└─────────────┘ │ :3402        │ │ (future)     │
                └──────────────┘ └──────────────┘
```

---

## Configured Routes

| Route Name | Method | Path | Upstream | Plugins |
|------------|--------|------|----------|---------|
| `rag-search` | GET | `/api/v1/rag/search` | rag-service:3000 | Rate limiting |
| `rag-query` | POST | `/api/v1/rag/query` | rag-service:3000 | JWT, Rate limiting |
| `rag-status` | GET | `/api/v1/rag/status/*` | rag-service:3000 | - |
| `rag-collections` | GET, POST | `/api/v1/rag/collections` | rag-collections:3402 | Rate limiting |

---

## Plugins

### Global Plugins

**1. CORS**
```yaml
origins: [http://localhost:3103, http://localhost:3400]
methods: [GET, POST, PUT, DELETE, OPTIONS]
credentials: true
max_age: 3600
```

**2. Rate Limiting (Global)**
```yaml
minute: 100    # 100 requests per minute per IP
hour: 5000     # 5000 requests per hour per IP
policy: local  # In-memory (for single-instance Kong)
```

**3. Correlation ID**
```yaml
header_name: X-Correlation-ID
generator: uuid
echo_downstream: true
```

**4. Prometheus**
```yaml
Metrics exposed at: http://localhost:8000/metrics
```

### Route-Specific Plugins

**JWT Authentication** (on `/query` only)
```yaml
route: rag-query
secret_is_base64: false
algorithm: HS256
claims_to_verify: [exp]
```

**Stricter Rate Limiting** (on `/query`)
```yaml
route: rag-query
minute: 50     # Lower limit for expensive operations
hour: 1000
```

---

## Management

### Kong Admin API

```bash
# List all services
curl http://localhost:8001/services | jq

# List all routes
curl http://localhost:8001/routes | jq

# List all plugins
curl http://localhost:8001/plugins | jq

# Kong status
curl http://localhost:8001/status | jq
```

### Konga UI

**Access:** http://localhost:1337

**First-time setup:**
1. Create admin account
2. Connect to Kong Admin API: `http://kong-gateway:8001`
3. Navigate to Services → View configured services
4. Navigate to Routes → View configured routes
5. Navigate to Plugins → Enable/disable plugins

---

## Monitoring

### Prometheus Metrics

```bash
# Scrape Kong metrics
curl http://localhost:8000/metrics

# Sample metrics:
# - kong_http_requests_total
# - kong_http_latency_ms
# - kong_datastore_reachable
# - kong_nginx_connections_total
```

### Request Logs

```bash
# Access logs (stdout)
docker logs kong-gateway 2>&1 | grep "GET /api/v1/rag"

# File logs (if file-log plugin enabled)
docker exec kong-gateway tail -f /var/log/kong/rag-access.log
```

---

## Troubleshooting

### Issue: 502 Bad Gateway

```bash
# Check if upstream services are running
curl http://rag-service:3000/api/v1/rag/status/health
curl http://rag-collections-service:3402/health

# Check Kong can reach upstreams
docker exec kong-gateway ping -c 3 rag-service
docker exec kong-gateway ping -c 3 rag-collections-service
```

### Issue: CORS Errors

```bash
# Verify CORS plugin configuration
curl http://localhost:8001/plugins | jq '.data[] | select(.name == "cors")'

# Test CORS preflight
curl -i -X OPTIONS http://localhost:8000/api/v1/rag/search \
  -H "Origin: http://localhost:3103" \
  -H "Access-Control-Request-Method: GET"

# Expected: HTTP 200 with Access-Control-Allow-Origin header
```

### Issue: Rate Limiting Too Strict

```bash
# Check rate limit configuration
curl http://localhost:8001/plugins | jq '.data[] | select(.name == "rate-limiting")'

# Increase limits
curl -X PATCH http://localhost:8001/plugins/PLUGIN_ID \
  --data config.minute=200 \
  --data config.hour=10000
```

---

## Security

### Inter-Service Authentication

Kong adds `X-Service-Token` header to all upstream requests:

```javascript
// Backend services should verify this header
function verifyServiceToken(req, res, next) {
  const token = req.headers['x-service-token'];
  if (token !== process.env.INTER_SERVICE_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

### JWT Token Validation

```bash
# Generate test JWT token
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'test-user', iss: 'rag-app-key' },
  process.env.JWT_SECRET_KEY || 'dev-secret',
  { algorithm: 'HS256', expiresIn: '1h' }
);
console.log(token);
"

# Use token in requests
curl -X POST http://localhost:8000/api/v1/rag/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 5}'
```

---

## Performance

### Expected Latency Overhead

```
Direct (without Kong): 8-10ms
Via Kong Gateway:      9-12ms
Overhead:              ~1-2ms (10-20% increase)
```

**Acceptable trade-off for:**
- Centralized authentication
- Rate limiting
- Audit logging
- Metrics collection

---

## References

- [Kong Gateway Documentation](https://docs.konghq.com/gateway/latest/)
- [Kong Admin API Reference](https://docs.konghq.com/gateway/latest/admin-api/)
- [Konga GitHub](https://github.com/pantsel/konga)

---

**Maintained By:** TradingSystem API Team  
**Support:** #api-gateway (Slack)  
**Last Review:** 2025-11-03



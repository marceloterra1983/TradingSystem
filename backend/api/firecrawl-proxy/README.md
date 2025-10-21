# Firecrawl Proxy API

## Overview
The Firecrawl Proxy API is a Node.js Express service that sits between the TradingSystem dashboard and the Firecrawl web scraping service. It validates incoming requests, applies rate limiting, adds structured logging and metrics, and translates Firecrawl responses into a consistent API contract for frontend consumption. The proxy runs on port 3600 and forwards traffic to the Firecrawl service running on port 3002.

## Quick Start
```bash
cd backend/api/firecrawl-proxy
npm install
npm run dev
```

The service listens on `http://localhost:3600`. Ensure Firecrawl is running locally on port 3002 (`docker compose up firecrawl`) before testing proxy endpoints.

## API Endpoints

### Health
`GET /health`

Returns service uptime and Firecrawl connectivity status.

**Response**
```json
{
  "success": true,
  "data": {
    "service": "firecrawl-proxy",
    "status": "ok",
    "firecrawl": {
      "reachable": true,
      "baseUrl": "http://localhost:3002"
    },
    "uptime": 125.381,
    "timestamp": "2024-11-18T12:34:56.789Z"
  }
}
```

### Scrape URL
`POST /api/v1/scrape`

Validates scrape parameters and proxies the request to `POST /v1/scrape`.
The proxy unwraps Firecrawl's native `{ success, data }` envelope so the dashboard receives the scraped content directly in the `data` field.

**Request**
```json
{
  "url": "https://news.ycombinator.com",
  "formats": ["markdown", "links"],
  "onlyMainContent": true,
  "timeout": 20000
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "markdown": "# Hacker News...",
    "links": [
      "https://news.ycombinator.com/item?id=1234"
    ],
    "metadata": {
      "title": "Hacker News",
      "fetchedAt": "2024-11-18T12:34:56.789Z"
    }
  }
}
```

**Failure (validation)**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Invalid value",
      "path": "url",
      "location": "body"
    }
  ]
}
```

**cURL**
```bash
curl -X POST http://localhost:3600/api/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","formats":["markdown","html"]}'
```

### Start Crawl Job
`POST /api/v1/crawl`

Starts a Firecrawl job with optional crawl configuration.

**Request**
```json
{
  "url": "https://example.com",
  "limit": 25,
  "maxDepth": 3,
  "excludePaths": ["*/blog/*"],
  "scrapeOptions": {
    "formats": ["markdown"]
  }
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "job-123",
    "url": "https://example.com"
  }
}
```

**cURL**
```bash
curl -X POST http://localhost:3600/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","limit":10,"maxDepth":2}'
```

### Crawl Status
`GET /api/v1/crawl/:id`

Fetches status and results for a Firecrawl job.

**Response**
```json
{
  "success": true,
  "data": {
    "id": "job-123",
    "status": "completed",
    "total": 25,
    "completed": 25,
    "creditsUsed": 25,
    "data": [
      {
        "url": "https://example.com",
        "markdown": "# Example Domain"
      }
    ]
  }
}
```

**cURL**
```bash
curl http://localhost:3600/api/v1/crawl/job-123
```

### Metrics
`GET /metrics`

Prometheus metrics for the proxy and Firecrawl interactions.

## Configuration

Environment variables are loaded from the root `.env` file.

| Variable | Description | Default |
| --- | --- | --- |
| `FIRECRAWL_PROXY_PORT` | Port for the proxy service | `3600` |
| `FIRECRAWL_PROXY_BASE_URL` | Base URL for Firecrawl service | `http://localhost:3002` |
| `FIRECRAWL_PROXY_TIMEOUT` | Request timeout (ms) | `30000` |
| `FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` |
| `FIRECRAWL_PROXY_RATE_LIMIT_MAX` | Max requests per window | `100` |
| `FIRECRAWL_PROXY_LOG_LEVEL` | Pino log level | `info` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `http://localhost:3103,http://localhost:3004` |

## Development

```bash
npm install
npm run dev
```

The dev script runs with watch mode (`node --watch`). Firecrawl must be running locally or reachable at the configured base URL for scrape/crawl requests to succeed.

## Testing

### Unit tests
```bash
npm run test
```
Runs Vitest against the mocked Supertest suite located in `src/__tests__/scrape.test.js`.

### Integration tests
```bash
npm run test:integration
```
Executes real HTTP requests against a running Firecrawl stack (proxy on port 3600, core on port 3002). The suite covers:
- `GET /health`
- `POST /api/v1/scrape` (valid/invalid payloads)
- `POST /api/v1/crawl` (valid/invalid parameters)
- `GET /api/v1/crawl/:id` (happy path and 404)

> **Prerequisites:** Start Firecrawl core via `bash scripts/firecrawl/start.sh` and the proxy (e.g. `npm run dev` or `scripts/services/start-all.sh`) before running integration tests.
> Optionally override the target URL via `FIRECRAWL_PROXY_TEST_URL` in the root `.env` (defaults to `http://localhost:3600`).

### Watch mode
```bash
npm run test:watch
```
Useful during development for rapid feedback.

Vitest is configured with V8 coverage reports; results are written to the default `.coverage` directory.

## Advanced Troubleshooting

### Rate Limit Tuning

**Problem**: Too many 429 responses
```bash
# Check current rate limit settings in root .env
grep FIRECRAWL_PROXY_RATE_LIMIT /home/marce/projetos/TradingSystem/.env

# Adjust values:
FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS=60000  # 1 minute window
FIRECRAWL_PROXY_RATE_LIMIT_MAX=200          # Increase from 100 to 200

# Restart service
sudo systemctl restart firecrawl-proxy
```

**Monitor rate limit hits:**
```bash
# Check Prometheus metrics
curl http://localhost:3600/metrics | grep rate_limit

# View logs for 429 responses
tail -f /var/log/firecrawl-proxy/service.log | grep "429"
```

### Upstream Connection Failures

**Problem**: 503 Service Unavailable errors
```bash
# Verify Firecrawl core is running
curl http://localhost:3002/v1/health

# Check Docker containers
docker ps | grep firecrawl

# Test connectivity from proxy
curl -v http://localhost:3002/v1/scrape -X POST \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Check network connectivity
ping -c 3 localhost
telnet localhost 3002
```

**Solution**: Ensure Firecrawl stack is running:
```bash
cd /home/marce/projetos/TradingSystem/infrastructure/firecrawl/firecrawl-source
docker compose up -d
```

### Timeout Issues

**Problem**: 504 Gateway Timeout errors
```bash
# Increase timeout in root .env
FIRECRAWL_PROXY_TIMEOUT=60000  # Increase from 30s to 60s

# Restart service
sudo systemctl restart firecrawl-proxy

# Monitor request duration
curl http://localhost:3600/metrics | grep firecrawl_scrape_duration
```

### Memory Leaks

**Problem**: Service crashes or high memory usage
```bash
# Monitor memory usage
top -p $(pgrep -f "node.*firecrawl-proxy")

# Check Node.js heap usage
curl http://localhost:3600/health | jq '.data.memory'

# Increase heap size if needed
NODE_OPTIONS="--max-old-space-size=4096" node src/server.js

# Or in systemd service file:
Environment="NODE_OPTIONS=--max-old-space-size=4096"
```

### Validation Errors

**Problem**: Frequent 400 Bad Request responses
```bash
# Check validation error details
curl -X POST http://localhost:3600/api/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"invalid"}' | jq '.details'

# Review validation rules in src/middleware/validation.js
# Common issues:
# - URL format (must be http/https)
# - formats array (must be valid values)
# - timeout range (1000-60000ms)
# - limit range (1-1000)
```

### CORS Issues

**Problem**: CORS errors from frontend
```bash
# Check CORS_ORIGIN in root .env
grep CORS_ORIGIN /home/marce/projetos/TradingSystem/.env

# Should include frontend URLs:
CORS_ORIGIN=http://localhost:3103,http://localhost:3004,http://tradingsystem.local

# Restart service after changes
sudo systemctl restart firecrawl-proxy
```

### Circuit Breaker Pattern (Future Enhancement)
- Implement circuit breaker to prevent cascading failures
- Automatically stop sending requests to unhealthy upstream
- Gradual recovery with exponential backoff
- Monitor circuit breaker state in metrics

## Performance Monitoring

### Key Metrics to Monitor

**Request Metrics:**
```bash
# Total requests by status code
curl http://localhost:3600/metrics | grep tradingsystem_http_requests_total

# Request duration percentiles
curl http://localhost:3600/metrics | grep tradingsystem_http_request_duration_seconds

# Firecrawl-specific metrics
curl http://localhost:3600/metrics | grep tradingsystem_firecrawl
```

### Grafana Dashboard

Create dashboard with panels for:
- Request rate (requests/second)
- Error rate (4xx, 5xx responses)
- Response time (p50, p95, p99)
- Firecrawl scrape success/failure rate
- Rate limit violations
- Upstream health status

**Example PromQL queries:**
```promql
# Request rate
rate(tradingsystem_http_requests_total{service="firecrawl-proxy"}[5m])

# Error rate
rate(tradingsystem_http_requests_total{service="firecrawl-proxy",status_code=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, rate(tradingsystem_http_request_duration_seconds_bucket{service="firecrawl-proxy"}[5m]))

# Scrape success rate
rate(tradingsystem_firecrawl_scrape_total{service="firecrawl-proxy",status="success"}[5m])
```

### Alert Rules

Create Prometheus alert rules:
```yaml
groups:
  - name: firecrawl_proxy
    rules:
      - alert: FirecrawlProxyHighErrorRate
        expr: rate(tradingsystem_http_requests_total{service="firecrawl-proxy",status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in Firecrawl Proxy"
          description: "Error rate is {{ $value }} requests/second"

      - alert: FirecrawlProxyDown
        expr: up{job="firecrawl-proxy"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Firecrawl Proxy is down"

      - alert: FirecrawlProxyHighLatency
        expr: histogram_quantile(0.95, rate(tradingsystem_http_request_duration_seconds_bucket{service="firecrawl-proxy"}[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency in Firecrawl Proxy"
          description: "P95 latency is {{ $value }} seconds"
```

### Performance Optimization

**Connection Pooling:**
- Axios automatically pools connections
- Monitor connection reuse in metrics
- Adjust `maxSockets` if needed

**Request Batching:**
- Consider implementing request batching for high-volume scenarios
- Queue requests and process in batches
- Reduce overhead of individual requests

**Caching:**
- Implement response caching for frequently scraped URLs
- Use Redis for distributed caching
- Set appropriate TTL based on content freshness requirements

## Security Hardening

### Input Validation
- All inputs validated by express-validator middleware
- URL format validation (http/https only)
- String length limits enforced
- Numeric range validation
- Array size limits

### Rate Limiting
- Per-IP rate limiting enabled by default
- Configurable window and max requests
- 429 responses with Retry-After header
- Consider implementing API key-based rate limiting for production

### CORS Configuration
- Whitelist specific origins in `CORS_ORIGIN`
- Never use `*` in production
- Validate origin headers

### Request Size Limits
- Body size limited by Express (default: 100kb)
- Adjust if needed: `app.use(express.json({ limit: '1mb' }))`

### Error Handling
- Never expose stack traces in production
- Use generic error messages for security issues
- Log detailed errors server-side only

### Dependency Security
```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Environment Variables
- Never commit `.env` files
- Use strong random values for sensitive configs
- Rotate credentials regularly
- Use secrets management in production (e.g., HashiCorp Vault)

## Monitoring
- `GET /health` exposes proxy status and Firecrawl connectivity.
- `GET /metrics` exposes Prometheus metrics including request latency, total counts, and Firecrawl-specific counters/histograms.
- Logs use Pino with pretty printing in development for readability.

## Production Deployment

### Systemd Service Setup (Linux)

Create systemd service file `/etc/systemd/system/firecrawl-proxy.service`:
```ini
[Unit]
Description=Firecrawl Proxy API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=tradingsystem
WorkingDirectory=/home/marce/projetos/TradingSystem/backend/api/firecrawl-proxy
Environment="NODE_ENV=production"
EnvironmentFile=/home/marce/projetos/TradingSystem/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/firecrawl-proxy/service.log
StandardError=append:/var/log/firecrawl-proxy/error.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/firecrawl-proxy

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**
```bash
# Create log directory
sudo mkdir -p /var/log/firecrawl-proxy
sudo chown tradingsystem:tradingsystem /var/log/firecrawl-proxy

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable firecrawl-proxy
sudo systemctl start firecrawl-proxy

# Check status
sudo systemctl status firecrawl-proxy

# View logs
sudo journalctl -u firecrawl-proxy -f
```

### PM2 Process Manager (Alternative)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
cd /home/marce/projetos/TradingSystem/backend/api/firecrawl-proxy
pm2 start src/server.js --name firecrawl-proxy --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd

# Monitor
pm2 monit
pm2 logs firecrawl-proxy
```

### Docker Deployment (Alternative)

Create `Dockerfile` in `backend/api/firecrawl-proxy/`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3600
CMD ["node", "src/server.js"]
```

Build and run:
```bash
# Build image
docker build -t tradingsystem/firecrawl-proxy:latest .

# Run container
docker run -d \
  --name firecrawl-proxy \
  --env-file /home/marce/projetos/TradingSystem/.env \
  -p 3600:3600 \
  --restart unless-stopped \
  tradingsystem/firecrawl-proxy:latest
```

### Health Check Integration
- Configure Service Launcher to monitor `/health` endpoint
- Set up Prometheus alerts for service downtime
- Configure uptime monitoring (e.g., UptimeRobot, Pingdom)

### Log Management
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/firecrawl-proxy

# Add configuration:
/var/log/firecrawl-proxy/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 tradingsystem tradingsystem
    sharedscripts
    postrotate
        systemctl reload firecrawl-proxy > /dev/null 2>&1 || true
    endscript
}
```

## Service Management

- **Automated startup:** `scripts/services/start-all.sh` launches the proxy with `npm run dev`, manages PID files under `$LOG_DIR`, and waits for port 3600 to become available.
- **Health monitoring:** The Service Launcher (port 3500) pings `GET /health` using the `SERVICE_LAUNCHER_FIRECRAWL_PROXY_*` variables defined in the root `.env`.
- **Registry:** `backend/manifest.json` lists the service as `firecrawl-proxy` (`type: backend`, `managed: internal`).
- **Core dependency:** Start the Docker-based Firecrawl stack with `bash scripts/firecrawl/start.sh` before or alongside the proxy.

Quick workflow:
```bash
# Start Firecrawl core (Docker)
bash scripts/firecrawl/start.sh

# Start Node.js services (includes firecrawl-proxy)
bash scripts/services/start-all.sh

# Check health
curl http://localhost:3600/health

# Stop services
bash scripts/services/stop-all.sh
bash scripts/firecrawl/stop.sh
```
## Integration

### Frontend Integration
- Dashboard uses `firecrawlService.ts` for all proxy calls
- React Query hooks for caching and state management
- Automatic retry with exponential backoff
- Error handling with user-friendly messages

### Backend Integration
- Python scripts can use `requests` library
- C# services can use `HttpClient`
- Always use proxy endpoints, never call Firecrawl core directly
- Handle 429 responses with retry logic

### Service Launcher Integration
- Proxy registered in `backend/manifest.json`
- Health checks via `/health` endpoint
- Automatic restart on failure
- Status monitoring in dashboard

## Related Documentation

### Internal Documentation
- **API Specification**: `docs/context/backend/api/firecrawl-proxy.md` - Complete API spec with validation rules
- **Firecrawl Infrastructure**: `infrastructure/firecrawl/README.md` - Core Firecrawl stack setup
- **Reverse Proxy Setup**: `docs/context/ops/infrastructure/reverse-proxy-setup.md` - Nginx integration
- **Environment Configuration**: `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` - Centralized env management
- **Service Launcher**: `backend/api/service-launcher/README.md` - Service orchestration
- **Frontend Integration**: `frontend/apps/dashboard/src/services/firecrawlService.ts` - Dashboard integration

### External Resources
- **Firecrawl Docs**: https://docs.firecrawl.dev
- **Express.js**: https://expressjs.com
- **Pino Logger**: https://getpino.io
- **Prometheus Client**: https://github.com/siimon/prom-client
- **Express Validator**: https://express-validator.github.io

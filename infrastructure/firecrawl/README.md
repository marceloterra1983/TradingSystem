# Firecrawl - Self-Hosted Web Scraping Infrastructure

Firecrawl is a powerful web scraping and crawling API designed for AI applications. This infrastructure provides a self-hosted deployment for the TradingSystem project.

## Overview

Firecrawl provides:
- **Web Scraping**: Extract clean, structured data from websites
- **Web Crawling**: Recursively crawl websites and extract content
- **LLM-Ready Output**: Markdown format optimized for AI/LLM processing
- **Browser Automation**: Built on Playwright for JavaScript-heavy sites
- **Queue Management**: Redis-based job queuing for scalability

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Firecrawl API Service (Port 3002)             │
│  - REST API endpoints                           │
│  - Request handling & validation                │
│  - Job queue management                         │
└──────────────┬──────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────┐        ┌──────────────┐
│  Redis  │        │  Playwright  │
│  Cache  │        │   Service    │
│  Queue  │        │  (Browser)   │
└─────────┘        └──────────────┘
    ▲                     ▲
    │                     │
    └──────────┬──────────┘
               │
        ┌──────▼──────┐
        │   Worker    │
        │  Processes  │
        └─────────────┘
```

**Note:** The internal PostgreSQL database (`nuq-postgres`) is only accessible within the Docker network to avoid port conflicts with host PostgreSQL installations (TimescaleDB uses port 5433).

## Services

### 1. API Service
- Main REST API for scraping/crawling requests (Port ${FIRECRAWL_PORT:-3002})
- Manages job queues and responses
- Provides admin UI at `/admin/@/queues`

### 2. Playwright Service
- Headless browser automation
- Handles JavaScript rendering
- Proxy support (optional)

### 3. Redis
- Job queue management
- Caching layer
- Rate limiting

### 4. Worker Service
- Background job processing
- Concurrent scraping tasks
- Configurable worker count

## Quick Start

### 1. Setup Environment

**⚠️ IMPORTANT:** All Firecrawl configuration is managed through the root `.env` file following the project's centralized environment standard. See `ENV-RULES.md` for details.

```bash
cd infrastructure/firecrawl
git submodule update --init --recursive
```

Ensure root `.env` file is configured with Firecrawl variables (see root `.env.example` for all available options)

### 2. Build Services (First Time Only)

```bash
cd firecrawl-source
docker compose build
cd ..
```

This will build the Firecrawl Docker containers from source. This may take 5-10 minutes on first run.

### 3. Start Services

```bash
cd firecrawl-source
docker compose up -d
```

### 4. Verify Installation

Check service status:
```bash
docker compose ps
```

Access Bull Queue Admin UI:
```
http://localhost:3002/admin/tradingsystem-firecrawl-2025/queues
```

(Replace `tradingsystem-firecrawl-2025` with your `BULL_AUTH_KEY` from `.env`)

**Note**: The default public port for Firecrawl is 3002.

### 5. Test API (TradingSystem Proxy)

**Simple Scrape (via proxy):**
```bash
curl -X POST ${FIRECRAWL_PROXY_BASE_URL:-http://localhost:3600}/api/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com","formats":["markdown","links"]}'
```

**Start Crawl (via proxy):**
```bash
curl -X POST ${FIRECRAWL_PROXY_BASE_URL:-http://localhost:3600}/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.firecrawl.dev",
    "limit": 10,
    "maxDepth": 2,
    "scrapeOptions": { "formats": ["markdown"], "onlyMainContent": true }
  }'
```

**Check Crawl Status:**
```bash
curl ${FIRECRAWL_PROXY_BASE_URL:-http://localhost:3600}/api/v1/crawl/<crawl-id>
```

> ⚠️ All TradingSystem services (frontend, backend jobs, scripts) must call the proxy endpoints on port **3600**. The proxy enforces validation, rate limiting, structured error handling, and metrics aggregation.

### Core Service Diagnostics (Ops Only)

For low-level troubleshooting (e.g., confirming that the Firecrawl Docker stack is reachable), operations engineers may hit the core API directly. Do **not** use these endpoints from application code.

```bash
# Scrape directly against Firecrawl core (ops only)
curl -X POST http://localhost:${FIRECRAWL_PORT:-3002}/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Start crawl (ops only)
curl -X POST http://localhost:${FIRECRAWL_PORT:-3002}/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.firecrawl.dev","limit": 5}'
```

> **Warning:** Direct calls bypass TradingSystem safeguards. Use only during incident response or platform diagnostics.

## Configuration

**⚠️ IMPORTANT:** All environment variables are configured in the root `.env` file, NOT in local `.env` files. This is a mandatory project standard.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FIRECRAWL_PORT` | `3002` | External API service port |
| `FIRECRAWL_INTERNAL_PORT` | `3002` | Internal container port |
| `FIRECRAWL_HOST` | `0.0.0.0` | Bind address |
| `FIRECRAWL_BULL_AUTH_KEY` | `tradingsystem-firecrawl-2025` | Queue manager UI access key |
| `FIRECRAWL_USE_DB_AUTHENTICATION` | `false` | Enable Supabase authentication |
| `FIRECRAWL_EXTRACT_WORKER_PORT` | `3004` | Extract worker port |
| `FIRECRAWL_WORKER_PORT` | `3005` | General worker port |
| `FIRECRAWL_REDIS_URL` | `redis://redis:6379` | Internal Redis connection |
| `FIRECRAWL_PLAYWRIGHT_URL` | `http://playwright-service:3000/scrape` | Playwright service URL |
| `FIRECRAWL_BLOCK_MEDIA` | `false` | Block media loading for performance |
| `FIRECRAWL_LOGGING_LEVEL` | `info` | Log verbosity |
| `FIRECRAWL_ALLOW_LOCAL_WEBHOOKS` | `true` | Allow localhost webhooks |

**See root `.env.example` for complete list of all Firecrawl variables and their descriptions.**

**Note:** The `OPENAI_API_KEY` variable is shared with other AI services (LlamaIndex, LangGraph) and is defined in the AI & ML TOOLS section of root `.env`.

### Environment Configuration

This project follows a **centralized environment configuration** standard to ensure consistency across all services.

**Key Principles:**
- All environment variables are stored in the root `.env` file
- Service-specific variables use the `FIRECRAWL_` prefix
- No local `.env` files are used (deprecated)
- All Docker Compose files reference the root `.env` via `env_file: - ../../.env`

**Configuration Files:**
- **Primary Configuration**: `/.env` (root directory)
- **Template**: `/.env.example` (root directory)
- **Documentation**: `ENV-RULES.md` and `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`
- **Deprecated**: Local `.env` files (kept for reference only)

**Variable Naming Convention:**
```
FIRECRAWL_<SERVICE>_<VARIABLE>
Examples:
- FIRECRAWL_PORT (main API port)
- FIRECRAWL_REDIS_URL (Redis connection)
- FIRECRAWL_BULL_AUTH_KEY (authentication key)
```

**Adding New Variables:**
1. Add to root `.env.example` with FIRECRAWL_ prefix
2. Update docker-compose.yaml to reference the variable
3. Restart services: `docker compose up -d --force-recreate`

### Scaling Workers

To increase throughput, adjust worker count in `.env`:
```bash
NUM_WORKERS_PER_QUEUE=16
```

Then restart:
```bash
docker compose up -d --force-recreate worker
```

## Production Deployment

### Pre-deployment Checklist
- [ ] Root `.env` file configured with production values
- [ ] `FIRECRAWL_USE_DB_AUTHENTICATION=true` enabled
- [ ] `FIRECRAWL_RATE_LIMIT_TEST_MODE=false` disabled
- [ ] `FIRECRAWL_BULL_AUTH_KEY` set to strong random value
- [ ] `FIRECRAWL_LOGGING_LEVEL=warn` or `error` for production
- [ ] Docker images built and tested
- [ ] Network isolation configured (Redis not exposed publicly)
- [ ] Backup procedures tested
- [ ] Monitoring and alerting configured
- [ ] Resource limits set in docker-compose.yaml

### Resource Requirements
- Minimum: 4 CPU cores, 8GB RAM, 50GB disk
- Recommended: 8 CPU cores, 16GB RAM, 100GB SSD
- Network: 100Mbps+ for high-volume scraping
- Disk I/O: SSD recommended for Redis and PostgreSQL

### Deployment Steps
1. Clone repository and initialize submodules
2. Configure root `.env` with production values
3. Build images: `cd firecrawl-source && docker compose build`
4. Start services: `docker compose up -d`
5. Verify health: `curl http://localhost:3002/v1/health`
6. Test scraping: Use proxy endpoint via `curl http://localhost:3600/api/v1/scrape`
7. Monitor logs: `docker compose logs -f`
8. Configure monitoring and alerts

### Security Hardening
- Enable authentication (`FIRECRAWL_USE_DB_AUTHENTICATION=true`)
- Use strong `FIRECRAWL_BULL_AUTH_KEY`
- Disable local webhooks in production (`FIRECRAWL_ALLOW_LOCAL_WEBHOOKS=false`)
- Configure firewall rules (only expose port 3002 to proxy, not publicly)
- Use Docker network isolation
- Regular security updates: `docker compose pull && docker compose up -d`

## Disaster Recovery

### Backup Procedures

**Redis Backup:**
```bash
# Manual backup
docker compose exec redis redis-cli SAVE
docker cp firecrawl-redis:/data/dump.rdb ./backups/redis-$(date +%Y%m%d-%H%M%S).rdb

# Automated backup script (add to cron)
#!/bin/bash
BACKUP_DIR="/path/to/backups/firecrawl"
mkdir -p $BACKUP_DIR
docker compose -f /path/to/firecrawl-source/docker-compose.yaml exec -T redis redis-cli SAVE
docker cp firecrawl-redis:/data/dump.rdb $BACKUP_DIR/redis-$(date +%Y%m%d-%H%M%S).rdb
find $BACKUP_DIR -name "redis-*.rdb" -mtime +7 -delete  # Keep 7 days
```

**PostgreSQL Backup:**
```bash
# Manual backup
docker compose exec nuq-postgres pg_dump -U postgres firecrawl > ./backups/postgres-$(date +%Y%m%d-%H%M%S).sql

# Automated backup
docker compose exec -T nuq-postgres pg_dump -U postgres firecrawl | gzip > ./backups/postgres-$(date +%Y%m%d-%H%M%S).sql.gz
```

**Configuration Backup:**
```bash
# Backup root .env and docker-compose.yaml
cp /.env ./backups/env-$(date +%Y%m%d-%H%M%S).backup
cp firecrawl-source/docker-compose.yaml ./backups/compose-$(date +%Y%m%d-%H%M%S).yaml
```

### Restore Procedures

**Redis Restore:**
```bash
# Stop services
docker compose down

# Restore dump.rdb
docker cp ./backups/redis-YYYYMMDD-HHMMSS.rdb firecrawl-redis:/data/dump.rdb

# Start services
docker compose up -d
```

**PostgreSQL Restore:**
```bash
# Restore from backup
gunzip -c ./backups/postgres-YYYYMMDD-HHMMSS.sql.gz | docker compose exec -T nuq-postgres psql -U postgres firecrawl
```

### Failover Procedures
- Document manual failover steps if using multiple instances
- Health check endpoints for automated failover
- Data synchronization strategies

### Recovery Time Objectives (RTO)
- Target RTO: < 15 minutes for service restoration
- Target RPO: < 1 hour for data loss (with hourly backups)

## Performance Optimization

### Worker Scaling Strategies

**Horizontal Scaling:**
- Increase `NUM_WORKERS_PER_QUEUE` in root `.env` (default: 8)
- Monitor CPU and memory usage: `docker stats`
- Recommended: 2-4 workers per CPU core
- Test different configurations under load

**Vertical Scaling:**
- Increase container resource limits in docker-compose.yaml
- Allocate more memory to Redis (default: no limit)
- Increase PostgreSQL shared_buffers

### Memory Tuning

**Redis Memory:**
```yaml
# In docker-compose.yaml
redis:
  command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

**Worker Memory:**
- Monitor worker memory: `docker stats firecrawl-worker`
- Adjust `NODE_OPTIONS=--max-old-space-size=4096` if needed
- Enable memory limits in docker-compose.yaml

### Network Optimization
- Enable `FIRECRAWL_BLOCK_MEDIA=true` to skip images/videos (faster scraping)
- Use proxy rotation for rate-limited sites
- Configure connection pooling
- Adjust timeout values based on target sites

### Queue Optimization
- Monitor queue length: Access Bull Queue UI at `http://localhost:3002/admin/@/queues`
- Adjust job priorities
- Configure job TTL (time-to-live)
- Enable job result expiration

### Database Optimization

**PostgreSQL:**
```sql
-- Vacuum and analyze regularly
VACUUM ANALYZE;

-- Check index usage
SELECT * FROM pg_stat_user_indexes;

-- Monitor query performance
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

### Monitoring Performance
- Track scrape duration: Monitor `firecrawl_scrape_duration_seconds` metric
- Monitor queue depth: Check Bull Queue UI
- Track error rates: Monitor logs and metrics
- Set up alerts for performance degradation

## Integration Testing

### Test Suite Setup
```bash
# Install test dependencies (if not already installed)
cd firecrawl-source/apps/api
npm install --save-dev jest supertest

# Run existing test suite
npm test
```

### Manual Integration Tests

**Test 1: Basic Scrape**
```bash
# Via proxy (recommended)
curl -X POST http://localhost:3600/api/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","formats":["markdown"]}' | jq

# Expected: 200 OK with markdown content
```

**Test 2: Crawl Job**
```bash
# Start crawl
CRAWL_ID=$(curl -X POST http://localhost:3600/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","limit":5}' | jq -r '.data.id')

# Check status
curl http://localhost:3600/api/v1/crawl/$CRAWL_ID | jq
```

**Test 3: Error Handling**
```bash
# Test invalid URL
curl -X POST http://localhost:3600/api/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"invalid-url"}' | jq

# Expected: 400 Bad Request with validation error
```

### Load Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 -p scrape-payload.json -T application/json http://localhost:3600/api/v1/scrape
```

### Continuous Integration
- Add tests to CI/CD pipeline
- Run integration tests before deployment
- Monitor test results and trends

## API Endpoints

### POST /v1/scrape
Scrape a single URL.

**Request:**
```json
{
  "url": "https://example.com",
  "formats": ["markdown", "html"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markdown": "# Page Content...",
    "html": "<html>...</html>",
    "metadata": {...}
  }
}
```

### POST /v1/crawl
Crawl multiple pages from a website.

**Request:**
```json
{
  "url": "https://example.com",
  "limit": 100,
  "scrapeOptions": {
    "formats": ["markdown"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "id": "crawl-job-id",
  "url": "https://api.firecrawl.dev/v1/crawl/crawl-job-id"
}
```

### GET /v1/crawl/:id
Check crawl job status.

## Use Cases in TradingSystem

### 1. Financial News Scraping
```bash
curl -X POST http://localhost:${FIRECRAWL_PORT:-3002}/v1/scrape \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://www.infomoney.com.br/mercados/",
    "formats": ["markdown"]
  }'
```

### 2. Regulatory Documents
```bash
curl -X POST http://localhost:${FIRECRAWL_PORT:-3002}/v1/crawl \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://www.cvm.gov.br/",
    "limit": 50,
    "scrapeOptions": {
      "formats": ["markdown"],
      "onlyMainContent": true
    }
  }'
```

### 3. Market Data Aggregation
Scrape multiple financial portals for market sentiment analysis.

## Monitoring

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f playwright-service
```

### Check Queue Status
Access Bull Queue UI:
```
http://localhost:3002/admin/@/queues
```

View:
- Active jobs
- Completed jobs
- Failed jobs
- Queue statistics

### Health Checks
```bash
# API health
curl http://localhost:3002/v1/health

# Redis health
docker compose exec redis redis-cli ping

# Playwright health
docker compose exec playwright-service curl http://localhost:3000/health
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker compose logs api

# Verify Redis connection
docker compose exec api nc -zv redis 6379

# Restart all services
docker compose down
docker compose up -d
```

### Environment Variable Issues
If services fail to start, verify that root `.env` file contains all required Firecrawl variables. Compare with root `.env.example`.

```bash
# Check if .env file exists in root directory
ls -la /home/marce/projetos/TradingSystem/.env

# Validate required variables
grep "FIRECRAWL_" /home/marce/projetos/TradingSystem/.env
```

### PostgreSQL Port Conflicts
If PostgreSQL port conflicts occur, ensure the `nuq-postgres` ports section is commented out in `docker-compose.yaml` (internal-only access is sufficient).

```bash
# Check if port 5432 is in use
netstat -tulpn | grep 5432

# Verify no port mapping exists for nuq-postgres
grep -A 10 "nuq-postgres:" docker-compose.yaml | grep "ports:"
```

### Slow Scraping Performance
1. Increase worker count: `NUM_WORKERS_PER_QUEUE=16`
2. Enable media blocking: `BLOCK_MEDIA=true`
3. Use proxy rotation if rate-limited

### Memory Issues
```bash
# Monitor resource usage
docker stats

# Reduce worker count if needed
NUM_WORKERS_PER_QUEUE=4
```

### Playwright Timeout
- Increase timeout in scrape requests
- Check network connectivity
- Verify proxy settings (if used)

### Worker Process Issues
```bash
# Check worker logs
docker compose logs -f worker

# Restart workers
docker compose restart worker

# Scale workers
docker compose up -d --scale worker=4
```

### Queue Stuck Issues
```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Check queue length
LLEN bull:scrape:wait

# Clear stuck jobs (use with caution)
FLUSHDB
```

### Playwright Browser Issues
```bash
# Check Playwright logs
docker compose logs -f playwright-service

# Test Playwright directly
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Restart Playwright
docker compose restart playwright-service
```

### Disk Space Issues
```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up old images and containers
docker system prune -a

# Check Redis memory usage
docker compose exec redis redis-cli INFO memory
```

## Maintenance

### Update to Latest Version
```bash
docker compose pull
docker compose up -d
```

### Backup Redis Data
```bash
docker compose exec redis redis-cli SAVE
docker cp firecrawl-redis:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb
```

### Clean Up Old Jobs
```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Clear completed jobs older than 7 days (manual)
# Or configure TTL in Bull Queue admin UI
```

## Security Considerations

For production deployment:

1. **Enable Authentication**: Set `USE_DB_AUTHENTICATION=true` and configure credentials
2. **Rate Limiting**: Disable test mode (`RATE_LIMIT_TEST_MODE=false`)
3. **Network Isolation**: Use Docker networks, don't expose Redis publicly
4. **Proxy Usage**: Configure proxy for IP rotation if scraping at scale
5. **HTTPS**: Use reverse proxy (nginx/traefik) for SSL termination

## Integration with TradingSystem

### Python Example – Using the Firecrawl Proxy API
```python
import os
import time
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv

# Load environment variables from the project root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))


class FirecrawlProxyClient:
    """Convenience client for the TradingSystem Firecrawl Proxy API."""

    def __init__(self) -> None:
        base_url = os.getenv('FIRECRAWL_PROXY_BASE_URL', 'http://localhost:3600')
        timeout_ms = int(os.getenv('FIRECRAWL_PROXY_TIMEOUT', '30000'))

        self.base_url = base_url.rstrip('/')
        self.timeout = timeout_ms / 1000  # requests uses seconds
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def scrape(self, url: str, formats: Optional[List[str]] = None) -> Dict:
        payload = {
            'url': url,
            'formats': formats or ['markdown'],
            'onlyMainContent': True,
        }
        response = self.session.post(
            f'{self.base_url}/api/v1/scrape',
            json=payload,
            timeout=self.timeout,
        )
        if response.status_code == 429:
            retry_after = response.headers.get('Retry-After', '60')
            raise RuntimeError(f'Rate limit exceeded. Retry after {retry_after} seconds')
        if response.status_code == 503:
            raise RuntimeError('Firecrawl service unavailable')
        if response.status_code == 504:
            raise TimeoutError('Firecrawl request timed out')
        response.raise_for_status()
        return response.json()

    def crawl(self, url: str, limit: int = 20, max_depth: int = 2) -> Dict:
        payload = {
            'url': url,
            'limit': limit,
            'maxDepth': max_depth,
            'scrapeOptions': {
                'formats': ['markdown'],
                'onlyMainContent': True,
            },
        }
        response = self.session.post(
            f'{self.base_url}/api/v1/crawl',
            json=payload,
            timeout=self.timeout,
        )
        if response.status_code == 503:
            raise RuntimeError('Firecrawl service unavailable')
        if response.status_code == 504:
            raise TimeoutError('Firecrawl request timed out')
        response.raise_for_status()
        return response.json()

    def get_crawl_status(self, crawl_id: str) -> Dict:
        response = self.session.get(
            f'{self.base_url}/api/v1/crawl/{crawl_id}',
            timeout=self.timeout,
        )
        if response.status_code == 404:
            raise ValueError(f'Crawl job not found: {crawl_id}')
        if response.status_code == 503:
            raise RuntimeError('Firecrawl service unavailable')
        if response.status_code == 504:
            raise TimeoutError('Firecrawl request timed out')
        response.raise_for_status()
        return response.json()


def scrape_financial_news(url: str) -> str:
    client = FirecrawlProxyClient()
    result = client.scrape(url, formats=['markdown', 'links'])
    if not result.get('success'):
        raise RuntimeError(result.get('error', 'Scrape failed'))
    markdown = result['data'].get('markdown', '')
    links = result['data'].get('links', [])
    print(f'Found {len(links)} related links')
    return markdown


def crawl_regulatory_documents(base_url: str, max_pages: int = 50) -> List[Dict]:
    client = FirecrawlProxyClient()
    job = client.crawl(base_url, limit=max_pages, max_depth=3)
    crawl_id = job['data']['id']
    print(f'Crawl job started: {crawl_id}')

    while True:
        time.sleep(5)  # poll every 5 seconds
        status = client.get_crawl_status(crawl_id)
        if not status.get('success'):
            raise RuntimeError(status.get('error', 'Status check failed'))

        data = status['data']
        print(f"Status: {data['status']} ({data.get('completed', 0)}/{data.get('total', 0)})")

        if data['status'] == 'completed':
            return data.get('data', [])
        if data['status'] == 'failed':
            raise RuntimeError('Crawl job failed')


if __name__ == '__main__':
    article = scrape_financial_news('https://www.infomoney.com.br/mercados/')
    print('Markdown preview:', article[:200], '...')

    documents = crawl_regulatory_documents('https://www.cvm.gov.br/', max_pages=10)
    print(f'Crawled {len(documents)} pages from CVM website')
```

### C# Example – Using the Firecrawl Proxy API
```csharp
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace TradingSystem.FirecrawlProxy
{
    public sealed class FirecrawlProxyClient : IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _serializerOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public FirecrawlProxyClient()
        {
            var baseUrl = Environment.GetEnvironmentVariable("FIRECRAWL_PROXY_BASE_URL") ?? "http://localhost:3600";
            var timeoutMs = int.TryParse(Environment.GetEnvironmentVariable("FIRECRAWL_PROXY_TIMEOUT"), out var value)
                ? value
                : 30000;

            _httpClient = new HttpClient
            {
                BaseAddress = new Uri(baseUrl),
                Timeout = TimeSpan.FromMilliseconds(timeoutMs),
            };
        }

        public async Task<ScrapeResult> ScrapeAsync(ScrapeOptions options)
        {
            var response = await _httpClient.PostAsJsonAsync("/api/v1/scrape", options);

            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds ?? 60;
                throw new InvalidOperationException($"Rate limit exceeded. Retry after {retryAfter} seconds.");
            }

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<ScrapeResult>(_serializerOptions)
                ?? throw new InvalidOperationException("Empty response from proxy");
        }

        public async Task<CrawlResult> CrawlAsync(CrawlOptions options)
        {
            var response = await _httpClient.PostAsJsonAsync("/api/v1/crawl", options);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<CrawlResult>(_serializerOptions)
                ?? throw new InvalidOperationException("Empty response from proxy");
        }

        public async Task<CrawlStatusResult> GetCrawlStatusAsync(string crawlId)
        {
            var response = await _httpClient.GetAsync($"/api/v1/crawl/{crawlId}");

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new ArgumentException($"Crawl job not found: {crawlId}");
            }

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<CrawlStatusResult>(_serializerOptions)
                ?? throw new InvalidOperationException("Empty status response");
        }

        public void Dispose() => _httpClient.Dispose();
    }

    public record ScrapeOptions
    {
        public string Url { get; init; } = string.Empty;
        public IEnumerable<string> Formats { get; init; } = new[] { "markdown" };
        public bool OnlyMainContent { get; init; } = true;
        public int? Timeout { get; init; }
    }

    public record ScrapeResult(bool Success, ScrapeData? Data, string? Error);

    public record ScrapeData(
        string? Markdown,
        string? Html,
        IEnumerable<string>? Links,
        Dictionary<string, object>? Metadata
    );

    public record CrawlOptions
    {
        public string Url { get; init; } = string.Empty;
        public int Limit { get; init; } = 10;
        public int MaxDepth { get; init; } = 2;
        public IEnumerable<string>? ExcludePaths { get; init; }
        public ScrapeOptions? ScrapeOptions { get; init; }
    }

    public record CrawlResult(bool Success, CrawlResultData? Data, string? Error);

    public record CrawlResultData(string Id, string Url);

    public record CrawlStatusResult(bool Success, CrawlStatusData? Data, string? Error);

    public record CrawlStatusData(
        string Status,
        int Total,
        int Completed,
        IEnumerable<ScrapedPage>? Data
    );

    public record ScrapedPage(string Url, string? Title, string? Markdown);

    public static class FirecrawlProxyUsage
    {
        public static async Task RunAsync()
        {
            using var client = new FirecrawlProxyClient();

            var scrape = await client.ScrapeAsync(new ScrapeOptions
            {
                Url = "https://www.infomoney.com.br/mercados/",
                Formats = new[] { "markdown", "links" },
            });

            Console.WriteLine($"Scraped? {scrape.Success}, markdown length: {scrape.Data?.Markdown?.Length ?? 0}");

            var crawl = await client.CrawlAsync(new CrawlOptions
            {
                Url = "https://www.cvm.gov.br/",
                Limit = 20,
                MaxDepth = 3,
                ScrapeOptions = new ScrapeOptions { Formats = new[] { "markdown" } },
            });

            var crawlId = crawl.Data?.Id ?? throw new InvalidOperationException("Missing crawl id");
            Console.WriteLine($"Crawl started: {crawlId}");

            while (true)
            {
                await Task.Delay(TimeSpan.FromSeconds(5));
                var status = await client.GetCrawlStatusAsync(crawlId);
                if (!status.Success)
                {
                    Console.WriteLine($"Status error: {status.Error}");
                    break;
                }

                Console.WriteLine($"Status: {status.Data?.Status} ({status.Data?.Completed}/{status.Data?.Total})");

                if (status.Data?.Status == "completed")
                {
                    Console.WriteLine($"Pages scraped: {status.Data.Data?.Count() ?? 0}");
                    break;
                }

                if (status.Data?.Status == "failed")
                {
                    Console.WriteLine("Crawl job failed");
                    break;
                }
            }
        }
    }
}
```

> The proxy URL is configurable via `FIRECRAWL_PROXY_BASE_URL` in the root `.env`. Avoid pointing clients directly at the Firecrawl core service; always go through the proxy to benefit from validation, rate limiting, and consistent error handling.

## Internal Documentation
- **Firecrawl Proxy API**: `backend/api/firecrawl-proxy/README.md` - Node.js proxy service documentation
- **Firecrawl Proxy Specification**: `docs/context/backend/api/firecrawl-proxy.md` - Complete API specification
- **Reverse Proxy Setup**: `docs/context/ops/infrastructure/reverse-proxy-setup.md` - Nginx integration
- **Environment Configuration**: `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` - Centralized env management
- **Service Launcher**: `backend/api/service-launcher/README.md` - Service orchestration

## External Resources
- **Official Docs**: https://docs.firecrawl.dev
- **GitHub**: https://github.com/mendableai/firecrawl
- **Self-Host Guide**: https://docs.firecrawl.dev/contributing/self-host
- **API Reference**: https://docs.firecrawl.dev/api-reference

## Support

For issues specific to this deployment:
1. Check logs: `docker compose logs`
2. Verify configuration: `.env` file
3. Review official troubleshooting: https://docs.firecrawl.dev/contributing/self-host#troubleshooting

For Firecrawl-specific issues:
- GitHub Issues: https://github.com/mendableai/firecrawl/issues

## Migration from Local .env

If you have existing local Firecrawl configuration, follow these steps to migrate to the centralized configuration:

### Migration Steps

1. **Backup Current Configuration**
   ```bash
   cp infrastructure/firecrawl/.env infrastructure/firecrawl/.env.backup
   cp infrastructure/firecrawl/firecrawl.env.example infrastructure/firecrawl/firecrawl.env.backup
   ```

2. **Create/Update Root .env**
   ```bash
   # Copy root template if .env doesn't exist
   cp .env.example .env

   # Edit root .env to include your Firecrawl settings
   nano .env
   ```

3. **Update Variable Names**
   - Add `FIRECRAWL_` prefix to all Firecrawl variables
   - Example: `BULL_AUTH_KEY` → `FIRECRAWL_BULL_AUTH_KEY`
   - Example: `REDIS_URL` → `FIRECRAWL_REDIS_URL`

4. **Test New Configuration**
   ```bash
   cd infrastructure/firecrawl/firecrawl-source
   docker compose down
   docker compose up -d
   docker compose ps
   ```

5. **Remove Old Files** (optional)
   ```bash
   # After successful migration, remove deprecated files
   rm infrastructure/firecrawl/.env
   rm infrastructure/firecrawl/firecrawl.env.example
   ```

### Variable Mapping Reference

| Old Variable | New Variable | Location |
|--------------|--------------|----------|
| `REDIS_URL` | `FIRECRAWL_REDIS_URL` | Root `.env` |
| `BULL_AUTH_KEY` | `FIRECRAWL_BULL_AUTH_KEY` | Root `.env` |
| `USE_DB_AUTHENTICATION` | `FIRECRAWL_USE_DB_AUTHENTICATION` | Root `.env` |
| `PROXY_SERVER` | `FIRECRAWL_PROXY_SERVER` | Root `.env` |
| `LOGGING_LEVEL` | `FIRECRAWL_LOGGING_LEVEL` | Root `.env` |
| `PORT` | `FIRECRAWL_PORT` | Root `.env` |

### Troubleshooting Migration

- **Services won't start**: Verify all required `FIRECRAWL_*` variables are in root `.env`
- **Port conflicts**: Ensure `FIRECRAWL_POSTGRES_PORT` is commented out
- **Authentication issues**: Check that `FIRECRAWL_BULL_AUTH_KEY` is set correctly

For questions about the migration, refer to `ENV-RULES.md` or `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`.

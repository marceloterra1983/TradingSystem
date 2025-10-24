# Firecrawl Installation Summary

## Configuration Update (January 2025)

**⚠️ IMPORTANT:** Firecrawl configuration has been migrated to the centralized root `.env` file following the project's mandatory environment configuration standard.

### Key Changes:
- **Centralized Configuration**: All Firecrawl variables are now in `/.env` (root directory)
- **Variable Prefixing**: All variables use `FIRECRAWL_` prefix (e.g., `FIRECRAWL_PORT`)
- **Deprecated Files**: Local `.env` files are deprecated (kept for reference only)
- **Updated Documentation**: See `README.md` for current setup instructions

### Migration Required:
If you're using this installation, update your configuration:
1. Copy root template: `cp .env.example .env`
2. Configure `FIRECRAWL_*` variables in root `.env`
3. Restart services: `docker compose up -d --force-recreate`

### Validation Steps:
- **Verify Configuration**: Check that root `.env` contains all `FIRECRAWL_*` variables
- **Test Services**: Run `docker compose ps` to ensure all services are running
- **Check API**: Test API endpoint: `curl http://localhost:${FIRECRAWL_PORT}/health`
- **Validate Port Conflicts**: Ensure PostgreSQL port 5432 is not exposed

### References:
- **New Documentation**: `README.md` (updated for centralized config)
- **Configuration Standards**: `ENV-RULES.md`
- **Environment Guide**: `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`

---

## Installation Date
2025-10-12

## Installation Status
✅ **Successfully Installed and Tested**

## Configuration

### Ports
- **API Service**: `3002` (aligned with default configuration)
- **PostgreSQL**: Internal only (port 5432 not exposed)
- **Redis**: Internal only (port 6379 not exposed)
- **Playwright**: Internal only (port 3000 not exposed)

### Services Running
```
NAME                             STATUS      PORTS
firecrawl-api-1                  Up          0.0.0.0:3002->3002/tcp
firecrawl-nuq-postgres-1         Up          5432/tcp (internal)
firecrawl-playwright-service-1   Up          (internal)
firecrawl-redis-1                Up          6379/tcp (internal)
```

### Docker Images Built
```
REPOSITORY                           SIZE
firecrawl-api                        1.93GB
firecrawl-playwright-service         2.21GB
firecrawl-nuq-postgres               641MB
redis:alpine                         ~50MB
```

## Directory Structure

```
infrastructure/firecrawl/
├── firecrawl-source/          # Official Firecrawl repository (cloned)
│   ├── apps/                  # Firecrawl application code
│   ├── docker-compose.yaml    # Official docker-compose (modified)
│   └── .env                   # Runtime configuration
├── docker-compose.yml         # TradingSystem wrapper (NOT USED)
├── .env                       # Configuration template
├── .env.example              # Configuration example
├── README.md                 # Comprehensive documentation
└── INSTALLATION-SUMMARY.md   # This file
```

## Testing

### Test Command
```bash
curl -X POST http://localhost:3002/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Test Result
```json
{
  "success": true,
  "data": {
    "markdown": "Example Domain\n==============\n\nThis domain is for use in documentation examples...",
    "metadata": {
      "url": "https://example.com",
      "title": "Example Domain",
      "statusCode": 200,
      "contentType": "text/html",
      "creditsUsed": 1
    }
  }
}
```

✅ **API is working correctly**

## Admin UI

Access the Bull Queue Manager at:
```
http://localhost:3002/admin/tradingsystem-firecrawl-2025/queues
```

(The auth key is configured in `.env` as `BULL_AUTH_KEY`)

## Modifications Made

### 1. Port Configuration
- Confirmed default port remains 3002 across documentation and compose files
- Added `PORT=3002` to `.env` when overrides are required

### 2. PostgreSQL Port
- Commented out port exposure in `firecrawl-source/docker-compose.yaml` (lines 98-100)
- Reason: Avoid conflict with other PostgreSQL instances in the project

### 3. Environment Variables
- **Previously**: Created local `.env` with minimal required configuration
- **Now**: All variables are in root `.env` with `FIRECRAWL_` prefix
- Set `FIRECRAWL_USE_DB_AUTHENTICATION=false` for local development
- Set custom `FIRECRAWL_BULL_AUTH_KEY=tradingsystem-firecrawl-2025`

## Usage Examples

### 1. Scrape a Single Page
```bash
curl -X POST http://localhost:3002/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://infomoney.com.br"}'
```

### 2. Crawl Multiple Pages
```bash
curl -X POST http://localhost:3002/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "limit": 10
  }'
```

### 3. Scrape with AI Extraction (requires OpenAI API key)
```bash
curl -X POST http://localhost:3002/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "extract"],
    "extract": {
      "schema": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "summary": {"type": "string"}
        }
      }
    }
  }'
```

## Management Commands

### Start Services
```bash
cd infrastructure/firecrawl/firecrawl-source
docker compose up -d
```

### Stop Services
```bash
cd infrastructure/firecrawl/firecrawl-source
docker compose down
```

### View Logs
```bash
cd infrastructure/firecrawl/firecrawl-source
docker compose logs -f api           # API logs
docker compose logs -f worker         # Worker logs
docker compose logs -f playwright-service  # Browser logs
```

### Rebuild After Updates
```bash
cd infrastructure/firecrawl/firecrawl-source
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Integration with TradingSystem

### Use Cases

1. **Financial News Scraping**
   - Scrape InfoMoney, Valor Econômico, etc.
   - Extract structured data for sentiment analysis

2. **Regulatory Documents**
   - Crawl CVM, B3 regulatory pages
   - Extract compliance information

3. **Market Research**
   - Aggregate data from multiple financial portals
   - Build datasets for ML models

### Python Integration Example

```python
import requests

class FirecrawlClient:
    def __init__(self, base_url="http://localhost:3002"):
        self.base_url = base_url

    def scrape(self, url: str, formats: list = None) -> dict:
        formats = formats or ["markdown"]
        response = requests.post(
            f"{self.base_url}/v1/scrape",
            json={"url": url, "formats": formats}
        )
        return response.json()

    def crawl(self, url: str, limit: int = 100) -> dict:
        response = requests.post(
            f"{self.base_url}/v1/crawl",
            json={"url": url, "limit": limit}
        )
        return response.json()

# Usage
client = FirecrawlClient()
result = client.scrape("https://infomoney.com.br/mercados/")
print(result["data"]["markdown"])
```

## Known Issues & Warnings

### Non-Critical Warnings (Expected)
The following warnings appear during startup and are **normal** for self-hosted instances:
- `POSTHOG_API_KEY is not provided` - Analytics disabled (expected)
- `Search index database not configured` - Advanced search disabled (expected)
- `Supabase client is not configured` - Cloud features disabled (expected)
- Various optional env vars not set - Optional features disabled

### Limitations in Self-Hosted Version
1. **No Fire-engine access** - Advanced anti-bot bypassing not available
2. **No cloud features** - Supabase integration disabled
3. **Basic authentication only** - No API keys required (local only)

## Security Notes

⚠️ **Important**: This installation is configured for **local development only**.

For production deployment, consider:
1. Enable `USE_DB_AUTHENTICATION=true` and configure API keys
2. Set up reverse proxy (nginx/traefik) with SSL
3. Configure rate limiting properly
4. Enable firewall rules
5. Use strong passwords for PostgreSQL
6. Rotate `BULL_AUTH_KEY` regularly

## Resources

- **Official Docs**: https://docs.firecrawl.dev
- **Self-Host Guide**: https://docs.firecrawl.dev/contributing/self-host
- **GitHub**: https://github.com/mendableai/firecrawl
- **API Reference**: https://docs.firecrawl.dev/api-reference

## Next Steps

1. ✅ Installation complete
2. ✅ Basic testing successful
3. ⏭️ Integrate with TradingSystem Python services
4. ⏭️ Create scraping workflows for financial data
5. ⏭️ Set up scheduled crawling jobs
6. ⏭️ Build data pipeline: Firecrawl → Analytics → Storage

## Support

For issues:
1. Check logs: `docker compose logs -f`
2. Verify `.env` configuration
3. Review official troubleshooting: https://docs.firecrawl.dev/contributing/self-host#troubleshooting
4. Check GitHub issues: https://github.com/mendableai/firecrawl/issues

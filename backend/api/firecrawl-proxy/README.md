# Firecrawl Proxy Service

Proxy service for Firecrawl API to enable web scraping in TradingSystem.

## Features

- ✅ Web page scraping (`POST /api/scrape`)
- ✅ Multi-page crawling (`POST /api/crawl`)
- ✅ Crawl status tracking (`GET /api/crawl/status/:jobId`)
- ✅ Health check endpoint
- ✅ Error handling and logging
- ✅ CORS enabled
- ✅ Security headers (Helmet)

## Environment Variables

```bash
# Required
FIRECRAWL_API_KEY=fc-your-api-key-here

# Optional
PORT=3600
FIRECRAWL_API_URL=https://api.firecrawl.dev
LOG_LEVEL=info
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "firecrawl-proxy",
  "version": "1.0.0",
  "firecrawlApiUrl": "https://api.firecrawl.dev",
  "hasApiKey": true
}
```

### Scrape URL

```bash
POST /api/scrape
Content-Type: application/json

{
  "url": "https://example.com",
  "pageOptions": {
    "onlyMainContent": true
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "markdown": "# Example Domain...",
    "html": "<html>...</html>",
    "metadata": {
      "title": "Example Domain",
      "description": "...",
      "language": "en"
    }
  }
}
```

### Start Crawl

```bash
POST /api/crawl
Content-Type: application/json

{
  "url": "https://example.com",
  "crawlerOptions": {
    "maxDepth": 2,
    "limit": 10
  }
}
```

Response:
```json
{
  "success": true,
  "jobId": "abc123",
  "url": "https://example.com"
}
```

### Check Crawl Status

```bash
GET /api/crawl/status/abc123
```

Response:
```json
{
  "success": true,
  "status": "completed",
  "current": 10,
  "total": 10,
  "data": [...]
}
```

## Development

```bash
# Install dependencies
npm install

# Start dev server with hot-reload
npm run dev

# Start production server
npm start
```

## Docker

```bash
# Build image
docker build -t firecrawl-proxy .

# Run container
docker run -p 3600:3600 \
  -e FIRECRAWL_API_KEY=your-key \
  firecrawl-proxy

# With docker-compose
docker compose -f tools/compose/docker-compose.firecrawl.yml up -d firecrawl-proxy
```

## Testing

```bash
# Health check
curl http://localhost:3600/health

# Scrape test
curl -X POST http://localhost:3600/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Integration

### Frontend (Vite)

Already configured in `frontend/dashboard/vite.config.ts`:

```typescript
proxy: {
  '/api/scrape': {
    target: 'http://localhost:3600',
    changeOrigin: true
  }
}
```

### Usage in Frontend

```typescript
// Scrape a URL
const response = await fetch('/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' })
});

const data = await response.json();
console.log(data.data.markdown);
```

## Troubleshooting

### "API key not configured"

Set `FIRECRAWL_API_KEY` in root `.env` file:

```bash
FIRECRAWL_API_KEY=fc-your-api-key-here
```

### 404 errors

Ensure service is running:
```bash
docker logs firecrawl-proxy
curl http://localhost:3600/health
```

### Timeout errors

Increase timeout in server.js or use crawl endpoint for large pages.

## Links

- Firecrawl Docs: https://docs.firecrawl.dev
- API Reference: https://docs.firecrawl.dev/api-reference

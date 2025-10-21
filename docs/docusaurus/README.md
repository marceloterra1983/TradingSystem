## Docusaurus Workspace Notes

- React and ReactDOM are pinned to **18.2.0** to avoid potential compatibility issues with community plugins while React 19 support stabilises. If upgrades are attempted, run the full docs build and smoke-test the mermaid/PlantUML plugins before committing.
- Set `PLANTUML_BASE_URL` to point at a local PlantUML server when developing offline; otherwise the default public server will be used.

---

## Advanced Search Configuration

### Overview

The documentation site includes a custom faceted search implementation powered by the Documentation API (port 3400) with FlexSearch backend.

### Features

- ✅ Full-text search across 195+ documentation files
- ✅ Faceted filtering by domain, type, tags, and status
- ✅ Real-time filter updates with result counts
- ✅ Query string persistence (shareable search URLs)
- ✅ Autocomplete suggestions
- ✅ Search analytics (Prometheus metrics)
- ✅ 100% local execution (no external search services)

### Architecture

```
Docusaurus UI (port 3004)
  ↓ (fetch)
Documentation API (port 3400)
  ↓ (FlexSearch)
Markdown Files (docs/context/)
  ↓ (frontmatter)
Metadata (domain, type, tags, status)
```

### Search Endpoints

1. **Search**: `GET http://localhost:3400/api/v1/docs/search`

   - Query params: `q`, `domain`, `type`, `tags`, `status`, `limit`
   - Returns: `{total, results: [{title, domain, type, tags, status, path, summary, score}]}`

2. **Facets**: `GET http://localhost:3400/api/v1/docs/facets`

   - Query params: `q` (optional, for filtered facets)
   - Returns: `{facets: {domains: [{value, count}], types: [...], tags: [...], statuses: [...]}}`

3. **Suggest**: `GET http://localhost:3400/api/v1/docs/suggest`

   - Query params: `q`, `limit`
   - Returns: `{suggestions: [{text, domain, type, path}]}`

4. **Reindex**: `POST http://localhost:3400/api/v1/docs/reindex`
   - Triggers full reindexing of markdown documentation
   - Returns: `{indexed: {files: 195, tags: 50, ...}}`

### Environment Variables

**IMPORTANT:** The Docusaurus application automatically loads environment variables from the project root `.env` file (located at `/home/marce/projetos/TradingSystem/.env`). This ensures centralized configuration management across all services.

```bash
# In root .env file (loaded automatically by docusaurus.config.ts)
SEARCH_API_URL=http://localhost:3400/api/v1/docs  # Documentation API base URL
SEARCH_ENABLED=true                                # Enable/disable search feature
HEALTH_API_URL=http://localhost:3400/api/v1/docs/health  # Health dashboard API
GRAFANA_URL=http://localhost:3000/d/docs-health          # Grafana dashboard URL
```

**Production deployment variables:**
```bash
# For reverse proxy or custom domain deployments
DOCS_SITE_URL=https://docs.tradingsystem.local  # Full site URL
DOCS_BASE_URL=/docs/                             # Base path (use / for root)
```

**How it works:**
- `docusaurus.config.ts` uses `dotenv` to load `../../.env` before exporting config
- All `process.env` references resolve from the root `.env` file
- No local `.env` files needed in the docs directory
- `url` and `baseUrl` are configurable for production reverse proxy setups

### Usage

#### Via UI

1. Click "Search" in navbar or press Ctrl+K
2. Enter search query
3. Apply filters (domain, type, tags, status)
4. Click result to navigate to document

#### Via URL

- Direct link: `http://localhost:3004/search?q=dark+mode&domain=frontend&type=guide`
- Shareable search URLs with filters

#### Via API

```bash
# Search for "dark mode" in frontend guides
curl 'http://localhost:3400/api/v1/docs/search?q=dark+mode&domain=frontend&type=guide' | jq

# Get facet counts
curl 'http://localhost:3400/api/v1/docs/facets' | jq

# Autocomplete suggestions
curl 'http://localhost:3400/api/v1/docs/suggest?q=dark&limit=5' | jq

# Trigger reindex
curl -X POST 'http://localhost:3400/api/v1/docs/reindex' | jq
```

### Faceted Filters

#### Domain (4 values)

- `frontend` - React dashboard, UI components, frontend architecture
- `backend` - APIs, services, data schemas, backend architecture
- `ops` - Deployment, monitoring, infrastructure, runbooks
- `shared` - Product specs, templates, diagrams, cross-cutting concerns

#### Type (11 values)

- `guide` - Implementation guides, tutorials, how-tos
- `reference` - API references, technical references
- `adr` - Architecture Decision Records
- `prd` - Product Requirements Documents
- `rfc` - Request for Comments
- `runbook` - Operational runbooks
- `overview` - High-level overviews
- `index` - Index/catalog pages
- `glossary` - Terminology definitions
- `template` - Document templates
- `feature` - Feature specifications

#### Status (3 values)

- `active` - Current and maintained
- `draft` - Work in progress
- `deprecated` - Outdated, kept for reference

#### Tags (50+ values)

- Top tags: frontend, backend, api, guide, deployment, ui, layout, dark-mode, webscraper, documentation, etc.
- Multi-select supported (combine multiple tags with AND logic)

### Search Analytics

Metrics tracked via Prometheus:

- `docs_faceted_search_requests_total` - Total searches with filters
- `docs_search_filters_used_total` - Filter usage by type
- `docs_popular_tags` - Tag search frequency
- `docs_search_zero_results_total` - Searches with no results
- `docs_search_duration_seconds` - Search performance

**View metrics:**

```bash
curl http://localhost:3400/metrics | grep docs_search
```

**Grafana Dashboard** (future):

- Search volume over time
- Popular queries and filters
- Zero-result queries (for content gap analysis)
- Search performance (p50, p95, p99)

### Reindexing

#### Automatic

- On Documentation API startup (indexes all markdown files)
- Triggered by file watcher (future enhancement)

#### Manual

```bash
# Via API
curl -X POST http://localhost:3400/api/v1/docs/reindex

# Via npm script
cd docs/docusaurus
npm run search:reindex
```

### Performance

- Initial indexing: ~5-10 seconds for 195 files
- Search latency: <100ms for typical queries
- Facet computation: <50ms (cached for 5 minutes)
- Index size: ~2-5 MB in memory

### Quick Start Commands

```bash
# Development (with increased memory, recommended)
npm run dev

# Development with cache clear (troubleshooting)
npm run dev:clean

# Standard start
npm run start -- --port 3004
```

**Recommended:** Always use `npm run dev` for local development. It includes:
- Increased Node.js memory allocation (4096 MB)
- Automatic port configuration (3004)
- Better performance for large documentation sites

### Troubleshooting

#### Issue: Stale cache or UI not loading

- Run `npm run dev:clean` to clear cache and restart
- This automatically increases Node memory and clears Docusaurus cache

#### Issue: Search returns no results

- Check Documentation API is running: `curl http://localhost:3400/health`
- Trigger reindex: `curl -X POST http://localhost:3400/api/v1/docs/reindex`
- Check browser console for CORS errors
- Verify SEARCH_API_URL in .env

#### Issue: Facets show 0 counts

- Reindex documentation: `npm run search:reindex`
- Check frontmatter fields are present in markdown files
- Verify domain/type/status values match allowed lists

#### Issue: Search is slow

- Check network latency to Documentation API
- Increase debounce delay in search page (default: 500ms)
- Reduce result limit (default: 50)
- Check Prometheus metrics for search duration

#### Issue: CORS errors in browser

- Ensure CORS_ORIGIN in root .env includes `http://localhost:3004`
- Restart Documentation API after .env changes
- Check browser console for specific CORS error

### Common Search Queries (for testing)

```bash
# Find all frontend guides
?q=&domain=frontend&type=guide

# Search dark mode in frontend
?q=dark+mode&domain=frontend

# Find all ADRs
?q=&type=adr

# Search by multiple tags
?q=&tags=ui,dark-mode,theming

# Find active deployment runbooks
?q=deployment&domain=ops&type=runbook&status=active
```

---

## Documentation Health Dashboard

### Overview

The documentation site includes comprehensive health dashboards showing quality metrics, trends, and actionable issues.

### Access

- **Docusaurus Dashboard**: `http://localhost:3004/health`
- **Grafana Dashboard**: `http://localhost:3000/d/docs-health`

### Features

**Docusaurus Dashboard (Developer-focused)**:
- 📊 Overall health score with grade (A-F)
- 🔗 Link success rate and broken link details
- 📝 Frontmatter compliance metrics
- 📅 Content freshness analysis
- 📈 30-day trend charts
- 🔍 Filterable issue tables (broken links, outdated docs, duplicates)
- 📥 Export options (JSON, CSV)
- 🔄 Auto-refresh every 5 minutes

**Grafana Dashboard (Ops-focused)**:
- Real-time Prometheus metrics
- Historical trends (30+ days)
- Alert configuration
- Domain comparison charts
- Performance metrics (audit execution time)

### Metrics Displayed

**Health Score**:
- Overall score (0-100)
- Grade (A/B/C/D/F)
- Status (Excellent/Good/Fair/Poor/Critical)
- Trend (↑↓ from last audit)

**Link Health**:
- Total links: 527
- Broken links: 27
- Success rate: 94.9%
- By priority: Critical (15), Warning (8), Info (4)

**Frontmatter Compliance**:
- Total files: 195
- Complete: 195 (100%)
- Missing: 0
- Incomplete: 0

**Content Freshness**:
- Outdated (>90 days): 0
- Average age: 2.3 days
- Oldest document: 9 days
- Freshness rate: 100%

**Duplicates**:
- Exact duplicates: 0 groups
- Similar titles: 12 pairs (all intentional)
- Similar summaries: 2 pairs

**Diagrams**:
- Total PlantUML diagrams: 32
- Guides with diagrams: 15
- Coverage: 75%

### Data Sources

**Docusaurus Dashboard**:
- API: `http://localhost:3400/api/v1/docs/health/*`
- Endpoints:
  - `/summary` - High-level health summary
  - `/metrics` - Detailed metric values
  - `/issues` - Paginated issue lists
  - `/trends` - Historical trend data
  - `/latest-report` - Latest audit report metadata

**Grafana Dashboard**:
- Data source: Prometheus (http://prometheus:9090)
- Metrics: `docs_health_score`, `docs_links_broken`, `docs_frontmatter_complete`, etc.
- Scrape interval: 30 seconds
- Retention: 90 days (Prometheus default)

### Update Schedule

**Automated (Daily)**:
- GitHub Actions workflow runs at 2 AM UTC
- Executes full documentation audit
- Generates JSON reports and markdown report
- Updates Prometheus metrics via API
- Commits audit report to repository
- Creates GitHub issue if health degrades

**Manual**:
```bash
# Run audit locally
bash scripts/docs/audit-documentation.sh

# Trigger via GitHub Actions
# Actions → Documentation Health Audit → Run workflow

# Refresh dashboard
# Docusaurus: Click refresh button
# Grafana: Auto-refreshes based on interval
```

### Configuration

**Environment Variables** (in root .env):
```bash
HEALTH_API_URL=http://localhost:3400/api/v1/docs/health
GRAFANA_URL=http://localhost:3000/d/docs-health
HEALTH_REFRESH_INTERVAL=300000  # 5 minutes
```

**Grafana Dashboard Import**:
```bash
# Dashboard JSON location
infrastructure/monitoring/grafana/dashboards/documentation-health.json

# Import via Grafana UI
# Dashboards → Import → Upload JSON file

# Or via provisioning (automatic)
# Place in grafana/dashboards/ directory
# Grafana auto-loads on startup
```

### Troubleshooting

**Issue: Dashboard shows no data**
- Check Documentation API is running: `curl http://localhost:3400/health`
- Run audit to generate data: `bash scripts/docs/audit-documentation.sh`
- Verify Prometheus scraping: `http://localhost:9090/targets`
- Check browser console for API errors

**Issue: Metrics are outdated**
- Trigger manual audit: `bash scripts/docs/audit-documentation.sh`
- Call update endpoint: `POST /api/v1/docs/health/update-metrics`
- Wait for next scheduled audit (2 AM UTC daily)

**Issue: Grafana dashboard not loading**
- Verify Prometheus data source configured
- Check Prometheus is scraping documentation-api job
- Verify metrics exist: `curl http://localhost:3400/metrics | grep docs_`
- Re-import dashboard JSON if needed

### Related Documentation

- [Health Dashboard Guide](../context/shared/tools/health-dashboard-guide.md) - Complete user guide
- [Automated Code Quality](../context/ops/automated-code-quality.md) - CI/CD integration
- [Search Guide](../context/shared/tools/search-guide.md) - User guide for search features
- [Documentation API](../context/backend/api/documentation-api/implementation-plan.md) - Backend API documentation

### Production Build & Deployment

#### Overview

The production deployment uses a multi-stage Docker build to create an optimized Nginx-served static site. The pipeline supports:

- Environment-based configuration (`DOCS_SITE_URL`, `DOCS_BASE_URL`)
- Reverse proxy deployment with custom base paths
- Static asset optimization and caching
- Health checks and monitoring

#### Build Pipeline

**1. Configure Environment Variables**

Set production URLs in root `.env` or via environment:

```bash
# In root .env or docker-compose environment
DOCS_SITE_URL=https://docs.tradingsystem.local  # Full site URL
DOCS_BASE_URL=/                                   # Base path (/ for root, /docs/ for subpath)
```

**Important:** If deploying under a reverse proxy subpath (e.g., `https://example.com/docs/`), ensure:
- `DOCS_BASE_URL=/docs/` (with trailing slash)
- Nginx `location` block matches this path
- All internal links will be prefixed automatically by Docusaurus

**2. Build Docker Image**

```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus

# Build with build args (recommended)
docker build -f Dockerfile.prod \
  --build-arg DOCS_SITE_URL=https://docs.tradingsystem.local \
  --build-arg DOCS_BASE_URL=/ \
  -t tradingsystem-docs:latest .

# Or use environment variables from .env (will be loaded by docusaurus.config.ts)
docker build -f Dockerfile.prod -t tradingsystem-docs:latest .
```

**3. Run Production Container**

```bash
# Standalone
docker run -d \
  --name tradingsystem-docs \
  -p 8080:80 \
  tradingsystem-docs:latest

# Via docker-compose (recommended)
# Add to infrastructure/compose/docker-compose.docs.yml
services:
  docusaurus:
    image: tradingsystem-docs:latest
    container_name: docs-docusaurus
    ports:
      - "8080:80"
    networks:
      - tradingsystem_docs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 5s
      retries: 3
```

**4. Verify Deployment**

```bash
# Check health
curl http://localhost:8080/health
# Should return: healthy

# Test full site
curl -I http://localhost:8080/
# Should return: 200 OK

# Test search page
curl -I http://localhost:8080/search
# Should return: 200 OK (SPA fallback works)
```

#### Reverse Proxy Configuration

**Nginx Reverse Proxy Example:**

```nginx
# Main site reverse proxy
server {
    listen 443 ssl http2;
    server_name docs.tradingsystem.local;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Proxy to Docusaurus container
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Subpath deployment (e.g., main.site/docs/)
server {
    listen 443 ssl http2;
    server_name tradingsystem.local;

    # Other locations...

    # Docusaurus under /docs/
    location /docs/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**IMPORTANT:** When using subpath deployment:
1. Set `DOCS_BASE_URL=/docs/` before building
2. Rebuild Docker image with new `baseUrl`
3. Nginx `location /docs/` must match `baseUrl`
4. All assets will be served under `/docs/` automatically

#### Build Process Details

**Multi-stage Dockerfile (`Dockerfile.prod`):**

```dockerfile
# Stage 1: Build (Node.js)
- Installs dependencies
- Runs npm run build
- Generates static HTML/CSS/JS in build/

# Stage 2: Production (Nginx)
- Copies build/ to /usr/share/nginx/html
- Copies nginx.conf for SPA routing
- Exposes port 80
- Includes health check
```

**Nginx Configuration (`nginx.conf`):**

- Gzip compression for text assets
- 1-year cache for static assets (CSS, JS, images)
- SPA fallback: `try_files $uri $uri/ /index.html`
- Security headers (X-Frame-Options, X-Content-Type-Options)
- Health check endpoint at `/health`

**Build Output:**

```
build/
├── index.html              # Main entry point
├── docs/                   # Documentation pages
├── search/                 # Search page
├── health/                 # Health dashboard
├── assets/                 # JS/CSS bundles (hashed)
│   ├── css/
│   └── js/
└── img/                    # Images and icons
```

#### Environment Variables Reference

| Variable | Purpose | Default | Example |
|----------|---------|---------|----------|
| `DOCS_SITE_URL` | Full site URL for production | `http://localhost` | `https://docs.tradingsystem.local` |
| `DOCS_BASE_URL` | Base path for routing | `/` | `/docs/` (for subpath) |
| `SEARCH_API_URL` | Documentation API for search | `http://localhost:3400/api/v1/docs` | `https://api.tradingsystem.local/docs` |
| `HEALTH_API_URL` | Health metrics API | `http://localhost:3400/api/v1/docs/health` | `https://api.tradingsystem.local/docs/health` |
| `GRAFANA_URL` | Grafana dashboard link | `http://localhost:3000/d/docs-health` | `https://monitoring.tradingsystem.local/grafana/d/docs-health` |
| `PLANTUML_BASE_URL` | PlantUML server for diagrams | `https://www.plantuml.com/plantuml/svg` | `http://localhost:8080/svg` (self-hosted) |

#### CI/CD Integration

**GitHub Actions Example:**

```yaml
name: Deploy Docusaurus

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'docs/docusaurus/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          cd docs/docusaurus
          docker build -f Dockerfile.prod \
            --build-arg DOCS_SITE_URL=${{ secrets.DOCS_SITE_URL }} \
            --build-arg DOCS_BASE_URL=${{ secrets.DOCS_BASE_URL }} \
            -t tradingsystem-docs:${{ github.sha }} \
            -t tradingsystem-docs:latest .
      
      - name: Push to registry
        run: |
          docker push tradingsystem-docs:${{ github.sha }}
          docker push tradingsystem-docs:latest
      
      - name: Deploy to production
        run: |
          # SSH to production server
          ssh deploy@prod "docker pull tradingsystem-docs:latest && \
            docker-compose -f /opt/tradingsystem/docker-compose.yml up -d docusaurus"
```

#### Troubleshooting Production

**Issue: 404 on page refresh**
- Ensure `nginx.conf` has `try_files $uri $uri/ /index.html`
- Verify SPA fallback is configured in Nginx

**Issue: Assets not loading under subpath**
- Check `DOCS_BASE_URL` matches Nginx `location` path
- Rebuild Docker image after changing `baseUrl`
- Clear browser cache

**Issue: Search/Health pages return 404**
- Verify `SEARCH_API_URL` and `HEALTH_API_URL` are accessible from browser
- Check CORS allows the Docusaurus origin
- Ensure APIs are exposed through reverse proxy

**Issue: Build fails with OOM**
- Increase Docker build memory: `docker build --memory=4g ...`
- Or use `NODE_OPTIONS="--max-old-space-size=4096"` in Dockerfile

#### Performance Optimization

**Nginx Optimizations:**
- Gzip compression enabled for text assets
- 1-year cache headers for hashed assets
- ETags for cache validation
- HTTP/2 for multiplexed requests

**Build Optimizations:**
- CSS minification (Docusaurus default)
- JS code splitting (per route)
- Image optimization (manual - use next-gen formats)
- Prefetching for navigation links

**CDN Integration (Optional):**
```nginx
# Serve static assets from CDN
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    proxy_pass https://cdn.tradingsystem.local;
    proxy_cache_valid 200 1y;
}
```

---

### Version

**Version:** 2.0.0 (Custom Faceted Search)  
**Last Updated:** 2025-10-18  
**Changelog:**

- v2.0.0 (2025-10-18): Added custom faceted search with Documentation API integration
- v1.0.0 (2025-10-17): Initial Docusaurus setup with PlantUML and Mermaid support


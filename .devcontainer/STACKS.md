# TradingSystem - Stacks Overview

## Essential Stacks (Auto-start)

These stacks start automatically when the devcontainer starts:

1. **Gateway** (`0-gateway-stack`) - Traefik reverse proxy
2. **Database UI** (`5-0-database-stack`) - DB management tools
3. **Workspace** (`4-3-workspace-stack`) - Core workspace API
4. **Dashboard** (`1-dashboard-stack`) - Main dashboard UI
5. **Docs** (`2-docs-stack`) - Documentation hub

## Optional Stacks

Configure in `.devcontainer/.env.devcontainer`:

### Trading & Finance
- **TP Capital** (`4-1-tp-capital-stack`) - Trading system
- **Telegram** (`4-2-telegram-stack`) - Telegram integration

### AI & Automation  
- **RAG System** (`4-4-rag-stack`) - LlamaIndex + Ollama
- **N8N** (`5-1-n8n-stack`) - Workflow automation
- **Kestra** (`5-5-kestra-stack`) - Data orchestration

### Messaging & Communication
- **Evolution API** (`5-2-evolution-api-stack`) - WhatsApp API
- **WAHA** (`5-3-waha-stack`) - WhatsApp HTTP API

### Tools & Services
- **Course Crawler** (`4-5-course-crawler-stack`) - Web scraping
- **Firecrawl** (`5-7-firecrawl-stack`) - Web content extraction
- **Monitoring** (`6-1-monitoring-stack`) - Prometheus + Grafana

## Manual Control
```bash
# Start specific stack
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d

# Stop specific stack  
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml down

# View stack status
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml ps
```

## Configuration

Edit `.devcontainer/.env.devcontainer`:
```bash
# Enable all optional stacks
AUTOSTART_OPTIONAL_STACKS=true
```

## Troubleshooting
```bash
# Check all containers
docker ps -a

# Check logs
docker logs <container-name>

# Restart unhealthy containers
docker restart <container-name>
```

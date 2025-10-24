---
title: LangGraph Service - Environment Variables
sidebar_position: 1
tags: [documentation]
domain: ops
type: guide
summary: "**Location:** Add these variables to the project root `.env` file"
status: active
last_review: "2025-10-23"
---

# LangGraph Service - Environment Variables

**Location:** Add these variables to the project root `.env` file

## Service Configuration
```bash
LANGGRAPH_PORT=8111
LANGGRAPH_ENV=production  # production|development
LANGGRAPH_LOG_LEVEL=INFO
```

## PostgreSQL/TimescaleDB - Checkpoints
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=tradingsystem
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
```

## QuestDB - Events/Metrics
```bash
QUESTDB_HOST=localhost
QUESTDB_HTTP_PORT=9000
QUESTDB_PG_PORT=8812
QUESTDB_INFLUX_PORT=9009
```

## Agno Agents Integration
```bash
AGNO_API_URL=http://localhost:8200
AGNO_API_TIMEOUT=30
```

## DocsAPI Integration
```bash
DOCS_API_URL=http://localhost:3400
DOCS_API_TIMEOUT=10
```

## Firecrawl Proxy Integration
```bash
FIRECRAWL_PROXY_URL=http://localhost:3600
FIRECRAWL_PROXY_TIMEOUT=60
```

## LLM Configuration (Optional)
```bash
LLM_ENRICHMENT_ENABLED=false
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp
```

## Feature Flags
```bash
ENABLE_TRADING_WORKFLOWS=true
ENABLE_DOCS_WORKFLOWS=true
ENABLE_WEBHOOKS=true
ENABLE_METRICS=true
ENABLE_TRACING=false
```

## Performance & Resilience
```bash
MAX_CONCURRENT_WORKFLOWS=10
WORKFLOW_TIMEOUT_SECONDS=300
RETRY_MAX_ATTEMPTS=3
RETRY_DELAYS=[1,2,4]
```

## CORS
```bash
CORS_ORIGINS=http://localhost:3103,http://localhost:3004
```

## Monitoring
```bash
PROMETHEUS_PORT=9091
HEALTH_CHECK_TIMEOUT=5
```

## Quick Setup

1. Copy all variables above to `/home/marce/projetos/TradingSystem/.env`
2. Update passwords and API keys
3. Ensure PostgreSQL and QuestDB services are running
4. Restart LangGraph container: `docker compose -f infrastructure/compose/docker-compose.infra.yml restart langgraph`


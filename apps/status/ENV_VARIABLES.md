---
title: Service Launcher - Environment Variables
sidebar_position: 1
tags: [documentation]
domain: shared
type: guide
summary: "Adicione esta seção ao **`.env.example`** no root do projeto:"
status: active
last_review: "2025-10-23"
---

# Service Launcher - Environment Variables

Adicione esta seção ao **`.env.example`** no root do projeto:

```bash
# ==============================================================================
# 🚀 SERVICE LAUNCHER CONFIGURATION
# ==============================================================================
# Service Launcher orchestrates local services and provides health checks
# Documentation: docs/context/backend/api/service-launcher/README.md

# Main Configuration
SERVICE_LAUNCHER_PORT=3500              # HTTP port for Service Launcher API
SERVICE_LAUNCHER_PROTOCOL=http           # Protocol for health check URLs (http|https)
SERVICE_LAUNCHER_HOST=localhost          # Host for health check URLs
SERVICE_LAUNCHER_TIMEOUT_MS=2500         # Health check timeout in milliseconds
SERVICE_LAUNCHER_USE_WT=false            # Use Windows Terminal for launch (true|false)
SERVICE_LAUNCHER_LOG_LEVEL=info          # Log level (debug|info|warn|error)

# Service Port Overrides (optional - defaults to service's standard port)
# Use these to override the default ports if services are running on non-standard ports
SERVICE_LAUNCHER_WORKSPACE_PORT=3200     # Workspace API port
SERVICE_LAUNCHER_TP_CAPITAL_PORT=3200    # TP Capital signals API port
SERVICE_LAUNCHER_DOCS_PORT=3400          # Documentation API port
SERVICE_LAUNCHER_FIRECRAWL_PROXY_PORT=3600  # Firecrawl Proxy API port
SERVICE_LAUNCHER_DASHBOARD_PORT=3103     # Dashboard UI port (Vite)
SERVICE_LAUNCHER_DOCUSAURUS_PORT=3205    # Docusaurus documentation port
SERVICE_LAUNCHER_PROMETHEUS_PORT=9090    # Prometheus metrics port
SERVICE_LAUNCHER_GRAFANA_PORT=3000       # Grafana dashboards port
SERVICE_LAUNCHER_QUESTDB_HTTP_PORT=9000  # QuestDB HTTP console port

# Service URL Overrides (optional - overrides protocol/host/port combination)
# Use these for custom URLs or remote services
# SERVICE_LAUNCHER_WORKSPACE_URL=http://custom-host:3200
# SERVICE_LAUNCHER_TP_CAPITAL_URL=http://custom-host:3200
# SERVICE_LAUNCHER_DOCS_URL=http://custom-host:3400
# SERVICE_LAUNCHER_FIRECRAWL_PROXY_URL=http://custom-host:3600
# SERVICE_LAUNCHER_SELF_URL=http://custom-host:3500/health

# CORS Configuration
# Comma-separated list of allowed origins for cross-origin requests
CORS_ORIGIN=http://localhost:3103,http://localhost:3205

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000              # Rate limit window in milliseconds (default: 1 minute)
RATE_LIMIT_MAX=200                       # Maximum requests per window (default: 200)
```

## Como Usar

1. **Copie** o conteúdo acima
2. **Cole** no `.env.example` após a seção "GLOBAL SERVICE CONFIGURATION"
3. **Opcional**: Copie também para `.env` se quiser customizar valores

## Variáveis Essenciais

As seguintes variáveis já têm defaults razoáveis no código, mas podem ser customizadas:

- `SERVICE_LAUNCHER_PORT`: Porta 3500 (padrão oficial do TradingSystem)
- `SERVICE_LAUNCHER_TIMEOUT_MS`: 2500ms (2.5 segundos) para health checks
- `CORS_ORIGIN`: Dashboard (3103) e Docusaurus (3205)
- `RATE_LIMIT_MAX`: 200 requests/minuto (suficiente para uso local)

## Defaults no Código

Se nenhuma variável for definida, o Service Launcher usa:
```javascript
PORT: 3500
PROTOCOL: 'http'
HOST: 'localhost'
TIMEOUT_MS: 2500
USE_WT: false
LOG_LEVEL: 'info'
RATE_LIMIT_WINDOW_MS: 60000
RATE_LIMIT_MAX: 200
```

## Referências

- [Service Launcher README](./README.md)
- [OpenSpec Proposal](../../../infrastructure/openspec/changes/fix-service-launcher-critical-issues/proposal.md)
- [Audit Plan](../../../docs/reports/service-launcher-audit-plan.md)












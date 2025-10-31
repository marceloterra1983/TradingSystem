---
title: Service Launcher API
sidebar_position: 1
tags:
  - service-launcher
  - api
  - health
  - orchestration
  - nodejs
  - express
domain: backend
type: index
summary: Serviço de orquestração local que inicia serviços auxiliares em novos terminais e monitora health de todos os serviços do TradingSystem
status: active
last_review: "2025-10-18"
port: 3500
dependencies:
  - express
  - pino
  - dotenv
related_docs:
  - docs/context/backend/api/service-launcher/README.md
  - infrastructure/openspec/changes/fix-service-launcher-critical-issues/
---

# Service Launcher API

> **Porta oficial:** 3500  
> **Status:** ✅ Produção  
> **Última atualização:** 2025-10-18

## 📋 Visão Geral

API Node.js/Express que orquestra serviços locais do TradingSystem, fornecendo:
- ✅ Inicialização de serviços em novos terminais (Windows/Linux)
- ✅ Monitoramento de health de todos os serviços auxiliares
- ✅ Status agregado para dashboard e alertas
- ✅ Logging estruturado com Pino
- ✅ Testes automatizados (25 testes, 66% coverage)

## 🚀 Quick Start

```bash
# 1. Instalar dependências
cd frontend/apps/service-launcher
npm install

# 2. Iniciar serviço (carrega .env do project root)
npm start
# Disponível em http://localhost:3500

# 3. Testar
curl http://localhost:3500/health
curl http://localhost:3500/api/status | jq '.overallStatus'
curl http://localhost:3500/api/health/full | jq '.overallHealth'

# 4. Rodar testes
npm test                  # Todos os testes
npm run test:watch        # Modo watch
npm run test:coverage     # Com coverage report
```

## 📡 Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/health` | Health check básico do Service Launcher |
| `GET` | `/api/status` | Status agregado de todos os serviços monitorados |
| `GET` | `/api/health/full` | Comprehensive health status (services + containers + databases) com cache de 60s |
| `POST` | `/launch` | Iniciar serviço em novo terminal (Windows/Linux) |

### GET /health

Retorna status do próprio Service Launcher.

**Response 200 OK:**
```json
{
  "status": "ok",
  "service": "service-launcher-api"
}
```

### GET /api/status

Retorna status agregado de todos os serviços monitorados com métricas.

**Response 200 OK:**
```json
{
  "overallStatus": "ok",
  "totalServices": 11,
  "degradedCount": 0,
  "downCount": 0,
  "averageLatencyMs": 124,
  "lastCheckAt": "2025-10-18T01:49:12.221Z",
  "services": [
    {
      "id": "workspace-api",
      "name": "Workspace",
      "description": "Workspace item management",
      "category": "api",
      "port": 3200,
      "status": "ok",
      "latencyMs": 85,
      "updatedAt": "2025-10-18T01:49:12.213Z",
      "details": {
        "healthUrl": "http://localhost:3200/health",
        "httpStatus": 200
      }
    }
  ]
}
```

**Status Values:**
- `ok`: Serviço respondendo corretamente (HTTP 2xx)
- `degraded`: Serviço respondeu mas com status 4xx/5xx
- `down`: Timeout ou erro de conexão

**Sorting:** Serviços ordenados por severidade (down > degraded > ok), depois por nome.

### GET /api/health/full

Executa o script `scripts/maintenance/health-check-all.sh --format json` para retornar uma visão completa da saúde dos serviços locais, containers Docker e bancos de dados.

- Resultados são armazenados em cache em memória por 60 segundos para evitar execução excessiva do script
- Cabeçalhos HTTP indicam se a resposta veio do cache e a idade do cache
- Inclui sugestões de remediação quando o estado não é saudável

**Response headers:**
- `X-Cache-Status`: `HIT` (cache) ou `MISS` (execução fresh)
- `X-Cache-Age`: segundos desde o último refresh do cache (0 quando MISS)

**Response 200 OK (healthy):**
```json
{
  "localServices": [
    {
      "name": "Dashboard",
      "status": "running",
      "port": 3103,
      "pid": 12345,
      "health": "healthy",
      "latencyMs": 45
    }
  ],
  "dockerContainers": [
    {
      "name": "data-timescaledb",
      "status": "running",
      "health": "healthy",
      "group": "data-timescale",
      "service": "timescaledb"
    }
  ],
  "databases": [
    {
      "name": "timescaledb",
      "status": "up",
      "host": "localhost",
      "port": "5432"
    }
  ],
  "summary": {
    "allOk": true,
    "servicesChecked": 8,
    "containersChecked": 12,
    "databasesChecked": 1
  },
  "overallHealth": "healthy",
  "remediation": []
}
```

**Response 200 OK (degraded):**
```json
{
  "localServices": [],
  "dockerContainers": [],
  "databases": [],
  "summary": { "allOk": false },
  "overallHealth": "degraded",
  "remediation": [
    {
      "target": "Dashboard",
      "actions": [
        "Start service: cd /path/to/dashboard && npm run dev",
        "Check port usage: lsof -i :3103"
      ]
    }
  ]
}
```

**Response 500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to execute health check script",
  "message": "Health check script timed out after 10s"
}
```

**Overall Health Status valores:**
- `healthy`: Todos os serviços e dependências operacionais
- `degraded`: Dependências não críticas com falhas ou latência elevada
- `critical`: Serviços críticos (TimescaleDB, Dashboard, Service Launcher) indisponíveis

**Performance Notes:**
- Primeira requisição (MISS): ~2-5s (execução completa do script)
- Requisições subsequentes (HIT): <10ms (dados em memória)
- TTL do cache: 60 segundos
- Timeout do script: 10 segundos

### POST /launch

Inicia um serviço em novo terminal.

**Request Body:**
```json
{
  "serviceName": "Dashboard",
  "workingDir": "/home/marce/projetos/TradingSystem/frontend/dashboard",
  "command": "npm run dev"
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "message": "Dashboard launched in Windows Terminal"
}
```

**Response 400 Bad Request:**
```json
{
  "success": false,
  "error": "Missing required fields: serviceName, workingDir, command"
}
```

## ⚙️ Configuração

### 🔧 Configuração Centralizada

⚙️ **Todas as variáveis de ambiente são carregadas do arquivo `.env` na raiz do projeto.**

O serviço **NÃO usa** arquivos `.env` locais. A configuração segue o padrão centralizado do projeto:

```
1. config/.env.defaults     (Valores padrão versionados)
         ↓
2. .env (raiz)               (Configuração do ambiente)
         ↓
3. .env.local (raiz)         (Overrides locais, gitignored)
         ↓
4. Environment Variables     (Runtime, maior prioridade)
```

O carregamento é feito automaticamente via:
```javascript
require(path.join(projectRoot, 'backend/shared/config/load-env.cjs'));
```

**Documentação relacionada:**
- 📖 [Environment Configuration Rules](../../../config/ENV-CONFIGURATION-RULES.md)
- 📖 [Config Directory README](../../../config/README.md)

### Variáveis de Ambiente

Todas as variáveis são **opcionais** - o serviço tem defaults razoáveis definidos em `config/.env.defaults`.

#### Main Configuration

| Variável | Default | Descrição |
|----------|---------|-----------|
| `SERVICE_LAUNCHER_PORT` | `3500` | Porta HTTP do Service Launcher |
| `PORT` | `3500` | Fallback para backward compatibility |
| `SERVICE_LAUNCHER_PROTOCOL` | `http` | Protocolo para health check URLs |
| `SERVICE_LAUNCHER_HOST` | `localhost` | Host para health check URLs |
| `SERVICE_LAUNCHER_TIMEOUT_MS` | `2500` | Timeout de health checks (ms) |
| `SERVICE_LAUNCHER_USE_WT` | `false` | Usar Windows Terminal no launch |
| `SERVICE_LAUNCHER_LOG_LEVEL` | `info` | Nível de log (debug\|info\|warn\|error) |

#### Service Port Overrides

Use estas variáveis para customizar portas dos serviços monitorados:

| Variável | Default | Serviço |
|----------|---------|---------|
| `SERVICE_LAUNCHER_WORKSPACE_PORT` | `3200` | Workspace API *(reads legacy `SERVICE_LAUNCHER_LIBRARY_PORT` if present)* |
| `SERVICE_LAUNCHER_TP_CAPITAL_PORT` | `3200` | TP Capital Signals |
| `SERVICE_LAUNCHER_DOCS_PORT` | `3401` | Documentation API |
| `SERVICE_LAUNCHER_FIRECRAWL_PROXY_PORT` | `3600` | Firecrawl Proxy |
| `SERVICE_LAUNCHER_DASHBOARD_PORT` | `3103` | Dashboard UI |
| `SERVICE_LAUNCHER_DOCUSAURUS_PORT` | `3400` | Documentation Hub (docs-hub container) |
| `SERVICE_LAUNCHER_PROMETHEUS_PORT` | `9090` | Prometheus |
| `SERVICE_LAUNCHER_GRAFANA_PORT` | `3000` | Grafana |
| `SERVICE_LAUNCHER_QUESTDB_HTTP_PORT` | `9000` | QuestDB Console |

#### Service URL Overrides

Para URLs customizadas ou serviços remotos:

```bash
SERVICE_LAUNCHER_WORKSPACE_URL=http://custom-host:3200/health
SERVICE_LAUNCHER_TP_CAPITAL_URL=http://custom-host:3200/health
# ... etc
```

#### Security Configuration

| Variável | Default | Descrição |
|----------|---------|-----------|
| `CORS_ORIGIN` | `http://localhost:3103,http://localhost:3400,http://localhost:3401` | Origins permitidas (Dashboard + Docs) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Janela de rate limit (ms) |
| `RATE_LIMIT_MAX` | `200` | Máximo de requests por janela |

### Arquivo .env.example

Veja `ENV_VARIABLES.md` para cópia completa das variáveis a adicionar no `.env.example` do projeto.

## 🔗 Integrações

### Dashboard (ConnectionsPage)
```typescript
// frontend/dashboard/src/components/pages/ConnectionsPage.tsx
const response = await fetch(`http://localhost:3500/api/status`);
const status = await response.json();
// Exibe semáforo baseado em overallStatus
```

### Comprehensive Health Monitoring
```typescript
// Fetch comprehensive health status with caching headers
const response = await fetch('http://localhost:3500/api/health/full');
const health = await response.json();
const cacheStatus = response.headers.get('X-Cache-Status');
// Exibir breakdown detalhado por categoria (serviços, containers, bancos)
```

### Scripts de Startup
```bash
# scripts/startup/start-service-launcher.sh
# Garante que Service Launcher esteja rodando antes do Dashboard
bash scripts/startup/start-service-launcher.sh
```

### Vite Proxy (Dashboard)
```typescript
// frontend/dashboard/vite.config.ts
proxy: {
  '/api/launcher': {
    target: 'http://localhost:3500',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/launcher/, ''),
  }
}
```

## 🧪 Testes

### Rodar Testes
```bash
npm test              # Todos os testes (25 total)
npm run test:watch    # Modo watch
npm run test:coverage # Coverage report
```

### Suíte de Testes
- `tests/endpoints.test.js` - 12 testes de API endpoints
- `tests/config.test.js` - 7 testes de configuração
- `tests/status.test.js` - 6 testes de health checks

**Coverage atual:** 66% (statements), 50% (branches), 73% (functions)

## 📊 Logging Estruturado

O Service Launcher usa **Pino** para logging estruturado com JSON:

```bash
# Development (pretty print colorido)
SERVICE_LAUNCHER_LOG_LEVEL=debug npm start

# Production (JSON puro)
NODE_ENV=production npm start
```

**Log format:**
```json
{
  "level": "info",
  "time": "2025-10-18T01:49:12.221Z",
  "service": "service-launcher-api",
  "serviceName": "Dashboard",
  "method": "windows-terminal",
  "event": "launch_success",
  "msg": "Service launched via Windows Terminal: Dashboard"
}
```

## 🐛 Troubleshooting

### Problema: "EADDRINUSE: address already in use"
**Solução:**
```bash
# Matar processo na porta 3500
lsof -ti:3500 | xargs kill -9

# Ou usar script de restart
bash scripts/startup/start-service-launcher.sh --force-restart
```

### Problema: Health checks sempre retornam "down"
**Causas comuns:**
- Serviços não estão rodando
- Timeout muito curto (`SERVICE_LAUNCHER_TIMEOUT_MS`)
- Firewall bloqueando conexões locais

**Solução:**
```bash
# 1. Verificar portas abertas
lsof -i:3200 -i:3302 -i:3400

# 2. Aumentar timeout
SERVICE_LAUNCHER_TIMEOUT_MS=5000 npm start

# 3. Testar health URLs manualmente
curl http://localhost:3200/health
```

### Problema: "Health check script not found or permission denied"
**Solução:**
```bash
# Verificar se o script existe e está executável
ls -la scripts/maintenance/health-check-all.sh

# Ajustar permissões se necessário
chmod +x scripts/maintenance/health-check-all.sh

# Executar manualmente (deve retornar JSON válido)
bash scripts/maintenance/health-check-all.sh --format json
```

### Problema: "Failed to gather service status"
**Solução:**
```bash
# Verificar logs com debug
SERVICE_LAUNCHER_LOG_LEVEL=debug npm start

# Verificar se .env está sendo carregado
# Deve mostrar: [dotenv] injecting env from ../../../.env
```

## 📚 Documentação Adicional

- **[API Reference](../../docs/context/backend/api/service-launcher/README.md)** - Documentação oficial detalhada
- **[OpenSpec Proposal](../../infrastructure/openspec/changes/fix-service-launcher-critical-issues/)** - Proposta de correções implementada
- **[Audit Plan](../../docs/reports/service-launcher-audit-plan.md)** - Análise completa de problemas
- **[Environment Variables](./ENV_VARIABLES.md)** - Lista completa de variáveis

## 🔐 Security

⚠️ **WARNING**: Este serviço pode executar comandos arbitrários no sistema. 

**Proteções implementadas:**
- ✅ CORS restrito a origins configuradas
- ✅ Rate limiting (200 req/min default)
- ✅ Apenas para uso local (não expor à rede)
- ✅ Validação de campos obrigatórios

**Uso seguro:**
- Rodar apenas em ambiente de desenvolvimento confiável
- Não expor porta 3500 à rede/internet
- Configurar CORS adequadamente

## 📋 Serviços Monitorados

| ID | Nome | Categoria | Porta Default |
|----|------|-----------|---------------|
| workspace-api | Workspace | api | 3200 |
| tp-capital-signals-api | TP-Capital | api | 3200 |
| documentation-api | DocsAPI | api | 3400 |
| firecrawl-proxy | Firecrawl Proxy | api | 3600 |
| dashboard-ui | Dashboard | ui | 3103 |
| docs-hub | Documentation Hub | docs | 3400 |
| prometheus | Prometheus | monitoring | 9090 |
| grafana | Grafana | monitoring | 3000 |
| questdb-http | QuestDB HTTP | data | 9000 |
| service-launcher | Launcher API | internal | 3500 |

## 🎯 Próximos Passos

- [ ] Implementar Circuit Breaker para serviços com falhas recorrentes
- [ ] Suporte completo para terminais Linux (gnome-terminal, konsole, etc)
- [ ] Dashboard Grafana para monitoramento visual
- [ ] Implementar endpoint de invalidação manual do cache de `/api/health/full`
- [ ] Adicionar suporte WebSocket para atualização em tempo real do health

## 📞 Suporte

- **Problemas comuns**: Ver seção Troubleshooting acima
- **Documentação detalhada**: `docs/context/backend/api/service-launcher/`
- **OpenSpec**: `infrastructure/openspec/changes/fix-service-launcher-critical-issues/`

---

**Versão:** 1.1.0  
**Maintainer:** TradingSystem Team  
**License:** MIT

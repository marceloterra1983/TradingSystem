---
title: Backend - TradingSystem
sidebar_position: 1
tags:
  - backend
domain: backend
type: index
summary: '> Backend Layer Completo - APIs, Serviços, Dados e Configurações'
status: active
last_review: '2025-10-23'
---

# Backend - TradingSystem

> **Backend Layer Completo** - APIs, Serviços, Dados e Configurações
>
> **Última Atualização:** 2025-10-23  
> **Versão:** 4.0.0 (Documentação Consolidada)

---

## 📁 Estrutura Completa

```
backend/
├── api/                          # REST APIs (Node.js/Express)
│   ├── documentation-api/       # Port 3400 - Gestão de documentação
│   ├── workspace/               # Port 3200 - Workspace/Library API
│   └── firecrawl-proxy/        # Port 3600 - Proxy para Firecrawl
│
├── data/                         # Schemas, seeds & scripts
│   ├── timescaledb/             # PostgreSQL/TimescaleDB schemas
│   │   ├── workspace/           # Workspace schemas
│   │   ├── documentation/       # Documentation schemas
│   │   └── langgraph/           # LangGraph checkpoints
│   └── questdb/                 # QuestDB time-series schemas
│       └── schemas/langgraph/   # LangGraph events
│
├── services/                     # Background services
│   └── timescaledb-sync/       # QuestDB → TimescaleDB sync
│
├── shared/                       # Código compartilhado
│   └── config/                  # Environment loaders
│       ├── load-env.js          # ESM loader
│       └── load-env.cjs         # CommonJS loader
│
└── README.md                     # Este arquivo
```

---

## 🚀 APIs REST (backend/api/)

### 1. Documentation API (Port 3400)

**Localização:** `backend/api/documentation-api/`  
**Status:** ✅ Production Ready (Containerizado)  
**Database:** TimescaleDB (Migração QuestDB→PostgreSQL em progresso)

**Funcionalidades:**
- 📊 **Systems Registry** - Registro de todos os serviços de documentação
- 💡 **Ideas Management** - Workflow Kanban para melhorias
- 📋 **Spec Serving** - Servir specs OpenAPI/AsyncAPI
- 🔍 **Search Engine** - Busca full-text em documentação
- 📎 **File Management** - Upload e gestão de arquivos anexos
- 📈 **Statistics** - Métricas de cobertura e saúde
- 📝 **Audit Trail** - Rastreamento de todas as mudanças

**Tecnologias:**
- Node.js 22+ / Express 4
- Prisma ORM (PostgreSQL)
- Pino logging
- Prometheus metrics
- Express Validator

**Endpoints Principais:**
```
GET    /health                    # Health check
GET    /metrics                   # Prometheus metrics
GET    /api/v1/systems            # Listar sistemas
POST   /api/v1/systems            # Criar sistema
GET    /api/v1/ideas              # Listar ideias
POST   /api/v1/ideas              # Criar ideia
GET    /api/v1/search?q=term      # Buscar documentação
POST   /api/v1/files/upload       # Upload de arquivo
GET    /api/v1/stats              # Estatísticas
```

**Quick Start:**
```bash
cd backend/api/documentation-api
npm install
npm run dev  # http://localhost:3400
```

**Docker (Recomendado):**
```bash
docker compose -f tools/compose/docker-compose.docs.yml up -d docs-api
curl http://localhost:3400/health
```

**Configuração:**
```env
DOCUMENTATION_API_PORT=3400
DOCUMENTATION_DB_STRATEGY=postgres
DOCUMENTATION_DATABASE_URL=postgresql://app_documentation:password@localhost:5444/frontend_apps?schema=documentation
CORS_ORIGIN=http://localhost:3103,http://localhost:3004
```

**Arquivos:**
- `openapi.yaml` - Especificação OpenAPI
- `src/server.js` - Servidor principal
- `src/routes/` - Endpoints (systems, ideas, files, search)
- `src/services/` - Lógica de negócio (PascalCase)
- `src/repositories/` - Camada de dados (PascalCase + postgres/)
- `prisma/schema.prisma` - Schema Prisma
- `db/migrations/` - Migrações SQL

---

### 2. Workspace API (Port 3200)

**Localização:** `backend/api/workspace/`  
**Status:** ✅ Production Ready  
**Database:** TimescaleDB (LowDB como fallback)

**Funcionalidades:**
- 📝 **Items CRUD** - Gerenciamento completo de items
- 🏷️ **Categorização** - 6 categorias de sistemas
- 🎯 **Priorização** - 4 níveis (low, medium, high, critical)
- 📊 **Status Tracking** - 5 estados (new, review, in-progress, completed, rejected)
- 🏷️ **Tags** - Sistema flexível de tags
- 💾 **Persistência** - TimescaleDB com hypertables

**Tecnologias:**
- Node.js 18+ / Express 4
- TimescaleDB (hypertables)
- LowDB (fallback para testes)
- Pino logging
- Prometheus metrics

**Endpoints:**
```
GET    /health                    # Health check
GET    /metrics                   # Prometheus metrics
GET    /api/items                 # Listar items
POST   /api/items                 # Criar item
PUT    /api/items/:id             # Atualizar item
DELETE /api/items/:id             # Deletar item
```

**Quick Start:**
```bash
cd backend/api/workspace
npm install
npm run dev  # http://localhost:3200
```

**Configuração:**
```env
WORKSPACE_API_PORT=3200
LIBRARY_DB_STRATEGY=timescaledb
WORKSPACE_DATABASE_URL=postgresql://app_workspace:password@localhost:5444/frontend_apps?schema=workspace
WORKSPACE_TABLE_NAME=workspace_items
```

**Data Model:**
```typescript
interface Item {
  id: string;
  title: string;
  description: string;
  category: 'documentacao' | 'coleta-dados' | 'banco-dados' | 
            'analise-dados' | 'gestao-riscos' | 'dashboard';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'review' | 'in-progress' | 'completed' | 'rejected';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Arquivos:**
- `openapi.yaml` - Especificação OpenAPI
- `src/server.js` - Servidor Express
- `src/config.js` - Configurações (usa shared/config/load-env)
- `src/db/` - Camada de persistência (estratégia: timescaledb ou lowdb)
- `src/routes/items.js` - Rotas de items
- `scripts/init-database.sh` - Script de inicialização do DB

---

### 3. Firecrawl Proxy API (Port 3600)

**Localização:** `backend/api/firecrawl-proxy/`  
**Status:** ✅ Production Ready  
**Upstream:** Firecrawl (Port 3002)

**Funcionalidades:**
- 🌐 **Proxy Layer** - Camada entre Dashboard e Firecrawl
- ✅ **Request Validation** - Validação de payloads
- 🚦 **Rate Limiting** - Proteção contra abuse
- 📊 **Structured Logging** - Logs estruturados com Pino
- 📈 **Metrics** - Prometheus metrics
- 🔄 **Response Translation** - Normalização de respostas

**Tecnologias:**
- Node.js 20+ / Express 4
- Axios (client HTTP)
- Pino logging
- Prometheus metrics
- Express Validator

**Endpoints:**
```
GET    /health                    # Health + Firecrawl connectivity
GET    /metrics                   # Prometheus metrics
POST   /api/v1/scrape             # Scrape single URL
POST   /api/v1/crawl              # Start crawl job
GET    /api/v1/crawl/:id          # Check crawl status
```

**Quick Start:**
```bash
# 1. Start Firecrawl core
bash scripts/firecrawl/start.sh

# 2. Start proxy
cd backend/api/firecrawl-proxy
npm install
npm run dev  # http://localhost:3600
```

**Configuração:**
```env
FIRECRAWL_PROXY_PORT=3600
FIRECRAWL_PROXY_BASE_URL=http://localhost:3002
FIRECRAWL_PROXY_TIMEOUT=30000
FIRECRAWL_PROXY_RATE_LIMIT_WINDOW_MS=60000
FIRECRAWL_PROXY_RATE_LIMIT_MAX=100
CORS_ORIGIN=http://localhost:3103,http://localhost:3004
```

**Exemplo de Request:**
```bash
curl -X POST http://localhost:3600/api/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","formats":["markdown","html"]}'
```

**Arquivos:**
- `src/server.js` - Servidor principal (usa shared/config/load-env)
- `src/routes/scrape.js` - Rotas de scraping
- `src/services/FirecrawlService.js` - Lógica de proxy
- `src/middleware/validation.js` - Validações
- `src/metrics.js` - Métricas Prometheus
- `src/config/logger.js` - Configuração de logs

---

## 💾 Camada de Dados (backend/data/)

### Estrutura Consolidada

```
backend/data/
├── timescaledb/                  # TODOS os schemas PostgreSQL/TimescaleDB
│   ├── workspace/               # Workspace API schemas
│   │   ├── 01_workspace_items.sql
│   │   └── 02_workspace_audit_log.sql
│   ├── documentation/           # Documentation API schemas
│   │   ├── 01_documentation_systems.sql
│   │   ├── 02_documentation_ideas.sql
│   │   ├── 03_documentation_files.sql
│   │   └── 04_documentation_audit_log.sql
│   ├── langgraph/               # LangGraph PostgreSQL schemas
│   │   └── langgraph_checkpoints.sql
│   ├── workspace-schema.sql     # Workspace core (legacy)
│   ├── workspace-seed.sql       # Workspace seed data
│   ├── schema.sql               # Core schema
│   ├── seed.sql                 # Core seed
│   └── maintenance.sql          # Políticas de retenção/compressão
│
└── questdb/                      # QuestDB time-series schemas
    └── schemas/langgraph/
        └── langgraph_events.sql
```

### TimescaleDB - Workspace Schema

**Database:** `frontend_apps`  
**Schema:** `workspace`  
**Port:** 5444 (host) / 5432 (container)

**Tabelas:**

**`workspace_items`** (hypertable - particionada por mês)
```sql
id UUID PRIMARY KEY
title TEXT NOT NULL
description TEXT
category TEXT (6 opções)
priority TEXT (low, medium, high, critical)
status TEXT (new, review, in-progress, completed, rejected)
tags TEXT[]
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
created_by TEXT
updated_by TEXT
metadata JSONB
```

**`workspace_audit_log`** (hypertable - particionada por dia)
```sql
id UUID PRIMARY KEY
item_id UUID
action TEXT (created, updated, deleted, status_changed)
old_values JSONB
new_values JSONB
created_at TIMESTAMPTZ
created_by TEXT
```

**Inicialização:**
```bash
# Via script automatizado
cd backend/api/workspace
./scripts/init-database.sh --seed

# Manual
psql postgresql://app_workspace:password@localhost:5444/frontend_apps?schema=workspace \
  -f backend/data/timescaledb/workspace/01_workspace_items.sql
psql postgresql://app_workspace:password@localhost:5444/frontend_apps?schema=workspace \
  -f backend/data/timescaledb/workspace/02_workspace_audit_log.sql
```

---

### TimescaleDB - Documentation Schema

**Database:** `frontend_apps`  
**Schema:** `documentation`  
**Port:** 5444

**Tabelas:**

**`documentation_systems`**
- Registro de sistemas de documentação
- Tracking de status e health
- Métricas de endpoints/channels

**`documentation_ideas`**
- Ideias de melhoria de documentação
- Kanban workflow
- Categorização e priorização

**`documentation_files`**
- Metadata de arquivos anexados
- Binary content (BYTEA)
- Sistema de permissões (is_public)

**`documentation_audit_log`**
- Audit trail completo
- Rastreamento de mudanças
- IP e user tracking

**Inicialização:**
```bash
cd backend/data/timescaledb/documentation
for f in *.sql; do
  psql postgresql://app_documentation:password@localhost:5444/frontend_apps?schema=documentation -f "$f"
done
```

---

### TimescaleDB - LangGraph Schema

**Database:** Específico do LangGraph  
**Schemas:** PostgreSQL checkpoints + QuestDB events

**PostgreSQL:**
- `langgraph_checkpoints.sql` - Checkpoints de workflows

**QuestDB:**
- `langgraph_events.sql` - Eventos time-series

---

### Políticas de Retenção

**Definidas em:** `backend/data/timescaledb/maintenance.sql`

| Tipo | Compressão | Retenção |
|------|------------|----------|
| Signals | 7 dias | 90 dias |
| Executions | 7 dias | 90 dias |
| Metrics | 7 dias | 180 dias |
| Audit Logs | 30 dias | 365 dias |

**Aplicar:**
```bash
psql $DATABASE_URL -f backend/data/timescaledb/maintenance.sql
```

---

### Database Users (Least Privilege)

| User | Schema | Purpose |
|------|--------|---------|
| `frontend_admin` | ALL | Superuser (apenas migrations) |
| `app_workspace` | `workspace` | Workspace API runtime |
| `app_documentation` | `documentation` | Documentation API runtime |

**Configuração (root `.env`):**
```env
# TimescaleDB
FRONTEND_APPS_DB_HOST=localhost
FRONTEND_APPS_DB_PORT=5444
FRONTEND_APPS_DB_NAME=frontend_apps
FRONTEND_APPS_DB_SUPERUSER=frontend_admin
FRONTEND_APPS_DB_SUPERPASS=change_me_frontend

# Per-service users
APP_WORKSPACE_DB_USER=app_workspace
APP_WORKSPACE_DB_PASSWORD=app_workspace_dev_password
APP_DOCUMENTATION_DB_USER=app_documentation
APP_DOCUMENTATION_DB_PASSWORD=app_documentation_dev_password
```

---

## ⚙️ Background Services (backend/services/)

### TimescaleDB Sync

**Localização:** `backend/services/timescaledb-sync/`  
**Linguagem:** Python  
**Tipo:** Worker/Background Service

**Funcionalidades:**
- 🔄 **Replicação de Dados** - QuestDB → TimescaleDB
- ⏱️ **Sync Incremental** - Apenas dados novos
- 📊 **State Management** - Controle via tabela `sync_control`
- 📝 **Logging** - Logs estruturados
- 🔁 **Batch Processing** - Processamento em lotes configuráveis

**Arquivos:**
- `sync.py` - Script principal de sincronização
- `config.py` - Configurações e env vars
- `requirements.txt` - psycopg2, requests, python-dotenv
- `.env.example` - Template de configuração

**Configuração:**
```env
QUESTDB_REST_URL=http://localhost:9000
QUESTDB_QUERY=SELECT * FROM tp_capital_signals WHERE created_at > now() - 24h
TIMESCALEDB_DSN=postgresql://timescale:password@localhost:5433/tradingsystem
TIMESCALEDB_STREAM=tp_capital_signals
TIMESCALEDB_BATCH_SIZE=5000
TIMESCALEDB_SYNC_LOG_LEVEL=INFO
```

**Execução:**
```bash
cd backend/services/timescaledb-sync
pip install -r requirements.txt
python sync.py
```

**Cron Integration:**
```bash
# Executar a cada 5 minutos
*/5 * * * * cd /path/to/backend/services/timescaledb-sync && python sync.py >> /var/log/timescaledb-sync.log 2>&1
```

**Workflow:**
1. Busca último timestamp sincronizado da `sync_control`
2. Query incremental no QuestDB (WHERE created_at > last_synced)
3. Batch insert no TimescaleDB
4. Atualiza `sync_control` com novo timestamp

---

## 🔧 Código Compartilhado (backend/shared/)

### Environment Loaders

**Localização:** `backend/shared/config/`  
**Usado por:** Todas as 4 APIs ativas

**Arquivos:**
- `load-env.js` - ESM loader (import)
- `load-env.cjs` - CommonJS loader (require)

**Funcionalidade:**
Carrega variáveis de ambiente de múltiplos arquivos em ordem hierárquica:

```javascript
1. config/container-images.env
2. config/.env.defaults
3. .env
4. .env.local  (overrides todos)
```

**Como Usar:**
```javascript
// ESM (import)
import '../../../shared/config/load-env.js';

// CommonJS (require)
require('../../../shared/config/load-env.cjs');
```

**Serviços que usam:**
- ✅ workspace-api
- ✅ firecrawl-proxy
- ✅ documentation-api (via wrapper)

**Benefícios:**
- DRY - Sem duplicação de código
- Consistência - Todos carregam .env igual
- Manutenibilidade - Mudança centralizada
- Hierarquia clara - Override bem definido

---

## 🏗️ Padrões de Arquitetura

### Estrutura de Serviço Padrão

```
backend/api/{service}/
├── src/
│   ├── server.js              # Entry point
│   ├── config/ ou config.js   # Configurações
│   ├── routes/                # Express routes
│   ├── controllers/           # Business logic (opcional)
│   ├── services/              # Service layer
│   ├── repositories/          # Data access
│   ├── middleware/            # Express middleware
│   └── utils/                 # Utilities
├── tests/ ou src/__tests__/   # Testes
├── prisma/ (se usar Prisma)   # Schema e migrations
├── scripts/                   # Scripts de setup
├── openapi.yaml               # OpenAPI spec
├── package.json
└── .env.example
```

### Carregamento de Environment

**REGRA CRÍTICA:** Todos os serviços DEVEM carregar .env da raiz do projeto.

```javascript
// CORRETO - Usa shared loader
import '../../../shared/config/load-env.js';

// ERRADO - .env local
dotenv.config(); // ❌ NÃO FAZER
```

**Ver:** `config/ENV-CONFIGURATION-RULES.md` para detalhes completos.

### Logging Padrão

**Biblioteca:** Pino  
**Configuração:** Cada serviço tem seu `logger.js`

```javascript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});
```

### Metrics Padrão

**Biblioteca:** prom-client  
**Endpoint:** `GET /metrics`

**Métricas Comuns:**
```javascript
// HTTP Requests
tradingsystem_http_requests_total{method,route,status}
tradingsystem_http_request_duration_seconds{method,route}

// Database
tradingsystem_db_queries_total{operation,status}
tradingsystem_db_query_duration_seconds{operation}

// Service-specific
{service}_jobs_total
{service}_active_connections
```

### Error Handling Padrão

```javascript
// Middleware de erro
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Async wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

---

## 🧪 Testing

### Por Serviço

```bash
# Documentation API
cd backend/api/documentation-api
npm test

# Workspace API
cd backend/api/workspace
npm test

# Firecrawl Proxy
cd backend/api/firecrawl-proxy
npm test                # Unit tests
npm run test:integration  # Integration tests

```

### Health Checks

```bash
# Todos os serviços
curl http://localhost:3200/health  # Workspace
curl http://localhost:3400/health  # Documentation
curl http://localhost:3600/health  # Firecrawl Proxy

# Script automatizado
bash scripts/maintenance/health-check-all.sh
```

---

## 📊 Monitoramento

### Prometheus Metrics

Todos os serviços expõem `/metrics`:

```bash
# Coletar todas as métricas
curl http://localhost:3200/metrics  # Workspace
curl http://localhost:3400/metrics  # Documentation
curl http://localhost:3600/metrics  # Firecrawl Proxy
```

### Logging Centralizado

Todos usam Pino com formato JSON estruturado:

```bash
# Development (pretty print)
npm run dev

# Production (JSON)
NODE_ENV=production npm start | pino-pretty
```

---

## 🔐 Segurança

### Variáveis de Ambiente

**NUNCA** commitar `.env` files com secrets!

```bash
# .env.defaults (tracked) - Valores padrão
# .env (tracked) - Config sem secrets
# .env.local (gitignored) - Secrets reais
```

### CORS Configuration

```javascript
// Development - Permissivo
app.use(cors({ origin: '*' }));

// Production - Restritivo
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3103'
}));
```

### Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100
});

app.use('/api/', limiter);
```

---

## 🚀 Deployment

### Local Development

```bash
# Start all services
bash scripts/services/start-all.sh

# Start specific stack
bash scripts/startup/start-dashboard-stack.sh
```

### Docker

```bash
# Documentation API
docker compose -f tools/compose/docker-compose.docs.yml up -d docs-api

# TimescaleDB
docker compose -f tools/compose/docker-compose.timescale.yml up -d
```

### Production (Systemd)

Cada serviço pode ter um systemd service:

```ini
[Unit]
Description=Workspace API
After=network.target postgresql.service

[Service]
Type=simple
User=tradingsystem
WorkingDirectory=/home/user/TradingSystem/backend/api/workspace
EnvironmentFile=/home/user/TradingSystem/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## 📦 Criando Novo Serviço

### 1. Estrutura Básica

```bash
mkdir -p backend/api/my-service/src/{routes,services,config}
cd backend/api/my-service
npm init -y
```

### 2. Instalar Dependencies

```bash
npm install express cors dotenv pino pino-http prom-client
npm install --save-dev vitest supertest
```

### 3. Criar server.js

```javascript
import express from 'express';
import cors from 'cors';
import '../../../shared/config/load-env.js';
import { logger } from './config/logger.js';

const app = express();
const PORT = Number(process.env.MY_SERVICE_PORT || 6000);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'my-service' });
});

app.listen(PORT, () => {
  logger.info(`My Service running on port ${PORT}`);
});
```

### 4. Adicionar ao Manifest

Editar `config/services-manifest.json`:

```json
{
  "id": "my-service",
  "type": "backend",
  "path": "backend/api/my-service",
  "port": 6000,
  "start": "npm run dev",
  "build": "npm run build",
  "test": "npm test",
  "workspace": true,
  "managed": "internal"
}
```

### 5. Adicionar Variáveis

No root `.env` e `.env.example`:

```bash
# ==============================================================================
# 🚀 MY SERVICE
# ==============================================================================
MY_SERVICE_PORT=6000
MY_SERVICE_API_KEY=your-api-key-here
```

---

## 🔗 Integrações

### Entre Serviços Backend

```
Documentation API → TimescaleDB (documentation schema)
                 → QuestDB (legacy, migração em progresso)
```

```
Workspace API → TimescaleDB (workspace schema)
```

```
TimescaleDB Sync → QuestDB (read)
                 → TimescaleDB (write)
```

### Com Frontend

```
Dashboard (port 3103) → Workspace API (3200)
                      → Documentation API (3400)
                      → Firecrawl Proxy (3600)
```

---

## 🛠️ Management Tools

### Service Manifest

```bash
# Listar todos os serviços
node scripts/lib/service-manifest.js list

# Info de serviço específico
node scripts/lib/service-manifest.js get workspace-api

# Obter campo específico
node scripts/lib/service-manifest.js get workspace-api --field port
```

### Database Tools

```bash
# pgAdmin
http://localhost:5050

# pgWeb
http://localhost:8081

# psql direto
psql postgresql://app_workspace:password@localhost:5444/frontend_apps?schema=workspace
```

### Diagnósticos

```bash
# Diagnóstico completo
bash scripts/services/diagnose-services.sh

# Health check todos os serviços
bash scripts/maintenance/health-check-all.sh

# Verificar portas
lsof -i :3200  # Workspace
lsof -i :3400  # Documentation
lsof -i :3600  # Firecrawl Proxy
```

---

## 📚 Documentação Relacionada

### Configuração
- **Service Manifest:** [`config/services-manifest.json`](../config/services-manifest.json)
- **Environment Rules:** [`config/ENV-CONFIGURATION-RULES.md`](../config/ENV-CONFIGURATION-RULES.md)
- **Environment Guide:** [`docs/context/ops/ENVIRONMENT-CONFIGURATION.md`](../docs/context/ops/ENVIRONMENT-CONFIGURATION.md)

### Data Layer
- **TimescaleDB Operations:** [`docs/context/backend/data/guides/timescaledb-operations.md`](../docs/context/backend/data/guides/timescaledb-operations.md)
- **Database UI Tools:** [`docs/context/backend/data/guides/database-ui-tools.md`](../docs/context/backend/data/guides/database-ui-tools.md)
- **QuestDB Dual Storage:** [`docs/context/backend/data/operations/questdb-timescaledb-dual-storage.md`](../docs/context/backend/data/operations/questdb-timescaledb-dual-storage.md)

### APIs Específicas
- **Documentation API:** [`docs/context/backend/api/documentation-api/`](../docs/context/backend/api/documentation-api/)
- **Firecrawl Proxy:** [`docs/context/backend/api/firecrawl-proxy.md`](../docs/context/backend/api/firecrawl-proxy.md)

### Guias
- **New Service Template:** [`docs/context/backend/NEW-SERVICE-TEMPLATE.md`](../docs/context/backend/NEW-SERVICE-TEMPLATE.md)
- **Project Structure:** [`docs/DIRECTORY-STRUCTURE.md`](../docs/DIRECTORY-STRUCTURE.md)
- **Buildkit Guide:** [`docs/context/backend/guides/buildkit-guide.md`](../docs/context/backend/guides/buildkit-guide.md)

---

## 🎯 Quick Reference

### Start All Services

```bash
# Via script automatizado
bash scripts/startup/start-dashboard-stack.sh

# Services inclusos:
# - Workspace API (3200)
# - Firecrawl Proxy (3600)
# - Documentation API (Docker 3400)
# + TimescaleDB, QuestDB, Firecrawl core
```

### Stop All Services

```bash
bash scripts/shutdown/stop-dashboard-stack.sh
```

### Individual Service

```bash
# Start
cd backend/api/workspace
npm run dev

# Stop
pkill -f "node.*workspace"
```

### Database Access

```bash
# TimescaleDB - Workspace
psql postgresql://app_workspace:app_workspace_dev_password@localhost:5444/frontend_apps?schema=workspace

# TimescaleDB - Documentation
psql postgresql://app_documentation:app_documentation_dev_password@localhost:5444/frontend_apps?schema=documentation

# QuestDB
curl http://localhost:9002/exec?query=SELECT+*+FROM+tp_capital_signals+LIMIT+10
```

---

## 📊 Service Overview Table

| Service | Port | Type | Database | ORM | Status |
|---------|------|------|----------|-----|--------|
| **Workspace API** | 3200 | REST API | TimescaleDB | Direct SQL | ✅ Production |
| **Documentation API** | 3400 | REST API | TimescaleDB/QuestDB | Prisma | ✅ Production |
| **Firecrawl Proxy** | 3600 | Proxy | - | - | ✅ Production |
| **TimescaleDB Sync** | - | Worker | QuestDB→TimescaleDB | psycopg2 | ✅ Production |

---

## 🔄 Migration Status

### Concluídas
- ✅ Workspace: LowDB → TimescaleDB
- ✅ Schemas consolidados em `backend/data/timescaledb/`

### Em Progresso
- 🔄 Documentation API: QuestDB → TimescaleDB (Prisma setup completo, cutover pendente)

### Planejadas
- 📋 Consolidar loggers em `backend/shared/logging/`
- 📋 Consolidar metrics em `backend/shared/metrics/`
- 📋 Middleware compartilhado em `backend/shared/middleware/`

---

## 🎓 Convenções

### Naming
- **Services:** kebab-case (`workspace-api`, `firecrawl-proxy`)
- **Classes:** PascalCase (`FilesService`, `SystemsRepository`)
- **Functions/variables:** camelCase (`getUserById`, `itemsList`)
- **Database:** snake_case (`workspace_items`, `created_at`)

### Ports
- **3xxx** - Backend APIs
  - 3200 - Workspace
  - 3400 - Documentation
  - 3600 - Firecrawl Proxy
- **5xxx** - Databases
  - 5444 - TimescaleDB
- **9xxx** - QuestDB
  - 9002 - HTTP
  - 8813 - PostgreSQL wire

### Environment Variables

**Prefixo por serviço:**
- `WORKSPACE_*` - Workspace API
- `DOCUMENTATION_*` - Documentation API
- `FIRECRAWL_PROXY_*` - Firecrawl Proxy

**Variáveis comuns:**
- `{SERVICE}_PORT` - Porta do serviço
- `{SERVICE}_LOG_LEVEL` - Nível de log
- `{SERVICE}_DATABASE_URL` - Connection string
- `CORS_ORIGIN` - Origens permitidas (compartilhado)

---

## 💡 Boas Práticas

1. ✅ **Use shared/config/load-env** para carregar environment
2. ✅ **Nunca crie .env local** nas pastas de serviços
3. ✅ **Sempre atualize .env.example** quando adicionar variáveis
4. ✅ **Use least privilege** nos database users
5. ✅ **Implemente health checks** em todos os serviços
6. ✅ **Exponha Prometheus metrics** via `/metrics`
7. ✅ **Valide inputs** com express-validator
8. ✅ **Log estruturado** com Pino
9. ✅ **Handle errors** com middleware centralizado
10. ✅ **Documente OpenAPI spec** para cada API

---

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Encontrar processo
lsof -i :3200

# Matar processo
kill -9 <PID>

# Ou usar script
pkill -f "node.*workspace"
```

### Database Connection Failed

```bash
# Verificar se TimescaleDB está rodando
docker ps | grep timescaledb

# Testar conexão
psql postgresql://app_workspace:app_workspace_dev_password@localhost:5444/frontend_apps -c "SELECT version();"

# Start TimescaleDB
docker compose -f tools/compose/docker-compose.timescale.yml up -d
```

### Service Won't Start

```bash
# Verificar logs
cd backend/api/workspace
npm run dev  # Ver output direto

# Verificar dependencies
npm install

# Verificar .env
cat ../../../../.env | grep WORKSPACE
```

### Metrics Not Showing

```bash
# Testar endpoint
curl http://localhost:3200/metrics

# Verificar Prometheus config
cat tools/monitoring/prometheus/prometheus.yml | grep 3200
```

---

**Última Atualização:** 2025-10-23  
**Arquitetura:** Microservices  
**Linguagem Principal:** Node.js (JavaScript ES modules)  
**Linguagem Secundária:** Python (background services)  
**Databases:** TimescaleDB (primary), QuestDB (hot storage)  
**Total de Serviços:** 5 (4 APIs + 1 worker)  
**Total de Endpoints:** ~80 REST endpoints

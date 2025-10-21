---
title: "Plano de Implementação: Centralização de Variáveis de Ambiente"
sidebar_position: 20
tags: [infrastructure, environment, configuration, docker, devops]
domain: ops
type: guide
summary: Plano completo para centralizar todas as variáveis de ambiente do projeto em um único arquivo .env na raiz
status: active
last_review: 2025-10-17
---

# Plano de Implementação: Centralização de Variáveis de Ambiente

## 📋 Objetivo

Centralizar **todas** as variáveis de ambiente de aplicações, serviços, containers e infraestrutura em um **único arquivo `.env`** na raiz do projeto, organizado por seções para facilitar visualização e manutenção.

## 🎯 Benefícios

1. **Configuração Única**: Um arquivo para todas as configurações
2. **Visibilidade Total**: Todas as variáveis em um só lugar
3. **Facilidade de Deploy**: Copiar um arquivo vs múltiplos
4. **Menos Erros**: Reduz chance de esquecer configurações
5. **Versionamento Claro**: `.env.example` como template único
6. **Onboarding Rápido**: Novos desenvolvedores configuram tudo de uma vez

## 📊 Estado Atual

### Arquivos .env Identificados

| Arquivo | Localização | Serviços | Status |
|---------|-------------|----------|--------|
| `.env.timescaledb` | `infrastructure/compose/` | TimescaleDB, PgAdmin, Backup, Exporter | ⚠️ Múltiplas referências |
| `.env.ai-tools` | `infrastructure/compose/` | LlamaIndex, Qdrant | ⚠️ Múltiplas referências |
| `.env` (monitoring) | `infrastructure/monitoring/` | Prometheus, Grafana, Alertmanager | ❌ Não existe ainda |
| `.env` (APIs) | `backend/api/*/` | Idea Bank, TP Capital, B3, Documentation, Laucher | ❌ Diversos arquivos |
| `.env` (frontend) | `frontend/apps/dashboard/` | Dashboard React | ❌ Não existe ainda |

### Variáveis Mapeadas por Categoria

#### 🗄️ **TimescaleDB & Database**
```bash
TIMESCALEDB_DB=tradingsystem
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=
TIMESCALEDB_PORT=5433
TIMESCALEDB_BACKUP_CRON=0 2 * * *
TIMESCALEDB_EXPORTER_PORT=9187
```

#### 🔧 **PgAdmin**
```bash
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=
PGADMIN_LISTEN_PORT=5050
PGADMIN_HOST_PORT=5050
```

#### 🤖 **AI & ML Tools**
```bash
OPENAI_API_KEY=
QDRANT_API_KEY=
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60
LOG_LEVEL=INFO
LANGGRAPH_ENV=production
```

#### 📊 **Monitoring**
```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=
SLACK_WEBHOOK_URL=
GITHUB_TOKEN=
GITHUB_OWNER=marceloterra
GITHUB_REPO=TradingSystem
```

#### 🌐 **Backend APIs**
```bash
# Idea Bank API
WORKSPACE_PORT=3100
WORKSPACE_LEGACY_DB_PATH=./data/ideas.json

# TP-Capital
TP_CAPITAL_PORT=3200
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# B3
B3_API_PORT=3302
QUESTDB_HTTP_URL=http://localhost:9000
QUESTDB_HTTP_TIMEOUT=10000

# Documentation API
DOCS_API_PORT=3400

# Laucher
SERVICE_LAUNCHER_PORT=3500
```

#### 🎨 **Frontend**
```bash
VITE_API_URL=http://localhost:4010
VITE_WS_URL=ws://localhost:4010
VITE_QUESTDB_URL=http://localhost:9000
VITE_PROMETHEUS_URL=http://localhost:9090
```

#### 🔒 **Security & CORS**
```bash
CORS_ORIGIN=http://localhost:3103,http://localhost:3004
JWT_SECRET_KEY=
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

## 🏗️ Arquitetura da Solução

### Estrutura do .env Centralizado

```
TradingSystem/
├── .env                          # ⭐ ÚNICO arquivo de configuração
├── .env.example                  # Template com valores padrão/placeholders
├── scripts/
│   └── env/
│       ├── validate-env.sh      # Valida variáveis obrigatórias
│       ├── setup-env.sh         # Setup inicial interativo
│       └── sync-env.sh          # Sincroniza para desenvolvimento
└── infrastructure/compose/
    ├── docker-compose.*.yml     # Referenciam ../.env (raiz)
    └── ...
```

### Referência nos Docker Compose

Todos os `docker-compose.yml` referenciam o **mesmo** arquivo:

```yaml
services:
  timescaledb:
    env_file:
      - ../../.env  # Sempre aponta para raiz
    environment:
      POSTGRES_DB: ${TIMESCALEDB_DB}
      POSTGRES_USER: ${TIMESCALEDB_USER}
      POSTGRES_PASSWORD: ${TIMESCALEDB_PASSWORD}
```

## 📝 Plano de Implementação

### Fase 1: Preparação (Dia 1)

#### 1.1 Criar Template `.env.example`

```bash
# TradingSystem - Centralized Environment Configuration
# Copy this file to .env and configure with your values
# SECURITY: Never commit .env with real credentials!

# ==============================================================================
# 🗄️ TIMESCALEDB & DATABASE
# ==============================================================================
TIMESCALEDB_DB=tradingsystem
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
TIMESCALEDB_PORT=5433
TIMESCALEDB_BACKUP_CRON=0 2 * * *
TIMESCALEDB_EXPORTER_PORT=9187

# ==============================================================================
# 🔧 PGADMIN
# ==============================================================================
PGADMIN_DEFAULT_EMAIL=admin@yourdomain.com
PGADMIN_DEFAULT_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
PGADMIN_LISTEN_PORT=5050
PGADMIN_HOST_PORT=5050

# ==============================================================================
# 🤖 AI & ML TOOLS
# ==============================================================================
# OpenAI API Key (REQUIRED for LlamaIndex)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Qdrant (optional for production security)
QDRANT_API_KEY=

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60

# Logging
LOG_LEVEL=INFO

# LangGraph Environment (production|development)
LANGGRAPH_ENV=production

# ==============================================================================
# 📊 MONITORING
# ==============================================================================
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# Alerting Integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_OWNER=marceloterra
GITHUB_REPO=TradingSystem

# ==============================================================================
# 🌐 BACKEND APIs
# ==============================================================================

# --- Idea Bank API ---
WORKSPACE_PORT=3100
WORKSPACE_LEGACY_DB_PATH=./backend/data/runtime/ideas.json

# --- TP-Capital ---
TP_CAPITAL_PORT=3200
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# --- B3 ---
B3_API_PORT=3302
QUESTDB_HTTP_URL=http://localhost:9000
QUESTDB_HTTP_TIMEOUT=10000

# --- Documentation API ---
DOCS_API_PORT=3400

# --- Laucher ---
SERVICE_LAUNCHER_PORT=3500

# ==============================================================================
# 🎨 FRONTEND
# ==============================================================================
VITE_API_URL=http://localhost:4010
VITE_WS_URL=ws://localhost:4010
VITE_QUESTDB_URL=http://localhost:9000
VITE_PROMETHEUS_URL=http://localhost:9090

# ==============================================================================
# 🔒 SECURITY & CORS
# ==============================================================================
CORS_ORIGIN=http://localhost:3103,http://localhost:3004
JWT_SECRET_KEY=CHANGE_ME_GENERATE_WITH_openssl_rand_-hex_32
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120

# ==============================================================================
# 🔐 SECURITY NOTES
# ==============================================================================
# 1. Generate strong passwords: openssl rand -base64 32
# 2. Generate JWT secrets: openssl rand -hex 32
# 3. Never commit .env file (already in .gitignore)
# 4. Rotate secrets regularly in production
# 5. Use Docker secrets or Vault for production deployments
```

#### 1.2 Criar Script de Validação

**`scripts/env/validate-env.sh`**:

```bash
#!/bin/bash
# Validate required environment variables

set -e

ENV_FILE=".env"
REQUIRED_VARS=(
    "TIMESCALEDB_PASSWORD"
    "PGADMIN_DEFAULT_PASSWORD"
    "OPENAI_API_KEY"
    "GRAFANA_ADMIN_PASSWORD"
    "JWT_SECRET_KEY"
)

echo "🔍 Validating environment variables..."

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR: .env file not found!"
    echo "📝 Copy .env.example to .env and configure it:"
    echo "   cp .env.example .env"
    exit 1
fi

# Source the .env file
export $(grep -v '^#' .env | xargs)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" == "CHANGE_ME"* ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo "✅ All required variables are set!"
    exit 0
else
    echo "❌ ERROR: Missing or invalid required variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "📝 Configure these variables in .env file"
    exit 1
fi
```

#### 1.3 Criar Script de Setup Interativo

**`scripts/env/setup-env.sh`**:

```bash
#!/bin/bash
# Interactive environment setup

set -e

echo "🚀 TradingSystem - Environment Setup"
echo "===================================="
echo ""

if [ -f ".env" ]; then
    read -p "⚠️  .env already exists. Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Copy template
cp .env.example .env
echo "✅ Created .env from template"

# Generate secure passwords
echo ""
echo "🔐 Generating secure passwords..."

TIMESCALEDB_PASS=$(openssl rand -base64 32)
PGADMIN_PASS=$(openssl rand -base64 32)
GRAFANA_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 32)

# Replace placeholders
sed -i "s/TIMESCALEDB_PASSWORD=.*/TIMESCALEDB_PASSWORD=$TIMESCALEDB_PASS/" .env
sed -i "s/PGADMIN_DEFAULT_PASSWORD=.*/PGADMIN_DEFAULT_PASSWORD=$PGADMIN_PASS/" .env
sed -i "s/GRAFANA_ADMIN_PASSWORD=.*/GRAFANA_ADMIN_PASSWORD=$GRAFANA_PASS/" .env
sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$JWT_SECRET/" .env

echo "✅ Generated and set secure passwords"

# Prompt for OpenAI API key
echo ""
read -p "🤖 Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
    sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_KEY/" .env
    echo "✅ OpenAI API key configured"
fi

# Prompt for email
echo ""
read -p "📧 Enter admin email for PgAdmin: " ADMIN_EMAIL
if [ -n "$ADMIN_EMAIL" ]; then
    sed -i "s/PGADMIN_DEFAULT_EMAIL=.*/PGADMIN_DEFAULT_EMAIL=$ADMIN_EMAIL/" .env
    echo "✅ Admin email configured"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Generated Credentials:"
echo "========================"
echo "TimescaleDB Password: $TIMESCALEDB_PASS"
echo "PgAdmin Password:     $PGADMIN_PASS"
echo "Grafana Password:     $GRAFANA_PASS"
echo ""
echo "⚠️  SAVE THESE CREDENTIALS IN A SECURE LOCATION!"
echo ""
echo "📝 Next steps:"
echo "1. Review and customize .env file"
echo "2. Run: bash scripts/env/validate-env.sh"
echo "3. Start services: bash scripts/docker/start-stacks.sh"
```

### Fase 2: Atualização dos Compose Files (Dia 1-2)

#### 2.1 Atualizar docker-compose.timescale.yml

```yaml
version: '3.8'

services:
  timescaledb:
    container_name: data-timescaledb
    image: timescale/timescaledb:2.15.2-pg15
    restart: unless-stopped
    # CHANGE: Reference root .env instead of local file
    env_file:
      - ../../.env
    environment:
      POSTGRES_DB: ${TIMESCALEDB_DB}
      POSTGRES_USER: ${TIMESCALEDB_USER}
      POSTGRES_PASSWORD: ${TIMESCALEDB_PASSWORD}
      TIMESCALEDB_TELEMETRY: 'off'
    # ... resto da configuração
```

#### 2.2 Atualizar docker-compose.infra.yml

```yaml
version: '3.8'

services:
  llamaindex-ingestion:
    # ... build config
    # CHANGE: Reference root .env instead of local file
    env_file:
      - ../../.env
    environment:
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    # ... resto da configuração
```

#### 2.3 Atualizar docker-compose.monitoring.yml

```yaml
version: '3.8'

services:
  grafana:
    # ... image config
    # ADD: Reference root .env
    env_file:
      - ../.env
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    # ... resto da configuração
```

### Fase 3: Atualização dos Serviços Backend (Dia 2-3)

#### 3.1 Atualizar APIs Node.js

Cada API deve carregar variáveis de um `.env` na raiz ou via variáveis de ambiente:

**`backend/api/idea-bank/src/config.js`**:

```javascript
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
const projectRoot = path.resolve(__dirname, '../../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

export default {
  port: process.env.WORKSPACE_PORT || 3100,
  dbPath: process.env.WORKSPACE_LEGACY_DB_PATH || './data/ideas.json',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3103',
  // ... outras configs
};
```

#### 3.2 Atualizar Frontend

**`frontend/apps/dashboard/.env`** → Remover, usar raiz

**`frontend/apps/dashboard/vite.config.ts`**:

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env from project root
  const env = loadEnv(mode, path.resolve(__dirname, '../../..'), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3103,
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'process.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL),
      // ... outras variáveis
    },
  };
});
```

### Fase 4: Documentação e CI/CD (Dia 3)

#### 4.1 Atualizar .gitignore

```gitignore
# Environment Files
.env
.env.local
.env.*.local

# Keep only the template
!.env.example
```

#### 4.2 Criar Documentação

**`docs/context/ops/ENVIRONMENT-CONFIGURATION.md`**:

```markdown
# Environment Configuration Guide

## Quick Start

1. Copy template:
   ```bash
   cp .env.example .env
   ```

2. Run interactive setup:
   ```bash
   bash scripts/env/setup-env.sh
   ```

3. Validate configuration:
   ```bash
   bash scripts/env/validate-env.sh
   ```

4. Start services:
   ```bash
   bash scripts/docker/start-stacks.sh
   ```

## Manual Configuration

Edit `.env` file in project root with your values...
```

#### 4.3 Atualizar CI/CD

**`.github/workflows/validate-env.yml`**:

```yaml
name: Validate Environment

on:
  pull_request:
    paths:
      - '.env.example'
      - 'scripts/env/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check .env.example exists
        run: test -f .env.example
      
      - name: Validate template
        run: |
          cp .env.example .env
          # Set dummy values for required vars
          sed -i 's/CHANGE_ME.*/test_value/g' .env
          bash scripts/env/validate-env.sh
```

### Fase 5: Migração (Dia 4)

#### 5.1 Script de Migração

**`scripts/env/migrate-env.sh`**:

```bash
#!/bin/bash
# Migrate existing .env files to centralized .env

set -e

echo "🔄 Migrating environment files to centralized .env..."

# Backup existing .env if exists
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "📦 Backed up existing .env"
fi

# Start from template
cp .env.example .env

# Merge from infrastructure/compose/.env.timescaledb if exists
if [ -f "infrastructure/compose/.env.timescaledb" ]; then
    echo "📥 Merging TimescaleDB variables..."
    # Extract and merge variables
    grep -E "^TIMESCALEDB_|^PGADMIN_" infrastructure/compose/.env.timescaledb >> .env.tmp || true
fi

# Merge from infrastructure/compose/.env.ai-tools if exists
if [ -f "infrastructure/compose/.env.ai-tools" ]; then
    echo "📥 Merging AI Tools variables..."
    grep -E "^OPENAI_|^QDRANT_|^RATE_LIMIT_|^LOG_LEVEL" infrastructure/compose/.env.ai-tools >> .env.tmp || true
fi

# Deduplicate and merge
if [ -f ".env.tmp" ]; then
    sort -u .env.tmp > .env.merged
    # Merge with .env
    cat .env.merged >> .env
    rm .env.tmp .env.merged
fi

echo "✅ Migration complete!"
echo "📝 Review .env file and adjust as needed"
echo "🗑️  Old .env files can be removed from infrastructure/compose/"
```

## 📋 Checklist de Implementação

### Preparação
- [ ] Criar `.env.example` completo com todas as seções
- [ ] Criar `scripts/env/validate-env.sh`
- [ ] Criar `scripts/env/setup-env.sh`
- [ ] Criar `scripts/env/migrate-env.sh`
- [ ] Atualizar `.gitignore`

### Atualização de Compose Files
- [ ] `infrastructure/compose/docker-compose.infra.yml`
- [ ] `infrastructure/compose/docker-compose.data.yml`
- [ ] `infrastructure/compose/docker-compose.timescale.yml`
- [ ] `infrastructure/compose/docker-compose.infra.yml`
- [ ] `infrastructure/monitoring/docker-compose.yml`
- [ ] `frontend/compose/docker-compose.frontend.yml`

### Atualização de Serviços
- [ ] `backend/api/idea-bank/` - Carregar .env da raiz
- [ ] `frontend/apps/tp-capital/` - Carregar .env da raiz
- [ ] `frontend/apps/b3-market-data/` - Carregar .env da raiz
- [ ] `backend/api/documentation-api/` - Carregar .env da raiz
- [ ] `frontend/apps/service-launcher/` - Carregar .env da raiz
- [ ] `frontend/apps/dashboard/` - Vite config para carregar da raiz

### Documentação
- [ ] Criar `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`
- [ ] Atualizar `infrastructure/README.md`
- [ ] Atualizar `README.md` principal
- [ ] Atualizar `CLAUDE.md` com novo processo

### CI/CD
- [ ] Criar `.github/workflows/validate-env.yml`
- [ ] Atualizar workflows existentes para usar .env.example

### Testes
- [ ] Testar setup-env.sh em ambiente limpo
- [ ] Testar validate-env.sh com .env válido/inválido
- [ ] Testar cada stack com novo .env centralizado
- [ ] Testar migração de .env existentes

## 🚨 Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Perda de configurações existentes | Alto | Script de migração + backup automático |
| Quebra de serviços durante migração | Médio | Migração por fases, testes em cada etapa |
| Conflito de variáveis entre serviços | Baixo | Namespacing de variáveis por serviço |
| .env muito grande | Baixo | Organização por seções, comentários claros |

## 📊 Cronograma

| Fase | Duração | Entregas |
|------|---------|----------|
| 1. Preparação | 1 dia | Templates, scripts básicos |
| 2. Compose Files | 1 dia | Todos compose files atualizados |
| 3. Serviços Backend/Frontend | 1 dia | Todos serviços carregando .env raiz |
| 4. Documentação & CI | 1 dia | Docs completas, CI configurado |
| 5. Migração & Testes | 1 dia | Migração testada, rollback plan |

**Total: 5 dias úteis**

## 🎯 Critérios de Sucesso

1. ✅ Existe apenas UM arquivo `.env` na raiz do projeto
2. ✅ `.env.example` contém TODAS as variáveis necessárias
3. ✅ Scripts de validação/setup funcionam corretamente
4. ✅ TODOS os compose files referenciam `.env` da raiz
5. ✅ TODAS as APIs carregam variáveis do `.env` raiz
6. ✅ Frontend carrega variáveis do `.env` raiz
7. ✅ Documentação completa e atualizada
8. ✅ CI valida `.env.example` em PRs
9. ✅ Nenhum arquivo `.env.*.local` commitado

## 📝 Notas de Desenvolvimento

### Padrão de Carregamento para Node.js

```javascript
import dotenv from 'dotenv';
import path from 'path';

// Find project root (where .env is)
const projectRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });
```

### Padrão de Carregamento para Vite (Frontend)

```javascript
import { loadEnv } from 'vite';
const env = loadEnv(mode, path.resolve(__dirname, '../../..'), '');
```

### Padrão para Docker Compose

```yaml
env_file:
  - ../../.env  # Caminho relativo para raiz
```

## 🔗 Referências

- [Twelve-Factor App - Config](https://12factor.net/config)
- [Docker Compose Environment Files](https://docs.docker.com/compose/environment-variables/)
- [Node.js dotenv Best Practices](https://github.com/motdotla/dotenv#readme)

---

**Status**: 🟡 Draft - Aguardando Aprovação  
**Responsável**: DevOps Team  
**Revisores**: @marceloterra


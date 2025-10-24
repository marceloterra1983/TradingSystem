---
title: Environment Configuration Guide
sidebar_position: 10
tags: [environment, configuration, setup, docker, devops]
domain: ops
type: guide
summary: Complete guide for configuring TradingSystem environment variables
status: active
last_review: "2025-10-17"
---

# Environment Configuration Guide

## 📋 Overview

TradingSystem uses a **centralized environment configuration** with all variables stored in a single `.env` file at the project root. This approach simplifies configuration, reduces errors, and makes deployment easier.

## 🚀 Quick Start

### Option 1: Interactive Setup (Recommended)

```bash
# Run interactive setup wizard
bash scripts/env/setup-env.sh
```

This will:
- ✅ Create `.env` from template
- ✅ Generate secure passwords automatically
- ✅ Prompt for required values (OpenAI API key, email, etc.)
- ✅ Set secure file permissions (chmod 600)

### Option 2: Manual Setup

```bash
# 1. Copy template
cp .env.example .env

# 2. Edit with your values
nano .env

# 3. Validate configuration
bash scripts/env/validate-env.sh
```

### Option 3: Migrate Existing .env Files

If you have existing `.env` files scattered across the project:

```bash
# Consolidate all .env files into root .env
bash scripts/env/migrate-env.sh
```

## 📂 File Structure

```
TradingSystem/
├── .env                          # ⭐ Single source of truth (DO NOT COMMIT)
├── .env.example                  # Template with placeholders (commit this)
└── scripts/env/
    ├── setup-env.sh             # Interactive setup
    ├── validate-env.sh          # Validation
    └── migrate-env.sh           # Migration from old files
```

## 🔐 Required Variables

These variables **MUST** be configured before starting services:

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `TIMESCALEDB_PASSWORD` | Database password | `openssl rand -base64 32` |
| `PGADMIN_DEFAULT_PASSWORD` | PgAdmin UI password | `openssl rand -base64 32` |
| `GRAFANA_ADMIN_PASSWORD` | Grafana UI password | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | OpenAI API key for LlamaIndex | Get from https://platform.openai.com/api-keys |
| `JWT_SECRET_KEY` | JWT signing secret | `openssl rand -hex 32` |

## 📊 Variable Categories

### 🗄️ Database (TimescaleDB)

```bash
TIMESCALEDB_DB=tradingsystem
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=your_secure_password_here
TIMESCALEDB_PORT=5433
TIMESCALEDB_BACKUP_CRON=0 2 * * *
TIMESCALEDB_EXPORTER_PORT=9187
```

**Services using these**: `docker-compose.timescale.yml`

### 🔧 PgAdmin

```bash
PGADMIN_DEFAULT_EMAIL=admin@yourdomain.com
PGADMIN_DEFAULT_PASSWORD=your_secure_password_here
PGADMIN_LISTEN_PORT=5050
PGADMIN_HOST_PORT=5050
```

**Access**: http://localhost:5050 (bound to localhost for security)

### 🤖 AI & ML Tools

```bash
# Required for LlamaIndex
OPENAI_API_KEY=sk-your-api-key-here

# Optional (production security)
QDRANT_API_KEY=

# Configuration
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60
LOG_LEVEL=INFO
LANGGRAPH_ENV=production
```

**Services using these**: `docker-compose.infra.yml`

### 📊 Monitoring

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_secure_password_here

# Alerting (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=marceloterra
GITHUB_REPO=TradingSystem
```

**Services using these**: `monitoring/docker-compose.yml`

### 🌐 Backend APIs

```bash
# Workspace API
WORKSPACE_PORT=3200
WORKSPACE_TABLE_NAME=workspace_items

# TP-Capital
TP_CAPITAL_PORT=3200
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# B3
B3_API_PORT=3302
QUESTDB_HTTP_URL=http://localhost:9000

# Documentation API
DOCS_API_PORT=3400

# Laucher
SERVICE_LAUNCHER_PORT=3500
```

### 🎨 Frontend

```bash
VITE_API_URL=http://localhost:4010
VITE_WS_URL=ws://localhost:4010
VITE_QUESTDB_URL=http://localhost:9000
VITE_PROMETHEUS_URL=http://localhost:9090
```

The React/Vite dashboard automatically loads these variables from the root `.env`. Additional **optional overrides** let you point the development proxy at alternate domains or non-standard ports while keeping production defaults intact. If not defined, each value falls back to its internal default (e.g. `http://localhost:<port>`).

| Variable | Purpose | Default fallback |
| --- | --- | --- |
| `VITE_DASHBOARD_PORT` | Custom dev server port for `npm run dev` | `3103` |
| `VITE_WORKSPACE_PROXY_TARGET` | Override Workspace API proxy target | `http://localhost:3102/api` |
| `VITE_TP_CAPITAL_PROXY_TARGET` | Override TP Capital proxy target | `http://localhost:3200` |
| `VITE_B3_PROXY_TARGET` | Override B3 proxy target | `http://localhost:3302` |
| `VITE_DOCUMENTATION_PROXY_TARGET` | Override Documentation API proxy target | `http://localhost:3400` |
| `VITE_SERVICE_LAUNCHER_PROXY_TARGET` | Override Service Launcher proxy target | `http://localhost:3500` |
| `VITE_FIRECRAWL_PROXY_TARGET` | Override Firecrawl proxy target | `http://localhost:3600` |
| `VITE_WEBSCRAPER_PROXY_TARGET` | Override Webscraper API proxy target | `http://localhost:3700/api/v1` |
| `VITE_DOCUSAURUS_PROXY_TARGET` | Override Docs Hub proxy target (supports subpaths) | `http://localhost:3004` |
| `VITE_MCP_PROXY_TARGET` | Override local MCP server proxy target | `http://localhost:3847` |

> ℹ️ **Usage example**
>
> To point the dashboard at a containerized API gateway running on another host, set:
> ```bash
> VITE_WORKSPACE_PROXY_TARGET=http://tradingsystem.local/workspace
> VITE_TP_CAPITAL_PROXY_TARGET=http://tradingsystem.local/tp-capital
> ```
> The Vite dev server rewrites `/api/library/*` requests to the configured target while keeping local components unchanged.

### 🔒 Security

```bash
CORS_ORIGIN=http://localhost:3103,http://localhost:3004
JWT_SECRET_KEY=your_jwt_secret_here
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

## 🛠️ Scripts Reference

### validate-env.sh

Validates that all required variables are properly configured.

```bash
bash scripts/env/validate-env.sh
```

**Output**:
- ✅ Success if all required variables are set
- ❌ Error with list of missing/placeholder variables
- ⚠️ Warning for optional variables not configured

**Exit codes**:
- `0` - All required variables valid
- `1` - Missing or invalid required variables

### setup-env.sh

Interactive setup wizard for creating `.env` file.

```bash
bash scripts/env/setup-env.sh
```

**Features**:
- Generates secure passwords automatically
- Prompts for user-specific values
- Creates backup of existing `.env`
- Sets secure file permissions
- Displays generated credentials (save these!)

### migrate-env.sh

Migrates existing `.env` files into centralized `.env`.

```bash
bash scripts/env/migrate-env.sh
```

**Process**:
1. Searches for existing `.env` files
2. Extracts variables from each file
3. Merges into root `.env`
4. Reports what was migrated
5. Lists old files that can be removed

## 🔍 Validation

Before starting services, always validate your configuration:

```bash
# Validate .env file
bash scripts/env/validate-env.sh

# Test Docker Compose configuration
docker compose -f tools/compose/docker-compose.timescale.yml config
docker compose -f tools/compose/docker-compose.infra.yml config
docker compose -f tools/monitoring/docker-compose.yml config
```

## 🚨 Security Best Practices

### 1. File Permissions

```bash
# .env should be readable only by owner
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (600)
```

### 2. Never Commit .env

The `.env` file is in `.gitignore` and should **NEVER** be committed:

```bash
# Verify .env is ignored
git status
# .env should NOT appear in untracked files
```

### 3. Generate Strong Secrets

```bash
# Password (32 characters)
openssl rand -base64 32

# JWT Secret (64 hex characters)
openssl rand -hex 32

# API Key (32 hex characters)
openssl rand -hex 16
```

### 4. Rotate Secrets Regularly

In production, implement a secret rotation schedule:
- Passwords: Every 90 days
- API keys: Every 180 days
- JWT secrets: Every 365 days

### 5. Use Docker Secrets in Production

For production deployments, consider using Docker secrets:

```bash
# Create secret
echo "my_secure_password" | docker secret create db_password -

# Reference in compose
secrets:
  db_password:
    external: true
```

## 🔄 Workflow Examples

### New Developer Onboarding

```bash
# 1. Clone repository
git clone <repo-url>
cd TradingSystem

# 2. Run interactive setup
bash scripts/env/setup-env.sh

# 3. Validate configuration
bash scripts/env/validate-env.sh

# 4. Start services
bash scripts/docker/start-stacks.sh
```

### Migrating from Old Configuration

```bash
# 1. Backup current setup
cp .env .env.backup.manual

# 2. Run migration
bash scripts/env/migrate-env.sh

# 3. Validate
bash scripts/env/validate-env.sh

# 4. Test services
docker compose -f tools/compose/docker-compose.timescale.yml up -d

# 5. If successful, remove old files
rm tools/compose/.env.timescaledb
rm tools/compose/.env.ai-tools
```

### Production Deployment

```bash
# 1. Create .env from template on production server
cp .env.example .env

# 2. Configure production values
nano .env
# Set strong passwords, production URLs, etc.

# 3. Validate
bash scripts/env/validate-env.sh

# 4. Set strict permissions
chmod 600 .env
chown root:root .env  # If running as root

# 5. Deploy services
docker compose -f tools/compose/docker-compose.timescale.yml up -d
```

## 🐛 Troubleshooting

### Variable Not Found

**Problem**: Service can't find environment variable

**Solution**:
1. Check if variable exists in `.env`: `grep VARIABLE_NAME .env`
2. Verify compose file references root `.env`: Look for `env_file: - ../../.env`
3. Restart the service: `docker compose restart service_name`

### Permission Denied

**Problem**: Can't read `.env` file

**Solution**:
```bash
# Fix permissions
chmod 600 .env

# Ensure you own the file
sudo chown $USER:$USER .env
```

### Validation Fails

**Problem**: `validate-env.sh` reports missing variables

**Solution**:
```bash
# Run setup to generate missing values
bash scripts/env/setup-env.sh

# Or manually edit .env
nano .env
```

### Docker Compose Can't Find .env

**Problem**: Compose can't load environment file

**Solution**:
```bash
# Check path in compose file (should be relative to compose file location)
# tools/compose/docker-compose.*.yml should use: ../../.env
# tools/monitoring/docker-compose.yml should use: ../.env

# Test configuration
docker compose -f path/to/compose.yml config
```

## 📚 Additional Resources

- **Implementation Plan**: `docs/context/ops/tools/CENTRALIZED-ENV-IMPLEMENTATION-PLAN.md`
- **Infrastructure README**: `tools/README.md`
- **Security Guide**: `tools/README.md#security`
- **Docker Compose Files**: `tools/compose/`

## ✅ Checklist

Before deploying to production, verify:

- [ ] `.env` file created from `.env.example`
- [ ] All required variables configured (no CHANGE_ME values)
- [ ] Strong passwords generated (32+ characters)
- [ ] OpenAI API key configured (if using AI features)
- [ ] CORS origins set to production domains
- [ ] File permissions set to 600
- [ ] `.env` confirmed in `.gitignore`
- [ ] Configuration validated (`validate-env.sh` passes)
- [ ] All compose files tested (`docker compose config`)
- [ ] Secrets documented in secure location (password manager)
- [ ] Backup of `.env` stored securely

---

**Last Updated**: 2025-10-15  
**Maintained By**: DevOps Team  
**Questions?** See `docs/context/ops/tools/CENTRALIZED-ENV-IMPLEMENTATION-PLAN.md`

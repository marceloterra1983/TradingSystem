# Environment Variables Template

Este arquivo contém o template completo de variáveis de ambiente para o TradingSystem.

**Para usar:**
1. Copie o conteúdo abaixo para um arquivo `.env` na raiz do projeto
2. Substitua todos os valores `<YOUR_*>` pelos valores reais
3. NUNCA versione o arquivo `.env` real

---

```bash
# =============================================================================
# TradingSystem - Environment Variables Template
# =============================================================================
# 
# INSTRUÇÕES:
# 1. Copie este conteúdo para a raiz do projeto como '.env'
# 2. Substitua valores PLACEHOLDER pelos valores reais
# 3. NUNCA versione o arquivo '.env' real (apenas templates)
# 4. Consulte docs/content/tools/security-config/env.mdx para detalhes
#
# CONVENÇÃO DE NOMES: {SERVICO}__{SECAO}__{CHAVE}
# - APP__*           → Configurações globais
# - ORDERMANAGER__*  → OrderManager (C# nativo Windows)
# - DATACAPTURE__*   → DataCapture (C# nativo Windows)
# - WORKSPACE__*     → WorkspaceAPI (Node.js Docker)
# - TPCAPITAL__*     → TP Capital (Node.js Docker)
# - DOCUMENTATION__* → Documentation API (Node.js Docker)
# - VITE__*          → Frontend Dashboard (build-time)
#
# SEGURANÇA:
# - Rotacionar segredos a cada 90-180 dias (ver governance/controls/secrets-rotation-sop.md)
# - Mascarar valores sensíveis em logs
# - Usar SOPS/age para secrets versionados criptografados
#
# =============================================================================

# -----------------------------------------------------------------------------
# 🌍 GLOBAL APPLICATION SETTINGS
# -----------------------------------------------------------------------------

# Environment: development | staging | production
APP_ENV=development

# Log level: debug | info | warn | error
APP_LOG_LEVEL=info

# Locale
APP_LOCALE=pt-BR

# Timezone (default: America/Sao_Paulo)
APP_TIMEZONE=America/Sao_Paulo

# -----------------------------------------------------------------------------
# 🏦 DATABASE - TimescaleDB (Primary)
# -----------------------------------------------------------------------------

# Primary database connection (PostgreSQL-compatible)
# Format: postgresql://user:password@host:port/database
DB__PRIMARY__URL=postgresql://workspace_user:<YOUR_DB_PASSWORD>@localhost:5432/workspace

# Connection pool size
DB__PRIMARY__POOL_SIZE=20

# Max connection lifetime (ms)
DB__PRIMARY__MAX_LIFETIME=1800000

# Connection timeout (ms)
DB__PRIMARY__CONNECT_TIMEOUT=5000

# SSL mode: disable | require | verify-ca | verify-full
DB__PRIMARY__SSL_MODE=disable

# -----------------------------------------------------------------------------
# 📊 DATABASE - QuestDB (Time-Series)
# -----------------------------------------------------------------------------

# QuestDB HTTP API
QUESTDB__HTTP__URL=http://localhost:9000

# QuestDB PostgreSQL wire protocol
QUESTDB__PG__URL=postgresql://admin:quest@localhost:8812/qdb

# InfluxDB line protocol (port 9009)
QUESTDB__ILP__HOST=localhost
QUESTDB__ILP__PORT=9009

# -----------------------------------------------------------------------------
# 💾 DATABASE - LowDB (Local JSON Store)
# -----------------------------------------------------------------------------

# LowDB file path (relative to project root)
LOWDB__FILE_PATH=./data/local/db.json

# Auto-save interval (ms)
LOWDB__AUTO_SAVE_INTERVAL=5000

# -----------------------------------------------------------------------------
# 📈 ORDER MANAGER SERVICE (C# - Windows Native)
# -----------------------------------------------------------------------------

# ProfitDLL Authentication (Nelogica)
ORDERMANAGER__PROFITDLL__ACTIVATION_KEY=<YOUR_ACTIVATION_KEY>
ORDERMANAGER__PROFITDLL__USERNAME=<YOUR_USERNAME>
ORDERMANAGER__PROFITDLL__PASSWORD=<YOUR_PASSWORD>

# ProfitDLL Connection
ORDERMANAGER__PROFITDLL__SERVER=hcm38.nelogica.com.br
ORDERMANAGER__PROFITDLL__PORT=443

# Risk Management
ORDERMANAGER__RISK__DAILY_LOSS_LIMIT=5000.00
ORDERMANAGER__RISK__MAX_POSITION_SIZE=100
ORDERMANAGER__RISK__KILL_SWITCH=false

# Trading Hours (BRT)
ORDERMANAGER__TRADING__START_TIME=09:00
ORDERMANAGER__TRADING__END_TIME=18:00

# WebSocket Publisher (internal)
ORDERMANAGER__WS__PORT=9001
ORDERMANAGER__WS__MAX_BUFFER_SIZE=10000

# -----------------------------------------------------------------------------
# 📡 DATA CAPTURE SERVICE (C# - Windows Native)
# -----------------------------------------------------------------------------

# ProfitDLL Market Data (read-only login)
DATACAPTURE__PROFITDLL__ACTIVATION_KEY=<YOUR_ACTIVATION_KEY>
DATACAPTURE__PROFITDLL__USERNAME=<YOUR_USERNAME_MARKET>
DATACAPTURE__PROFITDLL__PASSWORD=<YOUR_PASSWORD_MARKET>

# Data Storage
DATACAPTURE__STORAGE__PARQUET__PATH=./data/parquet
DATACAPTURE__STORAGE__LOGS__PATH=./data/logs

# Subscription Symbols (comma-separated)
DATACAPTURE__SYMBOLS__FUTURES=WINZ25,WDOZ25
DATACAPTURE__SYMBOLS__STOCKS=PETR4,VALE3,ITUB4

# Buffer Settings
DATACAPTURE__BUFFER__MAX_SIZE=50000
DATACAPTURE__BUFFER__FLUSH_INTERVAL_MS=10000

# -----------------------------------------------------------------------------
# 🖥️ WORKSPACE API (Node.js - Docker)
# -----------------------------------------------------------------------------

# API Server
WORKSPACE__API__PORT=3200
WORKSPACE__API__HOST=0.0.0.0

# Database (references DB__PRIMARY__URL)
WORKSPACE__DB__PRIMARY__URL=${DB__PRIMARY__URL}
WORKSPACE__DB__PRIMARY__POOL_SIZE=20

# Authentication
WORKSPACE__AUTH__JWT_SECRET=<YOUR_JWT_SECRET_MIN_32_CHARS>
WORKSPACE__AUTH__JWT_EXPIRATION=1h

# CORS Origins (comma-separated)
WORKSPACE__CORS__ORIGINS=http://localhost:3103,http://localhost:3205

# Rate Limiting
WORKSPACE__RATE_LIMIT__WINDOW_MS=60000
WORKSPACE__RATE_LIMIT__MAX_REQUESTS=100

# -----------------------------------------------------------------------------
# 📱 TP CAPITAL SERVICE (Node.js - Docker)
# -----------------------------------------------------------------------------

# API Server
TPCAPITAL__API__PORT=4005
TPCAPITAL__API__HOST=0.0.0.0

# Telegram Bot Integration
TPCAPITAL__TELEGRAM__BOT_TOKEN=<YOUR_TELEGRAM_BOT_TOKEN>
TPCAPITAL__TELEGRAM__WEBHOOK_URL=https://yourdomain.com/webhook/telegram

# Allowed Chat IDs (comma-separated)
TPCAPITAL__TELEGRAM__ALLOWED_CHATS=<CHAT_ID_1>,<CHAT_ID_2>

# InfluxDB/Telegraf Output
TPCAPITAL__INFLUX__URL=http://localhost:8086
TPCAPITAL__INFLUX__TOKEN=<YOUR_INFLUX_TOKEN>
TPCAPITAL__INFLUX__ORG=trading
TPCAPITAL__INFLUX__BUCKET=tp-capital

# -----------------------------------------------------------------------------
# 📚 DOCUMENTATION API (Node.js - Docker)
# -----------------------------------------------------------------------------

# API Server
DOCUMENTATION__API__PORT=3401
DOCUMENTATION__API__HOST=0.0.0.0

# Search Engine (FlexSearch)
DOCUMENTATION__SEARCH__INDEX_PATH=./data/search-index
DOCUMENTATION__SEARCH__LANGUAGE=pt

# RAG Integration (LlamaIndex)
DOCUMENTATION__RAG__ENABLED=true
DOCUMENTATION__RAG__ENDPOINT=http://localhost:8202
DOCUMENTATION__RAG__JWT_SECRET=<YOUR_RAG_JWT_SECRET>
DOCUMENTATION__RAG__TIMEOUT_MS=30000

# -----------------------------------------------------------------------------
# 🚀 SERVICE LAUNCHER (Node.js - Local)
# -----------------------------------------------------------------------------

# API Server
SERVICE_LAUNCHER__API__PORT=3500
SERVICE_LAUNCHER__API__HOST=localhost

# Health Check Settings
SERVICE_LAUNCHER__HEALTH__CACHE_TTL_MS=30000
SERVICE_LAUNCHER__HEALTH__TIMEOUT_MS=5000

# -----------------------------------------------------------------------------
# 🌐 FRONTEND DASHBOARD (React + Vite)
# -----------------------------------------------------------------------------

# Build-time variables (prefix VITE__)
# Note: Exposed to browser, NEVER include secrets!

# API Endpoints
VITE__API__WORKSPACE__URL=http://localhost:3200
VITE__API__DOCUMENTATION__URL=http://localhost:3401
VITE__API__TPCAPITAL__URL=http://localhost:4005
VITE__API__SERVICE_LAUNCHER__URL=http://localhost:3500

# Feature Flags
VITE__FEATURES__RAG_ENABLED=true
VITE__FEATURES__DARK_MODE=true
VITE__FEATURES__I18N_ENABLED=false

# Unified Domain Mode (reverse proxy)
VITE__USE_UNIFIED_DOMAIN=false

# Analytics (optional)
VITE__ANALYTICS__ENABLED=false
VITE__ANALYTICS__TRACKING_ID=<YOUR_GA_TRACKING_ID>

# -----------------------------------------------------------------------------
# 🔐 EXTERNAL INTEGRATIONS
# -----------------------------------------------------------------------------

# Telegram Gateway
TELEGRAM__BOT_TOKEN=<YOUR_TELEGRAM_BOT_TOKEN>
TELEGRAM__WEBHOOK_SECRET=<YOUR_WEBHOOK_SECRET>

# Evolution API (WhatsApp)
EVOLUTION_API__URL=http://localhost:8080
EVOLUTION_API__KEY=<YOUR_EVOLUTION_API_KEY>
EVOLUTION_API__INSTANCE=trading-bot

# Firecrawl (Web Scraping)
FIRECRAWL__API__URL=http://localhost:3600
FIRECRAWL__API__KEY=<YOUR_FIRECRAWL_API_KEY>

# -----------------------------------------------------------------------------
# 🤖 AI/ML SERVICES
# -----------------------------------------------------------------------------

# Ollama (Local LLM)
OLLAMA__API__URL=http://localhost:11434
OLLAMA__MODEL__DEFAULT=llama3.2:3b

# LlamaIndex (RAG System)
LLAMAINDEX__API__URL=http://localhost:8202
LLAMAINDEX__EMBEDDING__MODEL=mxbai-embed-large
LLAMAINDEX__LLM__MODEL=llama3.2:3b
LLAMAINDEX__QDRANT__COLLECTION=docs_index_mxbai

# Qdrant (Vector Database)
QDRANT__API__URL=http://localhost:6333
QDRANT__GRPC__PORT=6334

# -----------------------------------------------------------------------------
# 📊 MONITORING & OBSERVABILITY
# -----------------------------------------------------------------------------

# Prometheus
PROMETHEUS__URL=http://localhost:9090
PROMETHEUS__SCRAPE_INTERVAL=15s

# Grafana
GRAFANA__URL=http://localhost:3000
GRAFANA__ADMIN__USER=admin
GRAFANA__ADMIN__PASSWORD=<YOUR_GRAFANA_PASSWORD>

# Sentry (Error Tracking - optional)
SENTRY__DSN=<YOUR_SENTRY_DSN>
SENTRY__ENVIRONMENT=${APP_ENV}
SENTRY__TRACES_SAMPLE_RATE=0.1

# -----------------------------------------------------------------------------
# 🔧 DOCKER & INFRASTRUCTURE
# -----------------------------------------------------------------------------

# Docker Compose Project Name
COMPOSE_PROJECT_NAME=tradingsystem

# Docker Network
DOCKER__NETWORK__NAME=trading-network

# Docker Volumes Base Path
DOCKER__VOLUMES__BASE_PATH=./data

# -----------------------------------------------------------------------------
# 🛡️ SECURITY & ENCRYPTION
# -----------------------------------------------------------------------------

# SOPS/age (for encrypted secrets files)
# Note: Public key (versionado), private key NUNCA versionar!
SOPS__AGE__RECIPIENTS_FILE=./config/.age-recipients.txt

# API Keys Rotation Tracking
SECRETS__LAST_ROTATION__DB=2025-11-05
SECRETS__LAST_ROTATION__TELEGRAM=2025-11-05
SECRETS__LAST_ROTATION__JWT=2025-11-05

# -----------------------------------------------------------------------------
# 🧪 TESTING & DEVELOPMENT
# -----------------------------------------------------------------------------

# Enable debug mode (development only)
DEBUG=false

# Mock external APIs (testing)
MOCK__PROFITDLL=false
MOCK__TELEGRAM=false

# Test data generation
TEST__SEED__ENABLED=false
TEST__SEED__COUNT=1000

# -----------------------------------------------------------------------------
# 📝 LOGGING
# -----------------------------------------------------------------------------

# Structured logging format: json | text
LOG__FORMAT=json

# Log retention (days)
LOG__RETENTION_DAYS=30

# Log file path
LOG__FILE_PATH=./data/logs

# Console output enabled
LOG__CONSOLE__ENABLED=true

# File output enabled
LOG__FILE__ENABLED=true

# Mask sensitive values in logs
LOG__MASK_SECRETS=true

# =============================================================================
# END OF CONFIGURATION
# =============================================================================
```

